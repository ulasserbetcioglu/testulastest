import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Route, Calendar, Download, User, ArrowRight, Loader2, ChevronsRight, Clock, Milestone } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { toast } from 'sonner';

// --- LEAFLET ICON DÜZELTMESİ ---
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- ARAYÜZLER (INTERFACES) ---
interface Operator {
  id: string;
  name: string;
}

interface Visit {
  id: string;
  visit_date: string;
  customer: { kisa_isim: string } | null;
  branch: { sube_adi: string; latitude: number; longitude: number } | null;
}

interface OperatorRoute {
  date: string;
  visits: Visit[];
  totalDistance: number; // Kuş uçuşu mesafe (liste için)
  coordinates: L.LatLngExpression[];
}

interface DetailedRouteInfo {
    distance: number; // Gerçek yol mesafesi (km)
    time: number;     // Tahmini süre (dakika)
}

// --- YARDIMCI BİLEŞENLER ---

// Haritayı seçilen rotanın sınırlarına göre güncelleyen bileşen
const MapUpdater: React.FC<{ bounds: L.LatLngBoundsExpression | null }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

// Gerçek yol rotasını çizen bileşen
const RoutingMachine: React.FC<{ waypoints: L.LatLngExpression[], onRouteFound: (info: DetailedRouteInfo) => void }> = ({ waypoints, onRouteFound }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || waypoints.length < 2) return;

        const routingControl = L.Routing.control({
            waypoints: waypoints.map(coord => L.latLng(coord as L.LatLngTuple)),
            routeWhileDragging: false,
            addWaypoints: false,
            createMarker: () => null, // İşaretçileri biz kendimiz ekleyeceğiz
            lineOptions: {
                styles: [{ color: '#059669', opacity: 0.8, weight: 6 }]
            },
            show: false // Yol tariflerini gizle
        }).on('routesfound', (e) => {
            const routes = e.routes;
            if (routes.length > 0) {
                const summary = routes[0].summary;
                onRouteFound({
                    distance: summary.totalDistance / 1000, // km
                    time: summary.totalTime / 60 // dakika
                });
            }
        }).addTo(map);

        return () => {
            map.removeControl(routingControl);
        };
    }, [map, waypoints, onRouteFound]);

    return null;
};


