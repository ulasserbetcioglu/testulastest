import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Package, Plus, Search, Edit, Trash2, X, Loader2, Save, ToggleLeft, ToggleRight, Tags } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// --- ARAYÜZLER (INTERFACES) ---
interface Product {
  id: string;
  name: string;
  price: number; // Liste Fiyatı
  vat_rate: number;
  unit_type: string;
  is_active: boolean;
  order_no?: number;
}

interface PriceCategory {
  id: string;
  name: string;
  description?: string;
}

interface ProductCategoryPrice {
  product_id: string;
  category_id: string;
  price: number;
}

// --- FİYAT KATEGORİSİ YÖNETİM MODALI ---
const CategoryManagementModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [categories, setCategories] = useState<PriceCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    const fetchCategories = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('price_categories').select('*').order('name');
        if (error) toast.error("Kategoriler yüklenemedi.");
        else setCategories(data || []);
        setLoading(false);
    };

    const handleCategoryChange = (id: string, field: keyof PriceCategory, value: string) => {
        setCategories(prev => prev.map(cat => cat.id === id ? { ...cat, [field]: value } : cat));
    };

    const handleAddCategory = () => {
        setCategories(prev => [...prev, { id: uuidv4(), name: '', description: '' }]);
    };

    const handleRemoveCategory = (id: string) => {
        setCategories(prev => prev.filter(cat => cat.id !== id));
    };

    const handleSaveChanges = async () => {
        setLoading(true);
        try {
            // Önce tüm kategorileri silip sonra güncel listeyi eklemek yerine upsert kullanalım
            const { error } = await supabase.from('price_categories').upsert(categories);
            if (error) throw error;
            toast.success("Fiyat kategorileri başarıyla güncellendi.");
            onSave();
            onClose();
        } catch (error: any) {
            toast.error("Kategoriler kaydedilirken bir hata oluştu: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
                <h2 className="text-xl font-bold mb-4">Fiyat Kategorilerini Yönet</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {categories.map((cat) => (
                        <div key={cat.id} className="flex items-center gap-2">
                            <input type="text" placeholder="Kategori Adı (örn: Bayi Fiyatı)" value={cat.name} onChange={e => handleCategoryChange(cat.id, 'name', e.target.value)} className="w-full p-2 border rounded-md"/>
                            <button onClick={() => handleRemoveCategory(cat.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
                <button onClick={handleAddCategory} className="mt-4 text-sm text-blue-600 hover:text-blue-800">+ Yeni Kategori Ekle</button>
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Kapat</button>
                    <button onClick={handleSaveChanges} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">{loading ? <Loader2 className="animate-spin" /> : <Save />} Kaydet</button>
                </div>
            </div>
        </div>
    );
};


// --- ÜRÜN DÜZENLEME/EKLEME MODALI ---
const ProductModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product, categoryPrices: Map<string, number>) => void;
  product: Product | null;
  priceCategories: PriceCategory[];
}> = ({ isOpen, onClose, onSave, product, priceCategories }) => {
  const [formData, setFormData] = useState<Product | null>(null);
  const [categoryPrices, setCategoryPrices] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (product) {
      setFormData(product);
      // Mevcut ürüne ait kategori fiyatlarını çek
      const fetchPrices = async () => {
        const { data, error } = await supabase.from('product_category_prices').select('*').eq('product_id', product.id);
        if (error) {
            toast.error("Kategori fiyatları yüklenemedi.");
        } else {
            const priceMap = new Map<string, number>();
            data?.forEach(p => priceMap.set(p.category_id, p.price));
            setCategoryPrices(priceMap);
        }
      };
      fetchPrices();
    } else {
      setFormData({ id: '', name: '', price: 0, vat_rate: 20, unit_type: 'adet', is_active: true });
      setCategoryPrices(new Map());
    }
  }, [product, isOpen]);

  const handleChange = (field: keyof Product, value: any) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleCategoryPriceChange = (categoryId: string, value: string) => {
    const newPrices = new Map(categoryPrices);
    const priceValue = parseFloat(value);
    if (!isNaN(priceValue) && value.trim() !== '') {
        newPrices.set(categoryId, priceValue);
    } else {
        newPrices.delete(categoryId);
    }
    setCategoryPrices(newPrices);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData, categoryPrices);
    }
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <h2 className="text-xl font-bold mb-4">{product ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
          <div><label className="block text-sm font-medium text-gray-700">Ürün Adı</label><input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full p-2 mt-1 border rounded-md" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700">Liste Fiyatı (₺)</label><input type="number" step="0.01" value={formData.price} onChange={(e) => handleChange('price', parseFloat(e.target.value))} className="w-full p-2 mt-1 border rounded-md" required /></div>
            <div><label className="block text-sm font-medium text-gray-700">KDV Oranı (%)</label><input type="number" value={formData.vat_rate} onChange={(e) => handleChange('vat_rate', parseInt(e.target.value))} className="w-full p-2 mt-1 border rounded-md" required /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700">Birim Tipi</label><input type="text" value={formData.unit_type} onChange={(e) => handleChange('unit_type', e.target.value)} className="w-full p-2 mt-1 border rounded-md" placeholder="adet, kg, lt, vb." required /></div>
          
          <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Kategori Fiyatları</h3>
              <div className="space-y-3">
                  {priceCategories.map(cat => (
                      <div key={cat.id}>
                          <label className="block text-sm font-medium text-gray-700">{cat.name}</label>
                          <input type="number" step="0.01" placeholder={`Varsayılan: ${formData.price.toLocaleString('tr-TR')} ₺`} value={categoryPrices.get(cat.id) || ''} onChange={(e) => handleCategoryPriceChange(cat.id, e.target.value)} className="w-full p-2 mt-1 border rounded-md" />
                      </div>
                  ))}
              </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <label className="text-sm font-medium text-gray-700">Durum</label>
            <button type="button" onClick={() => handleChange('is_active', !formData.is_active)} className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${formData.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {formData.is_active ? <ToggleRight className="text-green-500" /> : <ToggleLeft />}
              {formData.is_active ? 'Aktif' : 'Pasif'}
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">İptal</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"><Save size={16} /> Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- ANA SAYFA BİLEŞENİ ---
const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('paid_products').select('*').order('name', { ascending: true }),
        supabase.from('price_categories').select('*').order('name')
      ]);
      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      setProducts(productsRes.data || []);
      setPriceCategories(categoriesRes.data || []);
    } catch (error: any) {
      toast.error("Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleOpenProductModal = (product: Product | null = null) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (productData: Product, categoryPrices: Map<string, number>) => {
    setSaving(true);
    try {
      const { isNew, ...dbData } = productData as any;
      const { data: savedProduct, error: productError } = await supabase.from('paid_products').upsert(dbData).select().single();
      if (productError) throw productError;
      
      // Müşteriye özel fiyatları güncelle
      const productId = savedProduct.id;
      const { error: deleteError } = await supabase.from('product_category_prices').delete().eq('product_id', productId);
      if (deleteError) throw deleteError;

      if (categoryPrices.size > 0) {
        const pricesToInsert = Array.from(categoryPrices.entries()).map(([category_id, price]) => ({
            product_id: productId,
            category_id,
            price
        }));
        const { error: insertError } = await supabase.from('product_category_prices').insert(pricesToInsert);
        if (insertError) throw insertError;
      }
      
      toast.success(`Ürün "${productData.name}" başarıyla kaydedildi.`);
      setShowProductModal(false);
      fetchAllData();
    } catch (error: any) {
      toast.error("Ürün kaydedilirken bir hata oluştu: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
      try {
        const { error } = await supabase.from('paid_products').delete().eq('id', productId);
        if (error) throw error;
        toast.success("Ürün başarıyla silindi.");
        fetchAllData();
      } catch (error: any) {
        toast.error("Ürün silinirken bir hata oluştu: " + error.message);
      }
    }
  };
  
  const filteredProducts = useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [products, searchTerm]
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Ürün Listesi Yönetimi</h1>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowCategoryModal(true)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2">
                <Tags size={18} /> Kategorileri Yönet
            </button>
            <button onClick={() => handleOpenProductModal(null)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus size={18} /> Yeni Ürün Ekle
            </button>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="relative mb-4">
          <input type="text" placeholder="Ürün adıyla ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 pl-10 border border-gray-300 rounded-lg" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        </div>

        {loading ? (
          <div className="text-center py-10"><Loader2 className="animate-spin inline-block text-gray-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Liste Fiyatı</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">KDV</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Birim</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{product.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">% {product.vat_rate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{product.unit_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-4">
                        <button onClick={() => handleOpenProductModal(product)} className="text-blue-600 hover:text-blue-900"><Edit size={18}/></button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* DÜZELTME: Modal çağrısı doğru state değişkenleriyle güncellendi */}
      <ProductModal 
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSave={handleSaveProduct}
        product={editingProduct}
        priceCategories={priceCategories}
      />
      <CategoryManagementModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={fetchAllData}
      />
    </div>
  );
};

export default AdminProducts;
