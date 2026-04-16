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
    const statusConfig = {
      completed: {
        label: 'Tamamlandı',
        classes: 'bg-green-50 text-green-700 border-green-100',
        dot: 'bg-green-500'
      },
      cancelled: {
        label: 'İptal Edildi',
        classes: 'bg-red-50 text-red-700 border-red-100',
        dot: 'bg-red-500'
      },
      pending: {
        label: 'Beklemede',
        classes: 'bg-yellow-50 text-yellow-700 border-yellow-100',
        dot: 'bg-yellow-500'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    if (!isAdmin || status !== 'pending') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${config.classes} uppercase tracking-wider`}>
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`}></span>
          {config.label}
        </span>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleStatusChange(transferId, 'completed')}
          className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors border border-green-100 shadow-sm"
          title="Onayla"
        >
          <Check size={14} />
        </button>
        <button
          onClick={() => handleStatusChange(transferId, 'cancelled')}
          className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-100 shadow-sm"
          title="Reddet"
        >
          <X size={14} />
        </button>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${config.classes} uppercase tracking-wider`}>
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`}></span>
          {config.label}
        </span>
      </div>
    );
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
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 pb-20 sm:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm sm:bg-transparent sm:p-0 sm:shadow-none">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">DEPOLAR ARASI TRANSFER</h1>
          <p className="text-sm text-gray-500 mt-1 sm:hidden">Tüm transfer geçmişi ve yeni işlemler</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 font-semibold shadow-lg shadow-green-200"
        >
          <Plus size={20} />
          Yeni Transfer
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Depo veya ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none focus:ring-2 focus:ring-green-500 rounded-xl text-sm transition-all"
          />
          <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
        </div>
      </div>

      {/* Mobile card view */}
      <div className="block md:hidden space-y-4">
        {filteredTransfers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center border-2 border-dashed border-gray-200">
            <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              <Search className="text-gray-300" size={24} />
            </div>
            <p className="text-gray-500 text-sm font-medium">Henüz transfer kaydı bulunmuyor</p>
          </div>
        ) : (
          filteredTransfers.map((transfer) => (
            <div key={transfer.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:bg-gray-50 transition-colors">
              <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    {new Date(transfer.transfer_date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' })}
                  </span>
                </div>
                {getStatusBadge(transfer.status, transfer.id)}
              </div>

              <div className="p-4">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">KAYNAK DEPO</p>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{transfer.source_warehouse.name}</p>
                  </div>
                  <div className="pt-4">
                    <div className="p-1.5 bg-gray-100 rounded-full">
                      <ArrowRight size={14} className="text-gray-400" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1 text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">HEDEF DEPO</p>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{transfer.target_warehouse.name}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">ÜRÜN</span>
                    <span className="text-sm font-medium text-gray-700">{transfer.product.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-green-600">
                      {transfer.quantity}
                    </span>
                    <span className="ml-1 text-xs font-bold text-gray-500 uppercase">{transfer.product.unit_type}</span>
                  </div>
                </div>

                {transfer.notes && (
                  <div className="mt-3 text-xs text-gray-500 italic bg-yellow-50/50 p-2 rounded-lg border border-yellow-100">
                    "{transfer.notes}"
                  </div>
                )}
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