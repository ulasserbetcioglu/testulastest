import React, { useState } from 'react';
import { X, Search, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

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
    taxOffice: '',
    hasWithholding: false,
    parasutServiceName: '',
    parasutServiceId: '',
    parasutId: ''
  });
  const [searching, setSearching] = useState<{ [key: string]: boolean }>({});
  const [searchResults, setSearchResults] = useState<{ [key: string]: any[] }>({});
  const [activeSearchField, setActiveSearchField] = useState<string | null>(null);

  const handleParasutSearch = async (field: 'contact' | 'product', query: string) => {
    if (!query || query.length < 3) {
      toast.error('Aramak için en az 3 karakter giriniz.');
      return;
    }

    setSearching(prev => ({ ...prev, [field]: true }));
    setActiveSearchField(field);
    try {
      const { data, error: fetchErr } = await supabase.functions.invoke('parasut-fetch', {
        body: { 
          type: field === 'contact' ? 'contacts' : 'products', 
          filter_key: field === 'contact' ? 'filter[query]' : 'filter[name]', 
          query: query 
        }
      });

      if (fetchErr) throw fetchErr;
      if (data?.success) {
        setSearchResults(prev => ({ ...prev, [field]: data.data || [] }));
        if (data.data?.length === 0) toast.info('Sonuç bulunamadı.');
      } else {
        throw new Error(data?.error || 'Arama başarısız');
      }
    } catch (err: any) {
      toast.error('Paraşüt Arama Hatası: ' + err.message);
    } finally {
      setSearching(prev => ({ ...prev, [field]: false }));
    }
  };
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([
          {
            kisa_isim: formData.kisaIsim,
            cari_isim: formData.cariIsim,
            adres: formData.adres,
            sehir: formData.sehir,
            telefon: formData.telefon,
            email: formData.email,
            password_hash: formData.parola,
            tax_number: formData.taxNumber,
            tax_office: formData.taxOffice,
            has_withholding: formData.hasWithholding,
            parasut_service_name: formData.parasutServiceName || null,
            parasut_service_id: formData.parasutServiceId || null,
            parasut_id: formData.parasutId || null
          }
        ])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Müşteri kaydı oluşturulamadı.");

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

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasWithholding}
                  onChange={(e) => setFormData({ ...formData, hasWithholding: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="block font-medium text-blue-900">Tevkifat Uygula (9/10)</span>
                  <span className="text-sm text-blue-700">Bu müşteri için fatura kalemlerine 9/10 oranında tevkifat uygulanır.</span>
                </div>
              </label>
            </div>

          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
            <h3 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm animate-pulse"></div>
              PARAŞÜT ENTEGRASYON AYARLARI
            </h3>
            
            <div className="space-y-5">
              {/* Paraşüt Cari Seçimi */}
              <div className="relative">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <ExternalLink size={14} className="text-blue-500" />
                  PARAŞÜT MÜŞTERİ (CARİ) ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.parasutId}
                    onChange={(e) => setFormData({ ...formData, parasutId: e.target.value })}
                    placeholder="Örn: 1030118145"
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleParasutSearch('contact', formData.cariIsim || formData.kisaIsim)}
                    disabled={searching['contact']}
                    className="px-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all flex items-center justify-center min-w-[40px] group"
                    title="Paraşüt'te Cari Ara"
                  >
                    {searching['contact'] ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} className="group-active:scale-90 transition-transform" />}
                  </button>
                </div>
                {activeSearchField === 'contact' && searchResults['contact'] && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-[250px] overflow-auto animate-in fade-in zoom-in-95 duration-200 p-1 ring-1 ring-black/5">
                    <div className="flex justify-between items-center p-2 border-b border-gray-50 mb-1 sticky top-0 bg-white z-10">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PARAŞÜT CARİLERİ</span>
                      <button onClick={() => { setSearchResults(prev => ({ ...prev, contact: [] })); setActiveSearchField(null); }} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                        <X size={14} />
                      </button>
                    </div>
                    {searchResults['contact'].map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, parasutId: item.id });
                          setSearchResults(prev => ({ ...prev, contact: [] }));
                          setActiveSearchField(null);
                        }}
                        className="w-full text-left p-2.5 hover:bg-blue-50 rounded-lg transition-colors flex flex-col gap-0.5 border border-transparent hover:border-blue-100 mb-0.5 group"
                      >
                        <span className="text-sm font-bold text-gray-900 group-hover:text-blue-700">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-blue-600 bg-blue-100/50 px-1.5 py-0.5 rounded self-start">ID: {item.id}</span>
                          {item.balance !== undefined && (
                            <span className={`text-[10px] font-bold ${item.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              Bakiye: {item.balance.toLocaleString('tr-TR')} TL
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Özel Hizmet Ayarları */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-blue-100/50">
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center justify-between">
                    <span>ÖZEL HİZMET ADI</span>
                    {formData.parasutServiceName && (
                      <button onClick={() => setFormData({ ...formData, parasutServiceName: '' })} className="text-red-400 hover:text-red-600">
                        <X size={10} />
                      </button>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.parasutServiceName}
                      onChange={(e) => setFormData({ ...formData, parasutServiceName: e.target.value })}
                      placeholder="Örn: Haşere Mücadele"
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleParasutSearch('product', formData.parasutServiceName || '')}
                      disabled={searching['product']}
                      className="px-3 bg-blue-100/50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all flex items-center justify-center min-w-[40px] group"
                      title="Hizmetlerde Ara"
                    >
                      {searching['product'] ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} className="group-active:scale-90 transition-transform" />}
                    </button>
                  </div>
                  {activeSearchField === 'product' && searchResults['product'] && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-[250px] overflow-auto animate-in fade-in zoom-in-95 duration-200 p-1 ring-1 ring-black/5">
                      <div className="flex justify-between items-center p-2 border-b border-gray-50 mb-1 sticky top-0 bg-white z-10">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PARAŞÜT HİZMETLERİ</span>
                        <button onClick={() => { setSearchResults(prev => ({ ...prev, product: [] })); setActiveSearchField(null); }} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                          <X size={14} />
                        </button>
                      </div>
                      {searchResults['product'].map((item: any) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, parasutServiceId: item.id, parasutServiceName: item.name });
                            setSearchResults(prev => ({ ...prev, product: [] }));
                            setActiveSearchField(null);
                          }}
                          className="w-full text-left p-2.5 hover:bg-blue-50 rounded-lg transition-colors flex flex-col gap-0.5 border border-transparent hover:border-blue-100 mb-0.5 group"
                        >
                          <span className="text-sm font-bold text-gray-900 group-hover:text-blue-700">{item.name}</span>
                          <span className="text-[10px] font-mono text-blue-600 bg-blue-100/50 px-1.5 py-0.5 rounded self-start">ID: {item.id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    ÖZEL ÜRÜN ID
                  </label>
                  <input
                    type="text"
                    value={formData.parasutServiceId}
                    onChange={(e) => setFormData({ ...formData, parasutServiceId: e.target.value })}
                    placeholder="ID otomatik dolar"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono text-blue-700"
                  />
                </div>
              </div>
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