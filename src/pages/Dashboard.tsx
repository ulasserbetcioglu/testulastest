import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bug, Users, FileText, Calendar, DollarSign, TrendingUp, TrendingDown, 
  Loader2, MapPin, Building, AlertTriangle, ArrowUpRight, ArrowDownRight, Award 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

// --- RENK PALETİ ---
const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

// --- ARAYÜZLER ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number; // Yüzdelik değişim
  subText?: string;
  isCurrency?: boolean;
}

interface OperatorPerformance {
  name: string;
  count: number;
  revenue: number;
}

interface DashboardStats {
  periodVisits: number;
  prevPeriodVisits: number;
  totalCustomers: number;
  activeContracts: number;
  pendingOffersCount: number;
  pendingOffersValue: number;
  periodRevenue: number;
  prevPeriodRevenue: number;
  graphData: { name: string; ziyaret: number; ciro: number }[];
  pestDistribution: { name: string; value: number }[];
  topOperators: OperatorPerformance[];
  recentActivities: any[];
}

// --- GELİŞMİŞ İSTATİSTİK KARTI ---
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, subText, isCurrency }) => {
  const isPositive = trend && trend >= 0;
  
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110">
        {React.cloneElement(icon as React.ReactElement, { size: 64 })}
      </div>
      
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-gray-50 rounded-xl text-gray-700 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isPositive ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
            %{Math.abs(trend).toFixed(1)}
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {isCurrency 
              ? Number(value).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }) 
              : value}
          </span>
        </div>
        {subText && <p className="text-xs text-gray-400 mt-2">{subText}</p>}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'thisMonth' | 'lastMonth' | 'thisYear'>('thisMonth');
  
  // Tarih Hesaplayıcı
  const getDateRange = (period: string) => {
    const today = new Date();
    let start, end, prevStart, prevEnd;

    if (period === 'thisYear') {
      start = startOfYear(today);
      end = endOfYear(today);
      prevStart = startOfYear(subMonths(today, 12)); // Geçen yıl
      prevEnd = endOfYear(subMonths(today, 12));
    } else if (period === 'lastMonth') {
      const lastMonth = subMonths(today, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
      prevStart = startOfMonth(subMonths(lastMonth, 1));
      prevEnd = endOfMonth(subMonths(lastMonth, 1));
    } else { // thisMonth
      start = startOfMonth(today);
      end = endOfMonth(today);
      prevStart = startOfMonth(subMonths(today, 1));
      prevEnd = endOfMonth(subMonths(today, 1));
    }
    return { start, end, prevStart, prevEnd };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { start, end, prevStart, prevEnd } = getDateRange(timePeriod);

      try {
        // 1. ZİYARETLER (Şimdiki ve Önceki Dönem)
        const [currVisits, prevVisits] = await Promise.all([
          supabase.from('visits').select('id, visit_date, visit_type, operator_id, operator:operator_id(name)').gte('visit_date', start.toISOString()).lte('visit_date', end.toISOString()),
          supabase.from('visits').select('id').gte('visit_date', prevStart.toISOString()).lte('visit_date', prevEnd.toISOString())
        ]);

        // 2. CİRO (Onaylanan Teklifler - Şimdiki ve Önceki)
        const [currRev, prevRev] = await Promise.all([
          supabase.from('offers').select('total_amount, created_at').eq('status', 'accepted').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
          supabase.from('offers').select('total_amount').eq('status', 'accepted').gte('created_at', prevStart.toISOString()).lte('created_at', prevEnd.toISOString())
        ]);

        // 3. DİĞER METRİKLER
        const [customersRes, pendingOffersRes, activitiesRes] = await Promise.all([
          supabase.from('customers').select('id', { count: 'exact' }),
          supabase.from('offers').select('total_amount', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('visits')
            .select(`id, visit_date, status, customer:customer_id(kisa_isim), operator:operator_id(name)`)
            .order('visit_date', { ascending: false })
            .limit(6)
        ]);

        // --- VERİ İŞLEME ---

        // Ciro Hesaplama
        const periodRevenue = currRev.data?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0;
        const prevPeriodRevenue = prevRev.data?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0;
        const pendingValue = pendingOffersRes.data?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0;

        // Grafik Verisi (Günlük)
        const graphMap = new Map();
        currVisits.data?.forEach(v => {
          const day = format(new Date(v.visit_date), 'd MMM', { locale: tr });
          if (!graphMap.has(day)) graphMap.set(day, { name: day, ziyaret: 0, ciro: 0 });
          graphMap.get(day).ziyaret += 1;
        });
        // Ciro grafiğe ekle
        currRev.data?.forEach(o => {
          const day = format(new Date(o.created_at), 'd MMM', { locale: tr });
          if (!graphMap.has(day)) graphMap.set(day, { name: day, ziyaret: 0, ciro: 0 });
          graphMap.get(day).ciro += o.total_amount;
        });
        // Tarihe göre sırala ve diziye çevir
        const graphData = Array.from(graphMap.values()).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

        // Pasta Grafik (Ziyaret Türleri)
        const typeMap = new Map();
        currVisits.data?.forEach(v => {
          const type = Array.isArray(v.visit_type) ? v.visit_type[0] : v.visit_type;
          const label = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Diğer';
          typeMap.set(label, (typeMap.get(label) || 0) + 1);
        });
        const pestDistribution = Array.from(typeMap).map(([name, value]) => ({ name, value }));

        // Operatör Lider Tablosu
        const opMap = new Map();
        currVisits.data?.forEach(v => {
          //@ts-ignore
          const name = v.operator?.name || 'Atanmamış';
          if (!opMap.has(name)) opMap.set(name, { name, count: 0, revenue: 0 });
          opMap.get(name).count += 1;
        });
        const topOperators = Array.from(opMap.values()).sort((a: any, b: any) => b.count - a.count).slice(0, 5);

        setStats({
          periodVisits: currVisits.data?.length || 0,
          prevPeriodVisits: prevVisits.data?.length || 0,
          totalCustomers: customersRes.count || 0,
          activeContracts: 0, // Sözleşme modülü eklenirse burası dolar
          pendingOffersCount: pendingOffersRes.count || 0,
          pendingOffersValue: pendingValue,
          periodRevenue,
          prevPeriodRevenue,
          graphData,
          pestDistribution,
          topOperators: topOperators as OperatorPerformance[],
          recentActivities: activitiesRes.data || []
        });

      } catch (error) {
        console.error(error);
        toast.error('Veriler yüklenirken hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timePeriod]);

  // Yüzdelik Değişim Hesapla
  const calculateTrend = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      
      {/* BAŞLIK & FİLTRE */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Yönetim Paneli</h1>
          <p className="text-gray-500 text-sm">İşletmenizin genel performans özeti.</p>
        </div>
        <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex">
          {['thisMonth', 'lastMonth', 'thisYear'].map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period as any)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                timePeriod === period 
                  ? 'bg-gray-900 text-white shadow' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {period === 'thisMonth' ? 'Bu Ay' : period === 'lastMonth' ? 'Geçen Ay' : 'Bu Yıl'}
            </button>
          ))}
        </div>
      </div>

      {loading || !stats ? (
        <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/></div>
      ) : (
        <div className="space-y-6">
          
          {/* 1. KPI KARTLARI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard 
              title="Toplam Ciro" 
              value={stats.periodRevenue} 
              icon={<DollarSign />} 
              isCurrency 
              trend={calculateTrend(stats.periodRevenue, stats.prevPeriodRevenue)}
              subText="Kabul edilen teklifler"
            />
            <StatCard 
              title="Gerçekleşen Ziyaret" 
              value={stats.periodVisits} 
              icon={<Bug />} 
              trend={calculateTrend(stats.periodVisits, stats.prevPeriodVisits)}
              subText="Tamamlanan servisler"
            />
            <StatCard 
              title="Bekleyen Teklifler" 
              value={stats.pendingOffersValue} 
              icon={<FileText />} 
              isCurrency
              subText={`${stats.pendingOffersCount} adet teklif onay bekliyor`}
            />
            <StatCard 
              title="Toplam Müşteri" 
              value={stats.totalCustomers} 
              icon={<Users />} 
              subText="Sistemdeki kayıtlı cari"
            />
          </div>

          {/* 2. GRAFİKLER ALANI */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* SOL: Ciro ve Ziyaret Trendi */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Ciro & Ziyaret Analizi</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.graphData}>
                    <defs>
                      <linearGradient id="colorCiro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₺${val/1000}k`} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="ciro" name="Ciro (TL)" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCiro)" strokeWidth={3} />
                    <Bar yAxisId="right" dataKey="ziyaret" name="Ziyaret Adedi" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SAĞ: Ziyaret Türü Dağılımı */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Ziyaret Dağılımı</h3>
              <p className="text-xs text-gray-500 mb-6">Yapılan servislerin türlerine göre oranı</p>
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pestDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.pestDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 3. ALT BÖLÜM: Lider Tablosu ve Son İşlemler */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Operatör Lider Tablosu */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Award className="text-yellow-500" /> Ayın Performansı
              </h3>
              <div className="space-y-4">
                {stats.topOperators.length > 0 ? (
                  stats.topOperators.map((op, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                          {idx + 1}
                        </div>
                        <span className="font-medium text-gray-800">{op.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="block text-sm font-bold text-gray-900">{op.count} Ziyaret</span>
                        </div>
                        {idx === 0 && <Award size={20} className="text-yellow-500" />}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-4">Veri yok</p>
                )}
              </div>
            </div>

            {/* Son Aktiviteler */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Son Hareketler</h3>
                <button className="text-xs text-blue-600 font-medium hover:underline">Tümünü Gör</button>
              </div>
              <div className="space-y-0">
                {stats.recentActivities.length > 0 ? (
                  stats.recentActivities.map((act, i) => (
                    <div key={act.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors">
                      <div className={`mt-1 w-2 h-2 rounded-full ${act.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{act.customer?.kisa_isim || 'Müşteri'}</p>
                        <p className="text-xs text-gray-500">
                          {act.operator?.name || 'Operatör'} • {format(new Date(act.visit_date), 'dd MMM HH:mm', { locale: tr })}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        act.status === 'completed' ? 'bg-green-100 text-green-700' : 
                        act.status === 'planned' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {act.status === 'completed' ? 'Tamamlandı' : act.status === 'planned' ? 'Planlı' : act.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-4">Hareket yok</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;