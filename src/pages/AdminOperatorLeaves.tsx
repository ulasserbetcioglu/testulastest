// src/pages/AdminOperatorLeaves.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Save, X, Loader2, Calendar, User, Filter, Search, CheckSquare, XSquare } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns'; // Import parseISO and differenceInDays
import { tr } from 'date-fns/locale';
import { Operator as OperatorType } from '../types'; // Import the updated Operator type

// Arayüz (Interface) tanımları
interface OperatorLeave {
  id: string;
  operator_id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  requested_by: string | null;
  approved_by: string | null;
  operator: { // İlişkili operatör bilgisi
    id: string;
    name: string;
    email: string;
    total_leave_days?: number; // ✅ MODIFIED: Add total_leave_days to nested operator
  } | null;
  requester_email?: string; // Talep eden kullanıcının e-postası
  approver_email?: string; // Onaylayan kullanıcının e-postası
  duration_days?: number; // ✅ YENİ: İzin süresi (gün olarak)
}

interface Operator extends OperatorType { // Extend the imported type
  // No need to redefine properties here if OperatorType is complete
}

const leaveTypes = [
  { value: 'annual', label: 'Yıllık İzin' },
  { value: 'sick', label: 'Hastalık İzni' },
  { value: 'unpaid', label: 'Ücretsiz İzin' },
  { value: 'maternity', label: 'Doğum İzni' },
  { value: 'paternity', label: 'Babalık İzni' },
  { value: 'other', label: 'Diğer' },
];

const leaveStatuses = [
  { value: 'pending', label: 'Beklemede' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'cancelled', label: 'İptal Edildi' },
];

