'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      // ✅ DEĞİŞİKLİK: Yönlendirme mantığı güncellendi.
      // Eğer kullanıcı giriş yapmamışsa...
      if (!session) {
        // Gidilmek istenen yolun halka açık teklif görüntüleme sayfası olup olmadığını kontrol et.
        const publicRouteRegex = /^\/teklif-goruntule\/[^/]+$/;
        
        // Eğer halka açık bir sayfa değilse, giriş sayfasına yönlendir.
        if (!publicRouteRegex.test(location.pathname)) {
          navigate('/login');
        }
      }
    });


    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]); // location.pathname dependency olarak eklendi

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
