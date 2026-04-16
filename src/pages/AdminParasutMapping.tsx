import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Building, Users, Package, Search, RefreshCw,
    AlertCircle, CheckCircle2, Cloud, X, Copy, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

type MappingType = 'branches' | 'customers' | 'products' | 'biocidal';

interface MappingItem {
    id: string;
    name: string;
    parasut_id: number | null;
    secondary_info?: string;
}

interface ParasutResult {
    id: string;
    name: string;
    code?: string;
    type: string;
}

const AdminParasutMapping: React.FC = () => {
    const [activeTab, setActiveTab] = useState<MappingType>('branches');
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<MappingItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);

    // Paraşüt Search State
    const [showParasutPanel, setShowParasutPanel] = useState(false);
    const [parasutSearch, setParasutSearch] = useState('');
    const [parasutResults, setParasutResults] = useState<ParasutResult[]>([]);
    const [parasutLoading, setParasutLoading] = useState(false);
    const [autoMatching, setAutoMatching] = useState(false);

    useEffect(() => {
        fetchItems();
        setSelectedId(null);
    }, [activeTab]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            let data: any[] = [];
            let error: any = null;

            if (activeTab === 'branches') {
                const { data: bData, error: bError } = await supabase
                    .from('branches')
                    .select('id, sube_adi, parasut_id, customer:customer_id(kisa_isim)')
                    .order('sube_adi');
                data = (bData || []).map(b => ({
                    id: b.id,
                    name: b.sube_adi,
                    parasut_id: b.parasut_id,
                    secondary_info: (b.customer as any)?.kisa_isim
                }));
                error = bError;
            } else if (activeTab === 'customers') {
                const { data: cData, error: cError } = await supabase
                    .from('customers')
                    .select('id, kisa_isim, cari_isim, parasut_id')
                    .order('cari_isim');
                data = (cData || []).map(c => ({
                    id: c.id,
                    name: c.cari_isim || c.kisa_isim,
                    parasut_id: c.parasut_id,
                    secondary_info: c.kisa_isim
                }));
                error = cError;
            } else if (activeTab === 'products') {
                const { data: pData, error: pError } = await supabase
                    .from('paid_products')
                    .select('id, name, parasut_id')
                    .order('name');
                data = (pData || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    parasut_id: p.parasut_id
                }));
                error = pError;
            } else if (activeTab === 'biocidal') {
                const { data: bData, error: bError } = await supabase
                    .from('biocidal_products')
                    .select('id, name, parasut_id')
                    .order('name');
                data = (bData || []).map(b => ({
                    id: b.id,
                    name: b.name,
                    parasut_id: b.parasut_id
                }));
                error = bError;
            }

            if (error) throw error;
            setItems(data);
        } catch (err: any) {
            toast.error('Veri yüklenirken hata oluştu: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateParasutId = async (id: string, value: string | number | null) => {
        const parasutId = typeof value === 'string' ? (value ? parseInt(value) : null) : value;
        if (typeof value === 'string' && value && isNaN(parasutId as number)) {
            toast.error('Lütfen geçerli bir sayı giriniz.');
            return;
        }

        setSavingId(id);
        try {
            const table = activeTab === 'branches' ? 'branches' :
                activeTab === 'customers' ? 'customers' :
                    activeTab === 'products' ? 'paid_products' : 'biocidal_products';
            const { error } = await supabase
                .from(table)
                .update({ parasut_id: parasutId })
                .eq('id', id);

            if (error) throw error;

            setItems(prev => prev.map(item =>
                item.id === id ? { ...item, parasut_id: parasutId } : item
            ));

            toast.success('Başarıyla güncellendi');

            // --- AUTO BRANCH MATCHING FOR CUSTOMERS ---
            if (activeTab === 'customers' && parasutId) {
                await handleAutoBranchMatching(id);
            }
        } catch (err: any) {
            toast.error('Güncelleme hatası: ' + err.message);
        } finally {
            setSavingId(null);
        }
    };

    const handleAutoBranchMatching = async (customerId: string) => {
        const { data: branches, error: bError } = await supabase
            .from('branches')
            .select('id, sube_adi')
            .eq('customer_id', customerId)
            .is('parasut_id', null);

        if (bError || !branches || branches.length === 0) return;

        toast.info(`${branches.length} adet şube için otomatik eşleştirme yapılıyor...`);

        try {
            // Fetch Paraşüt contacts once for matching
            const { data, error: invokeError } = await supabase.functions.invoke('parasut-fetch', {
                body: { type: 'contacts', filter_key: 'filter[query]', query: '' }
            });

            if (invokeError || !data?.success) return;
            const psResults: ParasutResult[] = data.data || [];
            let matchCount = 0;

            for (const branch of branches) {
                const match = psResults.find(p =>
                    p.name.toLocaleLowerCase('tr-TR').trim() === branch.sube_adi.toLocaleLowerCase('tr-TR').trim()
                );

                if (match) {
                    await supabase.from('branches').update({ parasut_id: parseInt(match.id) }).eq('id', branch.id);
                    matchCount++;
                }
            }

            if (matchCount > 0) {
                toast.success(`${matchCount} şube başarıyla eşleştirildi!`);
            }
        } catch (err) { }
    };

    const handleRowClick = (item: MappingItem) => {
        setSelectedId(item.id);
        setShowParasutPanel(true);
        setParasutSearch(item.name);
        // Trigger search immediately
        setTimeout(() => searchInParasut(false, item.name), 100);
    };

    const searchInParasut = async (isAutoLoad = false, overrideSearch?: string) => {
        const queryTerm = overrideSearch !== undefined ? overrideSearch : parasutSearch;

        if (!isAutoLoad && !queryTerm.trim()) return;

        setParasutLoading(true);
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('parasut-fetch', {
                body: {
                    type: (activeTab === 'products' || activeTab === 'biocidal') ? 'products' : 'contacts',
                    filter_key: (activeTab === 'products' || activeTab === 'biocidal') ? 'filter[name]' : 'filter[query]',
                    query: isAutoLoad ? '' : queryTerm
                }
            });

            if (invokeError) throw new Error(invokeError.message || 'Bağlantı hatası.');
            if (data?.success === false) throw new Error(data.error || 'Paraşüt verileri çekilemedi.');

            setParasutResults(data.data || []);
        } catch (err: any) {
            console.error('Parasut Search Error:', err);
            toast.error('Bağlantı Hatası: ' + err.message);
        } finally {
            setParasutLoading(false);
        }
    };

    const autoMatchExact = async () => {
        const unmatched = items.filter(i => !i.parasut_id);
        if (unmatched.length === 0) {
            toast.info('Eşleştirilecek öğe kalmadı.');
            return;
        }

        setAutoMatching(true);
        toast.info('Paraşüt verileri taranıyor, lütfen bekleyin...');

        try {
            const { data, error: invokeError } = await supabase.functions.invoke('parasut-fetch', {
                body: {
                    type: (activeTab === 'products' || activeTab === 'biocidal') ? 'products' : 'contacts',
                    filter_key: (activeTab === 'products' || activeTab === 'biocidal') ? 'filter[name]' : 'filter[query]',
                    query: '' // Load all
                }
            });

            if (invokeError || !data?.success) throw new Error('Paraşüt verileri alınamadı.');

            const psResults: ParasutResult[] = data.data || [];
            let matchCount = 0;

            for (const item of unmatched) {
                const match = psResults.find(p =>
                    p.name.toLocaleLowerCase('tr-TR').trim() === item.name.toLocaleLowerCase('tr-TR').trim()
                );

                if (match) {
                    const table = activeTab === 'branches' ? 'branches' :
                        activeTab === 'customers' ? 'customers' :
                            activeTab === 'products' ? 'paid_products' : 'biocidal_products';

                    await supabase.from(table).update({ parasut_id: parseInt(match.id) }).eq('id', item.id);
                    matchCount++;
                }
            }

            if (matchCount > 0) {
                toast.success(`${matchCount} kayıt otomatik eşleştirildi!`);
                fetchItems();
            } else {
                toast.info('Tam eşleşen kayıt bulunamadı.');
            }
        } catch (err: any) {
            toast.error('Otomatik eşleştirme hatası: ' + err.message);
        } finally {
            setAutoMatching(false);
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
            item.secondary_info?.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));

        if (!matchesSearch) return false;

        if (statusFilter === 'matched') return item.parasut_id !== null;
        if (statusFilter === 'unmatched') return item.parasut_id === null;
        return true;
    });

    const displayedParasutResults = parasutResults.filter(p => {
        if (!parasutSearch.trim()) return true;
        const searchArr = parasutSearch.toLocaleLowerCase('tr-TR').split(' ');
        const targetStr = `${p.name} ${p.code || ''} ${p.id}`.toLocaleLowerCase('tr-TR');
        return searchArr.every(word => targetStr.includes(word));
    });

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 flex gap-6 relative">
            <div className={`flex-1 transition-all duration-300 ${showParasutPanel ? 'mr-96' : ''}`}>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <RefreshCw className="text-blue-600" />
                            Paraşüt ID Eşleştirme
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Sistemdeki kayıtları Paraşüt üzerindeki ID'leri ile eşleştirin.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                            {[
                                { id: 'branches', label: 'Şubeler', icon: Building },
                                { id: 'customers', label: 'Müşteriler', icon: Users },
                                { id: 'products', label: 'Malzemeler', icon: Package },
                                { id: 'biocidal', label: 'Biyosidal', icon: Cloud },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as MappingType)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <tab.icon size={16} /> <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={autoMatchExact}
                            disabled={autoMatching || loading}
                            className="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-100 transition-all disabled:opacity-50"
                        >
                            {autoMatching ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                            <span className="hidden md:inline">Otomatik Eşleştir</span>
                        </button>

                        <button
                            onClick={() => setShowParasutPanel(!showParasutPanel)}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${showParasutPanel ? 'bg-blue-50 border-blue-200 text-blue-600 ring-2 ring-blue-500' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            title="Paraşüt'te Ara"
                        >
                            <Cloud size={20} />
                            <span className="hidden md:inline font-semibold text-sm">Paraşüt'te Ara</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Sistem içinde ara..."
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="flex p-1 bg-gray-100 rounded-lg shrink-0">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Hepsi
                                </button>
                                <button
                                    onClick={() => setStatusFilter('unmatched')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${statusFilter === 'unmatched' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Eksik
                                </button>
                                <button
                                    onClick={() => setStatusFilter('matched')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${statusFilter === 'matched' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Eşleşen
                                </button>
                            </div>
                        </div>
                        <div className="text-xs font-medium text-gray-500 whitespace-nowrap">
                            {filteredItems.length} kayıt listeleniyor
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider font-semibold border-b border-gray-100">
                                    <th className="px-6 py-4">Sistem Adı / Detay</th>
                                    <th className="px-6 py-4">Sistem ID</th>
                                    <th className="px-6 py-4 w-48 text-blue-600">Paraşüt ID</th>
                                    <th className="px-6 py-4 w-20 text-center">Durum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                            <RefreshCw className="animate-spin inline-block mr-2" /> Yükleniyor...
                                        </td>
                                    </tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                            Kayıt bulunamadı.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map(item => (
                                        <tr
                                            key={item.id}
                                            onClick={() => handleRowClick(item)}
                                            className={`transition-colors group cursor-pointer ${selectedId === item.id ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50/80 border-l-4 border-l-transparent'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                                                {item.secondary_info && (
                                                    <div className="text-xs text-gray-500 mt-0.5">{item.secondary_info}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                                                    {item.id.slice(0, 8)}...
                                                </span>
                                            </td>
                                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                <div className="relative flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={item.parasut_id || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setItems(prev => prev.map(i => i.id === item.id ? { ...i, parasut_id: val ? parseInt(val) : null } : i));
                                                        }}
                                                        onBlur={(e) => updateParasutId(item.id, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                (e.target as HTMLInputElement).blur();
                                                            }
                                                        }}
                                                        placeholder="ID Giriniz"
                                                        className="w-full bg-blue-50/30 border border-blue-100 rounded-lg px-3 py-1.5 text-sm font-semibold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    />
                                                    {item.parasut_id && (
                                                        <button
                                                            onClick={() => updateParasutId(item.id, null)}
                                                            className="absolute right-10 text-gray-400 hover:text-red-500 transition-colors"
                                                            title="ID Sil"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                    {savingId === item.id && (
                                                        <RefreshCw className="animate-spin text-blue-500 shrink-0" size={14} />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {item.parasut_id ? (
                                                    <div className="flex justify-center" title="Eşleşti">
                                                        <CheckCircle2 size={18} className="text-green-500" />
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center" title="Eksik">
                                                        <AlertCircle size={18} className="text-amber-400" />
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 mt-6 flex gap-4 items-start">
                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600 shrink-0">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h3 className="text-blue-900 font-bold mb-1 text-base">İpucu: Hızlı Eşleştirme</h3>
                        <p className="text-blue-700 text-sm leading-relaxed">
                            Tablodan bir satıra tıkladığınızda sağ taraf otomatik olarak o ismi arar.
                            Yan taraftaki sonuçlardan <strong>"Eşleştir"</strong> butonuna basarak tek tıkla kaydı tamamlayabilirsiniz.
                        </p>
                    </div>
                </div>
            </div>

            {/* Paraşüt Search Panel (Right Sidebar) */}
            <div className={`fixed top-0 right-0 h-screen w-[420px] bg-white shadow-2xl border-l border-gray-200 z-[60] transition-transform duration-300 ease-in-out transform ${showParasutPanel ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full flex flex-col min-h-0">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-600 shrink-0">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Cloud size={20} />
                            Paraşüt'te Ara
                        </h2>
                        <button
                            onClick={() => setShowParasutPanel(false)}
                            className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4 flex flex-col min-h-0 h-full">
                        {selectedId && (
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl shrink-0">
                                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Şu an seçili olan kayıt:</div>
                                <div className="font-bold text-gray-900">{items.find(i => i.id === selectedId)?.name}</div>
                                <div className="text-xs text-gray-500 mt-1 italic">Aşağıdaki sonuçlardan uygun olanı bulup "EŞLEŞTİR" butonuna basın.</div>
                            </div>
                        )}

                        <div className="space-y-2 shrink-0">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Paraşüt {(activeTab === 'products' || activeTab === 'biocidal') ? 'Ürün/Hizmet' : 'Müşteri'} Adı
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="İsim giriniz..."
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                        value={parasutSearch}
                                        onChange={(e) => setParasutSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && searchInParasut()}
                                    />
                                </div>
                                <button
                                    onClick={() => searchInParasut(false)}
                                    disabled={parasutLoading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-all disabled:opacity-50"
                                >
                                    {parasutLoading ? <RefreshCw className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 custom-scrollbar">
                            <div className="space-y-3 pb-8">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Paraşüt Sonuçları</div>
                                {parasutLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
                                    ))
                                ) : displayedParasutResults.length > 0 ? (
                                    displayedParasutResults.map(p => (
                                        <div key={p.id} className="p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-md transition-all group">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-gray-900 text-sm truncate">{p.name}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded">ID: {p.id}</span>
                                                        {p.code && <span className="text-[10px] text-gray-400 font-mono border border-gray-100 px-1.5 py-0.5 rounded">Kod: {p.code}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(p.id);
                                                            toast.info(`${p.id} kopyalandı!`);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="ID Kopyala"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    {selectedId && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateParasutId(selectedId, p.id);
                                                            }}
                                                            className="px-4 py-2 bg-blue-600 text-white text-xs font-black rounded-lg hover:bg-orange-500 shadow-lg transition-all flex items-center gap-1 uppercase tracking-tighter"
                                                            title="Bu kaydı seçili öğe ile eşleştir"
                                                        >
                                                            EŞLEŞTİR
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : parasutSearch && !parasutLoading ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <Cloud className="mx-auto mb-2 opacity-20" size={48} />
                                        <p className="text-sm">Sonuç bulunamadı.</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-400">
                                        <Search className="mx-auto mb-2 opacity-20" size={48} />
                                        <p className="text-sm">Paraşüt'teki kayıtları bulmak için arama yapın.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showParasutPanel && (
                <div
                    className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[55] transition-opacity"
                    onClick={() => setShowParasutPanel(false)}
                />
            )}
        </div>
    );
};

export default AdminParasutMapping;
