import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AddEquipmentModal from './AddEquipmentModal';

interface BranchEquipmentProps {
  branchId?: string;
  customerId?: string;
}

interface Equipment {
  id: string;
  equipment_code: string;
  department: string;
  equipment: {
    name: string;
  };
}

const BranchEquipment: React.FC<BranchEquipmentProps> = ({ branchId, customerId }) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
    fetchEquipment();
  }, [branchId, customerId]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAdmin(user?.email === 'admin@ilaclamatik.com');
  };

  const fetchEquipment = async () => {
    try {
      if (branchId) {
        // If branchId is provided, fetch equipment directly for that branch
        const { data, error } = await supabase
          .from('branch_equipment')
          .select(`
            id,
            equipment_code,
            department,
            equipment(name)
          `)
          .eq('branch_id', branchId)
          .order('department', { ascending: true });

        if (error) throw error;
        setEquipment(data || []);
      } else if (customerId) {
        // For customer's equipment, first get the branches
        const { data: branches, error: branchError } = await supabase
          .from('branches')
          .select('id')
          .eq('customer_id', customerId);

        if (branchError) throw branchError;

        if (branches && branches.length > 0) {
          const branchIds = branches.map(b => b.id);
          const { data, error } = await supabase
            .from('branch_equipment')
            .select(`
              id,
              equipment_code,
              department,
              equipment(name)
            `)
            .in('branch_id', branchIds)
            .order('department', { ascending: true });

          if (error) throw error;
          setEquipment(data || []);
        } else {
          setEquipment([]);
        }
      } else {
        setEquipment([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      alert('Sadece admin kullanıcısı ekipman silebilir.');
      return;
    }

    if (!confirm('Bu ekipmanı silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('branch_equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchEquipment();
      if (selectedBranchId === id) {
        setSelectedBranchId(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  // Group equipment by department
  const groupedEquipment = equipment.reduce((acc, eq) => {
    if (!acc[eq.department]) {
      acc[eq.department] = [];
    }
    acc[eq.department].push(eq);
    return acc;
  }, {} as Record<string, Equipment[]>);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Ekipmanlar</h2>
        {branchId && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Ekipman Ekle
          </button>
        )}
      </div>

      {Object.entries(groupedEquipment).length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Henüz ekipman eklenmemiş
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEquipment).map(([department, items]) => (
            <div key={department} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-lg mb-3">{department}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded shadow-sm">
                    <div>
                      <div className="font-medium">{item.equipment.name}</div>
                      <div className="text-sm text-gray-500">Kod: {item.equipment_code}</div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddEquipmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        branchId={branchId}
        customerId={customerId}
        onSave={fetchEquipment}
      />
    </div>
  );
};

export default BranchEquipment;