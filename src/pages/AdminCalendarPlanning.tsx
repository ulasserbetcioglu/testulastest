import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, getDay, isSameDay, parseISO, getWeekOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { 
  Search, Filter, Plus, X, ChevronLeft, ChevronRight, Calendar, Trash2, User, 
  FileImage, FileText, Menu, List, Grid, CheckCircle, Copy, Building, Users, AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- TİP TANIMLARI ---
const ItemTypes = {
  CUSTOMER: 'customer',
  BRANCH: 'branch',
  VISIT: 'visit',
  OPERATOR: 'operator'
};

// --- MODAL: TOPLU ZİYARET EKLEME ---
const BulkAddModal = ({ isOpen, onClose, date, customers, branches, selectedOperator, onSave }) => {
  const [selections, setSelections] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const toggleSelection = (id: string) => {
    setSelections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredItems = [
    ...customers.map(c => ({ id: c.id, name: c.kisa_isim, type: 'customer' })),
    ...branches.map(b => ({ id: b.id, name: `${b.sube_adi} (${b.customer.kisa_isim})`, type: 'branch', payload: b }))
  ].filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = () => {
    onSave(selections, filteredItems);
    onClose();
    setSelections([]);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div>
            <h3 className="font-bold text-gray-800">Hızlı Ziyaret Ekle</h3>
            <p className="text-xs text-blue-600 font-medium">{format(date, 'd MMMM yyyy EEEE', { locale: tr })}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-red-500"/></button>
        </div>
        
        <div className="p-3 border-b">
          <input 
            type="text" 
            placeholder="Müşteri veya şube ara..." 
            className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => toggleSelection(item.id)}
              className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                selections.includes(item.id) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selections.includes(item.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>
                  {selections.includes(item.id) && <CheckCircle size={12} className="text-white" />}
                </div>
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-gray-400">{item.type === 'branch' ? 'ŞUBE' : 'MERKEZ'}</span>
            </div>
          ))}
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-xl">
          <button 
            onClick={handleSave}
            disabled={selections.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-[0.98]"
          >
            {selections.length} Ziyareti Ekle
          </button>
        </div>
      </div>
    </div>
  );
};

// --- YENİ MODAL: SONRAKİ AYA AKTARIM ---
const TransferModal = ({ isOpen, onClose, onTransfer, currentDate, customers, branches, operators }) => {
  const [targetOperator, setTargetOperator] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [targetBranch, setTargetBranch] = useState('');

  if (!isOpen) return null;

  const handleTransfer = () => {
    onTransfer({
      operatorId: targetOperator || null,
      customerId: targetCustomer || null,
      branchId: targetBranch || null
    });
    onClose();
  };

  const filteredBranches = branches.filter(b => !targetCustomer || b.customer_id === targetCustomer);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b bg-indigo-50 rounded-t-xl">
          <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <Copy size={20} /> Sonraki Aya Plan Aktarımı
          </h3>
          <p className="text-xs text-indigo-600 mt-1">
            {format(currentDate, 'MMMM yyyy', { locale: tr })} &rarr; {format(addMonths(currentDate, 1), 'MMMM yyyy', { locale: tr })}
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-xs text-yellow-800 flex gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>
              Bu işlem, seçilen kriterlere uyan mevcut ziyaretleri, günlerini koruyarak (örn: ayın 2. Salısı) bir sonraki aya kopyalar.
              <br/><b>Filtre seçmezseniz o aydaki TÜM ziyaretler kopyalanır.</b>
            </span>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Operatör (İsteğe Bağlı)</label>
            <select 
              className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              value={targetOperator}
              onChange={(e) => setTargetOperator(e.target.value)}
            >
              <option value="">Tümü (Operatör ayrımı yapma)</option>
              {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Müşteri (İsteğe Bağlı)</label>
              <select 
                className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                value={targetCustomer}
                onChange={(e) => { setTargetCustomer(e.target.value); setTargetBranch(''); }}
              >
                <option value="">Tümü</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Şube (İsteğe Bağlı)</label>
              <select 
                className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                disabled={!targetCustomer}
              >
                <option value="">Tümü</option>
                {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="p-5 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100">İptal</button>
          <button onClick={handleTransfer} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md">Aktarımı Başlat</button>
        </div>
      </div>
    </div>
  );
};

// --- SÜRÜKLENEBİLİR ZİYARET ---
const DraggableVisit = ({ visit, onDelete }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.VISIT,
    item: { ...visit, type: 'visit' },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }), [visit]);

  const statusColors = {
    completed: 'bg-green-100 border-green-300 text-green-800',
    cancelled: 'bg-red-100 border-red-300 text-red-800',
    planned: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div 
      ref={drag} 
      className={`group relative p-1.5 mb-1 rounded border-l-4 text-[10px] sm:text-xs cursor-grab active:cursor-grabbing shadow-sm transition-all hover:shadow-md ${
        statusColors[visit.status] || statusColors.planned
      } ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}`}
    >
      <div className="flex justify-between items-start">
        <span className="font-bold truncate w-11/12 block">
          {visit.customer?.kisa_isim}
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(visit.id); }} 
          className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 top-1 bg-white rounded-full p-0.5 shadow-sm"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {visit.branch && <div className="text-[9px] truncate opacity-80">{visit.branch.sube_adi}</div>}
      <div className="text-[9px] mt-1 flex items-center gap-1 opacity-70">
        <User size={8} /> {visit.operator?.name?.split(' ')[0]}
      </div>
    </div>
  );
};

