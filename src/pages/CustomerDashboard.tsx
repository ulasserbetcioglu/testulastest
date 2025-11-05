import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, FileText, AlertTriangle, CheckCircle, X, User, Building, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

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

interface DashboardData {
  customerName: string;
  upcomingVisits: Visit[];
  recentVisits: Visit[];
  openActions: CorrectiveAction[];
  stats: {
    totalBranches: number;
    openActionCount: number;
    nextVisitDate: string | null;
  };
}

// --- YARDIMCI BİLEŞENLER ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-green-100 text-green-600 rounded-full">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  </div>
);

const VisitCard: React.FC<{ visit: Visit }> = ({ visit }) => {
  const statusConfig = {
    planned: { icon: Clock, color: 'text-yellow-500', text: 'Planlandı' },
    completed: { icon: CheckCircle, color: 'text-green-500', text: 'Tamamlandı' },
    cancelled: { icon: X, color: 'text-red-500', text: 'İptal Edildi' },
  }[visit.status];

  const Icon = statusConfig.icon;

  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
      <div className={`p-2 rounded-full ${statusConfig.color.replace('text', 'bg').replace('500', '100')}`}>
        <Icon className={`w-5 h-5 ${statusConfig.color}`} />
      </div>
      <div>
        <p className="font-bold text-gray-800">{visit.branch?.sube_adi || 'Genel Merkez'}</p>
        <p className="text-sm text-gray-500">{format(new Date(visit.visit_date), 'dd MMMM yyyy, HH:mm', { locale: tr })}</p>
        <p className="text-xs text-gray-400 mt-1">Operatör: {visit.operator?.name || 'Atanmadı'}</p>
      </div>
    </div>
  );
};

const ActionCard: React.FC<{ action: CorrectiveAction }> = ({ action }) => {
    const typeConfig = {
        kritik: { text: 'Kritik', color: 'bg-red-100 text-red-700' },
        major: { text: 'Majör', color: 'bg-orange-100 text-orange-700' },
        minor: { text: 'Minör', color: 'bg-yellow-100 text-yellow-700' },
    }[action.non_compliance_type];

    return (
        <div className="flex items-start gap-4 p-4 border-l-4 border-red-500 bg-red-50 rounded-r-lg">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeConfig.color}`}>{typeConfig.text}</span>
                    <p className="font-bold text-gray-800">{action.branch?.sube_adi || 'Genel Merkez'}</p>
                </div>
                <p className="text-sm text-gray-600">
                    Son Tarih: <span className="font-semibold">{format(new Date(action.due_date), 'dd MMMM yyyy', { locale: tr })}</span> ({formatDistanceToNow(new Date(action.due_date), { locale: tr, addSuffix: true })})
                </p>
            </div>
        </div>
    );
};

const SkeletonLoader: React.FC = () => (
    <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="h-24 bg-gray-200 rounded-2xl"></div>
            <div className="h-24 bg-gray-200 rounded-2xl"></div>
            <div className="h-24 bg-gray-200 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
        </div>
    </div>
);

// --- ANA BİLEŞEN ---
const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');

        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id, kisa_isim')
          .eq('auth_id', user.id)
          .single();

        if (customerError || !customerData) throw new Error('Müşteri bilgileri alınamadı.');
        const customerId = customerData.id;

        const today = new Date().toISOString();
        
        const [
          upcomingVisitsRes,
          recentVisitsRes,
          openActionsRes,
          branchesRes
        ] = await Promise.all([
          supabase.from('visits').select(`id, visit_date, status, branch:branch_id(sube_adi), operator:operator_id(name)`).eq('customer_id', customerId).eq('status', 'planned').gte('visit_date', today).order('visit_date').limit(5),
          supabase.from('visits').select(`id, visit_date, status, branch:branch_id(sube_adi), operator:operator_id(name)`).eq('customer_id', customerId).in('status', ['completed', 'cancelled']).order('visit_date', { ascending: false }).limit(5),
          supabase.from('corrective_actions').select(`id, non_compliance_type, status, due_date, branch:branch_id(sube_adi)`).eq('customer_id', customerId).in('status', ['open', 'in_progress']).order('due_date'),
          supabase.from('branches').select('id', { count: 'exact' }).eq('customer_id', customerId)
        ]);
        
        const errors = [upcomingVisitsRes.error, recentVisitsRes.error, openActionsRes.error, branchesRes.error];
        const firstError = errors.find(e => e);
        if (firstError) throw firstError;

        setData({
          customerName: customerData.kisa_isim,
          upcomingVisits: upcomingVisitsRes.data || [],
          recentVisits: recentVisitsRes.data || [],
          openActions: openActionsRes.data || [],
          stats: {
            totalBranches: branchesRes.count || 0,
            openActionCount: openActionsRes.data?.length || 0,
            nextVisitDate: upcomingVisitsRes.data?.[0]?.visit_date || null
          }
        });

      } catch (err: any) {
        toast.error(`Veriler yüklenirken hata: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-8"><SkeletonLoader /></div>;
  if (!data) return <div className="p-8 text-center text-red-500">Müşteri verileri yüklenemedi.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <p className="text-xl text-gray-500">Hoş Geldiniz,</p>
        <h1 className="text-4xl font-bold text-gray-800">{data.customerName}</h1>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <StatCard title="Toplam Şube Sayısı" value={data.stats.totalBranches} icon={<Building size={24} />} />
        <StatCard title="Açık DÖF Sayısı" value={data.stats.openActionCount} icon={<AlertTriangle size={24} />} />
        <StatCard title="Sonraki Ziyaret" value={data.stats.nextVisitDate ? format(new Date(data.stats.nextVisitDate), 'dd MMM yyyy', { locale: tr }) : 'Planlanmadı'} icon={<Calendar size={24} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yaklaşan Ziyaretler */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Yaklaşan Ziyaretler</h2>
            <button onClick={() => navigate('/customer/takvim')} className="text-sm font-semibold text-green-600 hover:underline">Tümünü Gör</button>
          </div>
          {data.upcomingVisits.length > 0 ? (
            <div className="space-y-4">
              {data.upcomingVisits.map(visit => <VisitCard key={visit.id} visit={visit} />)}
            </div>
          ) : <p className="text-center py-8 text-gray-500">Yaklaşan ziyaret bulunmuyor.</p>}
        </div>

        {/* Açık Aksiyonlar */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Açık Aksiyonlar</h2>
            <button onClick={() => navigate('/customer/dof')} className="text-sm font-semibold text-green-600 hover:underline">Tümünü Gör</button>
          </div>
          {data.openActions.length > 0 ? (
            <div className="space-y-4">
              {data.openActions.map(action => <ActionCard key={action.id} action={action} />)}
            </div>
          ) : <p className="text-center py-8 text-gray-500">Açık aksiyon bulunmuyor.</p>}
        </div>

        {/* Son Ziyaretler */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Son Ziyaretler</h2>
            <button onClick={() => navigate('/customer/ziyaretler')} className="text-sm font-semibold text-green-600 hover:underline">Tümünü Gör</button>
          </div>
          {data.recentVisits.length > 0 ? (
            <div className="space-y-4">
              {data.recentVisits.map(visit => <VisitCard key={visit.id} visit={visit} />)}
            </div>
          ) : <p className="text-center py-8 text-gray-500">Geçmiş ziyaret bulunmuyor.</p>}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
