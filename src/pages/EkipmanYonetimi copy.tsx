import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Package, Plus, Edit, Trash2, Save, X, Loader2 as Loader } from 'lucide-react';

// Arayüz (Interface) tanımları
interface Equipment {
  id: number;
  name: string;
  price: number | null;
  unit_type: 'litre' | 'adet' | 'kg';
  image_url: string | null;
}

const EkipmanYonetimi: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState<Partial<Equipment>>({});

  // Veri çekme fonksiyonu
  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');
      if (error) throw error;
      setEquipmentList(data || []);
    } catch (error: any) {
      toast.error('Ekipman listesi çekilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  // Modal işlemleri
  const handleOpenModal = (item: Equipment | null = null) => {
    setEditingItem(item);
    // ✅ DÜZELTME: Yeni ürün eklerken fiyatı '0' yerine 'null' olarak başlat
    setFormData(item ? { ...item } : { name: '', price: null, unit_type: 'adet', image_url: '' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // ✅ DÜZELTME: Form değişikliklerini daha güvenilir şekilde yönet
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'price') {
        // Fiyat alanı boşsa null, değilse sayı olarak ayarla. Geçersiz girişi yoksay.
        if (value === '') {
            setFormData(prev => ({ ...prev, price: null }));
        } else {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                setFormData(prev => ({ ...prev, price: numValue }));
            }
        }
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Kaydetme ve Güncelleme
  const handleSave = async () => {
    if (!formData.name || !formData.unit_type) {
      toast.error('İsim ve Birim Tipi alanları zorunludur.');
      return;
    }

    const payload = {
        name: formData.name,
        price: formData.price,
        unit_type: formData.unit_type,
        image_url: formData.image_url,
    };

    try {
      if (editingItem) {
        // Güncelleme
        const { error } = await supabase
          .from('equipment')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success('Ekipman başarıyla güncellendi.');
      } else {
        // Ekleme
        const { error } = await supabase
          .from('equipment')
          .insert(payload);
        if (error) throw error;
        toast.success('Yeni ekipman başarıyla eklendi.');
      }
      fetchEquipment();
      handleCloseModal();
    } catch (error: any) {
      toast.error(`İşlem başarısız: ${error.message}`);
    }
  };

  // Silme
  const handleDelete = async (id: number) => {
    toast('Bu ekipmanı silmek istediğinizden emin misiniz?', {
        action: {
            label: 'Evet, Sil',
            onClick: async () => {
                try {
                    const { error } = await supabase.from('equipment').delete().eq('id', id);
                    if (error) throw error;
                    toast.success('Ekipman silindi.');
                    fetchEquipment();
                } catch (error: any) {
                    toast.error(`Silme işlemi başarısız: ${error.message}`);
                }
            }
        },
        cancel: {
            label: 'İptal'
        }
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Package className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-800">Ekipman ve Malzeme Yönetimi</h1>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
          <Plus size={20} /> Yeni Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Görsel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ekipman Adı</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fiyat</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Birim</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10"><Loader className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : (
                equipmentList.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <img src={item.image_url || 'https://placehold.co/64x64/e2e8f0/334155?text=?'} alt={item.name} className="w-16 h-16 object-cover rounded-md bg-gray-100" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">{(item.price || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{item.unit_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleOpenModal(item)} className="text-blue-600 hover:text-blue-900 p-1"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900 p-1 ml-2"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ekleme/Düzenleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg m-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">{editingItem ? 'Ekipmanı Düzenle' : 'Yeni Ekipman Ekle'}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ekipman Adı</label>
                <input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fiyat (₺)</label>
                  {/* ✅ DÜZELTME: Input'un değeri artık null ise boş string gösteriyor */}
                  <input type="number" name="price" value={formData.price ?? ''} onChange={handleFormChange} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birim Tipi</label>
                  <select name="unit_type" value={formData.unit_type || 'adet'} onChange={handleFormChange} className="w-full p-2 border rounded-lg bg-white">
                    <option value="adet">Adet</option>
                    <option value="litre">Litre</option>
                    <option value="kg">Kg</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Görsel URL</label>
                <input type="text" name="image_url" value={formData.image_url || ''} onChange={handleFormChange} className="w-full p-2 border rounded-lg" placeholder="https://ornek.com/gorsel.png" />
              </div>
            </div>
            <div className="flex justify-end items-center p-4 bg-gray-50 border-t rounded-b-xl">
              <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 mr-2">İptal</button>
              <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                <Save size={18} /> Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EkipmanYonetimi;