const AdminOperatorLeaves: React.FC = () => {
  const [leaves, setLeaves] = useState<OperatorLeave[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtre state'leri
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state'leri
  const [showModal, setShowModal] = useState(false);
  const [editingLeave, setEditingLeave] = useState<OperatorLeave | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOperators();
    fetchLeaves();
  }, []);

  const fetchOperators = async () => {
    try {
      const { data, error } = await supabase
        .from('operators')
        .select('id, name, email, total_leave_days') // ✅ MODIFIED: Select total_leave_days
        .order('name');
      if (error) throw error;
      setOperators(data || []);
    } catch (err: any) {
      toast.error(`Operatörler çekilirken hata: ${err.message}`);
    }
  };

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('operator_leaves')
        .select(`
          *,
          operator:operator_id(id, name, email, total_leave_days)
        `) // ✅ MODIFIED: Select total_leave_days from nested operator
        .order('created_at', { ascending: false });

      // Filtreleri uygula
      if (selectedOperator !== 'all') {
        query = query.eq('operator_id', selectedOperator);
      }
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }
      if (selectedLeaveType !== 'all') {
        query = query.eq('leave_type', selectedLeaveType);
      }
      if (startDateFilter) {
        query = query.gte('start_date', startDateFilter);
      }
      if (endDateFilter) {
        query = query.lte('end_date', endDateFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // requested_by ve approved_by e-postalarını çek
      const userIds = [...new Set([...(data || []).map(l => l.requested_by), ...(data || []).map(l => l.approved_by)].filter(Boolean))];
      let userEmailsMap = new Map<string, string>();

      if (userIds.length > 0) {
        // Supabase admin client ile kullanıcı e-postalarını çekmek için bir Edge Function kullanmanız gerekebilir.
        // Şimdilik basit bir placeholder bırakıyorum. Gerçek uygulamada bu kısım Edge Function ile yapılmalı.
        // Örnek: const { data: usersData } = await supabase.functions.invoke('get-user-emails', { body: { userIds } });
        // usersData.forEach(u => userEmailsMap.set(u.id, u.email));
      }

      const leavesWithEmailsAndDuration = (data || []).map(leave => {
        const start = parseISO(leave.start_date);
        const end = parseISO(leave.end_date);
        const duration = differenceInDays(end, start) + 1; // Başlangıç ve bitiş günleri dahil
        
        return {
          ...leave,
          requester_email: userEmailsMap.get(leave.requested_by || '') || 'Bilinmiyor',
          approver_email: userEmailsMap.get(leave.approved_by || '') || 'Bilinmiyor',
          duration_days: duration, // ✅ YENİ: İzin süresini ekle
        };
      });

      setLeaves(leavesWithEmailsAndDuration);
    } catch (err: any) {
      setError(err.message);
      toast.error(`İzinler çekilirken hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedOperator, selectedStatus, selectedLeaveType, startDateFilter, endDateFilter]);

  // Formu sıfırla
  const resetForm = () => {
    setEditingLeave(null);
    setShowModal(false);
  };

  // İzin ekle/düzenle modalını aç
  const handleAddEditClick = (leave: OperatorLeave | null = null) => {
    setEditingLeave(leave);
    setShowModal(true);
  };

  // İzin kaydet/güncelle
  const handleSaveLeave = async (formData: OperatorLeave) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      if (editingLeave) {
        // Güncelleme
        const { error } = await supabase
          .from('operator_leaves')
          .update({
            operator_id: formData.operator_id,
            start_date: formData.start_date,
            end_date: formData.end_date,
            leave_type: formData.leave_type,
            status: formData.status,
            notes: formData.notes,
            approved_by: formData.status === 'approved' ? user.id : null, // Onaylandıysa onaylayan kişiyi kaydet
          })
          .eq('id', editingLeave.id);
        if (error) throw error;
        toast.success('İzin başarıyla güncellendi.');
      } else {
        // Yeni kayıt
        const { error } = await supabase
          .from('operator_leaves')
          .insert({
            operator_id: formData.operator_id,
            start_date: formData.start_date,
            end_date: formData.end_date,
            leave_type: formData.leave_type,
            status: formData.status,
            notes: formData.notes,
            requested_by: user.id, // Talep eden kişiyi kaydet
            approved_by: formData.status === 'approved' ? user.id : null, // Onaylandıysa onaylayan kişiyi kaydet
          });
        if (error) throw error;
        toast.success('İzin talebi başarıyla oluşturuldu.');
      }
      fetchLeaves(); // Listeyi yenile
      resetForm();
    } catch (err: any) {
      toast.error(`İşlem başarısız: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // İzin sil
  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm('Bu izni silmek istediğinizden emin misiniz?')) return;
    try {
      const { error } = await supabase
        .from('operator_leaves')
        .delete()
        .eq('id', leaveId);
      if (error) throw error;
      toast.success('İzin başarıyla silindi.');
      fetchLeaves();
    } catch (err: any) {
      toast.error(`Silme başarısız: ${err.message}`);
    }
  };

  // Filtrelenmiş izinler
  const filteredLeaves = useMemo(() => {
    return leaves.filter(leave => {
      const matchesSearch = searchTerm === '' ||
        leave.operator?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leave.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [leaves, searchTerm]);

  // ✅ YENİ: Operatör başına toplam izin günlerini hesapla
  const totalLeaveDaysPerOperator = useMemo(() => {
    const totals: { [key: string]: { used: number; totalEntitlement: number; remaining: number } } = {};
    
    // Initialize with total entitlement from operators list
    operators.forEach(op => {
      totals[op.id] = { used: 0, totalEntitlement: op.total_leave_days || 0, remaining: op.total_leave_days || 0 };
    });

    // Sum up used days from leaves
    leaves.forEach(leave => {
      if (leave.operator_id && leave.duration_days !== undefined && leave.status === 'approved') { // Only count approved leaves
        if (totals[leave.operator_id]) {
          totals[leave.operator_id].used += leave.duration_days;
          totals[leave.operator_id].remaining = totals[leave.operator_id].totalEntitlement - totals[leave.operator_id].used;
        } else {
          // Handle case where an operator might have leaves but wasn't in the initial 'operators' fetch (e.g., new operator)
          totals[leave.operator_id] = { used: leave.duration_days, totalEntitlement: 0, remaining: -leave.duration_days };
        }
      }
    });
    return totals;
  }, [leaves, operators]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span className="ml-3 text-lg text-gray-700">İzinler yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Operatör İzin Yönetimi</h1>
        <button
          onClick={() => handleAddEditClick()}
          className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} /> Yeni İzin Talebi
        </button>
      </header>

      {/* Filtreler */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operatör</label>
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Tümü</option>
              {operators.map(op => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Tümü</option>
              {leaveStatuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İzin Türü</label>
            <select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Tümü</option>
              {leaveTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arama</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Operatör veya not ara..."
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={fetchLeaves}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            disabled={loading}
          >
            <Filter size={20} /> Filtrele
          </button>
        </div>
      </div>

      {/* İzin Listesi */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operatör</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İzin Türü</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlangıç</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bitiş</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Süre (Gün)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notlar</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Gösterilecek izin kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User size={16} className="mr-2 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{leave.operator?.name || 'Bilinmiyor'}</div>
                          <div className="text-xs text-gray-500">{leave.operator?.email || 'N/A'}</div>
                          {leave.operator_id && totalLeaveDaysPerOperator[leave.operator_id] !== undefined && (
                            <div className="text-xs text-gray-600 mt-1">
                              Toplam İzin Hakkı: <span className="font-semibold">{totalLeaveDaysPerOperator[leave.operator_id].totalEntitlement} gün</span><br/>
                              Kullanılan İzin: <span className="font-semibold">{totalLeaveDaysPerOperator[leave.operator_id].used} gün</span><br/>
                              Kalan İzin: <span className="font-semibold">{totalLeaveDaysPerOperator[leave.operator_id].remaining} gün</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leaveTypes.find(type => type.value === leave.leave_type)?.label || leave.leave_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(leave.start_date), 'dd.MM.yyyy', { locale: tr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(leave.end_date), 'dd.MM.yyyy', { locale: tr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {leave.duration_days !== undefined ? `${leave.duration_days} gün` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                        leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        leave.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {leaveStatuses.find(status => status.value === leave.status)?.label || leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={leave.notes || ''}>
                      {leave.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleAddEditClick(leave)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteLeave(leave.id)}
                        className="text-red-600 hover:text-red-900 p-1 ml-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* İzin Ekle/Düzenle Modalı */}
      {showModal && (
        <LeaveRequestModal
          isOpen={showModal}
          onClose={resetForm}
          onSave={handleSaveLeave}
          operators={operators}
          editingLeave={editingLeave}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default AdminOperatorLeaves;

// LeaveRequestModal Bileşeni
interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: OperatorLeave) => void;
  operators: Operator[];
  editingLeave: OperatorLeave | null;
  isSubmitting: boolean;
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({ isOpen, onClose, onSave, operators, editingLeave, isSubmitting }) => {
  const [formData, setFormData] = useState<OperatorLeave>({
    id: editingLeave?.id || '',
    operator_id: editingLeave?.operator_id || '',
    start_date: editingLeave?.start_date || format(new Date(), 'yyyy-MM-dd'),
    end_date: editingLeave?.end_date || format(new Date(), 'yyyy-MM-dd'),
    leave_type: editingLeave?.leave_type || 'annual',
    status: editingLeave?.status || 'pending',
    notes: editingLeave?.notes || '',
    created_at: editingLeave?.created_at || '',
    updated_at: editingLeave?.updated_at || '',
    requested_by: editingLeave?.requested_by || null,
    approved_by: editingLeave?.approved_by || null,
    operator: editingLeave?.operator || null,
  });

  useEffect(() => {
    if (editingLeave) {
      setFormData({
        id: editingLeave.id,
        operator_id: editingLeave.operator_id,
        start_date: editingLeave.start_date,
        end_date: editingLeave.end_date,
        leave_type: editingLeave.leave_type,
        status: editingLeave.status,
        notes: editingLeave.notes,
        created_at: editingLeave.created_at,
        updated_at: editingLeave.updated_at,
        requested_by: editingLeave.requested_by,
        approved_by: editingLeave.approved_by,
        operator: editingLeave.operator,
      });
    } else {
      setFormData({
        id: '',
        operator_id: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        leave_type: 'annual',
        status: 'pending',
        notes: '',
        created_at: '',
        updated_at: '',
        requested_by: null,
        approved_by: null,
        operator: null,
      });
    }
  }, [editingLeave]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">{editingLeave ? 'İzin Düzenle' : 'Yeni İzin Talebi'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operatör</label>
              <select
                value={formData.operator_id}
                onChange={(e) => setFormData({ ...formData, operator_id: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
                disabled={!!editingLeave} // Düzenleme modunda operatör değiştirilemez
              >
                <option value="">Seçiniz</option>
                {operators.map(op => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İzin Türü</label>
              <select
                value={formData.leave_type}
                onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              >
                {leaveTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'approved' | 'rejected' | 'cancelled' })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              >
                {leaveStatuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-lg"
              ></textarea>
            </div>
          </div>
          <div className="flex justify-end items-center p-4 bg-gray-50 border-t rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 mr-2"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center min-w-[100px]"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <><Save size={18} className="mr-2" /> Kaydet</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
