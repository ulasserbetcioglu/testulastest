import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { toast } from 'sonner';
import { Mail, Send, Loader2 as Loader, MessageSquare, Plus, Save, Bug, Check, Package, Shield, FileText, Percent, X, Eye, EyeOff, Search, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

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
    target_pests?: string[];
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
    'Hamam Böceği', 'Kemirgen', 'Karınca', 'Sinek', 'Güve', 'Örümcek', 'Gümüşçün', 'Pire', 'Kene', 'Tahtakurusu', 'Akrep', 'Mikroorganizma', 'Dezenfeksiyon'
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
    const [searchParams] = useSearchParams();
    const revisionOf = searchParams.get('revision_of');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [serviceList, setServiceList] = useState<Service[]>([]);
    const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

    const [emailSubject, setEmailSubject] = useState('Hizmet ve Ürün Teklifimiz - Hizmet Teklifi');
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

    // YENİ: Periyodik Ziyaret Sıklığı
    const [summerVisitFrequency, setSummerVisitFrequency] = useState<number>(1); // Yaz ayları (Nisan-Eylül)
    const [winterVisitFrequency, setWinterVisitFrequency] = useState<number>(1); // Kış ayları (Ekim-Mart)

    const [showVisitFrequency, setShowVisitFrequency] = useState(true);
    const [manualType, setManualType] = useState<'service' | 'product'>('service');
    const [manualItem, setManualItem] = useState({ name: '', description: '', count: 1, price: 0, unit: 'Adet' });

    // YENİ: Kullanıcı Deneyimi İyileştirmeleri
    const [showPreview, setShowPreview] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [serviceCollapsed, setServiceCollapsed] = useState(false);
    const [productCollapsed, setProductCollapsed] = useState(false);

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
        const fetchRevisionData = async () => {
            if (!revisionOf) return;

            try {
                // 1. Fetch proposal
                const { data: proposal, error: pError } = await supabase
                    .from('proposals')
                    .select('*')
                    .eq('id', revisionOf)
                    .single();

                if (pError) throw pError;

                // 2. Fetch items
                const { data: items, error: iError } = await supabase
                    .from('proposal_items')
                    .select('*')
                    .eq('proposal_id', revisionOf);

                if (iError) throw iError;

                // 3. Set state
                if (proposal) {
                    setCompanyName(proposal.company_name || '');
                    setContactPerson(proposal.contact_person || '');
                    setRecipientEmail(proposal.recipient_email || '');
                    setCcEmail(proposal.cc_email || '');
                    setEmailSubject(`Revize: ${proposal.proposal_number || 'Teklif'} - Hizmet ve Ürün Teklifimiz`);
                    setDiscountAmount(proposal.discount_amount || 0);
                    setAllowContract(proposal.contract_available !== false);
                    setSummerVisitFrequency(proposal.summer_visit_frequency || 1);
                    setWinterVisitFrequency(proposal.winter_visit_frequency || 1);
                    setShowVisitFrequency(proposal.show_visit_frequency !== false);

                    if (proposal.included_pests && Array.isArray(proposal.included_pests)) {
                        setSelectedPests(proposal.included_pests);
                    }

                    if (proposal.application_area) {
                        setSelectedScopes(proposal.application_area.split(', ').filter(Boolean));
                    }

                    if (items && items.length > 0) {
                        setSelectedItems(items.map(item => ({
                            id: item.id, // Using the same ID is fine for selection state if it's unique
                            type: item.item_type as 'service' | 'product',
                            name: item.service_name || 'Bilinmeyen Kalem',
                            description: item.service_description || '',
                            image_url: item.image_url || '',
                            visitCount: item.visit_count || 1,
                            price: item.unit_price || 0,
                            explanation: item.explanation || '',
                            unitType: item.unit_type || 'aylik'
                        })));
                    }

                    toast.info(`${proposal.proposal_number || 'Teklif'} revizyon için başarıyla yüklendi.`);
                } else {
                    toast.error("Kaynak teklif bulunamadı.");
                }
            } catch (error: any) {
                console.error("Revizyon verisi yükleme hatası:", error);
                toast.error("Kaynak teklif yüklenirken hata oluştu.");
            }
        };

        if (revisionOf && customers.length > 0) {
            fetchRevisionData();
        }
    }, [revisionOf, customers.length]);

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

    // YENİ: Filtrelenmiş Listeler
    const filteredServices = useMemo(() => {
        if (!searchTerm) return serviceList;
        return serviceList.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [serviceList, searchTerm]);

    const filteredEquipment = useMemo(() => {
        if (!searchTerm) return equipmentList;
        return equipmentList.filter(e =>
            e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [equipmentList, searchTerm]);

    // HTML GENERATOR
    const generateEmailHtml = (customer: string, contact: string, items: SelectedItem[], signature: string, proposalLink?: string, password?: string, proposalNumber?: string): string => {

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

        // YENİ: Ziyaret Sıklığı Bilgisi
        const visitFrequencySection = showVisitFrequency ? `
        <div style="margin: 20px 0; padding: 15px; background-color: #f0f9ff; border: 1px solid #93c5fd; border-radius: 6px;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #1e40af;">PERİYODİK ZİYARET SIKLIĞI:</p>
            <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                <div style="text-align: center;">
                    <span style="font-size: 11px; color: #64748b;">☀️ Yaz Ayları (Nisan-Eylül)</span><br/>
                    <span style="font-size: 16px; font-weight: bold; color: #2563eb;">${summerVisitFrequency} ziyaret/ay</span>
                </div>
                <div style="text-align: center;">
                    <span style="font-size: 11px; color: #64748b;">❄️ Kış Ayları (Ekim-Mart)</span><br/>
                    <span style="font-size: 16px; font-weight: bold; color: #2563eb;">${winterVisitFrequency} ziyaret/ay</span>
                </div>
            </div>
        </div>
    ` : '';

        return `
      <!DOCTYPE html><html><head><style>body{font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#333; line-height: 1.6;}.container{max-width:700px;margin:auto;border:1px solid #e5e7eb; border-radius: 8px; overflow: hidden;}.header{background-color:#1e293b;color:white;padding:20px;text-align:center}.content{padding:30px}table{width:100%;border-collapse:collapse}th{background-color:#f8fafc;text-align:left;padding:12px;font-size:12px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;}</style></head><body>
      <div class="container">
        <div class="header">
            <h2 style="margin:0; font-size: 24px;">HİZMET TEKLİFİ</h2>
            <p style="margin:5px 0 0 0; opacity: 0.8; font-size: 14px;">${proposalNumber || 'Hizmet & Ürün Detayları'}</p>
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
            ${visitFrequencySection}

            <table style="margin-top:20px;margin-bottom:20px">
                <thead><tr><th style="width:60px"></th><th>Açıklama</th><th style="text-align:center">Ziyaret Sıklığı</th><th style="text-align:center">Miktar/Kapsam</th><th style="text-align:right">Birim Fiyat</th></tr></thead>
                <tbody>${itemRows}</tbody>
                <tfoot>
                    <tr><td colspan="5" style="padding-top:15px;border-top:2px solid #333;"></td></tr>
                    <tr>
                        <td colspan="4" style="text-align:right;padding:5px;font-size:14px;color:#666;">Ara Toplam:</td>
                        <td style="text-align:right;padding:5px;font-size:14px;font-weight:bold;">${subTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    </tr>
                    ${discountAmount > 0 ? `
                    <tr>
                        <td colspan="4" style="text-align:right;padding:5px;font-size:14px;color:#ef4444;">İskonto:</td>
                        <td style="text-align:right;padding:5px;font-size:14px;font-weight:bold;color:#ef4444;">-${discountAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    </tr>` : ''}
                    <tr>
                        <td colspan="4" style="text-align:right;padding:5px;font-size:14px;color:#666;">KDV (%20):</td>
                        <td style="text-align:right;padding:5px;font-size:14px;font-weight:bold;">${vatAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    </tr>
                    <tr>
                        <td colspan="4" style="text-align:right;padding:10px;font-size:16px;font-weight:bold;color:#1e293b;">GENEL TOPLAM:</td>
                        <td style="text-align:right;padding:10px;font-size:18px;font-weight:bold;color:#059669;">${grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    </tr>
                </tfoot>
            </table>
            ${pdfSection}
            <p style="margin-top: 30px; font-size: 13px; color: #666;">Not: Bu teklif 30 gün süreyle geçerlidir.</p>
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
                original = equipmentList.find(e => e.id === Number(selected.id) || e.id === String(selected.id));
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
        const html = generateEmailHtml(companyName || 'Değerli Müşterimiz', contactPerson, selectedItemsWithDetails, signature, undefined, undefined, revisionOf ? 'REVİZYON ÖNİZLEME' : 'TEKLİF ÖNİZLEME');
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

            const timestamp = Date.now().toString().slice(-6);
            const proposalNumber = revisionOf ? `TEKLIF-REVIZE-${timestamp}` : `TEKLIF-${timestamp}`;
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
                    contract_available: allowContract,
                    summer_visit_frequency: summerVisitFrequency,
                    winter_visit_frequency: winterVisitFrequency,
                    show_visit_frequency: showVisitFrequency
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

            const emailHtml = generateEmailHtml(companyName, contactPerson, selectedItemsForEmail, signature, proposalLink, accessPassword, proposalNumber);

            const emailPayload = {
                to: recipientEmail,
                cc: ccEmail,
                subject: emailSubject,
                html: emailHtml
            };

            const { error: emailError } = await supabase.functions.invoke('send-schedule-email', { body: emailPayload });

            if (emailError) throw emailError;
            toast.success(`Teklif başarıyla oluşturuldu ve gönderildi!`);

            // YENİ: Formu sıfırla
            handleResetForm();

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

    // YENİ: Form Sıfırlama
    const handleResetForm = () => {
        setSelectedItems([]);
        setDiscountAmount(0);
        setSelectedCustomer('');
        setCompanyName('');
        setContactPerson('');
        setRecipientEmail('');
        setCcEmail('');
        setSelectedPests(['Hamam Böceği', 'Kemirgen']);
        setSelectedScopes(['İşletme Geneli']);
        setSummerVisitFrequency(1);
        setWinterVisitFrequency(1);
        setShowVisitFrequency(true);
    };

    // Öğe Ekleme/Çıkarma
    const toggleItemSelection = (item: Service | Equipment, type: 'service' | 'product', isSelected: boolean) => {
        if (isSelected) {
            const newItem: SelectedItem = {
                id: item.id,
                type: type,
                name: item.name,
                description: item.description,
                image_url: item.image_url,
                visitCount: type === 'service' ? ((item as Service).visit_count || 1) : 1,
                price: type === 'product' ? ((item as Equipment).sale_price || 0) : ((item as Service).price || 0),
                explanation: '',
                unitType: type === 'product' ? ((item as Equipment).unit || 'Adet') : 'aylik'
            };
            setSelectedItems(prev => [...prev, newItem]);

            if (type === 'service') {
                const service = item as Service;
                const targetPests = service.target_pests;

                if (targetPests && Array.isArray(targetPests) && targetPests.length > 0) {
                    setSelectedPests(prev => Array.from(new Set([...prev, ...targetPests])));
                    toast.info(`${targetPests.length} zararlı eklendi: ${targetPests.join(', ')}`);
                }
            }

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
        if (!manualItem.name) {
            toast.error('Lütfen kalem adı girin');
            return;
        }
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
        toast.success('Manuel kalem eklendi');
    };

    // YENİ: Hızlı İşlemler
    const handleSelectAllPests = () => setSelectedPests([...PEST_TYPES]);
    const handleClearAllPests = () => setSelectedPests([]);
    const handleSelectAllScopes = () => setSelectedScopes([...SCOPE_AREAS]);
    const handleClearAllScopes = () => setSelectedScopes([]);

    return (
        <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <MessageSquare className="w-8 h-8 text-green-600" />
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-3">
                            Hizmet & Ürün Teklifi
                            {revisionOf && <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200 animate-pulse">REVİZYON MODU</span>}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {selectedItems.length > 0 && `${selectedItems.length} kalem seçildi • `}
                            {grandTotal > 0 && `Toplam: ${grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`}
                        </p>
                    </div>
                </div>

                {/* YENİ: Hızlı Aksiyonlar */}
                <div className="flex gap-2">
                    {selectedItems.length > 0 && (
                        <button
                            onClick={handleResetForm}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                        >
                            <X size={16} />
                            <span className="hidden sm:inline">Formu Temizle</span>
                        </button>
                    )}
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm lg:hidden"
                    >
                        {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                        Önizleme
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Sol Panel - Form */}
                <div className="bg-white p-4 lg:p-6 rounded-xl shadow-md space-y-4 lg:space-y-6 max-h-[90vh] overflow-y-auto">

                    {/* 1. ALICI BİLGİLERİ */}
                    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100">
                        <label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-3">
                            <Mail size={20} className="text-blue-600" />
                            1. Alıcı Bilgileri
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                                <label className="text-xs text-gray-500 font-medium mb-1 block">Kayıtlı Müşteri Seç</label>
                                <select
                                    value={selectedCustomer}
                                    onChange={e => setSelectedCustomer(e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    disabled={loading}
                                >
                                    <option value="">🖊️ Manuel Giriş Yap</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>👤 {c.kisa_isim}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium mb-1 block">Firma Adı *</label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    placeholder="Örn: ABC Gıda Ltd."
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium mb-1 block">Yetkili Kişi</label>
                                <input
                                    type="text"
                                    value={contactPerson}
                                    onChange={e => setContactPerson(e.target.value)}
                                    placeholder="Örn: Ahmet Yılmaz"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium mb-1 block">Alıcı E-posta *</label>
                                <input
                                    type="email"
                                    value={recipientEmail}
                                    onChange={e => setRecipientEmail(e.target.value)}
                                    placeholder="ornek@firma.com"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium mb-1 block">CC (Bilgi) E-posta</label>
                                <input
                                    type="email"
                                    value={ccEmail}
                                    onChange={e => setCcEmail(e.target.value)}
                                    placeholder="bilgi@firma.com"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. SÖZLEŞME & İSKONTO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Sözleşme */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2">
                                    <FileText className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Otomatik Sözleşme</p>
                                        <p className="text-xs text-gray-500">Onayda sözleşme oluştur</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                    <input type="checkbox" className="sr-only peer" checked={allowContract} onChange={(e) => setAllowContract(e.target.checked)} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* İskonto */}
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                                <Percent size={16} className="text-orange-600" />
                                İskonto Tutarı
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={discountAmount}
                                    onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                    className="w-full p-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-8"
                                    placeholder="0.00"
                                />
                                <span className="absolute right-3 top-2.5 text-gray-500 text-sm">₺</span>
                            </div>
                        </div>
                    </div>

                    {/* YENİ: PERİYODİK ZİYARET SIKLIĞI */}
                    <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Periyodik Ziyaret Sıklığı
                            </label>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={showVisitFrequency} 
                                    onChange={(e) => setShowVisitFrequency(e.target.checked)} 
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>
                        
                        {showVisitFrequency && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div>
                                    <label className="text-xs text-gray-600 font-medium mb-1 block flex items-center gap-1">
                                        <span className="text-yellow-600">☀️</span> Yaz Ayları (Nisan-Eylül)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={summerVisitFrequency}
                                            onChange={e => setSummerVisitFrequency(parseInt(e.target.value) || 1)}
                                            className="w-full p-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center font-semibold"
                                            min="1"
                                            max="12"
                                        />
                                        <span className="text-xs text-gray-500 whitespace-nowrap">ziyaret/ay</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-600 font-medium mb-1 block flex items-center gap-1">
                                        <span className="text-blue-600">❄️</span> Kış Ayları (Ekim-Mart)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={winterVisitFrequency}
                                            onChange={e => setWinterVisitFrequency(parseInt(e.target.value) || 1)}
                                            className="w-full p-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center font-semibold"
                                            min="1"
                                            max="12"
                                        />
                                        <span className="text-xs text-gray-500 whitespace-nowrap">ziyaret/ay</span>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-xs text-gray-500 mt-1 italic">
                                        💡 Bu değerler sözleşmede mevsimsel ziyaret planlaması için kullanılacaktır
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. KAPSAM & ZARARLILAR */}
                    <div className="space-y-4">
                        {/* Uygulama Kapsamı */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <Shield size={16} className="text-blue-600" />
                                    Uygulama Kapsamı
                                </label>
                                <div className="flex gap-2">
                                    <button onClick={handleSelectAllScopes} className="text-xs text-blue-600 hover:underline">Tümünü Seç</button>
                                    <button onClick={handleClearAllScopes} className="text-xs text-gray-500 hover:underline">Temizle</button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                {SCOPE_AREAS.map(scope => (
                                    <button
                                        key={scope}
                                        onClick={() => toggleScope(scope)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${selectedScopes.includes(scope)
                                            ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {selectedScopes.includes(scope) && <Check size={12} />}
                                        {scope}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hedef Zararlılar */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <Bug size={16} className="text-green-600" />
                                    Hedef Zararlılar
                                </label>
                                <div className="flex gap-2">
                                    <button onClick={handleSelectAllPests} className="text-xs text-green-600 hover:underline">Tümünü Seç</button>
                                    <button onClick={handleClearAllPests} className="text-xs text-gray-500 hover:underline">Temizle</button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 p-3 bg-green-50/50 rounded-lg border border-green-100">
                                {PEST_TYPES.map(pest => (
                                    <button
                                        key={pest}
                                        onClick={() => togglePest(pest)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${selectedPests.includes(pest)
                                            ? 'bg-green-500 text-white border-green-600 shadow-sm'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {selectedPests.includes(pest) && <Check size={12} />}
                                        {pest}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 4. HİZMET & ÜRÜN SEÇİMİ */}
                    <div className="space-y-4">
                        {/* Arama */}
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Hizmet veya ürün ara..."
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>

                        {/* Hizmetler */}
                        <div className="border rounded-lg overflow-hidden bg-white">
                            <button
                                onClick={() => setServiceCollapsed(!serviceCollapsed)}
                                className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition-colors"
                            >
                                <span className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                    🔧 HİZMETLER
                                    <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                                        {filteredServices.length}
                                    </span>
                                </span>
                                {serviceCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                            </button>

                            {!serviceCollapsed && (
                                <div className="max-h-80 overflow-y-auto p-2">
                                    {filteredServices.length === 0 ? (
                                        <p className="text-center text-gray-400 py-8 text-sm">Hizmet bulunamadı</p>
                                    ) : (
                                        filteredServices.map(item => {
                                            const selectedItem = selectedItems.find(s => s.id === item.id && s.type === 'service');
                                            return (
                                                <div key={`srv-${item.id}`} className={`border rounded-lg mb-2 p-3 transition-all ${selectedItem ? 'bg-green-50 border-green-300' : 'bg-white hover:bg-gray-50'}`}>
                                                    <div className="flex items-center space-x-3">
                                                        <input
                                                            type="checkbox"
                                                            className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                                            checked={!!selectedItem}
                                                            onChange={(e) => toggleItemSelection(item, 'service', e.target.checked)}
                                                        />
                                                        <div className="flex-grow min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                                            <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                                                        </div>
                                                        {item.price != null && (
                                                            <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                                                                {Number(item.price).toLocaleString()} ₺
                                                            </span>
                                                        )}
                                                    </div>
                                                    {selectedItem && (
                                                        <div className="mt-3 pl-8 space-y-2 animate-in slide-in-from-top-2">
                                                            <div className="grid grid-cols-12 gap-2">
                                                                <div className="col-span-6">
                                                                    <label className="text-xs text-gray-500 block mb-1">Tür</label>
                                                                    <select
                                                                        value={selectedItem.unitType}
                                                                        onChange={(e) => handleItemUpdate(item.id, 'service', 'unitType', e.target.value)}
                                                                        className="w-full p-1.5 border rounded text-xs bg-white"
                                                                    >
                                                                        <option value="aylik">📅 Aylık Periyodik</option>
                                                                        <option value="seferlik">🎯 Tek Seferlik</option>
                                                                    </select>
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <label className="text-xs text-gray-500 block mb-1">Ziyaret</label>
                                                                    <input
                                                                        type="number"
                                                                        value={selectedItem.visitCount}
                                                                        onChange={(e) => handleItemUpdate(item.id, 'service', 'visitCount', parseInt(e.target.value))}
                                                                        className="w-full p-1.5 border rounded text-xs text-center"
                                                                        min="1"
                                                                    />
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <label className="text-xs text-gray-500 block mb-1">Fiyat</label>
                                                                    <input
                                                                        type="number"
                                                                        value={selectedItem.price}
                                                                        onChange={(e) => handleItemUpdate(item.id, 'service', 'price', parseFloat(e.target.value))}
                                                                        className="w-full p-1.5 border rounded text-xs text-right font-bold"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={selectedItem.explanation}
                                                                onChange={(e) => handleItemUpdate(item.id, 'service', 'explanation', e.target.value)}
                                                                className="w-full p-1.5 border rounded text-xs"
                                                                placeholder="💬 Özel açıklama ekle..."
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Ürünler */}
                        <div className="border rounded-lg overflow-hidden bg-white">
                            <button
                                onClick={() => setProductCollapsed(!productCollapsed)}
                                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition-colors"
                            >
                                <span className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                    📦 ÜRÜNLER
                                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                                        {filteredEquipment.length}
                                    </span>
                                </span>
                                {productCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                            </button>

                            {!productCollapsed && (
                                <div className="max-h-80 overflow-y-auto p-2">
                                    {filteredEquipment.length === 0 ? (
                                        <p className="text-center text-gray-400 py-8 text-sm">Ürün bulunamadı</p>
                                    ) : (
                                        filteredEquipment.map(item => {
                                            const selectedItem = selectedItems.find(s => s.id === item.id && s.type === 'product');
                                            return (
                                                <div key={`prd-${item.id}`} className={`border rounded-lg mb-2 p-3 transition-all ${selectedItem ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'}`}>
                                                    <div className="flex items-center space-x-3">
                                                        <input
                                                            type="checkbox"
                                                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                            checked={!!selectedItem}
                                                            onChange={(e) => toggleItemSelection(item, 'product', e.target.checked)}
                                                        />
                                                        {item.image_url ? (
                                                            <img src={item.image_url} className="w-10 h-10 object-cover rounded border border-gray-200" alt={item.name} />
                                                        ) : (
                                                            <Package className="w-10 h-10 text-gray-300 flex-shrink-0" />
                                                        )}
                                                        <div className="flex-grow min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {item.sale_price != null ? `${Number(item.sale_price).toLocaleString()} ₺` : 'Fiyat belirtilmemiş'} / {item.unit}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {selectedItem && (
                                                        <div className="mt-3 pl-14 grid grid-cols-12 gap-2 animate-in slide-in-from-top-2">
                                                            <div className="col-span-4">
                                                                <label className="text-xs text-gray-500 block mb-1">Miktar</label>
                                                                <input
                                                                    type="number"
                                                                    value={selectedItem.visitCount}
                                                                    onChange={(e) => handleItemUpdate(item.id, 'product', 'visitCount', parseInt(e.target.value))}
                                                                    className="w-full p-1.5 border rounded text-xs text-center"
                                                                    min="1"
                                                                />
                                                            </div>
                                                            <div className="col-span-4">
                                                                <label className="text-xs text-gray-500 block mb-1">Birim Fiyat</label>
                                                                <input
                                                                    type="number"
                                                                    value={selectedItem.price}
                                                                    onChange={(e) => handleItemUpdate(item.id, 'product', 'price', parseFloat(e.target.value))}
                                                                    className="w-full p-1.5 border rounded text-xs text-right font-bold"
                                                                />
                                                            </div>
                                                            <div className="col-span-4">
                                                                <label className="text-xs text-gray-500 block mb-1">Toplam</label>
                                                                <div className="p-1.5 bg-blue-100 rounded text-xs font-bold text-blue-700 text-right">
                                                                    {(selectedItem.visitCount * selectedItem.price).toLocaleString()} ₺
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Manuel Kalem Ekleme */}
                        <div className="border-t pt-4">
                            <details className="group bg-gray-50 rounded-lg border border-gray-200">
                                <summary className="flex cursor-pointer items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors select-none">
                                    <div className="flex items-center gap-2">
                                        <Plus className="h-4 w-4" />
                                        Manuel Kalem Ekle
                                    </div>
                                    <ChevronDown className="group-open:rotate-180 transition-transform" size={16} />
                                </summary>
                                <div className="p-4 space-y-3 border-t border-gray-200">
                                    <div className="flex gap-4 mb-2">
                                        <label className="flex items-center text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={manualType === 'service'}
                                                onChange={() => setManualType('service')}
                                                className="mr-2 text-green-600 focus:ring-green-500"
                                            />
                                            🔧 Hizmet
                                        </label>
                                        <label className="flex items-center text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={manualType === 'product'}
                                                onChange={() => setManualType('product')}
                                                className="mr-2 text-blue-600 focus:ring-blue-500"
                                            />
                                            📦 Ürün
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Kalem Adı *"
                                        value={manualItem.name}
                                        onChange={e => setManualItem(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                    <textarea
                                        placeholder="Açıklama (Opsiyonel)"
                                        value={manualItem.description}
                                        onChange={e => setManualItem(prev => ({ ...prev, description: e.target.value }))}
                                        rows={2}
                                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">Miktar</label>
                                            <input
                                                type="number"
                                                placeholder="1"
                                                value={manualItem.count}
                                                onChange={e => setManualItem(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">Birim</label>
                                            <input
                                                type="text"
                                                placeholder="Adet/Kg"
                                                value={manualItem.unit}
                                                onChange={e => setManualItem(prev => ({ ...prev, unit: e.target.value }))}
                                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                                disabled={manualType === 'service'}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">Fiyat (₺)</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={manualItem.price}
                                                onChange={e => setManualItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAddManualItem}
                                        className="w-full bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded text-sm font-medium p-2.5 hover:from-gray-800 hover:to-gray-900 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} />
                                        Listeye Ekle
                                    </button>
                                </div>
                            </details>
                        </div>
                    </div>

                    {/* 5. ÖZET & GÖNDER */}
                    <div className="border-t pt-4 bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border border-green-200 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <FileText size={16} className="text-green-600" />
                            Teklif Özeti
                        </h3>

                        {selectedItems.length > 0 ? (
                            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                                {selectedItems.map((item, idx) => (
                                    <div key={idx} className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-green-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                                            <span className="truncate flex-1 pr-2">{item.name}</span>
                                            <button
                                                onClick={() => setSelectedItems(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                                                title="Kalemi Kaldır"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="relative group">
                                                <input
                                                    type="number"
                                                    value={item.visitCount}
                                                    onChange={(e) => handleItemUpdate(item.id, item.type, 'visitCount', parseInt(e.target.value) || 1)}
                                                    className="w-full pl-6 p-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-green-400 focus:border-green-400 outline-none transition-all"
                                                    min="1"
                                                />
                                                <span className="absolute left-2 top-2 text-[10px] text-gray-400 font-medium">x</span>
                                            </div>
                                            <div className="relative group">
                                                <input
                                                    type="number"
                                                    value={item.price}
                                                    onChange={(e) => handleItemUpdate(item.id, item.type, 'price', parseFloat(e.target.value) || 0)}
                                                    className="w-full pl-6 p-1.5 border border-gray-200 rounded text-xs text-right font-bold text-green-700 focus:ring-1 focus:ring-green-400 focus:border-green-400 outline-none transition-all"
                                                />
                                                <span className="absolute left-2 top-2 text-[10px] text-gray-400 font-medium font-serif">₺</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-400 text-sm">
                                <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                Henüz kalem eklenmedi
                            </div>
                        )}

                        <div className="space-y-2 border-t border-green-200 pt-3">
                            <div className="flex justify-between items-center text-sm text-gray-600">
                                <span>Ara Toplam:</span>
                                <span className="font-semibold">{subTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between items-center text-sm text-red-600">
                                    <span>İskonto:</span>
                                    <span className="font-semibold">-{discountAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-sm text-gray-600">
                                <span>KDV (%20):</span>
                                <span className="font-semibold">{vatAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-bold text-gray-800 border-t border-green-300 pt-2 mt-2">
                                <span>GENEL TOPLAM:</span>
                                <span className="text-2xl text-green-700">{grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSendEmail}
                            disabled={isSending || selectedItems.length === 0 || !recipientEmail || !companyName}
                            className="w-full flex items-center justify-center gap-2 p-3.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl mt-4"
                        >
                            {isSending ? (
                                <>
                                    <Loader className="animate-spin" />
                                    Teklif Hazırlanıyor...
                                </>
                            ) : (
                                <>
                                    <Send />
                                    TEKLİFİ OLUŞTUR VE GÖNDER
                                </>
                            )}
                        </button>

                        {(!recipientEmail || !companyName || selectedItems.length === 0) && (
                            <p className="text-xs text-center text-red-500 mt-2">
                                ⚠️ Lütfen firma adı, e-posta ve en az bir kalem ekleyin
                            </p>
                        )}
                    </div>
                </div>

                {/* Sağ Panel - Önizleme (Desktop veya Toggle) */}
                <div className={`bg-white p-4 lg:p-6 rounded-xl shadow-md flex flex-col h-[90vh] ${!showPreview ? 'hidden lg:flex' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Eye size={20} className="text-blue-600" />
                            Canlı Önizleme
                        </h3>
                        <button
                            onClick={() => setShowPreview(false)}
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="border rounded-lg flex-grow overflow-hidden bg-gray-100">
                        {emailPreview ? (
                            <iframe
                                srcDoc={emailPreview}
                                title="Önizleme"
                                className="w-full h-full border-0 bg-white"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 p-6 text-center">
                                <Mail size={48} className="opacity-30" />
                                <p className="text-sm">Hizmet veya ürün seçimi yapıldığında<br />önizleme burada görünecektir.</p>
                            </div>
                        )}
                    </div>

                    {/* İmza Ayarları */}
                    <div className="mt-4 border-t pt-3">
                        <details className="group">
                            <summary className="flex cursor-pointer items-center text-xs font-medium text-gray-500 hover:text-gray-800 select-none transition-colors">
                                <Save className="mr-2 h-4 w-4" />
                                E-posta İmza Ayarları
                                <ChevronDown className="ml-auto group-open:rotate-180 transition-transform" size={14} />
                            </summary>
                            <div className="mt-3 space-y-2 p-3 bg-gray-50 rounded-lg text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">İsim</label>
                                        <input
                                            type="text"
                                            placeholder="İsim Soyisim"
                                            value={footerInfo.name}
                                            onChange={e => setFooterInfo(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full p-1.5 border rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Ünvan</label>
                                        <input
                                            type="text"
                                            placeholder="Ünvan/Pozisyon"
                                            value={footerInfo.title}
                                            onChange={e => setFooterInfo(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full p-1.5 border rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Web Sitesi</label>
                                        <input
                                            type="text"
                                            placeholder="www.ornek.com"
                                            value={footerInfo.website}
                                            onChange={e => setFooterInfo(prev => ({ ...prev, website: e.target.value }))}
                                            className="w-full p-1.5 border rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Telefon</label>
                                        <input
                                            type="text"
                                            placeholder="0xxx xxx xx xx"
                                            value={footerInfo.phone}
                                            onChange={e => setFooterInfo(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full p-1.5 border rounded text-xs"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleSaveFooterSettings}
                                    disabled={isSavingSettings}
                                    className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                                >
                                    {isSavingSettings ? <Loader className="animate-spin" size={14} /> : <Save size={14} />}
                                    {isSavingSettings ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                                </button>
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HizmetPazarlama;