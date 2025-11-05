// src/pages/OperatorCalendar.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase'; // Supabase yapılandırmanızın doğru olduğu varsayılmıştır
// calculateDistance kaldırıldı, çünkü rota mesafesi hesaplama bu versiyonda yer almıyor
import { Download, FileImage, FileText, ChevronLeft, ChevronRight, X, Loader2, User, Building, Calendar as CalendarIcon, Tag, Mail, ClipboardX, MapPin } from 'lucide-react';
import { toast } from 'sonner'; // Toast bildirimleri için sonner kütüphanesi

// --- ARAYÜZLER (INTERFACES) ---
interface Visit {
  id: string;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
  customer: { kisa_isim: string; is_one_time?: boolean; } | null; // is_one_time eklendi
  branch: { sube_adi: string; latitude?: number; longitude?: number; is_one_time?: boolean; } | null; // is_one_time eklendi
  operator: { name: string } | null;
  visit_type: string | string[];
  is_checked: boolean; // Bu özellik arayüzde kalabilir, ancak operatör UI'ında kullanılmayacak
}

interface Operator {
  id: string;
  name: string;
  auth_id: string; // auth_id eklendi
}

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
  customer?: { // Geliştirilmiş gösterim için eklendi
    kisa_isim: string;
  } | null;
}

// --- YARDIMCI FONKSİYONLAR ---

/**
 * Ziyaret tipi ID'sini okunabilir bir etikete dönüştürür.
 * @param type - Ziyaret tipi ID'si (string veya string dizisi).
 * @returns Okunabilir etiket.
 */
const getVisitTypeLabel = (type: string | string[] | undefined): string => {
  if (!type) return '';
  const typeId = Array.isArray(type) ? type[0] : type; // Sadece ilk tipi al
  const types: { [key: string]: string } = {
    'ilk': 'İlk Ziyaret',
    'ucretli': 'Ücretli',
    'acil': 'Acil Müdahale',
    'teknik': 'Teknik Servis',
    'periyodik': 'Periyodik Kontrol',
    'isyeri': 'İşyeri İlaçlama',
    'gozlem': 'Gözlem Ziyareti',
    'son': 'Son Kontrol'
  };
  return types[typeId] || typeId.charAt(0).toUpperCase() + typeId.slice(1); // Bulamazsa baş harfi büyük olarak döndür
};

/**
 * Belirli bir gün için ziyaretleri filtreler.
 * @param date - Filtrelenecek gün.
 * @param allVisits - Tüm ziyaretlerin listesi.
 * @param selectedStatus - Seçili durum filtresi.
 * @returns Filtrelenmiş ziyaretler.
 */
const getVisitsForDay = (date: Date, allVisits: Visit[], selectedStatus: string) => {
  return allVisits.filter(visit => {
    const visitDate = new Date(visit.visit_date);
    const matchesDate = visitDate.getDate() === date.getDate() &&
                       visitDate.getMonth() === date.getMonth() &&
                       visitDate.getFullYear() === date.getFullYear();
    
    const matchesStatus = !selectedStatus || visit.status === selectedStatus;

    return matchesDate && matchesStatus;
  });
};

// --- BİLEŞENLER (COMPONENTS) ---

/**
 * Ziyaret durumuna göre renkli nokta gösteren yardımcı bileşen.
 */
