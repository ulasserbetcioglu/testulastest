import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bug, Users, FileText, Calendar, DollarSign, TrendingUp, TrendingDown, 
  Loader2, MapPin, PlusCircle, ArrowRight,
  Clock, CheckCircle2, Shield, Activity,
  Settings, LayoutGrid, Package,
  Eraser, Terminal, Image as ImageIcon, Maximize2, MessageSquare
} from 'lucide-react';
import { 
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// --- ARAYÜZLER (INTERFACES) ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  subText?: string;
  color: string;
  onClick?: () => void;
}

interface DashboardStats {
  periodVisits: number;
  totalCustomers: number;
  pendingOffers: number;
  openDOFCount: number;
  plannedVisits: number;
  totalBranches: number;
  activeLocations: number;
  periodRevenue: number;
  yearlyRevenue: number;
  graphData: { name: string; ziyaret: number; gelir: number }[];
  statusData: { name: string; value: number; color: string }[];
  recentActivities: any[];
}

// --- YARDIMCI BİLEŞENLER ---

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, subText, color, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500 group relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
  >
    {/* Background Pattern */}
    <div className={`absolute -right-4 -top-4 w-24 h-24 ${color} opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-700`}></div>
    
    <div className="flex justify-between items-start relative z-10">
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-extrabold text-gray-900 leading-none">{value}</h3>
      </div>
      <div className={`p-3 rounded-2xl ${color} shadow-lg shadow-current/10 text-white group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
    </div>
    
    <div className="mt-6 flex items-center justify-between relative z-10">
      {trend ? (
        <div className={`flex items-center text-sm font-bold ${trend.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend.isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
          {trend.value}
        </div>
      ) : (
        <div className="text-sm text-gray-400 flex items-center gap-1">
          <Activity size={14} />
          Canlı Veri
        </div>
      )}
      <span className="text-xs text-gray-400 font-medium">{subText}</span>
    </div>
  </div>
);

