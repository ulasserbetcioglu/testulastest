import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Download, RefreshCw, FileText, CheckCircle, X, AlertTriangle, User, ChevronLeft, ChevronRight, Loader2, BookOpen, PlusCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import AddVisitForReportModal from '../components/Visits/AddVisitForReportModal'; // ✅ YENİ: Modal bileşeni import edildi
import { format } from 'date-fns'; // format fonksiyonu eklendi
import { tr } from 'date-fns/locale'; // Türkçe lokalizasyon eklendi

// --- ARAYÜZLER (INTERFACES) ---
interface Operator {
  id: string;
  name: string;
}

interface Visit {
  id: string;
  report_number: string;
  visit_date: string;
  customer: { kisa_isim: string; };
  branch?: { sube_adi: string; } | null;
  operator?: { name: string; } | null;
}

interface ReportStatus {
  reportNumber: string;
  status: 'entered' | 'missing';
  visitId?: string;
  visitDate?: string;
  customerName?: string;
  branchName?: string;
  operatorName?: string;
  paidMaterials?: { product: { name: string }, quantity: number }[];
  isDuplicate?: boolean; // ✅ YENİ: Duplicate durumu için
}

interface BookletRange {
    operatorName: string;
    minReport: string;
    maxReport: string;
    count: number;
}

// ✅ YENİ: Duplicate rapor bilgisi için interface
interface DuplicateReport {
  reportNumber: string;
  visits: {
    id: string;
    visitDate: string;
    customerName: string;
    branchName?: string;
    operatorName: string;
  }[];
}

// Türkçe ay isimleri (gruplama için)
const allMonths = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];


// --- BİLEŞEN (COMPONENT) ---
const ActivityReportsTracking: React.FC = () => {
  // --- STATE YÖNETİMİ ---
  const [bookletStart, setBookletStart] = useState<string>('');
  const [bookletEnd, setBookletEnd] = useState<string>('');
  const [bookletRangeSize, setBookletRangeSize] = useState<number>(50); // ✅ YENİ: Rapor aralığı boyutu
  const [reportStatuses, setReportStatuses] = useState<ReportStatus[]>([]);
  
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [userOperatorId, setUserOperatorId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(false);

  const [showBookletSummary, setShowBookletSummary] = useState(false);
  const [bookletRanges, setBookletRanges] = useState<BookletRange[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // ✅ YENİ: Modal için state'ler
  const [showAddVisitModal, setShowAddVisitModal] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<{ reportNumber: string; operatorId: string; } | null>(null);

  // ✅ YENİ: Duplicate detection için state'ler
  const [duplicateReports, setDuplicateReports] = useState<DuplicateReport[]>([]);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // ✅ YENİ: Ay seçimi için state
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const navigate = useNavigate();

  // --- useEffect HOOKS ---
  useEffect(() => {
    const checkUserRoleAndFetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Kullanıcı bulunamadı');

        if (user.email === 'admin@ilaclamatik.com') {
          setIsAdmin(true);
          const { data: operatorData, error: operatorError } = await supabase.from('operators').select('id, name').order('name');
          if (operatorError) throw operatorError;
          setOperators(operatorData || []);
        } else {
          const { data: operatorData, error: operatorError } = await supabase.from('operators').select('id').eq('auth_id', user.id).single();
          if (operatorError) throw operatorError;
          setUserOperatorId(operatorData.id);
        }
      } catch (err: any) {
        toast.error(`Yetki kontrolü başarısız: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    checkUserRoleAndFetchData();
  }, []);

  useEffect(() => {
    if (bookletStart && /^\d+$/.test(bookletStart)) {
        const startNum = parseInt(bookletStart, 10);
        const endNum = startNum + bookletRangeSize - 1; // ✅ GÜNCELLENDİ: bookletRangeSize kullanılıyor
        setBookletEnd(endNum.toString().padStart(bookletStart.length, '0'));
    }
  }, [bookletStart, bookletRangeSize]); // ✅ GÜNCELLENDİ: bookletRangeSize bağımlılıklara eklendi

  // ✅ YENİ: Duplicate kontrol fonksiyonu
  const checkForDuplicates = async () => {
    setCheckingDuplicates(true);
    try {
      // Tüm ziyaretlerdeki rapor numaralarını çek
      const { data: allVisits, error } = await supabase
        .from('visits')
        .select(`
          id, 
          report_number, 
          visit_date, 
          customer:customer_id(kisa_isim), 
          branch:branch_id(sube_adi), 
          operator:operator_id(name)
        `)
        .not('report_number', 'is', null);

      if (error) throw error;

      // Rapor numaralarına göre grupla
      const reportGroups = (allVisits || []).reduce((acc, visit) => {
        const reportNum = visit.report_number;
        if (!acc[reportNum]) {
          acc[reportNum] = [];
        }
        acc[reportNum].push({
          id: visit.id,
          visitDate: visit.visit_date,
          customerName: visit.customer?.kisa_isim || 'Bilinmeyen',
          branchName: visit.branch?.sube_adi,
          operatorName: visit.operator?.name || 'Bilinmeyen'
        });
        return acc;
      }, {} as Record<string, any[]>);

      // Sadece birden fazla ziyareti olan rapor numaralarını filtrele
      const duplicates = Object.entries(reportGroups)
        .filter(([_, visits]) => visits.length > 1)
        .map(([reportNumber, visits]) => ({
          reportNumber,
          visits
        }))
        .sort((a, b) => a.reportNumber.localeCompare(b.reportNumber));

      setDuplicateReports(duplicates);
      
      if (duplicates.length > 0) {
        toast.warning(`${duplicates.length} adet tekrarlanan rapor numarası bulundu!`);
        setShowDuplicatesModal(true);
      } else {
        toast.success('Tekrarlanan rapor numarası bulunamadı.');
      }
    } catch (err: any) {
      toast.error(`Duplicate kontrol sırasında hata: ${err.message}`);
    } finally {
      setCheckingDuplicates(false);
    }
  };

  // --- ANA FONKSİYONLAR ---
  const handleSearch = async () => {
    setSearching(true);
    try {
      let query = supabase.from('visits').select(`id, report_number, visit_date, customer:customer_id(kisa_isim), branch:branch_id(sube_adi), operator:operator_id(name)`);
      
      const operatorToFilter = isAdmin ? selectedOperator : userOperatorId;
      if (operatorToFilter) {
        query = query.eq('operator_id', operatorToFilter);
      }

      let currentExpectedNumbers: string[] = [];
      let currentVisitMap = new Map<string, Visit>();
      let currentSalesMap = new Map();
      let currentReportCounts = new Map<string, number>();
      let statuses: ReportStatus[] = [];

      // Her zaman ay filtresini uygula
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
      query = query.gte('visit_date', startDate).lte('visit_date', endDate);

      // Cilt aralığı araması yapılıp yapılmadığını belirle
      const isBookletRangeSearch = bookletStart && /^\d+$/.test(bookletStart) && bookletEnd && /^\d+$/.test(bookletEnd);

      if (isBookletRangeSearch) {
        const startNum = parseInt(bookletStart, 10);
        const endNum = parseInt(bookletEnd, 10);
        if (startNum >= endNum) {
          toast.error('Başlangıç numarası bitişten küçük olmalıdır.');
          setSearching(false);
          return;
        }
        currentExpectedNumbers = Array.from({ length: endNum - startNum + 1 }, (_, i) => (startNum + i).toString().padStart(bookletStart.length, '0'));
        query = query.in('report_number', currentExpectedNumbers); // Rapor numarası filtresini ekle
      } else {
        query = query.not('report_number', 'is', null); // Sadece rapor numarası olan ziyaretleri getir
      }

      const { data, error } = await query;
      if (error) throw error;

      // Çekilen verilerden visitMap ve salesMap'i doldur
      currentVisitMap = new Map((data || []).map(visit => [visit.report_number, visit as Visit]));
      const visitIds = (data || []).map(v => v.id);
      if (visitIds.length > 0) {
          const { data: salesData, error: salesError } = await supabase
              .from('paid_material_sales')
              .select('visit_id, items:paid_material_sale_items(quantity, product:product_id(name))')
              .in('visit_id', visitIds);
          if (salesError) throw salesError;
          (salesData || []).forEach(sale => {
              currentSalesMap.set(sale.visit_id, sale.items);
          });
      }

      // Çekilen raporlar arasındaki duplicate'leri kontrol et
      const { data: duplicateCheckData, error: duplicateError } = await supabase
        .from('visits')
        .select('report_number')
        .in('report_number', (data || []).map(v => v.report_number).filter(Boolean));
      
      if (duplicateError) throw duplicateError;

      currentReportCounts = new Map((duplicateCheckData || []).reduce((acc, visit) => {
        acc.set(visit.report_number, (acc.get(visit.report_number) || 0) + 1);
        return acc;
      }, new Map<string, number>()));

      if (isBookletRangeSearch) {
        // Eğer cilt aralığı araması yapılıyorsa, o aralıktaki eksik numaraları tespit et
        statuses = currentExpectedNumbers.map(num => {
          const visit = currentVisitMap.get(num);
          const isDuplicate = (currentReportCounts.get(num) || 0) > 1;
          return visit
            ? { 
                reportNumber: num, 
                status: 'entered', 
                visitId: visit.id, 
                visitDate: visit.visit_date, 
                customerName: visit.customer?.kisa_isim, 
                branchName: visit.branch?.sube_adi, 
                operatorName: visit.operator?.name, 
                paidMaterials: currentSalesMap.get(visit.id) || [],
                isDuplicate
              }
            : { reportNumber: num, status: 'missing' };
        });
      } else {
        // Eğer cilt aralığı araması yapılmıyorsa, çekilen tüm raporlar 'girilmiş' kabul edilir
        statuses = (data || []).map(visit => {
          const isDuplicate = (currentReportCounts.get(visit.report_number) || 0) > 1;
          return {
            reportNumber: visit.report_number,
            status: 'entered', // Belirli bir cilt aralığı kontrol edilmediği için her zaman 'girilmiş'
            visitId: visit.id,
            visitDate: visit.visit_date,
            customerName: visit.customer?.kisa_isim,
            branchName: visit.branch?.sube_adi,
            operatorName: visit.operator?.name,
            paidMaterials: currentSalesMap.get(visit.id) || [],
            isDuplicate
          };
        });
      }

      setReportStatuses(statuses);
      const enteredCount = statuses.filter(s => s.status === 'entered').length;
      const missingCount = statuses.filter(s => s.status === 'missing').length; // Sadece isBookletRangeSearch true ise anlamlı
      const duplicateCount = statuses.filter(s => s.isDuplicate).length;
      
      let message = `${enteredCount} rapor girilmiş.`;
      if (isBookletRangeSearch) {
          message += ` ${missingCount} rapor eksik.`;
      }
      if (duplicateCount > 0) {
          message += ` ${duplicateCount} rapor numarası tekrarlanıyor!`;
          toast.warning(message);
      } else {
          toast.success(message);
      }
    } catch (err: any) {
      toast.error(`Arama sırasında hata: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  const fetchBookletSummary = async () => {
    setLoadingSummary(true);
    setShowBookletSummary(true);
    try {
        const { data, error } = await supabase
            .from('visits')
            .select('report_number, operator:operator_id(name)')
            .not('report_number', 'is', null)
            .not('operator_id', 'is', null);

        if (error) throw error;

        const ranges = data.reduce((acc, visit) => {
            if (!visit.operator || !visit.report_number) return acc;
            const operatorName = visit.operator.name;
            const reportNum = parseInt(visit.report_number, 10);
            if (isNaN(reportNum)) return acc;

            if (!acc[operatorName]) {
                acc[operatorName] = { min: reportNum, max: reportNum, count: 0 };
            }
            if (reportNum < acc[operatorName].min) acc[operatorName].min = reportNum;
            if (reportNum > acc[operatorName].max) acc[operatorName].max = reportNum;
            acc[operatorName].count++;
            return acc;
        }, {} as Record<string, { min: number; max: number; count: number }>);

        const summaryArray = Object.entries(ranges).map(([name, data]) => ({
            operatorName: name,
            minReport: data.min.toString().padStart(6, '0'),
            maxReport: data.max.toString().padStart(6, '0'),
            count: data.count
        })).sort((a, b) => a.operatorName.localeCompare(b.operatorName));

        setBookletRanges(summaryArray);
    } catch (err: any) {
        toast.error("Özet verisi çekilirken hata oluştu.");
    } finally {
        setLoadingSummary(false);
    }
  };

  const exportToExcel = () => {
    if (filteredReportStatuses.length === 0) return toast.error('Dışa aktarılacak veri yok.');

    try {
      const data = filteredReportStatuses.map(report => ({
        'Rapor No': report.reportNumber,
        'Durum': report.status === 'entered' ? 'Girilmiş' : 'Eksik',
        'Tekrarlı': report.isDuplicate ? 'EVET' : 'Hayır', // ✅ YENİ: Excel'e duplicate durumu eklendi
        'Müşteri': report.customerName || '-',
        'Şube': report.branchName || '-',
        'Operatör': report.operatorName || '-',
        'Ziyaret Tarihi': report.visitDate ? new Date(report.visitDate).toLocaleDateString('tr-TR') : '-'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 25 }, { wch: 15 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rapor Durumları');
      XLSX.writeFile(wb, `Rapor_Takibi_${bookletStart}-${bookletEnd}.xlsx`);
      toast.success('Excel dosyası başarıyla indirildi.');
    } catch (err: any) {
      toast.error('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };

  const handleBookletNavigation = (direction: 'prev' | 'next') => {
    if (!bookletStart || !/^\d+$/.test(bookletStart)) {
        return toast.info("Lütfen önce geçerli bir başlangıç numarası girin.");
    }
    const currentStart = parseInt(bookletStart, 10);
    const newStart = direction === 'next' ? currentStart + bookletRangeSize : currentStart - bookletRangeSize; // ✅ GÜNCELLENDİ: bookletRangeSize kullanılıyor
    
    if (newStart < 0) return;

    setBookletStart(newStart.toString().padStart(bookletStart.length, '0'));
  };

  // ✅ DEĞİŞİKLİK: Bu fonksiyon artık navigate yerine modalı açıyor.
  const handleAddVisitClick = (reportNumber: string) => {
    const operatorId = isAdmin ? selectedOperator : userOperatorId;
    if (!operatorId) {
        toast.error("Ziyaret eklemek için bir operatör seçili olmalıdır.");
        return;
    }
    setModalInitialData({ reportNumber, operatorId });
    setShowAddVisitModal(true);
  };

  const filteredReportStatuses = showMissingOnly ? reportStatuses.filter(report => report.status === 'missing') : reportStatuses;
  const enteredCount = reportStatuses.filter(s => s.status === 'entered').length;
  const missingCount = reportStatuses.filter(s => s.status === 'missing').length; // ✅ GÜNCELLENDİ: Missing count'u doğru hesapla
  const duplicateCount = reportStatuses.filter(s => s.isDuplicate).length; // ✅ YENİ: Duplicate sayısı

  // ✅ YENİ: Raporları aya göre gruplayan useMemo
  const groupedReports = useMemo(() => {
    // Determine if we are in a booklet range search mode based on the data structure
    // If any report has status 'missing', it implies a booklet range search was performed.
    const isBookletSearchActive = filteredReportStatuses.some(report => report.status === 'missing');

    if (isBookletSearchActive) {
        // For booklet searches, sort all reports (entered and missing) by reportNumber
        const sortedReports = [...filteredReportStatuses].sort((a, b) => {
            return parseInt(a.reportNumber, 10) - parseInt(b.reportNumber, 10);
        });
        // Return as a single group, or group by month if visitDate is available for entered ones
        // For simplicity, let's return as a single group for now, as user wants "sırayla"
        return [{ monthYear: 'Tüm Raporlar', reports: sortedReports }];
    } else {
        // For non-booklet searches (monthly view), group by visitDate
        const groups: Record<string, ReportStatus[]> = {};

        filteredReportStatuses.forEach(report => {
            // Only 'entered' reports will have visitDate in this mode
            if (report.status === 'entered' && report.visitDate) {
                const date = new Date(report.visitDate);
                const monthYearKey = format(date, 'MMMM yyyy', { locale: tr });
                if (!groups[monthYearKey]) {
                    groups[monthYearKey] = [];
                }
                groups[monthYearKey].push(report);
            }
        });

        const sortedMonthKeys = Object.keys(groups).sort((a, b) => {
            const dateA = new Date(a.split(' ')[1], allMonths.indexOf(a.split(' ')[0]), 1);
            const dateB = new Date(b.split(' ')[1], allMonths.indexOf(b.split(' ')[0]), 1);
            return dateA.getTime() - dateB.getTime();
        });

        return sortedMonthKeys.map(key => ({
            monthYear: key,
            reports: groups[key].sort((a, b) => new Date(a.visitDate!).getTime() - new Date(b.visitDate!).getTime())
        }));
    }
  }, [filteredReportStatuses]);


  if (loading) return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Rapor Takibi</h1>
        <div className="flex gap-2">
            {/* ✅ YENİ: Duplicate kontrol butonu */}
            <button 
              onClick={checkForDuplicates} 
              disabled={checkingDuplicates}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg shadow-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {checkingDuplicates ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertCircle size={20} />}
              {checkingDuplicates ? 'Kontrol Ediliyor...' : 'Tekrar Kontrol'}
            </button>
            <button onClick={fetchBookletSummary} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-sm hover:bg-purple-700 transition-colors">
                <BookOpen size={20} /> Cilt Kullanım Özeti
            </button>
            {reportStatuses.length > 0 && (
            <button onClick={exportToExcel} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors">
                <Download size={20} /> Excel'e Aktar
            </button>
            )}
        </div>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Cilt Numarası Aralığı</label>
            <div className="flex items-center gap-2 mt-1">
                <button onClick={() => handleBookletNavigation('prev')} className="p-2 border rounded-md hover:bg-gray-100 disabled:opacity-50" disabled={searching}><ChevronLeft size={20}/></button>
                <input type="text" value={bookletStart} onChange={(e) => setBookletStart(e.target.value)} className="w-full p-2 border rounded-md text-center" placeholder="Başlangıç" disabled={searching} />
                <span className="text-gray-500">-</span>
                <input type="text" value={bookletEnd} readOnly className="w-full p-2 border rounded-md text-center bg-gray-100" placeholder="Bitiş" />
                <button onClick={() => handleBookletNavigation('next')} className="p-2 border rounded-md hover:bg-gray-100 disabled:opacity-50" disabled={searching}><ChevronRight size={20}/></button>
            </div>
          </div>
          {/* ✅ YENİ: Rapor aralığı boyutu inputu */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Aralık Boyutu</label>
            <input type="number" value={bookletRangeSize} onChange={(e) => setBookletRangeSize(parseInt(e.target.value) || 1)} min="1" className="w-full p-2 border rounded-md text-center" />
          </div>
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Operatör Filtrele</label>
              <select value={selectedOperator} onChange={e => setSelectedOperator(e.target.value)} className="w-full p-2 border rounded-md">
                <option value="">Tüm Operatörler</option>
                {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
            {/* ✅ YENİ: Ay seçimi inputu */}
            <div className="mr-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">Ay Seçimi</label>
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full p-2 border rounded-md" />
            </div>
          <button onClick={handleSearch} className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors" disabled={searching || (!bookletStart && !selectedMonth)}>
            {searching ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {searching ? 'Aranıyor...' : 'Raporları Tara'}
          </button>
        </div>
      </div>

      {reportStatuses.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-4 border-b flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700"><CheckCircle className="w-5 h-5"/> Girilmiş: {enteredCount}</div>
              <div className="flex items-center gap-2 text-sm font-medium text-red-700"><X className="w-5 h-5"/> Eksik: {missingCount}</div>
              {/* ✅ YENİ: Duplicate sayısı göstergesi */}
              {duplicateCount > 0 && (
                <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
                  <AlertTriangle className="w-5 h-5"/> Tekrarlı: {duplicateCount}
                </div>
              )}
            </div>
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" checked={showMissingOnly} onChange={(e) => setShowMissingOnly(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"/>
              <span className="ml-2 text-sm text-gray-600">Sadece Eksikleri Göster</span>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Rapor No</th>
                  <th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase">Durum</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Müşteri / Şube & Malzemeler</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Operatör</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Ziyaret Tarihi</th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {groupedReports.length === 0 ? ( // ✅ GÜNCELLENDİ: groupedReports kontrolü
                    <tr>
                        <td colSpan={6} className="p-4 text-center text-gray-500">
                            {searchTerm ? 'Arama kriterine uygun rapor bulunamadı.' : 'Görüntülenecek rapor bulunamadı.'}
                        </td>
                    </tr>
                ) : (
                    groupedReports.map(group => ( // ✅ GÜNCELLENDİ: Gruplara göre render
                        <React.Fragment key={group.monthYear}>
                            <tr className="bg-gray-100">
                                <td colSpan={6} className="p-2 text-left text-sm font-semibold text-gray-700">
                                    {group.monthYear}
                                </td>
                            </tr>
                            {group.reports.map(report => (
                                <tr key={report.reportNumber} className={`${report.status === 'missing' ? 'bg-red-50' : ''} ${report.isDuplicate ? 'bg-orange-50 border-l-4 border-orange-400' : ''}`}>
                                    <td className="p-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                                        <span className="font-mono text-sm">{report.reportNumber}</span>
                                        {/* ✅ YENİ: Duplicate uyarı ikonu */}
                                        {report.isDuplicate && (
                                        <AlertTriangle className="w-4 h-4 text-orange-500 ml-2" title="Bu rapor numarası tekrarlanıyor!" />
                                        )}
                                    </div>
                                    </td>
                                    <td className="p-4 whitespace-nowrap text-center">
                                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                                        report.isDuplicate 
                                        ? 'bg-orange-100 text-orange-800' 
                                        : report.status === 'entered' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {report.isDuplicate ? 'Tekrarlı' : report.status === 'entered' ? 'Girilmiş' : 'Eksik'}
                                    </span>
                                    </td>
                                    <td className="p-4 whitespace-nowrap text-sm text-gray-800">
                                    {report.customerName ? (
                                        <div>
                                        <div className="font-semibold">{report.customerName}</div>
                                        <div className="text-gray-500">{report.branchName}</div>
                                        {report.paidMaterials && report.paidMaterials.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-gray-200">
                                                {report.paidMaterials.map((item, index) => (
                                                    <p key={index} className="text-xs text-indigo-700">
                                                        - {item.quantity} x {item.product.name}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                        </div>
                                    ) : '-'}
                                    </td>
                                    <td className="p-4 whitespace-nowrap text-sm text-gray-500"><div className="flex items-center">{report.operatorName ? <><User className="w-4 h-4 mr-2" /> {report.operatorName}</> : '-'}</div></td>
                                    <td className="p-4 whitespace-nowrap text-sm text-gray-500">{report.visitDate ? new Date(report.visitDate).toLocaleDateString('tr-TR') : '-'}</td>
                                    <td className="p-4 whitespace-nowrap text-right">
                                        {isAdmin && report.status === 'missing' && (
                                            <button
                                                onClick={() => handleAddVisitClick(report.reportNumber)}
                                                disabled={!selectedOperator}
                                                title={!selectedOperator ? "Eksik ziyaret eklemek için lütfen operatör filtresinden bir operatör seçin." : "Bu rapor numarası için yeni ziyaret ekle"}
                                                className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                                                    selectedOperator ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                            >
                                                <PlusCircle size={14}/> Ziyaret Ekle
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ✅ YENİ: Modal bileşeni render ediliyor */}
      {showAddVisitModal && modalInitialData && (
        <AddVisitForReportModal
            isOpen={showAddVisitModal}
            onClose={() => setShowAddVisitModal(false)}
            onSave={() => {
                setShowAddVisitModal(false);
                handleSearch(); // Kayıt sonrası listeyi yenile
            }}
            initialData={modalInitialData}
        />
      )}

      {/* ✅ YENİ: Duplicate Raporlar Modalı */}
      {showDuplicatesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={() => setShowDuplicatesModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Tekrarlanan Rapor Numaraları</h3>
              <button 
                onClick={() => setShowDuplicatesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh]">
              {duplicateReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Tekrarlanan rapor numarası bulunamadı.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {duplicateReports.map(duplicate => (
                    <div key={duplicate.reportNumber} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <h4 className="font-semibold text-orange-800">
                          Rapor No: {duplicate.reportNumber}
                        </h4>
                        <span className="text-sm text-orange-600">
                          ({duplicate.visits.length} kez kullanılmış)
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {duplicate.visits.map((visit, index) => (
                          <div key={visit.id} className="bg-white p-3 rounded border-l-4 border-orange-400">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">Müşteri:</span>
                                <div className="font-medium">{visit.customerName}</div>
                              </div>
                              {visit.branchName && (
                                <div>
                                  <span className="text-gray-600">Şube:</span>
                                  <div className="font-medium">{visit.branchName}</div>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600">Operatör:</span>
                                <div className="font-medium">{visit.operatorName}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Tarih:</span>
                                <div className="font-medium">
                                  {new Date(visit.visitDate).toLocaleDateString('tr-TR')}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Toplam {duplicateReports.length} rapor numarası tekrarlanıyor
              </div>
              <button 
                onClick={() => setShowDuplicatesModal(false)} 
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cilt Kullanım Özeti Modalı */}
      {showBookletSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={() => setShowBookletSummary(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Operatör Cilt Kullanım Özeti</h3>
            {loadingSummary ? (
              <div className="text-center p-10"><Loader2 className="w-8 h-8 animate-spin text-gray-400"/></div>
            ) : (
                <div className="overflow-y-auto max-h-[60vh]">
                    <table className="min-w-full">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-3 text-left text-sm font-semibold text-gray-600">Operatör</th>
                                <th className="p-3 text-left text-sm font-semibold text-gray-600">Kullanılan İlk Rapor</th>
                                <th className="p-3 text-left text-sm font-semibold text-gray-600">Kullanılan Son Rapor</th>
                                <th className="p-3 text-center text-sm font-semibold text-gray-600">Toplam Rapor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {bookletRanges.map(range => (
                                <tr key={range.operatorName} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium">{range.operatorName}</td>
                                    <td className="p-3 font-mono text-blue-600">{range.minReport}</td>
                                    <td className="p-3 font-mono text-purple-600">{range.maxReport}</td>
                                    <td className="p-3 text-center font-semibold">{range.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowBookletSummary(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityReportsTracking;
