// src/pages/OperatorDashboard.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bug, Users, FileText, Calendar, DollarSign, TrendingUp, TrendingDown, Loader2, MapPin, Building } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, startOfWeek, isSameDay } from 'date-fns'; // isSameDay ve startOfWeek eklendi
import { tr } from 'date-fns/locale'; // Düzeltilen satır
import { toast } from 'sonner'; // Yeni ikonlar
import { BellRing, BellOff } from 'lucide-react';
import WeeklyKmEntryModal from '../components/Operator/WeeklyKmEntryModal'; // Yeni modal import edildi
import GoogleReviewPopup from '../components/Operator/GoogleReviewPopup'; // ✅ YENİ: GoogleReviewPopup import edildi

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

const OperatorDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true); // Corrected line
  const [timePeriod, setTimePeriod] = useState<'thisMonth' | 'lastMonth' | 'thisYear'>('thisMonth');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [operatorId, setOperatorId] = useState<string | null>(null); // Operatör ID'si için state
  const [isPushEnabled, setIsPushEnabled] = useState(false); // Push bildirim durumu
  const [vapidPublicKey, setVapidPublicKey] = useState(''); // VAPID genel anahtarı

  // ✅ YENİ STATE'LER
  const [showWeeklyKmModal, setShowWeeklyKmModal] = useState(false);
  const [isWeeklyKmMandatory, setIsWeeklyKmMandatory] = useState(false);
  const [showReviewPopup, setShowReviewPopup] = useState(false); // ✅ YENİ: Google Review Popup state'i

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setWelcomeMessage('İyi sabahlar');
    else if (hour < 18) setWelcomeMessage('İyi günler');
    else setWelcomeMessage('İyi akşamlar');
  }, []);

  // Operatör ID'sini çek
  useEffect(() => {
    const fetchOperatorId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: opData, error: opError } = await supabase
            .from('operators')
            .select('id')
            .eq('auth_id', user.id)
            .single();
          if (opError) throw opError;
          setOperatorId(opData.id);
          console.log('Operator ID fetched in Dashboard:', opData.id); // LOG
        } else {
          console.log('Kullanıcı oturumu bulunamadı.'); // LOG
        }
      } catch (err) {
        console.error("Operatör ID çekilirken hata:", err);
        toast.error("Operatör bilgileri yüklenemedi.");
      }
    };
    fetchOperatorId();
  }, []);

  // VAPID genel anahtarını ve push abonelik durumunu çek
  useEffect(() => {
    const fetchVapidKeyAndSubscriptionStatus = async () => {
      if (!operatorId) {
        console.log('VAPID anahtarı ve abonelik durumu çekilemiyor: operatorId null.'); // LOG
        return; // Operatör ID'si yoksa devam etme
      }

      try {
        // VAPID genel anahtarını Supabase ortam değişkenlerinden çekin (bu bir Edge Function veya API çağrısı gerektirebilir)
        // Şimdilik doğrudan buraya yazalım, ancak güvenli bir uygulamada bu anahtar sunucudan gelmelidir.
        const publicVapidKey = 'BIyT6ZxE86Xj6uwaG30GDN6zDg0fz2sGHQRbLrCKc9fuP2fKxvxJwPCtpHO6j0pj3z2HyDwuNgfGq-pgKPCXNwo'; // BURAYI KENDİ VAPID GENEL ANAHTARINIZLA DEĞİŞTİRİN
        setVapidPublicKey(publicVapidKey);
        console.log('VAPID Public Key ayarlandı.'); // LOG

        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          console.log('Service Worker hazır:', registration); // LOG
          const subscription = await registration.pushManager.getSubscription();
          console.log('Mevcut abonelik:', subscription); // LOG
          setIsPushEnabled(!!subscription);
        } else {
          console.log('Tarayıcı Service Worker veya PushManager desteklemiyor.'); // LOG
        }
      } catch (err) {
        console.error("VAPID anahtarı veya abonelik durumu çekilirken hata:", err);
      }
    };
    fetchVapidKeyAndSubscriptionStatus();
  }, [operatorId]); // operatorId değiştiğinde tekrar çalıştır

  // ✅ YENİ: Haftalık KM girişinin zorunlu olup olmadığını kontrol et
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
        const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 }); // Pazartesi haftanın ilk günü

        let kmEntryMadeThisWeek = false;
        if (vehicles && vehicles.length > 0) {
          for (const vehicle of vehicles) {
            if (vehicle.updated_at) {
              const lastUpdateDate = new Date(vehicle.updated_at);
              // Eğer son güncelleme bu haftanın başlangıcından sonra ise, giriş yapılmış demektir.
              if (lastUpdateDate >= startOfThisWeek) {
                kmEntryMadeThisWeek = true;
                break;
              }
            }
          }
        }

        // Eğer bu hafta KM girişi yapılmamışsa ve bugün Pazartesi ise zorunlu yap
        // VEYA eğer bu hafta KM girişi yapılmamışsa ve haftanın ilk günü değilse ama yine de zorunlu olmasını istiyorsak
        // (örneğin, her zaman zorunlu bir pop-up olarak çıkmasını istiyorsak)
        const isMonday = isSameDay(today, startOfThisWeek);
        if (!kmEntryMadeThisWeek && isMonday) { // Sadece Pazartesi ve giriş yapılmamışsa zorunlu
          setIsWeeklyKmMandatory(true);
          setShowWeeklyKmModal(true);
        } else if (!kmEntryMadeThisWeek && !isMonday) { // Pazartesi değil ama giriş yapılmamışsa, yine de göster (zorunlu değil)
          setIsWeeklyKmMandatory(false);
          setShowWeeklyKmModal(true);
        } else { // Giriş yapılmışsa veya zorunlu değilse gösterme
          setShowWeeklyKmModal(false);
        }

      } catch (err) {
        console.error("Haftalık KM girişi kontrol edilirken hata:", err);
        toast.error("Haftalık KM durumu kontrol edilemedi.");
      }
    };

    if (operatorId) {
      checkWeeklyKmEntry();
    }
  }, [operatorId]); // operatorId değiştiğinde kontrol et

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!operatorId) {
        console.log('Dashboard istatistikleri çekilemiyor: operatorId null.'); // LOG
        return; // Operatör ID'si yoksa istatistikleri çekme
      }

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
          supabase.from('customers').select('id', { count: 'exact' }), // Operatöre atanmış müşteriler için filtreleme gerekebilir
          supabase.from('offers').select('id', { count: 'exact' }).eq('status', 'pending'), // Operatöre atanmış teklifler için filtreleme gerekebilir
          supabase.from('visits').select('id', { count: 'exact' }).eq('operator_id', operatorId).eq('status', 'planned').gte('visit_date', today.toISOString()).lte('visit_date', next7Days.toISOString()),
          supabase.from('branches').select('id', { count: 'exact' }), // Operatöre atanmış şubeler için filtreleme gerekebilir
          supabase.from('offers').select('total_amount').eq('status', 'accepted').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()), // Operatöre atanmış teklifler için filtreleme gerekebilir
          supabase.from('visits').select(`id, visit_date, status, customer:customer_id(kisa_isim), operator:operator_id(name)`).eq('operator_id', operatorId).order('visit_date', { ascending: false }).limit(5),
          supabase.from('customers').select('sehir').not('sehir', 'is', null), // Operatöre atanmış müşteriler için filtreleme gerekebilir
          supabase.from('offers').select('total_amount').eq('status', 'accepted').gte('created_at', startOfYear(today).toISOString()).lte('created_at', endOfYear(today).toISOString()), // Operatöre atanmış teklifler için filtreleme gerekebilir
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
  }, [timePeriod, operatorId]); // operatorId değiştiğinde istatistikleri tekrar çek

  // Push bildirimlerini açma/kapatma
  const togglePushNotifications = async () => {
    console.log('togglePushNotifications çağrıldı. Mevcut isPushEnabled:', isPushEnabled); // LOG
    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
      toast.error('Tarayıcınız push bildirimlerini desteklemiyor.');
      console.error('Tarayıcı Service Worker veya PushManager desteklemiyor.'); // LOG
      return;
    }
    if (!operatorId) {
      toast.error('Operatör bilgisi yüklenemedi. Lütfen sayfayı yenileyin.');
      console.error('Operatör ID null, bildirim ayarı yapılamıyor.'); // LOG
      return;
    }

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker hazır:', registration); // LOG

      if (isPushEnabled) {
        console.log('Mevcut abonelik iptal ediliyor...'); // LOG
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const unsubscribed = await subscription.unsubscribe();
          console.log('Abonelik tarayıcıdan kaldırıldı (unsubscribed):', unsubscribed); // LOG
          if (unsubscribed) {
            const { error: dbError } = await supabase.from('operator_push_subscriptions').delete().eq('operator_id', operatorId);
            if (dbError) {
              console.error('Abonelik veritabanından silinirken hata:', dbError); // LOG
              throw dbError;
            }
            console.log('Abonelik veritabanından silindi.'); // LOG
            toast.success('Bildirimler kapatıldı.');
            setIsPushEnabled(false);
          } else {
            toast.error('Abonelikten çıkılamadı.');
            console.error('Abonelikten çıkma işlemi başarısız oldu.'); // LOG
          }
        } else {
          toast.info('Bildirimler zaten kapalı.');
          setIsPushEnabled(false); // Zaten kapalıysa durumu güncelle
          console.log('Mevcut abonelik bulunamadı, durum zaten kapalı.'); // LOG
        }
      } else {
        console.log('Yeni abonelik oluşturuluyor...'); // LOG
        const permission = await Notification.requestPermission();
        console.log('Bildirim izni:', permission); // LOG
        if (permission !== 'granted') {
          toast.error('Bildirim izni verilmedi.');
          setLoading(false);
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        console.log('Yeni abonelik objesi:', subscription); // LOG

        const { data: upsertData, error: dbError } = await supabase.from('operator_push_subscriptions').upsert({
          operator_id: operatorId,
          endpoint: subscription.endpoint,
          p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')!))), // ! ekledim
          auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')!))), // ! ekledim
        }, { onConflict: 'operator_id' }); // onConflict ekledim

        if (dbError) {
          console.error('Veritabanına kaydederken hata:', dbError); // LOG
          throw dbError;
        }
        console.log('Abonelik veritabanına kaydedildi:', upsertData); // LOG
        toast.success('Bildirimler açıldı.');
        setIsPushEnabled(true);
      }
    } catch (err: any) {
      console.error('Bildirim ayarlanırken hata:', err); // LOG
      toast.error(`Bildirim ayarlanırken hata: ${err.message}`);
    } finally {
      setLoading(false);
      console.log('togglePushNotifications işlemi tamamlandı.'); // LOG
    }
  };

  // urlBase64ToUint8Array yardımcı fonksiyonu
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <p className="text-lg text-gray-500">{welcomeMessage},</p>
        <h1 className="text-4xl font-bold text-gray-800">Operatör Paneline Hoş Geldiniz</h1>
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

          {/* Bildirim Ayarları Bölümü */}
          <div className="mb-8 bg-white p-4 sm:p-6 rounded-2xl shadow-lg flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Bildirim Ayarları</h2>
              <p className="text-gray-500 font-medium flex items-center">
                {isPushEnabled ? (
                  <>
                    <BellRing size={20} className="mr-2 text-green-500" /> Bildirimler Açık
                  </>
                ) : (
                  <>
                    <BellOff size={20} className="mr-2 text-red-500" /> Bildirimler Kapalı
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-2"> {/* Added a div for button grouping */}
              <button
                onClick={togglePushNotifications}
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-bold text-white transition-colors ${
                  isPushEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Ayarlanıyor...' : (isPushEnabled ? 'Bildirimleri Kapat' : 'Bildirimleri Aç')}
              </button>
              {/* ✅ YENİ: Google Review Pop-up butonu */}
              <button
                onClick={() => setShowReviewPopup(true)}
                className="px-6 py-3 rounded-lg font-bold text-white transition-colors bg-yellow-500 hover:bg-yellow-600"
              >
                Müşteriden Yorum Al
              </button>
            </div>
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

      {/* ✅ YENİ: Haftalık KM Giriş Modalı */}
      {operatorId && ( // operatorId mevcutsa modalı render et
        <WeeklyKmEntryModal
          isOpen={showWeeklyKmModal}
          onClose={() => setShowWeeklyKmModal(false)}
          onSuccess={() => setShowWeeklyKmModal(false)} // Başarılı gönderimde modalı kapat
          isMandatory={isWeeklyKmMandatory}
          operatorId={operatorId}
        />
      )}

      {/* ✅ YENİ: Google Review Pop-up */}
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
