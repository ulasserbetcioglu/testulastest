import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X, Save, Loader2 as Loader } from 'lucide-react';

interface AddOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const AddOperatorModal: React.FC<AddOperatorModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'Açık' | 'Kapalı'>('Açık');
  const [isLoading, setIsLoading] = useState(false);

  // Formu modal her açıldığında sıfırla
  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setStatus('Açık');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Ad Soyad, E-posta ve Şifre alanları zorunludur.');
      return;
    }
    setIsLoading(true);

    try {
      // ✅ GÜNCELLEME: Artık Edge Function yerine, Supabase'in standart kullanıcı oluşturma
      // metodunu kullanıyoruz. Ekstra bilgileri 'options.data' içinde gönderiyoruz.
      // Canvas'ta oluşturduğunuz veritabanı tetikleyicisi bu bilgileri alıp 'operators' tablosuna yazacak.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            status,
            role: 'operator' // Rolü meta veri olarak eklemek iyi bir pratiktir
          }
        }
      });

      if (error) {
        throw error;
      }

      toast.success('Operatör başarıyla oluşturuldu!');
      onSave(); // Operatör listesini yenile
      onClose(); // Modalı kapat

    } catch (error: any) {
      console.error("Operatör oluşturma hatası:", error);
      // Supabase'den gelen yaygın hata mesajlarını daha anlaşılır hale getir
      if (error.message.includes('User already registered')) {
        toast.error('Bu e-posta adresi zaten kayıtlı.');
      } else if (error.message.includes('Password should be at least 6 characters')) {
        toast.error('Şifre en az 6 karakter olmalıdır.');
      } else {
        toast.error(`Operatör oluşturulamadı: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Yeni Operatör Ekle</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geçici Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Açık' | 'Kapalı')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Açık">Açık</option>
                <option value="Kapalı">Kapalı</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end items-center p-4 bg-gray-50 border-t rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 mr-2"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center min-w-[100px]"
            >
              {isLoading ? <Loader size={20} className="animate-spin" /> : <><Save size={18} className="mr-2" /> Kaydet</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOperatorModal;
