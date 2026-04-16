import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, getDay, isSameDay, parseISO, getWeekOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase, supabaseAdmin } from '../lib/supabase';
import {
  Search, Filter, Plus, X, ChevronLeft, ChevronRight, Calendar, Trash2, User,
  Menu, List, Grid, CheckCircle, Copy, AlertCircle, Printer, ArrowLeft, FileText, FileImage
} from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- TİP TANIMLARI ---
interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  customer_id: string;
  sube_adi: string;
  customer?: { kisa_isim: string };
}

interface Operator {
  id: string;
  name: string;
}

interface Visit {
  id: string;
  visit_date: string;
  customer_id: string;
  branch_id?: string | null;
  operator_id: string;
  status: string;
  visit_type: string;
  customer?: { kisa_isim: string };
  branch?: { sube_adi: string };
  operator?: { name: string };
}

const ItemTypes = {
  CUSTOMER: 'customer',
  BRANCH: 'branch',
  VISIT: 'visit',
  OPERATOR: 'operator'
};

// --- MODAL: TOPLU ZİYARET EKLEME ---
const BulkAddModal = ({ isOpen, onClose, date, customers, branches, onSave }: {
  isOpen: boolean,
  onClose: () => void,
  date: Date,
  customers: Customer[],
  branches: Branch[],
  selectedOperator: string | null,
  onSave: (selections: string[], allItems: any[]) => void
}) => {
  const [selections, setSelections] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const toggleSelection = (id: string) => {
    setSelections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredItems = [
    ...customers
      .filter(c => !branches.some(b => b.customer_id === c.id))
      .map(c => ({ id: c.id, name: c.kisa_isim, type: 'customer' })),
    ...branches.map(b => ({ id: b.id, name: `${b.sube_adi} (${b.customer?.kisa_isim || ''})`, type: 'branch', payload: b }))
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
          <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-red-500" /></button>
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
              className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${selections.includes(item.id) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'
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

// --- MODAL: SONRAKİ AYA AKTARIM ---
const TransferModal = ({ isOpen, onClose, onTransfer, currentDate, customers, branches, operators }: {
  isOpen: boolean,
  onClose: () => void,
  onTransfer: (params: { operatorId: string | null, customerId: string | null, branchId: string | null }) => void,
  currentDate: Date,
  customers: Customer[],
  branches: Branch[],
  operators: Operator[]
}) => {
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
              <br /><b>Filtre seçmezseniz o aydaki TÜM ziyaretler kopyalanır.</b>
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

const VisualStatus = ({ stats }: { stats: { target: number, planned: number, completed: number } }) => {
  if (!stats || stats.target === 0) return null;

  const totalAction = stats.planned + stats.completed;
  const completedWidth = (stats.completed / stats.target) * 100;
  const plannedWidth = (stats.planned / stats.target) * 100;
  const remainingWidth = Math.max(0, 100 - (completedWidth + plannedWidth));

  return (
    <div className="w-full mt-1">
      <div className="flex justify-between text-[7px] font-black mb-0.5 px-0.5">
        <span className="text-green-600">T:{stats.completed}</span>
        <span className="text-blue-500">P:{stats.planned}</span>
        <span className="text-gray-400">H:{stats.target}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex border border-gray-200/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500 ease-out"
          style={{ width: `${completedWidth}%` }}
          title={`Tamamlanan: ${stats.completed}`}
        />
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${plannedWidth}%` }}
          title={`Planlanan: ${stats.planned}`}
        />
        <div
          className="h-full bg-transparent"
          style={{ width: `${remainingWidth}%` }}
        />
      </div>
    </div>
  );
};

// --- SÜRÜKLENEBİLİR PLANLANMAYAN BİRİM ---
const DraggableUnplannedItem = ({ item, visitStats }: { item: any, visitStats: any }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: item.type === 'branch' ? ItemTypes.BRANCH : ItemTypes.CUSTOMER,
    item: { ...item },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }), [item]);

  return (
    <div
      ref={drag}
      className={`p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-lg transition-all flex flex-col gap-1 w-full relative group overflow-hidden ${isDragging ? 'opacity-40' : 'opacity-100'}`}
    >
      <div className="flex justify-between items-start gap-1">
        <span className="text-[10px] font-bold text-gray-800 truncate leading-tight flex-1" title={item.name}>
          {item.name}
        </span>
        <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase shrink-0 shadow-sm ${item.type === 'branch' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
          {item.type === 'branch' ? 'Ş' : 'M'}
        </span>
      </div>

      {item.type === 'branch' && item.customerName && (
        <div className="text-[8px] text-gray-400 truncate font-medium">{item.customerName}</div>
      )}

      {visitStats[item.id] && <VisualStatus stats={visitStats[item.id]} />}

      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
};

// --- SÜRÜKLENEBİLİR ZİYARET ---
const DraggableVisit = ({ visit, onDelete, visitStats }: { visit: Visit, onDelete: (id: string) => void, visitStats: any }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.VISIT,
    item: { ...visit, type: 'visit' },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }), [visit]);

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 border-green-300 text-green-800',
    cancelled: 'bg-red-100 border-red-300 text-red-800',
    planned: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div
      ref={drag}
      className={`group relative p-2 mb-1.5 rounded-xl border-l-4 shadow-sm transition-all hover:shadow-md border border-gray-100 ${statusColors[visit.status] || statusColors.planned
        } ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}`}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-bold truncate text-[10px] text-gray-900 block leading-tight">
            {visit.customer?.kisa_isim}
          </span>
          {visit.branch && <div className="text-[8px] truncate text-gray-500 font-medium leading-tight mb-1">{visit.branch.sube_adi}</div>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(visit.id); }}
          className="text-red-400 hover:text-white hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-all absolute right-1 top-1 bg-white rounded-lg p-1 shadow-sm border border-red-100"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {visitStats[visit.branch_id || visit.customer_id] && (
        <div className="mt-1 pt-1 border-t border-black/5">
          <VisualStatus stats={visitStats[visit.branch_id || visit.customer_id]} />
        </div>
      )}

      <div className="text-[8px] mt-1.5 flex items-center gap-1 font-bold text-gray-400 bg-black/5 px-1.5 py-0.5 rounded-md w-fit">
        <User size={8} /> {visit.operator?.name}
      </div>
    </div>
  );
};

// --- GÜN HÜCRESİ (EKRAN MODU) ---
const DayCell = ({ date, onEventDrop, visits, onDeleteVisit, onQuickAdd, visitStats }: {
  date: Date,
  onEventDrop: (item: any, date: Date) => void,
  visits: Visit[],
  onDeleteVisit: (id: string) => void,
  onQuickAdd: (date: Date) => void,
  visitStats: any
}) => {
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
      className={`min-h-[100px] h-full p-1 transition-all relative group flex flex-col ${isOver ? 'bg-blue-100 ring-2 ring-blue-400 z-10 scale-[1.02] shadow-lg rounded-lg' : isWeekend ? 'bg-gray-50/50' : ''
        }`}
    >
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
      <div className="flex-1 space-y-1">
        {dayVisits.map(visit => (
          <DraggableVisit key={visit.id} visit={visit} onDelete={onDeleteVisit} visitStats={visitStats} />
        ))}
      </div>
    </div>
  );
};

// --- ANA SAYFA ---
const AdminCalendarPlanning = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPrintMode, setIsPrintMode] = useState(false); // Baskı Modu State

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [allVisits, setAllVisits] = useState<Visit[]>([]); // Tüm operatörlerin ziyaretleri (planlanmayan hesabı için)

  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [selectedVisitType, setSelectedVisitType] = useState('periyodik');
  const [isTransferring, setIsTransferring] = useState(false);

  const [bulkAddModalOpen, setBulkAddModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [unplannedSearch, setUnplannedSearch] = useState('');
  const [monthlySchedules, setMonthlySchedules] = useState<any[]>([]);

  const calendarRef = useRef(null);

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

      const [custData, branchData, opData, visitData, scheduleData] = await Promise.all([
        supabase.from('customers').select('id, kisa_isim').eq('is_active', true).order('kisa_isim'),
        supabase.from('branches').select('id, customer_id, sube_adi, customers(kisa_isim)').order('sube_adi'),
        supabase.from('operators').select('id, name').eq('status', 'Açık').order('name'),
        supabase.from('visits')
          .select('*, customer:customer_id(kisa_isim), branch:branch_id(sube_adi), operator:operator_id(name)')
          .gte('visit_date', start.toISOString())
          .lte('visit_date', end.toISOString()),
        supabase.from('monthly_visit_schedules')
          .select('*')
          .eq('month', currentDate.getMonth() + 1)
          .eq('year', currentDate.getFullYear())
      ]);

      setCustomers(custData.data || []);
      setBranches(branchData.data?.map((b: any) => ({
        ...b,
        customer: Array.isArray(b.customers) ? b.customers[0] : b.customers
      })) || []);
      setOperators(opData.data || []);

      const vData = visitData.data || [];
      setAllVisits(vData); // Filtresiz tüm ziyaretler
      setMonthlySchedules(scheduleData.data || []);

      if (selectedOperator) {
        setVisits(vData.filter(v => v.operator_id === selectedOperator));
      } else {
        setVisits(vData);
      }

    } catch (error) {
      console.error(error);
      toast.error('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Ziyaret İstatistiklerini Hesapla (Hedef, Planlanan, Tamamlanan)
  const visitStats = useMemo(() => {
    const stats: Record<string, { target: number, planned: number, completed: number }> = {};

    // Hedefleri ekle
    monthlySchedules.forEach(s => {
      const key = s.branch_id || s.customer_id;
      if (!stats[key]) stats[key] = { target: 0, planned: 0, completed: 0 };
      stats[key].target += s.visits_required;
    });

    // Planlanan ve Tamamlananları ekle (Tüm operatörler taranır)
    allVisits.forEach(v => {
      const key = v.branch_id || v.customer_id;
      if (!stats[key]) stats[key] = { target: 0, planned: 0, completed: 0 };
      if (v.status === 'completed') {
        stats[key].completed += 1;
      } else if (v.status !== 'cancelled') {
        stats[key].planned += 1;
      }
    });

    return stats;
  }, [monthlySchedules, allVisits]);

  // Planlanmayan birimleri hesapla
  const unplannedItems = useMemo(() => {
    // Mevcut ayda planlanmış şube ve müşteri ID'leri
    const plannedBranchIds = new Set(allVisits.filter(v => v.branch_id).map(v => v.branch_id));
    const plannedCustomerIdsNoBranch = new Set(allVisits.filter(v => !v.branch_id).map(v => v.customer_id));

    // Planlanmamış şubeler
    const unplannedBranches = branches.filter(b => !plannedBranchIds.has(b.id)).map(b => ({
      id: b.id,
      name: b.sube_adi,
      customerName: b.customer?.kisa_isim,
      type: 'branch' as const,
      original: b
    }));

    // Planlanmamış müşteriler (şubesi olmayanlar)
    const unplannedCustomers = customers.filter(c => {
      const hasBranches = branches.some(b => b.customer_id === c.id);
      return !hasBranches && !plannedCustomerIdsNoBranch.has(c.id);
    }).map(c => ({
      id: c.id,
      name: c.kisa_isim,
      type: 'customer' as const,
      original: c
    }));

    return [...unplannedBranches, ...unplannedCustomers]
      .filter(item => {
        const search = unplannedSearch.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(search);
        const matchesCustomer = 'customerName' in item && item.customerName?.toLowerCase().includes(search);
        return matchesName || matchesCustomer;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [customers, branches, allVisits, unplannedSearch]);

  // İşlemler
  const handleEventDrop = async (item, date) => {
    if (!isAdmin) return toast.error('Yetkiniz yok');
    const dateStr = format(date, 'yyyy-MM-dd');
    try {
      if (item.type === 'visit') {
        await supabaseAdmin.from('visits').update({ visit_date: dateStr }).eq('id', item.id);
        toast.success('Ziyaret taşındı');
        setVisits(prev => prev.map(v => v.id === item.id ? { ...v, visit_date: dateStr } : v));
        setAllVisits(prev => prev.map(v => v.id === item.id ? { ...v, visit_date: dateStr } : v));
      } else {
        if (!selectedOperator) return toast.error('Önce bir operatör seçin!');
        createVisitBatch([{
          customer_id: item.type === 'branch' ? item.customer_id : item.id,
          branch_id: item.type === 'branch' ? item.id : null,
          operator_id: selectedOperator,
          visit_date: dateStr,
          visit_type: selectedVisitType
        }]);
      }
    } catch (error) { toast.error('Hata: ' + error.message); }
  };

  const createVisitBatch = async (visitsPayload) => {
    try {
      const { data, error } = await supabaseAdmin.from('visits').insert(visitsPayload.map(v => ({ ...v, status: 'planned' }))).select(`*, customer:customer_id(kisa_isim), branch:branch_id(sube_adi), operator:operator_id(name)`);
      if (error) throw error;

      const newVisits = data || [];
      setAllVisits(prev => [...prev, ...newVisits]);

      if (selectedOperator) {
        const filteredNew = newVisits.filter(v => v.operator_id === selectedOperator);
        setVisits(prev => [...prev, ...filteredNew]);
      } else {
        setVisits(prev => [...prev, ...newVisits]);
      }

      toast.success(`${newVisits.length} ziyaret eklendi`);
    } catch (error) { toast.error('Kayıt hatası: ' + error.message); }
  };

  const handleBulkAdd = (selections, allItems) => {
    if (!selectedOperator) return toast.error('Lütfen operatör seçin!');
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

  const handleTransferSubmit = async ({ operatorId, customerId, branchId }: { operatorId: string | null, customerId: string | null, branchId: string | null }) => {
    setIsTransferring(true);
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      let query = supabase.from('visits').select('customer_id, branch_id, visit_date, visit_type, operator_id').gte('visit_date', start.toISOString()).lte('visit_date', end.toISOString());
      if (operatorId) query = query.eq('operator_id', operatorId);
      if (customerId) query = query.eq('customer_id', customerId);
      if (branchId) query = query.eq('branch_id', branchId);
      const { data: sourceVisits, error } = await query;
      if (error) throw error;
      if (!sourceVisits?.length) throw new Error('Ziyaret bulunamadı.');
      const targetMonth = addMonths(currentDate, 1);
      const newVisits: any[] = [];
      sourceVisits.forEach(visit => {
        const d = parseISO(visit.visit_date);
        const dayOfWeek = getDay(d);
        const weekNum = getWeekOfMonth(d);
        const targetStart = startOfMonth(targetMonth);
        const targetEnd = endOfMonth(targetMonth);
        const daysInTarget = eachDayOfInterval({ start: targetStart, end: targetEnd });
        const targetDays = daysInTarget.filter(day => getDay(day) === dayOfWeek);
        const targetDate = targetDays[weekNum - 1] || targetDays[targetDays.length - 1];
        if (targetDate) newVisits.push({ customer_id: visit.customer_id, branch_id: visit.branch_id, operator_id: visit.operator_id, visit_date: format(targetDate, 'yyyy-MM-dd'), visit_type: visit.visit_type, status: 'planned' });
      });
      if (newVisits.length > 0) {
        await supabaseAdmin.from('visits').insert(newVisits);
        toast.success(`${newVisits.length} ziyaret aktarıldı.`);
        setCurrentDate(targetMonth);
      }
    } catch (error: any) { toast.error('Hata: ' + error.message); } finally { setIsTransferring(false); }
  };

  const handleDeleteVisit = async (id) => {
    if (!confirm('Silinsin mi?')) return;
    await supabaseAdmin.from('visits').delete().eq('id', id);
    setVisits(prev => prev.filter(v => v.id !== id));
    setAllVisits(prev => prev.filter(v => v.id !== id));
    toast.success('Silindi');
  };

  if (!isAdmin && !loading) return <div className="p-10 text-center text-red-500 font-bold">Yetkisiz erişim.</div>;

  // --- YAZDIRMA GÖRÜNÜMÜ (HTML) ---
  if (isPrintMode) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startDay = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;
    const weeks = [];
    let currentWeek = Array(7).fill(null);
    for (let i = 0; i < startDay; i++) currentWeek[i] = null;

    daysInMonth.forEach(day => {
      const dayIndex = getDay(day) === 0 ? 6 : getDay(day) - 1;
      currentWeek[dayIndex] = day;
      if (dayIndex === 6) { weeks.push(currentWeek); currentWeek = Array(7).fill(null); }
    });
    if (currentWeek.some(d => d !== null)) weeks.push(currentWeek);

    return (
      <div className="bg-white min-h-screen text-black font-sans">
        {/* Navigasyon (Yazdırırken Gizlenir) */}
        <div className="fixed top-0 left-0 w-full bg-slate-900 text-white p-3 flex justify-between items-center no-print z-50 shadow-lg">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsPrintMode(false)} className="flex items-center gap-2 hover:bg-slate-700 px-3 py-1 rounded font-medium"><ArrowLeft size={18} /> Geri Dön</button>
            <span className="text-sm text-slate-300">Bu görünümde tarayıcıdan "Yazdır" (Ctrl+P) diyerek PDF alabilirsiniz.</span>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded font-bold shadow-sm transition-all">
            <Printer size={18} /> YAZDIR / PDF KAYDET
          </button>
        </div>

        {/* Yazdırılabilir Alan */}
        <div className="p-4 mt-12 print:mt-0 print:p-0">
          <div className="text-center mb-4 pb-2 border-b-2 border-black">
            <h1 className="text-2xl font-black uppercase tracking-wider mb-1">ZİYARET PLANI</h1>
            <div className="flex justify-between items-end">
              <div className="text-left">
                <p className="text-xs text-gray-500 font-bold">DÖNEM</p>
                <p className="text-lg font-bold uppercase">{format(currentDate, 'MMMM yyyy', { locale: tr })}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-bold">OPERATÖR</p>
                <p className="text-lg font-bold uppercase">{selectedOperator ? operators.find(o => o.id === selectedOperator)?.name : 'TÜMÜ'}</p>
              </div>
            </div>
          </div>

          <div className="w-full border-t border-l border-black flex flex-col">
            {/* Gün Başlıkları */}
            <div className="flex border-b border-black bg-gray-100">
              {['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'].map(d => (
                <div key={d} className="w-[14.28%] border-r border-black p-1 text-center text-[10px] font-bold">{d}</div>
              ))}
            </div>
            {/* Takvim Hücreleri */}
            {weeks.map((week, wIndex) => (
              <div key={wIndex} className="flex border-b border-black">
                {week.map((day, dIndex) => {
                  if (!day) return <div key={dIndex} className="w-[14.28%] border-r border-black bg-gray-50 min-h-[100px]"></div>;
                  const dayVisits = visits.filter(v => isSameDay(parseISO(v.visit_date), day));

                  return (
                    <div key={dIndex} className="w-[14.28%] border-r border-black p-1 min-h-[100px] relative">
                      <div className="text-right text-[10px] font-bold text-gray-400 mb-1">{format(day, 'd')}</div>
                      <div className="flex flex-col gap-1">
                        {dayVisits.map(visit => (
                          <div key={visit.id} className="text-[9px] font-bold leading-tight uppercase flex items-start gap-1">
                            <span className="text-gray-400 mt-0.5">☐</span>
                            <span className="flex-1">{visit.branch ? visit.branch.sube_adi : visit.customer?.kisa_isim}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-2 text-[8px] text-right text-gray-400">Oluşturulma: {format(new Date(), 'dd.MM.yyyy HH:mm')}</div>
        </div>

        <style>{`
          @media print {
            @page { size: landscape; margin: 5mm; }
            body { background: white; margin: 0; padding: 0; }
            .no-print { display: none !important; }
          }
        `}</style>
      </div>
    );
  }

  // --- EKRAN GÖRÜNÜMÜ ---
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-[calc(100vh-64px)] flex-col bg-gray-50 overflow-hidden">
        {/* Üst Bar */}
        <div className="bg-white border-b px-4 py-3 shadow-sm z-20 flex flex-col md:flex-row gap-4 justify-between items-center no-print">
          <div className="flex items-center gap-4 bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setCurrentDate(addMonths(currentDate, -1))} className="p-2 hover:bg-white rounded-lg shadow-sm"><ChevronLeft size={18} /></button>
            <div className="text-center min-w-[140px]">
              <span className="block font-bold text-gray-800 text-lg leading-tight">{format(currentDate, 'MMMM', { locale: tr })}</span>
              <span className="text-xs text-gray-500 font-medium">{format(currentDate, 'yyyy')}</span>
            </div>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-lg shadow-sm"><ChevronRight size={18} /></button>
          </div>

          <div className="flex flex-wrap gap-3 items-center justify-center">
            <div className="relative group">
              <User className="absolute left-3 top-2.5 text-gray-400 group-hover:text-blue-500 transition-colors" size={16} />
              <select className="pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm min-w-[200px]" value={selectedOperator || ''} onChange={(e) => setSelectedOperator(e.target.value || null)}>
                <option value="">Tüm Operatörler</option>
                {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <select className="pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={selectedVisitType} onChange={(e) => setSelectedVisitType(e.target.value)}>
                <option value="periyodik">Periyodik</option>
                <option value="ilk">İlk</option>
                <option value="ucretli">Ücretli</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setTransferModalOpen(true)} disabled={isTransferring} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md transition-all disabled:opacity-50">
              {isTransferring ? <span className="animate-spin">⏳</span> : <Copy size={16} />} <span className="hidden md:inline">Sonraki Ay</span>
            </button>
            <div className="bg-gray-100 p-1 rounded-xl flex">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><Grid size={18} /></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><List size={18} /></button>
            </div>
            <button onClick={() => setIsPrintMode(true)} disabled={!selectedOperator} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-md transition-all disabled:opacity-50">
              <Printer size={16} /> <span className="hidden md:inline">Yazdırma Görünümü</span>
            </button>
          </div>
        </div>

        <div className="bg-blue-50 px-4 py-2 flex justify-between items-center text-xs sm:text-sm border-b border-blue-100 text-blue-800 no-print">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> <b>{visits.length}</b> Toplam</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> <b>{visits.filter(v => v.status === 'completed').length}</b> Tamamlanan</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> <b>{visits.filter(v => v.status !== 'completed' && v.status !== 'cancelled').length}</b> Bekleyen</span>
          </div>
          <div className="hidden sm:block opacity-70 italic">Takvimdeki (+) butonuna tıklayarak hızlı ekleme yapabilirsiniz.</div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar" ref={calendarRef}>
          {viewMode === 'grid' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-7 border-b bg-gray-50">
                {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map((d, i) => (
                  <div key={i} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:block">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px border-b">
                {Array.from({ length: (getDay(startOfMonth(currentDate)) + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-gray-50 min-h-[150px]"></div>
                ))}
                {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((day) => (
                  <div key={day.toISOString()} className="bg-white min-h-[150px]">
                    <DayCell date={day} visits={visits} onEventDrop={handleEventDrop} onDeleteVisit={handleDeleteVisit} onQuickAdd={(d) => { setModalDate(d); setBulkAddModalOpen(true); }} visitStats={visitStats} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl mx-auto pb-20">
              {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((day) => {
                const dayVisits = visits.filter(v => isSameDay(parseISO(v.visit_date), day));
                if (dayVisits.length === 0 && !isToday(day)) return null;
                return (
                  <div key={day.toISOString()} className={`rounded-xl border overflow-hidden shadow-sm ${isToday(day) ? 'border-blue-300 ring-1 ring-blue-300' : 'border-gray-200 bg-white'}`}>
                    <div className="px-4 py-3 flex justify-between items-center bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">{format(day, 'd')}</span>
                        <span className="text-sm text-gray-500">{format(day, 'MMMM yyyy, EEEE', { locale: tr })}</span>
                      </div>
                      <button onClick={() => { setModalDate(day); setBulkAddModalOpen(true); }} className="text-blue-600 bg-blue-50 p-2 rounded-lg hover:bg-blue-100"><Plus size={20} /></button>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {dayVisits.map(visit => (
                        <div key={visit.id} className="p-4 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-gray-800 text-sm">{visit.customer?.kisa_isim}</div>
                            {visit.branch && <div className="text-xs text-gray-500">{visit.branch.sube_adi}</div>}
                          </div>
                          <button onClick={() => handleDeleteVisit(visit.id)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={18} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Planlanmayan Birimler Bölümü - Artık kaydırılabilir alanın içinde */}
          <div className="mt-8 bg-white rounded-2xl border border-dashed border-gray-300 overflow-hidden no-print">
            <div className="px-4 py-3 flex items-center justify-between bg-gray-50/50 border-b">
              <div className="flex items-center gap-4 flex-1">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 shrink-0">
                  <AlertCircle size={16} className="text-orange-500" />
                  Planlanmayan Birimler <span className="text-xs font-normal text-gray-400">({unplannedItems.length})</span>
                </h3>
                <div className="relative max-w-xs w-full no-print">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                  <input
                    type="text"
                    placeholder="Planlanmayanlarda ara..."
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-[10px] focus:ring-2 focus:ring-orange-500 outline-none bg-white shadow-sm"
                    value={unplannedSearch}
                    onChange={(e) => setUnplannedSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[9px] text-gray-500 font-bold hidden sm:flex items-center gap-2">
                  <span className="text-gray-400">H: Hedef</span>
                  <span className="text-blue-500">P: Planlanan</span>
                  <span className="text-green-600">T: Tamamlanan</span>
                </span>
                <span className="text-[10px] text-gray-400 font-medium hidden sm:block italic">Sürükleyerek planlayabilirsiniz.</span>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2 bg-white">
              {unplannedItems.length > 0 ? (
                unplannedItems.map(item => (
                  <DraggableUnplannedItem key={item.type === 'branch' ? `unp-br-${item.id}` : `unp-cu-${item.id}`} item={item} visitStats={visitStats} />
                ))
              ) : (
                <div className="col-span-full py-8 text-sm text-gray-400 flex items-center justify-center gap-2 italic">
                  <CheckCircle size={16} className="text-green-500" />
                  Tüm birimler planlandı!
                </div>
              )}
            </div>
          </div>
        </div>

        <BulkAddModal isOpen={bulkAddModalOpen} onClose={() => setBulkAddModalOpen(false)} date={modalDate || new Date()} customers={customers} branches={branches} selectedOperator={selectedOperator} onSave={handleBulkAdd} />
        <TransferModal isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)} onTransfer={handleTransferSubmit} currentDate={currentDate} customers={customers} branches={branches} operators={operators} />
      </div>
    </DndProvider>
  );
};

export default AdminCalendarPlanning;