const QuickAction: React.FC<{ title: string; icon: React.ReactNode; color: string; onClick: () => void }> = ({ title, icon, color, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 w-full group"
  >
    <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <span className="font-bold text-gray-700 group-hover:text-gray-900 transition-colors uppercase tracking-tight text-sm">{title}</span>
    <ArrowRight className="ml-auto text-gray-300 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" size={18} />
  </button>
);

// --- ANA PANEL BİLEŞENİ ---

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const today = new Date();
        let start: Date, end: Date;

        if (period === 'year') {
          start = startOfYear(today);
          end = endOfYear(today);
        } else if (period === 'quarter') {
          start = subMonths(today, 3);
          end = today;
        } else {
          start = startOfMonth(today);
          end = endOfMonth(today);
        }

        const [
          visitsData,
          customersCount,
          pendingOffers,
          dofCount,
          plannedVisits,
          branchesCount,
          revenueData,
          recentVisits,
          citiesData
        ] = await Promise.all([
          supabase.from('visits').select('id, visit_date, status').gte('visit_date', start.toISOString()).lte('visit_date', end.toISOString()),
          supabase.from('customers').select('id', { count: 'exact' }),
          supabase.from('offers').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('corrective_actions').select('id', { count: 'exact' }).eq('status', 'open'),
          supabase.from('visits').select('id', { count: 'exact' }).eq('status', 'planned').gte('visit_date', today.toISOString()).lte('visit_date', subDays(today, -7).toISOString()),
          supabase.from('branches').select('id', { count: 'exact' }),
          supabase.from('offers').select('total_amount, created_at').eq('status', 'accepted').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
          supabase.from('visits').select('id, visit_date, status, customer:customer_id(kisa_isim), operator:operator_id(name)').order('visit_date', { ascending: false }).limit(6),
          supabase.from('customers').select('sehir')
        ]);

        const daysMap: Record<string, { name: string; ziyaret: number; gelir: number }> = {};
        visitsData.data?.forEach(v => {
          const d = format(new Date(v.visit_date), 'd MMM', { locale: tr });
          if (!daysMap[d]) daysMap[d] = { name: d, ziyaret: 0, gelir: 0 };
          daysMap[d].ziyaret++;
        });

        revenueData.data?.forEach(r => {
          const d = format(new Date(r.created_at), 'd MMM', { locale: tr });
          if (!daysMap[d]) daysMap[d] = { name: d, ziyaret: 0, gelir: 0 };
          daysMap[d].gelir += r.total_amount || 0;
        });

        const statusCounts = (visitsData.data || []).reduce((acc: any, v) => {
          acc[v.status] = (acc[v.status] || 0) + 1;
          return acc;
        }, {});

        const periodRevenue = (revenueData.data || []).reduce((sum, r) => sum + (r.total_amount || 0), 0);
        const activeLocations = new Set(citiesData.data?.map(c => c.sehir)).size;

        setStats({
          periodVisits: visitsData.data?.length || 0,
          totalCustomers: customersCount.count || 0,
          pendingOffers: pendingOffers.count || 0,
          openDOFCount: dofCount.count || 0,
          plannedVisits: plannedVisits.count || 0,
          totalBranches: branchesCount.count || 0,
          activeLocations,
          periodRevenue,
          yearlyRevenue: periodRevenue,
          graphData: Object.values(daysMap).slice(-15),
          statusData: [
            { name: 'Tamamlandı', value: statusCounts.completed || 0, color: '#10B981' },
            { name: 'Planlı', value: statusCounts.planned || 0, color: '#3B82F6' },
            { name: 'İptal', value: statusCounts.cancelled || 0, color: '#F43F5E' }
          ],
          recentActivities: recentVisits.data || []
        });

      } catch (err) {
        toast.error('Veriler yüklenirken bir sorun oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [period]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      <p className="text-gray-500 font-medium animate-pulse">Dashboard Verileri Hazırlanıyor...</p>
    </div>
  );

  return (
    <div className="p-6 space-y-10 animate-in fade-in duration-700 bg-gray-50/50 min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Shield size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Administrator Portal</span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Kontrol Paneli</h1>
          <p className="text-gray-500 font-medium flex items-center gap-2">
            <Activity size={16} className="text-emerald-500" />
            Sistem durumu: <span className="text-emerald-600 font-bold">Harika</span>
          </p>
        </div>

        <div className="flex bg-gray-100 p-1.5 rounded-2xl">
          {(['month', 'quarter', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                period === p ? 'bg-white text-gray-900 shadow-xl' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p === 'month' ? 'Aylık' : p === 'quarter' ? '3 Aylık' : 'Yıllık'}
            </button>
          ))}
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        <StatCard 
          title="Dönemlik Ciro"
          value={(stats?.periodRevenue || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })}
          icon={<DollarSign size={24} />}
          trend={{ value: '+12.5%', isPositive: true }}
          subText="Onaylanan Teklifler"
          color="bg-emerald-500 text-emerald-500"
        />
        <StatCard 
          title="Servis Sayısı"
          value={stats?.periodVisits || 0}
          icon={<Bug size={24} />}
          trend={{ value: '+4.2%', isPositive: true }}
          subText="Gerçekleşen Ziyaretler"
          color="bg-blue-500 text-blue-500"
        />
        <StatCard 
          title="Bekleyen İşler"
          value={(stats?.pendingOffers || 0) + (stats?.openDOFCount || 0)}
          icon={<Clock size={24} />}
          trend={{ value: `${stats?.openDOFCount || 0} DÖF`, isPositive: false }}
          subText="Teklif + Açık DÖF"
          color="bg-amber-500 text-amber-500"
          onClick={() => navigate('/dof')}
        />
        <StatCard 
          title="Müşteri Ağı"
          value={stats?.totalCustomers || 0}
          icon={<Users size={24} />}
          subText={`${stats?.totalBranches || 0} Aktif Şube`}
          color="bg-indigo-500 text-indigo-500"
          onClick={() => navigate('/musteriler')}
        />
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Main Growth Chart */}
        <div className="xl:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">İşlem Hacmi Analizi</h3>
              <p className="text-sm text-gray-400 font-medium">Ziyaret trafiği ve gelir dağılımı</p>
            </div>
          </div>

          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.graphData || []}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)', padding: '20px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="ziyaret" 
                  stroke="#3B82F6" 
                  strokeWidth={4}
                  fill="url(#blueGrad)" 
                  name="Ziyaretler"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center relative">
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter mb-8 self-start">Servis Durumu</h3>
          <div className="w-full h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.statusData || []}
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {(stats?.statusData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-4xl font-black text-gray-900 leading-none">{stats?.periodVisits}</p>
              <p className="text-xs font-bold text-gray-400 uppercase mt-1">Toplam</p>
            </div>
          </div>
          
          <div className="w-full space-y-3 mt-8">
            {(stats?.statusData || []).map(item => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }}></div>
                  <span className="text-sm font-bold text-gray-600">{item.name}</span>
                </div>
                <span className="text-sm font-black text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Recent Activities */}
        <div className="xl:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Saha Operasyonları</h3>
            <button 
              onClick={() => navigate('/ziyaretler')}
              className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            >
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(stats?.recentActivities || []).map(activity => (
              <div key={activity.id} className="p-4 rounded-2xl border border-gray-50 hover:border-blue-100 hover:bg-blue-50/30 transition-all group">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${activity.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {activity.status === 'completed' ? <CheckCircle2 size={20} /> : <Activity size={20} />}
                  </div>
                  <div className="space-y-1">
                    <p className="font-extrabold text-gray-900">{activity.customer?.kisa_isim}</p>
                    <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
                      <span className="flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                        <Users size={12} /> {activity.operator?.name}
                      </span>
                      <span>•</span>
                      <span>{format(new Date(activity.visit_date), 'd MMMM', { locale: tr })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions & Tools */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter mb-6 underline decoration-blue-500/30 decoration-4 underline-offset-8">Hızlı Araçlar</h3>
          <div className="space-y-4">
            <QuickAction 
              title="Yeni Teklif Hazırla" 
              icon={<FileText size={20} />} 
              color="bg-blue-500"
              onClick={() => navigate('/teklifler/new')}
            />
            <QuickAction 
              title="Müşteri Kaydı" 
              icon={<PlusCircle size={20} />} 
              color="bg-indigo-500"
              onClick={() => navigate('/musteriler')}
            />
            <QuickAction 
              title="Sistem Ayarları" 
              icon={<Settings size={20} />} 
              color="bg-gray-500"
              onClick={() => navigate('/ayarlar')}
            />
          </div>
        </div>

      </div>

      {/* NEW OTHER PAGES SECTION */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter mb-8 flex items-center gap-3">
          <LayoutGrid className="text-blue-600" size={24} />
          Diğer Yönetim Sayfaları
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[
            { name: 'Modüller', path: '/modules', icon: <LayoutGrid size={16} /> },
            { name: 'Ürün Yönetimi', path: '/urunler', icon: <Package size={16} /> },
            { name: 'Canlı Takip Haritası', path: '/canli-harita', icon: <MapPin size={16} /> },
            { name: 'Toplu Silme', path: '/toplu-silme', icon: <Eraser size={16} /> },
            { name: 'Veri Simülatörü', path: '/admin/simulator', icon: <Terminal size={16} /> },
            { name: 'Fotoğraf Taşıma', path: '/photo-migration', icon: <ImageIcon size={16} /> },
            { name: 'Kroki Düzenle', path: '/subeler/kroki-duzenle', icon: <Maximize2 size={16} /> },
            { name: 'Rapor Yönetimi', path: '/admin/ziyaret-raporlari', icon: <FileText size={16} /> },
            { name: 'Ücretli Ziyaretler', path: '/ucretli-ziyaretler', icon: <Calendar size={16} /> },
            { name: 'Mutabakat Yanıtları', path: '/admin/mutabakat-yanitlari', icon: <MessageSquare size={16} /> },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 p-3 text-left bg-gray-50 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-all group"
            >
              <div className="p-2 bg-white rounded-lg shadow-sm text-gray-400 group-hover:text-blue-600 transition-colors">
                {item.icon}
              </div>
              <span className="text-xs font-bold truncate uppercase tracking-tight">{item.name}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;