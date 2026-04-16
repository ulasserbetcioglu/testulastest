import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import {
  Bug, FileText, Calendar, DollarSign, PlusCircle, Warehouse,
  Receipt, ClipboardList, StickyNote, Search, ChevronRight, Loader2,
  Building, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import GoogleReviewPopup from '../components/Operator/GoogleReviewPopup';
import MandatoryWeeklyKmModal from '../components/Operator/MandatoryWeeklyKmModal';

// --- INTERFACES ---
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
  pendingOffers: number;
  plannedVisits: number;
  totalBranches: number;
  activeLocations: number;
  periodRevenue: number;
  yearlyRevenue: number;
  graphData: { name: string; ziyaret: number }[];
  recentTreatments: any[];
}

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
}

// Removed unused visitTypes constant

// --- HELPER COMPONENTS ---
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, change, changeType }) => {
  const changeColor = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-500',
  }[changeType || 'neutral'];

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">{title}</span>
        <div className="p-2 bg-green-50 text-green-600 rounded-lg shrink-0">{icon}</div>
      </div>
      <div className="mt-2">
        <p className="text-xl font-black text-gray-900 truncate">{value}</p>
        {change && (
          <div className="flex items-center text-[10px] mt-1">
            <span className={`${changeColor} font-medium truncate`}>{change}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ShortcutButton: React.FC<{ icon: any; label: string; to: string; color: string }> = ({ icon: Icon, label, to, color }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-100 transition-all group active:scale-95"
    >
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 mb-2 group-hover:scale-110 transition-transform`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
      <span className="text-xs font-bold text-gray-700 text-center leading-tight">{label}</span>
    </button>
  );
};

// --- MAIN COMPONENT ---
const OperatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'thisMonth' | 'lastMonth' | 'thisYear'>('thisMonth');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState<string>('');
  const [assignedBranches, setAssignedBranches] = useState<string[] | null>(null);
  const [showWeeklyKmModal, setShowWeeklyKmModal] = useState(false);
  const [showReviewPopup, setShowReviewPopup] = useState(false);

  // Quick Visit States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [quickVisitData, setQuickVisitData] = useState({
    customerId: '',
    branchId: '',
    visitType: 'periyodik',
    visitDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [startingVisit, setStartingVisit] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setWelcomeMessage('Günaydın');
    else if (hour < 18) setWelcomeMessage('İyi Günler');
    else setWelcomeMessage('İyi Akşamlar');
  }, []);

  const fetchOperatorInfo = useCallback(async () => {
    try {
      const opData = await localAuth.getOperatorData('id, name, assigned_customers, assigned_branches');
      if (opData) {
        setOperatorId(opData.id);
        setOperatorName(opData.name || '');
        setAssignedBranches(opData.assigned_branches);
        fetchCustomers(opData.assigned_customers);
      }
    } catch (err) {
      console.error("Operatör bilgisi çekilemedi:", err);
    }
  }, []);

  useEffect(() => {
    fetchOperatorInfo();
  }, [fetchOperatorInfo]);

  const fetchCustomers = async (assignedIds: string[] | null) => {
    try {
      let query = supabase.from('customers').select('id, kisa_isim').eq('is_active', true).order('kisa_isim');
      if (assignedIds && assignedIds.length > 0) {
        query = query.in('id', assignedIds);
      }
      const { data } = await query;
      setCustomers(data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (quickVisitData.customerId) {
      const fetchBranches = async () => {
        let query = supabase
          .from('branches')
          .select('id, sube_adi')
          .eq('customer_id', quickVisitData.customerId)
          .order('sube_adi');

        if (assignedBranches && assignedBranches.length > 0) {
          query = query.in('id', assignedBranches);
        }

        const { data } = await query;
        setBranches(data || []);
        if (data && data.length > 0) {
          setQuickVisitData(prev => ({ ...prev, branchId: data[0].id }));
        } else {
          setQuickVisitData(prev => ({ ...prev, branchId: '' }));
        }
      };
      fetchBranches();
    } else {
      setBranches([]);
    }
  }, [quickVisitData.customerId, assignedBranches]);

  const handleQuickVisitStart = async () => {
    if (!quickVisitData.customerId || !operatorId) {
      toast.error('Lütfen bir müşteri seçin.');
      return;
    }

    setStartingVisit(true);
    try {
      const { data, error } = await supabase
        .from('visits')
        .insert([{
          customer_id: quickVisitData.customerId,
          branch_id: quickVisitData.branchId || null,
          operator_id: operatorId,
          visit_date: new Date(quickVisitData.visitDate).toISOString(),
          visit_type: 'periyodik', // Değiştirilmediği için varsayılan periyodik
          status: 'planned'
        }])
        .select('id')
        .single();

      if (error) throw error;
      navigate(`/operator/ziyaretler/${data.id}/start`);
    } catch (err: any) {
      toast.error('Ziyaret başlatılamadı: ' + err.message);
    } finally {
      setStartingVisit(false);
    }
  };

  // Pre-existing stats fetching logic (minimized for brevity in thought, but included here)
  useEffect(() => {
    const fetchStats = async () => {
      if (!operatorId) return;
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

      try {
        const [visitsRes, customersRes, offersRes, plannedVisitsRes, revenueRes, recentTreatmentsRes] = await Promise.all([
          supabase.from('visits').select('id, visit_date', { count: 'exact' }).eq('operator_id', operatorId).gte('visit_date', start.toISOString()).lte('visit_date', end.toISOString()),
          supabase.from('customers').select('id', { count: 'exact' }),
          supabase.from('offers').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('visits').select('id', { count: 'exact' }).eq('operator_id', operatorId).eq('status', 'planned').gte('visit_date', today.toISOString()).lte('visit_date', new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('offers').select('total_amount').eq('status', 'accepted').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
          supabase.from('visits').select(`id, visit_date, status, customer:customer_id(kisa_isim), operator:operator_id(name)`).eq('operator_id', operatorId).order('visit_date', { ascending: false }).limit(5)
        ]);

        const periodRevenue = revenueRes.data?.reduce((sum, offer) => sum + (offer.total_amount || 0), 0) || 0;
        const graphData = (visitsRes.data || []).reduce((acc: any, visit: any) => {
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
          totalBranches: 0, // Simplified
          activeLocations: 0, // Simplified
          periodRevenue,
          yearlyRevenue: 0, // Simplified
          graphData: Object.values(graphData),
          recentTreatments: recentTreatmentsRes.data || []
        });
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [operatorId, timePeriod]);

  // KM Modal Logic
  useEffect(() => {
    const checkKm = async () => {
      if (!operatorId) return;
      const today = new Date();
      if (today.getDay() !== 1) return; // Sadece Pazartesi

      const { data: vehicles } = await supabase.from('vehicles').select('updated_at').eq('operator_id', operatorId).eq('status', 'active');
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const hasUpdate = vehicles?.some(v => v.updated_at && new Date(v.updated_at) >= startOfToday);

      if (!hasUpdate) setShowWeeklyKmModal(true);
    };
    checkKm();
  }, [operatorId]);

  const filteredCustomers = customers.filter(c => c.kisa_isim.toLowerCase().includes(customerSearch.toLowerCase()));

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-green-600 uppercase tracking-widest">{welcomeMessage}, {operatorName}</p>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Operatör Paneli</h1>
        </div>
        <button onClick={() => setShowReviewPopup(true)} className="p-2 bg-yellow-50 text-yellow-600 rounded-full border border-yellow-100 active:scale-90 transition-transform">
          <StickyNote size={20} />
        </button>
      </header>

      {/* Shortcuts Grid */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Hızlı Erişim</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <ShortcutButton icon={PlusCircle} label="Yeni Ziyaret" to="/operator/ziyaretler/yeni" color="bg-blue-500" />
          <ShortcutButton icon={Warehouse} label="Depo Transfer" to="/operator/depolar/transfer" color="bg-purple-500" />
          <ShortcutButton icon={Receipt} label="Tahsilat" to="/operator/tahsilat-makbuzu" color="bg-orange-500" />
          <ShortcutButton icon={ClipboardList} label="Günlük Form" to="/operator/gunluk-kontrol" color="bg-green-500" />
          <ShortcutButton icon={StickyNote} label="Hızlı Notlar" to="/operator/hizli-notlar" color="bg-pink-500" />
          <ShortcutButton icon={Calendar} label="Takvim" to="/operator/takvim" color="bg-indigo-500" />
        </div>
      </section>

      {/* Simplified Quick Visit Widget */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-gray-900">Hızlı Ziyaret Başlat</h2>
          <div className="p-2 bg-green-50 text-green-600 rounded-xl">
            <PlusCircle size={20} />
          </div>
        </div>

        <div className="space-y-4">
          {/* Customer Selection */}
          <div className="relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Müşteri</label>
            <div
              onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
              className="w-full h-14 px-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer active:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Search size={18} className="text-gray-400" />
                <span className={`text-sm font-bold ${quickVisitData.customerId ? 'text-gray-900' : 'text-gray-400'}`}>
                  {quickVisitData.customerId ? customers.find(c => c.id === quickVisitData.customerId)?.kisa_isim : 'Müşteri ara...'}
                </span>
              </div>
              <ChevronRight size={18} className={`text-gray-400 transition-transform ${showCustomerDropdown ? 'rotate-90' : ''}`} />
            </div>

            {showCustomerDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-gray-50">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Müşteri adıyla ara..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full h-10 px-3 bg-gray-50 rounded-lg text-sm font-bold border-none focus:ring-1 focus:ring-green-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        setQuickVisitData({ ...quickVisitData, customerId: customer.id, branchId: '' });
                        setShowCustomerDropdown(false);
                        setCustomerSearch('');
                      }}
                      className="w-full px-5 py-4 text-left text-sm font-bold text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors flex items-center justify-between border-b border-gray-50 last:border-0"
                    >
                      {customer.kisa_isim}
                      {quickVisitData.customerId === customer.id && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                    </button>
                  )) : (
                    <div className="p-8 text-center text-xs text-gray-400 font-bold">Müşteri bulunamadı.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Branch Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Şube</label>
            <div className="relative">
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
              <select
                value={quickVisitData.branchId}
                onChange={(e) => setQuickVisitData({ ...quickVisitData, branchId: e.target.value })}
                className="w-full h-14 pl-12 pr-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm font-bold text-gray-900 focus:ring-1 focus:ring-green-500 outline-none appearance-none disabled:opacity-50 transition-all"
                disabled={!quickVisitData.customerId || branches.length === 0}
              >
                {branches.length === 0 ? <option value="">Şube Yok</option> : null}
                {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.sube_adi}</option>)}
              </select>
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Ziyaret Tarihi</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" size={18} />
              <input
                type="date"
                value={quickVisitData.visitDate}
                onChange={(e) => setQuickVisitData({ ...quickVisitData, visitDate: e.target.value })}
                className="w-full h-14 pl-12 pr-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm font-bold text-gray-900 focus:ring-1 focus:ring-green-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            onClick={handleQuickVisitStart}
            disabled={startingVisit || !quickVisitData.customerId}
            className="w-full h-16 bg-green-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-2"
          >
            {startingVisit ? <Loader2 className="animate-spin" /> : <>Ziyareti Başlat <ArrowRight size={20} /></>}
          </button>
        </div>
      </section>

      {/* Stats Section */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Performans Özeti</h2>
          <div className="flex gap-1">
            {['thisMonth', 'lastMonth', 'thisYear'].map((p) => (
              <button
                key={p}
                onClick={() => setTimePeriod(p as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${timePeriod === p ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-400 hover:text-gray-900'
                  }`}
              >
                {p === 'thisMonth' ? 'Bu Ay' : p === 'lastMonth' ? 'Geçen Ay' : 'Bu Yıl'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Ziyaretler" value={stats.periodVisits} icon={<Bug size={18} />} change="Tamamlanan" />
            <StatCard title="Gelir" value={stats.periodRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })} icon={<DollarSign size={18} />} change="Kabul edilen" changeType="positive" />
            <StatCard title="Bekleyen" value={stats.pendingOffers} icon={<FileText size={18} />} change="Teklifler" />
            <StatCard title="Gelecek" value={stats.plannedVisits} icon={<Calendar size={18} />} change="7 Günlük Plan" />
          </div>
        ) : null}
      </section>

      {/* Graph & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-6">Ziyaret Grafiği</h2>
          <div className="h-64 sm:h-80">
            {stats && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.graphData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 700 }} />
                  <Bar dataKey="ziyaret" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 mb-6">Son İşlemler</h2>
          <div className="space-y-4">
            {stats?.recentTreatments.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors group cursor-pointer">
                <div className={`p-2 rounded-xl ${t.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                  <Bug size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate tracking-tight">{t.customer?.kisa_isim}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{format(new Date(t.visit_date), 'dd MMMM yyyy', { locale: tr })}</p>
                </div>
                <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-green-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {operatorId && showWeeklyKmModal && (
        <MandatoryWeeklyKmModal
          isOpen={showWeeklyKmModal}
          operatorId={operatorId}
          operatorName={operatorName}
          onSuccess={() => setShowWeeklyKmModal(false)}
        />
      )}
      {showReviewPopup && (
        <GoogleReviewPopup
          isOpen={showReviewPopup}
          onClose={() => setShowReviewPopup(false)}
        />
      )}
    </div>
  );
};

export default OperatorDashboard;