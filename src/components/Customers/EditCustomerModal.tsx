import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Customer, Branch } from '../../types';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  customer: Customer & { auth_id?: string };
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

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({ isOpen, onClose, onSave, customer }) => {
  const [formData, setFormData] = useState({
    kisaIsim: customer.kisa_isim,
    cariIsim: customer.cari_isim || '',
    adres: customer.adres || '',
    sehir: customer.sehir || '',
    telefon: customer.telefon || '',
    email: customer.email || '',
    monthlyPrice: '',
    perVisitPrice: '',
    taxNumber: customer.tax_number || '',
    taxOffice: customer.tax_office || '',
    password: '',
  });

  // MODIFIED: State for creating a new user instead of listing existing ones
  const [newUserData, setNewUserData] = useState({ email: '', password: '' });
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [linkedUserEmail, setLinkedUserEmail] = useState<string | null>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [branchPricing, setBranchPricing] = useState({ monthlyPrice: '', perVisitPrice: '' });
  const [branchPricingType, setBranchPricingType] = useState<'monthly' | 'per_visit' | 'none'>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingType, setPricingType] = useState<'monthly' | 'per_visit' | 'none'>('none');
  // MODIFIED: 'auth' tab is now 'account'
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'password' | 'account'>('basic');
  const [isAdmin, setIsAdmin] = useState(false);

  // MODIFIED: Simplified useEffect, removed fetchAuthUsers
  useEffect(() => {
    const initialize = async () => {
        await checkAdminAccess();
        if (isOpen) {
            fetchPricingData();
            fetchBranches();
            if (customer.auth_id) {
                fetchLinkedUserEmail(customer.auth_id);
            }
            // Reset form data and states when modal opens
            setFormData({
                kisaIsim: customer.kisa_isim,
                cariIsim: customer.cari_isim || '',
                adres: customer.adres || '',
                sehir: customer.sehir || '',
                telefon: customer.telefon || '',
                email: customer.email || '',
                monthlyPrice: '',
                perVisitPrice: '',
                taxNumber: customer.tax_number || '',
                taxOffice: customer.tax_office || '',
                password: '',
            });
            // Reset user creation/management state
            setNewUserData({ email: customer.email || '', password: '' }); // Pre-fill email from customer data
            setIsUnlinking(false);
            setLinkedUserEmail(null);
            setError(null);
            setActiveTab('basic');
        }
    };
    initialize();
  }, [isOpen, customer.id]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAdmin(user?.email === 'admin@ilaclamatik.com');
  };
  
  // NEW: Function to get the email of the currently linked user
  const fetchLinkedUserEmail = async (authId: string) => {
      try {
          const { data, error } = await supabase.functions.invoke('get-user-by-id', {
              body: { userId: authId }
          });
          if (error) throw error;
          if (data) {
              setLinkedUserEmail(data.email);
          }
      } catch (err: any) {
          console.error("Error fetching linked user's email:", err);
          // Don't block the UI, just log the error
      }
  };

  const fetchPricingData = async () => {
    try {
      const { data } = await supabase
        .from('customer_pricing')
        .select('*')
        .eq('customer_id', customer.id)
        .maybeSingle();

      if (data) {
        if (data.monthly_price) {
          setPricingType('monthly');
          setFormData(prev => ({ ...prev, monthlyPrice: data.monthly_price.toString(), perVisitPrice: '' }));
        } else if (data.per_visit_price) {
          setPricingType('per_visit');
          setFormData(prev => ({ ...prev, monthlyPrice: '', perVisitPrice: data.per_visit_price.toString() }));
        }
      } else {
        setPricingType('none');
        setFormData(prev => ({ ...prev, monthlyPrice: '', perVisitPrice: '' }));
      }
    } catch (err: any) {
      console.error('Error fetching pricing data:', err);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase.from('branches').select('*').eq('customer_id', customer.id).order('sube_adi');
      if (error) throw error;
      setBranches(data || []);
    } catch (err: any) {
      console.error('Error fetching branches:', err);
      setError(err.message);
    }
  };

  const fetchBranchPricing = async (branchId: string) => { /* ... (no changes) ... */ };
  const handleBranchChange = (branchId: string) => { /* ... (no changes) ... */ };

  // MODIFIED: handleSubmit now handles user creation and unlinking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let customerAuthId = customer.auth_id;

      // Case 1: Create a new user if email and password are provided
      if (newUserData.email && newUserData.password && !customer.auth_id) {
        const { data: newUser, error: createError } = await supabase.functions.invoke('create-customer-user', {
          body: { email: newUserData.email, password: newUserData.password },
        });

        if (createError) {
          // Check for specific error message for existing user
          if (createError.message.includes('User already registered')) {
              throw new Error(`Bu e-posta adresi (${newUserData.email}) zaten kayıtlı. Lütfen farklı bir e-posta kullanın.`);
          }
          throw new Error(`Kullanıcı oluşturulamadı: ${createError.message}`);
        }
        customerAuthId = newUser.id;
      } 
      // Case 2: Unlink the user if requested
      else if (isUnlinking) {
        customerAuthId = undefined;
      }

      // Update Customer Data
      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update({
          kisa_isim: formData.kisaIsim,
          cari_isim: formData.cariIsim,
          adres: formData.adres,
          sehir: formData.sehir,
          telefon: formData.telefon,
          email: formData.email,
          tax_number: formData.taxNumber,
          tax_office: formData.taxOffice,
          auth_id: customerAuthId,
        })
        .eq('id', customer.id);

      if (customerUpdateError) throw customerUpdateError;

      // ... (Pricing logic remains the same) ...

      // Handle password update for the *currently linked* user
      if (isAdmin && formData.password && customerAuthId) {
        const { error: functionError } = await supabase.functions.invoke('update-user-password', {
          body: { userId: customerAuthId, password: formData.password },
        });

        if (functionError) {
          throw new Error(`Şifre güncellenemedi: ${functionError.message}`);
        }
      }

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
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">Müşteri Düzenle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
        </div>

        <div className="border-b">
          <div className="flex">
            <button onClick={() => setActiveTab('basic')} className={`px-4 py-2 font-medium ${activeTab === 'basic' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Temel Bilgiler</button>
            {isAdmin && (<button onClick={() => setActiveTab('pricing')} className={`px-4 py-2 font-medium ${activeTab === 'pricing' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Fiyatlandırma</button>)}
            {isAdmin && (<button onClick={() => setActiveTab('account')} className={`px-4 py-2 font-medium ${activeTab === 'account' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Kullanıcı Hesabı</button>)}
            {isAdmin && customer.auth_id && (<button onClick={() => setActiveTab('password')} className={`px-4 py-2 font-medium ${activeTab === 'password' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Şifre</button>)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>)}

          {activeTab === 'basic' && ( <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Müşteri No </label> <input type="text" value={customer.musteri_no} className="w-full p-2 border rounded bg-gray-100" disabled /> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Kısa İsim </label> <input type="text" value={formData.kisaIsim} onChange={(e) => setFormData({ ...formData, kisaIsim: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" required /> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Cari İsim </label> <input type="text" value={formData.cariIsim} onChange={(e) => setFormData({ ...formData, cariIsim: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" /> <p className="mt-1 text-xs text-gray-500">Muhasebe sisteminde kullanılacak isim</p> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Telefon </label> <input type="tel" value={formData.telefon} onChange={(e) => setFormData({ ...formData, telefon: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-1"> E-Posta </label> <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Vergi Dairesi </label> <input type="text" value={formData.taxOffice} onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Vergi Numarası </label> <input type="text" value={formData.taxNumber} onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Şehir </label> <select value={formData.sehir} onChange={(e) => setFormData({ ...formData, sehir: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" > <option value="">Seçiniz</option> {cities.map((city) => ( <option key={city} value={city}>{city}</option> ))} </select> </div> <div className="md:col-span-2"> <label className="block text-sm font-medium text-gray-700 mb-1"> Adres </label> <textarea value={formData.adres} onChange={(e) => setFormData({ ...formData, adres: e.target.value })} rows={2} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> </div> )}
          
          {activeTab === 'pricing' && isAdmin && ( <div className="space-y-6"> {/* Customer Pricing */} <div className="border-t pt-4"> <h3 className="text-lg font-medium mb-3">Müşteri Fiyatlandırma</h3> <div className="space-y-4"> <div className="flex items-center space-x-4"> <label className="flex items-center"> <input type="radio" name="pricingType" checked={pricingType === 'none'} onChange={() => setPricingType('none')} className="mr-2" /> <span>Fiyatlandırma Yok</span> </label> <label className="flex items-center"> <input type="radio" name="pricingType" checked={pricingType === 'monthly'} onChange={() => setPricingType('monthly')} className="mr-2" /> <span>Aylık Fiyat</span> </label> <label className="flex items-center"> <input type="radio" name="pricingType" checked={pricingType === 'per_visit'} onChange={() => setPricingType('per_visit')} className="mr-2" /> <span>Ziyaret Başı Fiyat</span> </label> </div> {pricingType === 'monthly' && ( <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Aylık Fiyat (₺) </label> <input type="number" step="0.01" min="0" value={formData.monthlyPrice} onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" required /> </div> )} {pricingType === 'per_visit' && ( <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Ziyaret Başı Fiyat (₺) </label> <input type="number" step="0.01" min="0" value={formData.perVisitPrice} onChange={(e) => setFormData({ ...formData, perVisitPrice: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" required /> </div> )} </div> </div> {/* Branch Pricing */} <div className="border-t pt-4"> <h3 className="text-lg font-medium mb-3">Şube Fiyatlandırma</h3> <div className="space-y-4"> <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Şube Seçin </label> <select value={selectedBranch} onChange={(e) => handleBranchChange(e.target.value)} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" > <option value="">Şube Seçiniz</option> {branches.map(branch => ( <option key={branch.id} value={branch.id}>{branch.sube_adi}</option> ))} </select> </div> {selectedBranch && ( <> <div className="flex items-center space-x-4"> <label className="flex items-center"> <input type="radio" name="branchPricingType" checked={branchPricingType === 'none'} onChange={() => setBranchPricingType('none')} className="mr-2" /> <span>Fiyatlandırma Yok</span> </label> <label className="flex items-center"> <input type="radio" name="branchPricingType" checked={branchPricingType === 'monthly'} onChange={() => setBranchPricingType('monthly')} className="mr-2" /> <span>Aylık Fiyat</span> </label> <label className="flex items-center"> <input type="radio" name="branchPricingType" checked={branchPricingType === 'per_visit'} onChange={() => setBranchPricingType('per_visit')} className="mr-2" /> <span>Ziyaret Başı Fiyat</span> </label> </div> {branchPricingType === 'monthly' && ( <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Aylık Fiyat (₺) </label> <input type="number" step="0.01" min="0" value={branchPricing.monthlyPrice} onChange={(e) => setBranchPricing({ ...branchPricing, monthlyPrice: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" required /> </div> )} {branchPricingType === 'per_visit' && ( <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Ziyaret Başı Fiyat (₺) </label> <input type="number" step="0.01" min="0" value={branchPricing.perVisitPrice} onChange={(e) => setBranchPricing({ ...branchPricing, perVisitPrice: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" required /> </div> )} </> )} </div> </div> </div> )}

          {activeTab === 'account' && isAdmin && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Müşteri Kullanıcı Hesabı</h3>
              {(customer.auth_id || linkedUserEmail) && !isUnlinking ? (
                <div>
                  <p className="text-sm text-gray-700">Bu müşteri <strong className="text-green-700">{linkedUserEmail || 'bir kullanıcıya'}</strong> bağlıdır.</p>
                  <button type="button" onClick={() => setIsUnlinking(true)} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Kullanıcı Bağlantısını Kaldır</button>
                </div>
              ) : (
                <div>
                   {isUnlinking && ( <p className="text-sm text-yellow-700 bg-yellow-100 p-3 rounded mb-4">Kullanıcı bağlantısı kaldırılacak. Değişiklikleri kaydetmek için formu gönderin.</p> )}
                  <p className="text-sm text-gray-500 mb-4">Müşterinin sisteme giriş yapabilmesi için yeni bir kullanıcı oluşturun.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Kullanıcı E-postası</label>
                      <input type="email" value={newUserData.email} onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="kullanici@ornek.com" disabled={isUnlinking} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Kullanıcı Şifresi</label>
                      <input type="password" value={newUserData.password} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="En az 6 karakter" disabled={isUnlinking} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'password' && isAdmin && customer.auth_id && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Şifre Değiştirme</h3>
              <p className="text-sm text-gray-500">Bu müşterinin giriş şifresini değiştirmek için yeni bir şifre belirleyin. Bu alan boş bırakılırsa şifre değişmez.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Yeni şifre girin" autoComplete="new-password" />
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50" disabled={loading}>İptal</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50" disabled={loading}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCustomerModal;
