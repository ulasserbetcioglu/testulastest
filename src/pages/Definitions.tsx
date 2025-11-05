import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { Save, Plus, Trash2, X, Edit, Loader2, AlertTriangle, DollarSign } from 'lucide-react';

// --- ARAYÜZLER (INTERFACES) ---
interface Property {
  type: 'string' | 'number' | 'boolean';
  label: string;
}

interface DefinitionItem {
  id: string;
  name: string;
  order_no: number;
  is_active: boolean;
  code?: string;
  type?: string;
  properties?: Record<string, Property>;
  active_ingredient?: string;
  quantity?: number;
  unit_type?: string;
  package_type?: string;
  license_number?: string;
  license_date?: string;
  price?: number;
  vat_rate?: number;
  isNew?: boolean;
}

interface DefinitionCategory {
  id: string;
  name: string;
  table: string;
  items: DefinitionItem[];
}

interface Customer {
  id: string;
  kisa_isim: string;
}

interface CustomerPrice {
  product_id: string;
  price: number;
}

// --- MODAL BİLEŞENİ: YENİ ÖZELLİK EKLEME ---
const PropertyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string, property: Property) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [type, setType] = useState<'string' | 'number' | 'boolean'>('string');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label) {
      toast.error("Özellik Adı boş bırakılamaz.");
      return;
    }
    const generatedKey = key || label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    onSave(generatedKey, { type, label });
    onClose();
    setLabel(''); setKey(''); setType('string');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Ekipman Özelliği Ekle</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Özellik Adı</label>
              <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="w-full p-2 border rounded-md" placeholder="Örn: Hamam Böceği Sayısı" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Veri Tipi</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-2 border rounded-md">
                <option value="string">Metin</option>
                <option value="number">Sayı</option>
                <option value="boolean">Evet/Hayır</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">İptal</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Ekle</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- BİLEŞEN: TEK BİR TANIMLAMA KARTI ---