const StatusInfo: React.FC<{ status: Visit['status'] }> = ({ status }) => {
  const config = {
    completed: { text: 'Tamamlandı', color: 'bg-green-500' },
    planned: { text: 'Planlandı', color: 'bg-yellow-500' },
    cancelled: { text: 'İptal Edildi', color: 'bg-orange-500' },
  }[status] || { text: 'Bilinmiyor', color: 'bg-gray-500' };
  return <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${config.color}`} title={config.text}></div>;
};

/**
 * Ziyaret detaylarını gösteren modal bileşen.
 */
const VisitDetailModal: React.FC<{ visit: Visit | null; onClose: () => void }> = ({ visit, onClose }) => {
  if (!visit) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-auto transform transition-all duration-300 scale-95 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-xl font-bold text-gray-800">Ziyaret Detayı</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3"><User className="w-5 h-5 text-gray-400" /> <strong>Müşteri:</strong> {visit.customer?.kisa_isim || 'N/A'} {visit.customer?.is_one_time && <span className="ml-1 px-1 py-0.5 bg-gray-200 text-gray-700 rounded-full text-[8px]">(Tek Seferlik)</span>}</div>
          {visit.branch && <div className="flex items-center gap-3"><Building className="w-5 h-5 text-gray-400" /> <strong>Şube:</strong> {visit.branch.sube_adi} {visit.branch?.is_one_time && <span className="ml-1 px-1 py-0.5 bg-gray-200 text-gray-700 rounded-full text-[8px]">(Tek Seferlik)</span>}</div>}
          <div className="flex items-center gap-3"><User className="w-5 h-5 text-gray-400" /> <strong>Operatör:</strong> {visit.operator?.name || 'N/A'}</div>
          <div className="flex items-center gap-3"><CalendarIcon className="w-5 h-5 text-gray-400" /> <strong>Tarih:</strong> {format(new Date(visit.visit_date), 'dd MMMM yyyy HH:mm', { locale: tr })}</div>
          <div className="flex items-center gap-3"><Tag className="w-5 h-5 text-gray-400" /> <strong>Durum:</strong> <StatusInfo status={visit.status} /> <span className="ml-1 capitalize">{visit.status === 'completed' ? 'Tamamlandı' : visit.status === 'planned' ? 'Planlandı' : 'İptal Edildi'}</span></div>
          {visit.branch?.latitude && visit.branch?.longitude && (
            <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-gray-400" /> <strong>Konum:</strong> {visit.branch.latitude.toFixed(4)}, {visit.branch.longitude.toFixed(4)}</div>
          )}
          <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-gray-400" /> <strong>Ziyaret Tipi:</strong> {Array.isArray(visit.visit_type) ? visit.visit_type.map(type => getVisitTypeLabel(type)).join(', ') : getVisitTypeLabel(visit.visit_type)}</div>
          {/* Operatörler için onay kutusu kaldırıldı */}
        </div>
      </div>
    </div>
  );
};

const OperatorCalendar: React.FC = () => {
  // --- STATE YÖNETİMİ ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visits, setVisits] = useState<Visit[]>([]); // Sadece mevcut operatörün ziyaretleri
  const [allMonthlyVisits, setAllMonthlyVisits] = useState<Visit[]>([]); // Ay içindeki tüm ziyaretler (tüm operatörler)
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null); // Mevcut operatör bilgisi
  const [assignedCustomers, setAssignedCustomers] = useState<Customer[]>([]); // Operatöre atanmış müşteriler (filtreleme için)
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]); // Tüm müşteriler (planlanmamışları bulmak için)
  const [allBranches, setAllBranches] = useState<Branch[]>([]); // Tüm şubeler (planlanmamışları bulmak için)
  const [assignedBranches, setAssignedBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // --- useEffect HOOKS ---

  /**
   * Bileşen yüklendiğinde ve ay değiştiğinde operatör bilgilerini, atanmış müşteri/şubeleri ve ziyaretleri çeker.
   */
  useEffect(() => {
    const fetchOperatorDataAndVisits = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Mevcut kullanıcıyı al
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Kullanıcı bulunamadı. Lütfen giriş yapın.');

        // 2. Kullanıcının operatör ID'sini ve adını al
        const { data: operatorData, error: operatorError } = await supabase
          .from('operators')
          .select('id, name, auth_id')
          .eq('auth_id', user.id)
          .single();

        if (operatorError) throw operatorError;
        if (!operatorData) throw new Error('Operatör bilgisi bulunamadı.');
        setCurrentOperator(operatorData);
        const operatorId = operatorData.id;

        // 3. Bu operatöre atanmış tüm müşteri ID'lerini çek (filtreleme için)
        // NOT: Bu sorgunun çalışabilmesi için Supabase veritabanınızda 'customer_operator_assignments' adında bir tablonun bulunması gerekmektedir.
        // Bu tablo, 'customer_id' ve 'operator_id' sütunlarını içermeli ve ilgili tablolara (customers, operators) referans vermelidir.
        const { data: assignedCustomerIdsData, error: assignedCustomerIdsError } = await supabase
          .from('customer_operator_assignments')
          .select('customer_id')
          .eq('operator_id', operatorId);

        if (assignedCustomerIdsError) throw assignedCustomerIdsError;
        const assignedCustomerIds = assignedCustomerIdsData.map(item => item.customer_id);

        // 4. Atanmış müşteri ID'lerine sahip tüm müşterileri çek (filtreleme için)
        const { data: assignedCustomersData, error: assignedCustomersError } = await supabase
          .from('customers')
          .select('id, kisa_isim')
          .in('id', assignedCustomerIds.length > 0 ? assignedCustomerIds : ['']) // Boş dizi durumunda sorgu hatası önle
          .order('kisa_isim');

        if (assignedCustomersError) throw assignedCustomersError;
        setAssignedCustomers(assignedCustomersData || []);

        // 5. Atanmış müşteri ID'lerine sahip tüm şubeleri çek (filtreleme için)
        const { data: assignedBranchesData, error: assignedBranchesError } = await supabase
          .from('branches')
          .select('id, sube_adi, customer_id, customer:customer_id(kisa_isim)')
          .in('customer_id', assignedCustomerIds.length > 0 ? assignedCustomerIds : ['']) // Boş dizi durumunda sorgu hatası önle
          .order('sube_adi');

        if (assignedBranchesError) throw assignedBranchesError;
        setAssignedBranches(assignedBranchesData || []); // setAssignedBranches burada doğru şekilde kullanılıyor.

        // 6. Tüm müşterileri çek (planlanmamışları bulmak için)
        const { data: allCustomersData, error: allCustomersError } = await supabase
          .from('customers')
          .select('id, kisa_isim')
          .order('kisa_isim');
        if (allCustomersError) throw allCustomersError;
        setAllCustomers(allCustomersData || []);

        // 7. Tüm şubeleri çek (planlanmamışları bulmak için)
        const { data: allBranchesData, error: allBranchesError } = await supabase
          .from('branches')
          .select('id, sube_adi, customer_id, customer:customer_id(kisa_isim)')
          .order('sube_adi');
        if (allBranchesError) throw allBranchesError;
        setAllBranches(allBranchesData || []);

        // 8. Mevcut ay için operatörün ziyaretlerini çek (takvim görünümü için)
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);

        let operatorVisitsQuery = supabase
          .from('visits')
          .select(`id, visit_date, status, is_checked, visit_type, customer_id, branch_id, customer:customer_id(kisa_isim, is_one_time), branch:branch_id(sube_adi, latitude, longitude, is_one_time), operator:operator_id(name)`)
          .eq('operator_id', operatorId) // Sadece mevcut operatörün ziyaretleri
          .gte('visit_date', start.toISOString())
          .lte('visit_date', end.toISOString());

        if (selectedCustomer) operatorVisitsQuery = operatorVisitsQuery.eq('customer_id', selectedCustomer);
        if (selectedStatus) operatorVisitsQuery = operatorVisitsQuery.eq('status', selectedStatus);

        const { data: visitsData, error: visitsError } = await operatorVisitsQuery;

        if (visitsError) throw visitsError;
        setVisits(visitsData || []);

        // 9. Mevcut ay için TÜM ziyaretleri çek (planlanmamışları hesaplamak için)
        const { data: allOperatorsVisitsData, error: allOperatorsVisitsError } = await supabase
          .from('visits')
          .select('customer_id, branch_id, operator_id') // Tüm operatörlerin ziyaretleri
          .gte('visit_date', start.toISOString())
          .lte('visit_date', end.toISOString());

        if (allOperatorsVisitsError) throw allOperatorsVisitsError;
        setAllMonthlyVisits(allOperatorsVisitsData || []); // Tüm operatörlerin ziyaretleri


      } catch (err: any) {
        setError(err.message);
        toast.error(`Veri yüklenirken bir hata oluştu: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchOperatorDataAndVisits();
  }, [currentDate, selectedCustomer, selectedStatus]); // Filtreler değiştiğinde de tetikle

  // --- ONAY KUTUSU İŞLEVİ (OPERATÖRLER İÇİN KALDIRILDI) ---
  // Bu fonksiyon operatörler için kaldırıldığı için içi boş bırakıldı veya tamamen silindi.
  // const handleCheckVisit = async (visitId: string, currentCheckedStatus: boolean) => { /* ... */ };


  // --- ZİYARETİ OLMAYANLARI HESAPLAMA ---
  const inactiveItems = useMemo(() => {
    if (loading) return { customers: [], branches: [] };

    const visitedBranchIdsOverall = new Set(allMonthlyVisits.map(v => v.branch_id).filter(Boolean));
    const visitedCustomerIdsOverall = new Set(allMonthlyVisits.map(v => v.customer_id).filter(Boolean));

    // Tüm şubelerden, mevcut ayda herhangi bir operatör tarafından ziyaret kaydı olmayanları filtrele
    const unvisitedBranches = allBranches.filter(branch => {
      const matchesCustomerFilter = !selectedCustomer || branch.customer_id === selectedCustomer;
      return matchesCustomerFilter && !visitedBranchIdsOverall.has(branch.id);
    });
    
    // Tüm müşterilerden, mevcut ayda herhangi bir operatör tarafından ziyaret kaydı olmayanları filtrele
    const unvisitedCustomers = allCustomers.filter(customer => {
      const matchesCustomerFilter = !selectedCustomer || customer.id === selectedCustomer;
      if (!matchesCustomerFilter) return false;

      // Müşterinin doğrudan ziyaret kaydı var mı kontrol et
      const hasDirectVisit = visitedCustomerIdsOverall.has(customer.id);
      if (hasDirectVisit) return false;

      // Müşterinin şubelerinden herhangi biri ziyaret edilmiş mi kontrol et
      const customerBranches = allBranches.filter(branch => branch.customer_id === customer.id);
      const hasVisitedAnyBranch = customerBranches.some(branch => visitedBranchIdsOverall.has(branch.id));
      if (hasVisitedAnyBranch) return false;

      return true; // Ne doğrudan ziyaret edilmiş ne de şubeleri ziyaret edilmiş
    });
    
    return { customers: unvisitedCustomers, branches: unvisitedBranches };
  }, [allMonthlyVisits, allCustomers, allBranches, loading, selectedCustomer]);


  // --- TAKVİM OLUŞTURMA İÇİN YARDIMCI DEĞİŞKENLER ---
  const daysOfWeek = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const monthStart = startOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentDate) });
  // getDay Pazarı 0, Pazartesiyi 1 verir. Biz Pazartesiyi 0 yapmak için düzeltme yapıyoruz.
  const startingDayIndex = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;

  // Durum göstergesi için legend verisi
  const statusLegend = [
    { text: 'Planlandı', color: 'bg-yellow-500' },
    { text: 'Tamamlandı', color: 'bg-green-500' },
    { text: 'İptal Edildi', color: 'bg-orange-500' },
  ];

  // --- RENDER BÖLÜMÜ ---
  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      <span className="ml-3 text-lg text-gray-700">Veriler Yükleniyor...</span>
    </div>
  );

  if (error) return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="text-red-600 text-lg p-4 bg-red-100 rounded-lg shadow-md">
        <p>Hata oluştu:</p>
        <p className="font-mono mt-2">{error}</p>
        <p className="mt-4 text-sm text-gray-700">Lütfen sayfayı yenilemeyi deneyin veya yöneticinize başvurun.</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen font-inter">
      {/* Ziyaret Detay Modalı */}
      <VisitDetailModal visit={selectedVisit} onClose={() => setSelectedVisit(null)} />
      
      {/* Takvim Başlığı ve Navigasyon */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><ChevronLeft /></button>
          <h1 className="text-3xl font-bold text-gray-800 w-48 text-center">{format(currentDate, 'MMMM yyyy', { locale: tr })}</h1>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><ChevronRight /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">Bugün</button>
        </div>
        {/* Filtreler */}
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500">
            <option value="">Tüm Müşteriler</option>
            {assignedCustomers.map(customer => <option key={customer.id} value={customer.id}>{customer.kisa_isim}</option>)}
          </select>
          {/* Operatör filtresi operatör takviminde gerekli değil, çünkü zaten kendi verilerini görüyor */}
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500">
            <option value="">Tüm Durumlar</option>
            <option value="planned">Planlandı</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal Edildi</option>
          </select>
        </div>
      </header>
      
      {/* Takvim Izgarası */}
      <div ref={calendarRef} className="bg-white rounded-xl shadow-lg p-4">
        <div className="grid grid-cols-7">
          {daysOfWeek.map(day => <div key={day} className="text-center font-bold text-gray-600 py-2 text-sm">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px border-t border-l border-gray-200">
          {/* Ayın ilk gününden önceki boş günler */}
          {Array.from({ length: startingDayIndex }).map((_, i) => <div key={`empty-${i}`} className="bg-gray-50 border-r border-b border-gray-200 min-h-[120px] sm:min-h-[150px]"></div>)}
          
          {/* Ayın günleri */}
          {monthDays.map(day => {
            const dayVisits = getVisitsForDay(day, visits, selectedStatus); // Pass visits and selectedStatus
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`relative p-2 border-r border-b border-gray-200 min-h-[120px] sm:min-h-[150px] ${
                  isCurrentDay ? 'bg-blue-50 ring-2 ring-blue-300' : 'hover:bg-gray-50'
                }`}
              >
                <time dateTime={format(day, 'yyyy-MM-dd')} className={`text-sm ${isToday(day) ? 'font-bold text-blue-700' : 'text-gray-500'}`}>{format(day, 'd')}</time>
                <div className="mt-1 space-y-1 overflow-y-auto max-h-[90px] sm:max-h-[120px] custom-scrollbar">
                  {dayVisits.map(visit => (
                    <div key={visit.id} 
                         className={`p-1.5 rounded-md text-white text-[10px] cursor-pointer flex items-start gap-1.5 transition-opacity ${visit.is_checked ? 'opacity-60' : ''}`} 
                         style={{ backgroundColor: { planned: '#f59e0b', completed: '#10b981', cancelled: '#f97316' }[visit.status] }}
                         title={`Müşteri: ${visit.customer?.kisa_isim || 'N/A'}\nŞube: ${visit.branch?.sube_adi || 'N/A'}\nOperatör: ${visit.operator?.name || 'N/A'}\nTarih: ${format(new Date(visit.visit_date), 'dd.MM.yyyy HH:mm', { locale: tr })}\nDurum: ${visit.status}\nTip: ${getVisitTypeLabel(visit.visit_type)}`}
                    >
                      <StatusInfo status={visit.status} />
                      <div className="flex-grow overflow-hidden" onClick={() => setSelectedVisit(visit)}>
                        <span className="font-semibold truncate block">{visit.branch ? visit.branch.sube_adi : visit.customer?.kisa_isim}</span>
                        {/* YENİ: Tek seferlik müşteri/şube göstergesi */}
                        {visit.customer?.is_one_time && <span className="ml-1 px-1 py-0.5 bg-gray-200 text-gray-700 rounded-full text-[6px]">(Tek Seferlik)</span>}
                        {visit.branch?.is_one_time && <span className="ml-1 px-1 py-0.5 bg-gray-200 text-gray-700 rounded-full text-[6px]">(Tek Seferlik)</span>}
                        <span className="opacity-80 truncate block text-[9px]">{visit.branch ? visit.customer?.kisa_isim : visit.operator?.name}</span>
                        <span className="mt-1 inline-block px-1.5 py-0.5 bg-white/20 rounded-full text-xs leading-none">{getVisitTypeLabel(visit.visit_type)}</span>
                      </div>
                      {/* Operatörler için onay kutusu kaldırıldı */}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Durum Göstergesi (Legend) */}
      <div className="mt-4 p-4 bg-white rounded-xl shadow-lg border border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-2">Durum Göstergesi</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
            {statusLegend.map(item => (
                <div key={item.text} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span>{item.text}</span>
                </div>
            ))}
        </div>
      </div>

      {/* Bu Ay Ziyaret Planlanmamış Bölümü */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2"><ClipboardX className="text-gray-400"/> Bu Ay Ziyaret Planlanmamış</h3>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 space-y-6">
            {inactiveItems.branches.length > 0 && (
                <div>
                    <h4 className="font-semibold text-gray-600 mb-2">Planlanmamış Şubeler ({inactiveItems.branches.length})</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {inactiveItems.branches.map(branch => (
                            <li key={branch.id} className="text-sm text-gray-600 p-2 bg-gray-100 rounded-md truncate" title={`${branch.sube_adi} (${branch.customer?.kisa_isim || 'Müşteri Yok'})`}>
                                <span className="font-medium">{branch.sube_adi}</span>
                                <span className="text-gray-400 ml-1">({branch.customer?.kisa_isim || 'N/A'})</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {inactiveItems.customers.length > 0 && (
                <div>
                    <h4 className="font-semibold text-gray-600 mb-2">Planlanmamış Müşteriler ({inactiveItems.customers.length})</h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {inactiveItems.customers.map(customer => (
                            <li key={customer.id} className="text-sm text-gray-600 p-2 bg-gray-100 rounded-md truncate" title={customer.kisa_isim}>{customer.kisa_isim}</li>
                        ))}
                    </ul>
                </div>
            )}
            {inactiveItems.customers.length === 0 && inactiveItems.branches.length === 0 && (
                <p className="text-center text-gray-400 py-4">
                    {selectedCustomer ? 'Bu müşteri için bu ay planlanmamış şube veya kayıt bulunmuyor.' : 'Bu ay için planlanmamış bir kayıt bulunmuyor.'}
                </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default OperatorCalendar;
