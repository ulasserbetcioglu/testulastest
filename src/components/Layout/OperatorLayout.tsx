// src/components/Layout/OperatorLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import OperatorHeader from './OperatorHeader';
import OperatorSidebar from './OperatorSidebar';
import MobileNavMenu from './MobileNavMenu';
import MandatoryWeeklyKmModal from '../Operator/MandatoryWeeklyKmModal';
import { supabase } from '../../lib/supabase';

const OperatorLayout: React.FC = () => {
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState<string>('');
  const [loadingOperatorId, setLoadingOperatorId] = useState(true);
  const [showKmModal, setShowKmModal] = useState(false);

  useEffect(() => {
    const fetchOperatorId = async () => {
      setLoadingOperatorId(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: opData, error: opError } = await supabase
            .from('operators')
            .select('id, name')
            .eq('auth_id', user.id)
            .single();
          if (opError) throw opError;
          setOperatorId(opData.id);
          setOperatorName(opData.name);

          checkWeeklyKmEntry(opData.id);
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

  const checkWeeklyKmEntry = (opId: string) => {
    const now = new Date();
    const dayOfWeek = now.getDay();

    if (dayOfWeek !== 1) return;

    const weekNumber = getWeekNumber(now);
    const year = now.getFullYear();
    const storageKey = `km_entry_${opId}_${year}_${weekNumber}`;

    const isCompleted = localStorage.getItem(storageKey);

    if (!isCompleted) {
      setTimeout(() => {
        setShowKmModal(true);
      }, 1000);
    }
  };

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const handleKmSuccess = () => {
    setShowKmModal(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <OperatorSidebar />
      <div className="flex-1 flex flex-col md:ml-64">
        <OperatorHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-4">
          <Outlet context={{ operatorId, loadingOperatorId }} />
        </main>
        <MobileNavMenu />
      </div>

      {operatorId && (
        <MandatoryWeeklyKmModal
          isOpen={showKmModal}
          operatorId={operatorId}
          operatorName={operatorName}
          onSuccess={handleKmSuccess}
        />
      )}
    </div>
  );
};

export default OperatorLayout;
