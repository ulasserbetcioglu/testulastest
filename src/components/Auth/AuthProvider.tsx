'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { localAuth, LocalSession } from '../../lib/localAuth';

interface AuthContextType {
  session: Session | null;
  localSession: LocalSession | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  localSession: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [localSession, setLocalSession] = useState<LocalSession | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      const localSess = localAuth.getSession();
      setLocalSession(localSess);

      setLoading(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      const localSess = localAuth.getSession();
      setLocalSession(localSess);

      if (!session && !localSess) {
        const publicRouteRegex = /^\/teklif-goruntule\/[^/]+$/;

        if (!publicRouteRegex.test(location.pathname)) {
          navigate('/login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      localAuth.signOut();
      setLocalSession(null);
      navigate('/login');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, localSession, loading, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
