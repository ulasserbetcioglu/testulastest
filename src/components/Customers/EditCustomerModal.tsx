import React, { useState, useEffect } from 'react';
import { X, ToggleLeft, ToggleRight, Search, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import type { Customer, Branch } from '../../types';

interface PaidProduct {
  id: string;
  name: string;
  price: number;
  unit_type: string;
  is_active: boolean;
}

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
    newPassword: '',
    hasWithholding: customer.has_withholding || false,
    parasutServiceName: customer.parasut_service_name || '',
    parasutServiceId: customer.parasut_service_id || '',
    parasutId: customer.parasut_id || ''
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [branchPricing, setBranchPricing] = useState({ monthlyPrice: '', perVisitPrice: '' });
  const [branchPricingType, setBranchPricingType] = useState<'monthly' | 'per_visit' | 'none'>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingType, setPricingType] = useState<'monthly' | 'per_visit' | 'none'>('none');
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'product_pricing' | 'account'>('basic');
  const [isAdmin, setIsAdmin] = useState(false);
  const [customerIsActive, setCustomerIsActive] = useState(customer.is_active !== false);
  const [paidProducts, setPaidProducts] = useState<PaidProduct[]>([]);
  const [customerProductPrices, setCustomerProductPrices] = useState<Map<string, number>>(new Map());
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [savingProductPrices, setSavingProductPrices] = useState(false);
  
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

  useEffect(() => {
    const initialize = async () => {
        await checkAdminAccess();
        if (isOpen) {
            fetchPricingData();
            fetchBranches();
            fetchPaidProducts();
            fetchCustomerProductPrices();
            const { data: customerData } = await supabase
              .from('customers')
              .select('password_hash')
              .eq('id', customer.id)
              .single();
            if (customerData?.password_hash) {
              setCurrentPassword(customerData.password_hash);
            }
            setCustomerIsActive(customer.is_active !== false);
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
                newPassword: '',
                hasWithholding: customer.has_withholding || false,
                parasutServiceName: customer.parasut_service_name || '',
                parasutServiceId: customer.parasut_service_id || '',
                parasutId: customer.parasut_id || ''
            });
            setError(null);
            setActiveTab('basic');
            setProductSearchTerm('');
        }
    };
    initialize();
  }, [isOpen, customer.id]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAdmin(user?.email === 'admin@ilaclamatik.com');
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

  const fetchBranchPricing = async (branchId: string) => {
    try {
      const { data } = await supabase
        .from('branch_pricing')
        .select('*')
        .eq('branch_id', branchId)
        .maybeSingle();

      if (data) {
        if (data.monthly_price) {
          setBranchPricingType('monthly');
          setBranchPricing({ monthlyPrice: data.monthly_price.toString(), perVisitPrice: '' });
        } else if (data.per_visit_price) {
          setBranchPricingType('per_visit');
          setBranchPricing({ monthlyPrice: '', perVisitPrice: data.per_visit_price.toString() });
        } else {
          setBranchPricingType('none');
          setBranchPricing({ monthlyPrice: '', perVisitPrice: '' });
        }
      } else {
        setBranchPricingType('none');
        setBranchPricing({ monthlyPrice: '', perVisitPrice: '' });
      }
    } catch (err: any) {
      console.error('Error fetching branch pricing:', err);
    }
  };

  const fetchPaidProducts = async () => {
    try {
      const { data } = await supabase
        .from('paid_products')
        .select('id, name, price, unit_type, is_active')
        .eq('is_active', true)
        .order('name');
      setPaidProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching paid products:', err);
    }
  };

  const fetchCustomerProductPrices = async () => {
    try {
      const { data } = await supabase
        .from('customer_product_prices')
        .select('product_id, price')
        .eq('customer_id', customer.id);
      const priceMap = new Map<string, number>();
      (data || []).forEach(p => priceMap.set(p.product_id, p.price));
      setCustomerProductPrices(priceMap);
    } catch (err: any) {
      console.error('Error fetching customer product prices:', err);
    }
  };

  const handleSaveProductPrices = async () => {
    setSavingProductPrices(true);
    try {
      await supabase.from('customer_product_prices').delete().eq('customer_id', customer.id);

      const pricesToInsert = Array.from(customerProductPrices.entries())
        .filter(([_, price]) => price > 0)
        .map(([product_id, price]) => ({
          customer_id: customer.id,
          product_id,
          price,
        }));

      if (pricesToInsert.length > 0) {
        const { error } = await supabase.from('customer_product_prices').insert(pricesToInsert);
        if (error) throw error;
      }
      toast.success('Müşteriye özel ürün fiyatları kaydedildi');
    } catch (err: any) {
      toast.error('Fiyatlar kaydedilirken hata: ' + err.message);
    } finally {
      setSavingProductPrices(false);
    }
  };

  const handleProductPriceChange = (productId: string, value: string) => {
    const newPrices = new Map(customerProductPrices);
    const num = parseFloat(value);
    if (!isNaN(num) && value.trim() !== '') {
      newPrices.set(productId, num);
    } else {
      newPrices.delete(productId);
    }
    setCustomerProductPrices(newPrices);
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
    if (branchId) {
      fetchBranchPricing(branchId);
    } else {
      setBranchPricingType('none');
      setBranchPricing({ monthlyPrice: '', perVisitPrice: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updateData: any = {
        kisa_isim: formData.kisaIsim,
        cari_isim: formData.cariIsim,
        adres: formData.adres,
        sehir: formData.sehir,
        telefon: formData.telefon,
        email: formData.email,
        tax_number: formData.taxNumber,
        tax_office: formData.taxOffice,
        is_active: customerIsActive,
        has_withholding: formData.hasWithholding,
        parasut_service_name: formData.parasutServiceName || null,
        parasut_service_id: formData.parasutServiceId || null,
        parasut_id: formData.parasutId || null
      };

      if (formData.newPassword) {
        updateData.password_hash = formData.newPassword;
      }

      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', customer.id);

      if (customerUpdateError) throw customerUpdateError;

      if (pricingType === 'none') {
        await supabase.from('customer_pricing').delete().eq('customer_id', customer.id);
      } else {
        const pricingData = {
          customer_id: customer.id,
          monthly_price: pricingType === 'monthly' ? parseFloat(formData.monthlyPrice) : null,
          per_visit_price: pricingType === 'per_visit' ? parseFloat(formData.perVisitPrice) : null,
        };

        const { data: existingPricing } = await supabase
          .from('customer_pricing')
          .select('*')
          .eq('customer_id', customer.id)
          .maybeSingle();

        if (existingPricing) {
          await supabase.from('customer_pricing').update(pricingData).eq('customer_id', customer.id);
        } else {
          await supabase.from('customer_pricing').insert([pricingData]);
        }
      }

      if (selectedBranch) {
        if (branchPricingType === 'none') {
          await supabase.from('branch_pricing').delete().eq('branch_id', selectedBranch);
        } else {
          const branchPricingData = {
            branch_id: selectedBranch,
            monthly_price: branchPricingType === 'monthly' ? parseFloat(branchPricing.monthlyPrice) : null,
            per_visit_price: branchPricingType === 'per_visit' ? parseFloat(branchPricing.perVisitPrice) : null,
          };

          const { data: existingBranchPricing } = await supabase
            .from('branch_pricing')
            .select('*')
            .eq('branch_id', selectedBranch)
            .maybeSingle();

          if (existingBranchPricing) {
            await supabase.from('branch_pricing').update(branchPricingData).eq('branch_id', selectedBranch);
          } else {
            await supabase.from('branch_pricing').insert([branchPricingData]);
          }
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
          <div className="flex overflow-x-auto">
            <button onClick={() => setActiveTab('basic')} className={`px-4 py-2 font-medium whitespace-nowrap text-sm ${activeTab === 'basic' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Temel Bilgiler</button>
            {isAdmin && (<button onClick={() => setActiveTab('pricing')} className={`px-4 py-2 font-medium whitespace-nowrap text-sm ${activeTab === 'pricing' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Fiyatlandırma</button>)}
            {isAdmin && (<button onClick={() => setActiveTab('product_pricing')} className={`px-4 py-2 font-medium whitespace-nowrap text-sm ${activeTab === 'product_pricing' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Malzeme Fiyatları</button>)}
            {isAdmin && (<button onClick={() => setActiveTab('account')} className={`px-4 py-2 font-medium whitespace-nowrap text-sm ${activeTab === 'account' ? 'border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Giriş Bilgileri</button>)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (<div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>)}

          {activeTab === 'basic' && (
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Müşteri Durumu</p>
                    <p className="text-xs text-gray-500">Pasif müşteriler takvim, ziyaret ve raporlama alanlarında görünmez</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomerIsActive(!customerIsActive)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${customerIsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}
                  >
                    {customerIsActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {customerIsActive ? 'Aktif' : 'Pasif'}
                  </button>
                </div>
              )}

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasWithholding}
                    onChange={(e) => setFormData({ ...formData, hasWithholding: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="block font-medium text-blue-900 text-sm">Tevkifat Uygula (9/10)</span>
                    <span className="text-xs text-blue-700">Bu müşteri için fatura kalemlerine 9/10 oranında tevkifat uygulanır.</span>
                  </div>
                </label>
              </div>

              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 mt-6">
                <h3 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm animate-pulse"></div>
                  PARAŞÜT ENTEGRASYON AYARLARI
                </h3>
                
                <div className="space-y-5">
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
                        onClick={() => handleParasutSearch('contact', customer.cari_isim || customer.kisa_isim)}
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
                            <span className="text-[10px] font-mono text-blue-600 bg-blue-100/50 px-1.5 py-0.5 rounded self-start">ID: {item.id}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri No</label>
                  <input type="text" value={customer.musteri_no} className="w-full p-2 border rounded bg-gray-100" disabled />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kısa İsim</label>
                  <input type="text" value={formData.kisaIsim} onChange={(e) => setFormData({ ...formData, kisaIsim: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cari İsim</label>
                  <input type="text" value={formData.cariIsim} onChange={(e) => setFormData({ ...formData, cariIsim: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <p className="mt-1 text-xs text-gray-500">Muhasebe sisteminde kullanılacak isim</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="tel" value={formData.telefon} onChange={(e) => setFormData({ ...formData, telefon: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Posta</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vergi Dairesi</label>
                  <input type="text" value={formData.taxOffice} onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vergi Numarası</label>
                  <input type="text" value={formData.taxNumber} onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
                  <select value={formData.sehir} onChange={(e) => setFormData({ ...formData, sehir: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Seçiniz</option>
                    {cities.map((city) => (<option key={city} value={city}>{city}</option>))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                  <textarea value={formData.adres} onChange={(e) => setFormData({ ...formData, adres: e.target.value })} rows={2} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'pricing' && isAdmin && ( <div className="space-y-6"> {/* Customer Pricing */} <div className="border-t pt-4"> <h3 className="text-lg font-medium mb-3">Müşteri Fiyatlandırma</h3> <div className="space-y-4"> <div className="flex items-center space-x-4"> <label className="flex items-center"> <input type="radio" name="pricingType" checked={pricingType === 'none'} onChange={() => setPricingType('none')} className="mr-2" /> <span>Fiyatlandırma Yok</span> </label> <label className="flex items-center"> <input type="radio" name="pricingType" checked={pricingType === 'monthly'} onChange={() => setPricingType('monthly')} className="mr-2" /> <span>Aylık Fiyat</span> </label> <label className="flex items-center"> <input type="radio" name="pricingType" checked={pricingType === 'per_visit'} onChange={() => setPricingType('per_visit')} className="mr-2" /> <span>Ziyaret Başı Fiyat</span> </label> </div> {pricingType === 'monthly' && ( <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Aylık Fiyat (₺) </label> <input type="number" step="0.01" min="0" value={formData.monthlyPrice} onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" required /> </div> )} {pricingType === 'per_visit' && ( <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Ziyaret Başı Fiyat (₺) </label> <input type="number" step="0.01" min="0" value={formData.perVisitPrice} onChange={(e) => setFormData({ ...formData, perVisitPrice: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" required /> </div> )} </div> </div> {/* Branch Pricing */} <div className="border-t pt-4"> <h3 className="text-lg font-medium mb-3">Şube Fiyatlandırma</h3> <div className="space-y-4"> <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Şube Seçin </label> <select value={selectedBranch} onChange={(e) => handleBranchChange(e.target.value)} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" > <option value="">Şube Seçiniz</option> {branches.map(branch => ( <option key={branch.id} value={branch.id}>{branch.sube_adi}</option> ))} </select> </div> {selectedBranch && ( <> <div className="flex items-center space-x-4"> <label className="flex items-center"> <input type="radio" name="branchPricingType" checked={branchPricingType === 'none'} onChange={() => setBranchPricingType('none')} className="mr-2" /> <span>Fiyatlandırma Yok</span> </label> <label className="flex items-center"> <input type="radio" name="branchPricingType" checked={branchPricingType === 'monthly'} onChange={() => setBranchPricingType('monthly')} className="mr-2" /> <span>Aylık Fiyat</span> </label> <label className="flex items-center"> <input type="radio" name="branchPricingType" checked={branchPricingType === 'per_visit'} onChange={() => setBranchPricingType('per_visit')} className="mr-2" /> <span>Ziyaret Başı Fiyat</span> </label> </div> {branchPricingType === 'monthly' && ( <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Aylık Fiyat (₺) </label> <input type="number" step="0.01" min="0" value={branchPricing.monthlyPrice} onChange={(e) => setBranchPricing({ ...branchPricing, monthlyPrice: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" required /> </div> )} {branchPricingType === 'per_visit' && ( <div> <label className="block text-sm font-medium text-gray-700 mb-1"> Ziyaret Başı Fiyat (₺) </label> <input type="number" step="0.01" min="0" value={branchPricing.perVisitPrice} onChange={(e) => setBranchPricing({ ...branchPricing, perVisitPrice: e.target.value })} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500" required /> </div> )} </> )} </div> </div> </div> )}

          {activeTab === 'product_pricing' && isAdmin && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Müşteriye Özel Ücretli Malzeme Fiyatları</h3>
                <p className="text-sm text-gray-500 mt-1">Boş bırakılan ürünlerde genel liste fiyatı uygulanır. Fiyat girilen ürünlerde bu müşteriye özel fiyat kullanılır.</p>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ürün ara..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              </div>
              <div className="max-h-[40vh] overflow-y-auto border rounded-lg divide-y divide-gray-100">
                {paidProducts
                  .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
                  .map(product => {
                    const hasCustomPrice = customerProductPrices.has(product.id);
                    return (
                      <div key={product.id} className={`flex items-center gap-3 px-3 py-2.5 ${hasCustomPrice ? 'bg-green-50' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                          <p className="text-xs text-gray-400">Liste: {product.price.toLocaleString('tr-TR')} TL / {product.unit_type}</p>
                        </div>
                        <div className="w-36 shrink-0">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={product.price.toLocaleString('tr-TR')}
                            value={customerProductPrices.get(product.id) ?? ''}
                            onChange={(e) => handleProductPriceChange(product.id, e.target.value)}
                            className="w-full p-1.5 border rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="flex justify-between items-center pt-2">
                <p className="text-xs text-gray-500">
                  {customerProductPrices.size} ürün için özel fiyat tanımlı
                </p>
                <button
                  type="button"
                  onClick={handleSaveProductPrices}
                  disabled={savingProductPrices}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-2"
                >
                  {savingProductPrices && <Loader2 size={14} className="animate-spin" />}
                  Malzeme Fiyatlarını Kaydet
                </button>
              </div>
            </div>
          )}

          {activeTab === 'account' && isAdmin && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Müşteri Giriş Bilgileri</h3>
              <p className="text-sm text-gray-500 mb-4">Müşterinin sisteme giriş yapmak için kullanacağı bilgiler.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-posta (Kullanıcı Adı)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="musteri@ornek.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Şifre</label>
                  <input
                    type="text"
                    value={currentPassword}
                    className="w-full p-2 border rounded bg-gray-100 font-mono text-sm"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">Mevcut şifre görüntüleniyor</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Yeni şifre (boş bırakılırsa değişmez)"
                    minLength={6}
                  />
                  <p className="mt-1 text-xs text-gray-500">En az 6 karakter. Boş bırakılırsa şifre değişmez.</p>
                </div>
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
