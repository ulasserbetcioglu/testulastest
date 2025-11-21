import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Search, Filter, Plus, X, ChevronLeft, ChevronRight, Calendar, Trash2, User, Download, FileImage, FileText } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Sürükle-bırak öğe tipleri
const ItemTypes = {
  CUSTOMER: 'customer',
  BRANCH: 'branch',
  VISIT: 'visit',
  OPERATOR: 'operator'
};

// --- Arayüz (Interface) Tanımları ---
// Not: Bunlar JSX'te zorunlu değildir, ancak veri yapısını anlamak için faydalıdır.
/*
interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  customer_id: string;
  sube_adi: string;
  customer?: {
    kisa_isim: string;
  };
}

interface Operator {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface Visit {
  id: string;
  customer_id: string;
  branch_id: string | null;
  operator_id: string;
  visit_date: string;
  visit_type: string;
  status: string;
  customer: {
    kisa_isim: string;
  };
  branch?: {
    sube_adi: string;
  } | null;
  operator: {
    name: string;
  };
}
*/

// --- 1. Sürükle-Bırak (DnD) Bileşenleri ---

/**
 * Kenar çubuğundaki (Müşteri, Şube, Operatör) sürüklenebilir öğe
 */
const DraggableItem = ({ item, type }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: type === 'customer' ? ItemTypes.CUSTOMER :
          type === 'branch' ? ItemTypes.BRANCH : ItemTypes.OPERATOR,
    item: { ...item, type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  let displayName = '';
  let bgColor = '';
  
  if (type === 'customer') {
    displayName = item.kisa_isim;
    bgColor = 'bg-blue-100';
  } else if (type === 'branch') {
    displayName = `${item.sube_adi} ${item.customer?.kisa_isim ? `(${item.customer.kisa_isim})` : ''}`;
    bgColor = 'bg-green-100';
  } else if (type === 'operator') {
    displayName = item.name;
    bgColor = 'bg-purple-100';
  }

  return (
    <div
      ref={drag}
      className={`p-1 mb-1 rounded cursor-move text-[8px] sm:text-xs ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${bgColor}`}
      style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      title={displayName}
    >
      {displayName.length > 20 ? `${displayName.substring(0, 20)}...` : displayName}
    </div>
  );
};

/**
 * Takvim üzerindeki mevcut bir ziyareti temsil eden sürüklenebilir öğe
 */
const DraggableVisit = ({ visit, onDelete }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.VISIT,
    item: { ...visit, type: 'visit' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const displayName = `${visit.customer.kisa_isim}${visit.branch ? ` - ${visit.branch.sube_adi}` : ''}`;

  return (
    <div
      ref={drag}
      className={`text-[6px] sm:text-[8px] p-0.5 rounded ${
        visit.status === 'completed' ? 'bg-green-500' :
        visit.status === 'cancelled' ? 'bg-red-500' :
        'bg-yellow-500'
      } text-white truncate group relative ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      title={`${displayName} (${visit.operator.name})`}
    >
      <div className="flex justify-between items-center">
        <span className="truncate">
          {displayName.length > 15 ? `${displayName.substring(0, 15)}...` : displayName}
        </span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(visit.id);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-white hover:text-red-200"
        >
          <Trash2 size={8} />
        </button>
      </div>
      <div className="text-[5px] sm:text-[6px] text-white opacity-75 truncate">
        {visit.operator.name}
      </div>
    </div>
  );
};

/**
 * Takvimdeki her bir gün hücresi (Bırakma alanı)
 */
const DayCell = ({ date, onEventDrop, visits, onDeleteVisit }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.CUSTOMER, ItemTypes.BRANCH, ItemTypes.VISIT, ItemTypes.OPERATOR],
    drop: (item) => onEventDrop(item, date),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  // Bu güne ait ziyaretleri filtrele
  const dayVisits = visits.filter(visit => {
    // visit_date formatı: "YYYY-MM-DD" - string olarak karşılaştır
    const visitDateStr = visit.visit_date.split('T')[0]; // "2025-01-15"
    const currentDateStr = format(date, 'yyyy-MM-dd'); // "2025-01-15"
    return visitDateStr === currentDateStr;
  });

  return (
    <div
      ref={drop}
      className={`h-full w-full ${isOver ? 'bg-green-100' : ''}`}
    >
      {dayVisits.length > 0 && (
        <div className="mt-0.5 space-y-0.5">
          {dayVisits.map(visit => (
            <DraggableVisit 
              key={visit.id} 
              visit={visit} 
              onDelete={onDeleteVisit}
            />
          ))}
        </div>
      )}
    </div>
  );
};


// --- 2. Ana Sayfa Bileşenleri ---

/**
 * Sol Kenar Çubuğu (Filtreler ve Sürüklenebilir Listeler)
 */
const Sidebar = ({
  showSidebar,
  searchTerm,
  onSearchTermChange,
  selectedVisitType,
  onVisitTypeChange,
  selectedOperator,
  onOperatorChange,
  operators,
  onTransfer,
  isTransferring,
  transferButtonDisabled,
  filteredOperators,
  filteredCustomers,
  filteredBranches
}) => {
  if (!showSidebar) return null;

  return (
    <div className="w-48 sm:w-64 bg-white shadow-md p-2 sm:p-4 overflow-y-auto">
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Ara..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="w-full pl-6 sm:pl-8 pr-2 py-1 sm:py-2 border rounded text-[10px] sm:text-xs"
          />
          <Search className="absolute left-1 sm:left-2 top-1.5 sm:top-2 text-gray-400" size={12} />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-1">
          Ziyaret Türü
        </label>
        <select
          value={selectedVisitType}
          onChange={(e) => onVisitTypeChange(e.target.value)}
          className="w-full p-1 sm:p-2 border rounded text-[10px] sm:text-xs"
        >
          <option value="ilk">İlk</option>
          <option value="ucretli">Ücretli</option>
          <option value="acil">Acil Çağrı</option>
          <option value="teknik">Teknik İnceleme</option>
          <option value="periyodik">Periyodik</option>
          <option value="isyeri">İşyeri</option>
          <option value="gozlem">Gözlem</option>
          <option value="son">Son</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-1">
          Operatör
        </label>
        <select
          value={selectedOperator || ''}
          onChange={(e) => onOperatorChange(e.target.value || null)}
          className="w-full p-1 sm:p-2 border rounded text-[10px] sm:text-xs"
        >
          <option value="">Operatör Seçin</option>
          {operators.map(operator => (
            <option key={operator.id} value={operator.id}>
              {operator.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <button
          onClick={onTransfer}
          disabled={isTransferring || transferButtonDisabled}
          className="w-full flex items-center justify-center gap-1 sm:gap-2 p-1 sm:p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] sm:text-xs"
        >
          <Calendar size={10} className="sm:w-4 sm:h-4" />
          <span>Sonraki Aya Aktar</span>
        </button>
        <p className="text-[8px] sm:text-[10px] text-gray-500 mt-1">
          Seçili operatörün bu aydaki ziyaretlerini bir sonraki aya aynı hafta günlerine göre aktarır.
        </p>
      </div>
      
      <div className="mb-4">
        <h3 className="font-medium text-gray-700 mb-2 text-[10px] sm:text-xs flex items-center">
          <User size={10} className="mr-1 sm:w-4 sm:h-4" />
          Operatörler
        </h3>
        <div className="space-y-0.5 max-h-[15vh] overflow-y-auto">
          {filteredOperators.map(operator => (
            <DraggableItem key={operator.id} item={operator} type="operator" />
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="font-medium text-gray-700 mb-2 text-[10px] sm:text-xs">Müşteriler</h3>
        <div className="space-y-0.5 max-h-[15vh] overflow-y-auto">
          {filteredCustomers.map(customer => (
            <DraggableItem key={customer.id} item={customer} type="customer" />
          ))}
        </div>
      </div>
      
      <div>
        <h3 className="font-medium text-gray-700 mb-2 text-[10px] sm:text-xs">Şubeler</h3>
        <div className="space-y-0.5 max-h-[15vh] overflow-y-auto">
          {filteredBranches.map(branch => (
            <DraggableItem key={branch.id} item={branch} type="branch" />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Takvimin Üst Başlığı (Navigasyon ve Dışa Aktarma)
 */
const CalendarHeader = ({
  onToggleSidebar,
  showSidebar,
  onPrevMonth,
  onNextMonth,
  currentDate,
  onExportPDF,
  onExportImage
}) => {
  return (
    <div className="flex justify-between items-center mb-2 sm:mb-4">
      <div className="flex items-center">
        <button
          onClick={onToggleSidebar}
          className="mr-2 sm:mr-4 p-1 sm:p-2 rounded hover:bg-gray-100"
        >
          {showSidebar ? <X size={16} className="sm:w-5 sm:h-5" /> : <Filter size={16} className="sm:w-5 sm:h-5" />}
        </button>
        <h1 className="text-sm sm:text-xl font-bold">Admin Ziyaret Planlama</h1>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={onPrevMonth}
          className="p-1 sm:p-2 rounded hover:bg-gray-100"
        >
          <ChevronLeft size={16} className="sm:w-5 sm:h-5" />
        </button>
        <span className="text-xs sm:text-lg font-medium">
          {format(currentDate, 'MMMM yyyy', { locale: tr })}
        </span>
        <button
          onClick={onNextMonth}
          className="p-1 sm:p-2 rounded hover:bg-gray-100"
        >
          <ChevronRight size={16} className="sm:w-5 sm:h-5" />
        </button>
        
        <div className="flex gap-1 sm:gap-2 ml-1 sm:ml-4">
          <button
            onClick={onExportPDF}
            className="p-1 sm:p-2 bg-red-600 text-white rounded hover:bg-red-700 text-[8px] sm:text-xs flex items-center gap-1"
          >
            <FileText size={10} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={onExportImage}
            className="p-1 sm:p-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-[8px] sm:text-xs flex items-center gap-1"
          >
            <FileImage size={10} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Görüntü</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Takvim Izgarası (Günler ve Ziyaretler)
 */
const CalendarGrid = ({
  calendarRef,
  currentDate,
  visits,
  onEventDrop,
  onDeleteVisit
}) => {
  // Takvim hesaplamaları
  const days = ['Pts', 'Sal', 'Çar', 'Per', 'Cum', 'Cts', 'Paz'];
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pazartesi'yi 0 (Pts) Pazar'ı 6 (Paz) olarak ayarla
  let firstDayOfMonth = getDay(monthStart) - 1; 
  if (firstDayOfMonth === -1) firstDayOfMonth = 6; // Pazar (0) ise 6 yap

  return (
    <>
      <div ref={calendarRef} className="bg-white rounded-lg shadow-md">
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {/* Gün Başlıkları */}
          {days.map(day => (
            <div key={day} className="bg-gray-50 p-1 sm:p-2 text-center">
              <span className="text-[8px] sm:text-xs font-medium text-gray-500">{day}</span>
            </div>
          ))}

          {/* Ayın başındaki boş günler */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-gray-50 p-1 sm:p-2 min-h-[60px] sm:min-h-[100px]" />
          ))}

          {/* Ayın günleri */}
          {monthDays.map(day => {
            const isCurrentDay = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`relative bg-white p-1 sm:p-2 min-h-[60px] sm:min-h-[100px] ${
                  isCurrentDay ? 'ring-1 sm:ring-2 ring-green-500' : ''
                }`}
              >
                <div className="text-[8px] sm:text-xs font-medium mb-0.5 sm:mb-1">
                  {format(day, 'd')}
                </div>
                <DayCell 
                  date={day} 
                  onEventDrop={onEventDrop}
                  visits={visits}
                  onDeleteVisit={onDeleteVisit}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Yardım Metinleri */}
      <div className="mt-4 text-[8px] sm:text-xs text-gray-500">
        <p>• Önce bir operatör seçin, ardından müşteri veya şubeyi takvime sürükleyerek ziyaret oluşturabilirsiniz.</p>
        <p>• Mevcut ziyaretleri sürükleyerek başka bir güne taşıyabilirsiniz.</p>
        <p>• Ziyaretin üzerine gelip çöp kutusu simgesine tıklayarak silebilirsiniz.</p>
      </div>
    </>
  );
};


// --- 3. Ana Bileşen (Tüm Mantık ve State) ---

const AdminCalendarPlanning = () => {
  // --- State Tanımları ---
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [operators, setOperators] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedVisitType, setSelectedVisitType] = useState('periyodik');
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const calendarRef = useRef(null);

  // --- useEffect Kancaları ---
  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, currentDate, selectedOperator]); // currentDate veya selectedOperator değiştiğinde veriyi yeniden çek

  // --- Veri Çekme ve Yetki Fonksiyonları ---
  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isAdminUser = user?.email === 'admin@ilaclamatik.com';
      setIsAdmin(isAdminUser);
      
      if (!isAdminUser) {
        setError('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error checking admin access:', err);
    } finally {
      setLoading(false); // Yetki kontrolü bitince yüklemeyi bitir
    }
  };

  const fetchData = async () => {
    // Sadece admin ise ve yükleme zaten başlamadıysa veri çek
    if (loading) return; 
    setLoading(true);
    
    try {
      // Müşteriler
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, kisa_isim')
        .order('kisa_isim');
      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Şubeler
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('id, customer_id, sube_adi, customers(kisa_isim)')
        .order('sube_adi');
      if (branchesError) throw branchesError;
      const transformedBranches = branchesData?.map(branch => ({
        id: branch.id,
        customer_id: branch.customer_id,
        sube_adi: branch.sube_adi,
        customer: branch.customers
      })) || [];
      setBranches(transformedBranches);
      
      // Operatörler
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('operators')
        .select('id, name, email, status')
        .eq('status', 'Açık')
        .order('name');
      if (operatorsError) throw operatorsError;
      setOperators(operatorsData || []);

      // Ziyaretler (mevcut ay için)
      const firstDay = startOfMonth(currentDate);
      const lastDay = endOfMonth(currentDate);

      let query = supabase
        .from('visits')
        .select(`
          id, customer_id, branch_id, operator_id, visit_date, visit_type, status,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi),
          operator:operator_id (name)
        `)
        .gte('visit_date', firstDay.toISOString())
        .lte('visit_date', lastDay.toISOString());
        
      if (selectedOperator) {
        query = query.eq('operator_id', selectedOperator);
      }

      const { data: visitsData, error: visitsError } = await query;
      if (visitsError) throw visitsError;
      setVisits(visitsData || []);
      
    } catch (err) {
      setError(err.message);
      toast.error('Veri çekilirken hata oluştu: ' + err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Olay Yöneticileri (Event Handlers) ---

  const handleEventDrop = async (item, date) => {
    try {
      // Admin kontrolü
      if (!isAdmin) {
        toast.error('Bu işlemi gerçekleştirmek için admin yetkisine sahip olmalısınız');
        return;
      }

      // Operatör kontrolü (operatör sürükleme ve mevcut ziyaret taşıma hariç)
      if (item.type === 'customer' || item.type === 'branch') {
        if (!selectedOperator) {
          toast.error('Lütfen önce bir operatör seçin');
          return;
        }
      }

      // Tarihi formatla
      const visitDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        12, 0, 0
      );
      const formattedDate = visitDate.toISOString().split('T')[0];

      // Durum 1: Mevcut ziyaret taşınıyor
      if (item.type === 'visit') {
        // Eski ziyareti sil ve yenisini oluştur (Taşıma = Sil + Ekle)
        // Not: Bu, atomik bir işlem değildir. İdealde tek bir 'update' olmalı
        // veya bir veritabanı fonksiyonu (transaction) kullanılmalı.
        // Basitlik için silip yeniden oluşturuyoruz.
        
        // Önce sil
        const { error: deleteError } = await supabase
          .from('visits')
          .delete()
          .eq('id', item.id);
        if (deleteError) throw deleteError;

        // Sonra ekle
        await createVisit({
          customer_id: item.customer_id,
          branch_id: item.branch_id,
          operator_id: item.operator_id,
          visit_date: formattedDate,
          visit_type: item.visit_type || selectedVisitType
        });

        await fetchData(); // Takvimi yenile
        toast.success('Ziyaret başarıyla taşındı');
      }
      // Durum 2: Yeni ziyaret ekleniyor
      else if (item.type === 'customer' || item.type === 'branch') {
        const visitData = {
          customer_id: item.type === 'branch' ? item.customer_id : item.id,
          branch_id: item.type === 'branch' ? item.id : null,
          operator_id: selectedOperator,
          visit_date: formattedDate,
          visit_type: selectedVisitType
        };

        await createVisit(visitData);
        await fetchData();
        toast.success(`Ziyaret oluşturuldu: ${item.kisa_isim || item.sube_adi}`);
      }
      // Durum 3: Operatör sürükleniyor
      else if (item.type === 'operator') {
        setSelectedOperator(item.id);
        toast.success(`${item.name} seçildi. Şimdi müşteri veya şube sürükleyebilirsiniz.`);
      }
    } catch (err) {
      toast.error('Ziyaret oluşturulurken hata: ' + err.message);
    }
  };

  const createVisit = async (visitData) => {
    const { data, error } = await supabase
      .from('visits')
      .insert([{
        ...visitData,
        status: 'planned'
      }])
      .select();

    if (error) throw error;
    return data;
  };

  const deleteVisit = async (visitId) => {
    // Silme onayı (Güvenlik için)
    if (!window.confirm('Bu ziyareti silmek istediğinizden emin misiniz?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;
      
      // Lokal state'i güncelle (tekrar fetch etmeye gerek kalmadan)
      setVisits(prevVisits => prevVisits.filter(visit => visit.id !== visitId));
      toast.success('Ziyaret silindi');
    } catch (err) {
      toast.error('Ziyaret silinirken bir hata oluştu: ' + err.message);
      console.error('Error deleting visit:', err);
    }
  };

  const transferToNextMonth = async () => {
    if (!selectedOperator) {
      toast.error('Lütfen bir operatör seçin');
      return;
    }
    if (!window.confirm(`Seçili operatör (${operators.find(o => o.id === selectedOperator)?.name}) için bu aydaki tüm ziyaretleri bir sonraki aya taşımak istediğinizden emin misiniz?`)) {
        return;
    }
    
    setIsTransferring(true);
    
    try {
      const nextMonth = addMonths(currentDate, 1);
      const operatorVisits = visits.filter(visit => visit.operator_id === selectedOperator);
      
      const visitsByDayOfWeek = operatorVisits.reduce((acc, visit) => {
        const dayOfWeek = getDay(new Date(visit.visit_date)); // Pazar = 0, Cmt = 6
        if (!acc[dayOfWeek]) acc[dayOfWeek] = [];
        acc[dayOfWeek].push(visit);
        return acc;
      }, {});

      const nextMonthDaysMap = eachDayOfInterval({
        start: startOfMonth(nextMonth),
        end: endOfMonth(nextMonth)
      }).reduce((acc, date) => {
        const dayOfWeek = getDay(date);
        if (!acc[dayOfWeek]) acc[dayOfWeek] = [];
        acc[dayOfWeek].push(date);
        return acc;
      }, {});

      let newVisitsPayload = [];
      let createdCount = 0;

      for (const [dayOfWeekStr, dayVisits] of Object.entries(visitsByDayOfWeek)) {
        const dayOfWeek = parseInt(dayOfWeekStr);
        const targetDaysInNextMonth = nextMonthDaysMap[dayOfWeek] || [];

        if (targetDaysInNextMonth.length === 0) continue; // Gelecek ay bu gün yoksa atla

        for (const visit of dayVisits) {
          // Orijinal ziyaretin ayın kaçıncı haftasında olduğunu bul
          const originalDate = new Date(visit.visit_date);
          const weekOfMonth = Math.floor((originalDate.getDate() - 1) / 7); // 0-4 arası bir değer

          // Gelecek ayda ilgili haftaya denk gelen günü bul
          const targetDay = targetDaysInNextMonth[weekOfMonth] || targetDaysInNextMonth[targetDaysInNextMonth.length - 1]; // Eğer o hafta yoksa, o ayın son ilgili gününü al

          if (targetDay) {
            newVisitsPayload.push({
              customer_id: visit.customer_id,
              branch_id: visit.branch_id,
              operator_id: visit.operator_id,
              visit_date: targetDay.toISOString().split('T')[0],
              visit_type: visit.visit_type,
              status: 'planned'
            });
            createdCount++;
          }
        }
      }

      if (newVisitsPayload.length > 0) {
        const { error } = await supabase.from('visits').insert(newVisitsPayload);
        if (error) throw error;
      }
      
      setCurrentDate(nextMonth); // Takvimi bir sonraki aya taşı
      toast.success(`${createdCount} ziyaret bir sonraki aya aktarıldı`);
      
    } catch (err) {
      toast.error('Ziyaretler aktarılırken bir hata oluştu: ' + err.message);
      console.error('Error transferring visits:', err);
    } finally {
      setIsTransferring(false);
    }
  };

  // --- Dışa Aktarma Fonksiyonları ---

  const exportToPDF = async () => {
    if (!calendarRef.current) return;
    try {
      const canvas = await html2canvas(calendarRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`Takvim_Planlama_${format(currentDate, 'MMMM_yyyy', { locale: tr })}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('PDF dışa aktarma hatası oluştu.');
    }
  };

  const exportToImage = async () => {
    if (!calendarRef.current) return;
    try {
      const canvas = await html2canvas(calendarRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Takvim_Planlama_${format(currentDate, 'MMMM_yyyy', { locale: tr })}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Image export error:', err);
      toast.error('Görüntü dışa aktarma hatası oluştu.');
    }
  };

  // --- Filtreleme (useMemo) ---
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => 
      customer.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const filteredBranches = useMemo(() => {
    return branches.filter(branch => 
      branch.sube_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.customer?.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [branches, searchTerm]);

  const filteredOperators = useMemo(() => {
    return operators.filter(operator => 
      operator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operator.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [operators, searchTerm]);
  
  const transferButtonDisabled = !selectedOperator || visits.filter(v => v.operator_id === selectedOperator).length === 0;

  // --- Ana Render ---
  if (!isAdmin && !loading) {
     return <div className="p-4 text-red-500">{error || 'Bu sayfaya erişim yetkiniz bulunmamaktadır.'}</div>;
  }
  
  if (loading && visits.length === 0) {
      return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-[calc(100vh-64px)]">
        {/* Kenar Çubuğu */}
        <Sidebar
          showSidebar={showSidebar}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          selectedVisitType={selectedVisitType}
          onVisitTypeChange={setSelectedVisitType}
          selectedOperator={selectedOperator}
          onOperatorChange={setSelectedOperator}
          operators={operators}
          onTransfer={transferToNextMonth}
          isTransferring={isTransferring}
          transferButtonDisabled={transferButtonDisabled}
          filteredOperators={filteredOperators}
          filteredCustomers={filteredCustomers}
          filteredBranches={filteredBranches}
        />
        
        {/* Ana Takvim Alanı */}
        <div className="flex-1 p-2 sm:p-4 flex flex-col overflow-y-auto">
          {/* Takvim Başlığı */}
          <CalendarHeader
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
            showSidebar={showSidebar}
            onPrevMonth={() => setCurrentDate(addMonths(currentDate, -1))}
            onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
            currentDate={currentDate}
            onExportPDF={exportToPDF}
            onExportImage={exportToImage}
          />

          {/* Seçili Operatör Göstergesi */}
          {selectedOperator && (
            <div className="mb-4 p-3 bg-purple-100 border-2 border-purple-500 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-purple-700" />
                  <span className="font-semibold text-purple-900">
                    Seçili Operatör: {operators.find(op => op.id === selectedOperator)?.name || 'Bilinmeyen'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOperator(null)}
                  className="text-purple-700 hover:text-purple-900 text-sm underline"
                >
                  Temizle
                </button>
              </div>
            </div>
          )}

          {/* Takvim Izgarası */}
          <CalendarGrid
            calendarRef={calendarRef}
            currentDate={currentDate}
            visits={visits}
            onEventDrop={handleEventDrop}
            onDeleteVisit={deleteVisit}
          />
        </div>
      </div>
    </DndProvider>
  );
};

export default AdminCalendarPlanning;