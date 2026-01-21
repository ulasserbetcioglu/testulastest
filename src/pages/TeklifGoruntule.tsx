import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 as Loader, FileDown, Check, X, KeyRound, Printer, Shield, Info, Bug, CalendarCheck, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

// --- ARAYÜZLER (INTERFACES) ---
interface ProposalItem {
    service_name: string;
    service_description: string;
    image_url: string;
    visit_count: number;
    unit_price: number;
    explanation: string;
    unit_type: 'aylik' | 'seferlik';
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
}

interface CompanySettings {
    company_name: string;
    logo_url: string;
    address: string;
    email: string;
    phone: string;
    footer_text: string;
    about_text?: string; // Yeni: Hakkımızda metni
}

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
                 const { data: settingsData } = await supabase
                     .from('company_settings')
                     .select('*')
                     .single();
                 setCompanySettings(settingsData);
             } catch (err: any) {
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
                .select('*, proposal_items(*, unit_type)')
                .eq('id', id)
                .eq('access_password', password)
                .single();

            if (error) {
                if (error.code === 'PGRST116') { 
                    throw new Error("Geçersiz şifre veya teklif bulunamadı.");
                }
                throw error;
            }
            
            setProposal(data as Proposal);
            setNotes(data.customer_notes || '');
            setIsAuthenticated(true);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleDownloadPdf = () => {
        if (!proposalRef.current || !(window as any).html2pdf) {
            toast.error("PDF oluşturucu henüz hazır değil.");
            return;
        }
        
        const element = proposalRef.current;
        const options = {
            margin:       0,
            filename:     `Teklif_${proposal?.proposal_number || 'Belge'}.pdf`,
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
            toast.success(`Teklif başarıyla "${newStatus === 'approved' ? 'Onaylandı' : 'Reddedildi'}" olarak işaretlendi.`);
        } catch (err: any) {
            toast.error("Durum güncellenirken bir hata oluştu.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const StatusBadge = ({ status }: { status: Proposal['status'] }) => {
        const statusMap = {
            pending: { text: 'Beklemede', color: '#f59e0b', bg: '#fef3c7' },
            approved: { text: 'Onaylandı', color: '#10b981', bg: '#d1fae5' },
            rejected: { text: 'Reddedildi', color: '#ef4444', bg: '#fee2e2' },
        };
        const current = statusMap[status] || statusMap.pending;
        
        return (
            <span style={{ 
                padding: '6px 12px', 
                fontSize: '12px', 
                fontWeight: '600', 
                borderRadius: '9999px', 
                backgroundColor: current.bg, 
                color: current.color,
                display: 'inline-block',
                marginTop: '5px'
            }}>
                {current.text}
            </span>
        );
    };

    if (!isAuthenticated) {
        return (
            <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-100">
                        <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <KeyRound className="h-8 w-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Teklif Erişimi</h2>
                        <p className="mt-2 text-sm text-gray-500">Lütfen size iletilen 6 haneli erişim kodunu giriniz.</p>
                        <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-4">
                            <input
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                maxLength={6}
                                className="w-full p-4 border border-gray-300 rounded-xl text-center text-3xl tracking-[12px] font-mono focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                placeholder="••••••"
                            />
                            <button type="submit" disabled={isVerifying} className="w-full flex items-center justify-center gap-2 p-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-70 transition-all shadow-lg shadow-blue-200">
                                {isVerifying ? <Loader className="animate-spin" /> : 'Görüntüle'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
    
    if (loading || !proposal) return <div className="flex items-center justify-center h-screen bg-gray-50"><Loader className="w-10 h-10 animate-spin text-blue-600" /></div>;
    if (error) return <div className="flex items-center justify-center h-screen text-red-600 bg-gray-50">{error}</div>;

    const primaryColor = '#629e48';
    const secondaryColor = '#acf010';
    const grayText = '#4b5563';
    const lightBorder = '#e5e7eb';

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            
            {/* ÜST BAR */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
                <div className="max-w-[210mm] mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-700 font-bold">T</div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-800">Teklif Detayı</h2>
                            <p className="text-[10px] text-gray-500">#{proposal.proposal_number}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-xs font-medium">
                            <Printer size={16} /> Yazdır
                        </button>
                        <button onClick={handleDownloadPdf} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-xs font-medium">
                            <FileDown size={16} /> İndir
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="py-8 px-4 print:p-0">
                {/* TEKLİF KAĞIDI */}
                <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:w-full rounded-sm overflow-hidden" style={{ minHeight: '297mm' }}>
                    <div ref={proposalRef} className="relative w-full h-full flex flex-col bg-white">
                        
                        {/* 1. HEADER STRIP */}
                        <div style={{ height: '12px', width: '100%', backgroundColor: primaryColor }}></div>

                        <div style={{ padding: '40px 50px' }}>
                            
                            {/* 2. LOGO & BAŞLIK */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                                <div>
                                    <img src={companySettings?.logo_url || "https://i.imgur.com/PajSpus.png"} alt="Logo" style={{ height: '50px', objectFit: 'contain', marginBottom: '10px' }} />
                                    <div style={{ fontSize: '10px', color: grayText, lineHeight: '1.4' }}>
                                        <strong>{companySettings?.company_name}</strong><br/>
                                        {companySettings?.address}<br/>
                                        {companySettings?.email} | {companySettings?.phone}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: primaryColor, letterSpacing: '-0.5px', margin: 0 }}>HİZMET TEKLİFİ</h1>
                                    <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px', letterSpacing: '1px' }}>#{proposal.proposal_number}</p>
                                    <div style={{ marginTop: '8px' }}>
                                        <StatusBadge status={proposal.status} />
                                    </div>
                                </div>
                            </div>

                            {/* 3. ALICI BİLGİLERİ */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: `1px solid ${lightBorder}` }}>
                                <div style={{ width: '60%' }}>
                                    <p style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px' }}>SAYIN / FİRMA</p>
                                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>{proposal.company_name}</h3>
                                    <p style={{ fontSize: '12px', color: '#374151' }}>{proposal.contact_person}</p>
                                </div>
                                <div style={{ width: '35%', textAlign: 'right' }}>
                                    <p style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>TARİH</p>
                                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>{format(new Date(proposal.created_at), 'dd MMMM yyyy', { locale: tr })}</p>
                                    <p style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>GEÇERLİLİK</p>
                                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>15 Gün</p>
                                </div>
                            </div>

                            {/* 4. HİZMET TABLOSU */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                                <thead>
                                    <tr style={{ borderBottom: `2px solid ${primaryColor}` }}>
                                        <th style={{ padding: '10px 0', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: primaryColor, textTransform: 'uppercase', width: '55%' }}>HİZMET DETAYI</th>
                                        <th style={{ padding: '10px 0', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: primaryColor, textTransform: 'uppercase', width: '15%' }}>MİKTAR</th>
                                        <th style={{ padding: '10px 0', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: primaryColor, textTransform: 'uppercase', width: '30%' }}>FİYAT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {proposal.proposal_items.map((item, index) => (
                                        <tr key={index} style={{ borderBottom: `1px solid ${lightBorder}` }}>
                                            <td style={{ padding: '14px 0', verticalAlign: 'top' }}>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    {item.image_url && (
                                                        <img src={item.image_url} alt="Hizmet" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', border: `1px solid ${lightBorder}` }} />
                                                    )}
                                                    <div>
                                                        <p style={{ fontSize: '12px', fontWeight: '700', color: '#1f2937', margin: '0 0 2px 0' }}>{item.service_name}</p>
                                                        <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, lineHeight: '1.4' }}>{item.service_description}</p>
                                                        {item.explanation && <p style={{ fontSize: '9px', color: secondaryColor, marginTop: '2px', fontStyle: 'italic' }}>* {item.explanation}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 0', textAlign: 'center', verticalAlign: 'top', fontSize: '11px', color: '#374151' }}>
                                                {item.unit_type === 'seferlik' ? 'Tek Sefer' : `${item.visit_count} Ziyaret/Ay`}
                                            </td>
                                            <td style={{ padding: '14px 0', textAlign: 'right', verticalAlign: 'top', fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>
                                                {item.unit_price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* 5. TOPLAM ALANI */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
                                <div style={{ width: '220px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '11px', color: '#6b7280' }}>Ara Toplam</span>
                                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#374151' }}>{proposal.total_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: `1px solid ${lightBorder}` }}>
                                        <span style={{ fontSize: '11px', color: '#6b7280' }}>KDV (%20)</span>
                                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#374151' }}>{(proposal.total_amount * 0.20).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: primaryColor }}>GENEL TOPLAM</span>
                                        <span style={{ fontSize: '16px', fontWeight: '800', color: primaryColor }}>{(proposal.total_amount * 1.20).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 6. FİRMA BİLGİLERİ & GARANTİLER (YENİ BÖLÜM) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                                
                                {/* Sol: Hakkımızda */}
                                <div style={{ padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px', border: `1px solid ${lightBorder}` }}>
                                    <h4 style={{ fontSize: '11px', fontWeight: '700', color: primaryColor, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Info size={12} /> HAKKIMIZDA
                                    </h4>
                                    <p style={{ fontSize: '10px', color: '#4b5563', lineHeight: '1.5' }}>
                                        {companySettings?.about_text || 'Sistem İlaçlama San.Tic.Ltd.Şti. olarak 1992 yılından beri sektörde öncü konumdayız. Sağlık Bakanlığı onaylı ürünlerimiz ve uzman kadromuzla %100 müşteri memnuniyeti odaklı çalışıyoruz.'}
                                    </p>
                                </div>

                                {/* Sağ: Hizmet Kalitesi */}
                                <div style={{ padding: '15px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                    <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Shield size={12} /> GARANTİMİZ
                                    </h4>
                                    <ul style={{ fontSize: '10px', color: '#1e3a8a', paddingLeft: '12px', lineHeight: '1.5', listStyleType: 'disc' }}>
                                        <li>Sağlık Bakanlığı onaylı biyosidal ürünler.</li>
                                        <li>Kokusuz, leke bırakmayan uygulama.</li>
                                        <li>İşlem sonrası ücretsiz kontrol garantisi.</li>
                                        <li>7/24 teknik destek ve danışmanlık.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* 7. HEDEF ZARARLILAR (YENİ BÖLÜM) */}
                            <div style={{ marginBottom: '30px' }}>
                                <h4 style={{ fontSize: '11px', fontWeight: '700', color: primaryColor, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: `1px solid ${lightBorder}`, paddingBottom: '5px' }}>
                                    <Bug size={12} /> HEDEF ZARARLILAR
                                </h4>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {['Hamam Böceği', 'Kemirgen', 'Karınca', 'Sinek', 'Gümüşçün'].map((pest, i) => (
                                        <span key={i} style={{ fontSize: '9px', padding: '4px 8px', backgroundColor: '#f3f4f6', borderRadius: '4px', color: '#374151', border: `1px solid ${lightBorder}` }}>
                                            {pest}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* 8. FOOTER */}
                            <div style={{ paddingTop: '15px', borderTop: `1px solid ${lightBorder}`, textAlign: 'center', color: '#9ca3af', fontSize: '9px' }}>
                                <p style={{ fontStyle: 'italic', marginBottom: '4px' }}>
                                    {companySettings?.footer_text || 'Bu teklif bilgisayar ortamında oluşturulmuştur. Onaylanması durumunda sözleşme yerine geçer.'}
                                </p>
                                <p>Sayfa 1 / 1</p>
                            </div>

                        </div>
                        
                        {/* Alt Şerit */}
                        <div style={{ marginTop: 'auto', height: '8px', width: '100%', backgroundColor: '#f3f4f6', borderTop: `1px solid ${lightBorder}` }}></div>
                    </div>
                </div>

                {/* AKSİYON KARTI (ONAY/RED) - Print'te Gizli */}
                {proposal.status === 'pending' && (
                    <div className="max-w-[210mm] mx-auto mt-6 bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-600 print:hidden">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Teklifi Nasıl Buldunuz?</h3>
                                <p className="text-sm text-gray-600 mb-4">Bu teklifi onaylayarak süreci hemen başlatabilir veya revize talebinde bulunabilirsiniz.</p>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={2}
                                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Varsa notlarınızı buraya ekleyebilirsiniz..."
                                />
                            </div>
                            <div className="flex flex-col gap-3 justify-center min-w-[200px]">
                                <button
                                    onClick={() => handleUpdateStatus('approved')}
                                    disabled={isSubmitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {isSubmitting ? <Loader className="animate-spin size-4" /> : <Check size={18} />} Teklifi Onayla
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus('rejected')}
                                    disabled={isSubmitting}
                                    className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    <X size={18} /> Reddet
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Müşteri Notu Gösterimi */}
                {proposal.status !== 'pending' && proposal.customer_notes && (
                    <div className="max-w-[210mm] mx-auto mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 print:hidden">
                        <strong>Sizin Notunuz:</strong> {proposal.customer_notes}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeklifGoruntule;