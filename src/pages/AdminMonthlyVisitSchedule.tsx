import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Save, X, Calendar } from 'lucide-react';

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

  // Modal durumları
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<VisitSchedule | null>(null);

  // Form verileri
  const [formData, setFormData] = useState({
    type: 'branch' as 'customer' | 'branch',
    customer_id: '',
    branch_id: '',
    operator_id: '',
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

      const [schedulesRes, customersRes, branchesRes, operatorsRes] = await Promise.all([
        supabase
          .from('monthly_visit_schedules')
          .select(`
            *,
            customer:customer_id(kisa_isim),
            branch:branch_id(
              sube_adi,
              customer:customer_id(kisa_isim)
            ),
            operator:operator_id(name)
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
          .order('sube_adi'),
        supabase
          .from('operators')
          .select('id, name, email')
          .eq('status', 'Açık')
          .order('name')
      ]);

      if (schedulesRes.error) throw schedulesRes.error;
      if (customersRes.error) throw customersRes.error;
      if (branchesRes.error) throw branchesRes.error;
      if (operatorsRes.error) throw operatorsRes.error;

      setSchedules(schedulesRes.data || []);
      setCustomers(customersRes.data || []);
      setBranches(branchesRes.data || []);
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
      operator_id: '',
      selectedMonths: [],
      visits_required: 1,
      year: selectedYear,
      notes: ''
    });
    setShowAddModal(true);
  };

  const handleEdit = (schedule: VisitSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      type: schedule.branch_id ? 'branch' : 'customer',
      customer_id: schedule.customer_id || '',
      branch_id: schedule.branch_id || '',
      operator_id: schedule.operator_id || '',
      selectedMonths: [schedule.month],
      visits_required: schedule.visits_required,
      year: schedule.year || selectedYear,
      notes: schedule.notes || ''
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      // Validasyon
      if (formData.type === 'branch' && !formData.branch_id) {
        toast.error('Lütfen bir şube seçin');
        return;
      }
      if (formData.type === 'customer' && !formData.customer_id) {
        toast.error('Lütfen bir müşteri seçin');
        return;
      }
      if (formData.selectedMonths.length === 0) {
        toast.error('Lütfen en az bir ay seçin');
        return;
      }

      // Güncelleme modu
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
      }
      // Yeni kayıt - seçili tüm aylar için
      else {
        const records = formData.selectedMonths.map(month => ({
          customer_id: formData.type === 'customer' ? formData.customer_id : null,
          branch_id: formData.type === 'branch' ? formData.branch_id : null,
          operator_id: formData.operator_id || null,
          month,
          visits_required: formData.visits_required,
          year: formData.year,
          notes: formData.notes
        }));

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

  const toggleMonth = (month: number) => {
    setFormData(prev => ({
      ...prev,
      selectedMonths: prev.selectedMonths.includes(month)
        ? prev.selectedMonths.filter(m => m !== month)
        : [...prev.selectedMonths, month].sort((a, b) => a - b)
    }));
  };

  const filteredBranchesByCustomer = useMemo(() => {
    if (!formData.customer_id) return branches;
    return branches.filter(b => b.customer_id === formData.customer_id);
  }, [branches, formData.customer_id]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      const customerName = schedule.customer?.kisa_isim || '';
      const branchName = schedule.branch?.sube_adi || '';
      const searchLower = searchTerm.toLowerCase();

      return customerName.toLowerCase().includes(searchLower) ||
             branchName.toLowerCase().includes(searchLower);
    });
  }, [schedules, searchTerm]);

  // Ay bazında gruplama
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
      </div>

      {/* Ay Ay Gruplu Tablo */}
      <div className="space-y-6">
        {Object.entries(schedulesByMonth).map(([month, monthSchedules]) => (
          <div key={month} className="bg-white rounded-lg shadow">
            <div className="bg-blue-50 px-4 py-3 border-b flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              <h2 className="font-semibold text-lg">{MONTH_NAMES[Number(month) - 1]}</h2>
              <span className="ml-auto text-sm text-gray-600">
                {monthSchedules.length} plan
              </span>
            </div>

            {monthSchedules.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
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
                      <tr key={schedule.id} className="hover:bg-gray-50">
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

      {/* Add/Edit Modal */}
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
              {/* Tür Seçimi */}
              {!editingSchedule && (
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

              {/* Müşteri Seçimi */}
              <div>
                <label className="block text-sm font-medium mb-2">Müşteri</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, branch_id: '' })}
                  disabled={editingSchedule !== null}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Müşteri Seçin</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.kisa_isim}</option>
                  ))}
                </select>
              </div>

              {/* Şube Seçimi */}
              {formData.type === 'branch' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Şube</label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    disabled={editingSchedule !== null}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Şube Seçin</option>
                    {filteredBranchesByCustomer.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.sube_adi} ({b.customer.kisa_isim})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Operatör Seçimi */}
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

              {/* Ay Seçimi */}
              {!editingSchedule && (
                <div>
                  <label className="block text-sm font-medium mb-2">Aylar (Çoklu Seçim)</label>
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
                </div>
              )}

              {/* Ziyaret Sayısı */}
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

              {/* Yıl */}
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

              {/* Notlar */}
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
