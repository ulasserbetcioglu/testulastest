import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: any) => void;
}

// (cities array remains the same)
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


const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    // ❌ REMOVED: auth_id: authId,
    kisaIsim: '',
    cariIsim: '',
    adres: '',
    sehir: '',
    telefon: '',
    email: '',
    parola: '',
    price: '',
    priceType: 'none',
    taxNumber: '',
    taxOffice: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.parola,
        options: {
          data: {
            role: 'customer'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Kullanıcı oluşturulamadı."); // Add a check for the user object

      // Then, create the customer record using the new user's ID
      const { data, error } = await supabase
        .from('customers')
        .insert([
          {
            auth_id: authData.user.id, // ✅ ADDED: Use the ID from the signUp response
            kisa_isim: formData.kisaIsim,
            cari_isim: formData.cariIsim,
            adres: formData.adres,
            sehir: formData.sehir,
            telefon: formData.telefon,
            email: formData.email,
            parola: formData.parola,
            tax_number: formData.taxNumber,
            tax_office: formData.taxOffice
          }
        ])
        .select()
        .single(); // Use .single() since you expect one record back

      if (error) throw error;
      if (!data) throw new Error("Müşteri kaydı oluşturulamadı.");

      // If pricing is set, create the pricing record
      if (formData.priceType !== 'none') {
        const customerId = data.id;
        
        const pricingData = {
          customer_id: customerId,
          monthly_price: formData.priceType === 'monthly' ? parseFloat(formData.price) : null,
          per_visit_price: formData.priceType === 'per_visit' ? parseFloat(formData.price) : null,
        };

        const { error: pricingError } = await supabase
          .from('customer_pricing')
          .insert([pricingData]);

        if (pricingError) throw pricingError;
      }

      onSave(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    // ... your JSX for the modal remains the same
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex justify-between items-center p-4 border-b z-10">
          <h2 className="text-xl font-semibold">Müşteri Ekle</h2>
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
                Kısa İsim
              </label>
              <input
                type="text"
                value={formData.kisaIsim}
                onChange={(e) => setFormData({ ...formData, kisaIsim: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cari İsim
              </label>
              <input
                type="text"
                value={formData.cariIsim}
                onChange={(e) => setFormData({ ...formData, cariIsim: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="mt-1 text-sm text-gray-500">Muhasebe sisteminde kullanılacak isim</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres
              </label>
              <textarea
                value={formData.adres}
                onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şehir
              </label>
              <select
                value={formData.sehir}
                onChange={(e) => setFormData({ ...formData, sehir: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vergi Dairesi
                </label>
                <input
                  type="text"
                  value={formData.taxOffice}
                  onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vergi Numarası
                </label>
                <input
                  type="text"
                  value={formData.taxNumber}
                  onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
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
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                  minLength={6}
                />
                <p className="mt-1 text-sm text-gray-500">En az 6 karakter</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Fiyatlandırma</h3>
              
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="priceType"
                      checked={formData.priceType === 'none'}
                      onChange={() => setFormData({...formData, priceType: 'none'})}
                      className="mr-2"
                    />
                    <span>Fiyatlandırma Yok</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="priceType"
                      checked={formData.priceType === 'monthly'}
                      onChange={() => setFormData({...formData, priceType: 'monthly'})}
                      className="mr-2"
                    />
                    <span>Aylık Fiyat</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="priceType"
                      checked={formData.priceType === 'per_visit'}
                      onChange={() => setFormData({...formData, priceType: 'per_visit'})}
                      className="mr-2"
                    />
                    <span>Ziyaret Başı Fiyat</span>
                  </label>
                </div>
                
                {formData.priceType !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fiyat (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      required={formData.priceType !== 'none'}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3 sticky bottom-0 bg-white py-4 px-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
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

export default AddCustomerModal;