import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bug, Users, FileText, Calendar, DollarSign, TrendingUp, TrendingDown, 
  Loader2, MapPin, Building, PlusCircle, ArrowRight 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// --- ARAYÜZLER (INTERFACES) ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subText?: string;
  onClick?: () => void;
}

interface DashboardStats {
  periodVisits: number;
  totalCustomers: number;
  pendingOffers: number;
  plannedVisits: number;
  totalBranches: number;
  activeLocations: number;
  periodRevenue: number;
  yearlyRevenue: number;
  graphData: { name: string; ziyaret: number }[];
  recentTreatments: any[];
}

// --- YARDIMCI BİLEŞENLER ---

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, change, changeType, subText, onClick }) => {
  const changeColor = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-500',
  }[changeType || 'neutral'];

  return (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 flex flex-col justify-between ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-sm font-medium text-gray-500">{title}</span>
          <h3 className="text-3xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${changeType === 'positive' ? 'bg-green-50 text-green-600' : changeType === 'negative' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
          {icon}
        </div>
      </div>
      
      {(change || subText) && (
        <div className="flex items-center text-xs text-gray-500 border-t border-gray-50 pt-3 mt-1">
          {change && (
            <div className="flex items-center mr-3">
              {changeType === 'positive' && <TrendingUp size={14} className={`mr-1 ${changeColor}`} />}
              {changeType === 'negative' && <TrendingDown size={14} className={`mr-1 ${changeColor}`} />}
              <span className={`font-medium ${changeColor}`}>{change}</span>
            </div>
          )}
          {subText && <span>{subText}</span>}
        </div>
      )}
    </div>
  );
};

const QuickActionCard: React.FC<{ title: string; icon: React.ReactNode; onClick: () => void; color: string }> = ({ title, icon, onClick, color }) => (
  <button 
    onClick={onClick}
    className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-gray-200 transition-all group w-full text-left"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color} text-white`}>
        {icon}
      </div>
      <span className="font-semibold text-gray-700">{title}</span>
    </div>
    <ArrowRight size={18} className="text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
  </button>
);

const StatCardSkeleton: React.FC = () => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded w-20"></div>
        <div className="h-8 bg-gray-100 rounded w-16"></div>
      </div>
      <div className="h-12 w-12 bg-gray-100 rounded-xl"></div>
    </div>
    <div className="h-4 bg-gray-100 rounded w-3/4 mt-4"></div>
  </div>
);

