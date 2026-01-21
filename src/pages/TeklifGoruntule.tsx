import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 as Loader, FileDown, Check, X, KeyRound, Printer } from 'lucide-react';
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
                 console.warn("Şirket ayarları yüklenemedi, varsayılan bilgiler kullanılacak.");
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
            toast.error("PDF oluşturucu henüz hazır değil. Lütfen birkaç saniye sonra tekrar deneyin.");
            return;
        }
        
        const element = proposalRef.current;
        const options = {
            margin:       0, // Sıfır marj, tasarımı tam kağıda yayar
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
            pending: { text: 'Beklemede', color: '#f59e0b', bg: '#fef3c7' }, // Amber
            approved: { text: 'Onaylandı', color: '#10b981', bg: '#d1fae5' }, // Emerald
            rejected: { text: 'Reddedildi', color: '#ef4444', bg: '#fee2e2' }, // Red
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
            <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-100">
                        <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <KeyRound className="h-8 w-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Güvenli Teklif Erişimi</h2>
                        <p className="mt-2 text-sm text-gray-500">Bu teklifi görüntülemek için lütfen size iletilen 6 haneli erişim kodunu giriniz.</p>
                        <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-4">
                            <input
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                maxLength={6}
                                className="w-full p-4 border border-gray-300 rounded-xl text-center text-3xl tracking-[12px] font-mono focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                placeholder="••••••"
                            />
                            <button 
                                type="submit"
                                disabled={isVerifying}
                                className="w-full flex items-center justify-center gap-2 p-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-70 transition-all shadow-lg shadow-blue-200"
                            >
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

    // --- PDF STYLE CONSTANTS ---
    const primaryColor = '#1e3a8a'; // Kurumsal Lacivert
    const secondaryColor = '#3b82f6'; // Mavi
    const grayText = '#4b5563';
    const lightBorder = '#e5e7eb';

    return (
        <div className="bg-gray-100 min-h-screen p-4 md:p-8 font-sans print:p-0 print:bg-white">
            
            {/* ÜST BAR (Print'te gizlenir) */}
            <div className="max-w-[210mm] mx-auto mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-blue-700 font-bold text-xl">
                        T
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Teklif Detayı</h2>
                        <p className="text-xs text-gray-500">No: {proposal.proposal_number}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => window.print()} 
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                    >
                        <Printer size={18} /> Yazdır
                    </button>
                    <button 
                        onClick={handleDownloadPdf} 
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                        <FileDown size={18} /> PDF İndir
                    </button>
                </div>
            </div>
            
            {/* TEKLİF KAĞIDI (A4 FORMATI) */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:w-full" style={{ minHeight: '297mm' }}>
                <div ref={proposalRef} className="relative w-full h-full flex flex-col bg-white">
                    
                    {/* 1. HEADER STRIP */}
                    <div style={{ height: '12px', width: '100%', backgroundColor: primaryColor }}></div>

                    <div style={{ padding: '40px 50px' }}>
                        
                        {/* 2. LOGO & BAŞLIK */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '50px' }}>
                            <div>
                                <img 
                                    src={companySettings?.logo_url || "https://i.imgur.com/PajSpus.png"} 
                                    alt="Logo" 
                                    style={{ height: '60px', objectFit: 'contain', marginBottom: '10px' }} 
                                />
                                <div style={{ fontSize: '11px', color: grayText, lineHeight: '1.5' }}>
                                    <strong>{companySettings?.company_name}</strong><br/>
                                    {companySettings?.address}<br/>
                                    {companySettings?.email} | {companySettings?.phone}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h1 style={{ fontSize: '32px', fontWeight: '800', color: primaryColor, letterSpacing: '-0.5px', margin: 0 }}>TEKLİF</h1>
                                <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '5px', letterSpacing: '1px' }}>#{proposal.proposal_number}</p>
                                <div style={{ marginTop: '10px' }}>
                                    <StatusBadge status={proposal.status} />
                                </div>
                            </div>
                        </div>

                        {/* 3. ALICI VE TARİH BİLGİLERİ */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '50px', borderBottom: `1px solid ${lightBorder}`, paddingBottom: '30px' }}>
                            <div style={{ width: '45%' }}>
                                <p style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>SAYIN / FİRMA</p>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 5px 0' }}>{proposal.company_name}</h3>
                                <p style={{ fontSize: '13px', color: '#374151' }}>{proposal.contact_person}</p>
                            </div>
                            <div style={{ width: '45%', textAlign: 'right' }}>
                                <div style={{ marginBottom: '15px' }}>
                                    <p style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>TEKLİF TARİHİ</p>
                                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{format(new Date(proposal.created_at), 'dd MMMM yyyy', { locale: tr })}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>GEÇERLİLİK</p>
                                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>15 Gün</p>
                                </div>
                            </div>
                        </div>

                        {/* 4. HİZMET TABLOSU */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                            <thead>
                                <tr style={{ borderBottom: `2px solid ${primaryColor}` }}>
                                    <th style={{ padding: '12px 0', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: primaryColor, textTransform: 'uppercase', width: '50%' }}>HİZMET DETAYI</th>
                                    <th style={{ padding: '12px 0', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: primaryColor, textTransform: 'uppercase', width: '20%' }}>MİKTAR</th>
                                    <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '11px', fontWeight: '700', color: primaryColor, textTransform: 'uppercase', width: '30%' }}>FİYAT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proposal.proposal_items.map((item, index) => (
                                    <tr key={index} style={{ borderBottom: `1px solid ${lightBorder}` }}>
                                        <td style={{ padding: '16px 0', verticalAlign: 'top' }}>
                                            <div style={{ display: 'flex', gap: '15px' }}>
                                                {item.image_url && (
                                                    <img src={item.image_url} alt="Hizmet" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', border: `1px solid ${lightBorder}` }} />
                                                )}
                                                <div>
                                                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#1f2937', margin: '0 0 4px 0' }}>{item.service_name}</p>
                                                    <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, lineHeight: '1.4' }}>{item.service_description}</p>
                                                    {item.explanation && <p style={{ fontSize: '10px', color: secondaryColor, marginTop: '4px', fontStyle: 'italic' }}>* {item.explanation}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 0', textAlign: 'center', verticalAlign: 'top', fontSize: '12px', color: '#374151' }}>
                                            {item.unit_type === 'seferlik' ? 'Tek Seferlik' : `${item.visit_count} Ziyaret/Ay`}
                                        </td>
                                        <td style={{ padding: '16px 0', textAlign: 'right', verticalAlign: 'top', fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>
                                            {item.unit_price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* 5. TOPLAM ALANI */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ width: '250px', backgroundColor: '#f9fafb', borderRadius: '8px', padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Ara Toplam</span>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{proposal.total_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: `1px solid ${lightBorder}` }}>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>KDV (%20)</span>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{(proposal.total_amount * 0.20).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: primaryColor }}>GENEL TOPLAM</span>
                                    <span style={{ fontSize: '18px', fontWeight: '800', color: primaryColor }}>{(proposal.total_amount * 1.20).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                            </div>
                        </div>

                        {/* 6. ALT BİLGİ (Footer Text) */}
                        <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: `1px solid ${lightBorder}`, textAlign: 'center' }}>
                            <p style={{ fontSize: '10px', color: '#9ca3af', fontStyle: 'italic' }}>
                                {companySettings?.footer_text || 'Bu teklif bilgisayar ortamında oluşturulmuştur ve ıslak imza gerektirmez. Geçerlilik süresi sonunda fiyatlar revize edilebilir.'}
                            </p>
                        </div>

                    </div>
                    
                    {/* Alt Şerit */}
                    <div style={{ marginTop: 'auto', height: '8px', width: '100%', backgroundColor: '#f3f4f6', borderTop: `1px solid ${lightBorder}` }}></div>
                </div>
            </div>

            {/* ONAY/RED ALANI */}
            {proposal.status === 'pending' && (
                <div className="max-w-[210mm] mx-auto mt-8 bg-white p-6 md:p-8 rounded-xl shadow-lg border border-blue-100 print:hidden">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Check className="w-5 h-5 text-blue-600" />
                        Teklifi Değerlendirin
                    </h3>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notlarınız (Opsiyonel)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-sm"
                            placeholder="Eklemek istediğiniz notlar..."
                        />
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => handleUpdateStatus('approved')}
                            disabled={isSubmitting}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isSubmitting ? <Loader className="animate-spin" /> : 'Kabul Et & Onayla'}
                        </button>
                        <button
                            onClick={() => handleUpdateStatus('rejected')}
                            disabled={isSubmitting}
                            className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            Reddet
                        </button>
                    </div>
                </div>
            )}

            {proposal.status !== 'pending' && proposal.customer_notes && (
                <div className="max-w-[210mm] mx-auto mt-6 p-6 bg-gray-50 border border-gray-200 rounded-xl print:hidden">
                    <h4 className="text-sm font-bold text-gray-700 mb-2">Müşteri Notu:</h4>
                    <p className="text-gray-600 text-sm italic">"{proposal.customer_notes}"</p>
                </div>
            )}

        </div>
    );
};

export default TeklifGoruntule;