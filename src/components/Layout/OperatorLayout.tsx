// src/components/Layout/OperatorLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import OperatorHeader from './OperatorHeader';
import OperatorSidebar from './OperatorSidebar';
import MobileNavMenu from './MobileNavMenu'; // Yeni import
import { supabase } from '../../lib/supabase'; // Supabase import'ını ekleyin

const OperatorLayout: React.FC = () => {
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [loadingOperatorId, setLoadingOperatorId] = useState(true);

  useEffect(() => {
    const fetchOperatorId = async () => {
      setLoadingOperatorId(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: opData, error: opError } = await supabase
            .from('operators')
            .select('id')
            .eq('auth_id', user.id)
            .single();
          if (opError) throw opError;
          setOperatorId(opData.id);
        } else {
          setOperatorId(null);
        }
      } catch (err) {
        console.error("Operatör ID çekilirken hata:", err);
        setOperatorId(null);
      } finally {
        setLoadingOperatorId(false);
      }
    };
    fetchOperatorId();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <OperatorSidebar />
      <div className="flex-1 flex flex-col md:ml-64">
        <OperatorHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-4"> {/* Mobil menü için alttan boşluk eklendi */}
          {/* operatorId ve loadingOperatorId'yi Outlet context'ine ekleyin */}
          <Outlet context={{ operatorId, loadingOperatorId }} />
        </main>
        <MobileNavMenu /> {/* Mobil navigasyon menüsü eklendi */}
      </div>
    </div>
  );
};

export default OperatorLayout;
