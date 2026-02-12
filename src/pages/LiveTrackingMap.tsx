import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { MapPin, Loader2 } from 'lucide-react';

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
const containerStyle = { width: '100%', height: '100%' };
const center = { lat: 39.925533, lng: 32.866287 }; // Türkiye merkezi
const GOOGLE_MAPS_API_KEY = 'AIzaSyBakigooZV4gApre4wcnNnszhLXkHEmsd4'; // API anahtarınızı buraya girin

const LiveTrackingMap: React.FC = () => {
  const [locations, setLocations] = useState<Map<string, OperatorLocation>>(new Map());
  const [loading, setLoading] = useState(true);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const handleLocationUpdate = (payload: any) => {
    const newLocation: OperatorLocation = payload.new;
    // Haritadaki operatörün ismini korumak için eski veriyi al
    setLocations(prevLocations => {
      const newMap = new Map(prevLocations);
      const existingData = newMap.get(newLocation.operator_id);
      newMap.set(newLocation.operator_id, { ...newLocation, operators: existingData?.operators || null });
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
        (data as OperatorLocation[]).forEach(loc => initialMap.set(loc.operator_id, loc));
        setLocations(initialMap);

      } catch (error: any) {
        toast.error("Konumlar yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialLocations();

    // Supabase Realtime ile canlı güncellemeleri dinle
    const channel = supabase
      .channel('public:operator_locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operator_locations' }, handleLocationUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!isLoaded || loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" size={48} /></div>;
  }

  return (
    <div className="w-full h-screen">
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={6}>
        {Array.from(locations.values()).map(loc => (
          <MarkerF
            key={loc.operator_id}
            position={{ lat: loc.latitude, lng: loc.longitude }}
            label={loc.operators?.name.charAt(0)}
            title={`${loc.operators?.name}\nGüncelleme: ${new Date(loc.updated_at).toLocaleTimeString()}`}
          />
        ))}
      </GoogleMap>
    </div>
  );
};

export default LiveTrackingMap;