const DefinitionItemCard: React.FC<{
  item: DefinitionItem;
  category: DefinitionCategory;
  onUpdate: (item: DefinitionItem) => Promise<void>;
  onDelete: (itemId: string, tableName: string) => void;
  onCancelNew: (itemId: string) => void;
  onAddProperty: (itemId: string) => void;
  onDeleteProperty: (itemId: string, propertyKey: string) => void;
  isAdmin: boolean;
}> = ({ item, category, onUpdate, onDelete, onCancelNew, onAddProperty, onDeleteProperty, isAdmin }) => {
  const [isEditing, setIsEditing] = useState(item.isNew || false);
  const [loading, setLoading] = useState(false);
  const [editedItem, setEditedItem] = useState<DefinitionItem>(item);

  const handleSave = async () => {
    if (!editedItem.name) {
      toast.error("İsim alanı boş bırakılamaz.");
      return;
    }
    setLoading(true);
    await onUpdate(editedItem);
    setLoading(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (item.isNew) {
      onCancelNew(item.id);
    } else {
      setEditedItem(item);
      setIsEditing(false);
    }
  };

  const handleChange = (field: keyof DefinitionItem, value: any) => {
    setEditedItem(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border transition-all duration-300 ${isEditing ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div><label className="text-xs font-medium text-gray-500">İsim</label><input type="text" value={editedItem.name} onChange={(e) => handleChange('name', e.target.value)} disabled={!isEditing} className="w-full p-2 border rounded-md mt-1 disabled:bg-gray-100" /></div>
        <div><label className="text-xs font-medium text-gray-500">Kod</label><input type="text" value={editedItem.code || ''} onChange={(e) => handleChange('code', e.target.value)} disabled={!isEditing} className="w-full p-2 border rounded-md mt-1 disabled:bg-gray-100" /></div>
        <div><label className="text-xs font-medium text-gray-500">Tip</label><input type="text" value={editedItem.type || ''} onChange={(e) => handleChange('type', e.target.value)} disabled={!isEditing} className="w-full p-2 border rounded-md mt-1 disabled:bg-gray-100" /></div>
        
        {category.id === 'biocidal' && (
            <>
                <div><label className="text-xs font-medium text-gray-500">Aktif Madde</label><input type="text" value={editedItem.active_ingredient || ''} onChange={(e) => handleChange('active_ingredient', e.target.value)} disabled={!isEditing} className="w-full p-2 border rounded-md mt-1 disabled:bg-gray-100" /></div>
                <div><label className="text-xs font-medium text-gray-500">Birim</label><input type="text" value={editedItem.unit_type || ''} onChange={(e) => handleChange('unit_type', e.target.value)} disabled={!isEditing} className="w-full p-2 border rounded-md mt-1 disabled:bg-gray-100" /></div>
            </>
        )}

        {category.id === 'paid' && (
            <>
                <div><label className="text-xs font-medium text-gray-500">Liste Fiyatı (₺)</label><input type="number" step="0.01" value={editedItem.price || 0} onChange={(e) => handleChange('price', parseFloat(e.target.value))} disabled={!isEditing} className="w-full p-2 border rounded-md mt-1 disabled:bg-gray-100" /></div>
                <div><label className="text-xs font-medium text-gray-500">KDV (%)</label><input type="number" value={editedItem.vat_rate || 20} onChange={(e) => handleChange('vat_rate', parseInt(e.target.value))} disabled={!isEditing} className="w-full p-2 border rounded-md mt-1 disabled:bg-gray-100" /></div>
                <div><label className="text-xs font-medium text-gray-500">Birim</label><input type="text" value={editedItem.unit_type || ''} onChange={(e) => handleChange('unit_type', e.target.value)} disabled={!isEditing} className="w-full p-2 border rounded-md mt-1 disabled:bg-gray-100" /></div>
            </>
        )}
      </div>
      
      {/* Ekipman Özellikleri Bölümü */}
      {category.id === 'equipment' && (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-4 pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-700">Ekipman Özellikleri (Kontrol Listesi)</h4>
                {isEditing && (<button onClick={() => onAddProperty(item.id)} className="text-sm text-blue-600 hover:text-blue-700">+ Özellik Ekle</button>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                {editedItem.properties && Object.entries(editedItem.properties).map(([key, prop]) => (
                    <div key={key} className="flex justify-between items-center text-sm bg-gray-100 p-2 rounded">
                        <span>{prop.label} <span className="text-gray-400">({prop.type})</span></span>
                        {isEditing && (<button onClick={() => onDeleteProperty(item.id, key)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>)}
                    </div>
                ))}
                {(!editedItem.properties || Object.keys(editedItem.properties).length === 0) && (
                    <p className="text-sm text-gray-400 col-span-2">Özellik tanımlanmamış.</p>
                )}
            </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <label className="flex items-center text-sm"><input type="checkbox" checked={editedItem.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} disabled={!isEditing} className="mr-2 h-4 w-4 rounded" />Aktif</label>
        {isAdmin && (
            <div className="flex items-center gap-2">
                {isEditing ? (
                    <>
                        <button onClick={handleSave} disabled={loading} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 flex items-center gap-1 disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Kaydet</button>
                        <button onClick={handleCancel} disabled={loading} className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300">İptal</button>
                    </>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:text-blue-600"><Edit size={16}/></button>
                )}
                <button onClick={() => onDelete(item.id, category.table)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={16}/></button>
            </div>
        )}
      </div>
    </div>
  );
};


// --- ANA SAYFA BİLEŞENİ ---
const initialCategories: DefinitionCategory[] = [
    { id: 'equipment', name: 'Ekipmanlar', table: 'equipment', items: [] },
    { id: 'pests', name: 'Zararlılar', table: 'pests', items: [] },
    { id: 'biocidal', name: 'Biyosidal Ürünler', table: 'biocidal_products', items: [] },
    { id: 'paid', name: 'Ücretli Ürünler', table: 'paid_products', items: [] },
    { id: 'applicationTypes', name: 'Uygulama Tipleri', table: 'application_types', items: [] }
];

const Definitions: React.FC = () => {
  const [categories, setCategories] = useState<DefinitionCategory[]>(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState('equipment');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Müşteri Fiyatlandırma State'leri
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerPrices, setCustomerPrices] = useState<Map<string, number>>(new Map());
  const [saving, setSaving] = useState(false);
  
  // Özellik Modalı State'leri
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, table: string } | null>(null);

  // --- VERİ ÇEKME ---
  const fetchDefinitions = useCallback(async () => {
    setLoading(true);
    try {
      const allPromises = initialCategories.map(cat => supabase.from(cat.table).select('*').order('order_no', { ascending: true }));
      allPromises.push(supabase.from('customers').select('id, kisa_isim').order('kisa_isim'));
      
      const results = await Promise.all(allPromises);
      const customerResult = results.pop();

      const newCategories = initialCategories.map((cat, index) => {
        const { data, error } = results[index];
        if (error) {
          console.error(`Error fetching ${cat.name}:`, error);
          toast.error(`${cat.name} verileri çekilirken hata oluştu.`);
          return { ...cat, items: [] };
        }
        return { ...cat, items: (data as DefinitionItem[]) || [] };
      });
      setCategories(newCategories);
      
      if (customerResult?.error) throw customerResult.error;
      setCustomers(customerResult?.data || []);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); 

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAdmin(user?.email === 'admin@ilaclamatik.com');
    };
    checkAdminStatus();
    fetchDefinitions();
  }, [fetchDefinitions]);

  useEffect(() => {
    if (!selectedCustomerId || selectedCategory !== 'paid') {
      setCustomerPrices(new Map());
      return;
    }

    const fetchCustomerPrices = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('customer_product_prices').select('product_id, price').eq('customer_id', selectedCustomerId);
        if (error) throw error;
        const priceMap = new Map<string, number>();
        data?.forEach(item => priceMap.set(item.product_id, item.price));
        setCustomerPrices(priceMap);
      } catch (error: any) {
        toast.error("Müşteriye özel fiyatlar çekilirken hata oluştu.");
      } finally {
        setLoading(false);
      }
    };
    fetchCustomerPrices();
  }, [selectedCustomerId, selectedCategory]);

  // --- CRUD İŞLEMLERİ ---
  const handleAddItem = () => {
    if (!isAdmin) return;
    const currentCategory = categories.find(cat => cat.id === selectedCategory);
    const newItem: DefinitionItem = {
      id: uuidv4(), name: '', order_no: (currentCategory?.items.length || 0) + 1, is_active: true, isNew: true,
    };
    setCategories(prev => prev.map(cat => 
      cat.id === selectedCategory ? { ...cat, items: [newItem, ...cat.items] } : cat
    ));
  };

  const handleCancelNewItem = (itemId: string) => {
    setCategories(prev => prev.map(cat => 
        cat.id === selectedCategory ? { ...cat, items: cat.items.filter(item => item.id !== itemId) } : cat
    ));
  }

  const handleUpdateItem = async (item: DefinitionItem) => {
    const category = categories.find(cat => cat.id === selectedCategory);
    if (!category) return;
    const { isNew, ...dbData } = item;
    try {
      const { error } = await supabase.from(category.table).upsert(dbData).eq('id', item.id);
      if (error) throw error;
      toast.success(`"${item.name}" başarıyla kaydedildi.`);
      await fetchDefinitions();
    } catch (err: any) {
      toast.error(`Kaydetme hatası: ${err.message}`);
    }
  };

  const confirmDeleteItem = (itemId: string, tableName: string) => {
    setItemToDelete({ id: itemId, table: tableName });
    setShowDeleteConfirm(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      const { error } = await supabase.from(itemToDelete.table).delete().eq('id', itemToDelete.id);
      if (error) throw error;
      toast.success("Öğe başarıyla silindi.");
      setCategories(prev => prev.map(cat => 
        cat.id === selectedCategory ? { ...cat, items: cat.items.filter(item => item.id !== itemToDelete.id) } : cat
      ));
    } catch (err: any) {
      toast.error(`Silme hatası: ${err.message}`);
    } finally {
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const handlePriceChange = (productId: string, newPrice: string) => {
    const newPrices = new Map(customerPrices);
    const priceValue = parseFloat(newPrice);
    if (!isNaN(priceValue) && newPrice.trim() !== '') {
      newPrices.set(productId, priceValue);
    } else {
      newPrices.delete(productId);
    }
    setCustomerPrices(newPrices);
  };

  const handleSaveCustomerPrices = async () => {
    if (!selectedCustomerId) return;
    setSaving(true);
    try {
      const upsertData = Array.from(customerPrices.entries()).map(([product_id, price]) => ({
        customer_id: selectedCustomerId, product_id, price,
      }));
      
      const { error: deleteError } = await supabase.from('customer_product_prices').delete().eq('customer_id', selectedCustomerId);
      if (deleteError) throw deleteError;

      if (upsertData.length > 0) {
        const { error: insertError } = await supabase.from('customer_product_prices').insert(upsertData);
        if (insertError) throw insertError;
      }
      toast.success("Müşteriye özel fiyatlar başarıyla kaydedildi.");
    } catch (error: any) {
      toast.error("Fiyatlar kaydedilirken bir hata oluştu: " + error.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleAddProperty = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsPropertyModalOpen(true);
  };

  const handleSaveProperty = (key: string, property: Property) => {
    if (!selectedItemId) return;
    setCategories(prev => prev.map(cat => {
      if (cat.id !== 'equipment') return cat;
      return {
        ...cat,
        items: cat.items.map(item => {
          if (item.id === selectedItemId) {
            return { ...item, properties: { ...item.properties, [key]: property } };
          }
          return item;
        })
      };
    }));
  };

  const handleDeleteProperty = (itemId: string, propertyKey: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id !== 'equipment') return cat;
      return {
        ...cat,
        items: cat.items.map(item => {
          if (item.id === itemId && item.properties) {
            const { [propertyKey]: _, ...rest } = item.properties;
            return { ...item, properties: rest };
          }
          return item;
        })
      };
    }));
  };

  const currentCategory = categories.find(cat => cat.id === selectedCategory);
  
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <PropertyModal isOpen={isPropertyModalOpen} onClose={() => setIsPropertyModalOpen(false)} onSave={handleSaveProperty} />
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Tanımı Sil</h3>
                <p className="mt-2 text-sm text-gray-500">Bu öğeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
              </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button onClick={handleDeleteItem} type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm">Sil</button>
              <button onClick={() => setShowDeleteConfirm(false)} type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm">İptal</button>
            </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Tanımlamalar</h1>
        {isAdmin && (
            <button onClick={handleAddItem} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><Plus size={18} /> Yeni Ekle</button>
        )}
      </header>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex flex-wrap -mb-px">
            {categories.map(category => (
              <button key={category.id} className={`px-4 py-3 font-medium text-sm transition-colors duration-200 ${selectedCategory === category.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`} onClick={() => setSelectedCategory(category.id)}>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-10"><Loader2 className="animate-spin inline-block text-gray-400" /></div>
          ) : (
            <>
              {selectedCategory !== 'paid' && (
                <div className="space-y-4">
                  {currentCategory?.items.map(item => (
                    <DefinitionItemCard 
                      key={item.id} 
                      item={item} 
                      category={currentCategory} 
                      onUpdate={handleUpdateItem} 
                      onDelete={() => confirmDeleteItem(item.id, currentCategory.table)}
                      onCancelNew={handleCancelNewItem}
                      onAddProperty={handleAddProperty}
                      onDeleteProperty={handleDeleteProperty}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              )}
              
              {selectedCategory === 'paid' && (
                <div>
                  <div className="mb-6 pb-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Ürün Liste Fiyatları</h2>
                     <div className="space-y-4">
                        {currentCategory?.items.map(item => (
                            <DefinitionItemCard 
                            key={item.id} 
                            item={item} 
                            category={currentCategory} 
                            onUpdate={handleUpdateItem} 
                            onDelete={() => confirmDeleteItem(item.id, currentCategory.table)}
                            onCancelNew={handleCancelNewItem}
                            onAddProperty={() => {}}
                            onDeleteProperty={() => {}}
                            isAdmin={isAdmin}
                            />
                        ))}
                    </div>
                  </div>
                  
                  <div className="mt-8">
                     <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center"><DollarSign className="mr-2 text-green-600"/>Müşteriye Özel Fiyatlandırma</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Fiyatları Yönetilecek Müşteriyi Seçin</label>
                          <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
                            <option value="">-- Bir Müşteri Seçin --</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
                          </select>
                        </div>
                         <div className="self-end">
                            <button onClick={handleSaveCustomerPrices} disabled={saving || !selectedCustomerId} className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50">
                                {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                Müşteri Fiyatlarını Kaydet
                            </button>
                         </div>
                      </div>
                      {selectedCustomerId && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Liste Fiyatı (₺)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteriye Özel Fiyat (₺)</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {currentCategory?.items.map(product => {
                                const specialPrice = customerPrices.get(product.id);
                                return (
                                  <tr key={product.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{(product.price || 0).toLocaleString('tr-TR')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <input type="number" step="0.01" placeholder={(product.price || 0).toLocaleString('tr-TR')} value={specialPrice !== undefined ? specialPrice : ''} onChange={(e) => handlePriceChange(product.id, e.target.value)} className="w-40 p-2 border border-gray-300 rounded-md text-right focus:ring-2 focus:ring-green-500" />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Definitions;
