import React, { useState, useEffect } from 'react';
import { Calendar, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import StatCard from '../components/Dashboard/StatCard';

const BranchDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    completedVisits: 0,
    pendingVisits: 0,
    totalOperators: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { data: branchData } = await supabase
        .from('branches')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!branchData) throw new Error('Şube bulunamadı');

      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('status')
        .eq('branch_id', branchData.id);

      if (visitsError) throw visitsError;

      const completedVisits = visits?.filter(v => v.status === 'completed').length || 0;
      const pendingVisits = visits?.filter(v => v.status === 'planned').length || 0;

      const { data: operators, error: operatorsError } = await supabase
        .from('operators')
        .select('id')
        .eq('branch_id', branchData.id);

      if (operatorsError) throw operatorsError;

      setStats({
        completedVisits,
        pendingVisits,
        totalOperators: operators?.length || 0
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">ŞUBE PANELİ</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Tamamlanan Ziyaretler"
          value={stats.completedVisits}
          icon={<FileText size={24} />}
          changeType="positive"
          bgColor="bg-white"
        />
        <StatCard
          title="Bekleyen Ziyaretler"
          value={stats.pendingVisits}
          icon={<Calendar size={24} />}
          changeType="neutral"
          bgColor="bg-white"
        />
        <StatCard
          title="Toplam Operatör"
          value={stats.totalOperators}
          icon={<Users size={24} />}
          changeType="neutral"
          bgColor="bg-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Bugünkü Ziyaretler</h2>
          {/* Implement daily visits list */}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Yaklaşan Ziyaretler</h2>
          {/* Implement upcoming visits list */}
        </div>
      </div>
    </div>
  );
};

export default BranchDashboard;