import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase'; // Projenizin Supabase istemcisini import edin
import { toast } from 'sonner';
import { MapPin, Search, Save, Loader2 as Loader } from 'lucide-react';

// Arayüz (Interface) tanımları
interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
  latitude: number | null;
  longitude: number | null;
  customer: {
    kisa_isim: string;
  } | null;
}

// Google Haritalar API anahtarınızı buraya ekleyin
const GOOGLE_MAPS_API_KEY = "AIzaSyBakigooZV4gApre4wcnNnszhLXkHEmsd4"; // <-- ÖNEMLİ: Kendi API anahtarınızla değiştirin

const SubeLokasyon = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationFilter, setLocationFilter] = useState<'all' | 'has_location' | 'no_location'>('all');
  
  // Harita referansları
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedBranchRef = useRef(selectedBranch);

  useEffect(() => {
      selectedBranchRef.current = selectedBranch;
  }, [selectedBranch]);

  // Google Haritalar script'ini yükleyen fonksiyon
  const loadGoogleMapsScript = (callback: () => void) => {
    if (window.google && window.google.maps && window.google.maps.places) {
      callback();
      return;
    }
    const existingScript = document.getElementById('googleMapsScript');
    if (existingScript) {
        existingScript.addEventListener('load', () => callback());
        return;
    }

    const script = document.createElement('script');
    script.id = 'googleMapsScript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => callback();
    document.head.appendChild(script);
  };

  // Veri çekme
  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('id, sube_adi, customer_id, latitude, longitude, customer:customer_id(kisa_isim)')
          .order('sube_adi', { ascending: true });

        if (error) throw error;
        setBranches(data || []);
      } catch (error: any) {
        toast.error('Şube verileri çekilirken bir hata oluştu: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, []);

  // Haritayı başlatan useEffect
  useEffect(() => {
    loadGoogleMapsScript(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: 39.9334, lng: 32.8597 },
        zoom: 6,
        disableDefaultUI: true,
        zoomControl: true,
      });
      mapRef.current = map;

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!selectedBranchRef.current) {
          toast.error('Lütfen önce bir şube seçin.');
          return;
        }
        if (e.latLng) {
          updateMarkerPosition(e.latLng);
        }
      });

      const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current!);
      autocomplete.setFields(['geometry', 'name', 'formatted_address']);

      // ✅ DÜZELTME: Arama sonucu seçildiğinde haritanın güncellenmesi sağlandı.
      autocomplete.addListener('place_changed', () => {
        if (!selectedBranchRef.current) {
          toast.error('Lütfen önce bir şube seçin.');
          searchInputRef.current!.value = '';
          return;
        }
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          // Harita referansını kullanarak merkezi ve zoom'u ayarla
          if (mapRef.current) {
            mapRef.current.setCenter(place.geometry.location);
            mapRef.current.setZoom(17);
          }
          updateMarkerPosition(place.geometry.location);
        } else {
          toast.error("Bu yer için konum bulunamadı.");
        }
      });
    });
  }, []);

  // Marker pozisyonunu güncelleyen fonksiyon
  const updateMarkerPosition = (latLng: google.maps.LatLng) => {
    setCurrentCoords({ lat: latLng.lat(), lng: latLng.lng() });
    if (markerRef.current) {
      markerRef.current.setPosition(latLng);
    } else if (mapRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position: latLng,
        map: mapRef.current,
        draggable: true,
      });
      markerRef.current.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          updateMarkerPosition(e.latLng);
        }
      });
    }
  };

  // Bir şube seçildiğinde tetiklenen fonksiyon
  const handleSelectBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    if (branch.latitude && branch.longitude) {
      const latlng = { lat: branch.latitude, lng: branch.longitude };
      if (mapRef.current) {
        mapRef.current.setCenter(latlng);
        mapRef.current.setZoom(17);
        updateMarkerPosition(new window.google.maps.LatLng(latlng));
      }
    } else {
      setCurrentCoords(null);
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    }
  };

  // Koordinat input'u değiştiğinde
  const handleCoordsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const coords = value.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
      if (coords) {
          const lat = parseFloat(coords[1]);
          const lng = parseFloat(coords[2]);
          if (!isNaN(lat) && !isNaN(lng)) {
              const latlng = new window.google.maps.LatLng(lat, lng);
              mapRef.current?.setCenter(latlng);
              mapRef.current?.setZoom(17);
              updateMarkerPosition(latlng);
          }
      } else {
          setCurrentCoords(null);
      }
  };

  // Konumu kaydetme
  const handleSaveLocation = async () => {
    if (!selectedBranch || !currentCoords) {
      toast.error('Kaydedilecek bir şube veya konum seçilmedi.');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('branches')
        .update({ latitude: currentCoords.lat, longitude: currentCoords.lng })
        .eq('id', selectedBranch.id);

      if (error) throw error;

      setBranches(prev =>
        prev.map(b =>
          b.id === selectedBranch.id
            ? { ...b, latitude: currentCoords.lat, longitude: currentCoords.lng }
            : b
        )
      );
      toast.success(`${selectedBranch.sube_adi} konumu başarıyla kaydedildi!`);
    } catch (error: any) {
      toast.error('Konum kaydedilirken bir hata oluştu: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Şube listesini yeni filtreye göre günceller
  const filteredBranches = useMemo(() => {
    return branches.filter(branch => {
      const searchMatch =
        branch.sube_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (branch.customer?.kisa_isim || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      const hasCoords = branch.latitude !== null && branch.longitude !== null;
      if (locationFilter === 'has_location') {
        return hasCoords;
      }
      if (locationFilter === 'no_location') {
        return !hasCoords;
      }
      
      return true; // 'all' için
    });
  }, [branches, searchTerm, locationFilter]);

  return (
    <div className="flex h-screen w-screen p-4 gap-4 bg-gray-100 overflow-hidden">
      {/* Sol Panel: Şube Listesi */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-white rounded-xl shadow-lg flex flex-col h-full">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Şube Konumları</h2>
          <p className="text-sm text-gray-500">Konum eklemek için bir şube seçin.</p>
        </div>
        <div className="p-4 border-b">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              id="branch-search"
              placeholder="Şube veya müşteri ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Konum Durumuna Göre Filtrele</label>
            <div className="flex rounded-lg border border-gray-200">
              <button onClick={() => setLocationFilter('all')} className={`px-3 py-1.5 text-sm font-medium rounded-l-md flex-1 transition-colors ${locationFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Tümü</button>
              <button onClick={() => setLocationFilter('has_location')} className={`px-3 py-1.5 text-sm font-medium border-l border-r border-gray-200 flex-1 transition-colors ${locationFilter === 'has_location' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Olan</button>
              <button onClick={() => setLocationFilter('no_location')} className={`px-3 py-1.5 text-sm font-medium rounded-r-md flex-1 transition-colors ${locationFilter === 'no_location' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Olmayan</button>
            </div>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto px-2 pb-4 space-y-1">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Yükleniyor...</div>
          ) : (
            filteredBranches.map(branch => {
              const hasCoords = branch.latitude && branch.longitude;
              return (
                <div
                  key={branch.id}
                  onClick={() => handleSelectBranch(branch)}
                  className={`p-3 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedBranch?.id === branch.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800">{branch.sube_adi}</p>
                      <p className="text-xs text-gray-500">{branch.customer?.kisa_isim}</p>
                    </div>
                    <MapPin
                      size={18}
                      className={hasCoords ? 'text-green-500' : 'text-red-400'}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sağ Panel: Harita ve Kontroller */}
      <div className="w-full md:w-2/3 lg:w-3/4 bg-white rounded-xl shadow-lg flex flex-col h-full p-4 gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full">
            <label htmlFor="coords-input" className="block text-sm font-medium text-gray-700">Enlem, Boylam</label>
            <input
              type="text"
              id="coords-input"
              placeholder={selectedBranch ? "Haritadan seçin veya yapıştırın..." : "Önce bir şube seçin..."}
              value={currentCoords ? `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}` : ''}
              onChange={handleCoordsInputChange}
              disabled={!selectedBranch}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <button
            id="save-button"
            onClick={handleSaveLocation}
            disabled={!selectedBranch || !currentCoords || isSaving}
            className="w-full md:w-auto mt-2 md:mt-6 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isSaving ? <Loader size={20} className="animate-spin" /> : <Save size={18} className="mr-2" />}
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
        <div className="flex-grow w-full h-full rounded-xl relative">
            <input
                ref={searchInputRef}
                type="text"
                placeholder="Adres veya işletme adı arayın..."
                className="absolute top-3 left-3 z-10 w-1/2 md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
            />
            <div ref={mapContainerRef} className="w-full h-full rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export default SubeLokasyon;