// --- ANA BİLEŞEN ---
const AdminOperatorDistances: React.FC = () => {
  // --- STATE YÖNETİMİ ---
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [routes, setRoutes] = useState<OperatorRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<OperatorRoute | null>(null);
  const [detailedRouteInfo, setDetailedRouteInfo] = useState<DetailedRouteInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // --- VERİ İŞLEME VE HESAPLAMALAR ---
  const calculateInitialRoutes = (visitsData: Visit[]): OperatorRoute[] => {
    const visitsByDate = visitsData.reduce((acc, visit) => {
      const date = format(new Date(visit.visit_date), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(visit);
      return acc;
    }, {} as Record<string, Visit[]>);

    const operatorRoutes: OperatorRoute[] = Object.entries(visitsByDate).map(([date, visits]) => {
      visits.sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());
      
      let totalDistance = 0;
      const coordinates: L.LatLngExpression[] = [];

      for (let i = 0; i < visits.length; i++) {
        const visit = visits[i];
        if (visit.branch?.latitude && visit.branch?.longitude) {
          const latLng: L.LatLngExpression = [visit.branch.latitude, visit.branch.longitude];
          coordinates.push(latLng);
          if (i > 0) {
            const prevVisit = visits[i - 1];
            if (prevVisit.branch?.latitude && prevVisit.branch?.longitude) {
              const p1 = L.latLng(prevVisit.branch.latitude, prevVisit.branch.longitude);
              const p2 = L.latLng(visit.branch.latitude, visit.branch.longitude);
              totalDistance += p1.distanceTo(p2) / 1000;
            }
          }
        }
      }
      return { date, visits, totalDistance, coordinates };
    });

    return operatorRoutes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // ✅ YENİ: Aylık özet verilerini hesaplayan useMemo
  const monthlySummary = useMemo(() => {
    if (routes.length === 0) {
      return { totalDistance: 0, totalVisits: 0, uniqueLocations: 0 };
    }

    const totalDistance = routes.reduce((sum, route) => sum + route.totalDistance, 0);
    const totalVisits = routes.reduce((sum, route) => sum + route.visits.length, 0);
    
    const allBranchNames = new Set<string>();
    routes.forEach(route => {
        route.visits.forEach(visit => {
            if(visit.branch?.sube_adi) {
                allBranchNames.add(visit.branch.sube_adi);
            }
        });
    });
    const uniqueLocations = allBranchNames.size;

    return { totalDistance, totalVisits, uniqueLocations };
  }, [routes]);


  // --- VERİ ÇEKME ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('operators').select('id, name').order('name');
        if (error) throw error;
        setOperators(data || []);
      } catch (err: any) {
        toast.error("Operatörler yüklenirken hata oluştu.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleFetchRoutes = async () => {
    if (!selectedOperator) return toast.info("Lütfen bir operatör seçin.");
    setLoading(true);
    setSelectedRoute(null);
    setRoutes([]);
    setDetailedRouteInfo(null);

    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`id, visit_date, status, customer:customer_id(kisa_isim), branch:branch_id(sube_adi, latitude, longitude)`)
        .eq('operator_id', selectedOperator)
        .eq('status', 'completed')
        .gte('visit_date', `${startDate}T00:00:00`)
        .lte('visit_date', `${endDate}T23:59:59`)
        .order('visit_date');

      if (error) throw error;
      
      const validVisits = (data || []).filter(v => v.branch?.latitude && v.branch?.longitude) as Visit[];
      const calculatedRoutes = calculateInitialRoutes(validVisits);
      setRoutes(calculatedRoutes);

      if (calculatedRoutes.length > 0) {
        setSelectedRoute(calculatedRoutes[0]);
      } else {
        toast.info("Seçilen kriterlere uygun tamamlanmış ziyaret bulunamadı.");
      }
    } catch (err: any) {
      toast.error(`Rotalar getirilirken hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- DIŞA AKTARMA ---
  const exportRouteToGPX = (route: OperatorRoute) => {
    const operatorName = operators.find(op => op.id === selectedOperator)?.name || 'Bilinmeyen';
    let gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="İlaçlamatik"><trk><name>${operatorName} - ${route.date}</name><trkseg>`;
    
    route.visits.forEach(visit => {
      if (visit.branch?.latitude && visit.branch?.longitude) {
        gpx += `<trkpt lat="${visit.branch.latitude}" lon="${visit.branch.longitude}"><name>${visit.branch.sube_adi}</name></trkpt>`;
      }
    });
    
    gpx += `</trkseg></trk></gpx>`;
    
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${operatorName.replace(/\s+/g, '_')}_${route.date}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("GPX dosyası indirildi.");
  };

  const mapBounds = useMemo(() => {
    if (!selectedRoute || selectedRoute.coordinates.length === 0) return null;
    return L.latLngBounds(selectedRoute.coordinates);
  }, [selectedRoute]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sol Panel: Kontroller ve Rota Listesi */}
      <div className="w-1/3 max-w-md flex flex-col bg-white shadow-lg">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-gray-800">Operatör Rotaları</h1>
        </div>
        
        <div className="p-4 space-y-4 border-b">
            <select value={selectedOperator} onChange={(e) => setSelectedOperator(e.target.value)} className="w-full p-2 border rounded-md">
              <option value="">Operatör Seçin...</option>
              {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
            <div className="flex gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-md"/>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-md"/>
            </div>
            <button onClick={handleFetchRoutes} disabled={loading || !selectedOperator} className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors">
              {loading ? <Loader2 className="animate-spin"/> : <Route/>} Rotaları Getir
            </button>
        </div>

        {/* ✅ YENİ: Aylık Özet Kartları */}
        {routes.length > 0 && (
            <div className="p-4 border-b">
                <h2 className="text-sm font-semibold text-gray-600 mb-3">Dönem Özeti</h2>
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-blue-50 p-2 rounded-lg">
                        <p className="text-xs text-blue-700">Toplam Mesafe</p>
                        <p className="text-lg font-bold text-blue-900">{monthlySummary.totalDistance.toFixed(1)} km</p>
                        <p className="text-xs text-gray-400">(Kuş Uçuşu)</p>
                    </div>
                    <div className="bg-indigo-50 p-2 rounded-lg">
                        <p className="text-xs text-indigo-700">Toplam Ziyaret</p>
                        <p className="text-lg font-bold text-indigo-900">{monthlySummary.totalVisits}</p>
                    </div>
                    <div className="bg-purple-50 p-2 rounded-lg">
                        <p className="text-xs text-purple-700">Benzersiz Yer</p>
                        <p className="text-lg font-bold text-purple-900">{monthlySummary.uniqueLocations}</p>
                    </div>
                </div>
            </div>
        )}

        <div className="flex-grow overflow-y-auto p-4 space-y-3">
          {loading && !routes.length ? <div className="text-center p-6"><Loader2 className="animate-spin text-gray-400"/></div> : null}
          {!loading && routes.length === 0 ? <div className="text-center p-6 text-gray-500">Görüntülenecek rota bulunamadı.</div> : null}
          {routes.map(route => (
            <div key={route.date} onClick={() => { setSelectedRoute(route); setDetailedRouteInfo(null); }} className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedRoute?.date === route.date ? 'bg-green-50 border-green-500 shadow-md' : 'hover:bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg text-gray-800">{format(new Date(route.date), 'dd MMMM yyyy', { locale: tr })}</p>
                  <p className="text-sm text-gray-500">{route.visits.length} Ziyaret</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-green-600">{route.totalDistance.toFixed(1)} km</p>
                  <p className="text-xs text-gray-400">(Kuş Uçuşu)</p>
                </div>
              </div>
              {selectedRoute?.date === route.date && detailedRouteInfo && (
                <div className="mt-3 pt-3 border-t border-green-200 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2 text-gray-600"><Milestone size={14}/> Gerçek Yol Mesafesi:</span>
                        <span className="font-bold text-green-700">{detailedRouteInfo.distance.toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-2 text-gray-600"><Clock size={14}/> Tahmini Süre:</span>
                        <span className="font-bold text-green-700">{detailedRouteInfo.time.toFixed(0)} dk</span>
                    </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sağ Panel: Harita */}
      <div className="flex-grow">
        <MapContainer center={[40.1826, 29.0669]} zoom={10} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <MapUpdater bounds={mapBounds} />
          {selectedRoute && (
            <>
              <RoutingMachine waypoints={selectedRoute.coordinates} onRouteFound={setDetailedRouteInfo} />
              {selectedRoute.visits.map((visit, index) => (
                visit.branch?.latitude && visit.branch?.longitude && (
                  <Marker key={visit.id} position={[visit.branch.latitude, visit.branch.longitude]}>
                    <Popup>
                      <b>{index + 1}. {visit.branch.sube_adi}</b><br/>
                      {visit.customer?.kisa_isim}<br/>
                      Ziyaret Saati: {format(new Date(visit.visit_date), 'HH:mm')}
                    </Popup>
                  </Marker>
                )
              ))}
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default AdminOperatorDistances; 