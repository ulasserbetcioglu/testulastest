import React, { useState, useEffect } from 'react';
import { Plus, Search, ArrowRight, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import AddTransferModal from '../components/Warehouses/AddTransferModal';

interface Transfer {
  id: string;
  source_warehouse: {
    id: string;
    name: string;
  };
  target_warehouse: {
    id: string;
    name: string;
  };
  product: {
    id: string;
    name: string;
    unit_type: string;
  };
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string | null;
  transfer_date: string;
  created_at: string;
}

const WarehouseTransfers: React.FC = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchTransfers();
  }, []);

  const checkAdminAccess = async () => {
    const localSession = localAuth.getSession();
    if (localSession) {
      setIsAdmin(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    setIsAdmin(user?.email === 'admin@ilaclamatik.com');
  };

  const fetchTransfers = async () => {
    try {
      let query = supabase
        .from('warehouse_transfers')
        .select(`
          *,
          source_warehouse:source_warehouse_id (id, name),
          target_warehouse:target_warehouse_id (id, name),
          product:product_id (id, name, unit_type)
        `)
        .order('created_at', { ascending: false });

      const localSession = localAuth.getSession();
      if (localSession && localSession.type === 'operator') {
        const { data: warehouseData } = await supabase
          .from('warehouses')
          .select('id')
          .eq('operator_id', localSession.id);

        if (warehouseData && warehouseData.length > 0) {
          const warehouseIds = warehouseData.map(w => w.id);
          query = query.or(`source_warehouse_id.in.(${warehouseIds.join(',')}),target_warehouse_id.in.(${warehouseIds.join(',')})`);
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email !== 'admin@ilaclamatik.com') {
          const { data: operatorData } = await supabase
            .from('operators')
            .select('id')
            .eq('auth_id', user?.id)
            .maybeSingle();

          if (operatorData) {
            const { data: warehouseData } = await supabase
              .from('warehouses')
              .select('id')
              .eq('operator_id', operatorData.id);

            if (warehouseData && warehouseData.length > 0) {
              const warehouseIds = warehouseData.map(w => w.id);
              query = query.or(`source_warehouse_id.in.(${warehouseIds.join(',')}),target_warehouse_id.in.(${warehouseIds.join(',')})`);
            }
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransfers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (transferId: string, newStatus: 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('warehouse_transfers')
        .update({ status: newStatus })
        .eq('id', transferId);

      if (error) throw error;
      
      // If completing the transfer, update the stock levels
      if (newStatus === 'completed') {
        const transfer = transfers.find(t => t.id === transferId);
        if (transfer) {
          // First check if the source warehouse has enough stock
          const { data: sourceItem, error: sourceError } = await supabase
            .from('warehouse_items')
            .select('id, quantity')
            .eq('warehouse_id', transfer.source_warehouse.id)
            .eq('product_id', transfer.product.id)
            .single();
            
          if (sourceError) throw sourceError;
          
          if (!sourceItem || sourceItem.quantity < transfer.quantity) {
            throw new Error('Kaynak depoda yeterli stok bulunmuyor');
          }
          
          // Decrease stock in source warehouse
          const { error: updateSourceError } = await supabase
            .from('warehouse_items')
            .update({ quantity: sourceItem.quantity - transfer.quantity })
            .eq('id', sourceItem.id);
            
          if (updateSourceError) throw updateSourceError;
          
          // Check if product exists in target warehouse
          const { data: targetItem, error: targetError } = await supabase
            .from('warehouse_items')
            .select('id, quantity')
            .eq('warehouse_id', transfer.target_warehouse.id)
            .eq('product_id', transfer.product.id)
            .maybeSingle();
            
          if (targetError) throw targetError;
          
          if (targetItem) {
            // Update existing item in target warehouse
            const { error: updateTargetError } = await supabase
              .from('warehouse_items')
              .update({ quantity: targetItem.quantity + transfer.quantity })
              .eq('id', targetItem.id);
              
            if (updateTargetError) throw updateTargetError;
          } else {
            // Create new item in target warehouse
            const { error: insertError } = await supabase
              .from('warehouse_items')
              .insert({
                warehouse_id: transfer.target_warehouse.id,
                product_id: transfer.product.id,
                quantity: transfer.quantity
              });
              
            if (insertError) throw insertError;
          }
        }
      }
      
      fetchTransfers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status: string, transferId: string) => {
    if (!isAdmin) {
      switch (status) {
        case 'completed':
          return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">Tamamlandı</span>;
        case 'cancelled':
          return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">İptal Edildi</span>;
        default:
          return <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">Beklemede</span>;
      }
    }

    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">Tamamlandı</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">İptal Edildi</span>;
      default:
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusChange(transferId, 'completed')}
              className="p-1 text-green-600 hover:text-green-800"
              title="Onayla"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => handleStatusChange(transferId, 'cancelled')}
              className="p-1 text-red-600 hover:text-red-800"
              title="Reddet"
            >
              <X size={16} />
            </button>
            <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
              Beklemede
            </span>
          </div>
        );
    }
  };

  const filteredTransfers = transfers.filter(transfer => {
    const searchString = searchTerm.toLowerCase();
    return (
      transfer.source_warehouse.name.toLowerCase().includes(searchString) ||
      transfer.target_warehouse.name.toLowerCase().includes(searchString) ||
      transfer.product.name.toLowerCase().includes(searchString)
    );
  });

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">DEPOLAR ARASI TRANSFER</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Plus size={20} />
          Yeni Transfer
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm"
          />
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        </div>
      </div>

      {/* Mobile card view */}
      <div className="block md:hidden space-y-3">
        {filteredTransfers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500 text-sm">
            Henuz transfer kaydi bulunmuyor
          </div>
        ) : (
          filteredTransfers.map((transfer) => (
            <div key={transfer.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 font-medium">
                  {new Date(transfer.transfer_date).toLocaleDateString('tr-TR')}
                </span>
                {getStatusBadge(transfer.status, transfer.id)}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Kaynak</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{transfer.source_warehouse.name}</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Hedef</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{transfer.target_warehouse.name}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-700">{transfer.product.name}</span>
                <span className="text-sm font-bold text-gray-900">
                  {transfer.quantity} {transfer.product.unit_type}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kaynak Depo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hedef Depo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Urun
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Miktar
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Henuz transfer kaydi bulunmuyor
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transfer.transfer_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.source_warehouse.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.target_warehouse.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                      {transfer.quantity} {transfer.product.unit_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(transfer.status, transfer.id)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddTransferModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={fetchTransfers}
      />
    </div>
  );
};

export default WarehouseTransfers;