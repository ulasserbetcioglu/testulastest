import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 as Loader, FileDown, Check, X, KeyRound, Printer, Shield, Bug, Package, FileSignature, FileText } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { generateContractHtml } from '../utils/contractGenerator';

interface ProposalItem {
    service_name: string;
    service_description: string;
    image_url: string;
    visit_count: number;
    unit_price: number;
    explanation: string;
    unit_type: string;
    item_type?: 'service' | 'product';
}

interface Proposal {
    id: string;
    created_at: string;
    proposal_number: string;
    company_name: string;
    contact_person: string;
    recipient_email: string;
    total_amount: number;
    discount_amount: number;
    application_area: string;
    proposal_items: ProposalItem[];
    status: 'pending' | 'approved' | 'rejected';
    customer_notes: string | null;
    included_pests: string[] | string | null;
    contract_available: boolean;
    revision_number: number;
}

interface CompanySettings {
    company_name: string;
    logo_url: string;
    address: string;
    email: string;
    phone: string;
    footer_text: string;
    about_text?: string;
    website?: string;
}

const PEST_TYPES = [
  'Hamam Böceği', 'Kemirgen', 'Karınca', 'Sinek', 'Güve', 'Örümcek', 'Gümüşçün', 'Pire', 'Kene', 'Tahtakurusu', 'Akrep', 'Mikroorganizma', 'Dezenfeksiyon'
];

const SCOPE_AREAS = [
  'İşletme Geneli', 'İdari Ofisler', 'Üretim Alanı', 'Depo Alanları', 'Dış Alan', 'İç Alan', 'Mutfak & Yemekhane', 'Sosyal Alanlar', 'Otopark', 'Bahçe & Peyzaj'
];

