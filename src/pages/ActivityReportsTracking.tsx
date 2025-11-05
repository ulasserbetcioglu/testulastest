import React, { useState, useEffect, useMemo } from 'react';
// import { supabase } from '../lib/supabase'; // Gerçek import
// import { toast } from 'sonner'; // Gerçek import
import { Search, Download, RefreshCw, FileText, CheckCircle, X, AlertTriangle, User, ChevronLeft, ChevronRight, Loader2, BookOpen, PlusCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
// import AddVisitForReportModal from '../components/Visits/AddVisitForReportModal'; // Gerçek import

// --- ARAYÜZLER (INTERFACES) ---
// TypeScript arayüzleri, .jsx dosyasında hataya neden olduğu için kaldırıldı.
// Veri yapısı kod içinde dolaylı olarak yönetilmektedir.

// --- Mock Supabase & Toast (Önizleme için) ---
// Gerçek kodunuzda bu bölümü kaldırın ve kendi import'larınızı kullanın.
const toast = {
  success: (message) => console.log(`SUCCESS: ${message}`),
  error: (message) => console.error(`ERROR: ${message}`),
  info: (message) => console.info(`INFO: ${message}`),
  warning: (message) => console.warn(`WARNING: ${message}`),
};

const mockOperators = [
  { id: 'op-1', name: 'Operatör Alpha' },
  { id: 'op-2', name: 'Operatör Beta' },
];

const mockVisits = [
  { id: 'v-1', report_number: '000101', visit_date: '2025-10-20T10:00:00Z', customer: { kisa_isim: 'A Müşterisi' }, branch: { sube_adi: 'Merkez Şube' }, operator: { name: 'Operatör Alpha' }, operator_id: 'op-1' },
  { id: 'v-2', report_number: '000103', visit_date: '2025-10-21T11:00:00Z', customer: { kisa_isim: 'B Müşterisi' }, branch: null, operator: { name: 'Operatör Beta' }, operator_id: 'op-2' },
  { id: 'v-3', report_number: '000104', visit_date: '2025-10-22T12:00:00Z', customer: { kisa_isim: 'A Müşterisi' }, branch: { sube_adi: 'Depo Şube' }, operator: { name: 'Operatör Alpha' }, operator_id: 'op-1' },
];

const mockPaidMaterials = {
  'v-1': [{ product: { name: 'Ürün A' }, quantity: 2 }],
  'v-3': [{ product: { name: 'Ürün B' }, quantity: 5 }],
};

const supabase = {
  auth: {
    getUser: async () => ({
      data: { user: { id: 'user-id-admin', email: 'admin@ilaclamatik.com' } },
      // data: { user: { id: 'user-id-op', email: 'operator@ilaclamatik.com' } }, // Admin olmayan senaryo
    }),
  },
  from: (tableName) => ({
    select: (selectString) => ({
      eq: (col, val) => ({
        single: async () => {
          // Operatör auth_id sorgusu
          if (tableName === 'operators' && col === 'auth_id') {
            return { data: { id: 'op-1' }, error: null }; // Admin olmayan kullanıcı için
          }
          return { data: null, error: new Error('Mock single eq error') };
        },
      }),
      order: (col) => ({
        // Operatör listesi sorgusu
        then: async () => ({ data: mockOperators, error: null }), // .order().then() mock
        [Symbol.asyncIterator]: async function* () { // Normal .order() mock
           yield { data: mockOperators, error: null };
        },
        // Promise mock for await
        then: (onFulfilled) => Promise.resolve({ data: mockOperators, error: null }).then(onFulfilled),
      }),
      not: (col, op, val) => ({
        // Cilt özeti sorgusu
        not: (col2, op2, val2) => ({
          [Symbol.asyncIterator]: async function* () {
             yield { data: mockVisits.filter(v => v.report_number && v.operator), error: null };
          },
          then: (onFulfilled) => Promise.resolve({ data: mockVisits.filter(v => v.report_number && v.operator), error: null }).then(onFulfilled),
        }),
        // Duplicate check sorgusu
         [Symbol.asyncIterator]: async function* () {
             yield { data: mockVisits, error: null };
          },
          then: (onFulfilled) => Promise.resolve({ data: mockVisits, error: null }).then(onFulfilled),
      }),
      in: (col, values) => ({
        // Ana 'visits' sorgusu (handleSearch)
        gte: (col, val) => ({
           lte: (col, val) => ({
             [Symbol.asyncIterator]: async function* () {
                yield { data: mockVisits.filter(v => values.includes(v.report_number)), error: null };
             },
             then: (onFulfilled) => Promise.resolve({ data: mockVisits.filter(v => values.includes(v.report_number)), error: null }).then(onFulfilled),
           })
        }),
        // 'paid_material_sales' sorgusu
        [Symbol.asyncIterator]: async function* () {
            if (tableName === 'paid_material_sales') {
                const salesData = Object.keys(mockPaidMaterials)
                  .filter(visitId => values.includes(visitId))
                  .map(visitId => ({ visit_id: visitId, items: mockPaidMaterials[visitId] }));
                yield { data: salesData, error: null };
            } else if (tableName === 'visits' && col === 'report_number') {
                 // Duplicate check sorgusu (handleSearch içi)
                const counts = mockVisits
                  .filter(v => values.includes(v.report_number))
                  .map(v => ({ report_number: v.report_number }));
                yield { data: counts, error: null };
            }
             else {
                yield { data: mockVisits.filter(v => values.includes(v.report_number)), error: null };
            }
        },
        then: (onFulfilled) => {
            if (tableName === 'paid_material_sales') {
                const salesData = Object.keys(mockPaidMaterials)
                  .filter(visitId => values.includes(visitId))
                  .map(visitId => ({ visit_id: visitId, items: mockPaidMaterials[visitId] }));
                return Promise.resolve({ data: salesData, error: null }).then(onFulfilled);
            } else if (tableName === 'visits' && col === 'report_number') {
                // Duplicate check sorgusu (handleSearch içi)
                const counts = mockVisits
                  .filter(v => values.includes(v.report_number))
                  .map(v => ({ report_number: v.report_number }));
                return Promise.resolve({ data: counts, error: null }).then(onFulfilled);
            }
            return Promise.resolve({ data: mockVisits.filter(v => values.includes(v.report_number)), error: null }).then(onFulfilled);
        }
      }),
      // Fallback for .select()
      [Symbol.asyncIterator]: async function* () {
         if (tableName === 'operators') yield { data: mockOperators, error: null };
         else yield { data: [], error: null };
      },
      then: (onFulfilled) => {
         if (tableName === 'operators') return Promise.resolve({ data: mockOperators, error: null }).then(onFulfilled);
         return Promise.resolve({ data: [], error: null }).then(onFulfilled);
      }
    }),
  }),
};

// Mock Modal Component
const AddVisitForReportModal = ({ isOpen, onClose, onSave, initialData }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
        <h2>Ziyaret Ekle (Mock)</h2>
        <p>Rapor No: {initialData?.reportNumber}</p>
        <p>Operatör ID: {initialData?.operatorId}</p>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}>Kapat</button>
          <button onClick={onSave} style={{ padding: '8px 12px', background: 'blue', color: 'white', border: 'none', borderRadius: '4px' }}>Kaydet (Mock)</button>
        </div>
      </div>
    </div>
  );
};
// --- Mock Bitişi ---


