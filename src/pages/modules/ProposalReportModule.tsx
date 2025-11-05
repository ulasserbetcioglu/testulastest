import React, { useState, useEffect, useRef } from 'react';
// DÜZELTME: supabase import yolu, dosyanın konumuna göre düzeltildi.
import { supabase } from '../../lib/supabase'; 
import { FileText, User, Building, DollarSign, Microscope, Shield, Calendar, PlusCircle, Trash2, Printer, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
// DÜZELTME: Eksik olan 'format' fonksiyonu 'date-fns' kütüphanesinden import edildi.
import { format } from 'date-fns';

// --- ARAYÜZLER (INTERFACES) ---
interface Customer {
  id: string;
  kisa_isim: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
}

interface ScopeItem {
  id: number;
  area: string;
  action: string;
}

interface ProductItem {
  id: number;
  product_id: string;
  product_name: string;
  usage_description: string;
}

const ProposalReportModule: React.FC = () => {
  // --- STATE YÖNETİMİ ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form Verileri
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().split('T')[0]);
  const [preparedBy, setPreparedBy] = useState('');
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([{ id: 1, area: '', action: '' }]);
  const [productItems, setProductItems] = useState<ProductItem[]>([{ id: 1, product_id: '', product_name: '', usage_description: '' }]);
  const [price, setPrice] = useState('');
  const [terms, setTerms] = useState('Teklif, onay tarihinden itibaren 15 gün geçerlidir.\nÖdeme, hizmet sonrası 7 gün içinde yapılmalıdır.');
  
  const reportRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  // --- VERİ ÇEKME ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [customersRes, productsRes] = await Promise.all([
          supabase.from('customers').select('id, kisa_isim').order('kisa_isim'),
          supabase.from('products').select('id, name, description').order('name')
        ]);

        if (customersRes.error) throw customersRes.error;
        if (productsRes.error) {
            console.warn("Ürünler tablosu bulunamadı veya yüklenemedi:", productsRes.error.message);
            toast.warning("Ürün listesi yüklenemedi. Lütfen veritabanı ayarlarınızı kontrol edin.");
        }

        setCustomers(customersRes.data || []);
        setProducts(productsRes.data || []);
      } catch (error: any) {
        toast.error('Gerekli veriler yüklenemedi: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // --- KAPSAM (SCOPE) FONKSİYONLARI ---
  const addScopeItem = () => {
    setScopeItems([...scopeItems, { id: Date.now(), area: '', action: '' }]);
  };

  const removeScopeItem = (id: number) => {
    setScopeItems(scopeItems.filter(item => item.id !== id));
  };

  const handleScopeChange = (id: number, field: 'area' | 'action', value: string) => {
    setScopeItems(scopeItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // --- ÜRÜN FONKSİYONLARI ---
  const addProductItem = () => {
    setProductItems([...productItems, { id: Date.now(), product_id: '', product_name: '', usage_description: '' }]);
  };

  const removeProductItem = (id: number) => {
    setProductItems(productItems.filter(item => item.id !== id));
  };

  const handleProductChange = (id: number, field: 'product_id' | 'usage_description', value: string) => {
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id === value);
      setProductItems(productItems.map(item => item.id === id ? { ...item, product_id: value, product_name: selectedProduct?.name || '' } : item));
    } else {
      setProductItems(productItems.map(item => item.id === id ? { ...item, [field]: value } : item));
    }
  };
  
  // --- RAPOR OLUŞTURMA ---
  const generateReport = async () => {
    if (!selectedCustomerId || !price || !preparedBy) {
        toast.error("Lütfen müşteri, hazırlayan ve fiyat alanlarını doldurun.");
        return;
    }
    if (!reportRef.current) return;

    setGenerating(true);
    toast.info("Rapor oluşturuluyor, lütfen bekleyin...");

    try {
        const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/jpeg', 0.98);
        const customerName = customers.find(c => c.id === selectedCustomerId)?.kisa_isim || 'teklif';
        link.download = `Teklif_Raporu_${customerName.replace(/\s+/g, '_')}.jpeg`;
        link.click();
        toast.success("Rapor başarıyla oluşturuldu ve indirildi!");
    } catch (error) {
        toast.error("Rapor oluşturulurken bir hata oluştu.");
        console.error(error);
    } finally {
        setGenerating(false);
    }
  };
  
  const selectedCustomerName = customers.find(c => c.id === selectedCustomerId)?.kisa_isim || '';

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin inline-block" /> Veriler yükleniyor...</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="bg-white shadow-md rounded-xl p-6 mb-8 border border-gray-200">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mr-6">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Teklif ve Hizmet Raporu Modülü</h1>
              <p className="text-gray-500 mt-1">Müşterilerinize detaylı ve profesyonel hizmet teklifleri hazırlayın.</p>
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* --- FORM ALANI --- */}
          <div className="bg-white shadow-md rounded-xl p-8 border border-gray-200 space-y-8">
            {/* Müşteri Bilgileri */}
            <section>
              <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">1. Teklif Bilgileri</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Müşteri</label>
                  <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
                    <option value="">Müşteri Seçin</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Teklif Tarihi</label>
                  <input type="date" value={proposalDate} onChange={(e) => setProposalDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Hazırlayan</label>
                  <input type="text" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Adınız Soyadınız" className="w-full p-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
            </section>

            {/* Kapsam */}
            <section>
              <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">2. Hizmet Kapsamı ve Yöntemler</h2>
              <div className="space-y-3">
                {scopeItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border relative">
                    <input type="text" value={item.area} onChange={(e) => handleScopeChange(item.id, 'area', e.target.value)} placeholder="Alan (Örn: Mutfak)" className="w-full p-2 border border-gray-300 rounded-md" />
                    <textarea value={item.action} onChange={(e) => handleScopeChange(item.id, 'action', e.target.value)} placeholder="Yapılacak İşlem (Örn: Jel uygulaması)" rows={1} className="w-full p-2 border border-gray-300 rounded-md" />
                    {scopeItems.length > 1 && <button onClick={() => removeScopeItem(item.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><Trash2 className="h-3 w-3" /></button>}
                  </div>
                ))}
              </div>
              <button onClick={addScopeItem} className="mt-3 flex items-center px-4 py-2 bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-200"><PlusCircle className="h-4 w-4 mr-2" />Kapsam Ekle</button>
            </section>

            {/* Ürünler */}
            <section>
              <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">3. Kullanılacak Ürünler</h2>
              <div className="space-y-3">
                {productItems.map(item => (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border relative">
                    <select value={item.product_id} onChange={(e) => handleProductChange(item.id, 'product_id', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                      <option value="">Ürün Seçin</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <textarea value={item.usage_description} onChange={(e) => handleProductChange(item.id, 'usage_description', e.target.value)} placeholder="Kullanım şekli ve notlar" rows={1} className="w-full p-2 border border-gray-300 rounded-md" />
                    {productItems.length > 1 && <button onClick={() => removeProductItem(item.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><Trash2 className="h-3 w-3" /></button>}
                  </div>
                ))}
              </div>
              <button onClick={addProductItem} className="mt-3 flex items-center px-4 py-2 bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-200"><PlusCircle className="h-4 w-4 mr-2" />Ürün Ekle</button>
            </section>

            {/* Fiyatlandırma */}
            <section>
              <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4">4. Fiyatlandırma ve Şartlar</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Teklif Tutarı (₺)</label>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full p-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teklif Şartları</label>
                  <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} className="w-full p-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
            </section>
            
            <div className="pt-4 border-t">
                <button onClick={generateReport} disabled={generating} className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-lg disabled:opacity-50">
                    {generating ? <Loader2 className="animate-spin mr-2" /> : <Download className="h-5 w-5 mr-2" />}
                    Raporu Oluştur ve İndir
                </button>
            </div>
          </div>

          {/* --- RAPOR ÖNİZLEME ALANI --- */}
          <div className="bg-white shadow-lg print-section border-2 border-gray-200">
            <div ref={reportRef} className="bg-white p-8">
              {/* Rapor Başlığı */}
              <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Hizmet Teklif Raporu</h1>
                  <p className="text-gray-600">Tarih: {format(new Date(proposalDate), 'dd.MM.yyyy')}</p>
                </div>
                <div className="text-right">
                    <h2 className="font-bold text-lg">{selectedCustomerName || 'Müşteri Adı'}</h2>
                </div>
              </header>

              {/* Hizmet Kapsamı */}
              <section className="mb-8">
                <h3 className="text-lg font-bold text-blue-700 mb-3 border-b pb-2">Hizmet Kapsamı ve Uygulanacak Yöntemler</h3>
                <table className="w-full text-sm">
                    <tbody>
                        {scopeItems.map(item => item.area && (
                            <tr key={item.id} className="border-b">
                                <td className="py-2 pr-4 font-semibold align-top">{item.area}</td>
                                <td className="py-2 text-gray-700">{item.action}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </section>

              {/* Kullanılacak Ürünler */}
              <section className="mb-8">
                <h3 className="text-lg font-bold text-blue-700 mb-3 border-b pb-2">Kullanılacak Ürünler ve Bilgileri</h3>
                 <table className="w-full text-sm">
                    <tbody>
                        {productItems.map(item => item.product_id && (
                            <tr key={item.id} className="border-b">
                                <td className="py-2 pr-4 font-semibold align-top">{item.product_name}</td>
                                <td className="py-2 text-gray-700">{item.usage_description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </section>

              {/* Fiyat ve Şartlar */}
              <section className="mb-8">
                <h3 className="text-lg font-bold text-blue-700 mb-3 border-b pb-2">Fiyat ve Şartlar</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                        <span className="font-semibold text-gray-800">Teklif Tutarı:</span>
                        <span className="font-bold text-xl text-green-600">{parseFloat(price || '0').toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                    </div>
                    <h4 className="font-semibold text-gray-800 mt-4 mb-2">Teklif Şartları:</h4>
                    <p className="text-xs whitespace-pre-wrap text-gray-600">{terms}</p>
                </div>
              </section>

              {/* Alt Bilgi */}
              <footer className="text-center pt-6 border-t mt-8">
                <p className="text-sm font-semibold">Hazırlayan: {preparedBy || '...'}</p>
                <p className="text-xs text-gray-500 mt-1">Bu teklif raporu, firmanıza özel olarak hazırlanmıştır.</p>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalReportModule;
