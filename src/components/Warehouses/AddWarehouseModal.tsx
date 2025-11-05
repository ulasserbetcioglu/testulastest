import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface Product {
  id: string;
  name: string;
  unit_type: string;
}

interface Operator {
  id: string;
  name: string;
  email: string;
}

interface WarehouseItem {
  product_id: string;
  quantity: number;
}

const AddWarehouseModal: React.FC<AddWarehouseModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    is_active: true,
    operator_id: ''
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warehouseType, setWarehouseType] = useState<'main' | 'operator'>('main');

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      fetchOperators();
    }
  }, [isOpen]);

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

  const fetchOperators = async () => {
    try {
      const { data, error } = await supabase
        .from('operators')
        .select('id, name, email')
        .eq('status', 'Açık')
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
      // First create the warehouse
      const { data: warehouse, error: warehouseError } = await supabase
        .from('warehouses')
        .insert([{
          name: formData.name,
          code: formData.code,
          address: formData.address,
          city: formData.city,
          is_active: formData.is_active,
          operator_id: warehouseType === 'operator' ? formData.operator_id : null
        }])
        .select()
        .single();

      if (warehouseError) throw warehouseError;

      // Then create warehouse items
      if (items.length > 0) {
        const warehouseItems = items.map(item => ({
          warehouse_id: warehouse.id,
          product_id: item.product_id,
          quantity: item.quantity
        }));

        const { error: itemsError } = await supabase
          .from('warehouse_items')
          .insert(warehouseItems);

        if (itemsError) throw itemsError;
      }

      onSave();
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      is_active: true,
      operator_id: ''
    });
    setItems([]);
    setWarehouseType('main');
  };

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof WarehouseItem, value: string | number) => {
    setItems(items.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const getProductUnitType = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.unit_type || '';
  };

  const generateCode = () => {
    if (warehouseType === 'main') {
      const randomCode = 'MAIN-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      setFormData({ ...formData, code: randomCode });
    } else if (warehouseType === 'operator' && formData.operator_id) {
      const operator = operators.find(op => op.id === formData.operator_id);
      if (operator) {
        const operatorCode = operator.name
          .replace(/[^a-zA-Z0-9]/g, '')
          .substring(0, 10)
          .toUpperCase();
        setFormData({ ...formData, code: `OP-${operatorCode}` });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Yeni Depo</h2>
          <button onClick={() => {
            onClose();
            resetForm();
          }} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Depo Tipi
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="warehouseType"
                    value="main"
                    checked={warehouseType === 'main'}
                    onChange={() => {
                      setWarehouseType('main');
                      setFormData({ ...formData, operator_id: '' });
                    }}
                    className="mr-2"
                  />
                  Ana Depo
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="warehouseType"
                    value="operator"
                    checked={warehouseType === 'operator'}
                    onChange={() => setWarehouseType('operator')}
                    className="mr-2"
                  />
                  Operatör Deposu
                </label>
              </div>
            </div>

            {warehouseType === 'operator' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operatör
                </label>
                <select
                  value={formData.operator_id}
                  onChange={(e) => {
                    setFormData({ ...formData, operator_id: e.target.value });
                    // Auto-generate name based on operator
                    if (e.target.value) {
                      const operator = operators.find(op => op.id === e.target.value);
                      if (operator) {
                        setFormData(prev => ({
                          ...prev,
                          operator_id: e.target.value,
                          name: `${operator.name} Deposu`
                        }));
                      }
                    }
                  }}
                  className="w-full p-2 border rounded"
                  required={warehouseType === 'operator'}
                >
                  <option value="">Seçiniz</option>
                  {operators.map(operator => (
                    <option key={operator.id} value={operator.id}>
                      {operator.name} ({operator.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Depo Adı
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Depo Kodu
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <button
                type="button"
                onClick={generateCode}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Kod Oluştur
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şehir
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">
                Aktif
              </label>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Başlangıç Stokları</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Ürün Ekle
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ürün
                      </label>
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(index, 'product_id', e.target.value)}
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
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                          className="w-full p-2 border rounded"
                          required
                        />
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {getProductUnitType(item.product_id)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
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

export default AddWarehouseModal;