// --- BİLEŞEN (COMPONENT) ---
const ActivityReportsTracking = () => {
  // --- STATE YÖNETİMİ ---
  const [bookletStart, setBookletStart] = useState('');
  const [bookletEnd, setBookletEnd] = useState('');
  const [bookletRangeSize, setBookletRangeSize] = useState(50);
  const [reportStatuses, setReportStatuses] = useState([]);
  
  const [operators, setOperators] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState('');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [userOperatorId, setUserOperatorId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(false);

  const [showBookletSummary, setShowBookletSummary] = useState(false);
  const [bookletRanges, setBookletRanges] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  const [showAddVisitModal, setShowAddVisitModal] = useState(false);
  const [modalInitialData, setModalInitialData] = useState(null);

  const [duplicateReports, setDuplicateReports] = useState([]);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

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
      } catch (err) {
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
        const endNum = startNum + bookletRangeSize - 1;
        setBookletEnd(endNum.toString().padStart(bookletStart.length, '0'));
    } else {
        setBookletEnd(''); // Başlangıç geçerli değilse bitişi temizle
    }
  }, [bookletStart, bookletRangeSize]);

  const checkForDuplicates = async () => {
    setCheckingDuplicates(true);
    try {
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
      }, {});

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
    } catch (err) {
      toast.error(`Duplicate kontrol sırasında hata: ${err.message}`);
    } finally {
      setCheckingDuplicates(false);
    }
  };

  // --- ANA FONKSİYONLAR ---
  const handleSearch = async () => {
    setSearching(true);
    try {
      const isBookletRangeSearch = bookletStart && /^\d+$/.test(bookletStart) && bookletEnd && /^\d+$/.test(bookletEnd);
      if (!isBookletRangeSearch) {
        toast.error('Lütfen geçerli bir cilt aralığı girin. Aylık arama kaldırılmıştır.');
        setSearching(false);
        return;
      }

      let query = supabase.from('visits').select(`id, report_number, visit_date, customer:customer_id(kisa_isim), branch:branch_id(sube_adi), operator:operator_id(name)`);
      
      const operatorToFilter = isAdmin ? selectedOperator : userOperatorId;
      if (operatorToFilter) {
        query = query.eq('operator_id', operatorToFilter);
      }

      let currentExpectedNumbers = [];
      let currentVisitMap = new Map();
      let currentSalesMap = new Map();
      let currentReportCounts = new Map();
      let statuses = [];

      const startNum = parseInt(bookletStart, 10);
      const endNum = parseInt(bookletEnd, 10);
      if (startNum >= endNum) {
        toast.error('Başlangıç numarası bitişten küçük olmalıdır.');
        setSearching(false);
        return;
      }
      currentExpectedNumbers = Array.from({ length: endNum - startNum + 1 }, (_, i) => (startNum + i).toString().padStart(bookletStart.length, '0'));
      query = query.in('report_number', currentExpectedNumbers); // Rapor numarası filtresini ekle

      const { data, error } = await query;
      if (error) throw error;

      // Çekilen verilerden visitMap ve salesMap'i doldur
      currentVisitMap = new Map((data || []).map(visit => [visit.report_number, visit]));
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
      }, new Map()));

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
      
      setReportStatuses(statuses);
      const enteredCount = statuses.filter(s => s.status === 'entered').length;
      const missingCount = statuses.filter(s => s.status === 'missing').length;
      const duplicateCount = statuses.filter(s => s.isDuplicate).length;
      
      let message = `${enteredCount} rapor girilmiş. ${missingCount} rapor eksik.`;
      if (duplicateCount > 0) {
        message += ` ${duplicateCount} rapor numarası tekrarlanıyor!`;
        toast.warning(message);
      } else {
        toast.success(message);
      }
    } catch (err) {
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
        }, {});

        const summaryArray = Object.entries(ranges).map(([name, data]) => ({
            operatorName: name,
            minReport: data.min.toString().padStart(6, '0'),
            maxReport: data.max.toString().padStart(6, '0'),
            count: data.count
        })).sort((a, b) => a.operatorName.localeCompare(b.operatorName));

        setBookletRanges(summaryArray);
    } catch (err) {
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
        'Tekrarlı': report.isDuplicate ? 'EVET' : 'Hayır',
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
    } catch (err) {
      toast.error('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };

  const handleBookletNavigation = (direction) => {
    if (!bookletStart || !/^\d+$/.test(bookletStart)) {
        return toast.info("Lütfen önce geçerli bir başlangıç numarası girin.");
    }
    const currentStart = parseInt(bookletStart, 10);
    const newStart = direction === 'next' ? currentStart + bookletRangeSize : currentStart - bookletRangeSize;
    
    if (newStart < 0) return;

    setBookletStart(newStart.toString().padStart(bookletStart.length, '0'));
  };

  const handleAddVisitClick = (reportNumber) => {
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
  const missingCount = reportStatuses.filter(s => s.status === 'missing').length;
  const duplicateCount = reportStatuses.filter(s => s.isDuplicate).length;

  const sortedReports = useMemo(() => {
    // Raporları her zaman reportNumber'a göre sırala
    return [...filteredReportStatuses].sort((a, b) => {
        return parseInt(a.reportNumber, 10) - parseInt(b.reportNumber, 10);
    });
  }, [filteredReportStatuses]);


  if (loading) return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Rapor Takibi</h1>
        <div className="flex gap-2">
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
          <button onClick={handleSearch} className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors" disabled={searching || !bookletStart}>
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
                {sortedReports.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="p-4 text-center text-gray-500">
                            Arama kriterine uygun rapor bulunamadı.
                        </td>
                    </tr>
                ) : (
                    sortedReports.map(report => (
                        <tr key={report.reportNumber} className={`${report.status === 'missing' ? 'bg-red-50' : ''} ${report.isDuplicate ? 'bg-orange-50 border-l-4 border-orange-400' : ''}`}>
                            <td className="p-4 whitespace-nowrap">
                            <div className="flex items-center">
                                <FileText className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="font-mono text-sm">{report.reportNumber}</span>
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
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal bileşeni render ediliyor */}
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

      {/* Duplicate Raporlar Modalı */}
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