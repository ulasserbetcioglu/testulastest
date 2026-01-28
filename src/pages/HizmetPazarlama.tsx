import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Mail, Send, Loader2 as Loader, MessageSquare, Plus, Save, Bug, Check, FileDown } from 'lucide-react';

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
}

interface SelectedService {
  id: number;
  visitCount: number;
  price: number;
  explanation: string;
  unitType: 'aylik' | 'seferlik';
  name?: string;
  description?: string;
  image_url?: string;
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
  'Hamam Böceği', 'Kemirgen', 'Karınca', 'Sinek', 'Güve', 'Örümcek', 'Gümüşçün', 'Pire', 'Kene'
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
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [emailSubject, setEmailSubject] = useState('Hizmet Teklifimiz - Fiyat Teklifi Sunulur');
  const [emailPreview, setEmailPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Form Alanları
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccEmail, setCcEmail] = useState(''); // YENİ: CC E-posta
  
  // Zararlı Seçimi
  const [selectedPests, setSelectedPests] = useState<string[]>(['Hamam Böceği', 'Kemirgen']); // Varsayılanlar

  const [manualService, setManualService] = useState({ name: '', description: '', visitCount: 1, price: 0 });

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
        const [customerRes, serviceRes, settingsRes] = await Promise.all([
            supabase.from('customers').select('id, kisa_isim, email').not('email', 'is', null).order('kisa_isim'),
            supabase.from('services').select('*').order('name'),
            supabase.from('company_settings').select('*').limit(1).single()
        ]);

        if (customerRes.error) throw customerRes.error;
        if (serviceRes.error) throw serviceRes.error;
        
        setCustomers(customerRes.data || []);
        setServiceList(serviceRes.data || []);
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
  const generateEmailHtml = (customer: string, contact: string, selectedItems: any[], signature: string, proposalLink?: string, password?: string): string => {
    let grandTotal = 0;
    const itemRows = selectedItems.map(item => {
      const price = item.customPrice || 0;
      const visitCount = item.visitCount || 1;
      const itemTotal = item.unitType === 'aylik' ? visitCount * price : price;
      grandTotal += itemTotal;
      
      const unitText = item.unitType === 'aylik' ? `${visitCount} Ziyaret / Ay` : `Tek Seferlik Uygulama`;

      return `
      <tr style="border-bottom: 1px solid #eeeeee;">
        <td style="padding: 15px; width: 80px; vertical-align: top;">
          <img src="${item.image_url || 'https://placehold.co/80x80/e2e8f0/334155?text=Hizmet'}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;">
        </td>
        <td style="padding: 15px; vertical-align: top;">
          <p style="margin: 0; font-weight: bold; font-size: 15px; color: #333;">${item.name}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #666;">${item.description}</p>
          ${item.explanation ? `<p style="margin: 6px 0 0 0; font-size: 12px; color: #4f46e5; font-style: italic;">Not: ${item.explanation}</p>` : ''}
        </td>
        <td style="padding: 15px; font-size: 13px; text-align: center; vertical-align: top; white-space: nowrap;">${unitText}</td>
        <td style="padding: 15px; font-size: 14px; text-align: right; vertical-align: top; font-weight: bold;">${price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
      </tr>
    `}).join('');

    const pestListHtml = PEST_TYPES.map(pest => {
        const isSelected = selectedPests.includes(pest);
        const color = isSelected ? '#059669' : '#d1d5db';
        const bg = isSelected ? '#ecfdf5' : '#f3f4f6';
        const decoration = isSelected ? 'none' : 'line-through';
        return `<span style="display:inline-block; padding: 4px 8px; margin: 2px; font-size: 11px; border-radius: 4px; background-color: ${bg}; color: ${color}; border: 1px solid ${color}; text-decoration: ${decoration};">${pest}</span>`;
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
            <p style="margin:5px 0 0 0; opacity: 0.8; font-size: 14px;">Hizmet Detayları ve Maliyet Analizi</p>
        </div>
        <div class="content">
            <p>Sayın <b>${contact || 'Yetkili'}</b>,</p>
            <p><b>${customer}</b> firması için özel olarak hazırladığımız hizmet ve fiyat teklifimizi aşağıda bilgilerinize sunarız.</p>
            
            <div style="margin: 20px 0; padding: 15px; background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #92400e;">KAPSAM DAHİLİNDEKİ HEDEF ZARARLILAR:</p>
                <div>${pestListHtml}</div>
            </div>

            <table style="margin-top:20px;margin-bottom:20px">
                <thead><tr><th>Hizmet & Açıklama</th><th style="text-align:center">Kapsam</th><th style="text-align:right">Birim Fiyat</th></tr></thead>
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
            
            <p style="margin-top: 30px; font-size: 13px; color: #666;">Not: Bu teklif 15 gün süreyle geçerlidir. Onayınız durumunda hizmet planlaması yapılacaktır.</p>
            ${signature}
        </div>
      </div>
      </body></html>
    `;
  };

  // Önizleme Güncelleme
  useEffect(() => {
    if (selectedServices.length === 0) {
      setEmailPreview('');
      return;
    }
    const selectedItemsWithDetails = selectedServices.map(selected => {
        const serviceDetails = serviceList.find(item => item.id === selected.id);
        return serviceDetails ? 
            { ...serviceDetails, visitCount: selected.visitCount, customPrice: selected.price, explanation: selected.explanation, unitType: selected.unitType } :
            { id: selected.id, name: (selected as any).name, description: (selected as any).description, image_url: null, visitCount: selected.visitCount, customPrice: selected.price, explanation: selected.explanation, unitType: selected.unitType };
    });
    
    const signature = generateSignatureHtml(footerInfo);
    const html = generateEmailHtml(companyName || 'Değerli Müşterimiz', contactPerson, selectedItemsWithDetails, signature);
    setEmailPreview(html);
  }, [selectedServices, serviceList, companyName, contactPerson, footerInfo, selectedPests]);

  // TEKLİF GÖNDERME
  const handleSendEmail = async () => {
    if (!recipientEmail || !companyName) {
      toast.error('Lütfen Alıcı E-posta ve Firma Adı alanlarını doldurun.');
      return;
    }
    if (selectedServices.length === 0) {
        toast.error('Lütfen teklife en az bir hizmet ekleyin.');
        return;
    }

    setIsSending(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const totalAmount = selectedServices.reduce((sum, item) => sum + (item.unitType === 'aylik' ? (item.visitCount * item.price) : item.price), 0);
        const proposalNumber = `TEKLIF-${Date.now().toString().slice(-6)}`;
        const accessPassword = Math.floor(100000 + Math.random() * 900000).toString();

        // 1. Ana Teklif Kaydı (pests array'i JSON olarak kaydediliyor)
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
                included_pests: selectedPests, // YENİ: Zararlı türleri
                cc_email: ccEmail || null // YENİ: CC
            })
            .select('id')
            .single();
        
        if (proposalError) throw proposalError;
        const newProposalId = proposalData.id;

        // 2. Hizmet Kalemleri Kaydı
        const itemsToInsert = selectedServices.map(item => {
            const serviceDetails = serviceList.find(s => s.id === item.id) || item;
            return {
                proposal_id: newProposalId,
                service_name: serviceDetails.name,
                service_description: serviceDetails.description,
                image_url: serviceDetails.image_url,
                visit_count: item.visitCount,
                unit_price: item.price,
                explanation: item.explanation,
                unit_type: item.unitType,
            };
        });

        const { error: itemsError } = await supabase.from('proposal_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        // 3. E-posta Gönderimi
        const proposalLink = `https://ilaclamatik.com/teklif-goruntule/${newProposalId}`;
        
        const selectedItemsForEmail = selectedServices.map(selected => {
            const serviceDetails = serviceList.find(item => item.id === selected.id);
            return { ...serviceDetails, visitCount: selected.visitCount, customPrice: selected.price, explanation: selected.explanation, unitType: selected.unitType };
        });

        const signature = generateSignatureHtml(footerInfo);
        const emailHtml = generateEmailHtml(companyName, contactPerson, selectedItemsForEmail, signature, proposalLink, accessPassword);

        // CC ekleniyor
        const emailPayload = {
            to: recipientEmail,
            cc: ccEmail, // YENİ
            subject: emailSubject,
            html: emailHtml
        };

        const { error: emailError } = await supabase.functions.invoke('send-schedule-email', { body: emailPayload });

        if (emailError) throw emailError;
        toast.success(`Teklif başarıyla oluşturuldu ve gönderildi!`);
        
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
      return selectedServices.reduce((total, item) => {
          const price = item.price || 0;
          const visitCount = item.visitCount || 1;
          const itemTotal = item.unitType === 'aylik' ? (visitCount * price) : price;
          return total + itemTotal;
      }, 0);
  }, [selectedServices]);

  // Hizmet Seçimi
  const handleServiceSelect = (item: Service, isSelected: boolean) => {
      if (isSelected) {
          setSelectedServices(prev => [...prev, { id: item.id, visitCount: item.visit_count || 1, price: item.price || 0, explanation: '', unitType: 'aylik' }]);
      } else {
          setSelectedServices(prev => prev.filter(selected => selected.id !== item.id));
      }
  };

  // Hizmet Güncelleme
  const handleServiceUpdate = (id: number, field: 'visitCount' | 'price' | 'explanation' | 'unitType', value: string | number) => {
      setSelectedServices(prev => prev.map(item => {
          if (item.id === id) {
              if (field === 'explanation' || field === 'unitType') return { ...item, [field]: value };
              const numericValue = typeof value === 'string' ? parseFloat(value) : value;
              return { ...item, [field]: isNaN(numericValue) ? 0 : numericValue };
          }
          return item;
      }));
  };
  
  // Zararlı Seçimi Toggle
  const togglePest = (pest: string) => {
      setSelectedPests(prev => prev.includes(pest) ? prev.filter(p => p !== pest) : [...prev, pest]);
  };

  // Manuel Hizmet Ekleme
  const handleAddManualService = () => {
      if(!manualService.name) {
          toast.error("Hizmet adı giriniz.");
          return;
      }
      const newManualService = { ...manualService, id: Date.now() * -1, unitType: 'aylik' as 'aylik' | 'seferlik' };
      setServiceList(prev => [...prev, newManualService as unknown as Service]);
      setSelectedServices(prev => [...prev, { ...newManualService, explanation: '' }]);
      setManualService({ name: '', description: '', visitCount: 1, price: 0 });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <MessageSquare className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-800">Hizmet Pazarlama & Teklif Modülü</h1>
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
             <label className="block text-lg font-semibold text-gray-700 mb-2">2. Kapsam Dahilindeki Zararlılar</label>
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

          {/* 3. HİZMETLER */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">3. Hizmet Seçimi</label>
              <div className="border rounded-lg max-h-80 overflow-y-auto">
                {serviceList.map(item => {
                    const selectedItem = selectedServices.find(s => s.id === item.id);
                    return (
                        <div key={item.id} className={`border-b last:border-b-0 p-3 ${selectedItem ? 'bg-green-50' : ''}`}>
                            <div className="flex items-center space-x-3">
                                <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500" checked={!!selectedItem} onChange={(e) => handleServiceSelect(item, e.target.checked)} />
                                <div className="flex-grow">
                                    <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                    <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                                </div>
                            </div>
                            {selectedItem && (
                                <div className="mt-3 pl-8 grid grid-cols-12 gap-3 bg-white p-3 rounded border border-green-100 shadow-sm animate-in slide-in-from-top-2">
                                    <div className="col-span-6">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">Fiyatlandırma</label>
                                        <select
                                            value={selectedItem.unitType}
                                            onChange={(e) => handleServiceUpdate(item.id, 'unitType', e.target.value)}
                                            className="w-full p-1.5 border rounded text-sm bg-gray-50"
                                        >
                                            <option value="aylik">Aylık Periyodik</option>
                                            <option value="seferlik">Tek Seferlik</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">{selectedItem.unitType === 'aylik' ? 'Ziyaret/Ay' : 'Adet'}</label>
                                        <input type="number" value={selectedItem.visitCount} onChange={(e) => handleServiceUpdate(item.id, 'visitCount', parseInt(e.target.value))} className="w-full p-1.5 border rounded text-sm text-center" min="1" disabled={selectedItem.unitType === 'seferlik'} />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">Birim Fiyat</label>
                                        <input type="number" value={selectedItem.price} onChange={(e) => handleServiceUpdate(item.id, 'price', parseFloat(e.target.value))} className="w-full p-1.5 border rounded text-sm text-right font-bold text-green-600" />
                                    </div>
                                    <div className="col-span-12">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">Özel Açıklama (İsteğe Bağlı)</label>
                                        <input type="text" value={selectedItem.explanation} onChange={(e) => handleServiceUpdate(item.id, 'explanation', e.target.value)} className="w-full p-1.5 border rounded text-sm" placeholder="Örn: 1. kat ve bodrum dahil" />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
          </div>
          
          {/* MANUEL HİZMET */}
          <div className="border-t pt-4">
            <details className="group">
                <summary className="flex cursor-pointer items-center text-sm font-medium text-gray-600 hover:text-green-600">
                    <Plus className="mr-2 h-4 w-4" /> Manuel Hizmet Ekle
                </summary>
                <div className="mt-3 space-y-3 p-4 bg-gray-50 rounded-lg">
                    <input type="text" placeholder="Hizmet Adı" value={manualService.name} onChange={e => setManualService(prev => ({...prev, name: e.target.value}))} className="w-full p-2 border rounded text-sm" />
                    <textarea placeholder="Açıklama" value={manualService.description} onChange={e => setManualService(prev => ({...prev, description: e.target.value}))} rows={2} className="w-full p-2 border rounded text-sm" />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Fiyat" value={manualService.price} onChange={e => setManualService(prev => ({...prev, price: parseFloat(e.target.value)}))} className="w-full p-2 border rounded text-sm" />
                        <button onClick={handleAddManualService} className="w-full bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700">Ekle</button>
                    </div>
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
            
            <button onClick={handleSendEmail} disabled={isSending || selectedServices.length === 0} className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-all shadow-lg hover:shadow-xl">
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
                        <p>Hizmet seçimi yapıldığında önizleme burada görünecektir.</p>
                    </div>
                )}
            </div>
            
            {/* Footer Ayarları (Collapse) */}
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