// --- ANA PANEL BİLEŞENİ ---

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'thisMonth' | 'lastMonth' | 'thisYear'>('thisMonth');
  const [welcomeMessage, setWelcomeMessage] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setWelcomeMessage('Günaydın');
    else if (hour < 18) setWelcomeMessage('İyi Günler');
    else setWelcomeMessage('İyi Akşamlar');
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

        // Boş grafik verisi yerine, veri yoksa boş array dönelim ki UI'da düzgün handled edelim
        const sortedGraphData = Object.values(graphData).sort((a: any, b: any) => 
          new Date(a.name).getTime() - new Date(b.name).getTime()
        );

        setStats({
          periodVisits: visitsRes.count || 0,
          totalCustomers: customersRes.count || 0,
          pendingOffers: offersRes.count || 0,
          plannedVisits: plannedVisitsRes.count || 0,
          totalBranches: branchesRes.count || 0,
          activeLocations,
          periodRevenue,
          yearlyRevenue,
          graphData: sortedGraphData as { name: string; ziyaret: number }[],
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

  // Yardımcı fonksiyon: Dönem ismini getir
  const getPeriodLabel = () => {
    switch(timePeriod) {
      case 'thisMonth': return 'Bu Ay';
      case 'lastMonth': return 'Geçen Ay';
      case 'thisYear': return 'Bu Yıl';
      default: return '';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen font-sans text-gray-900">
      
      {/* BAŞLIK & HOŞGELDİN MESAJI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{welcomeMessage}, Yönetici</h1>
          <p className="text-gray-500 mt-1">İşte işletmenizin {getPeriodLabel().toLowerCase()} performans özeti.</p>
        </div>
        
        {/* Dönem Filtresi - Daha Modern Görünüm */}
        <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex">
          {[
            { id: 'thisMonth', label: 'Bu Ay' },
            { id: 'lastMonth', label: 'Geçen Ay' },
            { id: 'thisYear', label: 'Bu Yıl' }
          ].map((period) => (
            <button
              key={period.id}
              onClick={() => setTimePeriod(period.id as any)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                timePeriod === period.id 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : stats ? (
        <>
          {/* 1. ANA İSTATİSTİKLER (EN ÖNEMLİLER) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Dönemlik Ciro" 
              value={stats.periodRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })} 
              icon={<DollarSign size={24} />} 
              changeType="positive"
              subText={`${getPeriodLabel()} Kabul Edilen Teklifler`}
            />
            <StatCard 
              title="Tamamlanan Ziyaret" 
              value={stats.periodVisits} 
              icon={<Bug size={24} />} 
              changeType="neutral"
              subText={`${getPeriodLabel()} Gerçekleşen Servis`}
            />
            <StatCard 
              title="Bekleyen Teklifler" 
              value={stats.pendingOffers} 
              icon={<FileText size={24} />} 
              changeType="neutral"
              subText="Onay Bekleyen Teklif Sayısı"
              onClick={() => navigate('/admin/offers')}
            />
            <StatCard 
              title="Planlanan Ziyaretler" 
              value={stats.plannedVisits} 
              icon={<Calendar size={24} />} 
              changeType="neutral"
              subText="Önümüzdeki 7 Gün İçin"
              onClick={() => navigate('/admin/calendar')}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* 2. SOL KOLON: GRAFİK & DETAYLAR */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Ziyaret Grafiği */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Ziyaret Trafiği</h3>
                  {stats.graphData.length === 0 && <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded">Veri Yok</span>}
                </div>
                
                <div className="h-80 w-full">
                  {stats.graphData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.graphData}>
                        <defs>
                          <linearGradient id="colorZiyaret" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#9CA3AF', fontSize: 12}} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#9CA3AF', fontSize: 12}} 
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                          cursor={{ stroke: '#10B981', strokeWidth: 1, strokeDasharray: '5 5' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="ziyaret" 
                          stroke="#10B981" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorZiyaret)" 
                          name="Ziyaret Sayısı"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <BarChart size={48} className="mb-2 opacity-20" />
                      <p>Bu dönem için henüz ziyaret verisi yok.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Son Aktiviteler */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Son Aktiviteler</h3>
                  <button onClick={() => navigate('/admin/visits')} className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline">Tümünü Gör</button>
                </div>
                
                <div className="space-y-4">
                  {stats.recentTreatments.length > 0 ? (
                    stats.recentTreatments.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-gray-50 group">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${item.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {item.status === 'completed' ? <Bug size={18} /> : <Calendar size={18} />}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{item.customer?.kisa_isim || 'Müşteri'}</p>
                            <p className="text-xs text-gray-500">
                              {item.operator?.name || 'Operatör Yok'} • {format(new Date(item.visit_date), 'd MMM, HH:mm', { locale: tr })}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          item.status === 'completed' ? 'bg-green-50 text-green-700' : 
                          item.status === 'planned' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.status === 'completed' ? 'Tamamlandı' : item.status === 'planned' ? 'Planlı' : item.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Henüz son aktivite bulunmuyor.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* 3. SAĞ KOLON: HIZLI İŞLEMLER & ÖZETLER */}
            <div className="space-y-6">
              
              {/* Hızlı İşlemler */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Hızlı İşlemler</h3>
                <div className="space-y-3">
                  <QuickActionCard 
                    title="Yeni Müşteri Ekle" 
                    icon={<Users size={20} />} 
                    color="bg-blue-500"
                    onClick={() => navigate('/admin/customers')}
                  />
                  <QuickActionCard 
                    title="Teklif Oluştur" 
                    icon={<FileText size={20} />} 
                    color="bg-purple-500"
                    onClick={() => navigate('/admin/new-offer')}
                  />
                  <QuickActionCard 
                    title="Ziyaret Planla" 
                    icon={<Calendar size={20} />} 
                    color="bg-green-500"
                    onClick={() => navigate('/admin/calendar-planning')}
                  />
                </div>
              </div>

              {/* Genel Özet Kartları (Daha küçük) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mb-2">
                    <Users size={20} />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</span>
                  <span className="text-xs text-gray-500">Toplam Müşteri</span>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg mb-2">
                    <Building size={20} />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{stats.totalBranches}</span>
                  <span className="text-xs text-gray-500">Toplam Şube</span>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-lg mb-2">
                    <MapPin size={20} />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{stats.activeLocations}</span>
                  <span className="text-xs text-gray-500">Aktif Şehir</span>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-pink-50 text-pink-600 rounded-lg mb-2">
                    <TrendingUp size={20} />
                  </div>
                  <span className="text-lg font-bold text-gray-900 truncate w-full">
                    {stats.yearlyRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', notation: "compact", maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-xs text-gray-500">Yıllık Ciro</span>
                </div>
              </div>

            </div>
          </div>
        </>
      ) : (
        // Veri Yüklenemedi Durumu (Çok nadir)
        <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Loader2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Veriler Hazırlanıyor</h3>
          <p className="text-gray-500 mt-2">İstatistikleriniz birazdan burada görünecek.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;