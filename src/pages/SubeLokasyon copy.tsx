import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { MapPin, Search, Save, Loader2 as Loader, Building } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet default icon fix
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

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

// Map events handler component
const MapEvents = ({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

// Map controller component to programmatically move the map
const MapController = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const SubeLokasyon = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addressSearchTerm, setAddressSearchTerm] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationFilter, setLocationFilter] = useState<'all' | 'has_location' | 'no_location'>('all');
  const [searchResults, setSearchResults] = useState<{ type: 'branch' | 'map', label: string, sublabel?: string, coords: { lat: number, lng: number } | null, data?: any }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.9334, 32.8597]);
  const [mapZoom, setMapZoom] = useState(6);

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

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Bir şube seçildiğinde tetiklenen fonksiyon
  const handleSelectBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    if (branch.latitude && branch.longitude) {
      const coords = { lat: branch.latitude, lng: branch.longitude };
      setCurrentCoords(coords);
      setMapCenter([coords.lat, coords.lng]);
      setMapZoom(17);
    } else {
      setCurrentCoords(null);
    }
  };

  // Haritaya tıklandığında
  const handleMapClick = (latlng: L.LatLng) => {
    if (!selectedBranch) {
      toast.error('Lütfen önce bir şube seçin.');
      return;
    }
    setCurrentCoords({ lat: latlng.lat, lng: latlng.lng });
  };

  // Marker sürüklendiğinde
  const handleMarkerDragEnd = (e: any) => {
    const latlng = e.target.getLatLng();
    setCurrentCoords({ lat: latlng.lat, lng: latlng.lng });
  };

  // Hybrid Search (Local + Photon)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (addressSearchTerm.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearchingAddress(true);
      try {
        // 1. Local Search (Branches)
        const localResults = branches
          .filter(b => 
            b.sube_adi.toLowerCase().includes(addressSearchTerm.toLowerCase()) ||
            (b.customer?.kisa_isim || '').toLowerCase().includes(addressSearchTerm.toLowerCase())
          )
          .map(b => ({
            type: 'branch' as const,
            label: b.sube_adi,
            sublabel: b.customer?.kisa_isim || '',
            coords: b.latitude && b.longitude ? { lat: b.latitude, lng: b.longitude } : null,
            data: b
          }));

        // 2. Map Search (Photon)
        const mapUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(addressSearchTerm)}&limit=5`;
        const response = await fetch(mapUrl);
        const data = await response.json();
        
        const mapResults = data.features.map((f: any) => ({
          type: 'map' as const,
          label: f.properties.name || f.properties.street || 'Bilinmeyen Yer',
          sublabel: [f.properties.city, f.properties.country].filter(Boolean).join(', '),
          coords: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }
        }));

        setSearchResults([...localResults, ...mapResults]);
        setShowDropdown(true);
      } catch (error) {
        console.error('Arama hatası:', error);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [addressSearchTerm, branches]);

  const handleResultSelect = (result: any) => {
    if (result.type === 'branch') {
      handleSelectBranch(result.data);
    } else {
      if (!selectedBranch) {
        toast.error('Lütfen önce yan panelden bir şube seçin.');
        setShowDropdown(false);
        return;
      }
      setMapCenter([result.coords.lat, result.coords.lng]);
      setMapZoom(17);
      setCurrentCoords(result.coords);
    }
    setShowDropdown(false);
    setAddressSearchTerm(result.label);
  };

  // Koordinat input'u değiştiğinde
  const handleCoordsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const coords = value.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
      if (coords) {
          const lat = parseFloat(coords[1]);
          const lng = parseFloat(coords[2]);
          if (!isNaN(lat) && !isNaN(lng)) {
              setCurrentCoords({ lat, lng });
              setMapCenter([lat, lng]);
              setMapZoom(17);
          }
      } else if (value === '') {
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
    <div className="flex h-[calc(100vh-64px)] w-full p-4 gap-4 bg-gray-100 overflow-hidden">
      {/* Sol Panel: Şube Listesi */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-white rounded-xl shadow-lg flex flex-col h-full overflow-hidden">
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
        <div className="flex-grow overflow-y-auto px-2 py-4 space-y-1">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Yükleniyor...</div>
          ) : (
            filteredBranches.map(branch => {
              const hasCoords = branch.latitude && branch.longitude;
              return (
                <div
                  key={branch.id}
                  onClick={() => handleSelectBranch(branch)}
                  className={`p-3 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-r-lg ${
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
      <div className="w-full md:w-2/3 lg:w-3/4 bg-white rounded-xl shadow-lg flex flex-col h-full p-4 gap-4 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow">
            <label htmlFor="coords-input" className="block text-sm font-medium text-gray-700 mb-1">Enlem, Boylam</label>
            <input
              type="text"
              id="coords-input"
              placeholder={selectedBranch ? "Haritadan seçin veya yapıştırın..." : "Önce bir şube seçin..."}
              value={currentCoords ? `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}` : ''}
              onChange={handleCoordsInputChange}
              disabled={!selectedBranch}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <button
            id="save-button"
            onClick={handleSaveLocation}
            disabled={!selectedBranch || !currentCoords || isSaving}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center whitespace-nowrap h-[42px]"
          >
            {isSaving ? <Loader size={20} className="animate-spin" /> : <Save size={18} className="mr-2" />}
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
        
        <div className="flex-grow w-full h-full rounded-xl relative overflow-hidden bg-gray-100 border border-gray-200">
            {/* Hybrid Search Input & Autocomplete */}
            <div className="absolute top-3 left-3 z-[1000] w-full max-w-md" ref={dropdownRef}>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Şube veya adres arayın..."
                        value={addressSearchTerm}
                        onChange={(e) => setAddressSearchTerm(e.target.value)}
                        onFocus={() => addressSearchTerm.length >= 2 && setShowDropdown(true)}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-lg focus:ring-2 focus:ring-blue-500 transition-all pl-10 text-gray-800"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {isSearchingAddress ? <Loader size={18} className="animate-spin text-blue-600" /> : <Search size={18} />}
                    </div>
                </div>

                {showDropdown && searchResults.length > 0 && (
                    <div className="absolute mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden max-h-[400px] overflow-y-auto">
                        {searchResults.map((result, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleResultSelect(result)}
                                className="w-full flex items-start gap-3 p-3 hover:bg-blue-50 transition-colors border-b last:border-b-0 text-left"
                            >
                                <div className={`p-2 rounded-lg shrink-0 ${result.type === 'branch' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {result.type === 'branch' ? <Building size={16} /> : <MapPin size={16} />}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-semibold text-sm truncate text-gray-800">{result.label}</div>
                                    <div className="text-xs text-gray-500 truncate">{result.sublabel}</div>
                                    {result.type === 'branch' && (
                                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded uppercase">
                                            Şubelerimiz
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController center={mapCenter} zoom={mapZoom} />
              <MapEvents onMapClick={handleMapClick} />
              
              {currentCoords && (
                <Marker 
                  position={[currentCoords.lat, currentCoords.lng]} 
                  draggable={true}
                  eventHandlers={{
                    dragend: handleMarkerDragEnd
                  }}
                />
              )}
            </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default SubeLokasyon;
