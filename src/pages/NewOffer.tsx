// src/pages/NewOffer.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, FileImage, FileText, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// --- ARAYÜZLER (INTERFACES) ---
interface Customer {
  id: string;
  kisa_isim: string;
  cari_isim?: string;
  musteri_no?: string;
  adres?: string;
  sehir?: string;
  email?: string;
}

interface Branch {
  id: string;
  sube_adi: string;
}

interface OfferItem {
  id: string;
  description: string;
  explanation: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
}

interface CompanySettings {
  company_name: string;
  address: string;
  phone: string;
  email: string;
  tax_office: string;
  tax_number: string;
  logo_url?: string;
  offer_prefix?: string;
}

// --- BİLEŞEN (COMPONENT) ---

const NewOfferPage: React.FC = () => {
  const navigate = useNavigate();

  // --- STATE YÖNETİMİ ---
  const [teklif_no, setTeklifNo] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [otherCustomerName, setOtherCustomerName] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [offer_date, setOfferDate] = useState(new Date().toISOString().split('T')[0]);
  const [validity_date, setValidityDate] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [items, setItems] = useState<OfferItem[]>([
    { id: crypto.randomUUID(), description: '', explanation: '', quantity: 1, unit: 'Adet', unitPrice: 0, vatRate: 20 },
  ]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // --- YARDIMCI FONKSİYONLAR ---

  const formatCurrency = (value: number) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

  const generateLiveHTML = () => {
    if (!companySettings || (selectedCustomerId === '' && otherCustomerName === '')) return '';

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const customerName = selectedCustomerId === 'other' 
      ? otherCustomerName 
      : selectedCustomer?.kisa_isim || '';

    const subTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const vatAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.vatRate / 100), 0);
    const grandTotal = subTotal + vatAmount;

    const itemsHTML = items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          <strong>${item.description || '(Açıklama Giriniz)'}</strong>
          ${item.explanation ? `<br><small style="color: #555;">${item.explanation}</small>` : ''}
        </td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-center">${item.unit}</td>
        <td class="text-right">${formatCurrency(item.unitPrice)}</td>
        <td class="text-center">%${item.vatRate}</td>
        <td class="text-right">${formatCurrency(item.quantity * item.unitPrice)}</td>
      </tr>
    `).join('');
    
    const customerDetailsHTML = selectedCustomerId !== 'other' && selectedCustomer ? `
      <p>
        <strong>${selectedCustomer.cari_isim || customerName}</strong><br>
        ${selectedCustomer.adres || ''} ${selectedCustomer.sehir || ''}<br>
        ${branches.find(b => b.id === selectedBranchId)?.sube_adi || ''}<br>
        ${selectedCustomer.email ? `E-posta: ${selectedCustomer.email}<br>` : ''}
      </p>
    ` : `<p><strong>${customerName}</strong></p>`;


    return `
      <style>
        .offer-preview { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; margin: auto; width: 210mm; min-height: 297mm; padding: 15mm; background: white; box-shadow: 0 0 15px rgba(0,0,0,0.15); }
        .offer-preview header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #047857; padding-bottom: 15px; }
        .offer-preview header h1 { font-size: 2.4em; color: #065f46; margin: 0; font-weight: 300; letter-spacing: 1px; }
        .offer-preview .company-logo { max-width: 160px; max-height: 60px; }
        .offer-preview .info-section { display: flex; justify-content: space-between; margin-top: 25px; font-size: 0.9em; line-height: 1.6; }
        .offer-preview .info-section div { width: 48%; }
        .offer-preview .info-section h2 { font-size: 1.1em; color: #047857; border-bottom: 1px solid #d1fae5; padding-bottom: 5px; margin-bottom: 10px; font-weight: 600; }
        .offer-preview .details-section { background-color: #f0fdf4; border: 1px solid #d1fae5; padding: 12px; margin: 25px 0; display: flex; justify-content: space-around; font-weight: 500; border-radius: 8px; }
        .offer-preview table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.9em; }
        .offer-preview th, .offer-preview td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
        .offer-preview thead { background-color: #065f46; color: white; }
        .offer-preview tbody tr:nth-child(even) { background-color: #f9fafb; }
        .offer-preview .totals-section { display: flex; justify-content: flex-end; margin-top: 25px; }
        .offer-preview .totals-section table { width: 350px; font-size: 1em; }
        .offer-preview .totals-section td { border: none; padding: 5px 10px; }
        .offer-preview .totals-section .grand-total { font-weight: bold; font-size: 1.3em; color: #065f46; border-top: 2px solid #065f46; padding-top: 10px !important; }
        .offer-preview .notes-section { margin-top: 35px; font-size: 0.85em; color: #4b5563; border-top: 1px solid #e5e7eb; padding-top: 15px; }
        .offer-preview footer { margin-top: auto; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 0.8em; color: #6b7280;}
        .offer-preview .text-right { text-align: right; }
        .offer-preview .text-center { text-align: center; }
      </style>
      <div id="offer-to-capture" class="offer-preview">
        <main>
          <header>
            ${companySettings.logo_url ? `<img src="${companySettings.logo_url}" alt="Logo" class="company-logo">` : `<h2>${companySettings.company_name}</h2>`}
            <h1>TEKLİF</h1>
          </header>
          <section class="info-section">
            <div>
              <h2>Teklifi Hazırlayan</h2>
              <p><strong>${companySettings.company_name}</strong><br>${companySettings.address}<br>Tel: ${companySettings.phone}<br>Vergi: ${companySettings.tax_office}<br>Vergi No: ${companySettings.tax_number}</p>
            </div>
            <div>
              <h2>Müşteri</h2>
              ${customerDetailsHTML}
            </div>
          </section>
          <section class="details-section">
            <span>Teklif No: ${teklif_no || '(Otomatik)'}</span>
            <span>Tarih: ${new Date(offer_date).toLocaleDateString('tr-TR')}</span>
            <span>Geçerlilik: ${new Date(validity_date).toLocaleDateString('tr-TR')}</span>
          </section>
          <section>
            <table>
              <thead><tr><th>#</th><th>Açıklama</th><th>Miktar</th><th>Birim</th><th>Birim Fiyat</th><th>KDV</th><th>Toplam</th></tr></thead>
              <tbody>${itemsHTML}</tbody>
            </table>
          </section>
          <section class="totals-section">
            <table>
              <tr><td>Ara Toplam</td><td class="text-right">${formatCurrency(subTotal)}</td></tr>
              <tr><td>Toplam KDV</td><td class="text-right">${formatCurrency(vatAmount)}</td></tr>
              <tr class="grand-total"><td>GENEL TOPLAM</td><td class="text-right">${formatCurrency(grandTotal)}</td></tr>
            </table>
          </section>
          ${aciklama ? `<section class="notes-section"><h2>Açıklamalar</h2><p>${aciklama.replace(/\n/g, '<br>')}</p></section>` : ''}
        </main>
        <footer>
          <p>ilaclamatik.com - ${companySettings.company_name}</p>
        </footer>
      </div>
    `;
  };

  // --- useEffect HOOKS ---

  useEffect(() => {
    const loadScript = (src: string, id: string) => new Promise((resolve, reject) => {
      if (document.getElementById(id)) return resolve(true);
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error(`Script load error for ${src}`));
      document.body.appendChild(script);
    });

    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas-script')
    ]).then(() => setScriptsLoaded(true)).catch(error => toast.error("Gerekli kütüphaneler yüklenemedi."));
  }, []);

  useEffect(() => {
    const generateNewOfferNumber = async (prefix: string = 'TEKLIF') => {
        const { data, error } = await supabase
            .from('offers')
            .select('teklif_no')
            .like('teklif_no', `${prefix}%`)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error(error);
            return `${prefix}-${new Date().getFullYear()}-0001`;
        }

        if (data && data.length > 0) {
            const lastNum = parseInt(data[0].teklif_no.split('-').pop() || '0', 10);
            const newNum = (lastNum + 1).toString().padStart(4, '0');
            return `${prefix}-${new Date().getFullYear()}-${newNum}`;
        } else {
            return `${prefix}-${new Date().getFullYear()}-0001`;
        }
    };

    const fetchInitialData = async () => {
      try {
        const settingsPromise = supabase.from('company_settings').select('*').single();
        const customersPromise = supabase.from('customers').select('id, kisa_isim, cari_isim, musteri_no, adres, sehir, email').order('kisa_isim');
        
        const [{ data: settingsData, error: settingsError }, { data: customersData, error: customersError }] = await Promise.all([settingsPromise, customersPromise]);

        if (settingsError) throw settingsError;
        setCompanySettings(settingsData);

        if (customersError) throw customersError;
        setCustomers(customersData || []);
        
        const newOfferNo = await generateNewOfferNumber(settingsData?.offer_prefix);
        setTeklifNo(newOfferNo);

      } catch (err) {
        toast.error("Veriler yüklenirken bir hata oluştu.");
      }
    };
    fetchInitialData();
  }, []);
  
  useEffect(() => {
    const fetchBranches = async () => {
      if (!selectedCustomerId || selectedCustomerId === 'other') {
        setBranches([]);
        setSelectedBranchId('');
        return;
      }
      const { data, error } = await supabase.from('branches').select('id, sube_adi').eq('customer_id', selectedCustomerId);
      if (error) {
        toast.error("Şubeler getirilirken hata oluştu.");
      } else {
        setBranches(data || []);
      }
    };
    fetchBranches();
  }, [selectedCustomerId]);

  useEffect(() => {
    const date = new Date(offer_date);
    date.setDate(date.getDate() + 30); // Varsayılan 30 gün
    setValidityDate(date.toISOString().split('T')[0]);
  }, [offer_date]);

  useEffect(() => {
    const html = generateLiveHTML();
    setPreviewHtml(html);
  }, [items, teklif_no, selectedCustomerId, otherCustomerName, selectedBranchId, offer_date, validity_date, aciklama, companySettings]);

  // --- EVENT HANDLERS ---

  const handleItemChange = (id: string, field: keyof OfferItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), description: '', explanation: '', quantity: 1, unit: 'Adet', unitPrice: 0, vatRate: 20 }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    } else {
      toast.info('Teklifte en az bir satır olmalıdır.');
    }
  };

  const downloadAs = async (format: 'jpeg' | 'pdf') => {
    if (!scriptsLoaded) return toast.error("İndirme kütüphaneleri henüz hazır değil.");
    const html2canvas = (window as any).html2canvas;
    const jsPDF = (window as any).jspdf.jsPDF;
    if (!html2canvas || !jsPDF) return toast.error("PDF/JPEG oluşturma kütüphaneleri yüklenemedi.");
    
    const scaler = document.getElementById('preview-scaler');
    const captureElement = document.getElementById('offer-to-capture');
    if (!scaler || !captureElement) return toast.error("Önizleme alanı bulunamadı.");

    toast.info(`${format.toUpperCase()} oluşturuluyor...`);
    
    scaler.style.transform = 'none';
    scaler.style.boxShadow = 'none';

    try {
      const canvas = await html2canvas(captureElement, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      if (format === 'jpeg') {
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `${teklif_no || 'teklif'}.jpeg`;
        link.click();
      } else {
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Calculate the aspect ratio of the canvas
        const aspectRatio = canvas.width / canvas.height;
        
        // Calculate the image dimensions to fit within the PDF page while maintaining aspect ratio
        let imgWidth = pdfWidth;
        let imgHeight = pdfWidth / aspectRatio;

        // If the calculated height exceeds the PDF height, scale down based on height
        if (imgHeight > pdfHeight) {
            imgHeight = pdfHeight;
            imgWidth = pdfHeight * aspectRatio;
        }

        // Center the image on the PDF page
        const x = (pdfWidth - imgWidth) / 2;
        const y = (pdfHeight - imgHeight) / 2;

        pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
        pdf.save(`${teklif_no || 'teklif'}.pdf`);
      }
      toast.success(`${format.toUpperCase()} başarıyla indirildi!`);
    } catch (error) {
      toast.error(`${format.toUpperCase()} oluşturulurken bir hata oluştu.`);
    } finally {
      scaler.style.transform = 'scale(0.75)';
      scaler.style.boxShadow = '0 0 20px rgba(0,0,0,0.2)';
    }
  };
  
  const handleSubmit = async () => {
    let finalCustomerId = selectedCustomerId;

    if (selectedCustomerId === 'other') {
        if (!otherCustomerName.trim()) return toast.error("Lütfen yeni müşteri adını girin.");
        // ✅ DEĞİŞİKLİK: is_one_time: true eklendi
        const { data: newCustomer, error } = await supabase.from('customers').insert({ kisa_isim: otherCustomerName, cari_isim: otherCustomerName, is_one_time: true }).select('id').single();
        if (error || !newCustomer) {
            toast.error("Yeni müşteri oluşturulurken hata oluştu.");
            return;
        }
        finalCustomerId = newCustomer.id;
    }

    if (!teklif_no || !finalCustomerId) {
        return toast.error("Lütfen Teklif Numarası ve Müşteri alanlarını doldurun.");
    }
    setLoading(true);
    toast.info("Teklif kaydediliyor...");
    
    try {
        const subTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const vatAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.vatRate / 100), 0);
        const grandTotal = subTotal + vatAmount;

        const { data: offerData, error: offerError } = await supabase
            .from('offers')
            .insert({
                teklif_no,
                customer_id: finalCustomerId,
                branch_id: selectedBranchId || null,
                offer_date,
                validity_date,
                status: 'draft',
                total_amount: grandTotal,
                aciklama,
                tarih: offer_date,
                gecerlilik: validity_date,
                tutar: grandTotal,
                durum: 'draft',
                tur: 'satis'
            })
            .select('id')
            .single();

        if (offerError) throw offerError;

        const offerItemsPayload = items.map(item => ({
            offer_id: offerData.id,
            description: item.description,
            explanation: item.explanation,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unitPrice,
            vat_rate: item.vatRate,
            total_price: item.quantity * item.unitPrice
        }));

        const { error: itemsError } = await supabase.from('offer_items').insert(offerItemsPayload);

        if (itemsError) throw itemsError;

        toast.success("Teklif başarıyla veritabanına kaydedildi!");
        navigate('/teklifler');

    } catch (err: any) {
        toast.error(`Kayıt sırasında hata: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  // --- RENDER ---

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100">
      {/* Sol Taraf: Form Alanı */}
      <div className="lg:w-1/2 p-4 sm:p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><ArrowLeft /></button>
          <h1 className="text-2xl font-bold text-gray-800">Yeni Teklif Oluştur</h1>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg space-y-6">
            <h2 className="font-semibold text-xl text-gray-700 border-b pb-3">Genel Bilgiler</h2>
            <div>
                <label className="block text-sm font-medium text-gray-600">Teklif Numarası</label>
                <input type="text" value={teklif_no} readOnly className="w-full p-2 mt-1 border rounded-md bg-gray-100 cursor-not-allowed" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-600">Müşteri</label>
                <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-2 mt-1 border rounded-md">
                    <option value="">Müşteri Seçiniz...</option>
                    <option value="other">Diğer (Yeni Müşteri Ekle)</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
                </select>
            </div>
            {selectedCustomerId === 'other' && (
                <div>
                    <label className="block text-sm font-medium text-gray-600">Yeni Müşteri Adı</label>
                    <input type="text" value={otherCustomerName} onChange={e => setOtherCustomerName(e.target.value)} placeholder="Yeni müşteri adını yazın" className="w-full p-2 mt-1 border rounded-md" />
                </div>
            )}
            {branches.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-gray-600">Şube (Opsiyonel)</label>
                    <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)} className="w-full p-2 mt-1 border rounded-md">
                        <option value="">Şube Seçiniz...</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
                    </select>
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-gray-600">Teklif Tarihi</label>
                <input type="date" value={offer_date} onChange={e => setOfferDate(e.target.value)} className="w-full p-2 mt-1 border rounded-md" />
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
            <h2 className="font-semibold text-xl text-gray-700 border-b pb-3">Teklif Kalemleri</h2>
            {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-3 p-4 border rounded-lg bg-gray-50">
                    <div className="col-span-12 md:col-span-6 space-y-2">
                        <input type="text" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} placeholder="Ürün/Hizmet Adı" className="w-full p-2 border rounded-md"/>
                        <input type="text" value={item.explanation} onChange={e => handleItemChange(item.id, 'explanation', e.target.value)} placeholder="Detay (opsiyonel)" className="w-full p-2 border rounded-md text-sm"/>
                    </div>
                    <div className="col-span-6 md:col-span-2"><input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)} placeholder="Miktar" className="w-full p-2 border rounded-md text-center"/></div>
                    <div className="col-span-6 md:col-span-2">
                        <select value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} className="w-full p-2 border rounded-md">
                            <option>Adet</option><option>Saat</option><option>Gün</option><option>Paket</option>
                        </select>
                    </div>
                    <div className="col-span-12 md:col-span-2 flex items-center justify-end">
                        <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors" disabled={items.length === 1}><Trash2 size={18}/></button>
                    </div>
                    <div className="col-span-6"><input type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} placeholder="Birim Fiyat" className="w-full p-2 border rounded-md text-right"/></div>
                    <div className="col-span-6">
                        <select value={item.vatRate} onChange={e => handleItemChange(item.id, 'vatRate', parseInt(e.target.value))} className="w-full p-2 border rounded-md">
                            <option value="20">%20 KDV</option><option value="10">%10 KDV</option><option value="1">%1 KDV</option><option value="0">%0 KDV</option>
                        </select>
                    </div>
                </div>
            ))}
            <button onClick={handleAddItem} className="w-full p-2 border-2 border-dashed rounded-lg text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition-colors flex items-center justify-center gap-2"><Plus size={16}/>Yeni Kalem Ekle</button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="font-semibold text-xl text-gray-700 border-b pb-3">Notlar</h2>
            <textarea value={aciklama} onChange={e => setAciklama(e.target.value)} className="w-full mt-4 p-2 border rounded-md" rows={4} placeholder="Teklifle ilgili ek notlar, ödeme koşulları vb."></textarea>
        </div>
      </div>

      {/* Sağ Taraf: Canlı Önizleme */}
      <div className="lg:w-1/2 flex flex-col bg-gray-800 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Canlı Önizleme</h2>
          <div className="flex gap-2">
            <button onClick={() => downloadAs('jpeg')} disabled={!scriptsLoaded} className="px-3 py-2 bg-white rounded-lg shadow-sm hover:bg-gray-200 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"><FileImage size={16}/> JPEG</button>
            <button onClick={() => downloadAs('pdf')} disabled={!scriptsLoaded} className="px-3 py-2 bg-white rounded-lg shadow-sm hover:bg-gray-200 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"><FileText size={16}/> PDF</button>
            <button onClick={handleSubmit} disabled={loading} className="px-3 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 flex items-center gap-2 text-sm disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
              Kaydet
            </button>
          </div>
        </div>
        <div className="flex-grow bg-gray-400 shadow-lg rounded-lg overflow-auto p-4 flex items-center justify-center">
            <div id="preview-scaler" className="transform scale-75 origin-top transition-transform duration-300" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.2)' }}>
                <div dangerouslySetInnerHTML={{ __html: previewHtml || '<div class="text-center text-gray-500 p-10 bg-white w-[210mm]">Önizleme için lütfen formu doldurun.</div>' }} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default NewOfferPage;
