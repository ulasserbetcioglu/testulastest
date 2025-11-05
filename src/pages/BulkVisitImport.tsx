import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Plus, Trash2, Calendar, User, Building, Package, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
}

interface Operator {
  id: string;
  name: string;
}

interface PaidProduct {
  id: string;
  name: string;
  unit_type: string;
  price: number;
}

interface PaidMaterialItem {
  productId: string;
  quantity: number;
}

const BulkVisitImport: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [paidProducts, setPaidProducts] = useState<PaidProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    branchId: '',
    visitDate: new Date().toISOString().split('T')[0],
    operatorId: '',
    paidMaterials: [{ productId: '', quantity: 1 }] as PaidMaterialItem[],
  });

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const isAdminUser = user?.email === 'admin@ilaclamatik.com';
      setIsAdmin(isAdminUser);

      if (!isAdminUser) {
        toast.error('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
        navigate('/');
      }
    };
    checkAdminAccess();
  }, [navigate]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [customersRes, branchesRes, operatorsRes, paidProductsRes] = await Promise.all([
          supabase.from('customers').select('id, kisa_isim').order('kisa_isim'),
          supabase.from('branches').select('id, sube_adi, customer_id').order('sube_adi'),
          supabase.from('operators').select('id, name').order('name'),
          supabase.from('paid_products').select('id, name, unit_type, price').eq('is_active', true).order('name'),
        ]);

        if (customersRes.error) throw customersRes.error;
        if (branchesRes.error) throw branchesRes.error;
        if (operatorsRes.error) throw operatorsRes.error;
        if (paidProductsRes.error) throw paidProductsRes.error;

        setCustomers(customersRes.data || []);
        setBranches(branchesRes.data || []);
        setOperators(operatorsRes.data || []);
        setPaidProducts(paidProductsRes.data || []);
      } catch (err: any) {
        toast.error('Veriler yüklenirken hata oluştu: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [isAdmin]);

  const filteredBranches = useMemo(() => {
    if (!formData.customerId) return branches;
    return branches.filter(branch => branch.customer_id === formData.customerId);
  }, [formData.customerId, branches]);

  const handlePaidMaterialChange = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    const newPaidMaterials = [...formData.paidMaterials];
    newPaidMaterials[index] = {
      ...newPaidMaterials[index],
      [field]: value,
    };
    setFormData(prev => ({ ...prev, paidMaterials: newPaidMaterials }));
  };

  const addPaidMaterialRow = () => {
    setFormData(prev => ({
      ...prev,
      paidMaterials: [...prev.paidMaterials, { productId: '', quantity: 1 }],
    }));
  };

  const removePaidMaterialRow = (index: number) => {
    const newPaidMaterials = formData.paidMaterials.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, paidMaterials: newPaidMaterials }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Create Visit Record
      const { data: visitData, error: visitError } = await supabase
        .from('visits')
        .insert({
          customer_id: formData.customerId,
          branch_id: formData.branchId || null,
          operator_id: formData.operatorId,
          visit_date: formData.visitDate,
          status: 'completed', // Default to completed for past visits
          visit_type: 'ucretli', // Default to paid visit
        })
        .select()
        .single();

      if (visitError) throw visitError;

      // 2. Create Paid Material Sale Record if materials exist
      const validPaidMaterials = formData.paidMaterials.filter(
        item => item.productId && item.quantity > 0
      );

      if (validPaidMaterials.length > 0) {
        let totalAmount = 0;
        const saleItemsPayload = validPaidMaterials.map(item => {
          const product = paidProducts.find(p => p.id === item.productId);
          if (!product) throw new Error(`Ürün bulunamadı: ${item.productId}`);

          const unitPrice = product.price;
          const totalPrice = item.quantity * unitPrice;
          totalAmount += totalPrice;

          return {
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
          };
        });

        const { data: saleData, error: saleError } = await supabase
          .from('paid_material_sales')
          .insert({
            customer_id: formData.customerId,
            branch_id: formData.branchId || null,
            visit_id: visitData.id,
            sale_date: formData.visitDate,
            status: 'approved', // Default to approved
            total_amount: totalAmount,
            notes: 'Geçmiş ziyaret aktarımı',
          })
          .select()
          .single();

        if (saleError) throw saleError;

        // 3. Create Paid Material Sale Items Records
        const saleItemsWithSaleId = saleItemsPayload.map(item => ({
          ...item,
          sale_id: saleData.id,
        }));

        const { error: saleItemsError } = await supabase
          .from('paid_material_sale_items')
          .insert(saleItemsWithSaleId);

        if (saleItemsError) throw saleItemsError;
      }

      toast.success('Geçmiş ziyaret başarıyla aktarıldı!');
      // Reset form
      setFormData({
        customerId: '',
        branchId: '',
        visitDate: new Date().toISOString().split('T')[0],
        operatorId: '',
        paidMaterials: [{ productId: '', quantity: 1 }],
      });
    } catch (err: any) {
      toast.error('Aktarım sırasında hata oluştu: ' + err.message);
      console.error('Bulk import error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Calendar className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Toplu Ziyaret Aktarımı</h1>
        </div>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Müşteri ve Şube Seçimi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
                <User size={14} className="inline-block mr-1" /> Müşteri
              </label>
              <select
                id="customer"
                value={formData.customerId}
                onChange={e => setFormData(prev => ({ ...prev, customerId: e.target.value, branchId: '' }))}
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Müşteri Seçin</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.kisa_isim}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">
                <Building size={14} className="inline-block mr-1" /> Şube
              </label>
              <select
                id="branch"
                value={formData.branchId}
                onChange={e => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">Şube Seçin (Opsiyonel)</option>
                {filteredBranches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.sube_adi}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ziyaret Tarihi ve Operatör */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="visitDate" className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={14} className="inline-block mr-1" /> Ziyaret Tarihi
              </label>
              <input
                type="date"
                id="visitDate"
                value={formData.visitDate}
                onChange={e => setFormData(prev => ({ ...prev, visitDate: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label htmlFor="operator" className="block text-sm font-medium text-gray-700 mb-1">
                <User size={14} className="inline-block mr-1" /> Operatör
              </label>
              <select
                id="operator"
                value={formData.operatorId}
                onChange={e => setFormData(prev => ({ ...prev, operatorId: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Operatör Seçin</option>
                {operators.map(operator => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ücretli Malzemeler */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
              <Package size={18} className="mr-2" /> Ücretli Malzemeler (Opsiyonel)
            </h3>
            <div className="space-y-3">
              {formData.paidMaterials.map((material, index) => (
                <div key={index} className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex-1">
                    <label htmlFor={`product-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Ürün
                    </label>
                    <select
                      id={`product-${index}`}
                      value={material.productId}
                      onChange={e => handlePaidMaterialChange(index, 'productId', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Ürün Seçin</option>
                      {paidProducts.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.price} ₺/{product.unit_type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label htmlFor={`quantity-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Miktar
                    </label>
                    <input
                      type="number"
                      id={`quantity-${index}`}
                      value={material.quantity}
                      onChange={e => handlePaidMaterialChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      min="0"
                    />
                  </div>
                  {formData.paidMaterials.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaidMaterialRow(index)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addPaidMaterialRow}
                className="w-full flex items-center justify-center gap-2 p-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <Plus size={18} /> Malzeme Ekle
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 p-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {isSubmitting ? 'Aktarılıyor...' : 'Ziyareti Aktar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkVisitImport;
