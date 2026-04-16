import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    CheckCircle2, XCircle, Send, FileText, 
    User, Briefcase, MessageSquare, RefreshCw,
    ShieldCheck, Leaf, Calendar, Info
} from 'lucide-react';
import { toast } from 'sonner';

const ConfirmReconciliation: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const type = searchParams.get('type'); // 'approve' or 'reject'

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [alreadyAnswered, setAlreadyAnswered] = useState(false);
    const [tokenValid, setTokenValid] = useState(true);
    const [requestData, setRequestData] = useState<any>(null);

    // Form states
    const [fullName, setFullName] = useState('');
    const [unit, setUnit] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'approved' | 'rejected'>(type === 'reject' ? 'rejected' : 'approved');

    useEffect(() => {
        if (token) {
            fetchRequest();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchRequest = async () => {
        try {
            if (!token) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('reconciliation_responses')
                .select('*')
                .eq('token', token)
                .maybeSingle();

            if (data) {
                if (data.status === 'approved' || data.status === 'rejected') {
                    setAlreadyAnswered(true);
                } else {
                    setRequestData(data);
                }
            } else {
                setTokenValid(false);
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            setTokenValid(false);
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim() || fullName === '(Bekleniyor)') {
            toast.error('Lütfen adınızı ve soyadınızı giriniz.');
            return;
        }

        setSubmitting(true);
        try {
            const { error: updateError } = await supabase
                .from('reconciliation_responses')
                .update({
                    status: status,
                    full_name: fullName,
                    unit: unit,
                    message: message,
                    created_at: new Date().toISOString()
                })
                .eq('token', token)
                .eq('status', 'pending');

            if (updateError) throw updateError;
            setSubmitted(true);
            toast.success('Yanıtınız başarıyla kaydedildi.');
        } catch (err: any) {
            toast.error('Hata oluştu: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-emerald-50/30 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl shadow-emerald-900/10 flex flex-col items-center gap-4">
                    <div className="relative">
                        <RefreshCw className="animate-spin text-emerald-600" size={40} />
                        <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-800" size={20} />
                    </div>
                    <p className="text-emerald-900 font-bold animate-pulse">Mutabakat verileri doğrulanıyor...</p>
                </div>
            </div>
        );
    }

    if (!tokenValid || !token) {
        return (
            <div className="min-h-screen bg-rose-50/30 flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-rose-100 max-w-lg w-full text-center space-y-6">
                    <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-50">
                        <XCircle className="text-rose-600" size={48} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-rose-900 mb-2">Geçersiz Bağlantı</h2>
                        <p className="text-rose-700/80 leading-relaxed font-medium">
                            Mutabakat onay bağlantısı eksik, hatalı veya süresi dolmuş. Lütfen e-postanızdaki bağlantıyı kontrol ediniz.
                        </p>
                    </div>
                    <div className="pt-6 border-t border-rose-100/50 flex flex-col gap-3">
                        <div className="text-xs font-bold text-rose-400 uppercase tracking-widest text-center">Marka Sahibi</div>
                        <div className="text-xs font-black text-rose-900 text-center">SİSTEM İLAÇLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ</div>
                    </div>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-emerald-50/30 flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-emerald-100 max-w-lg w-full text-center space-y-8">
                    <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50 shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 className="text-white" size={48} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-emerald-900 mb-2">İşlem Tamamlandı</h2>
                        <p className="text-emerald-700/80 leading-relaxed font-medium">
                            Mutabakat yanıtınız başarıyla kaydedilmiştir. İlginiz için teşekkür ederiz.
                        </p>
                    </div>
                    <div className="pt-6 border-t border-emerald-100 flex flex-col gap-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-2xl border border-emerald-50 text-center">
                                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Müşteri</div>
                                <div className="text-xs font-black text-emerald-900 truncate">{requestData?.full_name}</div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-emerald-50 text-center">
                                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Dönem</div>
                                <div className="text-xs font-black text-emerald-900">{requestData?.month}</div>
                            </div>
                        </div>
                        <div className="space-y-4">
                             <div className="flex items-center justify-center gap-4">
                                <img src="/ilaclamatik-logo.png" alt="İlaçlamatik" className="h-10 object-contain" />
                                <div className="w-px h-6 bg-emerald-200" />
                                <div className="text-emerald-800 font-bold tracking-tighter text-lg italic">PestMentor</div>
                             </div>
                             <div className="text-[10px] font-bold text-emerald-600/50 uppercase tracking-wider text-center">
                                SİSTEM İLAÇLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (alreadyAnswered) {
        return (
            <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full text-center space-y-8">
                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
                        <ShieldCheck className="text-blue-600" size={48} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Zaten Cevaplandı</h2>
                        <p className="text-slate-500 leading-relaxed font-medium text-center">
                            Bu mutabakat için daha önce bir yanıt verilmiştir. Tekrar gönderim yapılamaz.
                        </p>
                    </div>
                    <div className="pt-6 border-t border-slate-100 space-y-4">
                         <div className="flex items-center justify-center gap-4 grayscale opacity-50">
                            <img src="/ilaclamatik-logo.png" alt="İlaçlamatik" className="h-8 object-contain" />
                            <div className="w-px h-4 bg-slate-300" />
                            <div className="text-slate-800 font-bold tracking-tighter italic">PestMentor</div>
                         </div>
                         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                            SİSTEM İLAÇLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ
                         </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-emerald-50/20 flex flex-col items-center justify-center p-4">
            {/* Logo Header */}
            <div className="mb-8 flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <img src="/ilaclamatik-logo.png" alt="İlaçlamatik" className="h-16 md:h-20 object-contain" />
                <div className="w-px h-10 bg-emerald-200" />
                <div className="flex flex-col">
                    <span className="text-2xl md:text-3xl font-black text-emerald-900 tracking-tighter leading-tight italic">PestMentor</span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest opacity-60">Hizmet Markası</span>
                </div>
            </div>
            <div className="w-full max-w-xl bg-white rounded-[32px] shadow-2xl border border-emerald-100/50 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
                {/* Visual Header */}
                <div className={`p-8 md:p-10 text-white relative transition-colors duration-500 ${status === 'approved' ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck className="w-5 h-5 opacity-80" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 text-center">Güvenli Mutabakat Onayı</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-center md:text-left">
                            {status === 'approved' ? 'Mutabıkız' : 'Mutabık Değiliz'}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                            <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                                <Calendar className="w-4 h-4 opacity-70" />
                                <span className="text-xs font-bold">{requestData?.month || 'Dönem Sonu'}</span>
                            </div>
                            {requestData?.balance !== undefined && (
                                <div className="bg-white/20 px-3 py-1.5 rounded-xl text-xs font-black">
                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(requestData.balance)}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Minimal Pattern */}
                    <div className="absolute top-0 right-0 p-8 opacity-10 hidden md:block">
                        <Leaf className="w-32 h-32 rotate-12" />
                    </div>
                </div>

                {/* Form Content */}
                <div className="p-6 md:p-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Compact Toggle */}
                        <div className="flex bg-emerald-50 p-1 rounded-2xl gap-1">
                            <button
                                type="button"
                                onClick={() => setStatus('approved')}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${status === 'approved' ? 'bg-white text-emerald-600 shadow-sm' : 'text-emerald-700/50 hover:text-emerald-700'}`}
                            >
                                Onaylıyorum
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatus('rejected')}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${status === 'rejected' ? 'bg-rose-500 text-white shadow-sm' : 'text-emerald-700/50 hover:text-emerald-700'}`}
                            >
                                Uyuşmazlık Var
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center md:text-left block">Ad Soyad</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/40" />
                                    <input
                                        required
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Adınız Soyadınız"
                                        className="w-full pl-11 pr-4 py-3 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-gray-300"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center md:text-left block">Birim / Unvan</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/40" />
                                    <input
                                        type="text"
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value)}
                                        placeholder="Örn: Muhasebe"
                                        className="w-full pl-11 pr-4 py-3 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-gray-300"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center md:text-left block">
                                {status === 'approved' ? 'Mesajınız (Opsiyonel)' : 'Uyuşmazlık Detayı'}
                            </label>
                            <div className="relative">
                                <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-emerald-600/40" />
                                <textarea
                                    rows={3}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={status === 'approved' ? "Varsa iletmek istediğiniz not..." : "Lütfen uyuşmazlığın nedenini kısaca belirtiniz..."}
                                    className="w-full pl-11 pr-4 py-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all resize-none placeholder:text-gray-300"
                                />
                            </div>
                        </div>

                        {status === 'rejected' && (
                            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center gap-3 animate-in fade-in zoom-in-95">
                                <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <p className="text-[9px] text-rose-800 font-bold leading-tight uppercase tracking-tight">
                                    Uyuşmazlık durumunda otomatik bakiye ekstresi talep edilecektir.
                                </p>
                            </div>
                        )}

                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                             <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Info className="w-3 h-3 text-emerald-500" />
                                Önemli Notlar
                             </div>
                             <div className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                                <p>1. Hata ve unutma müstesnadır.</p>
                                <p>2. Mutabakat veya itirazınızı bir ay içinde bildirmediğiniz takdirde T.T.K. 94. maddesi gereğince mutabık sayılacağınızı bildiririz.</p>
                             </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg ${
                                status === 'approved' 
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' 
                                    : 'bg-slate-900 text-white hover:bg-black shadow-slate-200'
                            }`}
                        >
                            {submitting ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    {status === 'approved' ? 'Onaylıyorum' : 'Bildirimi Gönder'}
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Corporate Footer */}
                <div className="px-8 py-6 bg-gray-50/50 text-center border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-900 font-black text-[10px]">İLAÇLAMATİK</span>
                        </div>
                        <div className="w-px h-3 bg-gray-300" />
                        <span className="text-gray-400 font-bold italic text-[9px]">PestMentor</span>
                    </div>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter max-w-xs mx-auto leading-relaxed text-center">
                        SİSTEM İLAÇLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ <br/>
                        Tüm Hakları Saklıdır • Güvenli Mutabakat Hattı
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ConfirmReconciliation;
