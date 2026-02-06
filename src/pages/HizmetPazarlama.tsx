import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { toast } from 'sonner';
import { Mail, Send, Loader2 as Loader, MessageSquare, Plus, Save, Bug, Check, FileDown, Package, Shield, FileText, Percent } from 'lucide-react';

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
  type: 'service';
  target_pests?: string[]; // YENİ: Hedef Zararlılar
}

interface Equipment {
  id: string;
  name: string;
  description?: string;
  sale_price: number;
  unit: string;
  image_url?: string;
  type: 'product';
}

interface SelectedItem {
  id: number | string;
  type: 'service' | 'product';
  name: string;
  description?: string;
  image_url?: string;
  visitCount: number;
  price: number;
  explanation: string;
  unitType: string;
}

interface FooterInfo {
  name: string;
  title: string;
  website: string;
  phone: string;
  logo_url: string;
}

const PEST_TYPES = [
  'Hamam Böceği', 'Kemirgen', 'Karınca', 'Sinek', 'Güve', 'Örümcek', 'Gümüşçün', 'Pire', 'Kene', 'Tahtakurusu', 'Akrep'
];

const SCOPE_AREAS = [
  'İşletme Geneli', 'İdari Ofisler', 'Üretim Alanı', 'Depo Alanları', 'Dış Alan', 'İç Alan', 'Mutfak & Yemekhane', 'Sosyal Alanlar', 'Otopark', 'Bahçe & Peyzaj'
];

// İmza HTML Oluşturucu
const generateSignatureHtml = (footer: FooterInfo): string => `
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eeeeee;">
    <tr>
      <td style="width: 80px; vertical-align: top;">
        <img src="${footer.logo_url || 'https://via.placeholder.com/70'}" alt="Logo" style="width: 70px; height: auto;">
      </td>
      <td style="vertical-align: top; padding-left: 15px; font-family: Arial, sans-serif;">
        <p style="margin: 0; font-weight: bold; color: #059669; font-size: 14px;">${footer.name || 'Firma Yetkilisi'}</p>
        <p style="margin: 4px 0; font-size: 12px; color: #555555;">${footer.title || ''}</p>
        <p style="margin: 4px 0; font-size: 12px; color: #555555;">
          <a href="http://${footer.website || '#'}" style="color: #059669; text-decoration: none;">${footer.website || ''}</a> 
          ${footer.phone ? `| <span style="color: #333333;">${footer.phone}</span>` : ''}
        </p>
      </td>
    </tr>
  </table>
`;

