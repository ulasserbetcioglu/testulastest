import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 as Loader, FileDown, Check, X, KeyRound } from 'lucide-react';
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
            margin:       0.4,
            filename:     `Teklif_${proposal?.proposal_number || proposal?.company_name}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
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
            pending: { text: 'Beklemede', color: 'bg-yellow-100 text-yellow-800' },
            approved: { text: 'Onaylandı', color: 'bg-green-100 text-green-800' },
            rejected: { text: 'Reddedildi', color: 'bg-red-100 text-red-800' },
        };
        const currentStatus = statusMap[status] || statusMap.pending;
        return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${currentStatus.color}`}>{currentStatus.text}</span>;
    };

    if (!isAuthenticated) {
        return (
            <div className="bg-gray-200 min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                        <KeyRound className="mx-auto h-12 w-12 text-blue-500" />
                        <h2 className="mt-4 text-2xl font-bold text-gray-800">Teklifi Görüntüle</h2>
                        <p className="mt-2 text-sm text-gray-600">Bu teklifi görüntülemek için lütfen e-posta ile size gönderilen 6 haneli şifreyi girin.</p>
                        <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
                            <input
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                maxLength={6}
                                className="w-full p-3 border rounded-lg text-center text-2xl tracking-[8px]"
                                placeholder="------"
                            />
                            <button 
                                type="submit"
                                disabled={isVerifying}
                                className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                {isVerifying ? <Loader className="animate-spin" /> : 'Doğrula'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
    
    if (loading || !proposal) {
        return <div className="flex items-center justify-center h-screen"><Loader className="w-12 h-12 animate-spin text-blue-600" /></div>;
    }

    if (error) {
        return <div className="flex items-center justify-center h-screen text-red-600">{error}</div>;
    }

    return (
        <div className="bg-gray-200 min-h-screen p-4 sm:p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700">Teklif Önizlemesi</h2>
                    <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 transition-colors">
                        <FileDown size={20} /> PDF Olarak İndir
                    </button>
                </div>
                
                <div ref={proposalRef} className="bg-white" style={{ 
                    fontSize: '12px', 
                    lineHeight: '1.4',
                    minHeight: '297mm',
                    position: 'relative'
                }}>
                    <div className="p-6">
                        <div className="flex justify-between items-start pb-4 border-b border-gray-300">
                            <div>
                                <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
                                    HİZMET TEKLİFİ
                                </h1>
                                <p style={{ fontSize: '11px', color: '#6b7280' }}>
                                    Teklif No: {proposal.proposal_number}
                                </p>
                            </div>
                            <div>
                                <img 
                                    src={companySettings?.logo_url || "https://i.imgur.com/PajSpus.png"} 
                                    alt="Şirket Logosu" 
                                    style={{ 
                                        height: '50px', 
                                        maxWidth: '150px',
                                        objectFit: 'contain'
                                    }} 
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-center" style={{ padding: '20px 0' }}>
                            <div className="flex" style={{ gap: '80px', alignItems: 'flex-start' }}>
                                <div style={{ textAlign: 'center', minWidth: '200px' }}>
                                    <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>
                                        TEKLİF VEREN
                                    </p>
                                    <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <p style={{ fontSize: '12px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' }}>
                                            {companySettings?.company_name || 'İlaçlamatik Yazılım'}
                                        </p>
                                        <p style={{ fontSize: '10px', color: '#4b5563', marginBottom: '2px' }}>
                                            {companySettings?.address || 'Bursa, Türkiye'}
                                        </p>
                                        <p style={{ fontSize: '10px', color: '#4b5563', marginBottom: '2px' }}>
                                            {companySettings?.email || 'bilgi@ilaclamatik.com.tr'}
                                        </p>
                                        {companySettings?.phone && (
                                            <p style={{ fontSize: '10px', color: '#4b5563' }}>
                                                {companySettings.phone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                <div style={{ textAlign: 'center', minWidth: '200px' }}>
                                    <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>
                                        TEKLİF VERİLEN
                                    </p>
                                    <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #0ea5e9' }}>
                                        <p style={{ fontSize: '12px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' }}>
                                            {proposal.company_name}
                                        </p>
                                        <p style={{ fontSize: '11px', color: '#4b5563', marginBottom: '8px' }}>
                                            {proposal.contact_person}
                                        </p>
                                        <p style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>Tarih</p>
                                        <p style={{ fontSize: '11px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                                            {format(new Date(proposal.created_at), 'dd MMMM yyyy', { locale: tr })}
                                        </p>
                                        <StatusBadge status={proposal.status} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <table style={{ width: '100%', marginTop: '12px', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: '#f9fafb' }}>
                                <tr>
                                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '9px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }} colSpan={2}>
                                        Hizmet Açıklaması
                                    </th>
                                    <th style={{ padding: '8px', textAlign: 'center', fontSize: '9px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>
                                        Adet
                                    </th>
                                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '9px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb' }}>
                                        Birim Fiyat
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {proposal.proposal_items.map((item, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '12px 8px', width: '60px', verticalAlign: 'top' }}>
                                            <img 
                                                src={item.image_url || 'https://placehold.co/80x80/e2e8f0/334155?text=Hizmet'} 
                                                alt={item.service_name} 
                                                style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} 
                                            />
                                        </td>
                                        <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                                            <p style={{ fontSize: '12px', fontWeight: '700', color: '#1f2937', marginBottom: '2px' }}>
                                                {item.service_name}
                                            </p>
                                            <p style={{ fontSize: '10px', color: '#4b5563', marginBottom: '2px', lineHeight: '1.3' }}>
                                                {item.service_description}
                                            </p>
                                            {item.explanation && (
                                                <p style={{ fontSize: '9px', color: '#1d4ed8', marginTop: '4px', fontStyle: 'italic' }}>
                                                    Not: {item.explanation}
                                                </p>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'center', fontSize: '10px' }}>
                                            {item.unit_type === 'seferlik' ? 'Sefer Başı' : `Ayda ${item.visit_count} Ziyaret`}
                                        </td>
                                        <td style={{ padding: '12px 8px', verticalAlign: 'top', textAlign: 'right', fontSize: '11px', fontWeight: '600' }}>
                                            {(item.unit_price || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                            <div style={{ width: '100%', maxWidth: '300px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '10px' }}>
                                    <span style={{ color: '#4b5563' }}>Ara Toplam:</span>
                                    <span>{(proposal.total_amount || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700', color: '#16a34a', paddingTop: '4px', borderTop: '1px solid #e5e7eb' }}>
                                    <span>GENEL TOPLAM:</span>
                                    <span>{(proposal.total_amount || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                                <p style={{ fontSize: '8px', color: '#6b7280', marginTop: '4px' }}>
                                    Fiyatlara KDV dahil değildir.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ position: 'absolute', bottom: '20px', left: '24px', right: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', fontSize: '8px', color: '#6b7280', textAlign: 'center', backgroundColor: 'white' }}>
                        <p>{companySettings?.footer_text || 'Teklif, yayınlandığı tarihten itibaren 15 gün süreyle geçerlidir.'}</p>
                    </div>
                </div>
                
                {proposal.status === 'pending' && (
                    <div className="bg-white p-8 sm:p-12 shadow-lg mt-4 border-t-4 border-blue-500">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Teklifi Değerlendirin</h2>
                        <div>
                            <label htmlFor="customer_notes" className="block text-sm font-medium text-gray-700 mb-2">
                                Teklifle ilgili notlarınız veya sorularınız (isteğe bağlı):
                            </label>
                            <textarea
                                id="customer_notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Örn: Fiyatlandırma hakkında bir sorum var..."
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 mt-6">
                            <button 
                                onClick={() => handleUpdateStatus('approved')}
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                            >
                                {isSubmitting ? <Loader className="animate-spin" /> : <Check />}
                                Teklifi Onayla
                            </button>
                            <button 
                                onClick={() => handleUpdateStatus('rejected')}
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                            >
                                {isSubmitting ? <Loader className="animate-spin" /> : <X />}
                                Teklifi Reddet
                            </button>
                        </div>
                    </div>
                )}

                {proposal.status !== 'pending' && proposal.customer_notes && (
                     <div className="bg-white p-8 sm:p-12 shadow-lg mt-4 border-t-4 border-gray-300">
                         <h2 className="text-xl font-bold text-gray-800 mb-4">Geri Bildiriminiz</h2>
                         <p className="text-gray-700 italic">"{proposal.customer_notes}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeklifGoruntule;