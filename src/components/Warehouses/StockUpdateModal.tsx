import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StockUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: {
    id: string;
    name: string;
    items: Array<{
      id: string;
      quantity: number;
      product: {
        id: string;
        name: string;
        unit_type: string;
      };
    }>;
  };
  onSave: () => void;
}

interface Product {
  id: string;
  name: string;
  unit_type: string;
}

const StockUpdateModal: React.FC<StockUpdateModalProps> = ({ isOpen, onClose, warehouse, onSave }) => {
  const [existingItems, setExistingItems] = useState<Array<{
    id: string;
    product_id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      unit_type: string;
    };
  }>>([]);
  
  const [newItems, setNewItems] = useState<Array<{
    product_id: string;
    quantity: number;
  }>>([]);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewProducts, setShowNewProducts] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      setExistingItems(warehouse.items.map(item => ({
        id: item.id,
        product_id: item.product.id,
        quantity: item.quantity,
        product: item.product
      })));
      setNewItems([]);
      setShowNewProducts(false);
    }
  }, [isOpen, warehouse]);

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

  const addNewItem = () => {
    setNewItems([...newItems, { product_id: '', quantity: 0 }]);
  };

  const removeNewItem = (index: number) => {
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  const updateExistingItem = (index: number, quantity: number) => {
    const updated = [...existingItems];
    updated[index] = { ...updated[index], quantity };
    setExistingItems(updated);
  };

  const updateNewItem = (index: number, field: 'product_id' | 'quantity', value: string | number) => {
    const updated = [...newItems];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setNewItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Update existing items
      for (const item of existingItems) {
        const { error } = await supabase
          .from('warehouse_items')
          .update({ quantity: item.quantity })
          .eq('id', item.id);

        if (error) throw error;
      }

      // Insert new items
      if (newItems.length > 0) {
        const { error } = await supabase
          .from('warehouse_items')
          .insert(
            newItems.map(item => ({
              warehouse_id: warehouse.id,
              product_id: item.product_id,
              quantity: item.quantity
            }))
          );

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const unusedProducts = products.filter(product => 
    !existingItems.some(item => item.product_id === product.id) &&
    !newItems.some(item => item.product_id === product.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Stok Güncelle - {warehouse.name}</h3>
          <button
            onClick={() => {
              setShowNewProducts(false);
              setNewItems([]);
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Existing Products Section */}
            <div>
              <h3 className="font-medium text-lg mb-4">Mevcut Ürünler</h3>
              {existingItems.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Bu depoda henüz ürün bulunmuyor.</p>
              ) : (
                existingItems.map((item, index) => (
                  <div key={item.id} className="flex gap-4 items-end mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ürün
                      </label>
                      <input
                        type="text"
                        value={item.product.name}
                        className="w-full p-2 border rounded bg-gray-100"
                        disabled
                      />
                    </div>

                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Miktar
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateExistingItem(index, parseInt(e.target.value) || 0)}
                          className="w-full p-2 border rounded"
                          required
                        />
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {item.product.unit_type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* New Products Section */}
            <div className="mt-8 pt-6 border-t">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-lg">Yeni Ürün Ekle</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProducts(!showNewProducts);
                    if (!showNewProducts && newItems.length === 0) {
                      addNewItem();
                    }
                  }}
                  className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <Plus size={16} />
                  {showNewProducts ? 'Gizle' : 'Göster'}
                </button>
              </div>

              {showNewProducts && (
                <div className="space-y-4">
                  {newItems.map((item, index) => (
                    <div key={`new-${index}`} className="flex gap-4 items-end p-4 bg-green-50 rounded-lg">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ürün
                        </label>
                        <select
                          value={item.product_id}
                          onChange={(e) => updateNewItem(index, 'product_id', e.target.value)}
                          className="w-full p-2 border rounded"
                          required
                        >
                          <option value="">Seçiniz</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-32">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Miktar
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateNewItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full p-2 border rounded"
                            required
                          />
                          <span className="text-sm text-gray-500 whitespace-nowrap">
                            {products.find(p => p.id === item.product_id)?.unit_type || ''}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeNewItem(index)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addNewItem}
                    className="mt-4 w-full py-2 px-4 border border-dashed border-green-300 rounded-lg text-green-600 hover:border-green-400 hover:text-green-700 flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Başka Ürün Ekle
                  </button>
                </div>
              )}
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

export default StockUpdateModal;