const TeklifGoruntule: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const proposalRef = useRef<HTMLDivElement>(null);
    const contractRef = useRef<HTMLDivElement>(null); 
    
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showContractModal, setShowContractModal] = useState(false);
    const [contractHtml, setContractHtml] = useState('');
    const [savedContractNumber, setSavedContractNumber] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
             try {
                 const { data: settingsData } = await supabase.from('company_settings').select('*').single();
                 setCompanySettings(settingsData);
             } catch (err) {
                 console.warn("Şirket ayarları yüklenemedi.");
             } finally {
                 setLoading(false);
             }
        };

        const pdfScript = document.createElement('script');
        pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        pdfScript.async = true;
        document.body.appendChild(pdfScript);

        fetchInitialData();
        
        return () => {
            if (document.body.contains(pdfScript)) {
                document.body.removeChild(pdfScript);
            }
        }
    }, []);

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !password) {
            toast.error("Lütfen şifreyi girin.");
            return;
        }
        setIsVerifying(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('proposals')
                .select('*, proposal_items(*)')
                .eq('id', id)
                .eq('access_password', password)
                .single();

            if (error) throw error;
            
            setProposal(data as Proposal);
            setNotes(data.customer_notes || '');
            setIsAuthenticated(true);
        } catch (err: any) {
            toast.error("Geçersiz şifre veya teklif bulunamadı.");
        } finally {
            setIsVerifying(false);
        }
    };

    // --- PDF AYARLARI GÜNCELLENDİ (PIXEL PERFECT) ---
    const handleDownloadProposalPdf = () => {
        if (!proposalRef.current || !(window as any).html2pdf) {
            toast.error("PDF oluşturucu hazır değil.");
            return;
        }
        
        const element = proposalRef.current;

        // A4 Boyutları (96 DPI)
        const opt = {
            margin: 0, // Margin SIFIR (İçerik padding ile yönetiliyor)
            filename: `Teklif_${proposal?.proposal_number}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                scrollY: 0, 
                scrollX: 0,
                windowWidth: 794, // HTML render genişliğini A4 pixel genişliğine kilitliyoruz
                width: 794,
                x: 0,
                y: 0
            },
            jsPDF: { 
                unit: 'pt', // Point (pt) birimi daha hassastır
                format: 'a4', 
                orientation: 'portrait' 
            },
        };

        (window as any).html2pdf().set(opt).from(element).save();
    };

    const handleDownloadContractPdf = async () => {
        if (!contractRef.current || !(window as any).html2pdf) {
            toast.error("PDF oluşturucu hazır değil.");
            return;
        }

        const logoUrl = companySettings?.logo_url || '';
        const contractNo = savedContractNumber;
        const compName = companySettings?.company_name || '';

        let headerImgData: string | null = null;
        try {
            const headerEl = document.createElement('div');
            headerEl.style.cssText = 'width: 680px; padding: 8px 0 6px 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a7d37; font-family: Arial, sans-serif; background: white; position: absolute; top: -9999px; left: -9999px;';
            headerEl.innerHTML = `
              <div>${logoUrl ? `<img src="${logoUrl}" crossorigin="anonymous" style="height: 28px; object-fit: contain;">` : `<span style="font-size: 13px; font-weight: 800; color: #1a7d37;">PestMENTOR</span>`}</div>
              <div style="font-size: 8px; color: #555; text-align: right;">
                <span style="font-weight: 600;">${compName}</span><br/>
                <span>S\u00f6zle\u015fme No: ${contractNo}</span>
              </div>
            `;
            document.body.appendChild(headerEl);
            const headerCanvas = await html2canvas(headerEl, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
            headerImgData = headerCanvas.toDataURL('image/png');
            document.body.removeChild(headerEl);
        } catch (e) {
            console.warn('Header render failed:', e);
        }

        const element = contractRef.current;
        const options = {
            margin: [22, 10, 18, 10],
            filename: `Sozlesme_${proposal?.company_name || 'contract'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
            pagebreak: { mode: ['css'] }
        };

        (window as any).html2pdf()
            .set(options)
            .from(element)
            .toPdf()
            .get('pdf')
            .then((pdf: any) => {
                const totalPages = pdf.internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    pdf.setPage(i);
                    if (i > 1 && headerImgData) {
                        pdf.addImage(headerImgData, 'PNG', 10, 3, 190, 12);
                    }
                    pdf.setFontSize(7);
                    pdf.setTextColor(150);
                    pdf.text(`Sayfa ${i} / ${totalPages}`, 105, 292, { align: 'center' });
                }
            })
            .save();
    };

    const handlePrintContract = () => {
        if (!contractRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error("Popup engellendi. Lütfen izin verin.");
            return;
        }
        const logoUrl = companySettings?.logo_url || '';
        const contractNo = savedContractNumber;
        const compName = companySettings?.company_name || '';
        printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hizmet Sozlesmesi</title>
<style>
  @page { size: A4 portrait; margin: 22mm 10mm 18mm 10mm; }
  @media print {
    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-header { position: fixed; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; padding-bottom: 4px; border-bottom: 2px solid #1a7d37; font-family: Arial, sans-serif; background: white; }
    .print-footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 7pt; color: #999; }
    .contract-body p { page-break-inside: avoid; }
    .contract-body h3 { page-break-after: avoid; }
    .contract-body tr { page-break-inside: avoid; }
    .contract-no-break { page-break-inside: avoid; }
  }
  body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
</style></head><body>
<div class="print-header">
  <div>${logoUrl ? `<img src="${logoUrl}" style="height: 28px;">` : `<span style="font-size: 13px; font-weight: 800; color: #1a7d37;">PestMENTOR</span>`}</div>
  <div style="font-size: 8pt; color: #555;"><span style="font-weight:600;">${compName}</span> | S\u00f6zle\u015fme No: ${contractNo}</div>
</div>
${contractRef.current.innerHTML}
</body></html>`);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    const getPestsString = (pests: string[] | string | null): string => {
        if (Array.isArray(pests)) {
            return pests.join(', ');
        }
        if (typeof pests === 'string') {
            return pests;
        }
        return 'Genel Haşere ve Kemirgen';
    };

    const buildContractContent = (prop: Proposal, settings: CompanySettings | null, contractNo: string) => {
        return generateContractHtml({
            proposal: {
                company_name: prop.company_name,
                contact_person: prop.contact_person,
                recipient_email: prop.recipient_email,
                total_amount: prop.total_amount,
                discount_amount: prop.discount_amount,
                application_area: prop.application_area,
                customer_notes: prop.customer_notes,
                included_pests: prop.included_pests,
                proposal_items: prop.proposal_items.map(item => ({
                    service_name: item.service_name,
                    service_description: item.service_description,
                    visit_count: item.visit_count,
                    unit_price: item.unit_price,
                    unit_type: item.unit_type,
                    item_type: item.item_type,
                })),
            },
            settings: settings ? {
                company_name: settings.company_name,
                logo_url: settings.logo_url,
                address: settings.address,
                email: settings.email,
                phone: settings.phone,
                website: settings.website,
            } : null,
            contractNumber: contractNo,
        });
    };

    const handleApproveOnly = async () => {
        if (!proposal) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('proposals')
                .update({ status: 'approved', customer_notes: notes })
                .eq('id', proposal.id);
            if (error) throw error;
            setProposal(prev => prev ? { ...prev, status: 'approved', customer_notes: notes } : null);
            toast.success("Teklif başarıyla onaylandı.");
        } catch (err) {
            toast.error("İşlem başarısız.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApproveAndCreateContract = async () => {
        if (!proposal) return;
        setIsSubmitting(true);
        try {
            const currentYear = new Date().getFullYear();
            const { count } = await supabase
                .from('service_contracts')
                .select('*', { count: 'exact', head: true });
            
            const nextSequence = 100 + (count || 0) + 1;
            const contractNumber = `${currentYear}-${nextSequence}`;

            const { error: updateError } = await supabase
                .from('proposals')
                .update({ status: 'approved', customer_notes: notes })
                .eq('id', proposal.id);
            
            if (updateError) throw updateError;

            const pestsString = getPestsString(proposal.included_pests);

            const content = buildContractContent(proposal, companySettings, contractNumber);

            const { error: contractError } = await supabase
                .from('service_contracts')
                .insert({
                    proposal_id: proposal.id,
                    contract_number: contractNumber,
                    company_name: proposal.company_name,
                    contact_person: proposal.contact_person,
                    start_date: new Date(),
                    end_date: addYears(new Date(), 1),
                    contract_amount: proposal.total_amount,
                    content: content,
                    status: 'active',
                    pest_types: pestsString, 
                    application_area: proposal.application_area || ''
                });

            if (contractError) throw contractError;

            setProposal(prev => prev ? { ...prev, status: 'approved', customer_notes: notes } : null);
            setContractHtml(content);
            setSavedContractNumber(contractNumber);
            setShowContractModal(true);
            toast.success(`Hizmet Sözleşmesi (${contractNumber}) oluşturuldu.`);

        } catch (err: any) {
            toast.error("Hata: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateStatus = async (newStatus: 'rejected') => {
        if (!proposal) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('proposals').update({ status: newStatus, customer_notes: notes }).eq('id', proposal.id);
            if (error) throw error;
            setProposal(prev => prev ? { ...prev, status: newStatus, customer_notes: notes } : null);
            toast.success("Teklif reddedildi.");
        } catch (err) {
            toast.error("İşlem başarısız.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!isAuthenticated) {
        return (
            <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-100">
                    <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <KeyRound className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Teklif Erişimi</h2>
                    <p className="mt-2 text-sm text-gray-500">Lütfen size iletilen 6 haneli erişim kodunu giriniz.</p>
                    <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-4">
                        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={6} className="w-full p-4 border border-gray-300 rounded-xl text-center text-3xl tracking-[12px] font-mono focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none" placeholder="••••••" />
                        <button type="submit" disabled={isVerifying} className="w-full flex items-center justify-center gap-2 p-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-70 shadow-lg shadow-blue-200">
                            {isVerifying ? <Loader className="animate-spin" /> : 'Görüntüle'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    
    if (!proposal) return null;

    const primaryColor = '#15803d'; 
    const lightBorder = '#e5e7eb';
    
    const totalAmount = proposal.total_amount || 0;
    const discountAmount = proposal.discount_amount || 0;
    const grandTotal = totalAmount + (totalAmount * 0.20); 

    return (
        <div className="bg-gray-100 min-h-screen font-sans pb-10">
            {/* ÜST BAR */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden shadow-sm">
                <div className="max-w-[794px] mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-700 font-bold">T</div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-800">Teklif Detayı</h2>
                            <p className="text-[10px] text-gray-500">#{proposal.proposal_number}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-xs font-medium text-gray-700">
                            <Printer size={16} /> Yazdır
                        </button>
                        <button onClick={handleDownloadProposalPdf} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
                            <FileDown size={16} /> İndir
                        </button>
                    </div>
                </div>
            </div>
            
            {/* KAĞIT (TEKLİF DETAYI) */}
            <div className="py-8 px-4 print:p-0 flex justify-center overflow-x-auto">
                {/* GÜNCELLEME: PIXEL PERFECT YAKLAŞIMI
                   - Width: 794px (A4'ün web standardındaki piksel karşılığı)
                   - Height: auto (İçerik uzayabilir, PDF bunu bölecektir)
                   - minHeight: 1123px (En az 1 sayfa dolu görünsün)
                   - Margin: 0 auto (Ortala)
                   - mm birimi tamamen kaldırıldı, px kullanıldı.
                */}
                <div 
                    ref={proposalRef} 
                    className="bg-white shadow-xl print:shadow-none relative flex flex-col flex-shrink-0" 
                    style={{ 
                        width: '794px', 
                        minHeight: '1123px', 
                        margin: '0 auto', 
                        backgroundColor: 'white',
                        boxSizing: 'border-box'
                    }}
                >
                    
                    {/* HEADER */}
                    <div style={{ height: '8px', width: '100%', backgroundColor: primaryColor }}></div>
                    <div style={{ padding: '40px 50px', flexGrow: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                            <div>
                                <img src={companySettings?.logo_url || "https://i.imgur.com/PajSpus.png"} alt="Logo" style={{ height: '60px', objectFit: 'contain', marginBottom: '10px' }} />
                                <div style={{ fontSize: '10px', color: '#4b5563', lineHeight: '1.4' }}>
                                    <strong>{companySettings?.company_name}</strong><br/>
                                    {companySettings?.address}<br/>
                                    {companySettings?.email} | {companySettings?.phone}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h1 style={{ fontSize: '24px', fontWeight: '800', color: primaryColor, margin: 0 }}>HİZMET & ÜRÜN FİYAT TEKLİFİ</h1>
                                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', letterSpacing: '1px' }}>HİZMET & ÜRÜN DETAYLARI</p>
                                <div style={{ marginTop: '10px', display: 'inline-block', padding: '4px 12px', borderRadius: '12px', backgroundColor: proposal.status === 'approved' ? '#dcfce7' : proposal.status === 'rejected' ? '#fee2e2' : '#fef9c3', color: proposal.status === 'approved' ? '#166534' : proposal.status === 'rejected' ? '#991b1b' : '#854d0e', fontSize: '11px', fontWeight: 'bold' }}>
                                    {proposal.status === 'approved' ? 'ONAYLANDI' : proposal.status === 'rejected' ? 'REDDEDİLDİ' : 'BEKLEMEDE'}
                                </div>
                            </div>
                        </div>

                        {/* ALICI BİLGİLERİ */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: `1px solid ${lightBorder}` }}>
                            <div style={{ width: '60%' }}>
                                <p style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>SAYIN / FİRMA</p>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: '0 0 2px 0' }}>{proposal.company_name}</h3>
                                <p style={{ fontSize: '12px', color: '#64748b' }}>{proposal.contact_person}</p>
                            </div>
                            <div style={{ width: '35%', textAlign: 'right' }}>
                                <div style={{ marginBottom: '10px' }}>
                                    <p style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>TARİH</p>
                                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{format(new Date(proposal.created_at), 'dd MMMM yyyy', { locale: tr })}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>TEKLİF NO</p>
                                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>#{proposal.proposal_number}</p>
                                </div>
                            </div>
                        </div>

                        {/* HEDEF ZARARLILAR */}
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: '700', color: primaryColor, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: `1px solid ${lightBorder}`, paddingBottom: '5px' }}>
                                <Bug size={12} /> HEDEF ZARARLILAR
                            </h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {PEST_TYPES.map((pest, i) => {
                                    const isActive = Array.isArray(proposal.included_pests) && proposal.included_pests.includes(pest);
                                    return (
                                        <div key={i} style={{
                                            fontSize: '10px', padding: '4px 10px', borderRadius: '4px',
                                            backgroundColor: isActive ? '#f0fdf4' : '#f9fafb',
                                            color: isActive ? '#15803d' : '#9ca3af',
                                            border: `1px solid ${isActive ? '#bbf7d0' : '#e5e7eb'}`,
                                            fontWeight: isActive ? 'bold' : 'normal',
                                            textDecoration: isActive ? 'none' : 'line-through',
                                            opacity: isActive ? 1 : 0.6,
                                            display: 'flex', alignItems: 'center', gap: '4px'
                                        }}>
                                            {isActive ? <Check size={10}/> : <X size={10}/>} {pest}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* UYGULAMA KAPSAMI */}
                        <div style={{ marginBottom: '30px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: `1px solid ${lightBorder}`, paddingBottom: '5px' }}>
                                <Shield size={12} /> UYGULAMA KAPSAMI
                            </h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {(() => {
                                    const activeScopes = proposal.application_area
                                        ? proposal.application_area.split(',').map(s => s.trim())
                                        : [];
                                    return SCOPE_AREAS.map((scope, i) => {
                                        const isActive = activeScopes.some(s => s.toLowerCase() === scope.toLowerCase());
                                        return (
                                            <div key={i} style={{
                                                fontSize: '10px', padding: '4px 10px', borderRadius: '4px',
                                                backgroundColor: isActive ? '#eff6ff' : '#f9fafb',
                                                color: isActive ? '#1d4ed8' : '#9ca3af',
                                                border: `1px solid ${isActive ? '#93c5fd' : '#e5e7eb'}`,
                                                fontWeight: isActive ? 'bold' : 'normal',
                                                opacity: isActive ? 1 : 0.5,
                                                display: 'flex', alignItems: 'center', gap: '4px'
                                            }}>
                                                {isActive ? <Check size={10}/> : <X size={10}/>} {scope}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        {/* TABLO */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                            <thead>
                                <tr style={{ borderBottom: `2px solid ${primaryColor}` }}>
                                    <th style={{ padding: '10px 0', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: primaryColor, textTransform: 'uppercase' }}>AÇIKLAMA</th>
                                    <th style={{ padding: '10px 0', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: primaryColor, textTransform: 'uppercase', width: '20%' }}>MİKTAR/KAPSAM</th>
                                    <th style={{ padding: '10px 0', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: primaryColor, textTransform: 'uppercase', width: '25%' }}>BİRİM FİYAT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proposal.proposal_items.map((item, index) => {
                                    const isProduct = item.item_type === 'product';
                                    let unitText = '';
                                    if(isProduct) unitText = `${item.visit_count} ${item.unit_type || 'Adet'}`;
                                    else unitText = item.unit_type === 'seferlik' ? 'Tek Sefer' : `${item.visit_count} Ziyaret / Ay`;

                                    const itemPrice = item.unit_price || 0;

                                    return (
                                        <tr key={index} style={{ borderBottom: `1px solid ${lightBorder}` }}>
                                            <td style={{ padding: '15px 0', verticalAlign: 'top' }}>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    {item.image_url ? (
                                                        <img src={item.image_url} style={{ width: '45px', height: '45px', borderRadius: '4px', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '45px', height: '45px', borderRadius: '4px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {isProduct ? <Package size={20} color="#9ca3af"/> : <Shield size={20} color="#9ca3af"/>}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                                                            {item.service_name} 
                                                            {isProduct && <span style={{fontSize:'9px', backgroundColor:'#eff6ff', color:'#1e40af', padding:'2px 6px', borderRadius:'4px', marginLeft:'6px'}}>ÜRÜN</span>}
                                                        </p>
                                                        <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0 0', lineHeight: '1.3' }}>{item.service_description}</p>
                                                        {item.explanation && <p style={{ fontSize: '10px', color: '#4f46e5', marginTop: '4px', fontStyle: 'italic' }}>* {item.explanation}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px 0', textAlign: 'center', verticalAlign: 'top', fontSize: '11px', fontWeight: '500', color: '#374151' }}>
                                                {unitText}
                                            </td>
                                            <td style={{ padding: '15px 0', textAlign: 'right', verticalAlign: 'top', fontSize: '13px', fontWeight: '700', color: '#1f2937' }}>
                                                {itemPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* TOPLAM ALANI */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
                            <div style={{ width: '250px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', border: `1px solid ${lightBorder}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>Ara Toplam</span>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{totalAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#ef4444' }}>
                                        <span style={{ fontSize: '11px' }}>İskonto</span>
                                        <span style={{ fontSize: '12px', fontWeight: '600' }}>-{discountAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: `1px solid ${lightBorder}` }}>
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>KDV (%20)</span>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{(totalAmount * 0.20).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '800', color: primaryColor }}>GENEL TOPLAM</span>
                                    <span style={{ fontSize: '18px', fontWeight: '800', color: primaryColor }}>{grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM AREA */}
                        <div style={{ borderTop: `1px solid ${lightBorder}`, paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                           <div style={{ width: '60%' }}>
                               <p style={{ fontSize: '10px', color: '#6b7280', lineHeight: '1.5' }}>
                                   {companySettings?.footer_text || "Bu teklif 15 gün süreyle geçerlidir. Onay için imzalamanız yeterlidir."}
                               </p>
                           </div>
                           <div style={{ textAlign: 'center' }}>
                               <div style={{ height: '60px', width: '120px', borderBottom: '1px dashed #cbd5e1', marginBottom: '8px' }}></div>
                               <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569' }}>Kaşe / İmza</p>
                           </div>
                        </div>

                    </div>
                    {/* FOOTER STRIP */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '10px 50px', borderTop: `1px solid ${lightBorder}`, fontSize: '8px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{companySettings?.website}</span>
                        <span>Sayfa 1 / 1</span>
                    </div>
                </div>
                
                {/* ONAY BUTONLARI */}
                {proposal.status === 'pending' && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-2xl flex justify-center gap-4 print:hidden z-50">
                        <div className="flex flex-col md:flex-row items-center gap-4 max-w-2xl w-full">
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Varsa notunuzu buraya yazabilirsiniz..." className="flex-grow p-2 border rounded-lg text-sm w-full md:w-auto" rows={1} />
                            <div className="flex gap-2 w-full md:w-auto">
                                {proposal.contract_available ? (
                                    <button onClick={handleApproveAndCreateContract} disabled={isSubmitting} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 text-sm whitespace-nowrap">
                                        {isSubmitting ? <Loader className="animate-spin size-4"/> : <FileSignature size={18} />} Onayla ve Sözleşme Hazırla
                                    </button>
                                ) : (
                                    <button onClick={handleApproveOnly} disabled={isSubmitting} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 text-sm whitespace-nowrap">
                                        {isSubmitting ? <Loader className="animate-spin size-4"/> : <Check size={18} />} Teklifi Onayla
                                    </button>
                                )}
                                <button onClick={() => handleUpdateStatus('rejected')} disabled={isSubmitting} className="flex-1 md:flex-none bg-white border border-red-200 text-red-600 hover:bg-red-50 px-6 py-2 rounded-lg font-bold shadow flex items-center justify-center gap-2 text-sm">
                                    <X size={18} /> Reddet
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SÖZLEŞME MODALI */}
            {showContractModal && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-5xl p-6 shadow-2xl flex flex-col max-h-[95vh]">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                                <FileText className="text-green-700" /> Hizmet Sozlesmesi Olusturuldu
                            </h2>
                            <button onClick={() => setShowContractModal(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="flex-grow overflow-y-auto bg-gray-100 p-4 md:p-8 rounded-lg border mb-4">
                            <div ref={contractRef} className="bg-white shadow-xl mx-auto" style={{ maxWidth: '210mm' }} dangerouslySetInnerHTML={{ __html: contractHtml }} />
                        </div>
                        <div className="flex justify-end gap-3 pt-2 border-t">
                            <button onClick={() => setShowContractModal(false)} className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Kapat</button>
                            <button onClick={handlePrintContract} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 flex items-center gap-2 text-sm">
                                <Printer size={16} /> Yazdir
                            </button>
                            <button onClick={handleDownloadContractPdf} className="px-5 py-2.5 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 flex items-center gap-2 text-sm shadow-lg shadow-green-200">
                                <FileDown size={16} /> PDF Indir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeklifGoruntule;