import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Mail, Send, Loader2 as Loader, MessageSquare, Plus, Save, Bug, Check, FileDown, Package } from 'lucide-react';

// --- ARAYÜZLER ---
interface Customer {
  id: string;
  kisa_isim: string;
  email: string;
}

interface Service {
  id: number;
  name: string;
  description: string;
  image_url: string;
  price: number | null;
  visit_count: number | null;
  type: 'service'; // Tür belirtmek için
}

interface Product {
  id: string; // Genelde uuid olur
  name: string;
  description: string;
  price: number;
  image_url?: string;
  type: 'product'; // Tür belirtmek için
}

// Ortak Seçili Öğe Arayüzü
interface SelectedItem {
  id: number | string; // Hem number (service) hem string (product) olabilir
  type: 'service' | 'product';
  name: string;
  description?: string;
  image_url?: string;
  visitCount: number; // Ürünler için 'Adet' olarak kullanılacak
  price: number;
  explanation: string;
  unitType: 'aylik' | 'seferlik' | 'adet'; // 'adet' eklendi
}

interface FooterInfo {
  id?: number;
  name: string;
  title: string;
  website: string;
  phone: string;
  logo_url: string;
}

// Zararlı Türleri Listesi
const PEST_TYPES = [
  'Hamam Böceği', 'Kemirgen', 'Karınca', 'Sinek', 'Güve', 'Örümcek', 'Gümüşçün', 'Pire', 'Kene', 'Tahtakurusu', 'Akrep'
];

// Footer HTML Oluşturucu
const generateSignatureHtml = (footer: FooterInfo): string => `
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eeeeee;">
    <tr>
      <td style="width: 80px; vertical-align: top;">
        <img src="${footer.logo_url}" alt="Logo" style="width: 70px; height: auto;">
      </td>
      <td style="vertical-align: top; padding-left: 15px; font-family: Arial, sans-serif;">
        <p style="margin: 0; font-weight: bold; color: #059669; font-size: 14px;">${footer.name}</p>
        <p style="margin: 4px 0; font-size: 12px; color: #555555;">${footer.title}</p>
        <p style="margin: 4px 0; font-size: 12px; color: #555555;">
          <a href="http://${footer.website}" style="color: #059669; text-decoration: none;">${footer.website}</a> | 
          <span style="color: #333333;">${footer.phone}</span>
        </p>
      </td>
    </tr>
  </table>
`;

