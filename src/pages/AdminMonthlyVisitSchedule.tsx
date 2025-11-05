import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

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

const AdminMonthlyVisitSchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<VisitSchedule | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    type: 'customer' as 'customer' | 'branch',
    customer_id: '',
    branch_id: '',
    month: 1,
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
    } catch (err: any) {
      toast.error('Veriler yüklenirken hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        customer_id: formData.type === 'customer' ? formData.customer_id : null,
        branch_id: formData.type === 'branch' ? formData.branch_id : null,
        month: formData.month,
        visits_required: formData.visits_required,
        year: formData.year,
        notes: formData.notes || null
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from('monthly_visit_schedules')
          .update(payload)
          .eq('id', editingSchedule.id);

        if (error) throw error;
        toast.success('Plan güncellendi');
      } else {
        const { error } = await supabase
          .from('monthly_visit_schedules')
          .insert([payload]);

        if (error) throw error;
        toast.success('Plan eklendi');
      }

      setShowModal(false);
      setEditingSchedule(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error('İşlem başarısız: ' + err.message);
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
    } catch (err: any) {
      toast.error('Silme işlemi başarısız: ' + err.message);
    }
  };

  const handleEdit = (schedule: VisitSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      type: schedule.customer_id ? 'customer' : 'branch',
      customer_id: schedule.customer_id || '',
      branch_id: schedule.branch_id || '',
      month: schedule.month,
      visits_required: schedule.visits_required,
      year: schedule.year || new Date().getFullYear(),
      notes: schedule.notes || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'customer',
      customer_id: '',
      branch_id: '',
      month: 1,
      visits_required: 1,
      year: new Date().getFullYear(),
      notes: ''
    });
  };

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

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Aylık Ziyaret Planları</h1>
        <button
          onClick={() => {
            resetForm();
            setEditingSchedule(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Yeni Plan Ekle
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Müşteri veya Şube Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border rounded"
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Müşteri/Şube
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Ay
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Ziyaret Sayısı
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Yıl
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                İşlemler
              </th>
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
                        onClick={() => handleEdit(schedule)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="text-red-600 hover:text-red-900"
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingSchedule ? 'Planı Düzenle' : 'Yeni Plan Ekle'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingSchedule(null);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tür</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'customer' | 'branch' })}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="customer">Müşteri</option>
                  <option value="branch">Şube</option>
                </select>
              </div>

              {formData.type === 'customer' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Müşteri</label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full p-2 border rounded"
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
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full p-2 border rounded"
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ay</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                    className="w-full p-2 border rounded"
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
                    value={formData.visits_required}
                    onChange={(e) => setFormData({ ...formData, visits_required: Number(e.target.value) })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Yıl</label>
                  <input
                    type="number"
                    min="2024"
                    max="2030"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notlar</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSchedule(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save size={18} />
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonthlyVisitSchedule;
