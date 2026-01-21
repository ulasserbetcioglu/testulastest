import React, { useState, useEffect, useRef } from 'react';
import { FileDown, Check, X, KeyRound, Loader } from 'lucide-react';

// --- INTERFACES ---
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

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const TeklifGoruntule: React.FC = () => {
    const demoProposal: Proposal = {
        id: '1',
        created_at: new Date().toISOString(),
        proposal_number: 'TKL-2026-001',
        company_name: 'ABC Şirketi A.Ş.',
        contact_person: 'Ahmet Yılmaz',
        total_amount: 25000,
        status: 'pending',
        customer_notes: null,
        proposal_items: [
            {
                service_name: 'Haşere İlaçlama Hizmeti',
                service_description: 'Profesyonel haşere kontrol ve ilaçlama hizmeti',
                image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
                visit_count: 4,
                unit_price: 5000,
                explanation: 'Aylık periyodik kontrol dahil',
                unit_type: 'aylik'
            },
            {
                service_name: 'Kemirgen Kontrol Hizmeti',
                service_description: 'Fare ve sıçan kontrolü için tuzak sistemleri',
                image_url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=400',
                visit_count: 2,
                unit_price: 3500,
                explanation: 'İstasyon kurulumu ve bakımı',
                unit_type: 'aylik'
            }
        ]
    };

    const demoSettings: CompanySettings = {
        company_name: 'İlaçlamatik Yazılım',
        logo_url: 'https://i.imgur.com/PajSpus.png',
        address: 'Bursa, Türkiye',
        email: 'bilgi@ilaclamatik.com.tr',
        phone: '+90 (555) 123 45 67',
        footer_text: 'Teklif, yayınlandığı tarihten itibaren 15 gün süreyle geçerlidir.'
    };

    const [proposal] = useState<Proposal>(demoProposal);
    const [companySettings] = useState<CompanySettings>(demoSettings);
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [password, setPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const proposalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const pdfScript = document.createElement('script');
        pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        pdfScript.async = true;
        document.body.appendChild(pdfScript);

        return () => {
            if (document.body.contains(pdfScript)) {
                document.body.removeChild(pdfScript);
            }
        }
    }, []);

    const handleDownloadPdf = () => {
        if (!proposalRef.current || !(window as any).html2pdf) {
            alert("PDF oluşturucu henüz hazır değil. Lütfen birkaç saniye sonra tekrar deneyin.");
            return;
        }
        
        const element = proposalRef.current;
        const options = {
            margin: 0,
            filename: `Teklif_${proposal?.proposal_number}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        (window as any).html2pdf().set(options).from(element).save();
    };

    const StatusBadge = ({ status }: { status: Proposal['status'] }) => {
        const statusMap = {
            pending: { text: 'Beklemede', color: 'bg-amber-500' },
            approved: { text: 'Onaylandı', color: 'bg-emerald-500' },
            rejected: { text: 'Reddedildi', color: 'bg-red-500' },
        };
        const currentStatus = statusMap[status] || statusMap.pending;
        return (
            <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold text-white rounded-full ${currentStatus.color}`}>
                {currentStatus.text}
            </span>
        );
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white p-10 rounded-2xl shadow-2xl border border-gray-100">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-blue-50 rounded-full">
                                <KeyRound className="h-12 w-12 text-blue-600" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">Teklifi Görüntüle</h2>
                        <p className="text-sm text-gray-600 text-center mb-8">
                            E-posta ile size gönderilen 6 haneli şifreyi girin
                        </p>
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                maxLength={6}
                                className="w-full p-4 border-2 border-gray-200 rounded-xl text-center text-3xl tracking-[12px] font-mono focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder="------"
                            />
                            <button 
                                onClick={() => setIsAuthenticated(true)}
                                disabled={isVerifying}
                                className="w-full flex items-center justify-center gap-2 p-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition-all shadow-lg hover:shadow-xl"
                            >
                                {isVerifying ? <Loader className="animate-spin" /> : 'Doğrula ve Görüntüle'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Action Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Teklif Önizlemesi</h2>
                        <p className="text-sm text-gray-600">Teklif No: {proposal.proposal_number}</p>
                    </div>
                    <button 
                        onClick={handleDownloadPdf} 
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 hover:shadow-lg transition-all font-medium"
                    >
                        <FileDown size={20} /> 
                        PDF İndir
                    </button>
                </div>

                {/* A4 Proposal Document */}
                <div 
                    ref={proposalRef} 
                    className="bg-white shadow-2xl mx-auto"
                    style={{ 
                        width: '210mm',
                        minHeight: '297mm',
                        maxWidth: '100%',
                        position: 'relative'
                    }}
                >
                    {/* Header with Brand Colors */}
                    <div style={{ 
                        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                        padding: '40px 40px 30px',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ 
                            position: 'absolute', 
                            top: 0, 
                            right: 0, 
                            width: '300px', 
                            height: '300px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '50%',
                            transform: 'translate(30%, -30%)'
                        }} />
                        
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <h1 className="text-white text-4xl font-bold mb-2">HİZMET TEKLİFİ</h1>
                                <div className="flex items-center gap-3">
                                    <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-sm font-semibold">
                                        {proposal.proposal_number}
                                    </span>
                                    <StatusBadge status={proposal.status} />
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-xl shadow-lg">
                                <img 
                                    src={companySettings.logo_url} 
                                    alt="Logo" 
                                    style={{ 
                                        height: '60px',
                                        maxWidth: '180px',
                                        objectFit: 'contain'
                                    }} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Company Info Cards */}
                    <div style={{ padding: '40px' }}>
                        <div className="grid grid-cols-2 gap-6 mb-8">
                            {/* From Company */}
                            <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12" />
                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1 h-6 bg-blue-600 rounded-full" />
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Teklif Veren</h3>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 mb-3">{companySettings.company_name}</h4>
                                    <div className="space-y-1.5 text-sm text-gray-600">
                                        <p className="flex items-start gap-2">
                                            <span className="text-gray-400">📍</span>
                                            <span>{companySettings.address}</span>
                                        </p>
                                        <p className="flex items-start gap-2">
                                            <span className="text-gray-400">✉️</span>
                                            <span>{companySettings.email}</span>
                                        </p>
                                        {companySettings.phone && (
                                            <p className="flex items-start gap-2">
                                                <span className="text-gray-400">📞</span>
                                                <span>{companySettings.phone}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* To Company */}
                            <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12" />
                                <div className="relative">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1 h-6 bg-blue-600 rounded-full" />
                                        <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">Teklif Verilen</h3>
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-900 mb-1">{proposal.company_name}</h4>
                                    <p className="text-sm text-gray-600 mb-4">{proposal.contact_person}</p>
                                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                                        <p className="text-xs text-gray-500 mb-1">Teklif Tarihi</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {formatDate(proposal.created_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Services Table */}
                        <div className="mb-8">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-t-xl">
                                <h3 className="font-bold text-lg">Teklif Edilen Hizmetler</h3>
                            </div>
                            
                            <div className="border-2 border-gray-200 rounded-b-xl overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hizmet</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Periyot</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Tutar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {proposal.proposal_items.map((item, index) => (
                                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-5">
                                                    <div className="flex items-start gap-4">
                                                        <div className="flex-shrink-0">
                                                            <img 
                                                                src={item.image_url || 'https://placehold.co/80x80/e2e8f0/334155?text=Hizmet'} 
                                                                alt={item.service_name}
                                                                className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200 shadow-sm"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-gray-900 text-base mb-1">{item.service_name}</h4>
                                                            <p className="text-sm text-gray-600 leading-relaxed mb-2">{item.service_description}</p>
                                                            {item.explanation && (
                                                                <div className="inline-flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 mt-2">
                                                                    <span className="text-blue-600 text-xs">💡</span>
                                                                    <p className="text-xs text-blue-700 font-medium">{item.explanation}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                    <span className="inline-block bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700">
                                                        {item.unit_type === 'seferlik' ? 'Sefer Başı' : `Ayda ${item.visit_count} Ziyaret`}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-5 text-right">
                                                    <span className="text-lg font-bold text-gray-900">
                                                        {item.unit_price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                    </span>
                                                    <p className="text-xs text-gray-500 mt-1">/ Aylık</p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Total Section */}
                                <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-t-2 border-emerald-200 px-6 py-5">
                                    <div className="flex justify-end">
                                        <div className="w-80">
                                            <div className="flex justify-between items-center py-3">
                                                <span className="text-gray-600 font-medium">Ara Toplam:</span>
                                                <span className="text-gray-900 font-semibold text-lg">
                                                    {proposal.total_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                </span>
                                            </div>
                                            <div className="border-t-2 border-emerald-300 pt-3 flex justify-between items-center">
                                                <span className="text-emerald-900 font-bold text-xl">TOPLAM:</span>
                                                <span className="text-emerald-700 font-bold text-2xl">
                                                    {proposal.total_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-2 text-right">* Fiyatlara KDV dahil değildir</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ 
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                        padding: '20px 40px',
                        color: 'white'
                    }}>
                        <div className="flex items-center justify-between">
                            <p className="text-sm opacity-90">{companySettings.footer_text}</p>
                            <p className="text-xs opacity-75">© 2026 {companySettings.company_name}</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                {proposal.status === 'pending' && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mt-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-blue-600 rounded-full" />
                            Teklifi Değerlendirin
                        </h2>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Notlarınız veya Sorularınız (İsteğe Bağlı)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={4}
                                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                                placeholder="Örn: Fiyatlandırma hakkında bir sorum var..."
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button 
                                onClick={() => alert('Teklif onaylandı!')}
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-3 p-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:bg-gray-400 transition-all shadow-md hover:shadow-lg"
                            >
                                {isSubmitting ? <Loader className="animate-spin" /> : <Check size={22} />}
                                <span>Teklifi Onayla</span>
                            </button>
                            <button 
                                onClick={() => alert('Teklif reddedildi')}
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-3 p-4 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:bg-gray-400 transition-all shadow-md hover:shadow-lg"
                            >
                                {isSubmitting ? <Loader className="animate-spin" /> : <X size={22} />}
                                <span>Teklifi Reddet</span>
                            </button>
                        </div>
                    </div>
                )}

                {proposal.status !== 'pending' && proposal.customer_notes && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mt-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-gray-400 rounded-full" />
                            Geri Bildiriminiz
                        </h2>
                        <div className="bg-gray-50 rounded-xl p-6 border-l-4 border-blue-500">
                            <p className="text-gray-700 italic leading-relaxed">"{proposal.customer_notes}"</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeklifGoruntule;