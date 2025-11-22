import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { 
  Search, Plus, Edit2, Trash2, Save, X, Calendar, 
  AlertCircle, Download, Eye, EyeOff, CheckCircle 
} from 'lucide-react';
import * as XLSX from 'xlsx';

// --- Types ---
interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
  customer: {
    kisa_isim: string;
  };
}

interface Operator {
  id: string;
  name: string;
  email: string;
}

interface VisitSchedule {
  id: string;
  customer_id: string | null;
  branch_id: string | null;
  operator_id: string | null;
  month: number;
  visits_required: number;
  year: number | null;
  notes: string | null;
  customer?: {
    kisa_isim: string;
  } | null;
  branch?: {
    sube_adi: string;
    customer: {
      kisa_isim: string;
    };
  } | null;
  operator?: {
    name: string;
  } | null;
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const AdminMonthlyVisitSchedule = () => {
  // --- State ---
  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('');
  
  // Selection & Modal
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<VisitSchedule | null>(null);
  
  // UI Toggles
  // Varsayılan olarak planlananlar açık (undefined veya true), planlanmayanlar kapalı (false)
  const [showUnscheduled, setShowUnscheduled] = useState<{ [key: number]: boolean }>({});
  const [showScheduled, setShowScheduled] = useState<{ [key: number]: boolean }>({});

  // Form Data
  const [formData, setFormData] = useState({
    type: 'branch' as 'customer' | 'branch',
    customer_id: '',
    branch_id: '',
    selectedBranches: [] as string[],
    operator_id: '',
    selectedMonths: [] as number[],
    visits_required: 1,
    year: new Date().getFullYear(),
    notes: '',
    bulkMode: false
  });

  // --- Effects ---
  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  // --- Fetch Data ---
  const fetchData = async () => {
    try {
      setLoading(true);
      // Veritabanından verileri çek
      const [schedulesRes, customersRes, branchesRes, operatorsRes] = await Promise.all([
        supabase
          .from('monthly_visit_schedules')
          .select(`
            id, customer_id, branch_id, operator_id, month, visits_required, year, notes,
            customers!monthly_visit_schedules_customer_id_fkey(kisa_isim),
            branches!monthly_visit_schedules_branch_id_fkey(
              sube_adi,
              customers!branches_customer_id_fkey(kisa_isim)
            ),
            operators!monthly_visit_schedules_operator_id_fkey(name)
          `)
          .or(`year.eq.${selectedYear},year.is.null`)
          .order('month', { ascending: true }),
        supabase.from('customers').select('id, kisa_isim').order('kisa_isim'),
        supabase.from('branches').select(`
            id, sube_adi, customer_id,
            customers!branches_customer_id_fkey(kisa_isim)
          `).order('sube_adi'),
        supabase.from('operators').select('id, name, email').eq('status', 'Açık').order('name')
      ]);

      if (schedulesRes.error) throw schedulesRes.error;
      if (customersRes.error) throw customersRes.error;
      if (branchesRes.error) throw branchesRes.error;
      if (operatorsRes.error) throw operatorsRes.error;

      // Veri transformasyonu
      const transformedSchedules = (schedulesRes.data || []).map(schedule => ({
        id: schedule.id,
        customer_id: schedule.customer_id,
        branch_id: schedule.branch_id,
        operator_id: schedule.operator_id,
        month: schedule.month,
        visits_required: schedule.visits_required,
        year: schedule.year,
        notes: schedule.notes,
        customer: schedule.customers ? { kisa_isim: schedule.customers.kisa_isim } : null,
        branch: schedule.branches ? {
          sube_adi: schedule.branches.sube_adi,
          customer: schedule.branches.customers ? { kisa_isim: schedule.branches.customers.kisa_isim } : { kisa_isim: '' }
        } : null,
        operator: schedule.operators ? { name: schedule.operators.name } : null
      }));

      setSchedules(transformedSchedules);
      setCustomers(customersRes.data || []);
      
      const transformedBranches = (branchesRes.data || []).map(branch => ({
        id: branch.id,
        sube_adi: branch.sube_adi,
        customer_id: branch.customer_id,
        customer: branch.customers ? { kisa_isim: branch.customers.kisa_isim } : { kisa_isim: '' }
      }));
      
      setBranches(transformedBranches);
      setOperators(operatorsRes.data || []);
    } catch (err) {
      toast.error('Veriler yüklenirken hata: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // --- Excel Export Logic (Takvim Görünümü) ---
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      let hasData = false;

      // Her ay için ayrı bir sekme (Sheet) oluştur
      MONTH_NAMES.forEach((monthName, index) => {
        const monthNum = index + 1;
        const sheetData: any[] = [];
        
        // 1. Başlık Satırı: Müşteri, Şube, Operatör, Hedef, Notlar, 1...31 Günler
        const headerRow = ['Müşteri', 'Şube', 'Operatör', 'Ziyaret Hedefi', 'Notlar'];
        for (let d = 1; d <= 31; d++) {
          headerRow.push(d.toString());
        }
        sheetData.push(headerRow);

        // 2. Veri Satırları: Tüm şubeleri dön
        branches.forEach(branch => {
          // Arama filtresi
          const matchesSearch = branch.sube_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                branch.customer.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase());
          if (!matchesSearch) return;

          // Planı bul
          const schedule = schedules.find(s => 
            s.branch_id === branch.id && 
            s.month === monthNum &&
            (s.year === selectedYear || !s.year)
          );

          // Operatör filtresi
          let showRow = true;
          if (selectedOperatorFilter) {
            if (selectedOperatorFilter === 'unassigned') {
              if (schedule?.operator_id) showRow = false;
            } else {
              if (schedule?.operator_id !== selectedOperatorFilter) showRow = false;
            }
          }
          
          // Operatör seçiliyse ve plan yoksa satırı gösterme
          if (selectedOperatorFilter && !schedule) showRow = false;

          if (!showRow) return;

          hasData = true;

          // Satırı oluştur
          const row = [
            branch.customer.kisa_isim,
            branch.sube_adi,
            schedule?.operator?.name || (schedule ? 'Atanmamış' : '-'), 
            schedule ? schedule.visits_required : 0,
            schedule?.notes || ''
          ];

          // Günler için boş hücreler ekle
          for (let d = 1; d <= 31; d++) {
            row.push('');
          }

          sheetData.push(row);
        });

        // Eğer bu ay için veri varsa sayfayı kitaba ekle
        if (sheetData.length > 1) {
          const ws = XLSX.utils.aoa_to_sheet(sheetData);

          // Sütun genişliklerini ayarla
          const colWidths = [
            { wch: 20 }, // Müşteri
            { wch: 25 }, // Şube
            { wch: 20 }, // Operatör
            { wch: 12 }, // Hedef
            { wch: 20 }, // Notlar
          ];
          // Gün sütunları (31 gün)
          for (let d = 1; d <= 31; d++) colWidths.push({ wch: 3 });
          ws['!cols'] = colWidths;

          XLSX.utils.book_append_sheet(wb, ws, monthName);
        }
      });

      if (!hasData) {
        toast.warning('Dışa aktarılacak veri bulunamadı (Filtrelerinizi kontrol edin).');
        return;
      }
      
      const fileName = `Ziyaret_Takvimi_${selectedYear}_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Takvim formatında Excel oluşturuldu');

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Excel oluşturulurken hata oluştu. Lütfen xlsx paketinin yüklü olduğundan emin olun.');
    }
  };

  // --- Helper Functions ---
  const getAvailableBranches = () => {
    if (!formData.customer_id) return branches;
    const customerBranches = branches.filter(b => b.customer_id === formData.customer_id);
    if (formData.selectedMonths.length === 0) return customerBranches;

    const scheduledBranchIds = new Set(
      schedules
        .filter(s => 
          s.branch_id && 
          formData.selectedMonths.includes(s.month) && 
          (s.year === formData.year || !s.year)
        )
        .map(s => s.branch_id)
    );

    return customerBranches.map(branch => ({
      ...branch,
      hasSchedule: scheduledBranchIds.has(branch.id),
      scheduledMonths: schedules
        .filter(s => 
          s.branch_id === branch.id && 
          formData.selectedMonths.includes(s.month) && 
          (s.year === formData.year || !s.year)
        )
        .map(s => MONTH_NAMES[s.month - 1])
    }));
  };

  // --- CRUD Operations ---
  const handleAddNew = () => {
    setEditingSchedule(null);
    setFormData({
      type: 'branch',
      customer_id: '',
      branch_id: '',
      selectedBranches: [],
      operator_id: '',
      selectedMonths: [],
      visits_required: 1,
      year: selectedYear,
      notes: '',
      bulkMode: false
    });
    setShowAddModal(true);
  };

  const handleQuickAdd = (branch: Branch, month: number) => {
    setEditingSchedule(null);
    setFormData({
      type: 'branch',
      customer_id: branch.customer_id,
      branch_id: branch.id,
      selectedBranches: [],
      operator_id: '',
      selectedMonths: [month],
      visits_required: 1,
      year: selectedYear,
      notes: '',
      bulkMode: false
    });
    setShowAddModal(true);
  };

  const handleEdit = (schedule: VisitSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      type: schedule.branch_id ? 'branch' : 'customer',
      customer_id: schedule.customer_id || '',
      branch_id: schedule.branch_id || '',
      selectedBranches: [],
      operator_id: schedule.operator_id || '',
      selectedMonths: [schedule.month],
      visits_required: schedule.visits_required,
      year: schedule.year || selectedYear,
      notes: schedule.notes || '',
      bulkMode: false
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      // Validasyonlar
      if (formData.bulkMode && formData.selectedBranches.length === 0) { toast.error('Lütfen en az bir şube seçin'); return; }
      if (!formData.bulkMode && formData.type === 'branch' && !formData.branch_id) { toast.error('Lütfen bir şube seçin'); return; }
      if (!formData.bulkMode && formData.type === 'customer' && !formData.customer_id) { toast.error('Lütfen bir müşteri seçin'); return; }
      if (formData.selectedMonths.length === 0) { toast.error('Lütfen en az bir ay seçin'); return; }

      if (editingSchedule) {
        const { error } = await supabase
          .from('monthly_visit_schedules')
          .update({
            operator_id: formData.operator_id || null,
            visits_required: formData.visits_required,
            notes: formData.notes,
            year: formData.year
          })
          .eq('id', editingSchedule.id);
        if (error) throw error;
        toast.success('Plan güncellendi');
      } else {
        const records: any[] = [];
        if (formData.bulkMode && formData.selectedBranches.length > 0) {
          formData.selectedBranches.forEach(branchId => {
            formData.selectedMonths.forEach(month => {
              records.push({
                customer_id: null, branch_id: branchId, operator_id: formData.operator_id || null,
                month, visits_required: formData.visits_required, year: formData.year, notes: formData.notes
              });
            });
          });
        } else {
          formData.selectedMonths.forEach(month => {
            records.push({
              customer_id: formData.type === 'customer' ? formData.customer_id : null,
              branch_id: formData.type === 'branch' ? formData.branch_id : null,
              operator_id: formData.operator_id || null,
              month, visits_required: formData.visits_required, year: formData.year, notes: formData.notes
            });
          });
        }
        const { error } = await supabase.from('monthly_visit_schedules').insert(records);
        if (error) throw error;
        toast.success(`${records.length} plan oluşturuldu`);
      }
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      toast.error('Kayıt hatası: ' + (err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu planı silmek istediğinizden emin misiniz?')) return;
    try {
      const { error } = await supabase.from('monthly_visit_schedules').delete().eq('id', id);
      if (error) throw error;
      toast.success('Plan silindi');
      fetchData();
    } catch (err) {
      toast.error('Silme hatası: ' + (err as Error).message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedScheduleIds.length === 0) return;
    if (!confirm(`${selectedScheduleIds.length} planı silmek istediğinizden emin misiniz?`)) return;
    try {
      const { error } = await supabase.from('monthly_visit_schedules').delete().in('id', selectedScheduleIds);
      if (error) throw error;
      toast.success(`${selectedScheduleIds.length} plan silindi`);
      setSelectedScheduleIds([]);
      fetchData();
    } catch (err) {
      toast.error('Toplu silme hatası: ' + (err as Error).message);
    }
  };

  // --- UI Filters ---
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      const customerName = schedule.customer?.kisa_isim || '';
      const branchName = schedule.branch?.sube_adi || '';
      const searchLower = searchTerm.toLowerCase();
      
      const matchesSearch = customerName.toLowerCase().includes(searchLower) || 
                            branchName.toLowerCase().includes(searchLower);
      
      const matchesOperator = !selectedOperatorFilter || 
        schedule.operator_id === selectedOperatorFilter ||
        (!schedule.operator_id && selectedOperatorFilter === 'unassigned');
        
      return matchesSearch && matchesOperator;
    });
  }, [schedules, searchTerm, selectedOperatorFilter]);

  const schedulesByMonth = useMemo(() => {
    const grouped: { [key: number]: VisitSchedule[] } = {};
    for (let i = 1; i <= 12; i++) {
      grouped[i] = filteredSchedules.filter(s => s.month === i);
    }
    return grouped;
  }, [filteredSchedules]);

  // --- Unscheduled Logic ---
  const getUnscheduledBranchesForMonth = (month: number) => {
    const scheduledBranchIds = new Set(
      schedules
        .filter(s => s.month === month && (s.year === selectedYear || !s.year) && s.branch_id)
        .map(s => s.branch_id)
    );

    return branches.filter(b => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = b.sube_adi.toLowerCase().includes(searchLower) || 
                            b.customer.kisa_isim.toLowerCase().includes(searchLower);
      
      return !scheduledBranchIds.has(b.id) && matchesSearch;
    });
  };

  // --- Render ---
  if (loading) return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>;

  const availableBranches = getAvailableBranches();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Aylık Ziyaret Planları</h1>
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <Download size={18} />
              Excel (Takvim)
            </button>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={20} />
              Yeni Plan
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4 bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Müşteri veya şube ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={selectedOperatorFilter}
            onChange={(e) => setSelectedOperatorFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tüm Operatörler</option>
            <option value="unassigned">Atanmamış</option>
            {operators.map(op => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {selectedScheduleIds.length > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 animate-in fade-in">
            <span className="text-sm font-medium text-blue-900">
              {selectedScheduleIds.length} plan seçildi
            </span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              <Trash2 size={16} />
              Seçilenleri Sil
            </button>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {Object.entries(schedulesByMonth).map(([monthStr, monthSchedules]) => {
          const month = Number(monthStr);
          const unscheduledList = getUnscheduledBranchesForMonth(month);
          
          // Toggle durumları
          const isUnscheduledOpen = showUnscheduled[month];
          const isScheduledOpen = showScheduled[month] !== false; // Default true

          return (
            <div key={month} className="bg-white rounded-lg shadow border overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-full shadow-sm">
                    <Calendar size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-gray-800">{MONTH_NAMES[month - 1]}</h2>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600 font-medium">{monthSchedules.length} Planlı</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-orange-600 font-medium">{unscheduledList.length} Planlanmamış</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Planlananları Gizle/Göster Toggle */}
                  <button 
                    onClick={() => setShowScheduled(prev => ({ ...prev, [month]: !isScheduledOpen }))}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                      !isScheduledOpen 
                        ? 'bg-gray-200 text-gray-700' 
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                    title={isScheduledOpen ? "Planlanan listeyi gizle" : "Planlanan listeyi göster"}
                  >
                     {isScheduledOpen ? <EyeOff size={14} /> : <Eye size={14} />}
                     {isScheduledOpen ? 'Planlananları Gizle' : 'Planlananları Göster'}
                  </button>

                  {/* Planlanmayanları Gizle/Göster Toggle */}
                  <button 
                    onClick={() => setShowUnscheduled(prev => ({ ...prev, [month]: !prev[month] }))}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                      isUnscheduledOpen 
                        ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {isUnscheduledOpen ? <EyeOff size={14} /> : <Eye size={14} />}
                    {isUnscheduledOpen ? 'Planlanmayanları Gizle' : 'Planlanmayanları Göster'}
                  </button>
                </div>
              </div>

              {/* Scheduled List - isScheduledOpen true ise göster */}
              {isScheduledOpen && (
                <>
                  {monthSchedules.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50/50 border-b text-xs uppercase text-gray-500 font-semibold">
                          <tr>
                            <th className="px-4 py-3 text-center w-10">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-gray-300"
                                checked={monthSchedules.every(s => selectedScheduleIds.includes(s.id))}
                                onChange={() => {
                                  const monthIds = monthSchedules.map(s => s.id);
                                  const allSelected = monthIds.every(id => selectedScheduleIds.includes(id));
                                  setSelectedScheduleIds(prev => 
                                    allSelected 
                                      ? prev.filter(id => !monthIds.includes(id))
                                      : [...new Set([...prev, ...monthIds])]
                                  );
                                }}
                              />
                            </th>
                            <th className="px-4 py-3 text-left">Müşteri / Şube</th>
                            <th className="px-4 py-3 text-left">Operatör</th>
                            <th className="px-4 py-3 text-center">Ziyaret</th>
                            <th className="px-4 py-3 text-left">Notlar</th>
                            <th className="px-4 py-3 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {monthSchedules.map(schedule => (
                            <tr key={schedule.id} className={`hover:bg-gray-50 ${selectedScheduleIds.includes(schedule.id) ? 'bg-blue-50/50' : ''}`}>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedScheduleIds.includes(schedule.id)}
                                  onChange={() => setSelectedScheduleIds(prev => prev.includes(schedule.id) ? prev.filter(id => id !== schedule.id) : [...prev, schedule.id])}
                                  className="w-4 h-4 rounded border-gray-300"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{schedule.branch?.sube_adi || 'Tüm Şubeler'}</div>
                                <div className="text-xs text-gray-500">{schedule.customer?.kisa_isim || schedule.branch?.customer?.kisa_isim}</div>
                              </td>
                              <td className="px-4 py-3">
                                {schedule.operator ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {schedule.operator.name}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Atanmamış
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="font-bold text-gray-700">{schedule.visits_required}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                {schedule.notes || '-'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => handleEdit(schedule)} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                                    <Edit2 size={16} />
                                  </button>
                                  <button onClick={() => handleDelete(schedule.id)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 italic">
                      Bu ay için planlanmış ziyaret bulunmuyor.
                    </div>
                  )}
                </>
              )}

              {/* Unscheduled List Section */}
              {isUnscheduledOpen && (
                <div className="border-t-4 border-orange-100 bg-orange-50/30 animate-in slide-in-from-top-2">
                  <div className="px-4 py-2 bg-orange-50 text-xs font-bold text-orange-800 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={14} />
                    Henüz Planlanmamış Şubeler ({unscheduledList.length})
                  </div>
                  {unscheduledList.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full">
                        <tbody className="divide-y divide-orange-100">
                          {unscheduledList.map(branch => (
                            <tr key={branch.id} className="hover:bg-orange-50 transition-colors">
                              <td className="px-4 py-2 text-sm">
                                <div className="font-medium text-gray-800">{branch.sube_adi}</div>
                                <div className="text-xs text-gray-500">{branch.customer.kisa_isim}</div>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  onClick={() => handleQuickAdd(branch, month)}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-orange-300 text-orange-700 text-xs font-medium rounded-md hover:bg-orange-50 shadow-sm"
                                >
                                  <Plus size={14} />
                                  Planla
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-green-600 flex items-center justify-center gap-2">
                      <CheckCircle size={16} />
                      Harika! Bu ay için tüm aktif şubeler planlanmış.
                    </div>
                  )}
                </div>
              )}

              {!isScheduledOpen && !isUnscheduledOpen && (
                <div className="p-4 text-center text-gray-400 text-sm italic bg-gray-50">
                  Liste gizlendi. Görüntülemek için butonları kullanın.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-800">
                {editingSchedule ? 'Planı Düzenle' : 'Yeni Plan Oluştur'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Toplu Mod Checkbox */}
              {!editingSchedule && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.bulkMode}
                      onChange={(e) => setFormData({
                        ...formData,
                        bulkMode: e.target.checked,
                        type: 'branch',
                        branch_id: '',
                        selectedBranches: []
                      })}
                      className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-blue-900 block">Toplu Ekleme Modu</span>
                      <span className="text-sm text-blue-700">Birden fazla şube için aynı anda plan oluştur</span>
                    </div>
                  </label>
                </div>
              )}
              
              {/* Form Fields Grid */}
              <div className="grid gap-5">
                {/* Müşteri Seçimi */}
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
                   <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, branch_id: '', selectedBranches: [] })}
                    disabled={!!editingSchedule || (formData.type === 'branch' && !!formData.branch_id && !formData.bulkMode && !!editingSchedule)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 py-2"
                   >
                     <option value="">Müşteri Seçin</option>
                     {customers.map(c => (
                       <option key={c.id} value={c.id}>{c.kisa_isim}</option>
                     ))}
                   </select>
                </div>

                {/* Aylar */}
                {!editingSchedule && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Aylar</label>
                      <button 
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, selectedMonths: p.selectedMonths.length === 12 ? [] : [1,2,3,4,5,6,7,8,9,10,11,12] }))}
                        className="text-xs text-blue-600 font-medium hover:underline"
                      >
                        {formData.selectedMonths.length === 12 ? 'Temizle' : 'Tüm Yıl'}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {MONTH_NAMES.map((m, idx) => {
                         const mNum = idx + 1;
                         const isSelected = formData.selectedMonths.includes(mNum);
                         return (
                           <div 
                             key={idx}
                             onClick={() => setFormData(p => ({
                               ...p,
                               selectedMonths: isSelected ? p.selectedMonths.filter(x => x !== mNum) : [...p.selectedMonths, mNum].sort((a,b)=>a-b)
                             }))}
                             className={`text-center text-sm py-2 rounded cursor-pointer border transition-all ${
                               isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                             }`}
                           >
                             {m}
                           </div>
                         );
                      })}
                    </div>
                  </div>
                )}

                {/* Şubeler */}
                {formData.type === 'branch' && (
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {formData.bulkMode ? 'Şubeler (Çoklu)' : 'Şube'}
                      </label>
                      
                      {formData.bulkMode ? (
                        <div className="border rounded-lg p-2 max-h-48 overflow-y-auto bg-gray-50">
                           {availableBranches.length === 0 ? (
                             <div className="text-center py-4 text-gray-500 text-sm">Gösterilecek şube yok</div>
                           ) : (
                             availableBranches.map((b: any) => (
                               <label key={b.id} className={`flex items-center p-2 hover:bg-white rounded cursor-pointer ${b.hasSchedule ? 'opacity-50' : ''}`}>
                                 <input 
                                   type="checkbox"
                                   checked={formData.selectedBranches.includes(b.id)}
                                   onChange={() => setFormData(p => ({
                                     ...p,
                                     selectedBranches: p.selectedBranches.includes(b.id) 
                                       ? p.selectedBranches.filter(id => id !== b.id)
                                       : [...p.selectedBranches, b.id]
                                   }))}
                                   className="mr-2 rounded text-blue-600"
                                   disabled={b.hasSchedule}
                                 />
                                 <span className="text-sm">{b.sube_adi}</span>
                                 {b.hasSchedule && <span className="text-xs text-orange-500 ml-2">(Planlı)</span>}
                               </label>
                             ))
                           )}
                        </div>
                      ) : (
                        <select
                          value={formData.branch_id}
                          onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                          disabled={!!editingSchedule}
                          className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 py-2"
                        >
                          <option value="">Şube Seçin</option>
                          {availableBranches
                            .filter((b: any) => editingSchedule ? true : !b.hasSchedule)
                            .map((b: any) => (
                            <option key={b.id} value={b.id}>{b.sube_adi}</option>
                          ))}
                        </select>
                      )}
                   </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Operatör</label>
                    <select
                      value={formData.operator_id}
                      onChange={(e) => setFormData({ ...formData, operator_id: e.target.value })}
                      className="w-full border-gray-300 rounded-lg shadow-sm py-2"
                    >
                      <option value="">Seçiniz (Opsiyonel)</option>
                      {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ziyaret Sayısı</label>
                    <input
                      type="number" min="1" max="30"
                      value={formData.visits_required}
                      onChange={(e) => setFormData({ ...formData, visits_required: Number(e.target.value) })}
                      className="w-full border-gray-300 rounded-lg shadow-sm py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border-gray-300 rounded-lg shadow-sm py-2"
                    placeholder="Varsa notlarınızı girin..."
                  />
                </div>

              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
              >
                <Save size={20} />
                {editingSchedule ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonthlyVisitSchedule;