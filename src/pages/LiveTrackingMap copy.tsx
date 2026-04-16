import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin } from 'lucide-react';

// Leaflet'in varsayılan icon rotası sorununu çözmek için (Vite/Webpack uyumluluğu)
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- ARAYÜZLER ---
interface OperatorLocation {
  operator_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
  operators: {
    name: string;
  } | null;
}

// --- HARİTA AYARLARI ---
const center: [number, number] = [39.925533, 32.866287]; // Türkiye merkezi

const LiveTrackingMap: React.FC = () => {
  const [locations, setLocations] = useState<Map<string, OperatorLocation>>(new Map());
  const [loading, setLoading] = useState(true);

  const handleLocationUpdate = (payload: any) => {
    const newLocation: OperatorLocation = payload.new;
    setLocations(prevLocations => {
      const newMap = new Map(prevLocations);
      const existingData = newMap.get(newLocation.operator_id);
      newMap.set(newLocation.operator_id, { 
        ...newLocation, 
        operators: existingData?.operators || null 
      });
      return newMap;
    });
  };

  useEffect(() => {
    const fetchInitialLocations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('operator_locations')
          .select('*, operators(name)');
        
        if (error) throw error;

        const initialMap = new Map<string, OperatorLocation>();
        (data as any[]).forEach(loc => initialMap.set(loc.operator_id, loc));
        setLocations(initialMap);

      } catch (error: any) {
        toast.error("Konumlar yüklenirken bir hata oluştu.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialLocations();

    // Supabase Realtime ile canlı güncellemeleri dinle
    const channel = supabase
      .channel('public:operator_locations')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'operator_locations' 
      }, handleLocationUpdate)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'operator_locations' 
      }, handleLocationUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-gray-500 font-medium">Harita Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative">
      {/* Header Info Overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border border-gray-200 flex items-center gap-3">
         <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
         <span className="text-sm font-bold text-gray-800">Canlı Operatör Takibi</span>
         <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{locations.size} Aktif</span>
      </div>

      <MapContainer 
        center={center} 
        zoom={6} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {Array.from(locations.values()).map(loc => (
          <Marker 
            key={loc.operator_id} 
            position={[loc.latitude, loc.longitude]}
          >
            <Popup>
              <div className="p-1">
                <div className="flex items-center gap-2 mb-2 border-b pb-2">
                  <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 m-0">{loc.operators?.name || 'Bilinmeyen'}</h4>
                    <p className="text-[10px] text-gray-400 m-0 uppercase font-black">Operatör</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600 flex justify-between gap-4">
                    <span>Enlem:</span> <strong>{loc.latitude.toFixed(4)}</strong>
                  </p>
                  <p className="text-xs text-gray-600 flex justify-between gap-4">
                    <span>Boylam:</span> <strong>{loc.longitude.toFixed(4)}</strong>
                  </p>
                  <p className="text-xs text-gray-600 flex justify-between gap-4">
                    <span>Son Güncelleme:</span> 
                    <strong>{new Date(loc.updated_at).toLocaleTimeString('tr-TR')}</strong>
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveTrackingMap;
