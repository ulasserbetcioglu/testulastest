// src/components/Vehicles/EditVehicleModal.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  vehicle: {
    id: string;
    plate_number: string;
    brand: string;
    model: string;
    year: number;
    color?: string | null;
    vin?: string | null;
    current_km?: number | null;
    fuel_type?: string | null;
    status: 'active' | 'maintenance' | 'inactive';
    operator_id?: string | null;
    insurance_expiry?: string | null;
    inspection_expiry?: string | null;
    insurance_policy_number?: string | null;
    notes?: string | null;
  };
}

interface Operator {
  id: string;
  name: string;
}

const EditVehicleModal: React.FC<EditVehicleModalProps> = ({ isOpen, onClose, onSave, vehicle }) => {
  const [formData, setFormData] = useState({
    plate_number: vehicle.plate_number,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color || '',
    vin: vehicle.vin || '',
    current_km: vehicle.current_km || 0,
    fuel_type: vehicle.fuel_type || 'gasoline',
    status: vehicle.status,
    operator_id: vehicle.operator_id || '',
    insurance_expiry: vehicle.insurance_expiry || '',
    inspection_expiry: vehicle.inspection_expiry || '',
    insurance_policy_number: vehicle.insurance_policy_number || '',
    notes: vehicle.notes || ''
  });
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchOperators();
      // Set form data from vehicle prop
      setFormData({
        plate_number: vehicle.plate_number,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color || '',
        vin: vehicle.vin || '',
        current_km: vehicle.current_km || 0,
        fuel_type: vehicle.fuel_type || 'gasoline',
        status: vehicle.status,
        operator_id: vehicle.operator_id || '',
        insurance_expiry: vehicle.insurance_expiry || '',
        inspection_expiry: vehicle.inspection_expiry || '',
        insurance_policy_number: vehicle.insurance_policy_number || '',
        notes: vehicle.notes || ''
      });
      setError(null);
    }
  }, [isOpen, vehicle]);

  const fetchOperators = async () => {
    try {
      const { data, error } = await supabase
        .from('operators')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setOperators(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          plate_number: formData.plate_number,
          brand: formData.brand,
          model: formData.model,
          year: formData.year,
          color: formData.color || null,
          vin: formData.vin || null,
          current_km: formData.current_km,
          fuel_type: formData.fuel_type,
          status: formData.status,
          operator_id: formData.operator_id || null,
          insurance_expiry: formData.insurance_expiry || null,
          inspection_expiry: formData.inspection_expiry || null,
          insurance_policy_number: formData.insurance_policy_number || null,
          notes: formData.notes || null
        })
        .eq('id', vehicle.id);

      if (error) throw error;
      toast.success('Araç başarıyla güncellendi.');
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
      toast.error('Araç güncellenirken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">Aracı Düzenle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plaka Numarası</label>
              <input type="text" name="plate_number" value={formData.plate_number} onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })} className="w-full p-2 border rounded" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
              <input type="text" name="brand" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full p-2 border rounded" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input type="text" name="model" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="w-full p-2 border rounded" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yıl</label>
              <input type="number" name="year" value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Renk</label>
              <input type="text" name="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VIN (Şasi No)</label>
              <input type="text" name="vin" value={formData.vin} onChange={(e) => setFormData({ ...formData, vin: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Güncel KM</label>
              <input type="number" name="current_km" value={formData.current_km} onChange={(e) => setFormData({ ...formData, current_km: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yakıt Tipi</label>
              <select name="fuel_type" value={formData.fuel_type} onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })} className="w-full p-2 border rounded">
                <option value="gasoline">Benzin</option>
                <option value="diesel">Dizel</option>
                <option value="lpg">LPG</option>
                <option value="electric">Elektrik</option>
                <option value="hybrid">Hibrit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select name="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'maintenance' | 'inactive' })} className="w-full p-2 border rounded">
                <option value="active">Aktif</option>
                <option value="maintenance">Bakımda</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Atanan Operatör</label>
              <select name="operator_id" value={formData.operator_id} onChange={(e) => setFormData({ ...formData, operator_id: e.target.value })} className="w-full p-2 border rounded">
                <option value="">Yok</option>
                {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sigorta Bitiş Tarihi</label>
              <input type="date" name="insurance_expiry" value={formData.insurance_expiry} onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Muayene Bitiş Tarihi</label>
              <input type="date" name="inspection_expiry" value={formData.inspection_expiry} onChange={(e) => setFormData({ ...formData, inspection_expiry: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sigorta Poliçe Numarası</label>
              <input type="text" name="insurance_policy_number" value={formData.insurance_policy_number} onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <textarea name="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full p-2 border rounded" />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50" disabled={loading}>İptal</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVehicleModal;
