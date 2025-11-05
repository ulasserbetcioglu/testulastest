// src/components/Vehicles/MaintenanceModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id: string;
    plate_number: string;
  };
}

interface MaintenanceRecord {
  id: string;
  maintenance_type: string;
  maintenance_date: string;
  km_at_maintenance: number;
  description?: string | null;
  cost?: number | null;
  performed_by?: string | null;
  next_maintenance_date?: string | null;
  next_maintenance_km?: number | null;
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose, vehicle }) => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);

  const [formData, setFormData] = useState({
    maintenance_type: '',
    maintenance_date: new Date().toISOString().split('T')[0],
    km_at_maintenance: 0,
    description: '',
    cost: 0,
    performed_by: '',
    next_maintenance_date: '',
    next_maintenance_km: 0
  });

  useEffect(() => {
    if (isOpen) {
      fetchMaintenanceRecords();
      resetForm();
    }
  }, [isOpen, vehicle.id]);

  const fetchMaintenanceRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicle_maintenance')
        .select('*')
        .eq('vehicle_id', vehicle.id)
        .order('maintenance_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Bakım kayıtları yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      maintenance_type: '',
      maintenance_date: new Date().toISOString().split('T')[0],
      km_at_maintenance: 0,
      description: '',
      cost: 0,
      performed_by: '',
      next_maintenance_date: '',
      next_maintenance_km: 0
    });
    setEditingRecord(null);
    setShowAddForm(false);
    setError(null);
  };

  const handleAddEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const recordData = {
        vehicle_id: vehicle.id,
        maintenance_type: formData.maintenance_type,
        maintenance_date: formData.maintenance_date,
        km_at_maintenance: formData.km_at_maintenance,
        description: formData.description || null,
        cost: formData.cost || null,
        performed_by: formData.performed_by || null,
        next_maintenance_date: formData.next_maintenance_date || null,
        next_maintenance_km: formData.next_maintenance_km || null,
        created_by: (await supabase.auth.getUser()).data.user?.id // Assuming created_by exists
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('vehicle_maintenance')
          .update(recordData)
          .eq('id', editingRecord.id);
        if (error) throw error;
        toast.success('Bakım kaydı güncellendi.');
      } else {
        const { error } = await supabase
          .from('vehicle_maintenance')
          .insert(recordData);
        if (error) throw error;
        toast.success('Bakım kaydı eklendi.');
      }
      fetchMaintenanceRecords();
      resetForm();
    } catch (err: any) {
      setError(err.message);
      toast.error('Kaydetme hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setFormData({
      maintenance_type: record.maintenance_type,
      maintenance_date: record.maintenance_date,
      km_at_maintenance: record.km_at_maintenance,
      description: record.description || '',
      cost: record.cost || 0,
      performed_by: record.performed_by || '',
      next_maintenance_date: record.next_maintenance_date || '',
      next_maintenance_km: record.next_maintenance_km || 0
    });
    setShowAddForm(true);
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('Bu bakım kaydını silmek istediğinizden emin misiniz?')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('vehicle_maintenance')
        .delete()
        .eq('id', recordId);
      if (error) throw error;
      toast.success('Bakım kaydı silindi.');
      fetchMaintenanceRecords();
    } catch (err: any) {
      setError(err.message);
      toast.error('Silme hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">{vehicle.plate_number} Bakım Kayıtları</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 mb-4">
            <Plus size={20} /> {showAddForm ? 'Formu Gizle' : 'Yeni Bakım Kaydı Ekle'}
          </button>

          {showAddForm && (
            <form onSubmit={handleAddEditSubmit} className="p-4 border rounded-lg bg-gray-50 mb-6">
              <h3 className="text-lg font-semibold mb-4">{editingRecord ? 'Bakım Kaydını Düzenle' : 'Yeni Bakım Kaydı'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bakım Türü</label>
                  <input type="text" name="maintenance_type" value={formData.maintenance_type} onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })} className="w-full p-2 border rounded" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bakım Tarihi</label>
                  <input type="date" name="maintenance_date" value={formData.maintenance_date} onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })} className="w-full p-2 border rounded" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bakım KM</label>
                  <input type="number" name="km_at_maintenance" value={formData.km_at_maintenance} onChange={(e) => setFormData({ ...formData, km_at_maintenance: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maliyet (₺)</label>
                  <input type="number" name="cost" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })} className="w-full p-2 border rounded" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                  <textarea name="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yapan Kişi/Servis</label>
                  <input type="text" name="performed_by" value={formData.performed_by} onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sonraki Bakım Tarihi</label>
                  <input type="date" name="next_maintenance_date" value={formData.next_maintenance_date} onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sonraki Bakım KM</label>
                  <input type="number" name="next_maintenance_km" value={formData.next_maintenance_km} onChange={(e) => setFormData({ ...formData, next_maintenance_km: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" />
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">İptal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
                  {loading ? 'Kaydediliyor...' : <><Save size={18} className="mr-2" /> Kaydet</>}
                </button>
              </div>
            </form>
          )}

          <h3 className="text-lg font-semibold mb-4">Mevcut Bakım Kayıtları</h3>
          {records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Bu araç için henüz bakım kaydı bulunmuyor.
            </div>
          ) : (
            <div className="space-y-4">
              {records.map(record => (
                <div key={record.id} className="p-4 border rounded-lg bg-white shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-800">{record.maintenance_type}</h4>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditClick(record)} className="text-blue-600 hover:text-blue-800 p-1"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(record.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Tarih: {new Date(record.maintenance_date).toLocaleDateString('tr-TR')} - KM: {record.km_at_maintenance.toLocaleString('tr-TR')}</p>
                  {record.cost && <p className="text-sm text-gray-600">Maliyet: {record.cost.toLocaleString('tr-TR')} ₺</p>}
                  {record.performed_by && <p className="text-sm text-gray-600">Yapan: {record.performed_by}</p>}
                  {record.description && <p className="text-sm text-gray-600 mt-2">Açıklama: {record.description}</p>}
                  {(record.next_maintenance_date || record.next_maintenance_km) && (
                    <p className="text-sm text-blue-600 mt-2">
                      Sonraki Bakım: {record.next_maintenance_date ? new Date(record.next_maintenance_date).toLocaleDateString('tr-TR') : ''} {record.next_maintenance_km ? `(${record.next_maintenance_km} KM)` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceModal;
