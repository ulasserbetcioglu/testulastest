import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bug, Users, FileText, Calendar, DollarSign, TrendingUp, TrendingDown, MapPin, Building, BellRing, BellOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, startOfWeek, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import GoogleReviewPopup from '../components/Operator/GoogleReviewPopup';
// DİKKAT: 2. attığınız Modal yerine 1. attığınız (Zorunlu) Modal import edildi
import MandatoryWeeklyKmModal from '../components/Operator/MandatoryWeeklyKmModal';

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

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, change, changeType }) => {
  const changeColor = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-500',
  }[changeType || 'neutral'];

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <span className="text-xs sm:text-sm font-semibold text-gray-500 leading-tight">{title}</span>
        <div className="p-2 sm:p-3 bg-green-100 text-green-600 rounded-full shrink-0 ml-2">{icon}</div>
      </div>
      <div>
        <p className="text-2xl sm:text-4xl font-bold text-gray-800 mt-1 sm:mt-2 truncate">{value}</p>
        {change && (
          <div className="flex items-center text-xs mt-1">
            {changeType === 'positive' && <TrendingUp size={14} className={changeColor} />}
            {changeType === 'negative' && <TrendingDown size={14} className={changeColor} />}
            <span className={`ml-1 ${changeColor} truncate`}>{change}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCardSkeleton: React.FC = () => (
  <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg animate-pulse">
    <div className="flex justify-between items-start">
      <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 rounded-full"></div>
    </div>
    <div className="mt-3 sm:mt-4 h-7 sm:h-10 bg-gray-200 rounded w-1/3"></div>
    <div className="mt-2 h-3 bg-gray-200 rounded w-3/4"></div>
  </div>
);

// --- ANA PANEL BİLEŞENİ ---

const OperatorDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'thisMonth' | 'lastMonth' | 'thisYear'>('thisMonth');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState<string>(''); // Modal için isim gerekli
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState('');
  
  // Modal Kontrolü
  const [showWeeklyKmModal, setShowWeeklyKmModal] = useState(false);

  // Google Review Popup state'i
  const [showReviewPopup, setShowReviewPopup] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setWelcomeMessage('İyi sabahlar');
    else if (hour < 18) setWelcomeMessage('İyi günler');
    else setWelcomeMessage('İyi akşamlar');
  }, []);

  // Operatör ID ve İsmini Çek
  useEffect(() => {
    const fetchOperatorId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: opData, error: opError } = await supabase
            .from('operators')
            .select('id, name') // name eklendi
            .eq('auth_id', user.id)
            .single();
          if (opError) throw opError;
          setOperatorId(opData.id);
          setOperatorName(opData.name || '');
        }
      } catch (err) {
        console.error("Operatör ID çekilirken hata:", err);
        toast.error("Operatör bilgileri yüklenemedi.");
      }
    };
    fetchOperatorId();
  }, []);

  // VAPID
  useEffect(() => {
    const fetchVapidKeyAndSubscriptionStatus = async () => {
      if (!operatorId) return;

      try {
        const publicVapidKey = 'BIyT6ZxE86Xj6uwaG30GDN6zDg0fz2sGHQRbLrCKc9fuP2fKxvxJwPCtpHO6j0pj3z2HyDwuNgfGq-pgKPCXNwo';
        setVapidPublicKey(publicVapidKey);

        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsPushEnabled(!!subscription);
        }
      } catch (err) {
        console.error("VAPID anahtarı hata:", err);
      }
    };
    fetchVapidKeyAndSubscriptionStatus();
  }, [operatorId]);

  // ✅ KM Giriş Zorunluluk Kontrolü
  useEffect(() => {
    const checkWeeklyKmEntry = async () => {
      if (!operatorId) return;

      try {
        const { data: vehicles, error } = await supabase
          .from('vehicles')
          .select('id, updated_at')
          .eq('operator_id', operatorId)
          .eq('status', 'active');

        if (error) throw error;

        const today = new Date();
        const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 }); // Pazartesi

        let kmEntryMadeThisWeek = false;
        if (vehicles && vehicles.length > 0) {
          for (const vehicle of vehicles) {
            if (vehicle.updated_at) {
              const lastUpdateDate = new Date(vehicle.updated_at);
              if (lastUpdateDate >= startOfThisWeek) {
                kmEntryMadeThisWeek = true;
                break;
              }
            }
          }
        }

        const isMonday = isSameDay(today, startOfThisWeek);
        
        // Eğer bugün Pazartesi ise ve bu hafta giriş yapılmadıysa ZORUNLU MODALI AÇ
        if (!kmEntryMadeThisWeek && isMonday) {
          setShowWeeklyKmModal(true);
        } else {
          setShowWeeklyKmModal(false);
        }

      } catch (err) {
        console.error("Haftalık KM girişi kontrol edilirken hata:", err);
      }
    };

    if (operatorId) {
      checkWeeklyKmEntry();
    }
  }, [operatorId]);

  // Dashboard İstatistikleri
  useEffect(() => {
    const fetchDashboardStats = async () => {
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
          supabase.from('visits').select('id, visit_date', { count: 'exact' }).eq('operator_id', operatorId).gte('visit_date', start.toISOString()).lte('visit_date', end.toISOString()),
          supabase.from('customers').select('id', { count: 'exact' }),
          supabase.from('offers').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('visits').select('id', { count: 'exact' }).eq('operator_id', operatorId).eq('status', 'planned').gte('visit_date', today.toISOString()).lte('visit_date', next7Days.toISOString()),
          supabase.from('branches').select('id', { count: 'exact' }),
          supabase.from('offers').select('total_amount').eq('status', 'accepted').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
          supabase.from('visits').select(`id, visit_date, status, customer:customer_id(kisa_isim), operator:operator_id(name)`).eq('operator_id', operatorId).order('visit_date', { ascending: false }).limit(5),
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
  }, [timePeriod, operatorId]);

  // Push Bildirim
  const togglePushNotifications = async () => {
    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
      toast.error('Tarayıcınız push bildirimlerini desteklemiyor.');
      return;
    }
    if (!operatorId) {
      toast.error('Operatör bilgisi yüklenemedi.');
      return;
    }

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;

      if (isPushEnabled) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const unsubscribed = await subscription.unsubscribe();
          if (unsubscribed) {
            await supabase.from('operator_push_subscriptions').delete().eq('operator_id', operatorId);
            toast.success('Bildirimler kapatıldı.');
            setIsPushEnabled(false);
          } else {
            toast.error('Abonelikten çıkılamadı.');
          }
        } else {
          setIsPushEnabled(false);
        }
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error('Bildirim izni verilmedi.');
          setLoading(false);
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        await supabase.from('operator_push_subscriptions').upsert({
          operator_id: operatorId,
          endpoint: subscription.endpoint,
          p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')!))),
        }, { onConflict: 'operator_id' });

        toast.success('Bildirimler açıldı.');
        setIsPushEnabled(true);
      }
    } catch (err: any) {
      toast.error(`Bildirim ayarlanırken hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="mb-4 sm:mb-8">
        <p className="text-sm sm:text-lg text-gray-500">{welcomeMessage},</p>
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-800">Operatör Paneli</h1>
      </header>

      <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1">
        <button onClick={() => setTimePeriod('thisMonth')} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-semibold whitespace-nowrap ${timePeriod === 'thisMonth' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-700'}`}>Bu Ay</button>
        <button onClick={() => setTimePeriod('lastMonth')} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-semibold whitespace-nowrap ${timePeriod === 'lastMonth' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-700'}`}>Geçen Ay</button>
        <button onClick={() => setTimePeriod('thisYear')} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-semibold whitespace-nowrap ${timePeriod === 'thisYear' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-700'}`}>Bu Yıl</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(8)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <StatCard title="Dönemlik Ziyaret" value={stats.periodVisits} icon={<Bug size={20} />} change={`${timePeriod === 'thisMonth' ? 'Bu ay' : timePeriod === 'lastMonth' ? 'Geçen ay' : 'Bu yıl'} yapılan`} />
            <StatCard title="Dönemlik Ciro" value={stats.periodRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} icon={<DollarSign size={20} />} change="Kabul edilen teklifler" changeType="positive" />
            <StatCard title="Yıllık Ciro" value={stats.yearlyRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} icon={<TrendingUp size={20} />} change={`${new Date().getFullYear()} toplamı`} changeType="positive" />
            <StatCard title="Bekleyen Teklifler" value={stats.pendingOffers} icon={<FileText size={20} />} change="Onay bekliyor" />
            <StatCard title="Planlanan Ziyaretler" value={stats.plannedVisits} icon={<Calendar size={20} />} change="Önümüzdeki 7 gün" />
            <StatCard title="Toplam Müşteri" value={stats.totalCustomers} icon={<Users size={20} />} />
            <StatCard title="Toplam Şube" value={stats.totalBranches} icon={<Building size={20} />} />
            <StatCard title="Aktif Konum" value={stats.activeLocations} icon={<MapPin size={20} />} change="Farklı şehir sayısı" />
          </div>

          <div className="mt-4 sm:mt-6 bg-white p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div>
                <h2 className="text-base sm:text-xl font-semibold text-gray-700 mb-1 sm:mb-2">Ayarlar & İşlemler</h2>
                <p className="text-gray-500 font-medium flex items-center text-sm">
                  {isPushEnabled ? (
                    <>
                      <BellRing size={18} className="mr-1.5 text-green-500" /> Bildirimler Açık
                    </>
                  ) : (
                    <>
                      <BellOff size={18} className="mr-1.5 text-red-500" /> Bildirimler Kapalı
                    </>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={togglePushNotifications}
                  disabled={loading}
                  className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-bold text-white transition-colors ${
                    isPushEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Ayarlanıyor...' : (isPushEnabled ? 'Bildirimleri Kapat' : 'Bildirimleri Aç')}
                </button>
                <button
                  onClick={() => setShowReviewPopup(true)}
                  className="flex-1 sm:flex-none px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-bold text-white transition-colors bg-yellow-500 hover:bg-yellow-600"
                >
                  Yorum Al
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-6">
            <div className="lg:col-span-2 bg-white p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg">
              <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Ziyaret Grafiği ({timePeriod === 'thisMonth' ? 'Bu Ay' : timePeriod === 'lastMonth' ? 'Geçen Ay' : 'Bu Yıl'})</h2>
              <ResponsiveContainer width="100%" height={220} className="sm:!h-[300px]">
                <BarChart data={stats.graphData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '0.5rem', fontSize: '12px' }}/>
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="ziyaret" fill="#10b981" name="Ziyaret Sayısı" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg">
              <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Son Aktiviteler</h2>
              <div className="space-y-3 sm:space-y-4">
                {stats.recentTreatments.length > 0 ? stats.recentTreatments.map(treatment => (
                  <div key={treatment.id} className="flex items-center gap-3">
                    <div className={`p-1.5 sm:p-2 rounded-full shrink-0 ${ { completed: 'bg-green-100 text-green-600', planned: 'bg-yellow-100 text-yellow-600', cancelled: 'bg-orange-100 text-orange-600' }[treatment.status] || 'bg-gray-100 text-gray-600' }`}>
                      <Bug size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs sm:text-sm truncate">{treatment.customer?.kisa_isim || 'Bilinmeyen Müşteri'}</p>
                      <p className="text-xs text-gray-500 truncate">{treatment.operator?.name || 'Atanmamış'} - {format(new Date(treatment.visit_date), 'dd MMM', { locale: tr })}</p>
                    </div>
                  </div>
                )) : <p className="text-sm text-gray-500">Yakın zamanda aktivite bulunamadı.</p>}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center p-6 sm:p-10 bg-white rounded-lg shadow">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700">Veri Bulunamadı</h3>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">Seçilen dönem için istatistik bulunamadı.</p>
        </div>
      )}

      {/* ✅ ZORUNLU KM GİRİŞİ MODALI */}
      {operatorId && showWeeklyKmModal && (
        <MandatoryWeeklyKmModal
          isOpen={showWeeklyKmModal}
          operatorId={operatorId}
          operatorName={operatorName} // Operatör adını prop olarak geçiyoruz
          onSuccess={() => setShowWeeklyKmModal(false)}
        />
      )}

      {/* Google Review Pop-up */}
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