import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AddEquipmentModal from './AddEquipmentModal';
import EditEquipmentModal from './EditEquipmentModal';

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);

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
        // @ts-ignore
        setEquipment(data?.map(item => ({
          ...item,
          equipment: Array.isArray(item.equipment) ? item.equipment[0] : item.equipment
        })) || []);
      } else if (customerId) {
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
          // @ts-ignore
          setEquipment(data?.map(item => ({
            ...item,
            equipment: Array.isArray(item.equipment) ? item.equipment[0] : item.equipment
          })) || []);
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
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (item: Equipment) => {
    setSelectedEquipment(item);
    setIsEditModalOpen(true);
  };

  const handleOpenAddModal = (dept?: string) => {
    setSelectedDepartment(dept);
    setIsAddModalOpen(true);
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

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
        {branchId && isAdmin && (
          <button
            onClick={() => handleOpenAddModal()}
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
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-lg">{department}</h3>
                {branchId && isAdmin && (
                  <button
                    onClick={() => handleOpenAddModal(department)}
                    className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                    title="Bu bölüme ekipman ekle"
                  >
                    <Plus size={18} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded shadow-sm border border-transparent hover:border-gray-200 transition-colors">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.equipment?.name || 'İsimsiz Ekipman'}</div>
                      <div className="text-sm text-gray-500 font-mono">Kod: {item.equipment_code}</div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
        initialDepartment={selectedDepartment}
      />

      <EditEquipmentModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEquipment(null);
        }}
        equipmentItem={selectedEquipment}
        onSave={fetchEquipment}
      />
    </div>
  );
};

export default BranchEquipment;