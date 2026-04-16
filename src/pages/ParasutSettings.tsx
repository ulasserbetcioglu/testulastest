import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Settings, 
    RefreshCw, 
    Key, 
    ExternalLink, 
    CheckCircle2, 
    XCircle, 
    AlertCircle,
    Building2,
    Save,
    Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface ParasutSettings {
    id: number;
    client_id: string;
    client_secret: string;
    company_id: string;
    access_token: string | null;
    refresh_token: string | null;
    expires_at: string | null;
}

const ParasutSettings: React.FC = () => {
    const [settings, setSettings] = useState<ParasutSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exchanging, setExchanging] = useState(false);
    const [authCode, setAuthCode] = useState('');

    const [form, setForm] = useState({
        client_id: '',
        client_secret: '',
        company_id: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('parasut_settings')
                .select('*')
                .eq('id', 1)
                .maybeSingle();

            if (error) throw error;
            if (data) {
                setSettings(data);
                setForm({
                    client_id: data.client_id || '',
                    client_secret: data.client_secret || '',
                    company_id: data.company_id || ''
                });
            }
        } catch (err: any) {
            toast.error('Ayarlar yüklenirken hata oluştu: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBasicSettings = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('parasut_settings')
                .upsert({
                    id: 1,
                    client_id: form.client_id,
                    client_secret: form.client_secret,
                    company_id: form.company_id
                });

            if (error) throw error;
            toast.success('Temel ayarlar kaydedildi.');
            fetchSettings();
        } catch (err: any) {
            toast.error('Kaydetme hatası: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleGetAuthCode = () => {
        if (!form.client_id) {
            toast.error('Lütfen önce Client ID girin ve kaydedin.');
            return;
        }
        const redirectUri = 'urn:ietf:wg:oauth:2.0:oob';
        const url = `https://api.parasut.com/oauth/authorize?client_id=${form.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
        window.open(url, '_blank');
    };

    const handleExchangeCode = async () => {
        if (!authCode.trim()) {
            toast.error('Lütfen yetkilendirme kodunu giriniz.');
            return;
        }
        if (!form.client_id || !form.client_secret) {
            toast.error('Client ID ve Secret eksik.');
            return;
        }

        setExchanging(true);
        try {
            const { data, error } = await supabase.functions.invoke('parasut-fetch', {
                body: {
                    type: 'token_exchange',
                    code: authCode.trim(),
                    client_id: form.client_id,
                    client_secret: form.client_secret,
                    company_id: form.company_id
                }
            });

            if (error) {
                // Supabase internal error or non-2xx return
                let msg = error.message || 'Fonksiyon çağrısı başarısız.';
                try {
                    const errorDetails = await error.context?.json();
                    if (errorDetails?.error) msg = errorDetails.error;
                } catch(e) {}
                throw new Error(msg);
            }

            if (data?.success === false) {
                const detailedError = data.error || 'Token değişimi başarısız.';
                const extra = data.details ? ` (${JSON.stringify(data.details)})` : '';
                throw new Error(`${detailedError}${extra}`);
            }

            toast.success('Paraşüt bağlantısı başarıyla sağlandı!');
            setAuthCode('');
            fetchSettings();
        } catch (err: any) {
            console.error('Parasut Auth Error:', err);
            toast.error(`Bağlantı Hatası: ${err.message || 'Bilinmeyen sistem hatası'}`);
        } finally {
            setExchanging(false);
        }
    };

    const isTokenExpired = () => {
        if (!settings?.expires_at) return true;
        return new Date(settings.expires_at) < new Date();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-100 rounded-xl">
                    <Building2 className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 uppercase">Paraşüt API Ayarları</h1>
                    <p className="text-gray-500">API kimlik bilgilerinizi ve bağlantı durumunuzu yönetin.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Connection Status Card */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-gray-400" />
                            Bağlantı Durumu
                        </h2>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                                <span className="text-sm text-gray-600">Durum</span>
                                {settings?.access_token && !isTokenExpired() ? (
                                    <span className="flex items-center gap-1 text-green-600 font-medium text-sm">
                                        <CheckCircle2 className="w-4 h-4" /> Bağlı
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-red-600 font-medium text-sm">
                                        <XCircle className="w-4 h-4" /> Kesik
                                    </span>
                                )}
                            </div>

                            {settings?.expires_at && (
                                <div className="p-3 rounded-xl bg-gray-50">
                                    <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Token Bitiş</div>
                                    <div className="text-sm font-medium text-gray-700">
                                        {new Date(settings.expires_at).toLocaleString('tr-TR')}
                                    </div>
                                    {isTokenExpired() && (
                                        <div className="mt-1 text-[10px] text-red-500 font-bold uppercase">SÜRESİ BİTMİŞ</div>
                                    )}
                                </div>
                            )}

                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Bağlantı koptuğunda fiyalatlandırma ve fatura aktarımı durur. Lütfen ayarları güncel tutun.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings Form */}
                <div className="md:col-span-2 space-y-6">
                    {/* Credentials Section */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Key className="w-5 h-5 text-gray-400" />
                            API Bilgileri
                        </h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Client ID</label>
                                    <input
                                        type="text"
                                        value={form.client_id}
                                        onChange={(e) => setForm({ ...form, client_id: e.target.value.trim() })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                                        placeholder="API Client ID"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Firma ID</label>
                                    <input
                                        type="text"
                                        value={form.company_id}
                                        onChange={(e) => setForm({ ...form, company_id: e.target.value.trim() })}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                                        placeholder="510XXX"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Client Secret</label>
                                <input
                                    type="password"
                                    value={form.client_secret}
                                    onChange={(e) => setForm({ ...form, client_secret: e.target.value.trim() })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                                    placeholder="••••••••••••••••"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={handleSaveBasicSettings}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-50 transition-all text-sm font-semibold"
                                >
                                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Ayarları Kaydet
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Authentication Section */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
                        {(!form.client_id || !form.client_secret) && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 transition-all">
                                <div className="text-center">
                                    <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 font-medium">Önce API bilgilerini kaydedin.</p>
                                </div>
                            </div>
                        )}

                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <LinkIcon className="w-5 h-5 text-gray-400" />
                            Yetkilendirme (OAuth veya Manuel)
                        </h2>

                        <div className="space-y-6">
                            <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                                <h3 className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Bağlantı Yöntemi
                                </h3>
                                <p className="text-xs text-orange-700 leading-relaxed">
                                    Paraşüt V4 API için iki yöntem vardır: <b>1.</b> Onay kodu alarak giriş yapmak (Önerilen), <b>2.</b> Eğer "Süresiz/Statik" bir Token'ınız varsa doğrudan aşağıya yapıştırmak.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 tracking-widest uppercase ml-1">Onay Kodu veya API Token</label>
                                        <input
                                            type="text"
                                            value={authCode}
                                            onChange={(e) => setAuthCode(e.target.value.trim())}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-mono"
                                            placeholder="Onay Kodu veya Mevcut Token..."
                                        />
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <button
                                            onClick={handleGetAuthCode}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all text-sm font-bold"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Kod Al
                                        </button>
                                        <button
                                            onClick={handleExchangeCode}
                                            disabled={exchanging || !authCode}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all text-sm font-bold shadow-lg shadow-blue-200"
                                        >
                                            {exchanging ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            Doğrula & Kaydet
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParasutSettings;
