import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthProvider'; // AuthProvider'ınızın yolunu doğrulayın

const LocationTracker: React.FC = () => {
    const { user } = useAuth();
    const [operatorId, setOperatorId] = useState<string | null>(null);

    // 1. Giriş yapmış kullanıcının operatör kimliğini al
    useEffect(() => {
        const getOperatorId = async () => {
            if (user) {
                try {
                    const { data, error } = await supabase
                        .from('operators')
                        .select('id')
                        .eq('auth_id', user.id)
                        .single();
                    
                    if (error && error.code !== 'PGRST116') throw error;

                    if (data) {
                        setOperatorId(data.id);
                    }
                } catch (err) {
                    console.error("Operatör ID alınırken hata:", err);
                }
            }
        };
        getOperatorId();
    }, [user]);

    // 2. Konum takibini başlat
    useEffect(() => {
        if (!operatorId) return;

        // Tarayıcının konum izleme özelliğini kullan
        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                // 3. Konumu Supabase'e gönder (upsert ile)
                const { error } = await supabase.from('operator_locations').upsert({
                    operator_id: operatorId,
                    latitude,
                    longitude,
                    updated_at: new Date().toISOString()
                });

                if (error) {
                    console.error("Konum güncellenirken hata:", error);
                }
            },
            (error) => {
                console.error("Geolocation hatası:", error.message);
            },
            {
                enableHighAccuracy: true, // Yüksek doğrulukta konum al
                timeout: 15000,          // 15 saniyede bir güncelle
                maximumAge: 10000        // 10 saniyeden eski konumu kullanma
            }
        );

        // 4. Bileşen kaldırıldığında konum izlemeyi durdur
        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [operatorId]);

    // Bu bileşen arayüzde bir şey göstermez, sadece arka planda çalışır.
    return null; 
};

export default LocationTracker;