// --- GÜN HÜCRESİ ---
const DayCell = ({ date, onEventDrop, visits, onDeleteVisit, onQuickAdd }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.CUSTOMER, ItemTypes.BRANCH, ItemTypes.VISIT],
    drop: (item) => onEventDrop(item, date),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }), [date, onEventDrop]);

  const dayVisits = visits.filter(v => isSameDay(parseISO(v.visit_date), date));
  const isWeekend = getDay(date) === 0 || getDay(date) === 6;

  return (
    <div 
      ref={drop} 
      className={`min-h-[100px] h-full p-1 transition-all relative group flex flex-col ${
        isOver ? 'bg-blue-100 ring-2 ring-blue-400 z-10 scale-[1.02] shadow-lg rounded-lg' : isWeekend ? 'bg-gray-50/50' : ''
      }`}
    >
      {/* Gün Numarası ve Hızlı Ekle Butonu */}
      <div className="flex justify-between items-center mb-1">
        <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday(date) ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
          {format(date, 'd')}
        </span>
        <button 
          onClick={() => onQuickAdd(date)}
          className="opacity-0 group-hover:opacity-100 text-blue-600 hover:bg-blue-100 rounded p-0.5 transition-opacity"
          title="Hızlı Ekle"
        >
          <Plus size={14} strokeWidth={3} />
        </button>
      </div>

      {/* Ziyaret Listesi */}
      <div className="flex-1 space-y-1 overflow-y-auto max-h-[120px] custom-scrollbar">
        {dayVisits.map(visit => (
          <DraggableVisit key={visit.id} visit={visit} onDelete={onDeleteVisit} />
        ))}
      </div>
    </div>
  );
};

