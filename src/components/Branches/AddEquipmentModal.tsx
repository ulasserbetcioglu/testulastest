import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Equipment {
  id: string;
  name: string;
  code: string;
}

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string;
  customerId?: string;
  onSave: () => void;
}

const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({ isOpen, onClose, branchId, customerId, onSave }) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<{id: string, sube_adi: string}[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    department: '',
    items: [{ equipmentId: '', count: 1 }]
  });

  useEffect(() => {
    if (isOpen) {
      fetchEquipment();
      if (customerId) {
        fetchBranches();
      }
    }
  }, [isOpen, customerId]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, code')
        .eq('is_active', true)
        .order('order_no', { ascending: true });

      if (error) throw error;
      setEquipment(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchBranches = async () => {
    if (!customerId) return;
    
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, sube_adi')
        .eq('customer_id', customerId)
        .order('sube_adi');

      if (error) throw error;
      setBranches(data || []);
      if (data && data.length > 0) {
        setSelectedBranchId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate that a branch is selected when customerId is provided
      if (customerId && !selectedBranchId && !branchId) {
        throw new Error('Lütfen bir şube seçin');
      }

      const targetBranchId = branchId || selectedBranchId;
      
      if (!targetBranchId) {
        throw new Error('Şube bilgisi bulunamadı');
      }

      // Generate equipment codes for each item
      const equipmentToInsert = formData.items.flatMap(item => {
        if (!item.equipmentId) return [];
        
        const selectedEquipment = equipment.find(eq => eq.id === item.equipmentId);
        if (!selectedEquipment) return [];

        return Array.from({ length: item.count }, (_, index) => ({
          branch_id: targetBranchId,
          equipment_id: item.equipmentId,
          equipment_code: `${selectedEquipment.code}-${index + 1}`,
          department: formData.department.toUpperCase()
        }));
      });

      const { error } = await supabase
        .from('branch_equipment')
        .insert(equipmentToInsert);

      if (error) throw error;

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addEquipmentItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { equipmentId: '', count: 1 }]
    }));
  };

  const removeEquipmentItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateEquipmentItem = (index: number, field: 'equipmentId' | 'count', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Ekipman Ekle</h2>
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

          {customerId && !branchId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şube Seçin
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Şube Seçiniz</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.sube_adi}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bölüm
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                placeholder="Örn: MUTFAK, KAFE, DEPO"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Ekipmanlar</h3>
                <button
                  type="button"
                  onClick={addEquipmentItem}
                  className="text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Ekipman Ekle
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="flex items-center gap-4 bg-gray-50 p-4 rounded">
                  <div className="flex-1">
                    <select
                      value={item.equipmentId}
                      onChange={(e) => updateEquipmentItem(index, 'equipmentId', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Seçiniz</option>
                      {equipment.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <input
                      type="number"
                      min="1"
                      value={item.count}
                      onChange={(e) => updateEquipmentItem(index, 'count', parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeEquipmentItem(index)}
                    className="text-red-600 hover:text-red-700"
                    disabled={formData.items.length === 1}
                  >
                    <Minus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEquipmentModal;
