import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Star, Send, CheckCircle, AlertTriangle, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface SurveyData {
    rating_personnel: number;
    rating_attitude: number;
    rating_interest: number;
    rating_solution: number;
    feedback: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    nps_score: number | null; // NEW
    service_types: string[]; // NEW
}

interface CompanySettings {
    company_name: string;
    logo_url: string;
    phone: string;
    email: string;
    address: string;
    website: string;
    google_review_link?: string; // NEW
}

const SERVICE_OPTIONS = [
    "Genel Haşere İlaçlama",
    "Kemirgen Mücadelesi",
    "Dezenfeksiyon",
    "Jel Uygulaması",
    "Uçkun (Sinek) Mücadelesi",
    "Diğer"
];

const StarRating: React.FC<{
    label: string;
    value: number;
    onChange: (val: number) => void;
    description: string;
}> = ({ label, value, onChange, description }) => {
    return (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-100 transition-colors">
            <div className="mb-3">
                <h3 className="font-semibold text-gray-800 text-lg">{label}</h3>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
            <div className="flex gap-2 sm:gap-4 justify-between sm:justify-start">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        className={`p-2 transition-all active:scale-95 focus:outline-none ${star <= value ? 'text-yellow-400 drop-shadow-sm scale-110' : 'text-gray-200'}`}
                    >
                        <Star className={`w-10 h-10 sm:w-12 sm:h-12 ${star <= value ? 'fill-current' : 'fill-none'}`} />
                    </button>
                ))}
            </div>
        </div>
    );
};

const SurveyPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const customerId = searchParams.get('cid');

    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

    const [formData, setFormData] = useState<SurveyData>({
        rating_personnel: 0,
        rating_attitude: 0,
        rating_interest: 0,
        rating_solution: 0,
        feedback: '',
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        nps_score: null, // NEW
        service_types: [] // NEW
    });

    const [kvkkAccepted, setKvkkAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);

    useEffect(() => {
        fetchCompanySettings();
    }, []);

    const fetchCompanySettings = async () => {
        try {
            const { data, error } = await supabase.from('company_settings').select('*').single();
            if (error) throw error;
            if (data) setCompanySettings(data);
        } catch (err) {
            console.error('Error fetching settings:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (formData.rating_personnel === 0 || formData.rating_attitude === 0 ||
            formData.rating_interest === 0 || formData.rating_solution === 0) {
            toast.warning('Lütfen tüm hizmet kriterlerini puanlayınız.');
            return;
        }

        if (formData.nps_score === null) {
            toast.warning('Lütfen tavsiye puanınızı seçiniz.');
            return;
        }

        if (formData.service_types.length === 0) {
            toast.warning('Lütfen en az bir hizmet türü seçiniz.');
            return;
        }

        if (!kvkkAccepted || !privacyAccepted) {
            toast.warning('Lütfen KVKK ve Gizlilik Politikası metinlerini onaylayınız.');
            return;
        }

        setLoading(true);
        try {
            const { error: submitError } = await supabase
                .from('survey_responses')
                .insert({
                    customer_id: customerId || null,
                    rating_personnel: formData.rating_personnel,
                    rating_attitude: formData.rating_attitude,
                    rating_interest: formData.rating_interest,
                    rating_solution: formData.rating_solution,
                    feedback: formData.feedback,
                    customer_name: formData.customer_name,
                    customer_email: formData.customer_email,
                    customer_phone: formData.customer_phone,
                    nps_score: formData.nps_score,
                    service_types: formData.service_types
                });

            if (submitError) throw submitError;

            setSubmitted(true);
            toast.success('Geri bildiriminiz başarıyla gönderildi. Teşekkür ederiz!');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            console.error('Anket gönderme hatası:', err);
            toast.error('Bir hata oluştu. Lütfen tekrar deneyiniz.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        const isHighRating = (formData.rating_personnel + formData.rating_attitude + formData.rating_interest + formData.rating_solution) / 4 >= 4;

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">Teşekkür Ederiz!</h2>
                    <p className="text-gray-600 mb-8 text-lg">
                        Değerli geri bildirimleriniz bizim için çok önemli. Görüşleriniz sayesinde hizmet kalitemizi her geçen gün artırıyoruz.
                    </p>

                    {isHighRating && companySettings?.google_review_link && (
                        <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-blue-800 font-medium mb-4">Memnuniyetinizi Google'da paylaşarak bize destek olmak ister misiniz?</p>
                            <a
                                href={companySettings.google_review_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 border border-blue-200 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-sm"
                            >
                                <Globe className="w-5 h-5" /> Google'da Değerlendir
                            </a>
                        </div>
                    )}

                    <button
                        onClick={() => window.location.href = `https://${companySettings?.website || 'pestmentor.com'}`}
                        className="text-gray-500 hover:text-gray-900 font-medium underline"
                    >
                        Ana Sayfaya Dön
                    </button>
                </div>

                {/* Simple Footer for Success Page */}
                <div className="mt-8 text-center opacity-60">
                    {companySettings?.logo_url && (
                        <img src={companySettings.logo_url} alt="Logo" className="h-8 mx-auto mb-2 grayscale" />
                    )}
                    <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} {companySettings?.company_name || 'PestMENTOR'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {companySettings?.logo_url ? (
                            <img src={companySettings.logo_url} alt={companySettings.company_name} className="h-10 w-auto object-contain" />
                        ) : (
                            <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl">PM</div>
                        )}
                        <span className="font-bold text-xl text-gray-900 hidden sm:block">{companySettings?.company_name || 'PestMENTOR'}</span>
                    </div>
                    <div className="text-sm text-gray-500 hidden sm:block">
                        Müşteri Memnuniyet Anketi
                    </div>
                </div>
            </header>

            <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">

                    {/* Welcome Card */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-8 mb-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                            <Star className="w-64 h-64 text-white fill-current" />
                        </div>
                        <h1 className="text-3xl font-bold mb-4 relative z-10">Görüşleriniz Bizim İçin Değerli</h1>
                        <p className="text-blue-100 text-lg relative z-10">
                            Sizlere daha iyi hizmet sunabilmemiz için birkaç dakikanızı ayırarak deneyiminizi değerlendirmenizi rica ederiz.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Service & NPS Section */}
                        <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-2">Hizmet Detayları</h2>

                            {/* Service Types */}
                            <div className="mb-8">
                                <label className="block text-lg font-medium text-gray-700 mb-3">
                                    Hangi hizmetleri aldınız?
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {SERVICE_OPTIONS.map((service) => (
                                        <label key={service} className={`
                      cursor-pointer border rounded-lg p-3 text-sm font-medium transition-all text-center select-none
                      ${formData.service_types.includes(service)
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:bg-blue-50'}
                    `}>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={formData.service_types.includes(service)}
                                                onChange={(e) => {
                                                    const newTypes = e.target.checked
                                                        ? [...formData.service_types, service]
                                                        : formData.service_types.filter(t => t !== service);
                                                    setFormData({ ...formData, service_types: newTypes });
                                                }}
                                            />
                                            {service}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* NPS Score */}
                            <div>
                                <label className="block text-lg font-medium text-gray-700 mb-3">
                                    Bizi çevrenize tavsiye eder misiniz?
                                    <span className="block text-sm font-normal text-gray-500 mt-1">(0: Asla, 10: Kesinlikle)</span>
                                </label>
                                <div className="flex justify-between gap-1 overflow-x-auto pb-2">
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                                        <button
                                            key={score}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, nps_score: score })}
                                            className={`
                        flex-shrink-0 w-8 h-10 sm:w-10 sm:h-12 rounded-lg font-bold text-sm sm:text-base border transition-all
                        ${formData.nps_score === score
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-1'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:border-blue-300'}
                      `}
                                        >
                                            {score}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                                    <span>Asla Tavsiye Etmem</span>
                                    <span>Kesinlikle Tavsiye Ederim</span>
                                </div>
                            </div>
                        </div>

                        {/* Rating Section */}
                        <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-2">Hizmet Değerlendirmesi</h2>

                            <div className="grid gap-3 sm:gap-4">
                                <StarRating
                                    label="Personel İletişimi"
                                    description="Personelimizin size yaklaşımı, nezaketi ve iletişim dili."
                                    value={formData.rating_personnel}
                                    onChange={(v) => setFormData({ ...formData, rating_personnel: v })}
                                />

                                <StarRating
                                    label="Tavır ve Davranış"
                                    description="Hizmet sırasındaki genel profesyonellik ve tutum."
                                    value={formData.rating_attitude}
                                    onChange={(v) => setFormData({ ...formData, rating_attitude: v })}
                                />

                                <StarRating
                                    label="İlgi ve Alaka"
                                    description="Sorunlarınızın dinlenmesi ve çözüm odaklı yaklaşım."
                                    value={formData.rating_interest}
                                    onChange={(v) => setFormData({ ...formData, rating_interest: v })}
                                />

                                <StarRating
                                    label="Sorun Çözümü"
                                    description="Yaşadığınız problemin etkili ve kalıcı şekilde çözülmesi."
                                    value={formData.rating_solution}
                                    onChange={(v) => setFormData({ ...formData, rating_solution: v })}
                                />
                            </div>

                            <div className="mt-8">
                                <label htmlFor="feedback" className="block text-lg font-medium text-gray-700 mb-2">
                                    Görüş ve Önerileriniz
                                </label>
                                <textarea
                                    id="feedback"
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none bg-gray-50 focus:bg-white text-base"
                                    placeholder="Eklemek istediğiniz notlar..."
                                    value={formData.feedback}
                                    onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Contact Info (Optional) */}
                        <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-2">İletişim Bilgileri (İsteğe Bağlı)</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad / Firma Adı</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-base"
                                        placeholder="Adınız Soyadınız"
                                        value={formData.customer_name}
                                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">E-posta Adresi</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-base"
                                        placeholder="ornek@email.com"
                                        value={formData.customer_email}
                                        onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon Numarası</label>
                                    <input
                                        type="tel"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-base"
                                        placeholder="05XX XXX XX XX"
                                        value={formData.customer_phone}
                                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Legal / KVKK */}
                        <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-gray-500" /> Yasal Onaylar
                            </h2>
                            <div className="space-y-4">
                                <label className="flex items-start gap-3 cursor-pointer group active:bg-gray-50 p-2 rounded-lg -ml-2 transition-colorsSelect">
                                    <div className="pt-0.5">
                                        <input
                                            type="checkbox"
                                            required
                                            className="w-6 h-6 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                            checked={kvkkAccepted}
                                            onChange={(e) => setKvkkAccepted(e.target.checked)}
                                        />
                                    </div>
                                    <div className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors leading-relaxed">
                                        <span className="font-semibold text-gray-900">KVKK Aydınlatma Metni</span>'ni okudum ve kişisel verilerimin bu kapsamda işlenmesini kabul ediyorum.
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer group active:bg-gray-50 p-2 rounded-lg -ml-2 transition-colorsSelect">
                                    <div className="pt-0.5">
                                        <input
                                            type="checkbox"
                                            required
                                            className="w-6 h-6 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                            checked={privacyAccepted}
                                            onChange={(e) => setPrivacyAccepted(e.target.checked)}
                                        />
                                    </div>
                                    <div className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors leading-relaxed">
                                        <span className="font-semibold text-gray-900">Gizlilik Politikası</span>'nı okudum ve kabul ediyorum.
                                    </div>
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-95
                ${loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl'
                                }`}
                        >
                            {loading ? (
                                <>Lütfen bekleyiniz...</>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" /> Değerlendirmeyi Gönder
                                </>
                            )}
                        </button>

                    </form>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                {companySettings?.logo_url ? (
                                    <img src={companySettings.logo_url} alt="Logo" className="h-8 brightness-0 invert opacity-80" />
                                ) : (
                                    <span className="font-bold text-xl text-white">{companySettings?.company_name || 'PestMENTOR'}</span>
                                )}
                            </div>
                            <p className="text-sm leading-relaxed max-w-xs">
                                Profesyonel haşere kontrol ve hijyen çözümleriyle yaşam alanlarınızı koruyoruz.
                            </p>
                        </div>
                        <div className="space-y-3 text-sm">
                            {companySettings?.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-500" />
                                    <span>{companySettings.phone}</span>
                                </div>
                            )}
                            {companySettings?.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    <span>{companySettings.email}</span>
                                </div>
                            )}
                            {companySettings?.address && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-500" />
                                    <span>{companySettings.address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="pt-8 border-t border-gray-800 text-center text-xs text-gray-600">
                        <p>&copy; {new Date().getFullYear()} {companySettings?.company_name || 'PestMENTOR'}. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default SurveyPage;
