import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Branch } from '../../types';

interface AddBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  onSave: () => void;
}

const cities = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin', 'Aydın', 'Balıkesir',
  'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli',
  'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari',
  'Hatay', 'Isparta', 'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
  'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş', 'Nevşehir',
  'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Tekirdağ', 'Tokat',
  'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak', 'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman',
  'Kırıkkale', 'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce'
];

const AddBranchModal: React.FC<AddBranchModalProps> = ({ isOpen, onClose, customerId, onSave }) => {
  const [formData, setFormData] = useState({
    subeAdi: '',
    yetkiliAdi: '',
    adres: '',
    sehir: '',
    telefon: '',
    email: '',
    parola: '',
    latitude: '',
    longitude: '',  
    floor_plan_width: '800',
    floor_plan_height: '600'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('branches')
        .insert([
          {
            customer_id: customerId,
            sube_adi: formData.subeAdi,
            adres: formData.adres,
            sehir: formData.sehir,
            telefon: formData.telefon,
            email: formData.email,
            password_hash: formData.parola,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            floor_plan: {
              width: formData.floor_plan_width ? parseFloat(formData.floor_plan_width) : 800,
              height: formData.floor_plan_height ? parseFloat(formData.floor_plan_height) : 600,
            }
          }
        ])
        .select();

      if (error) throw error;

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Şube Ekle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şube Adı
              </label>
              <input
                type="text"
                value={formData.subeAdi}
                onChange={(e) => setFormData({ ...formData, subeAdi: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yetkili Adı
              </label>
              <input
                type="text"
                value={formData.yetkiliAdi}
                onChange={(e) => setFormData({ ...formData, yetkiliAdi: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres
              </label>
              <textarea
                value={formData.adres}
                onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şehir
              </label>
              <select
                value={formData.sehir}
                onChange={(e) => setFormData({ ...formData, sehir: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Seçiniz</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <input
                type="tel"
                value={formData.telefon}
                onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enlem (Latitude)
                </label>
                <input
                  type="text"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="Örn: 41.0082"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="mt-1 text-xs text-gray-500">Ondalık format (Örn: 41.0082)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Boylam (Longitude)
                </label>
                <input
                  type="text"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="Örn: 28.9784"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="mt-1 text-xs text-gray-500">Ondalık format (Örn: 28.9784)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Posta
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">Bu e-posta ile sisteme giriş yapılacak</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parola
                </label>
                <input
                  type="password"
                  value={formData.parola}
                  onChange={(e) => setFormData({ ...formData, parola: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  minLength={6}
                />
                <p className="mt-1 text-sm text-gray-500">En az 6 karakter</p>
              </div>
            </div>
       
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kat Planı Genişliği
                </label>
                <input
                  type="number"
                  value={formData.floor_plan_width}
                  onChange={(e) => setFormData({ ...formData, floor_plan_width: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kat Planı Yüksekliği
                </label>
                <input
                  type="number"
                  value={formData.floor_plan_height}
                  onChange={(e) => setFormData({ ...formData, floor_plan_height: e.target.value })}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
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

export default AddBranchModal;