// --- ANA SAYFA ---
const AdminCalendarPlanning = () => {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [operators, setOperators] = useState([]);
  const [visits, setVisits] = useState([]);

  // Filters
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [selectedVisitType, setSelectedVisitType] = useState('periyodik');
  const [isTransferring, setIsTransferring] = useState(false);

  // Modals
  const [bulkAddModalOpen, setBulkAddModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false); // Yeni Modal State
  const [modalDate, setModalDate] = useState<Date | null>(null);

  const calendarRef = useRef(null);

  // --- BAŞLANGIÇ ---
  useEffect(() => {
    checkAdmin();
    if (window.innerWidth < 768) setViewMode('list');
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, currentDate, selectedOperator]);

  const checkAdmin = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (user?.email === 'admin@ilaclamatik.com') setIsAdmin(true);
    } catch (err) {
      console.error("Auth check failed:", err);
      toast.error("Oturum bilgileri alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      // Sadece gerekli verileri çek
      const [custData, branchData, opData, visitData] = await Promise.all([
        supabase.from('customers').select('id, kisa_isim').order('kisa_isim'),
        supabase.from('branches').select('id, customer_id, sube_adi, customers(kisa_isim)').order('sube_adi'),
        supabase.from('operators').select('id, name').eq('status', 'Açık').order('name'),
        supabase.from('visits')
          .select('*, customer:customer_id(kisa_isim), branch:branch_id(sube_adi), operator:operator_id(name)')
          .gte('visit_date', start.toISOString())
          .lte('visit_date', end.toISOString())
      ]);

      setCustomers(custData.data || []);
      setBranches(branchData.data?.map(b => ({ ...b, customer: b.customers })) || []);
      setOperators(opData.data || []);
      
      // Operatör filtresi varsa client-side filtrele
      let vData = visitData.data || [];
      if (selectedOperator) {
        vData = vData.filter(v => v.operator_id === selectedOperator);
      }
      setVisits(vData);

    } catch (error) {
      console.error(error);
      toast.error('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // --- İŞLEMLER ---

  const handleEventDrop = async (item, date) => {
    if (!isAdmin) return toast.error('Yetkiniz yok');
    const dateStr = format(date, 'yyyy-MM-dd');

    try {
      if (item.type === 'visit') {
        const { error } = await supabaseAdmin.from('visits').update({ visit_date: dateStr }).eq('id', item.id);
        if (error) throw error;
        toast.success('Ziyaret taşındı');
        // Optimistic update
        setVisits(prev => prev.map(v => v.id === item.id ? { ...v, visit_date: dateStr } : v));
      } else {
        // Yeni oluşturma
        if (!selectedOperator) return toast.error('Önce bir operatör seçin!');
        createVisitBatch([{
          customer_id: item.type === 'branch' ? item.customer_id : item.id,
          branch_id: item.type === 'branch' ? item.id : null,
          operator_id: selectedOperator,
          visit_date: dateStr,
          visit_type: selectedVisitType
        }]);
      }
    } catch (error) {
      toast.error('İşlem hatası: ' + error.message);
    }
  };

  const createVisitBatch = async (visitsPayload) => {
    try {
      const { data, error } = await supabaseAdmin.from('visits').insert(visitsPayload.map(v => ({...v, status: 'planned'}))).select(`*, customer:customer_id(kisa_isim), branch:branch_id(sube_adi), operator:operator_id(name)`);
      if (error) throw error;
      setVisits(prev => [...prev, ...data]);
      toast.success(`${data.length} ziyaret oluşturuldu`);
    } catch (error) {
      toast.error('Kayıt hatası: ' + error.message);
    }
  };

  const handleBulkAdd = (selections, allItems) => {
    if (!selectedOperator) return toast.error('Lütfen önce sol üstten bir operatör seçin!');
    if (!modalDate) return;

    const newVisits = selections.map(id => {
      const item = allItems.find(i => i.id === id);
      return {
        customer_id: item.type === 'branch' ? item.payload.customer_id : item.id,
        branch_id: item.type === 'branch' ? item.id : null,
        operator_id: selectedOperator,
        visit_date: format(modalDate, 'yyyy-MM-dd'),
        visit_type: selectedVisitType
      };
    });

    createVisitBatch(newVisits);
  };

  // --- GÜNCELLENMİŞ AKTARIM MANTIĞI ---
  const handleTransferSubmit = async ({ operatorId, customerId, branchId }) => {
    setIsTransferring(true);
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      
      // 1. Sorguyu Dinamik Oluştur
      let query = supabase
        .from('visits')
        .select('customer_id, branch_id, visit_date, visit_type, operator_id') // operator_id'yi de çekiyoruz
        .gte('visit_date', start.toISOString())
        .lte('visit_date', end.toISOString());

      // Filtreleri Uygula
      if (operatorId) query = query.eq('operator_id', operatorId);
      if (customerId) query = query.eq('customer_id', customerId);
      if (branchId) query = query.eq('branch_id', branchId);

      const { data: sourceVisits, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      if (!sourceVisits || sourceVisits.length === 0) throw new Error('Seçilen kriterlere uygun kopyalanacak ziyaret bulunamadı.');

      const targetMonth = addMonths(currentDate, 1);
      const newVisitsPayload = [];

      sourceVisits.forEach(visit => {
        const d = parseISO(visit.visit_date);
        const dayOfWeek = getDay(d); 
        const weekNum = getWeekOfMonth(d);

        const targetStartOfMonth = startOfMonth(targetMonth);
        const targetEndOfMonth = endOfMonth(targetMonth);
        const daysInTarget = eachDayOfInterval({ start: targetStartOfMonth, end: targetEndOfMonth });
        
        const targetDays = daysInTarget.filter(day => getDay(day) === dayOfWeek);
        const targetDate = targetDays[weekNum - 1] || targetDays[targetDays.length - 1];

        if (targetDate) {
          newVisitsPayload.push({
            customer_id: visit.customer_id,
            branch_id: visit.branch_id,
            operator_id: visit.operator_id, // Kaynaktaki operatörü koru (veya yeni bir mantık eklenebilir)
            visit_date: format(targetDate, 'yyyy-MM-dd'),
            visit_type: visit.visit_type,
            status: 'planned'
          });
        }
      });

      if (newVisitsPayload.length > 0) {
        const { error: insertError } = await supabaseAdmin.from('visits').insert(newVisitsPayload);
        if (insertError) throw insertError;
        toast.success(`${newVisitsPayload.length} ziyaret başarıyla sonraki aya aktarıldı.`);
        setCurrentDate(targetMonth);
      }

    } catch (error) {
      toast.error('Aktarım hatası: ' + error.message);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDeleteVisit = async (id) => {
    if (!confirm('Ziyareti silmek istiyor musunuz?')) return;
    await supabaseAdmin.from('visits').delete().eq('id', id);
    setVisits(prev => prev.filter(v => v.id !== id));
    toast.success('Silindi');
  };

  const handleExport = async (type) => {
    if (!calendarRef.current) return;
    const canvas = await html2canvas(calendarRef.current, { scale: 2, backgroundColor: '#fff' });
    if (type === 'png') {
      const link = document.createElement('a');
      link.download = 'takvim.png';
      link.href = canvas.toDataURL();
      link.click();
    } else {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(canvas.toDataURL());
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgProps.data, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('takvim.pdf');
    }
  };

  if (!isAdmin && !loading) return <div className="p-10 text-center text-red-500 font-bold">Bu sayfaya erişim yetkiniz yok.</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-[calc(100vh-64px)] flex-col bg-gray-50 overflow-hidden">
        
        {/* ÜST BAR */}
        <div className="bg-white border-b px-4 py-3 shadow-sm z-20 flex flex-col md:flex-row gap-4 justify-between items-center">
          
          <div className="flex items-center gap-4 bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setCurrentDate(addMonths(currentDate, -1))} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all"><ChevronLeft size={18}/></button>
            <div className="text-center min-w-[140px]">
              <span className="block font-bold text-gray-800 text-lg leading-tight">{format(currentDate, 'MMMM', { locale: tr })}</span>
              <span className="text-xs text-gray-500 font-medium">{format(currentDate, 'yyyy')}</span>
            </div>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-lg shadow-sm transition-all"><ChevronRight size={18}/></button>
          </div>

          <div className="flex flex-wrap gap-3 items-center justify-center">
            <div className="relative group">
              <User className="absolute left-3 top-2.5 text-gray-400 group-hover:text-blue-500 transition-colors" size={16} />
              <select 
                className="pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm min-w-[200px] appearance-none"
                value={selectedOperator || ''}
                onChange={(e) => setSelectedOperator(e.target.value || null)}
              >
                <option value="">Tüm Operatörler</option>
                {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <select 
                className="pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm appearance-none"
                value={selectedVisitType}
                onChange={(e) => setSelectedVisitType(e.target.value)}
              >
                <option value="periyodik">Periyodik</option>
                <option value="ilk">İlk</option>
                <option value="ucretli">Ücretli</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setTransferModalOpen(true)} 
              disabled={isTransferring}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTransferring ? <span className="animate-spin">⏳</span> : <Copy size={16} />}
              <span className="hidden md:inline">Sonraki Aya Aktar</span>
            </button>
            <div className="bg-gray-100 p-1 rounded-xl flex">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><Grid size={18}/></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><List size={18}/></button>
            </div>
            <button onClick={() => handleExport('pdf')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="PDF İndir"><FileText size={20}/></button>
          </div>
        </div>

        <div className="bg-blue-50 px-4 py-2 flex justify-between items-center text-xs sm:text-sm border-b border-blue-100 text-blue-800">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> <b>{visits.length}</b> Toplam</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> <b>{visits.filter(v => v.status === 'completed').length}</b> Tamamlanan</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> <b>{visits.filter(v => v.status !== 'completed' && v.status !== 'cancelled').length}</b> Bekleyen</span>
          </div>
          <div className="hidden sm:block opacity-70 italic">Takvimdeki (+) butonuna tıklayarak hızlı ekleme yapabilirsiniz.</div>
        </div>

        {/* ANA TAKVİM ALANI */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar" ref={calendarRef}>
          
          {viewMode === 'grid' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-7 border-b bg-gray-50">
                {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map((d, i) => (
                  <div key={i} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:block">{d}</div>
                ))}
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d, i) => (
                  <div key={i} className="py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider sm:hidden">{d}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px border-b">
                {Array.from({ length: (getDay(startOfMonth(currentDate)) + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-gray-50 min-h-[100px]"></div>
                ))}

                {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((day) => (
                  <div key={day.toISOString()} className="bg-white min-h-[120px]">
                    <DayCell 
                      date={day} 
                      visits={visits} 
                      onEventDrop={handleEventDrop} 
                      onDeleteVisit={handleDeleteVisit}
                      onQuickAdd={(d) => { setModalDate(d); setBulkAddModalOpen(true); }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl mx-auto pb-20">
              {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((day) => {
                const dayVisits = visits.filter(v => isSameDay(parseISO(v.visit_date), day));
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                
                if (dayVisits.length === 0 && !isToday(day)) return null;

                return (
                  <div key={day.toISOString()} className={`rounded-xl border overflow-hidden shadow-sm ${isToday(day) ? 'border-blue-300 ring-1 ring-blue-300' : 'border-gray-200 bg-white'}`}>
                    <div className={`px-4 py-3 flex justify-between items-center ${isWeekend ? 'bg-gray-50' : 'bg-white'} border-b border-gray-100`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center border ${isToday(day) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-700'}`}>
                          <span className="text-xs font-medium uppercase">{format(day, 'EEE', { locale: tr })}</span>
                          <span className="text-lg font-bold leading-none">{format(day, 'd')}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-500">{format(day, 'MMMM yyyy', { locale: tr })}</span>
                      </div>
                      <button onClick={() => { setModalDate(day); setBulkAddModalOpen(true); }} className="text-blue-600 bg-blue-50 p-2 rounded-lg hover:bg-blue-100">
                        <Plus size={20} />
                      </button>
                    </div>
                    
                    <div className="divide-y divide-gray-100">
                      {dayVisits.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-400 italic">Planlanmış ziyaret yok</div>
                      ) : (
                        dayVisits.map(visit => (
                          <div key={visit.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div>
                              <div className="font-bold text-gray-800 text-sm">{visit.customer?.kisa_isim}</div>
                              {visit.branch && <div className="text-xs text-gray-500">{visit.branch.sube_adi}</div>}
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  visit.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>{visit.status === 'completed' ? 'Tamamlandı' : 'Planlandı'}</span>
                                <span className="text-xs text-gray-400 flex items-center gap-1"><User size={10}/> {visit.operator?.name}</span>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteVisit(visit.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODALLAR */}
        <BulkAddModal 
          isOpen={bulkAddModalOpen} 
          onClose={() => setBulkAddModalOpen(false)} 
          date={modalDate || new Date()} 
          customers={customers} 
          branches={branches}
          selectedOperator={selectedOperator}
          onSave={handleBulkAdd}
        />

        <TransferModal 
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          onTransfer={handleTransferSubmit}
          currentDate={currentDate}
          customers={customers}
          branches={branches}
          operators={operators}
        />

      </div>
    </DndProvider>
  );
};

export default AdminCalendarPlanning;