import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  unit_type: string;
}

interface SelectedProduct {
  product_id: string;
  quantity: number;
}

const AddTransferModal: React.FC<AddTransferModalProps> = ({ isOpen, onClose, onSave }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    source_warehouse_id: '',
    target_warehouse_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([
    { product_id: '', quantity: 1 }
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses();
      fetchProducts();
      setSelectedProducts([{ product_id: '', quantity: 1 }]);
      setError(null);
    }
  }, [isOpen]);

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setWarehouses(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('paid_products')
        .select('id, name, unit_type')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddProduct = () => {
    setSelectedProducts([...selectedProducts, { product_id: '', quantity: 1 }]);
  };

  const handleRemoveProduct = (index: number) => {
    if (selectedProducts.length > 1) {
      const newProducts = [...selectedProducts];
      newProducts.splice(index, 1);
      setSelectedProducts(newProducts);
    }
  };

  const handleProductChange = (index: number, field: keyof SelectedProduct, value: string | number) => {
    const newProducts = [...selectedProducts];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setSelectedProducts(newProducts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.source_warehouse_id || !formData.target_warehouse_id) {
      setError('Lütfen kaynak ve hedef depoları seçiniz.');
      return;
    }
    if (formData.source_warehouse_id === formData.target_warehouse_id) {
      setError('Kaynak ve hedef depo aynı olamaz.');
      return;
    }
    const invalidProduct = selectedProducts.find(p => !p.product_id || p.quantity <= 0);
    if (invalidProduct) {
      setError('Lütfen tüm ürünleri seçiniz ve geçerli bir miktar giriniz.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const transfersToInsert = selectedProducts.map(product => ({
        ...formData,
        product_id: product.product_id,
        quantity: product.quantity,
        status: 'pending',
        created_by: user?.id
      }));

      const { error: insertError } = await supabase.from('warehouse_transfers').insert(transfersToInsert);
      if (insertError) throw insertError;

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl border border-gray-100">
        {/* Simple Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-50 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800 tracking-tight">Yeni Transfer</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide pb-24">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">
              {error}
            </div>
          )}

          {/* Simple Warehouse Pickers */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">KAYNAK DEPO</label>
                <select
                  value={formData.source_warehouse_id}
                  onChange={(e) => setFormData({ ...formData, source_warehouse_id: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg text-sm transition-all"
                  required
                >
                  <option value="">Seçiniz</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">HEDEF DEPO</label>
                <select
                  value={formData.target_warehouse_id}
                  onChange={(e) => setFormData({ ...formData, target_warehouse_id: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg text-sm transition-all"
                  required
                >
                  <option value="">Seçiniz</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Minimal Product Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-0.5">ÜRÜNLER</label>
              <button
                type="button"
                onClick={handleAddProduct}
                className="text-xs font-bold text-green-600 flex items-center gap-1 hover:text-green-700 p-1"
              >
                <Plus size={14} /> Ekle
              </button>
            </div>

            <div className="space-y-2">
              {selectedProducts.map((selected, index) => (
                <div key={index} className="flex gap-2 items-start py-2 group">
                  <div className="flex-1">
                    <select
                      value={selected.product_id}
                      onChange={(e) => handleProductChange(index, 'product_id', e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg text-sm shadow-sm transition-all"
                      required
                    >
                      <option value="">Ürün Seçiniz</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      value={selected.quantity}
                      onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value))}
                      className="w-full h-10 px-3 bg-white border border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg text-sm font-bold text-green-600 text-center shadow-sm"
                      required
                    />
                  </div>
                  {selectedProducts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(index)}
                      className="p-2.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Minimal Date and Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-0.5 flex items-center gap-1">
                <Calendar size={10} /> TARİH
              </label>
              <input
                type="date"
                value={formData.transfer_date}
                onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 border border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg text-sm transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-0.5 flex items-center gap-1">
                <FileText size={10} /> NOT
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 border border-gray-200 focus:border-green-500 focus:ring-0 rounded-lg text-sm transition-all"
                placeholder="..."
              />
            </div>
          </div>
        </form>

        {/* Minimal Footer */}
        <div className="p-4 bg-white border-t border-gray-50 flex gap-3 flex-shrink-0 absolute bottom-0 left-0 right-0 sm:relative">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 text-gray-500 text-sm font-semibold hover:bg-gray-50 rounded-xl transition-all"
            disabled={loading}
          >
            İptal
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="flex-[2] h-11 bg-green-600 text-white rounded-xl text-sm font-bold shadow-md shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Transferi Tamamla'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTransferModal;