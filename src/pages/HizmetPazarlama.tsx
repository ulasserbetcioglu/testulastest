import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Mail, Users, Send, Loader2 as Loader, MessageSquare, Check, Plus, FileDown, Save } from 'lucide-react';

// Arayüz (Interface) tanımları
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

// GÜNCELLENDİ: unitType eklendi
interface SelectedService {
    id: number;
    visitCount: number;
    price: number;
    explanation: string;
    unitType: 'aylik' | 'seferlik'; // YENİ
    name?: string;
    description?: string;
    image_url?: string;
}

// YENİ: Footer için arayüz
interface FooterInfo {
    id?: number;
    name: string;
    title: string;
    website: string;
    phone: string;
    logo_url: string;
}

// YENİ: Footer'ı dinamik oluşturan fonksiyon
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [emailSubject, setEmailSubject] = useState('Hizmet Teklifimiz');
  const [emailPreview, setEmailPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false); // YENİ

  // Müşteri bilgileri için state'ler
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  
  const [manualService, setManualService] = useState({ name: '', description: '', visitCount: 1, price: 0 });

  // YENİ: Dinamik footer state'i
  const [footerInfo, setFooterInfo] = useState<FooterInfo>({
    name: 'İlaçlamatik Ekibi',
    title: 'Profesyonel Zararlı Kontrol Çözümleri',
    website: 'www.ilaclamatik.com.tr',
    phone: '+90 555 123 4567',
    logo_url: 'https://i.imgur.com/PajSpus.png'
  });

  // GÜNCELLENDİ: Verileri ve ayarları ilk yüklemede çek
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [customerRes, serviceRes, settingsRes] = await Promise.all([
            supabase.from('customers').select('id, kisa_isim, email').not('email', 'is', null).order('kisa_isim'),
            supabase.from('services').select('*').order('name'),
            supabase.from('company_settings').select('*').limit(1).single() // YENİ: Ayarları çek
        ]);

        if (customerRes.error) throw customerRes.error;
        if (serviceRes.error) throw serviceRes.error;
        
        setCustomers(customerRes.data || []);
        setServiceList(serviceRes.data || []);
        if (settingsRes.data) { // YENİ: Ayarlar varsa state'i güncelle
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

  // Müşteri seçildiğinde manuel alanları doldur - BU KISIM AYNI KALDI
  useEffect(() => {
      if (selectedCustomer) {
          const customer = customers.find(c => c.id === selectedCustomer);
          if (customer) {
              setCompanyName(customer.kisa_isim);
              setRecipientEmail(customer.email);
          }
      }
  }, [selectedCustomer, customers]);

  // E-posta içeriğini oluşturan fonksiyon - GÜNCELLENDİ
  const generateEmailHtml = (customer: string, contact: string, selectedItems: (Partial<Service> & { visitCount: number, customPrice: number, explanation: string, unitType: 'aylik' | 'seferlik' })[], signature: string, proposalLink?: string, password?: string): string => {
    let grandTotal = 0;
    const itemRows = selectedItems.map(item => {
      const price = item.customPrice || 0;
      const visitCount = item.visitCount || 1;
      const itemTotal = item.unitType === 'aylik' ? visitCount * price : price; // Seferlikte ziyaret sayısı çarpılmaz
      grandTotal += itemTotal;
      
      // YENİ: unitType'a göre metin belirleme
      const unitText = item.unitType === 'aylik' ? `Ayda ${visitCount} Ziyaret` : `Sefer Başı`;

      return `
      <tr style="border-bottom: 1px solid #eeeeee;">
        <td style="padding: 15px; width: 100px; vertical-align: top;">
          <img src="${item.image_url || 'https://placehold.co/80x80/e2e8f0/334155?text=Hizmet'}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
        </td>
        <td style="padding: 15px; vertical-align: top;">
          <p style="margin: 0; font-weight: bold; font-size: 16px; color: #333;">${item.name}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">${item.description}</p>
          ${item.explanation ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #4f46e5; background-color: #eef2ff; border-left: 3px solid #4f46e5; padding: 8px;"><strong>Not:</strong> ${item.explanation}</p>` : ''}
        </td>
        <td style="padding: 15px; font-size: 14px; text-align: center; vertical-align: top;">${unitText}</td>
        <td style="padding: 15px; font-size: 14px; text-align: right; vertical-align: top;">${price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
      </tr>
    `}).join('');

    const pdfSection = proposalLink && password ? `
        <div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px; text-align: center;">
            <p style="margin:0; font-size: 16px; font-weight: bold; color: #333;">Teklifin PDF Versiyonu</p>
            <p style="margin-top:10px;font-size:14px;color:#555;">Teklifi görüntülemek veya indirmek için aşağıdaki butona tıklayın ve size özel şifreyi girin.</p>
            <div style="background-color:#f0fdf4;border:1px solid #a7f3d0;padding:15px;border-radius:8px;margin-top:20px;">
                <p style="margin:0;font-size:14px;color:#333;">Teklif Görüntüleme Şifreniz:</p>
                <p style="font-size:24px;font-weight:bold;color:#065f46;letter-spacing:3px;margin:10px 0;">${password}</p>
            </div>
            <a href="${proposalLink}" style="display:inline-block;background-color:#059669;color:white !important;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;margin-top:20px;">Teklifi Görüntüle</a>
        </div>
    ` : '';

    // E-postanın tam HTML yapısı
    return `
      <!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;color:#333}.container{max-width:700px;margin:auto;border:1px solid #eee;padding:20px}.header{background-color:#059669;color:white;padding:10px;text-align:center}h2{margin:0}.content{padding:20px}table{width:100%;border-collapse:collapse}th{background-color:#f2f2f2;text-align:left;padding:10px;font-size:12px;text-transform:uppercase}</style></head><body><div class="container"><div class="header"><h2>Hizmet Teklifimiz</h2></div><div class="content"><p>Merhaba ${contact || customer},</p><p><b>${customer}</b> firmanız için hazırladığımız hizmet teklifimiz aşağıda bilgilerinize sunulmuştur.</p><table style="margin-top:20px;margin-bottom:20px"><thead><tr><th>Hizmet</th><th>Açıklama</th><th style="text-align:center">Adet</th><th style="text-align:right">Birim Fiyat</th></tr></thead><tbody>${itemRows}</tbody><tfoot><tr style="border-top: 2px solid #333;"><td colspan="3" style="text-align:right;padding:15px;font-weight:bold;font-size:16px;">GENEL TOPLAM:</td><td style="text-align:right;padding:15px;font-weight:bold;font-size:18px;color:#059669;">${grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td></tr><tr><td colspan="4" style="text-align:right;padding-top: 5px; font-size: 12px; color: #777;"><i>Fiyatlara KDV dahil değildir.</i></td></tr></tfoot></table>${pdfSection}<p>Detaylı bilgi için bu e-postayı yanıtlayabilir veya bizimle iletişime geçebilirsiniz.</p>${signature}</div></div></body></html>
    `;
  };

  // Seçimler değiştiğinde önizlemeyi otomatik güncelle - GÜNCELLENDİ
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
    
    // YENİ: Dinamik signature oluşturulup fonksiyona gönderiliyor
    const signature = generateSignatureHtml(footerInfo);
    const html = generateEmailHtml(companyName || 'Değerli Müşterimiz', contactPerson, selectedItemsWithDetails as any, signature);
    setEmailPreview(html);
  }, [selectedServices, serviceList, companyName, contactPerson, footerInfo]); // footerInfo bağımlılık olarak eklendi

  // E-posta gönderme ve teklif oluşturma - GÜNCELLENDİ
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

        const { data: proposalData, error: proposalError } = await supabase
            .from('proposals')
            .insert({
                proposal_number: proposalNumber,
                company_name: companyName,
                contact_person: contactPerson,
                recipient_email: recipientEmail,
                total_amount: totalAmount,
                created_by: user?.id,
                access_password: accessPassword
            })
            .select('id')
            .single();
        
        if (proposalError) throw proposalError;
        const newProposalId = proposalData.id;

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
                unit_type: item.unitType, // YENİ: unitType'ı veritabanına ekle
            };
        });

        const { error: itemsError } = await supabase.from('proposal_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        const proposalLink = `https://ilaclamatik.com/teklif-goruntule/${newProposalId}`;
        
        const selectedItemsForEmail = selectedServices.map(selected => {
            const serviceDetails = serviceList.find(item => item.id === selected.id);
            return { ...serviceDetails, visitCount: selected.visitCount, customPrice: selected.price, explanation: selected.explanation, unitType: selected.unitType }; // YENİ: unitType eklendi
        });

        const signature = generateSignatureHtml(footerInfo); // YENİ: Dinamik signature
        const emailHtml = generateEmailHtml(companyName, contactPerson, selectedItemsForEmail as any, signature, proposalLink, accessPassword);

        const { error: emailError } = await supabase.functions.invoke('send-schedule-email', {
            body: { to: recipientEmail, subject: emailSubject, html: emailHtml },
        });

        if (emailError) throw emailError;
        toast.success(`Teklif e-postası başarıyla ${recipientEmail} adresine gönderildi!`);
      
    } catch (error: any) {
      toast.error('İşlem sırasında bir hata oluştu: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };
  
  // YENİ: Footer ayarlarını kaydetme fonksiyonu
  const handleSaveFooterSettings = async () => {
      setIsSavingSettings(true);
      try {
          // upsert: id varsa günceller, yoksa ekler. id=1 varsayımıyla tek bir ayar satırı olmasını sağlar.
          const { error } = await supabase.from('company_settings').upsert({ ...footerInfo, id: 1 }).select();
          if (error) throw error;
          toast.success("Ayarlar başarıyla kaydedildi!");
      } catch (error: any) {
          toast.error("Ayarlar kaydedilirken bir hata oluştu: " + error.message);
      } finally {
          setIsSavingSettings(false);
      }
  };

  // Genel Toplam Hesaplaması - GÜNCELLENDİ
  const grandTotal = useMemo(() => {
      return selectedServices.reduce((total, item) => {
          const price = item.price || 0;
          const visitCount = item.visitCount || 1;
          const itemTotal = item.unitType === 'aylik' ? (visitCount * price) : price;
          return total + itemTotal;
      }, 0);
  }, [selectedServices]);

  // GÜNCELLENDİ: Hizmet seçme/bırakma
  const handleServiceSelect = (item: Service, isSelected: boolean) => {
      if (isSelected) {
          // unitType 'aylik' olarak başlatılıyor
          setSelectedServices(prev => [...prev, { id: item.id, visitCount: item.visit_count || 1, price: item.price || 0, explanation: '', unitType: 'aylik' }]);
      } else {
          setSelectedServices(prev => prev.filter(selected => selected.id !== item.id));
      }
  };

  // GÜNCELLENDİ: Hizmet detaylarını güncelleme
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
  
  // Manuel hizmet ekleme - GÜNCELLENDİ
  const handleAddManualService = () => {
      if(!manualService.name) {
          toast.error("Lütfen manuel hizmet için bir isim girin.");
          return;
      }
      const newManualService = { ...manualService, id: Date.now() * -1, unitType: 'aylik' as 'aylik' | 'seferlik' }; // unitType eklendi
      setServiceList(prev => [...prev, newManualService as unknown as Service]);
      setSelectedServices(prev => [...prev, { ...newManualService, explanation: '' }]);
      setManualService({ name: '', description: '', visitCount: 1, price: 0 });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <MessageSquare className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-800">Hizmet Pazarlama Modülü</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
          
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">1. Alıcı Bilgileri</label>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Kayıtlı Müşteri Seç (Opsiyonel)</label>
                    <select
                        value={selectedCustomer}
                        onChange={e => setSelectedCustomer(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white"
                        disabled={loading}
                    >
                        <option value="">Manuel Giriş Yap</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
                    </select>
                </div>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Firma Adı *" className="w-full p-2 border rounded-lg" disabled={!!selectedCustomer} />
                <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Yetkili Kişi (Opsiyonel)" className="w-full p-2 border rounded-lg" />
                <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Alıcı E-posta Adresi *" className="w-full p-2 border rounded-lg" disabled={!!selectedCustomer} />
            </div>
          </div>

          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">2. Hizmetleri Seçin ve Düzenleyin</label>
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {serviceList.map(item => {
                    const selectedItem = selectedServices.find(s => s.id === item.id);
                    return (
                        <div key={item.id} className={`border-b last:border-b-0 p-3 ${selectedItem ? 'bg-green-50' : ''}`}>
                            <div className="flex items-center space-x-4">
                                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" checked={!!selectedItem} onChange={(e) => handleServiceSelect(item, e.target.checked)} />
                                <img src={item.image_url || 'https://placehold.co/64x64/e2e8f0/334155?text=?'} alt={item.name} className="w-12 h-12 object-cover rounded-md bg-gray-100" />
                                <div className="flex-grow">
                                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.description}</p>
                                </div>
                            </div>
                            {selectedItem && (
                                <div className="space-y-3 mt-3 pl-10">
                                    <div className="grid grid-cols-2 gap-4">
                                        
                                        {/* YENİ: Fiyatlandırma Tipi Seçimi */}
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">Fiyatlandırma Tipi</label>
                                            <select
                                                value={selectedItem.unitType}
                                                onChange={(e) => handleServiceUpdate(item.id, 'unitType', e.target.value)}
                                                className="w-full p-1 border rounded-md text-sm"
                                            >
                                                <option value="aylik">Aylık Ziyaret</option>
                                                <option value="seferlik">Sefer Başı</option>
                                            </select>
                                        </div>

                                        {/* GÜNCELLENDİ: Koşullu gösterim */}
                                        {selectedItem.unitType === 'aylik' ? (
                                            <div>
                                                <label className="text-xs font-medium text-gray-500">Ayda Kaç Ziyaret?</label>
                                                <input type="number" value={selectedItem.visitCount} onChange={(e) => handleServiceUpdate(item.id, 'visitCount', parseInt(e.target.value) || 1)} className="w-full p-1 border rounded-md text-sm" min="1" />
                                            </div>
                                        ) : <div />}
                                        
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">{selectedItem.unitType === 'aylik' ? 'Birim Fiyat (₺)' : 'Sefer Başı Fiyat (₺)'}</label>
                                            <input type="number" value={selectedItem.price} onChange={(e) => handleServiceUpdate(item.id, 'price', parseFloat(e.target.value) || 0)} className="w-full p-1 border rounded-md text-sm" step="0.01" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Teklife Özel Açıklama (Opsiyonel)</label>
                                        <textarea value={selectedItem.explanation} onChange={(e) => handleServiceUpdate(item.id, 'explanation', e.target.value)} rows={2} className="w-full p-1 border rounded-md text-sm" />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
          </div>
          
          <div className="border-t pt-4">
            <label className="block text-lg font-semibold text-gray-700 mb-2">Manuel Hizmet Ekle</label>
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <input type="text" placeholder="Hizmet Adı" value={manualService.name} onChange={e => setManualService(prev => ({...prev, name: e.target.value}))} className="w-full p-2 border rounded-md" />
                <textarea placeholder="Hizmet Açıklaması" value={manualService.description} onChange={e => setManualService(prev => ({...prev, description: e.target.value}))} rows={2} className="w-full p-2 border rounded-md" />
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Ziyaret Sayısı" value={manualService.visitCount} onChange={e => setManualService(prev => ({...prev, visitCount: parseInt(e.target.value) || 1}))} className="w-full p-2 border rounded-md" />
                    <input type="number" placeholder="Fiyat" value={manualService.price} onChange={e => setManualService(prev => ({...prev, price: parseFloat(e.target.value) || 0}))} className="w-full p-2 border rounded-md" />
                </div>
                <button onClick={handleAddManualService} className="w-full flex items-center justify-center gap-2 p-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">
                    <Plus size={16} /> Manuel Hizmeti Teklife Ekle
                </button>
            </div>
          </div>

          {/* YENİ: E-posta Alt Bilgi Ayarları */}
          <div className="border-t pt-4">
            <label className="block text-lg font-semibold text-gray-700 mb-2">3. E-posta Alt Bilgi Ayarları</label>
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <input type="text" placeholder="Görünen İsim" value={footerInfo.name} onChange={e => setFooterInfo(prev => ({...prev, name: e.target.value}))} className="w-full p-2 border rounded-md" />
                <input type="text" placeholder="Unvan / Slogan" value={footerInfo.title} onChange={e => setFooterInfo(prev => ({...prev, title: e.target.value}))} className="w-full p-2 border rounded-md" />
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Web Sitesi" value={footerInfo.website} onChange={e => setFooterInfo(prev => ({...prev, website: e.target.value}))} className="w-full p-2 border rounded-md" />
                    <input type="text" placeholder="Telefon Numarası" value={footerInfo.phone} onChange={e => setFooterInfo(prev => ({...prev, phone: e.target.value}))} className="w-full p-2 border rounded-md" />
                </div>
                <input type="text" placeholder="Logo URL" value={footerInfo.logo_url} onChange={e => setFooterInfo(prev => ({...prev, logo_url: e.target.value}))} className="w-full p-2 border rounded-md" />
                <button onClick={handleSaveFooterSettings} disabled={isSavingSettings} className="w-full flex items-center justify-center gap-2 p-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400">
                    {isSavingSettings ? <Loader className="animate-spin" /> : <Save size={16} />}
                    {isSavingSettings ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </button>
            </div>
          </div>
          
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between items-center text-lg font-semibold">
                <span>Genel Toplam:</span>
                <span className="text-green-600">{(grandTotal || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
            </div>
            <p className="text-xs text-gray-500 text-right -mt-2">Fiyatlara KDV dahil değildir.</p>
            <div className="flex gap-3 mt-4">
                <button onClick={handleSendEmail} disabled={isSending || !recipientEmail || !companyName || selectedServices.length === 0} className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-lg">
                    {isSending ? <Loader className="animate-spin" /> : <Send />}
                    {isSending ? 'Gönderiliyor...' : 'Teklifi Gönder'}
                </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold mb-4">E-posta Önizlemesi</h3>
            <div className="border rounded-lg h-[80vh] overflow-hidden">
                {emailPreview ? (
                    <iframe srcDoc={emailPreview} title="E-posta Önizlemesi" className="w-full h-full border-0" />
                ) : (
                    <div className="flex items-center justify-center h-full bg-gray-50 text-gray-500">
                        <p>Lütfen göndermek için hizmet seçin.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default HizmetPazarlama;