const HizmetPazarlama: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  
  const [emailSubject, setEmailSubject] = useState('Hizmet ve Ürün Teklifimiz - Fiyat Teklifi Sunulur');
  const [emailPreview, setEmailPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  
  const [allowContract, setAllowContract] = useState(true);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['İşletme Geneli']);
  const [selectedPests, setSelectedPests] = useState<string[]>(['Hamam Böceği', 'Kemirgen']);

  const [manualType, setManualType] = useState<'service' | 'product'>('service');
  const [manualItem, setManualItem] = useState({ name: '', description: '', count: 1, price: 0, unit: 'Adet' });

  const [footerInfo, setFooterInfo] = useState<FooterInfo>({
    name: 'Sistem İlaçlama Sanayi ve Ticaret Limited Şirketi - PestMentor',
    title: 'Leave Pest to us...',
    website: 'www.ilaclamatik.com - www.sistemilaclama.com',
    phone: '0224 233 83 87',
    logo_url: 'https://i.imgur.com/PajSpus.png'
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [customerRes, serviceRes, equipmentRes, settingsRes] = await Promise.all([
            supabase.from('customers').select('id, kisa_isim, email').not('email', 'is', null).order('kisa_isim'),
            supabase.from('services').select('*').order('name'),
            supabase.from('equipment').select('*').eq('is_active', true).order('name'),
            supabase.from('company_settings').select('*').limit(1).single()
        ]);

        if (customerRes.data) setCustomers(customerRes.data);
        if (serviceRes.data) setServiceList(serviceRes.data.map((s: any) => ({ ...s, type: 'service' })));
        if (equipmentRes.data) setEquipmentList(equipmentRes.data.map((e: any) => ({ ...e, type: 'product' })));

        if (settingsRes.data) {
            setFooterInfo(prev => ({
                name: settingsRes.data.name || prev.name,
                title: settingsRes.data.title || prev.title,
                website: settingsRes.data.website || prev.website,
                phone: settingsRes.data.phone || prev.phone,
                logo_url: settingsRes.data.logo_url || prev.logo_url
            }));
        }
      } catch (error: any) {
        console.error("Veri yükleme hatası:", error);
        toast.error("Veriler yüklenirken hata oluştu.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
      if (selectedCustomer) {
          const customer = customers.find(c => c.id === selectedCustomer);
          if (customer) {
              setCompanyName(customer.kisa_isim);
              setRecipientEmail(customer.email);
          }
      }
  }, [selectedCustomer, customers]);

  // TOPLAM HESABI
  const { subTotal, grandTotal, vatAmount } = useMemo(() => {
      const sub = selectedItems.reduce((total, item) => {
          return total + (Number(item.visitCount) * Number(item.price));
      }, 0);
      
      const discountedSub = sub - (Number(discountAmount) || 0);
      const finalSub = discountedSub > 0 ? discountedSub : 0;
      const vat = finalSub * 0.20;
      const total = finalSub + vat;

      return { subTotal: sub, vatAmount: vat, grandTotal: total };
  }, [selectedItems, discountAmount]);

  // HTML GENERATOR
  const generateEmailHtml = (customer: string, contact: string, items: SelectedItem[], signature: string, proposalLink?: string, password?: string): string => {
    
    const itemRows = items.map(item => {
      const price = Number(item.price) || 0;
      const count = Number(item.visitCount) || 1;
      
      let unitText = '';
      if (item.type === 'service') {
          unitText = item.unitType === 'aylik' ? `${count} Ziyaret / Ay` : `Tek Seferlik`;
      } else {
          unitText = `${count} ${item.unitType || 'Adet'}`;
      }

      const imageUrl = item.image_url || `https://placehold.co/60x60/e2e8f0/334155?text=${item.type === 'service' ? 'Hizmet' : 'Urun'}`;

      return `
      <tr style="border-bottom: 1px solid #eeeeee;">
        <td style="padding: 15px; width: 60px; vertical-align: top;">
          <img src="${imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
        </td>
        <td style="padding: 15px; vertical-align: top;">
          <p style="margin: 0; font-weight: bold; font-size: 14px; color: #333;">
            ${item.name} 
            <span style="font-size:10px; color:#666; background:#f3f4f6; padding:2px 6px; border-radius:4px; margin-left: 5px;">${item.type === 'service' ? 'HİZMET' : 'ÜRÜN'}</span>
          </p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">${item.description || ''}</p>
          ${item.explanation ? `<p style="margin: 6px 0 0 0; font-size: 12px; color: #4f46e5; font-style: italic;">Not: ${item.explanation}</p>` : ''}
        </td>
        <td style="padding: 15px; font-size: 13px; text-align: center; vertical-align: top; white-space: nowrap;">${unitText}</td>
        <td style="padding: 15px; font-size: 14px; text-align: right; vertical-align: top; font-weight: bold;">${price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
      </tr>
    `}).join('');

    const pestListHtml = PEST_TYPES.map(pest => {
        const isSelected = selectedPests.includes(pest);
        const color = isSelected ? '#059669' : '#9ca3af';
        const bg = isSelected ? '#ecfdf5' : '#f3f4f6';
        const decoration = isSelected ? 'none' : 'line-through';
        const opacity = isSelected ? '1' : '0.6';
        return `<span style="display:inline-block; padding: 4px 8px; margin: 2px; font-size: 11px; border-radius: 4px; background-color: ${bg}; color: ${color}; border: 1px solid ${isSelected ? '#a7f3d0' : '#e5e7eb'}; text-decoration: ${decoration}; opacity: ${opacity};">${pest}</span>`;
    }).join(' ');

    const scopeListHtml = SCOPE_AREAS.map(scope => {
        const isSelected = selectedScopes.includes(scope);
        const color = isSelected ? '#2563eb' : '#9ca3af';
        const bg = isSelected ? '#eff6ff' : '#f3f4f6';
        const opacity = isSelected ? '1' : '0.6';
        return `<span style="display:inline-block; padding: 4px 8px; margin: 2px; font-size: 11px; border-radius: 4px; background-color: ${bg}; color: ${color}; border: 1px solid ${isSelected ? '#93c5fd' : '#e5e7eb'}; opacity: ${opacity}; font-weight: ${isSelected ? 'bold' : 'normal'};">${isSelected ? '&#10003; ' : ''}${scope}</span>`;
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
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #92400e;">HEDEF ZARARLILAR:</p>
                <div>${pestListHtml}</div>
            </div>
            <div style="margin: 0 0 20px 0; padding: 15px; background-color: #eff6ff; border: 1px solid #93c5fd; border-radius: 6px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #1e40af;">UYGULAMA KAPSAMI:</p>
                <div>${scopeListHtml}</div>
            </div>

            <table style="margin-top:20px;margin-bottom:20px">
                <thead><tr><th style="width:60px"></th><th>Açıklama</th><th style="text-align:center">Miktar/Kapsam</th><th style="text-align:right">Birim Fiyat</th></tr></thead>
                <tbody>${itemRows}</tbody>
                <tfoot>
                    <tr><td colspan="4" style="padding-top:15px;border-top:2px solid #333;"></td></tr>
                    <tr>
                        <td colspan="3" style="text-align:right;padding:5px;font-size:14px;color:#666;">Ara Toplam:</td>
                        <td style="text-align:right;padding:5px;font-size:14px;font-weight:bold;">${subTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    </tr>
                    ${discountAmount > 0 ? `
                    <tr>
                        <td colspan="3" style="text-align:right;padding:5px;font-size:14px;color:#ef4444;">İskonto:</td>
                        <td style="text-align:right;padding:5px;font-size:14px;font-weight:bold;color:#ef4444;">-${discountAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    </tr>` : ''}
                    <tr>
                        <td colspan="3" style="text-align:right;padding:5px;font-size:14px;color:#666;">KDV (%20):</td>
                        <td style="text-align:right;padding:5px;font-size:14px;font-weight:bold;">${vatAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align:right;padding:10px;font-size:16px;font-weight:bold;color:#1e293b;">GENEL TOPLAM:</td>
                        <td style="text-align:right;padding:10px;font-size:18px;font-weight:bold;color:#059669;">${grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
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

  useEffect(() => {
    if (selectedItems.length === 0) {
      setEmailPreview('');
      return;
    }
    const selectedItemsWithDetails = selectedItems.map(selected => {
        let original: any = null;
        if (selected.type === 'service') {
             original = serviceList.find(s => s.id === selected.id);
        } else {
             original = equipmentList.find(e => e.id === selected.id);
        }
        return {
            ...selected,
            name: selected.name || original?.name || 'Bilinmeyen Öğe',
            description: selected.description || original?.description || '',
            image_url: original?.image_url || selected.image_url,
            price: Number(selected.price) || 0, 
            visitCount: Number(selected.visitCount) || 1
        };
    });
    
    const signature = generateSignatureHtml(footerInfo);
    const html = generateEmailHtml(companyName || 'Değerli Müşterimiz', contactPerson, selectedItemsWithDetails, signature);
    setEmailPreview(html);
  }, [selectedItems, serviceList, equipmentList, companyName, contactPerson, footerInfo, selectedPests, discountAmount, selectedScopes]);

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
        const createdBy = localAuth.getCurrentOperatorId() || (await supabase.auth.getUser()).data.user?.id;
        const itemsTotal = selectedItems.reduce((sum, item) => sum + (Number(item.visitCount) * Number(item.price)), 0);
        const netTotal = itemsTotal - (Number(discountAmount) || 0);

        const proposalNumber = `TEKLIF-${Date.now().toString().slice(-6)}`;
        const accessPassword = Math.floor(100000 + Math.random() * 900000).toString();

        const { data: proposalData, error: proposalError } = await supabase
            .from('proposals')
            .insert({
                proposal_number: proposalNumber,
                company_name: companyName,
                contact_person: contactPerson,
                recipient_email: recipientEmail,
                total_amount: netTotal, 
                discount_amount: Number(discountAmount) || 0,
                application_area: selectedScopes.join(', '),
                created_by: createdBy,
                access_password: accessPassword,
                status: 'pending',
                included_pests: selectedPests,
                cc_email: ccEmail || null,
                contract_available: allowContract
            })
            .select('id')
            .single();
        
        if (proposalError) throw proposalError;
        const newProposalId = proposalData.id;

        const itemsToInsert = selectedItems.map(item => {
            return {
                proposal_id: newProposalId,
                service_name: item.name,
                service_description: item.description,
                image_url: item.image_url,
                visit_count: Number(item.visitCount),
                unit_price: Number(item.price),
                explanation: item.explanation,
                unit_type: item.unitType, 
                item_type: item.type
            };
        });

        const { error: itemsError } = await supabase.from('proposal_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        const proposalLink = `https://ilaclamatik.com/teklif-goruntule/${newProposalId}`;
        const signature = generateSignatureHtml(footerInfo);
        
        const selectedItemsForEmail = selectedItems.map(selected => ({
             ...selected,
             price: Number(selected.price) || 0,
             visitCount: Number(selected.visitCount) || 1
        }));

        const emailHtml = generateEmailHtml(companyName, contactPerson, selectedItemsForEmail, signature, proposalLink, accessPassword);

        const emailPayload = {
            to: recipientEmail,
            cc: ccEmail,
            subject: emailSubject,
            html: emailHtml
        };

        const { error: emailError } = await supabase.functions.invoke('send-schedule-email', { body: emailPayload });

        if (emailError) throw emailError;
        toast.success(`Teklif başarıyla oluşturuldu ve gönderildi!`);
        
        setSelectedItems([]);
        setDiscountAmount(0);
        
    } catch (error: any) {
      toast.error('İşlem hatası: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveFooterSettings = async () => {
    setIsSavingSettings(true);
    try {
        const { data: existing } = await supabase.from('company_settings').select('id').limit(1).single();
        if (existing) {
            await supabase.from('company_settings').update(footerInfo).eq('id', existing.id);
        } else {
            await supabase.from('company_settings').insert(footerInfo);
        }
        toast.success("Ayarlar kaydedildi");
    } catch {
        toast.error("Hata");
    } finally {
        setIsSavingSettings(false);
    }
  };

  // Öğe Ekleme/Çıkarma (GÜNCELLENMİŞ)
  const toggleItemSelection = (item: Service | Equipment, type: 'service' | 'product', isSelected: boolean) => {
      if (isSelected) {
          const newItem: SelectedItem = {
              id: item.id,
              type: type,
              name: item.name,
              description: item.description,
              image_url: item.image_url,
              visitCount: type === 'service' ? ((item as Service).visit_count || 1) : 1,
              price: type === 'product' ? (item as Equipment).sale_price : (item as Service).price || 0,
              explanation: '',
              unitType: type === 'product' ? (item as Equipment).unit || 'Adet' : 'aylik'
          };
          setSelectedItems(prev => [...prev, newItem]);

          // --- ZARARLI ENTEGRASYONU ---
          if (type === 'service') {
              const service = item as Service;
              const targetPests = service.target_pests; // Interface'de tanımlı
              
              if (targetPests && Array.isArray(targetPests) && targetPests.length > 0) {
                  setSelectedPests(prev => Array.from(new Set([...prev, ...targetPests])));
                  toast.info(`${targetPests.length} adet zararlı kapsama eklendi: ${targetPests.join(', ')}`);
              }
          }
          // --------------------------------

      } else {
          setSelectedItems(prev => prev.filter(selected => !(selected.id === item.id && selected.type === type)));
      }
  };

  const handleItemUpdate = (id: number | string, type: 'service' | 'product', field: keyof SelectedItem, value: any) => {
      setSelectedItems(prev => prev.map(item => {
          if (item.id === id && item.type === type) {
              return { ...item, [field]: value };
          }
          return item;
      }));
  };
  
  const togglePest = (pest: string) => {
      setSelectedPests(prev => prev.includes(pest) ? prev.filter(p => p !== pest) : [...prev, pest]);
  };

  const toggleScope = (scope: string) => {
      setSelectedScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
  };

  const handleAddManualItem = () => {
    if(!manualItem.name) return;
    const newItem: SelectedItem = {
        id: `manual-${Date.now()}`,
        type: manualType,
        name: manualItem.name,
        description: manualItem.description,
        visitCount: Number(manualItem.count),
        price: Number(manualItem.price),
        explanation: '',
        unitType: manualType === 'service' ? 'aylik' : manualItem.unit
    };
    setSelectedItems(prev => [...prev, newItem]);
    setManualItem({ name: '', description: '', count: 1, price: 0, unit: 'Adet' });
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
          
          {/* ALICI BİLGİLERİ */}
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
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Firma Adı *" className="w-full p-2 border rounded-lg" />
                <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Yetkili Kişi" className="w-full p-2 border rounded-lg" />
                <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Alıcı E-posta *" className="w-full p-2 border rounded-lg" />
                <input type="email" value={ccEmail} onChange={e => setCcEmail(e.target.value)} placeholder="CC (Bilgi) E-posta" className="w-full p-2 border rounded-lg" />
            </div>
          </div>

          {/* SÖZLEŞME OPSİYONU */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <FileText className="text-blue-600" size={20} />
                  <div>
                      <p className="text-sm font-bold text-gray-800">Sözleşme Oluşturulsun Mu?</p>
                      <p className="text-xs text-gray-500">Onaylandığında otomatik sözleşme hazırlanabilsin.</p>
                  </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={allowContract} onChange={(e) => setAllowContract(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
          </div>

          {/* İSKONTO */}
          <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">İskonto Tutarı (TL)</label>
              <div className="relative max-w-xs">
                  <Percent size={16} className="absolute left-2 top-2.5 text-gray-400" />
                  <input type="number" value={discountAmount} onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)} className="w-full pl-8 p-2 border rounded-lg" />
              </div>
          </div>

          {/* UYGULAMA KAPSAMI */}
          <div>
             <label className="block text-lg font-semibold text-gray-700 mb-2">Uygulama Kapsamı</label>
             <div className="flex flex-wrap gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                 {SCOPE_AREAS.map(scope => (
                     <button
                        key={scope}
                        onClick={() => toggleScope(scope)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                            selectedScopes.includes(scope)
                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                        }`}
                     >
                        {selectedScopes.includes(scope) && <Check size={12}/>}
                        {scope}
                     </button>
                 ))}
             </div>
          </div>

          {/* HEDEF ZARARLILAR */}
          <div>
             <label className="block text-lg font-semibold text-gray-700 mb-2">Hedef Zararlılar</label>
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

          {/* HİZMET LİSTESİ */}
          <div className="border rounded-lg max-h-80 overflow-y-auto p-2">
                <h4 className="font-bold text-gray-700 px-2 mb-2 text-sm sticky top-0 bg-white z-10 py-1">HİZMETLER</h4>
                {serviceList.map(item => {
                    const selectedItem = selectedItems.find(s => s.id === item.id && s.type === 'service');
                    return (
                        <div key={`srv-${item.id}`} className={`border rounded-lg mb-2 p-3 ${selectedItem ? 'bg-green-50' : 'bg-white'}`}>
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
                                        <select value={selectedItem.unitType} onChange={(e) => handleItemUpdate(item.id, 'service', 'unitType', e.target.value)} className="w-full p-1 border rounded text-xs">
                                            <option value="aylik">Aylık Periyodik</option>
                                            <option value="seferlik">Tek Seferlik</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3">
                                        <input type="number" value={selectedItem.visitCount} onChange={(e) => handleItemUpdate(item.id, 'service', 'visitCount', parseInt(e.target.value))} className="w-full p-1 border rounded text-xs text-center" min="1" />
                                    </div>
                                    <div className="col-span-3">
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
          
           {/* EKİPMAN LİSTESİ */}
          <div className="border rounded-lg max-h-80 overflow-y-auto p-2 mt-4">
                <h4 className="font-bold text-gray-700 px-2 mb-2 text-sm sticky top-0 bg-white z-10 py-1">EKİPMAN & ÜRÜNLER (Stok)</h4>
                {equipmentList.map(item => {
                    const selectedItem = selectedItems.find(s => s.id === item.id && s.type === 'product');
                    return (
                        <div key={`prd-${item.id}`} className={`border rounded-lg mb-2 p-3 ${selectedItem ? 'bg-blue-50' : 'bg-white'}`}>
                            <div className="flex items-center space-x-3">
                                <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={!!selectedItem} onChange={(e) => toggleItemSelection(item, 'product', e.target.checked)} />
                                {item.image_url ? <img src={item.image_url} className="w-8 h-8 object-cover rounded" /> : <Package className="w-8 h-8 text-gray-400" />}
                                <div className="flex-grow">
                                    <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.sale_price} ₺ / {item.unit}</p>
                                </div>
                            </div>
                            {selectedItem && (
                                <div className="mt-3 pl-8 grid grid-cols-12 gap-3 animate-in slide-in-from-top-2">
                                    <div className="col-span-4 flex items-center gap-1">
                                        <input type="number" value={selectedItem.visitCount} onChange={(e) => handleItemUpdate(item.id, 'product', 'visitCount', parseInt(e.target.value))} className="w-full p-1 border rounded text-xs text-center" min="1" />
                                        <span className="text-xs text-gray-500">{item.unitType}</span>
                                    </div>
                                    <div className="col-span-4">
                                        <input type="number" value={selectedItem.price} onChange={(e) => handleItemUpdate(item.id, 'product', 'price', parseFloat(e.target.value))} className="w-full p-1 border rounded text-xs text-right font-bold" />
                                    </div>
                                    <div className="col-span-4 flex items-end justify-end">
                                        <span className="text-xs font-bold text-blue-600">{(selectedItem.visitCount * selectedItem.price).toLocaleString()} ₺</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
          </div>

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
                    <div className="grid grid-cols-3 gap-3">
                        <input type="number" placeholder="Miktar" value={manualItem.count} onChange={e => setManualItem(prev => ({...prev, count: parseInt(e.target.value)}))} className="w-full p-2 border rounded text-sm" />
                        <input type="text" placeholder="Birim (Adet/Kg)" value={manualItem.unit} onChange={e => setManualItem(prev => ({...prev, unit: e.target.value}))} className="w-full p-2 border rounded text-sm" disabled={manualType === 'service'} />
                        <input type="number" placeholder="Fiyat" value={manualItem.price} onChange={e => setManualItem(prev => ({...prev, price: parseFloat(e.target.value)}))} className="w-full p-2 border rounded text-sm" />
                    </div>
                    <button onClick={handleAddManualItem} className="w-full bg-gray-800 text-white rounded text-sm font-medium p-2 hover:bg-gray-700">Listeye Ekle</button>
                </div>
            </details>
          </div>

          <div className="border-t pt-4 bg-green-50 p-4 rounded-xl">
            <div className="flex justify-between items-center text-lg font-bold text-gray-800 mb-1">
                <span>TOPLAM:</span>
                <span className="text-xl text-gray-600">{subTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
            </div>
             {discountAmount > 0 && (
                <div className="flex justify-between items-center text-sm font-medium text-red-600 mb-1">
                    <span>İskonto:</span>
                    <span>-{discountAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                </div>
            )}
             <div className="flex justify-between items-center text-sm font-medium text-gray-600 mb-1">
                <span>KDV (%20):</span>
                <span>{vatAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold text-gray-800 border-t border-green-200 pt-2 mt-1">
                <span>GENEL TOPLAM:</span>
                <span className="text-2xl text-green-700">{grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
            </div>
            
            <button onClick={handleSendEmail} disabled={isSending || selectedItems.length === 0} className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-all shadow-lg hover:shadow-xl mt-4">
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