const HizmetPazarlama: React.FC = () => {
  // --- STATE ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [productList, setProductList] = useState<Product[]>([]); // YENİ: Ürün Listesi
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]); // GÜNCELLENDİ: Hem hizmet hem ürün
  
  const [emailSubject, setEmailSubject] = useState('Hizmet ve Ürün Teklifimiz');
  const [emailPreview, setEmailPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Form Alanları
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  
  // Zararlı Seçimi
  const [selectedPests, setSelectedPests] = useState<string[]>(['Hamam Böceği', 'Kemirgen']);

  // Manuel Ekleme State'i
  const [manualType, setManualType] = useState<'service' | 'product'>('service');
  const [manualItem, setManualItem] = useState({ name: '', description: '', count: 1, price: 0 });

  // Footer Ayarları
  const [footerInfo, setFooterInfo] = useState<FooterInfo>({
    name: 'İlaçlamatik Ekibi',
    title: 'Profesyonel Zararlı Kontrol Çözümleri',
    website: 'www.ilaclamatik.com.tr',
    phone: '+90 555 123 4567',
    logo_url: 'https://i.imgur.com/PajSpus.png'
  });

  // --- VERİ ÇEKME ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [customerRes, serviceRes, productRes, settingsRes] = await Promise.all([
            supabase.from('customers').select('id, kisa_isim, email').not('email', 'is', null).order('kisa_isim'),
            supabase.from('services').select('*').order('name'),
            supabase.from('products').select('*').eq('is_active', true).order('name'), // Ürünleri çek
            supabase.from('company_settings').select('*').limit(1).single()
        ]);

        setCustomers(customerRes.data || []);
        
        // Tipleri ekleyerek set et
        setServiceList((serviceRes.data || []).map((s: any) => ({ ...s, type: 'service' })));
        setProductList((productRes.data || []).map((p: any) => ({ ...p, type: 'product' })));

        if (settingsRes.data) {
            setFooterInfo(settingsRes.data);
        }

      } catch (error: any) {
        toast.error('Veriler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  // Müşteri seçimi
  useEffect(() => {
      if (selectedCustomer) {
          const customer = customers.find(c => c.id === selectedCustomer);
          if (customer) {
              setCompanyName(customer.kisa_isim);
              setRecipientEmail(customer.email);
          }
      }
  }, [selectedCustomer, customers]);

  // --- HTML OLUŞTURUCU ---
  const generateEmailHtml = (customer: string, contact: string, items: SelectedItem[], signature: string, proposalLink?: string, password?: string): string => {
    let grandTotal = 0;
    const itemRows = items.map(item => {
      const totalItemPrice = item.unitType === 'aylik' ? (item.visitCount * item.price) : (item.visitCount * item.price); // Ürün için de adet * fiyat
      grandTotal += totalItemPrice;
      
      let unitText = '';
      if (item.type === 'service') {
          unitText = item.unitType === 'aylik' ? `${item.visitCount} Ziyaret / Ay` : `Tek Seferlik`;
      } else {
          unitText = `${item.visitCount} Adet`;
      }

      return `
      <tr style="border-bottom: 1px solid #eeeeee;">
        <td style="padding: 15px; width: 60px; vertical-align: top;">
          <img src="${item.image_url || 'https://placehold.co/60x60/e2e8f0/334155?text=' + (item.type === 'service' ? 'Hizmet' : 'Urun')}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
        </td>
        <td style="padding: 15px; vertical-align: top;">
          <p style="margin: 0; font-weight: bold; font-size: 14px; color: #333;">${item.name} <span style="font-size:10px; color:#666; background:#f3f4f6; padding:2px 6px; border-radius:4px;">${item.type === 'service' ? 'HİZMET' : 'ÜRÜN'}</span></p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">${item.description || ''}</p>
          ${item.explanation ? `<p style="margin: 6px 0 0 0; font-size: 12px; color: #4f46e5; font-style: italic;">Not: ${item.explanation}</p>` : ''}
        </td>
        <td style="padding: 15px; font-size: 13px; text-align: center; vertical-align: top; white-space: nowrap;">${unitText}</td>
        <td style="padding: 15px; font-size: 14px; text-align: right; vertical-align: top; font-weight: bold;">${item.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
      </tr>
    `}).join('');

    // Zararlı Listesi HTML'i (Dahil olanlar koyu, olmayanlar silik)
    const pestListHtml = PEST_TYPES.map(pest => {
        const isSelected = selectedPests.includes(pest);
        const color = isSelected ? '#059669' : '#9ca3af'; // Yeşil veya Gri
        const bg = isSelected ? '#ecfdf5' : '#f3f4f6';
        const decoration = isSelected ? 'none' : 'line-through';
        const opacity = isSelected ? '1' : '0.6';
        
        return `<span style="display:inline-block; padding: 4px 8px; margin: 2px; font-size: 11px; border-radius: 4px; background-color: ${bg}; color: ${color}; border: 1px solid ${isSelected ? '#a7f3d0' : '#e5e7eb'}; text-decoration: ${decoration}; opacity: ${opacity};">${pest}</span>`;
    }).join(' ');

    const pdfSection = proposalLink && password ? `
        <div style="margin-top: 30px; padding: 25px; background-color: #f8fafc; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
            <p style="margin:0; font-size: 16px; font-weight: bold; color: #1e293b;">Resmi Teklif Dökümanı</p>
            <p style="margin-top:8px;font-size:14px;color:#64748b;">Teklifinizi detaylı incelemek ve indirmek için aşağıdaki butonu kullanabilirsiniz.</p>
            
            <div style="margin: 20px auto; max-width: 300px; background: #ffffff; padding: 15px; border-radius: 6px; border: 1px dashed #cbd5e1;">
                <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">ERİŞİM KODU</p>
                <p style="margin:5px 0 0 0;font-size:24px;font-weight:bold;color:#0f172a;letter-spacing:4px;font-family:monospace;">${password}</p>
            </div>
            
            <a href="${proposalLink}" style="display:inline-block;background-color:#2563eb;color:white !important;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;">Teklifi Görüntüle</a>
        </div>
    ` : '';

    return `
      <!DOCTYPE html><html><head><style>body{font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#333; line-height: 1.6;}.container{max-width:700px;margin:auto;border:1px solid #e5e7eb; border-radius: 8px; overflow: hidden;}.header{background-color:#1e293b;color:white;padding:20px;text-align:center}.content{padding:30px}table{width:100%;border-collapse:collapse}th{background-color:#f8fafc;text-align:left;padding:12px;font-size:12px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;}</style></head><body>
      <div class="container">
        <div class="header">
            <h2 style="margin:0; font-size: 24px;">FİYAT TEKLİFİ SUNULUR</h2>
            <p style="margin:5px 0 0 0; opacity: 0.8; font-size: 14px;">Hizmet & Ürün Detayları</p>
        </div>
        <div class="content">
            <p>Sayın <b>${contact || 'Yetkili'}</b>,</p>
            <p><b>${customer}</b> firması için özel olarak hazırladığımız teklifimiz aşağıda sunulmuştur.</p>
            
            <div style="margin: 20px 0; padding: 15px; background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #92400e;">HEDEF ZARARLILAR VE KAPSAM:</p>
                <div>${pestListHtml}</div>
            </div>

            <table style="margin-top:20px;margin-bottom:20px">
                <thead><tr><th>Açıklama</th><th style="text-align:center">Miktar/Kapsam</th><th style="text-align:right">Birim Fiyat</th></tr></thead>
                <tbody>${itemRows}</tbody>
                <tfoot>
                    <tr><td colspan="3" style="padding-top:15px;border-top:2px solid #333;"></td></tr>
                    <tr>
                        <td colspan="2" style="text-align:right;padding:5px;font-size:14px;color:#666;">Ara Toplam:</td>
                        <td style="text-align:right;padding:5px;font-size:14px;font-weight:bold;">${grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="text-align:right;padding:5px;font-size:14px;color:#666;">KDV (%20):</td>
                        <td style="text-align:right;padding:5px;font-size:14px;font-weight:bold;">${(grandTotal * 0.2).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="text-align:right;padding:10px;font-size:16px;font-weight:bold;color:#1e293b;">GENEL TOPLAM:</td>
                        <td style="text-align:right;padding:10px;font-size:18px;font-weight:bold;color:#059669;">${(grandTotal * 1.2).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    </tr>
                </tfoot>
            </table>
            
            ${pdfSection}
            
            <p style="margin-top: 30px; font-size: 13px; color: #666;">Not: Bu teklif 15 gün süreyle geçerlidir.</p>
            ${signature}
        </div>
      </div>
      </body></html>
    `;
  };

  // Önizleme Güncelleme
  useEffect(() => {
    if (selectedItems.length === 0) {
      setEmailPreview('');
      return;
    }
    
    const signature = generateSignatureHtml(footerInfo);
    const html = generateEmailHtml(companyName || 'Değerli Müşterimiz', contactPerson, selectedItems, signature);
    setEmailPreview(html);
  }, [selectedItems, companyName, contactPerson, footerInfo, selectedPests]);

  // TEKLİF GÖNDERME
  const handleSendEmail = async () => {
    if (!recipientEmail || !companyName) {
      toast.error('Lütfen Alıcı E-posta ve Firma Adı alanlarını doldurun.');
      return;
    }
    if (selectedItems.length === 0) {
        toast.error('Lütfen teklife en az bir kalem ekleyin.');
        return;
    }

    setIsSending(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const totalAmount = selectedItems.reduce((sum, item) => sum + (item.unitType === 'aylik' ? (item.visitCount * item.price) : (item.visitCount * item.price)), 0);
        const proposalNumber = `TEKLIF-${Date.now().toString().slice(-6)}`;
        const accessPassword = Math.floor(100000 + Math.random() * 900000).toString();

        // 1. Ana Teklif Kaydı
        const { data: proposalData, error: proposalError } = await supabase
            .from('proposals')
            .insert({
                proposal_number: proposalNumber,
                company_name: companyName,
                contact_person: contactPerson,
                recipient_email: recipientEmail,
                total_amount: totalAmount,
                created_by: user?.id,
                access_password: accessPassword,
                status: 'pending',
                included_pests: selectedPests, // Zararlı türleri
                cc_email: ccEmail || null
            })
            .select('id')
            .single();
        
        if (proposalError) throw proposalError;
        const newProposalId = proposalData.id;

        // 2. Teklif Kalemleri Kaydı
        const itemsToInsert = selectedItems.map(item => {
            return {
                proposal_id: newProposalId,
                service_name: item.name,
                service_description: item.description,
                image_url: item.image_url,
                visit_count: item.visitCount,
                unit_price: item.price,
                explanation: item.explanation,
                unit_type: item.unitType,
                item_type: item.type // 'service' veya 'product'
            };
        });

        const { error: itemsError } = await supabase.from('proposal_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        // 3. E-posta Gönderimi
        const proposalLink = `https://ilaclamatik.com/teklif-goruntule/${newProposalId}`;
        const signature = generateSignatureHtml(footerInfo);
        const emailHtml = generateEmailHtml(companyName, contactPerson, selectedItems, signature, proposalLink, accessPassword);

        const emailPayload = {
            to: recipientEmail,
            cc: ccEmail,
            subject: emailSubject,
            html: emailHtml
        };

        const { error: emailError } = await supabase.functions.invoke('send-schedule-email', { body: emailPayload });

        if (emailError) throw emailError;
        toast.success(`Teklif başarıyla oluşturuldu ve gönderildi!`);
        
        // Reset
        setSelectedItems([]);
        
    } catch (error: any) {
      toast.error('İşlem hatası: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };
  
  // Footer Kaydet
  const handleSaveFooterSettings = async () => {
      setIsSavingSettings(true);
      try {
          const { error } = await supabase.from('company_settings').upsert({ ...footerInfo, id: 1 }).select();
          if (error) throw error;
          toast.success("Ayarlar başarıyla kaydedildi!");
      } catch (error: any) {
          toast.error("Hata: " + error.message);
      } finally {
          setIsSavingSettings(false);
      }
  };

  // Toplam Hesaplama
  const grandTotal = useMemo(() => {
      return selectedItems.reduce((total, item) => {
          return total + (item.unitType === 'aylik' ? (item.visitCount * item.price) : (item.visitCount * item.price));
      }, 0);
  }, [selectedItems]);

  // Öğe Ekleme/Çıkarma
  const toggleItemSelection = (item: Service | Product, type: 'service' | 'product', isSelected: boolean) => {
      if (isSelected) {
          const newItem: SelectedItem = {
              id: item.id,
              type: type,
              name: item.name,
              description: item.description,
              image_url: item.image_url,
              visitCount: type === 'service' ? ((item as Service).visit_count || 1) : 1, // Ürünse 1 adet
              price: item.price || 0,
              explanation: '',
              unitType: type === 'service' ? 'aylik' : 'adet' // Varsayılan tipler
          };
          setSelectedItems(prev => [...prev, newItem]);
      } else {
          setSelectedItems(prev => prev.filter(selected => !(selected.id === item.id && selected.type === type)));
      }
  };

  // Öğe Güncelleme
  const handleItemUpdate = (id: number | string, type: 'service' | 'product', field: keyof SelectedItem, value: any) => {
      setSelectedItems(prev => prev.map(item => {
          if (item.id === id && item.type === type) {
              return { ...item, [field]: value };
          }
          return item;
      }));
  };
  
  // Zararlı Seçimi Toggle
  const togglePest = (pest: string) => {
      setSelectedPests(prev => prev.includes(pest) ? prev.filter(p => p !== pest) : [...prev, pest]);
  };

  // Manuel Ekleme
  const handleAddManualItem = () => {
      if(!manualItem.name) {
          toast.error("İsim giriniz.");
          return;
      }
      const newItem: SelectedItem = {
          id: `manual-${Date.now()}`,
          type: manualType,
          name: manualItem.name,
          description: manualItem.description,
          visitCount: manualItem.count,
          price: manualItem.price,
          explanation: '',
          unitType: manualType === 'service' ? 'aylik' : 'adet'
      };
      setSelectedItems(prev => [...prev, newItem]);
      setManualItem({ name: '', description: '', count: 1, price: 0 });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <MessageSquare className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-800">Hizmet & Ürün Teklif Modülü</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6 max-h-[90vh] overflow-y-auto">
          
          {/* 1. ALICI BİLGİLERİ */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">1. Alıcı & Firma Bilgileri</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="text-xs text-gray-500">Kayıtlı Müşteri</label>
                    <select
                        value={selectedCustomer}
                        onChange={e => setSelectedCustomer(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-gray-50"
                        disabled={loading}
                    >
                        <option value="">Manuel Giriş</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
                    </select>
                </div>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Firma Adı *" className="w-full p-2 border rounded-lg" disabled={!!selectedCustomer} />
                <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Yetkili Kişi" className="w-full p-2 border rounded-lg" />
                <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Alıcı E-posta *" className="w-full p-2 border rounded-lg" disabled={!!selectedCustomer} />
                <input type="email" value={ccEmail} onChange={e => setCcEmail(e.target.value)} placeholder="CC (Bilgi) E-posta" className="w-full p-2 border rounded-lg" />
            </div>
          </div>

          {/* 2. HEDEF ZARARLILAR */}
          <div>
             <label className="block text-lg font-semibold text-gray-700 mb-2">2. Hedef Zararlılar (Dahil Olanlar)</label>
             <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
                 {PEST_TYPES.map(pest => (
                     <button
                        key={pest}
                        onClick={() => togglePest(pest)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                            selectedPests.includes(pest) 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                        }`}
                     >
                        {selectedPests.includes(pest) && <Check size={12}/>}
                        <Bug size={12} className={selectedPests.includes(pest) ? 'text-green-600' : 'text-gray-300'} />
                        {pest}
                     </button>
                 ))}
             </div>
          </div>

          {/* 3. HİZMET VE ÜRÜN SEÇİMİ */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">3. Teklif Kalemleri</label>
            
            {/* Sekmeler */}
            <div className="flex border-b mb-3">
                <div className="px-4 py-2 border-b-2 border-green-600 text-green-700 font-medium text-sm">Hizmetler</div>
                <div className="px-4 py-2 text-gray-500 font-medium text-sm">Ürünler (Aşağıda)</div>
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto space-y-6 p-2">
                
                {/* Hizmet Listesi */}
                <div>
                    <h4 className="font-bold text-gray-700 px-2 mb-2 text-sm sticky top-0 bg-white z-10 py-1">HİZMETLER</h4>
                    {serviceList.map(item => {
                        const selectedItem = selectedItems.find(s => s.id === item.id && s.type === 'service');
                        return (
                            <div key={`srv-${item.id}`} className={`border rounded-lg mb-2 p-3 ${selectedItem ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                                <div className="flex items-center space-x-3">
                                    <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500" checked={!!selectedItem} onChange={(e) => toggleItemSelection(item, 'service', e.target.checked)} />
                                    <div className="flex-grow">
                                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                        <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                                    </div>
                                </div>
                                {selectedItem && (
                                    <div className="mt-3 pl-8 grid grid-cols-12 gap-3 animate-in slide-in-from-top-2">
                                        <div className="col-span-6">
                                            <label className="text-[10px] font-bold text-gray-500">TÜR</label>
                                            <select value={selectedItem.unitType} onChange={(e) => handleItemUpdate(item.id, 'service', 'unitType', e.target.value)} className="w-full p-1 border rounded text-xs">
                                                <option value="aylik">Aylık Periyodik</option>
                                                <option value="seferlik">Tek Seferlik</option>
                                            </select>
                                        </div>
                                        <div className="col-span-3">
                                            <label className="text-[10px] font-bold text-gray-500">MİKTAR</label>
                                            <input type="number" value={selectedItem.visitCount} onChange={(e) => handleItemUpdate(item.id, 'service', 'visitCount', parseInt(e.target.value))} className="w-full p-1 border rounded text-xs text-center" min="1" />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="text-[10px] font-bold text-gray-500">FİYAT</label>
                                            <input type="number" value={selectedItem.price} onChange={(e) => handleItemUpdate(item.id, 'service', 'price', parseFloat(e.target.value))} className="w-full p-1 border rounded text-xs text-right font-bold" />
                                        </div>
                                        <div className="col-span-12">
                                            <input type="text" value={selectedItem.explanation} onChange={(e) => handleItemUpdate(item.id, 'service', 'explanation', e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="Özel Açıklama..." />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Ürün Listesi */}
                <div className="border-t pt-4">
                    <h4 className="font-bold text-gray-700 px-2 mb-2 text-sm sticky top-0 bg-white z-10 py-1">ÜRÜN & MALZEMELER</h4>
                    {productList.map(item => {
                        const selectedItem = selectedItems.find(s => s.id === item.id && s.type === 'product');
                        return (
                            <div key={`prd-${item.id}`} className={`border rounded-lg mb-2 p-3 ${selectedItem ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                                <div className="flex items-center space-x-3">
                                    <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={!!selectedItem} onChange={(e) => toggleItemSelection(item, 'product', e.target.checked)} />
                                    {item.image_url && <img src={item.image_url} className="w-8 h-8 object-cover rounded" />}
                                    <div className="flex-grow">
                                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                        <p className="text-xs text-gray-500">{item.price} ₺</p>
                                    </div>
                                </div>
                                {selectedItem && (
                                    <div className="mt-3 pl-8 grid grid-cols-12 gap-3 animate-in slide-in-from-top-2">
                                        <div className="col-span-4">
                                            <label className="text-[10px] font-bold text-gray-500">ADET</label>
                                            <input type="number" value={selectedItem.visitCount} onChange={(e) => handleItemUpdate(item.id, 'product', 'visitCount', parseInt(e.target.value))} className="w-full p-1 border rounded text-xs text-center" min="1" />
                                        </div>
                                        <div className="col-span-4">
                                            <label className="text-[10px] font-bold text-gray-500">BİRİM FİYAT</label>
                                            <input type="number" value={selectedItem.price} onChange={(e) => handleItemUpdate(item.id, 'product', 'price', parseFloat(e.target.value))} className="w-full p-1 border rounded text-xs text-right font-bold" />
                                        </div>
                                        <div className="col-span-4 flex items-end">
                                            <span className="text-xs font-bold text-blue-600">{(selectedItem.visitCount * selectedItem.price).toLocaleString()} ₺</span>
                                        </div>
                                        <div className="col-span-12">
                                            <input type="text" value={selectedItem.explanation} onChange={(e) => handleItemUpdate(item.id, 'product', 'explanation', e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="Ürün notu..." />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

            </div>
          </div>
          
          {/* MANUEL EKLEME */}
          <div className="border-t pt-4">
            <details className="group">
                <summary className="flex cursor-pointer items-center text-sm font-medium text-gray-600 hover:text-green-600">
                    <Plus className="mr-2 h-4 w-4" /> Manuel Kalem Ekle
                </summary>
                <div className="mt-3 space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex gap-4 mb-2">
                        <label className="flex items-center text-xs"><input type="radio" checked={manualType==='service'} onChange={()=>setManualType('service')} className="mr-1"/> Hizmet</label>
                        <label className="flex items-center text-xs"><input type="radio" checked={manualType==='product'} onChange={()=>setManualType('product')} className="mr-1"/> Ürün</label>
                    </div>
                    <input type="text" placeholder="İsim" value={manualItem.name} onChange={e => setManualItem(prev => ({...prev, name: e.target.value}))} className="w-full p-2 border rounded text-sm" />
                    <textarea placeholder="Açıklama" value={manualItem.description} onChange={e => setManualItem(prev => ({...prev, description: e.target.value}))} rows={2} className="w-full p-2 border rounded text-sm" />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Miktar / Adet" value={manualItem.count} onChange={e => setManualItem(prev => ({...prev, count: parseInt(e.target.value)}))} className="w-full p-2 border rounded text-sm" />
                        <input type="number" placeholder="Birim Fiyat" value={manualItem.price} onChange={e => setManualItem(prev => ({...prev, price: parseFloat(e.target.value)}))} className="w-full p-2 border rounded text-sm" />
                    </div>
                    <button onClick={handleAddManualItem} className="w-full bg-gray-800 text-white rounded text-sm font-medium p-2 hover:bg-gray-700">Listeye Ekle</button>
                </div>
            </details>
          </div>

          {/* TOPLAM VE GÖNDER */}
          <div className="border-t pt-4 bg-green-50 p-4 rounded-xl">
            <div className="flex justify-between items-center text-lg font-bold text-gray-800 mb-1">
                <span>GENEL TOPLAM (KDV HARİÇ):</span>
                <span className="text-2xl text-green-700">{(grandTotal || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
            </div>
            <p className="text-xs text-gray-500 text-right mb-4">+ %20 KDV: {((grandTotal || 0) * 0.2).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            
            <button onClick={handleSendEmail} disabled={isSending || selectedItems.length === 0} className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-all shadow-lg hover:shadow-xl">
                {isSending ? <Loader className="animate-spin" /> : <Send />}
                {isSending ? 'Teklif Hazırlanıyor...' : 'TEKLİFİ OLUŞTUR VE GÖNDER'}
            </button>
          </div>
        </div>

        {/* SAĞ PANEL: ÖNİZLEME */}
        <div className="bg-white p-6 rounded-xl shadow-md flex flex-col h-[90vh]">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FileDown size={20}/> Canlı Önizleme</h3>
            <div className="border rounded-lg flex-grow overflow-hidden bg-gray-100">
                {emailPreview ? (
                    <iframe srcDoc={emailPreview} title="Önizleme" className="w-full h-full border-0 bg-white" />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                        <Mail size={48} />
                        <p>Hizmet veya ürün seçimi yapıldığında önizleme burada görünecektir.</p>
                    </div>
                )}
            </div>
            
            <div className="mt-4 border-t pt-2">
                <details className="group">
                    <summary className="flex cursor-pointer items-center text-xs font-medium text-gray-500 hover:text-gray-800 select-none">
                        <Save className="mr-1 h-3 w-3" /> E-posta İmza Ayarları
                    </summary>
                    <div className="mt-2 grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded text-xs">
                        <input type="text" placeholder="İsim" value={footerInfo.name} onChange={e => setFooterInfo(prev => ({...prev, name: e.target.value}))} className="p-1 border rounded" />
                        <input type="text" placeholder="Unvan" value={footerInfo.title} onChange={e => setFooterInfo(prev => ({...prev, title: e.target.value}))} className="p-1 border rounded" />
                        <input type="text" placeholder="Web" value={footerInfo.website} onChange={e => setFooterInfo(prev => ({...prev, website: e.target.value}))} className="p-1 border rounded" />
                        <input type="text" placeholder="Tel" value={footerInfo.phone} onChange={e => setFooterInfo(prev => ({...prev, phone: e.target.value}))} className="p-1 border rounded" />
                        <button onClick={handleSaveFooterSettings} disabled={isSavingSettings} className="col-span-2 bg-blue-500 text-white p-1 rounded hover:bg-blue-600">Ayarları Kaydet</button>
                    </div>
                </details>
            </div>
        </div>
      </div>
    </div>
  );
};

export default HizmetPazarlama;