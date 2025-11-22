import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Save, X, Calendar, AlertCircle } from 'lucide-react';

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
  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<VisitSchedule | null>(null);

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

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Debug için
      console.log('🔍 Fetching data for year:', selectedYear);

      const [schedulesRes, customersRes, branchesRes, operatorsRes] = await Promise.all([
        supabase
          .from('monthly_visit_schedules')
          .select(`
            id,
            customer_id,
            branch_id,
            operator_id,
            month,
            visits_required,
            year,
            notes,
            customers!monthly_visit_schedules_customer_id_fkey(kisa_isim),
            branches!monthly_visit_schedules_branch_id_fkey(
              sube_adi,
              customers!branches_customer_id_fkey(kisa_isim)
            ),
            operators!monthly_visit_schedules_operator_id_fkey(name)
          `)
          .or(`year.eq.${selectedYear},year.is.null`)
          .order('month', { ascending: true }),
        supabase
          .from('customers')
          .select('id, kisa_isim')
          .order('kisa_isim'),
        supabase
          .from('branches')
          .select(`
            id,
            sube_adi,
            customer_id,
            customers!branches_customer_id_fkey(kisa_isim)
          `)
          .order('sube_adi'),
        supabase
          .from('operators')
          .select('id, name, email')
          .eq('status', 'Açık')
          .order('name')
      ]);

      if (schedulesRes.error) {
        console.error('❌ Schedules error:', schedulesRes.error);
        throw schedulesRes.error;
      }
      if (customersRes.error) {
        console.error('❌ Customers error:', customersRes.error);
        throw customersRes.error;
      }
      if (branchesRes.error) {
        console.error('❌ Branches error:', branchesRes.error);
        throw branchesRes.error;
      }
      if (operatorsRes.error) {
        console.error('❌ Operators error:', operatorsRes.error);
        throw operatorsRes.error;
      }

      // Debug: Raw data
      console.log('📊 Raw schedules data:', schedulesRes.data);
      console.log('📊 Total schedules found:', schedulesRes.data?.length);

      // Transform the data to match expected structure
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
          customer: schedule.branches.customers ? {
            kisa_isim: schedule.branches.customers.kisa_isim
          } : { kisa_isim: '' }
        } : null,
        operator: schedule.operators ? { name: schedule.operators.name } : null
      }));

      console.log('✅ Transformed schedules:', transformedSchedules);
      console.log('✅ Schedules by month:', transformedSchedules.reduce((acc, s) => {
        acc[s.month] = (acc[s.month] || 0) + 1;
        return acc;
      }, {}));

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
      if (formData.bulkMode && formData.selectedBranches.length === 0) {
        toast.error('Lütfen en az bir şube seçin');
        return;
      }
      if (!formData.bulkMode && formData.type === 'branch' && !formData.branch_id) {
        toast.error('Lütfen bir şube seçin');
        return;
      }
      if (!formData.bulkMode && formData.type === 'customer' && !formData.customer_id) {
        toast.error('Lütfen bir müşteri seçin');
        return;
      }
      if (formData.selectedMonths.length === 0) {
        toast.error('Lütfen en az bir ay seçin');
        return;
      }

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
                customer_id: null,
                branch_id: branchId,
                operator_id: formData.operator_id || null,
                month,
                visits_required: formData.visits_required,
                year: formData.year,
                notes: formData.notes
              });
            });
          });
        } else {
          formData.selectedMonths.forEach(month => {
            records.push({
              customer_id: formData.type === 'customer' ? formData.customer_id : null,
              branch_id: formData.type === 'branch' ? formData.branch_id : null,
              operator_id: formData.operator_id || null,
              month,
              visits_required: formData.visits_required,
              year: formData.year,
              notes: formData.notes
            });
          });
        }

        const { error } = await supabase
          .from('monthly_visit_schedules')
          .insert(records);

        if (error) throw error;
        toast.success(`${records.length} aylık plan oluşturuldu`);
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
      const { error } = await supabase
        .from('monthly_visit_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Plan silindi');
      fetchData();
    } catch (err) {
      toast.error('Silme hatası: ' + (err as Error).message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedScheduleIds.length === 0) {
      toast.error('Lütfen en az bir plan seçin');
      return;
    }

    if (!confirm(`${selectedScheduleIds.length} planı silmek istediğinizden emin misiniz?`)) return;

    try {
      const { error } = await supabase
        .from('monthly_visit_schedules')
        .delete()
        .in('id', selectedScheduleIds);

      if (error) throw error;
      toast.success(`${selectedScheduleIds.length} plan silindi`);
      setSelectedScheduleIds([]);
      fetchData();
    } catch (err) {
      toast.error('Toplu silme hatası: ' + (err as Error).message);
    }
  };

  const toggleScheduleSelection = (id: string) => {
    setSelectedScheduleIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleAllSchedulesInMonth = (monthSchedules: VisitSchedule[]) => {
    const monthIds = monthSchedules.map(s => s.id);
    const allSelected = monthIds.every(id => selectedScheduleIds.includes(id));

    if (allSelected) {
      setSelectedScheduleIds(prev => prev.filter(id => !monthIds.includes(id)));
    } else {
      setSelectedScheduleIds(prev => [...new Set([...prev, ...monthIds])]);
    }
  };

  const toggleMonth = (month: number) => {
    setFormData(prev => ({
      ...prev,
      selectedMonths: prev.selectedMonths.includes(month)
        ? prev.selectedMonths.filter(m => m !== month)
        : [...prev.selectedMonths, month].sort((a, b) => a - b)
    }));
  };

  const toggleBranch = (branchId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedBranches: prev.selectedBranches.includes(branchId)
        ? prev.selectedBranches.filter(b => b !== branchId)
        : [...prev.selectedBranches, branchId]
    }));
  };

  const selectAllMonths = () => {
    setFormData(prev => ({
      ...prev,
      selectedMonths: prev.selectedMonths.length === 12 ? [] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    }));
  };

  const selectAllBranches = () => {
    const availableBranches = getAvailableBranches();
    setFormData(prev => ({
      ...prev,
      selectedBranches: prev.selectedBranches.length === availableBranches.length
        ? []
        : availableBranches.map(b => b.id)
    }));
  };

  // DÜZELTME: Şube listesini daha akıllı filtreleme
  const getAvailableBranches = () => {
    if (!formData.customer_id) return branches;

    const customerBranches = branches.filter(b => b.customer_id === formData.customer_id);

    // Eğer hiç ay seçilmemişse tüm şubeleri göster
    if (formData.selectedMonths.length === 0) {
      return customerBranches;
    }

    // Seçili aylarda zaten planı olan şubeleri bul
    const scheduledBranchIds = new Set(
      schedules
        .filter(s =>
          s.branch_id &&
          formData.selectedMonths.includes(s.month) &&
          (s.year === formData.year || !s.year)
        )
        .map(s => s.branch_id)
    );

    // Her şubeyi kontrol et ve durumunu ekle
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

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>;
  }

  const availableBranches = getAvailableBranches();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Aylık Ziyaret Planları</h1>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Müşteri veya şube ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>

          <select
            value={selectedOperatorFilter}
            onChange={(e) => setSelectedOperatorFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
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
            className="px-4 py-2 border rounded-lg"
          >
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Yeni Plan
          </button>
        </div>

        {selectedScheduleIds.length > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
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

      <div className="space-y-6">
        {Object.entries(schedulesByMonth).map(([month, monthSchedules]) => (
          <div key={month} className="bg-white rounded-lg shadow">
            <div className="bg-blue-50 px-4 py-3 border-b flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              <h2 className="font-semibold text-lg">{MONTH_NAMES[Number(month) - 1]}</h2>
              <span className="ml-auto text-sm text-gray-600">
                {monthSchedules.length} plan
              </span>
              {monthSchedules.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={monthSchedules.every(s => selectedScheduleIds.includes(s.id))}
                    onChange={() => toggleAllSchedulesInMonth(monthSchedules)}
                    className="w-4 h-4"
                  />
                  <span className="text-xs text-gray-700">Tümünü Seç</span>
                </label>
              )}
            </div>

            {monthSchedules.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-12">
                        <input
                          type="checkbox"
                          checked={monthSchedules.every(s => selectedScheduleIds.includes(s.id))}
                          onChange={() => toggleAllSchedulesInMonth(monthSchedules)}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Müşteri</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Şube</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Operatör</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Ziyaret Sayısı</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Notlar</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {monthSchedules.map(schedule => (
                      <tr key={schedule.id} className={`hover:bg-gray-50 ${selectedScheduleIds.includes(schedule.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedScheduleIds.includes(schedule.id)}
                            onChange={() => toggleScheduleSelection(schedule.id)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {schedule.customer?.kisa_isim || schedule.branch?.customer?.kisa_isim || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {schedule.branch?.sube_adi || 'Tüm Şubeler'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                            {schedule.operator?.name || 'Atanmamış'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-semibold">
                            {schedule.visits_required}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {schedule.notes || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <button
                            onClick={() => handleEdit(schedule)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                            title="Düzenle"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(schedule.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                Bu ay için plan bulunmuyor
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {editingSchedule ? 'Planı Düzenle' : 'Yeni Plan Oluştur'}
              </h2>
              <button onClick={() => setShowAddModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!editingSchedule && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="flex items-center gap-2 cursor-pointer">
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
                      className="w-4 h-4"
                    />
                    <span className="font-medium text-blue-900">
                      Toplu Ekleme Modu (Birden fazla şube için aynı planı oluştur)
                    </span>
                  </label>
                </div>
              )}

              {!editingSchedule && !formData.bulkMode && (
                <div>
                  <label className="block text-sm font-medium mb-2">Plan Türü</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="type"
                        value="customer"
                        checked={formData.type === 'customer'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'customer', branch_id: '' })}
                        className="mr-2"
                      />
                      Müşteri Bazlı
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="type"
                        value="branch"
                        checked={formData.type === 'branch'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'branch' })}
                        className="mr-2"
                      />
                      Şube Bazlı
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Müşteri</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, branch_id: '', selectedBranches: [] })}
                  disabled={editingSchedule !== null}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Müşteri Seçin</option>
                  {customers.filter(c => {
                    if (formData.type === 'customer' && formData.selectedMonths.length > 0) {
                      const hasScheduleInSelectedMonths = schedules.some(s =>
                        s.customer_id === c.id &&
                        !s.branch_id &&
                        formData.selectedMonths.includes(s.month) &&
                        (s.year === formData.year || !s.year)
                      );
                      return !hasScheduleInSelectedMonths;
                    }
                    return true;
                  }).map(c => (
                    <option key={c.id} value={c.id}>{c.kisa_isim}</option>
                  ))}
                </select>
              </div>

              {/* Ay Seçimi - ÖNCELİK: Önce ay seçilmeli */}
              {!editingSchedule && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertCircle size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Önce Ay Seçin</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Şube listesi, seçtiğiniz aylarda planı olmayan şubeleri gösterecektir
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Aylar (Çoklu Seçim)</label>
                    <button
                      type="button"
                      onClick={selectAllMonths}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {formData.selectedMonths.length === 12 ? 'Tümünü Kaldır' : 'Tüm Yıl Seç'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {MONTH_NAMES.map((name, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center justify-center p-2 border rounded cursor-pointer transition-colors ${
                          formData.selectedMonths.includes(idx + 1)
                            ? 'bg-blue-100 border-blue-500'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedMonths.includes(idx + 1)}
                          onChange={() => toggleMonth(idx + 1)}
                          className="mr-2"
                        />
                        <span className="text-sm">{name}</span>
                      </label>
                    ))}
                  </div>
                  {formData.selectedMonths.length > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      {formData.selectedMonths.length} ay seçildi
                    </p>
                  )}
                </div>
              )}

              {formData.bulkMode && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Şubeler (Çoklu Seçim)</label>
                    {availableBranches.length > 0 && (
                      <button
                        type="button"
                        onClick={selectAllBranches}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {formData.selectedBranches.length === availableBranches.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                      </button>
                    )}
                  </div>
                  <div className="border rounded-lg p-3 max-h-64 overflow-y-auto bg-gray-50">
                    {availableBranches.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {!formData.customer_id 
                          ? 'Lütfen önce bir müşteri seçin'
                          : formData.selectedMonths.length === 0
                          ? 'Lütfen önce ay seçin'
                          : 'Bu müşteriye ait ve seçili aylarda planı olmayan şube bulunamadı'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {availableBranches.map((b: any) => (
                          <label
                            key={b.id}
                            className={`flex items-start p-2 rounded cursor-pointer transition-colors ${
                              formData.selectedBranches.includes(b.id)
                                ? 'bg-blue-100 border border-blue-300'
                                : b.hasSchedule
                                ? 'bg-orange-50 border border-orange-200 opacity-75'
                                : 'bg-white hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.selectedBranches.includes(b.id)}
                              onChange={() => toggleBranch(b.id)}
                              className="mr-3 mt-1"
                              disabled={b.hasSchedule}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{b.sube_adi}</span>
                                <span className="text-xs text-gray-500">({b.customer.kisa_isim})</span>
                              </div>
                              {b.hasSchedule && b.scheduledMonths && b.scheduledMonths.length > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                  <AlertCircle size={12} className="text-orange-600" />
                                  <span className="text-xs text-orange-700">
                                    Zaten planlanmış: {b.scheduledMonths.join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.selectedBranches.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      {formData.selectedBranches.length} şube seçildi
                    </p>
                  )}
                </div>
              )}

              {formData.type === 'branch' && !formData.bulkMode && (
                <div>
                  <label className="block text-sm font-medium mb-2">Şube</label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    disabled={editingSchedule !== null}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Şube Seçin</option>
                    {availableBranches
                      .filter((b: any) => !b.hasSchedule)
                      .map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.sube_adi} ({b.customer.kisa_isim})
                        </option>
                      ))}
                  </select>
                  {formData.customer_id && formData.selectedMonths.length > 0 && 
                   availableBranches.filter((b: any) => !b.hasSchedule).length === 0 && (
                    <div className="mt-2 flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertCircle size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-orange-700">
                        Bu müşterinin tüm şubelerinin seçili aylarda zaten planı var
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Sorumlu Operatör</label>
                <select
                  value={formData.operator_id}
                  onChange={(e) => setFormData({ ...formData, operator_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Operatör Seçin (Opsiyonel)</option>
                  {operators.map(op => (
                    <option key={op.id} value={op.id}>
                      {op.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Aylık Ziyaret Sayısı</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.visits_required}
                  onChange={(e) => setFormData({ ...formData, visits_required: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Yıl</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {[2024, 2025, 2026, 2027].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notlar</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Opsiyonel notlar..."
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save size={20} />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonthlyVisitSchedule;