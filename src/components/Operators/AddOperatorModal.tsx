import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddOperatorModal: React.FC<AddOperatorModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'teknisyen' // Varsayılan rol
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- DÜZELTİLMİŞ SUBMIT FONKSİYONU ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Kullanıcıyı Auth servisine kaydet
      // options.data kısmı SQL Trigger tarafından okunur ve operators tablosuna yazılır.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name, 
            role: formData.role,
            phone: formData.phone
          }
        }
      });

      if (authError) throw authError;

      // Eğer SQL Trigger kullanmıyorsanız, aşağıdaki yorum satırını açarak manuel kayıt yapabilirsiniz.
      // Ancak "Database error saving new user" hatası alıyorsanız trigger zaten vardır ve yukarıdaki 'options' yeterlidir.
      
      /* if (authData.user) {
        const { error: insertError } = await supabase
          .from('operators')
          .insert([
            {
              auth_id: authData.user.id,
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              role: formData.role,
              status: 'Açık'
            }
          ]);
          
        if (insertError) {
           // Eğer insert hatası olursa auth kaydını temizlemek gerekebilir
           console.error("Tablo kaydı başarısız", insertError);
           throw insertError;
        }
      }
      */

      toast.success('Operatör başarıyla oluşturuldu');
      
      // Formu temizle
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'teknisyen'
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Operatör oluşturma hatası:', err);
      // Hata mesajını kullanıcı dostu hale getir
      let message = err.message || 'Bir hata oluştu';
      if (message.includes('saving new user')) {
        message = 'Veritabanı kayıt hatası. Lütfen SQL Trigger ayarlarını kontrol edin.';
      } else if (message.includes('already registered')) {
        message = 'Bu e-posta adresi zaten kayıtlı.';
      }
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Yeni Operatör Ekle</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Örn: Ahmet Yılmaz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="ornek@firma.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="0555 555 55 55"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
            >
              <option value="yonetici">Yönetici</option>
              <option value="teknisyen">Teknisyen</option>
              <option value="ofis">Ofis Personeli</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-10"
                placeholder="En az 6 karakter"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Kaydet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOperatorModal;