import React, { useState, useEffect, useMemo } from 'react';
// 'supabase' ve 'toast' importlarınızın doğru yapılandırıldığını varsayıyoruz.
// Örnek olarak, bunları import ediyorum:
// import { supabase } from '../lib/supabase';
// import { toast } from 'sonner';

// --- Mock Supabase & Toast (Gerçek kodunuzda bunları kaldırın) ---
const supabase = {
  from: (tableName) => {
    // Mock data
    const mockCustomers = [
      { id: 'cust_1', kisa_isim: 'Büyük Market A.Ş.' },
      { id: 'cust_2', kisa_isim: 'Restoran Zinciri' },
      { id: 'cust_3', kisa_isim: 'Otel Grubu' },
    ];
    const mockBranches = [
      { id: 'br_1', sube_adi: 'Merkez Şube', customer_id: 'cust_1', customer: { kisa_isim: 'Büyük Market A.Ş.' } },
      { id: 'br_2', sube_adi: 'Kadıköy Şube', customer_id: 'cust_1', customer: { kisa_isim: 'Büyük Market A.Ş.' } },
      { id: 'br_3', sube_adi: 'Taksim Restoran', customer_id: 'cust_2', customer: { kisa_isim: 'Restoran Zinciri' } },
    ];
    const mockSchedules = [
      { id: 'sch_1', customer_id: null, branch_id: 'br_1', month: 1, visits_required: 2, year: new Date().getFullYear(), notes: 'Açılış denetimi', branch: { sube_adi: 'Merkez Şube', customer: { kisa_isim: 'Büyük Market A.Ş.' } } },
      { id: 'sch_2', customer_id: null, branch_id: 'br_3', month: 1, visits_required: 1, year: new Date().getFullYear(), notes: null, branch: { sube_adi: 'Taksim Restoran', customer: { kisa_isim: 'Restoran Zinciri' } } },
    ];
    
    // Return specific data based on table name
    if (tableName === 'customers') {
      return {
        select: () => ({
          order: () => Promise.resolve({ data: mockCustomers, error: null })
        })
      };
    }
    if (tableName === 'branches') {
      return {
        select: () => ({
          order: () => Promise.resolve({ data: mockBranches, error: null })
        })
      };
    }
    if (tableName === 'monthly_visit_schedules') {
      return {
        select: () => ({
          or: () => ({
            order: () => Promise.resolve({ data: mockSchedules, error: null })
          }),
          update: () => Promise.resolve({ error: null }),
          insert: () => Promise.resolve({ error: null }),
          delete: () => Promise.resolve({ error: null }),
          eq: () => Promise.resolve({ error: null }),
        })
      };
    }
    // Fallback
    return {
      select: () => ({ or: () => ({ order: () => Promise.resolve({ data: [], error: null }) }), order: () => Promise.resolve({ data: [], error: null }) }),
      update: () => Promise.resolve({ error: null }), insert: () => Promise.resolve({ error: null }), delete: () => Promise.resolve({ error: null }), eq: () => Promise.resolve({ error: null }),
    };
  }
};
const toast = {
  success: (message) => console.log(`SUCCESS: ${message}`),
  error: (message) => console.error(`ERROR: ${message}`),
};
// --- Mock Supabase & Toast Sonu ---

import { Search, Plus, Edit2, Trash2, Save, X } from 'lucide-react';

// Arayüz (Interface) tanımlamaları
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

interface VisitSchedule {
  id: string;
  customer_id: string | null;
  branch_id: string | null;
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
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];
const ALL_MONTHS = MONTH_NAMES.map((name, index) => ({ id: index + 1, name }));

