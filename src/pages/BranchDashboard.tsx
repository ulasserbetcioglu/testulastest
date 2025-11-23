import React, { useState, useEffect } from 'react';
import { Calendar, Users, FileText, BarChart, AlertTriangle } from 'lucide-react'; // BarChart düzeltildi
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import StatCard from '../components/Dashboard/StatCard';

interface MonthlyPlan {
  month: number;
  total_required: number;
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const BranchDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    completedVisits: 0,
    pendingVisits: 0,
    totalOperators: 0
  });
  const [monthlyPlans, setMonthlyPlans] = useState<MonthlyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    console.log("BranchDashboard: Veri çekme başladı...");
    try {
      const localSession = localAuth.getSession();
      let branchId: string;

      if (localSession && localSession.type === 'branch') {
        branchId = localSession.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Kullanıcı bulunamadı');

        const { data: branchData } = await supabase
          .from('branches')
          .select('id')
          .eq('auth_id', user.id)
          .single();

        if (!branchData) throw new Error('Şube bulunamadı');
        branchId = branchData.id;
      }

      const currentYear = new Date().getFullYear();

      // Tüm verileri paralel çek
      const [visitsRes, operatorsRes, monthlyPlansRes] = await Promise.all([
        supabase.from('visits').select('status').eq('branch_id', branchId),
        supabase.from('operators').select('id').eq('branch_id', branchId),
        // Yıl filtresi: Seçili yıl VEYA null (her yıl geçerli)
        supabase.from('monthly_visit_schedules')
            .select('month, visits_required')
            .eq('branch_id', branchId)
            .or(`year.eq.${currentYear},year.is.null`)
      ]);

      if (visitsRes.error) throw visitsRes.error;
      if (operatorsRes.error) throw operatorsRes.error;
      if (monthlyPlansRes.error) throw monthlyPlansRes.error;

      const completedVisits = visitsRes.data?.filter(v => v.status === 'completed').length || 0;
      const pendingVisits = visitsRes.data?.filter(v => v.status === 'planned').length || 0;

      // Aylık planları işle
      const rawPlans = monthlyPlansRes.data || [];
      const aggregatedPlans = Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1;
        const plansForMonth = rawPlans.filter(p => p.month === monthNum);
        const total = plansForMonth.reduce((sum, p) => sum + (p.visits_required || 0), 0);
        return { month: monthNum, total_required: total };
      });

      setStats({
        completedVisits,
        pendingVisits,
        totalOperators: operatorsRes.data?.length || 0
      });
      setMonthlyPlans(aggregatedPlans);

    } catch (err: any) {
      console.error("BranchDashboard Hatası:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
  
  if (error) return (
    <div className="p-8 text-center flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-gray-800">Bir hata oluştu</h3>
        <p className="text-gray-600">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Sayfayı Yenile
        </button>
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
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

      {/* Aylık Ziyaret Hedefleri Tablosu */}
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart className="text-blue-600" />
            {new Date().getFullYear()} Yılı Ziyaret Planı
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {monthlyPlans.map((plan) => {
                const isCurrent = plan.month === (new Date().getMonth() + 1);
                return (
                    <div 
                        key={plan.month} 
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                            isCurrent ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100 shadow-md' : 'bg-gray-50 border-gray-100'
                        } ${plan.total_required > 0 ? 'hover:border-blue-200' : 'opacity-60'}`}
                    >
                        <span className={`text-sm font-medium mb-1 ${isCurrent ? 'text-blue-700' : 'text-gray-500'}`}>
                            {MONTH_NAMES[plan.month - 1]}
                        </span>
                        <span className={`text-2xl font-bold ${plan.total_required > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                            {plan.total_required}
                        </span>
                        <span className="text-xs text-gray-400">Ziyaret</span>
                    </div>
                );
            })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Bugünkü Ziyaretler</h2>
          <p className="text-gray-500 text-sm text-center py-4">Bugün için planlanmış ziyaret bulunmuyor.</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Yaklaşan Ziyaretler</h2>
          <p className="text-gray-500 text-sm text-center py-4">Yakın zamanda planlanmış ziyaret bulunmuyor.</p>
        </div>
      </div>
    </div>
  );
};

export default BranchDashboard;