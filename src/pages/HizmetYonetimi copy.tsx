import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { CheckSquare, Plus, Edit, Trash2, Save, X, Loader2 as Loader, Bug, Check } from 'lucide-react';

// Arayüz (Interface) tanımları
interface Service {
  id: number;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  target_pests: string[] | null; // YENİ: Zararlı listesi
}

// Zararlı Listesi (Diğer sayfalarla aynı olmalı)
const PEST_TYPES = [
  'Hamam Böceği', 'Kemirgen', 'Karınca', 'Sinek', 'Güve', 'Örümcek', 'Gümüşçün', 'Pire', 'Kene', 'Tahtakurusu', 'Akrep', 'Mikroorganizma', 'Dezenfeksiyon'
];

const HizmetYonetimi: React.FC = () => {
  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Service | null>(null);
  const [formData, setFormData] = useState<Partial<Service>>({});

  // Veri çekme fonksiyonu
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
      if (error) throw error;
      setServiceList(data || []);
    } catch (error: any) {
      toast.error('Hizmet listesi çekilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Modal işlemleri
  const handleOpenModal = (item: Service | null = null) => {
    setEditingItem(item);
    setFormData(item 
      ? { ...item, target_pests: item.target_pests || [] } 
      : { name: '', description: '', price: null, image_url: '', target_pests: [] }
    );
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'price' ? (value === '' ? null : parseFloat(value)) : value }));
  };

  // Zararlı Seçimi Toggle
  const togglePest = (pest: string) => {
    setFormData(prev => {
        const currentPests = prev.target_pests || [];
        if (currentPests.includes(pest)) {
            return { ...prev, target_pests: currentPests.filter(p => p !== pest) };
        } else {
            return { ...prev, target_pests: [...currentPests, pest] };
        }
    });
  };

  // Kaydetme ve Güncelleme
  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Hizmet Adı alanı zorunludur.');
      return;
    }

    try {
      if (editingItem) {
        // Güncelleme
        const { error } = await supabase
          .from('services')
          .update({
              name: formData.name,
              description: formData.description,
              price: formData.price,
              image_url: formData.image_url,
              target_pests: formData.target_pests // Zararlıları kaydet
          })
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success('Hizmet başarıyla güncellendi.');
      } else {
        // Ekleme
        const { error } = await supabase
          .from('services')
          .insert({
              name: formData.name,
              description: formData.description,
              price: formData.price,
              image_url: formData.image_url,
              target_pests: formData.target_pests // Zararlıları kaydet
          });
        if (error) throw error;
        toast.success('Yeni hizmet başarıyla eklendi.');
      }
      fetchServices();
      handleCloseModal();
    } catch (error: any) {
      toast.error(`İşlem başarısız: ${error.message}`);
    }
  };

  // Silme
  const handleDelete = async (id: number) => {
    toast('Bu hizmeti silmek istediğinizden emin misiniz?', {
        action: {
            label: 'Evet, Sil',
            onClick: async () => {
                try {
                    const { error } = await supabase.from('services').delete().eq('id', id);
                    if (error) throw error;
                    toast.success('Hizmet silindi.');
                    fetchServices();
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
          <CheckSquare className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-800">Hizmet Yönetimi</h1>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors">
          <Plus size={20} /> Yeni Hizmet Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Görsel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hizmet Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kapsadığı Zararlılar</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fiyat</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10"><Loader className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : (
                serviceList.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <img src={item.image_url || 'https://placehold.co/64x64/e2e8f0/334155?text=?'} alt={item.name} className="w-16 h-16 object-cover rounded-md bg-gray-100" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">{item.description}</div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                            {item.target_pests && item.target_pests.length > 0 ? (
                                item.target_pests.map((p, i) => (
                                    <span key={i} className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100">{p}</span>
                                ))
                            ) : <span className="text-xs text-gray-400">-</span>}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">
                      {item.price ? item.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '-'}
                    </td>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg m-4 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">{editingItem ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hizmet Adı</label>
                <input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} className="w-full p-2 border rounded-lg" />
              </div>
              
              {/* ZARARLI SEÇİMİ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kapsadığı Zararlılar</label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
                    {PEST_TYPES.map(pest => (
                        <button
                            key={pest}
                            onClick={() => togglePest(pest)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                                formData.target_pests?.includes(pest) 
                                ? 'bg-green-600 text-white border-green-600' 
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {formData.target_pests?.includes(pest) && <Check size={12}/>}
                            {pest}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">* Bu hizmet seçildiğinde teklif ekranında bu zararlılar otomatik seçilecektir.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea name="description" value={formData.description || ''} onChange={handleFormChange} rows={2} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fiyat (₺) (Opsiyonel)</label>
                <input type="number" name="price" value={formData.price ?? ''} onChange={handleFormChange} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Görsel URL</label>
                <input type="text" name="image_url" value={formData.image_url || ''} onChange={handleFormChange} className="w-full p-2 border rounded-lg" placeholder="https://ornek.com/gorsel.png" />
              </div>
            </div>
            <div className="flex justify-end items-center p-4 bg-gray-50 border-t rounded-b-xl mt-auto">
              <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 mr-2">İptal</button>
              <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <Save size={18} /> Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HizmetYonetimi;