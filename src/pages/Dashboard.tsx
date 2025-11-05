import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bug, Users, FileText, Calendar, DollarSign, TrendingUp, TrendingDown, Loader2, MapPin, Building } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

// --- ARAYÜZLER (INTERFACES) ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

interface DashboardStats {
  periodVisits: number;
  totalCustomers: number;
  totalBranches: number;
  activeLocations: number;
  pendingOffers: number;
  plannedVisits: number;
  periodRevenue: number;
  yearlyRevenue: number;
  graphData: { name: string; ziyaret: number }[];
  recentTreatments: any[];
}

// --- YARDIMCI BİLEŞENLER ---

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, change, changeType }) => {
  const changeColor = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-500',
  }[changeType || 'neutral'];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <span className="text-sm font-semibold text-gray-500">{title}</span>
        <div className="p-3 bg-green-100 text-green-600 rounded-full">{icon}</div>
      </div>
      <div>
        <p className="text-4xl font-bold text-gray-800 mt-2">{value}</p>
        {change && (
          <div className="flex items-center text-xs mt-1">
            {changeType === 'positive' && <TrendingUp size={14} className={changeColor} />}
            {changeType === 'negative' && <TrendingDown size={14} className={changeColor} />}
            <span className={`ml-1 ${changeColor}`}>{change}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCardSkeleton: React.FC = () => (
  <div className="bg-white p-6 rounded-2xl shadow-lg animate-pulse">
    <div className="flex justify-between items-start">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
    </div>
    <div className="mt-4 h-10 bg-gray-200 rounded w-1/3"></div>
    <div className="mt-2 h-3 bg-gray-200 rounded w-3/4"></div>
  </div>
);

// --- ANA PANEL BİLEŞENİ ---

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'thisMonth' | 'lastMonth' | 'thisYear'>('thisMonth');
  const [welcomeMessage, setWelcomeMessage] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setWelcomeMessage('İyi sabahlar');
    else if (hour < 18) setWelcomeMessage('İyi günler');
    else setWelcomeMessage('İyi akşamlar');
  }, []);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoading(true);
      
      const today = new Date();
      let start: Date, end: Date;

      if (timePeriod === 'thisYear') {
        start = startOfYear(today);
        end = endOfYear(today);
      } else {
        const baseDate = timePeriod === 'thisMonth' ? today : subMonths(today, 1);
        start = startOfMonth(baseDate);
        end = endOfMonth(baseDate);
      }
      
      const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      try {
        const [
          visitsRes,
          customersRes,
          offersRes,
          plannedVisitsRes,
          branchesRes,
          revenueRes,
          recentTreatmentsRes,
          citiesRes,
          yearlyRevenueRes,
        ] = await Promise.all([
          supabase.from('visits').select('id, visit_date', { count: 'exact' }).gte('visit_date', start.toISOString()).lte('visit_date', end.toISOString()),
          supabase.from('customers').select('id', { count: 'exact' }),
          supabase.from('offers').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'planned').gte('visit_date', today.toISOString()).lte('visit_date', next7Days.toISOString()),
          supabase.from('branches').select('id', { count: 'exact' }),
          supabase.from('offers').select('total_amount').eq('status', 'accepted').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
          supabase.from('visits').select(`id, visit_date, status, customer:customer_id(kisa_isim), operator:operator_id(name)`).order('visit_date', { ascending: false }).limit(5),
          supabase.from('customers').select('sehir').not('sehir', 'is', null),
          supabase.from('offers').select('total_amount').eq('status', 'accepted').gte('created_at', startOfYear(today).toISOString()).lte('created_at', endOfYear(today).toISOString()),
        ]);

        const errors = [visitsRes.error, customersRes.error, offersRes.error, plannedVisitsRes.error, branchesRes.error, revenueRes.error, recentTreatmentsRes.error, citiesRes.error, yearlyRevenueRes.error];
        const firstError = errors.find(e => e);
        if (firstError) throw firstError;

        const periodRevenue = revenueRes.data?.reduce((sum, offer) => sum + (offer.total_amount || 0), 0) || 0;
        const yearlyRevenue = yearlyRevenueRes.data?.reduce((sum, offer) => sum + (offer.total_amount || 0), 0) || 0;
        const activeLocations = new Set(citiesRes.data?.map(c => c.sehir)).size;

        const graphData = (visitsRes.data || []).reduce((acc: { [key: string]: { name: string; ziyaret: number } }, visit: any) => {
          const day = format(new Date(visit.visit_date), 'd MMM', { locale: tr });
          if (!acc[day]) acc[day] = { name: day, ziyaret: 0 };
          acc[day].ziyaret++;
          return acc;
        }, {});

        setStats({
          periodVisits: visitsRes.count || 0,
          totalCustomers: customersRes.count || 0,
          pendingOffers: offersRes.count || 0,
          plannedVisits: plannedVisitsRes.count || 0,
          totalBranches: branchesRes.count || 0,
          activeLocations,
          periodRevenue,
          yearlyRevenue,
          graphData: Object.values(graphData),
          recentTreatments: recentTreatmentsRes.data || []
        });

      } catch (err: any) {
        toast.error(`Veriler yüklenirken hata: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, [timePeriod]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <p className="text-lg text-gray-500">{welcomeMessage},</p>
        <h1 className="text-4xl font-bold text-gray-800">Panele Hoş Geldiniz</h1>
      </header>
      
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setTimePeriod('thisMonth')} className={`px-4 py-2 rounded-lg font-semibold ${timePeriod === 'thisMonth' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-700'}`}>Bu Ay</button>
        <button onClick={() => setTimePeriod('lastMonth')} className={`px-4 py-2 rounded-lg font-semibold ${timePeriod === 'lastMonth' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-700'}`}>Geçen Ay</button>
        <button onClick={() => setTimePeriod('thisYear')} className={`px-4 py-2 rounded-lg font-semibold ${timePeriod === 'thisYear' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-700'}`}>Bu Yıl</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Dönemlik Ziyaret" value={stats.periodVisits} icon={<Bug size={24} />} change={`${timePeriod === 'thisMonth' ? 'Bu ay' : timePeriod === 'lastMonth' ? 'Geçen ay' : 'Bu yıl'} yapılan`} />
            <StatCard title="Dönemlik Ciro" value={stats.periodRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} icon={<DollarSign size={24} />} change="Kabul edilen teklifler" changeType="positive" />
            <StatCard title="Yıllık Ciro" value={stats.yearlyRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} icon={<TrendingUp size={24} />} change={`${new Date().getFullYear()} toplamı`} changeType="positive" />
            <StatCard title="Bekleyen Teklifler" value={stats.pendingOffers} icon={<FileText size={24} />} change="Onay bekliyor" />
            <StatCard title="Planlanan Ziyaretler" value={stats.plannedVisits} icon={<Calendar size={24} />} change="Önümüzdeki 7 gün" />
            <StatCard title="Toplam Müşteri" value={stats.totalCustomers} icon={<Users size={24} />} />
            <StatCard title="Toplam Şube" value={stats.totalBranches} icon={<Building size={24} />} />
            <StatCard title="Aktif Konum" value={stats.activeLocations} icon={<MapPin size={24} />} change="Farklı şehir sayısı" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Ziyaret Grafiği ({timePeriod === 'thisMonth' ? 'Bu Ay' : timePeriod === 'lastMonth' ? 'Geçen Ay' : 'Bu Yıl'})</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.graphData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '0.5rem' }}/>
                  <Legend />
                  <Bar dataKey="ziyaret" fill="#10b981" name="Ziyaret Sayısı" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Son Aktiviteler</h2>
              <div className="space-y-4">
                {stats.recentTreatments.length > 0 ? stats.recentTreatments.map(treatment => (
                  <div key={treatment.id} className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${ { completed: 'bg-green-100 text-green-600', planned: 'bg-yellow-100 text-yellow-600', cancelled: 'bg-orange-100 text-orange-600' }[treatment.status] || 'bg-gray-100 text-gray-600' }`}>
                      <Bug size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{treatment.customer?.kisa_isim || 'Bilinmeyen Müşteri'}</p>
                      <p className="text-xs text-gray-500">{treatment.operator?.name || 'Atanmamış'} - {format(new Date(treatment.visit_date), 'dd MMM', { locale: tr })}</p>
                    </div>
                  </div>
                )) : <p className="text-sm text-gray-500">Yakın zamanda aktivite bulunamadı.</p>}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center p-10 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-700">Veri Bulunamadı</h3>
            <p className="text-gray-500 mt-2">Seçilen dönem için istatistik bulunamadı.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
