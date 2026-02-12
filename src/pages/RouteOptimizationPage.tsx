import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Map, List, Loader2, Navigation, ArrowRight, Search, Home, Clock, Milestone } from 'lucide-react';
import { format } from 'date-fns';

// --- ARAYÜZLER (INTERFACES) ---
interface Operator {
  id: string;
  name: string;
}

interface Visit {
  id: string;
  customer: { kisa_isim: string } | null;
  branch: { 
    id: string;
    sube_adi: string;
    adres: string;
    latitude?: number;
    longitude?: number;
  } | null;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
}

interface RouteSummary {
    distance: string;
    duration: string;
}

const RouteOptimizationPage: React.FC = () => {
  // --- STATE YÖNETİMİ ---
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [visits, setVisits] = useState<Visit[]>([]);
  const [optimizedVisits, setOptimizedVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
  const [startPoint, setStartPoint] = useState({ lat: '40.193298', lng: '29.074202' }); // Bursa varsayılan
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);

  // --- API ANAHTARI (ÖNEMLİ!) ---
  // Bu anahtar sadece harita görseli oluşturmak için kullanılacak.
  // Rota optimizasyonu artık güvenli bir şekilde Edge Function üzerinden yapılıyor.
  const GOOGLE_MAPS_API_KEY = 'AIzaSyBakigooZV4gApre4wcnNnszhLXkHEmsd4';

  // --- VERİ ÇEKME ---
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const { data, error } = await supabase.from('operators').select('id, name').order('name');
        if (error) throw error;
        setOperators(data || []);
      } catch (error) {
        toast.error("Operatörler yüklenirken bir hata oluştu.");
      }
    };
    fetchOperators();
  }, []);

  const fetchVisits = useCallback(async () => {
    if (!selectedOperatorId || !selectedDate) return;
    setLoading(true);
    setVisits([]);
    setOptimizedVisits([]);
    setMapImageUrl(null);
    setRouteSummary(null);
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`id, visit_date, status, customer:customer_id(kisa_isim), branch:branch_id(id, sube_adi, adres, latitude, longitude)`)
        .eq('operator_id', selectedOperatorId)
        .eq('status', 'planned')
        .gte('visit_date', `${selectedDate}T00:00:00`)
        .lte('visit_date', `${selectedDate}T23:59:59`)
        .order('visit_date', { ascending: true });

      if (error) throw error;
      
      const visitsWithCoords = data.filter(v => v.branch?.latitude && v.branch?.longitude);
      if (visitsWithCoords.length !== data.length) {
        toast.warning("Bazı ziyaretlerin konum bilgisi eksik olduğu için rotaya dahil edilemedi.");
      }
      setVisits(visitsWithCoords);
      if(visitsWithCoords.length > 0) {
        generateMapUrl(visitsWithCoords);
      }

    } catch (error: any) {
      toast.error("Ziyaretler çekilirken bir hata oluştu: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedOperatorId, selectedDate]);

  // --- ROTA OPTİMİZASYONU ---
  const handleOptimizeRoute = async () => {
    if (visits.length < 2) {
      toast.info("Optimize edilecek en az 2 ziyaret bulunmalıdır.");
      return;
    }
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.includes('YAPISTIRIN')) {
        toast.error("Google Maps API anahtarı girilmemiş.");
        return;
    }

    setOptimizing(true);
    setMapImageUrl(null); // Haritayı temizle
    setRouteSummary(null);

    try {
      const origin = `${startPoint.lat},${startPoint.lng}`;
      const waypoints = visits.map(v => `${v.branch!.latitude},${v.branch!.longitude}`).join('|');
      
      const { data, error } = await supabase.functions.invoke('optimize-route', {
        body: { origin, waypoints },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const route = data.routes[0];
      const optimizedOrder = route.waypoint_order;
      const reorderedVisits = optimizedOrder.map((index: number) => visits[index]);
      
      setOptimizedVisits(reorderedVisits);
      generateMapUrl(reorderedVisits);

      // Toplam mesafe ve süreyi hesapla
      let totalDistance = 0;
      let totalDuration = 0;
      route.legs.forEach((leg: any) => {
          totalDistance += leg.distance.value;
          totalDuration += leg.duration.value;
      });

      const distanceInKm = (totalDistance / 1000).toFixed(2);
      const durationHours = Math.floor(totalDuration / 3600);
      const durationMinutes = Math.round((totalDuration % 3600) / 60);

      setRouteSummary({
          distance: `${distanceInKm} km`,
          duration: `${durationHours} saat ${durationMinutes} dakika`
      });

      toast.success("Rota başarıyla optimize edildi!");

    } catch (error: any) {
      toast.error("Rota optimizasyonu sırasında hata: " + error.message);
      console.error("Optimization Error:", error);
    } finally {
      setOptimizing(false);
    }
  };

  const generateMapUrl = (visitList: Visit[]) => {
      if (visitList.length === 0) return;
      
      const startMarker = `&markers=color:green|label:S|${startPoint.lat},${startPoint.lng}`;
      const pathPoints = [
          `${startPoint.lat},${startPoint.lng}`,
          ...visitList.map(v => `${v.branch!.latitude},${v.branch!.longitude}`),
          `${startPoint.lat},${startPoint.lng}`
      ];
      const path = `&path=color:0x0000ff|weight:4|${pathPoints.join('|')}`;
      const markers = visitList.map((v, i) => `&markers=color:red|label:${i+1}|${v.branch!.latitude},${v.branch!.longitude}`).join('');
      
      const url = `https://maps.googleapis.com/maps/api/staticmap?size=600x400${path}${startMarker}${markers}&key=${GOOGLE_MAPS_API_KEY}`;
      
      if(url.length > 8192) {
        toast.warning("Çok fazla ziyaret noktası olduğu için harita yolu çizilemedi.");
        const simpleMarkers = visitList.map((v, i) => `&markers=label:${i+1}|${v.branch!.latitude},${v.branch!.longitude}`).join('');
        setMapImageUrl(`https://maps.googleapis.com/maps/api/staticmap?size=600x400${startMarker}${simpleMarkers}&key=${GOOGLE_MAPS_API_KEY}`);
      } else {
        setMapImageUrl(url);
      }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Navigation className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Rota Optimizasyonu</h1>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operatör</label>
            <select value={selectedOperatorId} onChange={(e) => setSelectedOperatorId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
              <option value="">Operatör Seçin</option>
              {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg"/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç (Enlem)</label><input type="text" value={startPoint.lat} onChange={e => setStartPoint(p => ({...p, lat: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-lg"/></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç (Boylam)</label><input type="text" value={startPoint.lng} onChange={e => setStartPoint(p => ({...p, lng: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-lg"/></div>
          </div>
          <button onClick={fetchVisits} disabled={loading || !selectedOperatorId} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
            Ziyaretleri Getir
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-10"><Loader2 className="animate-spin inline-block text-gray-400" /></div>}

      {!loading && visits.length > 0 && (
        <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Ziyaret Rotası</h2>
                <button onClick={handleOptimizeRoute} disabled={optimizing || visits.length < 2} className="w-full mb-4 px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50">
                    {optimizing ? <Loader2 className="animate-spin"/> : <ArrowRight/>}
                    Rotayı Optimize Et
                </button>
                <ul className="space-y-3">
                    {(optimizedVisits.length > 0 ? optimizedVisits : visits).map((visit, index) => (
                        <li key={visit.id} className="p-3 bg-gray-50 rounded-lg border flex items-start gap-4">
                            <span className={`flex-shrink-0 w-8 h-8 ${optimizedVisits.length > 0 ? 'bg-green-600' : 'bg-blue-600'} text-white font-bold rounded-full flex items-center justify-center`}>{index + 1}</span>
                            <div>
                                <p className="font-semibold text-gray-800">{visit.customer?.kisa_isim}</p>
                                <p className="text-sm text-gray-600">{visit.branch?.sube_adi}</p>
                                <p className="text-xs text-gray-400">{visit.branch?.adres}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="lg:col-span-3 space-y-8">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-semibold mb-4">Harita Görünümü</h2>
                    {optimizing ? (
                        <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500"><Loader2 className="animate-spin" size={32}/></div>
                    ) : mapImageUrl ? (
                        <img src={mapImageUrl} alt="Optimize Edilmiş Rota Haritası" className="w-full rounded-lg border"/>
                    ) : (
                        <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                            <Map size={48}/>
                            <p className="ml-4">Rota optimize edildikten sonra harita burada görünecektir.</p>
                        </div>
                    )}
                </div>
                {routeSummary && (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-lg text-center">
                            <List className="mx-auto h-8 w-8 text-gray-400 mb-2"/>
                            <p className="text-sm text-gray-600">Toplam Ziyaret</p>
                            <p className="text-2xl font-bold text-gray-800">{optimizedVisits.length}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-lg text-center">
                            <Milestone className="mx-auto h-8 w-8 text-gray-400 mb-2"/>
                            <p className="text-sm text-gray-600">Toplam Mesafe</p>
                            <p className="text-2xl font-bold text-gray-800">{routeSummary.distance}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-lg text-center">
                            <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2"/>
                            <p className="text-sm text-gray-600">Tahmini Süre</p>
                            <p className="text-2xl font-bold text-gray-800">{routeSummary.duration}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default RouteOptimizationPage;
