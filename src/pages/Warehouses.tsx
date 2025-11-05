import React, { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Package, ArrowRight, Edit2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AddWarehouseModal from '../components/Warehouses/AddWarehouseModal';
import EditWarehouseModal from '../components/Warehouses/EditWarehouseModal';
import StockUpdateModal from '../components/Warehouses/StockUpdateModal';

interface WarehouseItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    unit_type: string;
  };
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  is_active: boolean;
  operator: {
    id: string;
    name: string;
  } | null;
  items: WarehouseItem[];
}

const Warehouses: React.FC = () => {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchWarehouses();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAdmin(user?.email === 'admin@ilaclamatik.com');
  };

  const fetchWarehouses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from('warehouses')
        .select(`
          *,
          operator:operator_id (
            id,
            name
          ),
          items:warehouse_items (
            id,
            quantity,
            product:product_id (
              id,
              name,
              unit_type
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      // If not admin, only show warehouses relevant to the operator
      if (user?.email !== 'admin@ilaclamatik.com') {
        const { data: operatorData } = await supabase
          .from('operators')
          .select('id')
          .eq('auth_id', user?.id)
          .single();
          
        if (operatorData) {
          query = query.eq('operator_id', operatorData.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setWarehouses(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (warehouse: Warehouse, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('warehouses')
        .update({ is_active: isActive })
        .eq('id', warehouse.id);

      if (error) throw error;
      fetchWarehouses();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredWarehouses = warehouses.filter(warehouse => 
    warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">DEPOLAR</h1>
        <div className="flex gap-2">
                   <button
            onClick={() => navigate('/depolar/transfer')}
           className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <ArrowRight size={20} />
            Transfer
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Depo Ekle
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Depo adı, kod veya şehir ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredWarehouses.map((warehouse) => (
          <div key={warehouse.id} className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{warehouse.name}</h3>
                  <p className="text-sm text-gray-500">Kod: {warehouse.code}</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={warehouse.is_active}
                      onChange={(e) => handleStatusChange(warehouse, e.target.checked)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      disabled={!isAdmin}
                    />
                    <span className="text-sm text-gray-600">Aktif</span>
                  </label>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSelectedWarehouse(warehouse);
                        setShowEditModal(true);
                      }}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {warehouse.operator && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Operatör: {warehouse.operator.name}
                  </p>
                </div>
              )}

              {(warehouse.address || warehouse.city) && (
                <div className="mt-4 flex items-start gap-2">
                  <MapPin size={16} className="text-gray-400 mt-1" />
                  <div className="text-sm text-gray-600">
                    {warehouse.address && <p>{warehouse.address}</p>}
                    {warehouse.city && <p>{warehouse.city}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Package size={16} />
                  Ürünler
                </h4>
                <button
                  onClick={() => {
                    setSelectedWarehouse(warehouse);
                    setShowStockModal(true);
                  }}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  Stok Güncelle
                </button>
              </div>
              
              {warehouse.items.length === 0 ? (
                <p className="text-sm text-gray-500">Bu depoda henüz ürün bulunmuyor.</p>
              ) : (
                <div className="space-y-3">
                  {warehouse.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.product.name}</p>
                      </div>
                      <div className="text-sm text-gray-600">
                        {item.quantity} {item.product.unit_type}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AddWarehouseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={fetchWarehouses}
      />

      {selectedWarehouse && showStockModal && (
        <StockUpdateModal
          isOpen={showStockModal}
          onClose={() => {
            setShowStockModal(false);
            setSelectedWarehouse(null);
          }}
          warehouse={selectedWarehouse}
          onSave={fetchWarehouses}
        />
      )}

      {selectedWarehouse && showEditModal && (
        <EditWarehouseModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedWarehouse(null);
          }}
          warehouse={selectedWarehouse}
          onSave={fetchWarehouses}
        />
      )}
    </div>
  );
};

export default Warehouses;