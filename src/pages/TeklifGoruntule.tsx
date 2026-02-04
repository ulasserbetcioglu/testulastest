import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 as Loader, FileDown, Check, X, KeyRound, Printer, Shield, Info, Bug, Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

// --- ARAYÜZLER ---
interface ProposalItem {
    service_name: string;
    service_description: string;
    image_url: string;
    visit_count: number;
    unit_price: number;
    explanation: string;
    unit_type: 'aylik' | 'seferlik' | 'adet';
    item_type?: 'service' | 'product'; // Yeni alan
}

interface Proposal {
    id: string;
    created_at: string;
    proposal_number: string;
    company_name: string;
    contact_person: string;
    total_amount: number;
    proposal_items: ProposalItem[];
    status: 'pending' | 'approved' | 'rejected';
    customer_notes: string | null;
    included_pests: string[] | null;
}

interface CompanySettings {
    company_name: string;
    logo_url: string;
    address: string;
    email: string;
    phone: string;
    footer_text: string;
    about_text?: string;
}

const PEST_TYPES = [
  'Hamam Böceği', 'Kemirgen', 'Karınca', 'Sinek', 'Güve', 'Örümcek', 'Gümüşçün', 'Pire', 'Kene', 'Tahtakurusu', 'Akrep'
];

const TeklifGoruntule: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const proposalRef = useRef<HTMLDivElement>(null);
    
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleDownloadPdf = () => {
        if (!proposalRef.current || !(window as any).html2pdf) {
            toast.error("PDF oluşturucu hazır değil.");
            return;
        }
        
        const element = proposalRef.current;
        const options = {
            margin:       0,
            filename:     `Teklif_${proposal?.proposal_number}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        (window as any).html2pdf().set(options).from(element).save();
    };

    const handleUpdateStatus = async (newStatus: 'approved' | 'rejected') => {
        if (!proposal) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('proposals')
                .update({ status: newStatus, customer_notes: notes })
                .eq('id', proposal.id);
            if (error) throw error;
            setProposal(prev => prev ? { ...prev, status: newStatus, customer_notes: notes } : null);
            toast.success(`Teklif ${newStatus === 'approved' ? 'onaylandı' : 'reddedildi'}.`);
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

    const primaryColor = '#15803d'; // Green-700
    const lightBorder = '#e5e7eb';

    return (
        <div className="bg-gray-100 min-h-screen font-sans pb-10">
            {/* ÜST BAR */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden shadow-sm">
                <div className="max-w-[210mm] mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
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
                        <button onClick={handleDownloadPdf} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
                            <FileDown size={16} /> İndir
                        </button>
                    </div>
                </div>
            </div>
            
            {/* KAĞIT */}
            <div className="py-8 px-4 print:p-0 flex justify-center">
                <div ref={proposalRef} className="bg-white shadow-xl print:shadow-none relative flex flex-col" style={{ width: '210mm', minHeight: '297mm' }}>
                    
                    {/* 1. HEADER */}
                    <div style={{ height: '8px', width: '100%', backgroundColor: primaryColor }}></div>
                    <div style={{ padding: '40px 50px', flexGrow: 1 }}>
                        
                        {/* 2. LOGO & BAŞLIK */}
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
                                <h1 style={{ fontSize: '24px', fontWeight: '800', color: primaryColor, margin: 0 }}>FİYAT TEKLİFİ SUNULUR</h1>
                                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px', letterSpacing: '1px' }}>HİZMET & ÜRÜN DETAYLARI</p>
                                <div style={{ marginTop: '10px', display: 'inline-block', padding: '4px 12px', borderRadius: '12px', backgroundColor: proposal.status === 'approved' ? '#dcfce7' : proposal.status === 'rejected' ? '#fee2e2' : '#fef9c3', color: proposal.status === 'approved' ? '#166534' : proposal.status === 'rejected' ? '#991b1b' : '#854d0e', fontSize: '11px', fontWeight: 'bold' }}>
                                    {proposal.status === 'approved' ? 'ONAYLANDI' : proposal.status === 'rejected' ? 'REDDEDİLDİ' : 'BEKLEMEDE'}
                                </div>
                            </div>
                        </div>

                        {/* 3. ALICI BİLGİLERİ */}
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

                        {/* 4. HEDEF ZARARLILAR (DAHİL OLANLAR RENKLİ, OLMAYANLAR GRİ) */}
                        <div style={{ marginBottom: '30px' }}>
                            <h4 style={{ fontSize: '11px', fontWeight: '700', color: primaryColor, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: `1px solid ${lightBorder}`, paddingBottom: '5px' }}>
                                <Bug size={12} /> HEDEF ZARARLILAR KAPSAMI
                            </h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {PEST_TYPES.map((pest, i) => {
                                    const isActive = proposal.included_pests?.includes(pest);
                                    return (
                                        <div key={i} style={{ 
                                            fontSize: '10px', padding: '4px 10px', borderRadius: '4px', 
                                            backgroundColor: isActive ? '#f0fdf4' : '#f9fafb', 
                                            color: isActive ? '#15803d' : '#9ca3af', 
                                            border: `1px solid ${isActive ? '#bbf7d0' : '#e5e7eb'}`,
                                            fontWeight: isActive ? 'bold' : 'normal',
                                            textDecoration: isActive ? 'none' : 'line-through', // Çizili yapabiliriz
                                            opacity: isActive ? 1 : 0.6,
                                            display: 'flex', alignItems: 'center', gap: '4px'
                                        }}>
                                            {isActive ? <Check size={10}/> : <X size={10}/>} {pest}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 5. HİZMET VE ÜRÜN TABLOSU */}
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
                                    if(isProduct) unitText = `${item.visit_count} Adet`;
                                    else unitText = item.unit_type === 'seferlik' ? 'Tek Seferlik' : `${item.visit_count} Ziyaret / Ay`;

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
                                                {item.unit_price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* 6. TOPLAM ALANI */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
                            <div style={{ width: '250px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', border: `1px solid ${lightBorder}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>Ara Toplam</span>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{proposal.total_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: `1px solid ${lightBorder}` }}>
                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>KDV (%20)</span>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{(proposal.total_amount * 0.20).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '800', color: primaryColor }}>GENEL TOPLAM</span>
                                    <span style={{ fontSize: '18px', fontWeight: '800', color: primaryColor }}>{(proposal.total_amount * 1.20).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                            </div>
                        </div>

                        {/* 7. HAKKIMIZDA & BİLGİ */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '30px' }}>
                            <div style={{ padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#166534', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Info size={12} /> FİRMA HAKKINDA
                                </h4>
                                <p style={{ fontSize: '10px', color: '#14532d', lineHeight: '1.5' }}>
                                    {companySettings?.about_text || 'Sektörün öncü firması olarak, en son teknoloji ve Sağlık Bakanlığı onaylı ürünlerle %100 müşteri memnuniyeti odaklı hizmet sunuyoruz. Uzman kadromuzla yanınızdayız.'}
                                </p>
                            </div>
                            <div style={{ padding: '15px', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                                <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#9a3412', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Calendar size={12} /> HİZMET GARANTİSİ
                                </h4>
                                <p style={{ fontSize: '10px', color: '#7c2d12', lineHeight: '1.5' }}>
                                    Tüm hizmetlerimiz garanti kapsamındadır. Memnun kalmadığınız durumlarda ücretsiz tekrar uygulama yapılmaktadır.
                                </p>
                            </div>
                        </div>

                    </div>
                    
                    {/* 8. FOOTER */}
                    <div style={{ padding: '0 50px 25px 50px', textAlign: 'center', color: '#9ca3af', fontSize: '9px', flexShrink: 0 }}>
                        <div style={{ borderTop: `1px solid ${lightBorder}`, paddingTop: '15px' }}>
                            <p style={{ fontStyle: 'italic' }}>
                                {companySettings?.footer_text || 'Bu teklif bilgisayar ortamında oluşturulmuştur. Onaylanması durumunda sözleşme yerine geçer.'}
                            </p>
                        </div>
                    </div>
                    <div style={{ height: '8px', width: '100%', backgroundColor: '#f1f5f9', borderTop: `1px solid ${lightBorder}` }}></div>
                </div>

                {/* ONAY BUTONLARI (Sadece Beklemedeyse) */}
                {proposal.status === 'pending' && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-2xl flex justify-center gap-4 print:hidden z-50">
                        <div className="flex flex-col md:flex-row items-center gap-4 max-w-2xl w-full">
                            <textarea 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)} 
                                placeholder="Varsa notunuzu buraya yazabilirsiniz..." 
                                className="flex-grow p-2 border rounded-lg text-sm w-full md:w-auto" 
                                rows={1}
                            />
                            <div className="flex gap-2 w-full md:w-auto">
                                <button onClick={() => handleUpdateStatus('approved')} disabled={isSubmitting} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2">
                                    {isSubmitting ? <Loader className="animate-spin size-4"/> : <Check size={18} />} Onayla
                                </button>
                                <button onClick={() => handleUpdateStatus('rejected')} disabled={isSubmitting} className="flex-1 md:flex-none bg-white border border-red-200 text-red-600 hover:bg-red-50 px-6 py-2 rounded-lg font-bold shadow flex items-center justify-center gap-2">
                                    <X size={18} /> Reddet
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeklifGoruntule;