import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, getDay, isSameDay, parseISO } from 'date-fns'; // 
import { tr } from 'date-fns/locale';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { 
  Search, Filter, Plus, X, ChevronLeft, ChevronRight, Calendar, Trash2, User, 
  Download, FileImage, FileText, Menu, List, Grid 
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

// --- SÜRÜKLENEBİLİR ÖĞELER ---
const DraggableItem = ({ item, type }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: type === 'customer' ? ItemTypes.CUSTOMER : type === 'branch' ? ItemTypes.BRANCH : ItemTypes.OPERATOR,
    item: { ...item, type },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }), [item, type]);

  let label = item.name || item.kisa_isim || item.sube_adi;
  if (type === 'branch' && item.customer?.kisa_isim) label += ` (${item.customer.kisa_isim})`;

  const bgClass = type === 'operator' ? 'bg-purple-50 border-purple-200 text-purple-700' : 
                  type === 'branch' ? 'bg-green-50 border-green-200 text-green-700' : 
                  'bg-blue-50 border-blue-200 text-blue-700';

  return (
    <div ref={drag} className={`p-2 mb-2 rounded-lg border text-xs font-medium cursor-grab active:cursor-grabbing shadow-sm hover:shadow transition-all ${bgClass} ${isDragging ? 'opacity-50' : 'opacity-100'}`}>
      <div className="flex items-center gap-2">
        {type === 'operator' && <User size={14} />}
        <span className="truncate">{label}</span>
      </div>
    </div>
  );
};

const DraggableVisit = ({ visit, onDelete }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.VISIT,
    item: { ...visit, type: 'visit' },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }), [visit]);

  const bgClass = visit.status === 'completed' ? 'bg-green-100 border-green-300 text-green-800' :
                  visit.status === 'cancelled' ? 'bg-red-100 border-red-300 text-red-800' :
                  'bg-yellow-50 border-yellow-300 text-yellow-800';

  return (
    <div ref={drag} className={`group relative p-1.5 mb-1 rounded border text-[10px] sm:text-xs cursor-move shadow-sm ${bgClass} ${isDragging ? 'opacity-50' : ''}`}>
      <div className="flex justify-between items-start gap-1">
        <span className="font-semibold truncate flex-1">
          {visit.customer?.kisa_isim} {visit.branch ? `- ${visit.branch.sube_adi}` : ''}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(visit.id); }} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-200 rounded">
          <Trash2 size={12} />
        </button>
      </div>
      <div className="text-[9px] opacity-80 mt-0.5 flex items-center gap-1">
        <User size={8} /> {visit.operator?.name}
      </div>
    </div>
  );
};

// --- GÜN HÜCRESİ ---
const DayCell = ({ date, onEventDrop, visits, onDeleteVisit }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.CUSTOMER, ItemTypes.BRANCH, ItemTypes.VISIT, ItemTypes.OPERATOR],
    drop: (item) => onEventDrop(item, date),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }), [date, onEventDrop]);

  // HATA BURADAYDI: parseISO eklendiği için artık çalışacak
  const dayVisits = visits.filter(v => isSameDay(parseISO(v.visit_date), date));

  return (
    <div ref={drop} className={`min-h-[80px] sm:min-h-[120px] h-full p-1 transition-colors ${isOver ? 'bg-blue-50 ring-2 ring-blue-300 inset-0 z-10' : ''}`}>
      <div className="flex flex-col gap-1 h-full">
        {dayVisits.map(visit => (
          <DraggableVisit key={visit.id} visit={visit} onDelete={onDeleteVisit} />
        ))}
      </div>
    </div>
  );
};

// --- YENİ SIDEBAR (DRAWER) ---
const Sidebar = ({ isOpen, onClose, ...props }) => {
  return (
    <>
      {/* Mobil Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      
      <div className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white shadow-xl lg:shadow-none transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col border-r border-gray-200`}>
        <div className="p-4 border-b flex justify-between items-center lg:hidden">
          <h2 className="font-bold text-gray-800">Planlama Paneli</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          {/* Arama ve Filtreler */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Müşteri, şube veya operatör ara..." 
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={props.searchTerm}
                onChange={(e) => props.onSearchTermChange(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Aktif Operatör</label>
              <select 
                className="w-full p-2 border rounded-lg text-sm bg-purple-50 border-purple-200 text-purple-900 focus:ring-2 focus:ring-purple-500"
                value={props.selectedOperator || ''}
                onChange={(e) => props.onOperatorChange(e.target.value || null)}
              >
                <option value="">Seçiniz...</option>
                {props.operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Ziyaret Tipi</label>
              <select 
                className="w-full p-2 border rounded-lg text-sm bg-gray-50"
                value={props.selectedVisitType}
                onChange={(e) => props.onVisitTypeChange(e.target.value)}
              >
                <option value="periyodik">Periyodik</option>
                <option value="ilk">İlk</option>
                <option value="ucretli">Ücretli</option>
                <option value="kontrol">Kontrol</option>
              </select>
            </div>
          </div>

          {/* Sürüklenebilir Listeler */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><User size={14}/> Operatörler</h3>
            <div className="max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {props.filteredOperators.map(op => <DraggableItem key={op.id} item={op} type="operator" />)}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">Müşteriler & Şubeler</h3>
            <div className="max-h-60 overflow-y-auto pr-1 custom-scrollbar space-y-1">
              {props.filteredCustomers.map(c => <DraggableItem key={c.id} item={c} type="customer" />)}
              {props.filteredBranches.map(b => <DraggableItem key={b.id} item={b} type="branch" />)}
            </div>
          </div>

          {/* Aksiyonlar */}
          <div className="pt-4 border-t">
            <button 
              onClick={props.onTransfer}
              disabled={!props.selectedOperator || props.isTransferring}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {props.isTransferring ? <span className="animate-spin">⏳</span> : <Calendar size={16} />}
              Sonraki Aya Aktar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// --- ANA SAYFA ---
const AdminCalendarPlanning = () => {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Mobil için liste görünümü
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [operators, setOperators] = useState([]);
  const [visits, setVisits] = useState([]);
  const [monthlySchedules, setMonthlySchedules] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [selectedVisitType, setSelectedVisitType] = useState('periyodik');
  const [isTransferring, setIsTransferring] = useState(false);

  const calendarRef = useRef(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    checkAdmin();
    // Mobilde varsayılan liste görünümü olsun
    if (window.innerWidth < 768) setViewMode('list');
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, currentDate, selectedOperator]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email === 'admin@ilaclamatik.com') setIsAdmin(true);
    setLoading(false);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      // Paralel veri çekimi
      const [custData, branchData, opData, visitData, schedData] = await Promise.all([
        supabase.from('customers').select('id, kisa_isim').order('kisa_isim'),
        supabase.from('branches').select('id, customer_id, sube_adi, customers(kisa_isim)').order('sube_adi'),
        supabase.from('operators').select('id, name').eq('status', 'Açık').order('name'),
        supabase.from('visits')
          .select('*, customer:customer_id(kisa_isim), branch:branch_id(sube_adi), operator:operator_id(name)')
          .gte('visit_date', start.toISOString())
          .lte('visit_date', end.toISOString()),
        supabase.from('monthly_visit_schedules')
          .select('*, operator:operator_id(name)')
          .eq('month', currentDate.getMonth() + 1)
      ]);

      setCustomers(custData.data || []);
      setBranches(branchData.data?.map(b => ({ ...b, customer: b.customers })) || []);
      setOperators(opData.data || []);
      setVisits(visitData.data || []);
      setMonthlySchedules(schedData.data || []);

    } catch (error) {
      console.error(error);
      toast.error('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleEventDrop = async (item, date) => {
    if (!isAdmin) return toast.error('Yetkiniz yok');
    
    // Tarihi saat 12:00 olarak ayarla (timezone sorunu olmasın)
    const targetDate = new Date(date);
    targetDate.setHours(12, 0, 0, 0);
    const dateStr = targetDate.toISOString().split('T')[0];

    try {
      if (item.type === 'visit') {
        // Ziyareti taşı
        const { error } = await supabaseAdmin.from('visits').update({ visit_date: dateStr }).eq('id', item.id);
        if (error) throw error;
        toast.success('Ziyaret taşındı');
      } else if (['customer', 'branch'].includes(item.type)) {
        // Yeni ziyaret oluştur
        if (!selectedOperator) return toast.error('Önce bir operatör seçin!');
        
        const payload = {
          customer_id: item.type === 'branch' ? item.customer_id : item.id,
          branch_id: item.type === 'branch' ? item.id : null,
          operator_id: selectedOperator,
          visit_date: dateStr,
          visit_type: selectedVisitType,
          status: 'planned'
        };

        const { error } = await supabaseAdmin.from('visits').insert(payload);
        if (error) throw error;
        toast.success('Ziyaret planlandı');
      }
      fetchData(); // Verileri yenile
    } catch (error) {
      toast.error('İşlem başarısız: ' + error.message);
    }
  };

  const handleDeleteVisit = async (id) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
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

  // --- FILTERS ---
  const filteredOperators = useMemo(() => operators.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())), [operators, searchTerm]);
  const filteredCustomers = useMemo(() => customers.filter(c => c.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase())), [customers, searchTerm]);
  const filteredBranches = useMemo(() => branches.filter(b => b.sube_adi.toLowerCase().includes(searchTerm.toLowerCase())), [branches, searchTerm]);

  if (!isAdmin && !loading) return <div className="p-10 text-center text-red-500">Yetkiniz yok.</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
        
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          selectedOperator={selectedOperator}
          onOperatorChange={setSelectedOperator}
          selectedVisitType={selectedVisitType}
          onVisitTypeChange={setSelectedVisitType}
          operators={operators}
          filteredOperators={filteredOperators}
          filteredCustomers={filteredCustomers}
          filteredBranches={filteredBranches}
          onTransfer={() => { /* Transfer logic placeholder */ toast.info('Transfer işlemi başlatıldı...') }}
          isTransferring={isTransferring}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Header Toolbar */}
          <div className="bg-white border-b px-4 py-3 flex flex-wrap gap-4 items-center justify-between shadow-sm z-20">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={20} />
              </button>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button onClick={() => setCurrentDate(addMonths(currentDate, -1))} className="p-1.5 hover:bg-white rounded shadow-sm"><ChevronLeft size={16}/></button>
                <span className="px-3 text-sm font-bold min-w-[120px] text-center">{format(currentDate, 'MMMM yyyy', { locale: tr })}</span>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 hover:bg-white rounded shadow-sm"><ChevronRight size={16}/></button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex bg-gray-100 rounded-lg p-1">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><Grid size={16}/></button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}><List size={16}/></button>
              </div>
              <button onClick={() => handleExport('pdf')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="PDF İndir"><FileText size={20}/></button>
              <button onClick={() => handleExport('png')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Resim İndir"><FileImage size={20}/></button>
            </div>
          </div>

          {/* Calendar Area */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4" ref={calendarRef}>
            
            {/* GRID GÖRÜNÜMÜ (Masaüstü Odaklı) */}
            {viewMode === 'grid' && (
              <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-7 border-b bg-gray-50">
                  {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                    <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px border-b">
                  {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((day, i) => {
                    return (
                      <div key={day.toISOString()} className={`bg-white min-h-[100px] sm:min-h-[140px] relative ${isToday(day) ? 'bg-blue-50/30' : ''}`}>
                        <div className={`absolute top-1 left-1 text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                          {format(day, 'd')}
                        </div>
                        <div className="pt-8 px-1 h-full">
                          <DayCell 
                            date={day} 
                            visits={visits} 
                            onEventDrop={handleEventDrop} 
                            onDeleteVisit={handleDeleteVisit} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LİSTE GÖRÜNÜMÜ (Mobil Odaklı) */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                {eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map((day) => {
                  const dayVisits = visits.filter(v => isSameDay(parseISO(v.visit_date), day));
                  if (dayVisits.length === 0) return null; // Boş günleri gizle

                  return (
                    <div key={day.toISOString()} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <div className={`px-4 py-2 border-b flex justify-between items-center ${isToday(day) ? 'bg-blue-50' : 'bg-gray-50'}`}>
                        <span className={`font-bold ${isToday(day) ? 'text-blue-700' : 'text-gray-700'}`}>
                          {format(day, 'd MMMM EEEE', { locale: tr })}
                        </span>
                        <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border">{dayVisits.length} Ziyaret</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {dayVisits.map(visit => (
                          <div key={visit.id} className="p-3 flex justify-between items-center group">
                            <div>
                              <div className="font-medium text-gray-900 text-sm">
                                {visit.customer?.kisa_isim} {visit.branch && <span className="text-gray-500 font-normal">- {visit.branch.sube_adi}</span>}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                <span className="flex items-center gap-1"><User size={10}/> {visit.operator?.name}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                  visit.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                  visit.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>{visit.status === 'completed' ? 'Tamamlandı' : 'Planlandı'}</span>
                              </div>
                            </div>
                            {isAdmin && (
                              <button onClick={() => handleDeleteVisit(visit.id)} className="p-2 text-gray-400 hover:text-red-600">
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {visits.length === 0 && <div className="text-center py-10 text-gray-500">Bu ay için planlanmış ziyaret bulunmuyor.</div>}
              </div>
            )}

          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default AdminCalendarPlanning;