const AdminMonthlyVisitSchedule = () => {
  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Modal durumları
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);

  // Form verileri
  const [editingSchedule, setEditingSchedule] = useState<VisitSchedule | null>(null);
  
  // Tekil düzenleme formu için
  const [editFormData, setEditFormData] = useState({
    type: 'customer' as 'customer' | 'branch',
    customer_id: '',
    branch_id: '',
    month: 1,
    visits_required: 1,
    year: new Date().getFullYear(),
    notes: ''
  });

  // Toplu ekleme formu için
  const [bulkFormData, setBulkFormData] = useState({
    selectedCustomer: '',
    selectedBranches: [] as string[],
    selectedMonths: [] as number[],
    visits_required: 1,
    year: new Date().getFullYear(),
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [schedulesRes, customersRes, branchesRes] = await Promise.all([
        supabase
          .from('monthly_visit_schedules')
          .select(`
            *,
            customer:customer_id(kisa_isim),
            branch:branch_id(
              sube_adi,
              customer:customer_id(kisa_isim)
            )
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
            customer:customer_id(kisa_isim)
          `)
          .order('sube_adi')
      ]);

      if (schedulesRes.error) throw schedulesRes.error;
      if (customersRes.error) throw customersRes.error;
      if (branchesRes.error) throw branchesRes.error;

      setSchedules(schedulesRes.data || []);
      setCustomers(customersRes.data || []);
      setBranches(branchesRes.data || []);
    } catch (err) {
      toast.error('Veriler yüklenirken hata: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // --- TEKİL DÜZENLEME İŞLEVLERİ ---

  const handleEditClick = (schedule: VisitSchedule) => {
    setEditingSchedule(schedule);
    setEditFormData({
      type: schedule.customer_id ? 'customer' : 'branch',
      customer_id: schedule.customer_id || '',
      branch_id: schedule.branch_id || '',
      month: schedule.month,
      visits_required: schedule.visits_required,
      year: schedule.year || new Date().getFullYear(),
      notes: schedule.notes || ''
    });
    setShowEditModal(true);
  };

  const resetEditForm = () => {
    setEditingSchedule(null);
    setEditFormData({
      type: 'customer',
      customer_id: '',
      branch_id: '',
      month: 1,
      visits_required: 1,
      year: new Date().getFullYear(),
      notes: ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;

    try {
      const payload = {
        customer_id: editFormData.type === 'customer' ? editFormData.customer_id : null,
        branch_id: editFormData.type === 'branch' ? editFormData.branch_id : null,
        month: editFormData.month,
        visits_required: editFormData.visits_required,
        year: editFormData.year,
        notes: editFormData.notes || null
      };

      const { error } = await supabase
        .from('monthly_visit_schedules')
        .update(payload)
        .eq('id', editingSchedule.id);

      if (error) throw error;
      toast.success('Plan güncellendi');
      
      setShowEditModal(false);
      resetEditForm();
      fetchData();

    } catch (err: any) {
      toast.error('Güncelleme başarısız: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    // Gerçek uygulamada confirm() yerine özel bir modal kullanın
    if (!window.confirm('Bu planı silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('monthly_visit_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Plan silindi');
      fetchData();
    } catch (err: any) {
      toast.error('Silme işlemi başarısız: ' + err.message);
    }
  };


  // --- TOPLU EKLEME İŞLEVLERİ ---

  const handleBulkAddClick = () => {
    resetBulkForm();
    setShowBulkAddModal(true);
  };

  const resetBulkForm = () => {
    setBulkFormData({
      selectedCustomer: '',
      selectedBranches: [],
      selectedMonths: [],
      visits_required: 1,
      year: new Date().getFullYear(),
      notes: ''
    });
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { selectedBranches, selectedMonths, visits_required, year, notes } = bulkFormData;

    if (selectedBranches.length === 0 || selectedMonths.length === 0) {
      toast.error('Lütfen en az bir şube ve bir ay seçin.');
      return;
    }

    try {
      const payloads = selectedBranches.flatMap(branchId =>
        selectedMonths.map(month => ({
          customer_id: null, // Sadece şube bazlı ekliyoruz
          branch_id: branchId,
          month: month,
          visits_required: visits_required,
          year: year,
          notes: notes || null
        }))
      );

      const { error } = await supabase
        .from('monthly_visit_schedules')
        .insert(payloads);

      if (error) throw error;
      toast.success(`${payloads.length} adet yeni plan eklendi`);

      setShowBulkAddModal(false);
      resetBulkForm();
      fetchData();

    } catch (err: any) {
      toast.error('Toplu ekleme başarısız: ' + err.message);
    }
  };

  // Toplu ekleme formu için filtrelenmiş şubeler
  const filteredBranchesForBulkAdd = useMemo(() => {
    if (!bulkFormData.selectedCustomer) return [];
    return branches.filter(b => b.customer_id === bulkFormData.selectedCustomer);
  }, [branches, bulkFormData.selectedCustomer]);


  // Ana tablo için filtrelenmiş veriler
  const filteredSchedules = schedules.filter(schedule => {
    const searchLower = searchTerm.toLowerCase();
    if (schedule.customer) {
      return schedule.customer.kisa_isim.toLowerCase().includes(searchLower);
    }
    if (schedule.branch) {
      return (
        schedule.branch.sube_adi.toLowerCase().includes(searchLower) ||
        schedule.branch.customer.kisa_isim.toLowerCase().includes(searchLower)
      );
    }
    return false;
  });

  if (loading) return <div className="p-4">Yükleniyor...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold">Aylık Ziyaret Planları</h1>
        <button
          onClick={handleBulkAddClick}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Yeni Toplu Plan Ekle
        </button>
      </div>

      {/* Filtreleme Çubuğu */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4 md:space-y-0 md:flex md:gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Müşteri veya Şube Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>
        <div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full md:w-auto px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ana Tablo */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri/Şube</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ay</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ziyaret Sayısı</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Yıl</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSchedules.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Plan bulunamadı
                </td>
              </tr>
            ) : (
              filteredSchedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {schedule.customer
                        ? schedule.customer.kisa_isim
                        : schedule.branch?.customer.kisa_isim
                      }
                    </div>
                    {schedule.branch && (
                      <div className="text-sm text-gray-500">
                        {schedule.branch.sube_adi}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-sm">
                    {MONTH_NAMES[schedule.month - 1]}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-semibold">
                    {schedule.visits_required}
                  </td>
                  <td className="px-6 py-4 text-center text-sm">
                    {schedule.year || 'Tüm yıllar'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEditClick(schedule)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Düzenle"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- TEKİL DÜZENLEME MODALI --- */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Planı Düzenle</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetEditForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Orijinal formunuz (düzenleme için) */}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tür</label>
                <select
                  value={editFormData.type}
                  onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as 'customer' | 'branch' })}
                  className="w-full p-2 border rounded-lg"
                  required
                >
                  <option value="customer">Müşteri</option>
                  <option value="branch">Şube</option>
                </select>
              </div>

              {editFormData.type === 'customer' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Müşteri</label>
                  <select
                    value={editFormData.customer_id}
                    onChange={(e) => setEditFormData({ ...editFormData, customer_id: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    required
                  >
                    <option value="">Seçiniz</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.kisa_isim}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Şube</label>
                  <select
                    value={editFormData.branch_id}
                    onChange={(e) => setEditFormData({ ...editFormData, branch_id: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    required
                  >
                    <option value="">Seçiniz</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.customer.kisa_isim} - {branch.sube_adi}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ay</label>
                  <select
                    value={editFormData.month}
                    onChange={(e) => setEditFormData({ ...editFormData, month: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                    required
                  >
                    {MONTH_NAMES.map((name, index) => (
                      <option key={index} value={index + 1}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ziyaret Sayısı</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.visits_required}
                    onChange={(e) => setEditFormData({ ...editFormData, visits_required: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Yıl</label>
                  <input
                    type="number"
                    min="2024" max="2030"
                    value={editFormData.year}
                    onChange={(e) => setEditFormData({ ...editFormData, year: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notlar</label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetEditForm();
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save size={18} />
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- YENİ TOPLU EKLEME MODALI --- */}
      {showBulkAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold">Yeni Toplu Plan Ekle</h2>
              <button
                onClick={() => setShowBulkAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleBulkSubmit} className="space-y-4 overflow-y-auto flex-grow">
              {/* 1. Adım: Müşteri Seçimi */}
              <div>
                <label className="block text-sm font-medium mb-1">1. Müşteri Seçin</label>
                <select
                  value={bulkFormData.selectedCustomer}
                  onChange={(e) => setBulkFormData({ 
                    ...bulkFormData, 
                    selectedCustomer: e.target.value,
                    selectedBranches: [] // Müşteri değiştiğinde şube seçimini sıfırla
                  })}
                  className="w-full p-2 border rounded-lg"
                  required
                >
                  <option value="">Müşteri Seçiniz...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.kisa_isim}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Adım: Şube Seçimi */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  2. Şubeleri Seçin
                  {bulkFormData.selectedCustomer && ` (${filteredBranchesForBulkAdd.length} şube bulundu)`}
                </label>
                <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                  {filteredBranchesForBulkAdd.length > 0 && (
                    <CheckboxToggleAll
                      options={filteredBranchesForBulkAdd}
                      selected={bulkFormData.selectedBranches}
                      onChange={(selected) => setBulkFormData({...bulkFormData, selectedBranches: selected})}
                      labelKey="sube_adi"
                    />
                  )}
                  {filteredBranchesForBulkAdd.map(branch => (
                    <Checkbox
                      key={branch.id}
                      id={`branch-${branch.id}`}
                      label={branch.sube_adi}
                      checked={bulkFormData.selectedBranches.includes(branch.id)}
                      onChange={(checked) => {
                        setBulkFormData(prev => ({
                          ...prev,
                          selectedBranches: checked
                            ? [...prev.selectedBranches, branch.id]
                            : prev.selectedBranches.filter(id => id !== branch.id)
                        }))
                      }}
                    />
                  ))}
                  {!bulkFormData.selectedCustomer && (
                    <p className="text-sm text-gray-500 p-2">Lütfen önce bir müşteri seçin.</p>
                  )}
                  {bulkFormData.selectedCustomer && filteredBranchesForBulkAdd.length === 0 && (
                     <p className="text-sm text-gray-500 p-2">Bu müşteriye ait şube bulunamadı.</p>
                  )}
                </div>
              </div>

              {/* 3. Adım: Ay Seçimi */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">3. Ayları Seçin</label>
                 <div className="border rounded-lg p-2 max-h-48 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-1">
                   <CheckboxToggleAll
                      options={ALL_MONTHS}
                      selected={bulkFormData.selectedMonths}
                      onChange={(selected) => setBulkFormData({...bulkFormData, selectedMonths: selected.map(Number)})}
                      labelKey="name"
                    />
                   {ALL_MONTHS.map(month => (
                     <Checkbox
                        key={month.id}
                        id={`month-${month.id}`}
                        label={month.name}
                        checked={bulkFormData.selectedMonths.includes(month.id)}
                        onChange={(checked) => {
                          setBulkFormData(prev => ({
                            ...prev,
                            selectedMonths: checked
                              ? [...prev.selectedMonths, month.id]
                              : prev.selectedMonths.filter(id => id !== month.id)
                          }))
                        }}
                     />
                   ))}
                 </div>
              </div>
              
              {/* 4. Adım: Ziyaret Sayısı, Yıl ve Notlar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">4. Ziyaret Sayısı</label>
                  <input
                    type="number"
                    min="0"
                    value={bulkFormData.visits_required}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, visits_required: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">5. Yıl</label>
                  <input
                    type="number"
                    min="2024" max="2030"
                    value={bulkFormData.year}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, year: Number(e.target.value) })}
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">6. Notlar (Tümüne uygulanır)</label>
                <textarea
                  value={bulkFormData.notes}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, notes: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  rows={2}
                />
              </div>

              {/* Form Butonları */}
              <div className="flex justify-end gap-2 pt-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBulkAddModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save size={18} />
                  Toplu Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- YARDIMCI BİLEŞENLER (Checkbox) ---

interface CheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({ id, label, checked, onChange }) => (
  <label
    htmlFor={id}
    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
    <span className="text-sm select-none">{label}</span>
  </label>
);

interface CheckboxToggleAllProps {
  options: { id: string | number; [key: string]: any }[];
  selected: (string | number)[];
  onChange: (selected: (string | number)[]) => void;
  labelKey: string;
}

const CheckboxToggleAll: React.FC<CheckboxToggleAllProps> = ({ options, selected, onChange, labelKey }) => {
  const allSelected = options.length > 0 && options.length === selected.length;
  
  const handleToggle = () => {
    if (allSelected) {
      onChange([]); // Hepsini kaldır
    } else {
      onChange(options.map(opt => opt.id)); // Hepsini seç
    }
  };
  
  return (
    <label
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer font-medium text-blue-600 border-b border-gray-200"
    >
      <input
        type="checkbox"
        checked={allSelected}
        onChange={handleToggle}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-sm select-none">
        {allSelected ? 'Tümünü Kaldır' : 'Tümünü Seç'}
      </span>
    </label>
  );
};

export default AdminMonthlyVisitSchedule;