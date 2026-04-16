import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, AlertTriangle, CheckCircle, X, User, Building, ArrowRight, BarChart, CalendarDays, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- ARAYÜZLER (INTERFACES) ---
interface Visit {
  id: string;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
  branch: { sube_adi: string } | null;
  operator: { name: string } | null;
}

interface CorrectiveAction {
  id: string;
  non_compliance_type: 'kritik' | 'major' | 'minor';
  status: 'open' | 'in_progress' | 'completed' | 'verified';
  due_date: string;
  branch: { sube_adi: string } | null;
}

interface MonthlyPlan {
  month: number;
  total_required: number;
}

interface DashboardData {
  customerName: string;
  upcomingVisits: Visit[];
  recentVisits: Visit[];
  openActions: CorrectiveAction[];
  monthlyPlans: MonthlyPlan[];
  stats: {
    totalBranches: number;
    openActionCount: number;
    nextVisitDate: string | null;
  };
}

const MONTH_NAMES = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
];

// --- YARDIMCI BİLEŞENLER ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-800 tracking-tight group-hover:text-green-600 transition-colors">{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
    </div>
  </div>
);

const VisitCard: React.FC<{ visit: Visit }> = ({ visit }) => {
  const statusConfig = {
    planned: { icon: Clock, color: 'text-yellow-600 bg-yellow-50', text: 'Planlandı' },
    completed: { icon: CheckCircle, color: 'text-green-600 bg-green-50', text: 'Tamamlandı' },
    cancelled: { icon: X, color: 'text-red-600 bg-red-50', text: 'İptal Edildi' },
  }[visit.status] || { icon: Clock, color: 'text-gray-600 bg-gray-50', text: 'Bilinmiyor' };

  const Icon = statusConfig.icon;

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-full ${statusConfig.color} group-hover:scale-105 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{visit.branch?.sube_adi || 'Genel Merkez'}</p>
          <div className="flex items-center text-sm text-gray-500 mt-0.5">
            <User className="w-3 h-3 mr-1" />
            <span>{visit.operator?.name || 'Atanmadı'}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">
          {isValid(new Date(visit.visit_date))
            ? format(new Date(visit.visit_date), 'dd MMM', { locale: tr })
            : '-'}
        </p>
        <p className="text-xs text-gray-400">
          {isValid(new Date(visit.visit_date))
            ? format(new Date(visit.visit_date), 'HH:mm')
            : ''}
        </p>
      </div>
    </div>
  );
};

const ActionCard: React.FC<{ action: CorrectiveAction }> = ({ action }) => {
  const typeConfig = {
    kritik: { text: 'Kritik', color: 'bg-red-50 text-red-700 border-red-100' },
    major: { text: 'Majör', color: 'bg-orange-50 text-orange-700 border-orange-100' },
    minor: { text: 'Minör', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  }[action.non_compliance_type] || { text: 'Belirsiz', color: 'bg-gray-50 text-gray-700 border-gray-100' };

  const dateObj = new Date(action.due_date);
  const isValidDate = isValid(dateObj);

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${typeConfig.color} hover:shadow-sm transition-shadow`}>
      <div className="p-2 bg-white rounded-lg shadow-sm">
        <AlertTriangle className="w-5 h-5 text-current" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold truncate pr-2">{action.branch?.sube_adi || 'Genel Merkez'}</span>
          <span className="text-xs font-medium uppercase opacity-80 px-2 py-0.5 bg-white/50 rounded-full">{typeConfig.text}</span>
        </div>
        <p className="text-xs opacity-90 flex items-center mt-2">
          <Clock className="w-3 h-3 mr-1" />
          Son Tarih: <span className="font-semibold ml-1">
            {isValidDate ? format(dateObj, 'dd MMM yyyy', { locale: tr }) : 'Belirsiz'}
          </span>
        </p>
        {isValidDate && (
          <p className="text-xs opacity-75 mt-1">
            {formatDistanceToNow(dateObj, { locale: tr, addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  );
};

const SkeletonLoader: React.FC = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-20 bg-gray-200 rounded-xl w-3/4"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-80 bg-gray-200 rounded-2xl"></div>
      <div className="h-80 bg-gray-200 rounded-2xl"></div>
    </div>
  </div>
);

// --- ANA BİLEŞEN ---
const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const localSession = localAuth.getSession();
        let customerId: string;
        let customerName: string;

        if (localSession && localSession.type === 'customer') {
          customerId = localSession.id;
          customerName = localSession.name;
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Oturum bulunamadı.');

          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('id, kisa_isim')
            .eq('auth_id', user.id)
            .maybeSingle();

          if (customerError || !customerData) throw new Error('Müşteri bilgileri alınamadı.');
          customerId = customerData.id;
          customerName = customerData.kisa_isim;
        }

        const today = new Date().toISOString();
        const currentYear = new Date().getFullYear();

        const { data: branchesData, error: branchesError, count: branchesCount } = await supabase
          .from('branches')
          .select('id', { count: 'exact' })
          .eq('customer_id', customerId);

        if (branchesError) throw branchesError;

        const branchIds = branchesData?.map(b => b.id) || [];

        // Ziyaret hedefleri için sorgu oluştur
        let plansQuery = supabase
          .from('monthly_visit_schedules')
          .select('month, visits_required')
          .or(`year.eq.${currentYear},year.is.null`);

        // Hem müşteriye özel hem de şubelerine ait hedefleri getir
        if (branchIds.length > 0) {
          plansQuery = plansQuery.or(`customer_id.eq.${customerId},branch_id.in.(${branchIds.join(',')})`);
        } else {
          plansQuery = plansQuery.eq('customer_id', customerId);
        }

        const [
          upcomingVisitsRes,
          recentVisitsRes,
          openActionsRes,
          plansRes
        ] = await Promise.all([
          supabase.from('visits').select(`id, visit_date, status, branch:branch_id(sube_adi), operator:operator_id(name)`).eq('customer_id', customerId).eq('status', 'planned').gte('visit_date', today).order('visit_date').limit(4),
          supabase.from('visits').select(`id, visit_date, status, branch:branch_id(sube_adi), operator:operator_id(name)`).eq('customer_id', customerId).in('status', ['completed', 'cancelled']).order('visit_date', { ascending: false }).limit(4),
          supabase.from('corrective_actions').select(`id, non_compliance_type, status, due_date, branch:branch_id(sube_adi)`).eq('customer_id', customerId).in('status', ['open', 'in_progress']).order('due_date').limit(3),
          plansQuery
        ]);

        const rawPlans = plansRes.data || [];
        const aggregatedPlans = Array.from({ length: 12 }, (_, i) => {
          const monthNum = i + 1;
          const plansForMonth = rawPlans.filter(p => p.month === monthNum);
          const total = plansForMonth.reduce((sum, p) => sum + (p.visits_required || 0), 0);
          return { month: monthNum, total_required: total };
        });

        setData({
          customerName: customerName,
          upcomingVisits: (upcomingVisitsRes.data || []).map((v: any) => ({
            ...v,
            branch: Array.isArray(v.branch) ? v.branch[0] : v.branch,
            operator: Array.isArray(v.operator) ? v.operator[0] : v.operator
          })),
          recentVisits: (recentVisitsRes.data || []).map((v: any) => ({
            ...v,
            branch: Array.isArray(v.branch) ? v.branch[0] : v.branch,
            operator: Array.isArray(v.operator) ? v.operator[0] : v.operator
          })),
          openActions: (openActionsRes.data || []).map((a: any) => ({
            ...a,
            branch: Array.isArray(a.branch) ? a.branch[0] : a.branch
          })),
          monthlyPlans: aggregatedPlans,
          stats: {
            totalBranches: branchesCount || 0,
            openActionCount: openActionsRes.data?.length || 0,
            nextVisitDate: upcomingVisitsRes.data?.[0]?.visit_date || null
          }
        });

      } catch (err: any) {
        console.error("Dashboard Hata:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <SkeletonLoader />;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
      <div className="bg-red-50 p-4 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">Veriler Yüklenemedi</h3>
      <p className="text-gray-500 mb-6">{error}</p>
      <button onClick={() => window.location.reload()} className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
        Tekrar Dene
      </button>
    </div>
  );

  if (!data) return null;

  const getFormattedNextVisit = (dateStr: string | null) => {
    if (!dateStr) return 'Planlanmadı';
    const d = new Date(dateStr);
    return isValid(d) ? format(d, 'dd MMM yyyy', { locale: tr }) : '-';
  };

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Günaydın' : currentHour < 18 ? 'İyi Günler' : 'İyi Akşamlar';

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Section */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-gray-500 font-medium mb-1">{greeting},</p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{data.customerName}</h1>
        </div>
        <div className="text-sm bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm text-gray-600 flex items-center">
          <CalendarDays className="w-4 h-4 mr-2 text-green-600" />
          {format(new Date(), 'dd MMMM yyyy, EEEE', { locale: tr })}
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Toplam Şube"
          value={data.stats.totalBranches}
          icon={<Building size={24} className="text-blue-600" />}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Açık Aksiyonlar"
          value={data.stats.openActionCount}
          icon={<AlertTriangle size={24} className="text-orange-600" />}
          color="bg-orange-100 text-orange-600"
        />
        <StatCard
          title="Sonraki Ziyaret"
          value={getFormattedNextVisit(data.stats.nextVisitDate)}
          icon={<Calendar size={24} className="text-purple-600" />}
          color="bg-purple-100 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">

          {/* Monthly Plan Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BarChart className="w-5 h-5 text-green-600" />
                {new Date().getFullYear()} Ziyaret Hedefleri
              </h2>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {data.monthlyPlans.map((plan) => {
                const isCurrent = plan.month === (new Date().getMonth() + 1);
                return (
                  <div
                    key={plan.month}
                    className={`flex flex-col items-center p-3 rounded-xl border transition-all ${isCurrent
                      ? 'bg-green-50 border-green-200 shadow-inner'
                      : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                  >
                    <span className={`text-xs font-semibold mb-1 ${isCurrent ? 'text-green-700' : 'text-gray-400'}`}>
                      {MONTH_NAMES[plan.month - 1]}
                    </span>
                    <div className={`text-lg font-bold ${plan.total_required > 0 ? (isCurrent ? 'text-green-800' : 'text-gray-800') : 'text-gray-300'}`}>
                      {plan.total_required}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visits Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">Yaklaşan Ziyaretler</h2>
              <button onClick={() => navigate('/customer/takvim')} className="text-sm font-semibold text-green-600 hover:text-green-700 hover:underline flex items-center">
                Tümünü Gör <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="space-y-3">
              {data.upcomingVisits.length > 0 ? (
                data.upcomingVisits.map(visit => <VisitCard key={visit.id} visit={visit} />)
              ) : (
                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Yaklaşan planlı ziyaret bulunmuyor.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">Son Ziyaretler</h2>
              <button onClick={() => navigate('/customer/ziyaretler')} className="text-sm font-semibold text-green-600 hover:text-green-700 hover:underline flex items-center">
                Tümünü Gör <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            <div className="space-y-3">
              {data.recentVisits.length > 0 ? (
                data.recentVisits.map(visit => <VisitCard key={visit.id} visit={visit} />)
              ) : (
                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Geçmiş ziyaret kaydı bulunamadı.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">Acil Aksiyonlar</h2>
              <button onClick={() => navigate('/customer/dof')} className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline">Tümü</button>
            </div>
            <div className="space-y-4">
              {data.openActions.length > 0 ? (
                data.openActions.map(action => <ActionCard key={action.id} action={action} />)
              ) : (
                <div className="text-center py-8 text-gray-400 bg-green-50 rounded-xl border border-green-100">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
                  <p className="text-sm text-green-800 font-medium">Harika!</p>
                  <p className="text-xs text-green-600">Açık uygunsuzluk bulunmuyor.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions / Promo Area (Placeholder) */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
            <h3 className="text-lg font-bold mb-2">Mobil Uygulama</h3>
            <p className="text-gray-300 text-sm mb-4">İlaçlamatik mobil uygulaması ile işlemlerinizi cebinizden yönetin.</p>
            <button className="w-full py-2 bg-white text-gray-900 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors">
              Yakında ...
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;