import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import {
    Search, FileText, Mail, DollarSign, RefreshCw,
    User, Building2, Printer, ChevronRight, TrendingUp, TrendingDown,
    AlertCircle, ExternalLink, Calendar, Info, Send,
    MessageSquare
} from 'lucide-react';
import { format, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { sendEmail } from '../lib/emailClient';

// --- Types ---
interface ParasutTransaction {
    id?: string;
    date: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    type: string;
    is_adjustment?: boolean;
}

interface CustomerMatch {
    id: string;
    name: string;
    balance: number;
    email?: string;
    reconciliation_email?: string;
    tax_number?: string;
    tax_office?: string;
    auto_reconciliation?: boolean;
    auto_reconciliation_day?: number;
    auto_reconciliation_period?: string;
}

// --- Components ---

const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

const StatCard = ({ title, value, icon: Icon, color, subtitle }: {
    title: string, value: string, icon: any, color: string, subtitle?: string
}) => (
    <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
            {subtitle && <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{subtitle}</span>}
        </div>
        <h3 className="text-sm font-semibold text-gray-500 mb-1">{title}</h3>
        <p className={`text-2xl font-bold tabular-nums tracking-tight`}>{value}</p>
    </div>
);

const AdminReconciliation = () => {
    // --- State ---
    const [customers, setCustomers] = useState<CustomerMatch[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerMatch | null>(null);
    const [transactions, setTransactions] = useState<ParasutTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [reconciling, setReconciling] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [sendingEmail, setSendingEmail] = useState(false);
    const [isAutoSettingsOpen, setIsAutoSettingsOpen] = useState(false);
    const [autoDayInput, setAutoDayInput] = useState(5);
    const [autoPeriodInput, setAutoPeriodInput] = useState('previous_month');

    // --- Effects ---
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchParasutCustomers(searchQuery);
        }, searchQuery ? 500 : 0);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (selectedCustomer) {
            fetchStatement(selectedCustomer, dateRange.start, dateRange.end);
        }
    }, [dateRange.start, dateRange.end]);

    // --- Data Fetching ---
    const fetchParasutCustomers = async (query = '') => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('parasut-fetch', {
                body: {
                    path: query
                        ? `contacts?filter[query]=${encodeURIComponent(query)}&page[size]=25`
                        : 'contacts?page[size]=25',
                    raw: true
                }
            });

            if (error) throw error;

                const contactsArray = data?.data || [];
                if (data?.success && Array.isArray(contactsArray)) {
                    const parasutIds = contactsArray.map((c: any) => parseInt(c.id)).filter(Boolean);
                    
                    // Fetch local reconciliation emails
                    const { data: localData } = await supabase
                        .from('customers')
                        .select('parasut_id, reconciliation_email, auto_reconciliation, auto_reconciliation_day, auto_reconciliation_period')
                        .in('parasut_id', parasutIds);

                    const localMap = new Map((localData || []).map(l => [l.parasut_id, l]));

                    const mapped = contactsArray
                        .filter((c: any) => c && (c.name || c.full_name))
                        .map((c: any) => ({
                            id: c.id,
                            name: c.name || c.full_name || 'İsimsiz Müşteri',
                            balance: parseFloat(c.balance || c.trl_balance || 0),
                            email: c.email,
                            reconciliation_email: localMap.get(parseInt(c.id))?.reconciliation_email,
                            auto_reconciliation: localMap.get(parseInt(c.id))?.auto_reconciliation || false,
                            auto_reconciliation_day: localMap.get(parseInt(c.id))?.auto_reconciliation_day || 5,
                            auto_reconciliation_period: localMap.get(parseInt(c.id))?.auto_reconciliation_period || 'previous_month',
                            tax_number: c.tax_number,
                            tax_office: c.tax_office
                        }));
                    setCustomers(mapped);
                } else {
                toast.error('Müşteriler yüklenemedi');
            }
        } catch (error) {
            console.error(error);
            toast.error('Bağlantı hatası');
        } finally {
            setLoading(false);
        }
    };

    const fetchStatement = async (customer: CustomerMatch, start?: string, end?: string) => {
        setReconciling(true);
        try {
            const { data, error } = await supabase.functions.invoke('parasut-fetch', {
                body: {
                    type: 'contact_statement',
                    contact_id: customer.id,
                    start_date: start,
                    end_date: end
                }
            });

            if (error) throw error;

            if (data.success) {
                setTransactions(data.data);
                if (data.debug?.official_balance !== undefined) {
                    setSelectedCustomer(prev => prev ? { ...prev, balance: data.debug.official_balance } : null);
                }
            } else {
                toast.error('Ekstre dökümü alınamadı');
            }
        } catch (error) {
            console.error(error);
            toast.error('Ekstre hatası');
        } finally {
            setReconciling(false);
        }
    };

    // --- Handlers ---
    const handleToggleAutoReconciliation = async (customer: CustomerMatch) => {
        const newValue = !customer.auto_reconciliation;
        try {
            const { error } = await supabase
                .from('customers')
                .update({ auto_reconciliation: newValue })
                .eq('parasut_id', parseInt(customer.id));

            if (error) throw error;

            setCustomers(prev => prev.map(c => 
                c.id === customer.id ? { ...c, auto_reconciliation: newValue } : c
            ));
            setSelectedCustomer(prev => prev?.id === customer.id ? { ...prev, auto_reconciliation: newValue } : prev);
            
            toast.success(`Otomatik mutabakat ${newValue ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`);
            
            if (newValue) {
                setAutoDayInput(customer.auto_reconciliation_day || 5);
                setAutoPeriodInput(customer.auto_reconciliation_period || 'previous_month');
                setIsAutoSettingsOpen(true);
            }
        } catch (err: any) {
            toast.error('Giriş güncellenemedi: ' + err.message);
        }
    };

    const handleUpdateAutoSettings = async () => {
        if (!selectedCustomer) return;
        try {
            const { error } = await supabase
                .from('customers')
                .update({ 
                    auto_reconciliation_day: autoDayInput,
                    auto_reconciliation_period: autoPeriodInput
                })
                .eq('parasut_id', parseInt(selectedCustomer.id));

            if (error) throw error;

            setCustomers(prev => prev.map(c => 
                c.id === selectedCustomer.id 
                    ? { ...c, auto_reconciliation_day: autoDayInput, auto_reconciliation_period: autoPeriodInput } 
                    : c
            ));
            setSelectedCustomer(prev => prev ? { 
                ...prev, 
                auto_reconciliation_day: autoDayInput, 
                auto_reconciliation_period: autoPeriodInput 
            } : null);
            
            toast.success('Ayarlar kaydedildi');
            setIsAutoSettingsOpen(false);
        } catch (err: any) {
            toast.error('Ayarlar güncellenemedi: ' + err.message);
        }
    };

    const handleTestAutoReconciliation = async () => {
        if (!selectedCustomer) return;
        
        const promise = (async () => {
            const { data, error } = await supabase.functions.invoke('parasut-auto-reconciliation', {
                body: { test_customer_id: selectedCustomer.id }
            });

            if (error) {
                console.error('Function invocation error:', error);
                throw error;
            }

            if (!data.success) {
                throw new Error(data.message || 'Test başarısız oldu');
            }

            if (data.results?.[0]?.status === 'error') {
                throw new Error(data.results[0].error || 'Mail gönderim hatası');
            }

            return data;
        })();

        toast.promise(promise, {
            loading: 'Test e-postası hazırlanıyor ve gönderiliyor...',
            success: 'Test e-postası başarıyla gönderildi!',
            error: (err) => `Test başarısız: ${err.message || 'Bağlantı hatası'}`
        });
    };

    const handleCustomerSelect = (c: CustomerMatch) => {
        setSelectedCustomer(c);
        setEmailInput(c.reconciliation_email || c.email || '');
        fetchStatement(c, dateRange.start, dateRange.end);
    };

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
    };

    // --- Memoized Data ---
    const filteredCustomers = useMemo(() => {
        // If we have a query, server already filtered. 
        // We still filter locally for ultra-snappiness on what's already in memory.
        return customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [customers, searchQuery]);

    const filteredTransactions = useMemo(() => {
        let list = transactions;
        if (dateRange.start) list = list.filter(t => t.date >= dateRange.start);
        if (dateRange.end) list = list.filter(t => t.date <= dateRange.end);
        return list;
    }, [transactions, dateRange]);

    const stats = useMemo(() => {
        const debitTotal = filteredTransactions.reduce((acc, t) => acc + (t.debit || 0), 0);
        const creditTotal = filteredTransactions.reduce((acc, t) => acc + (t.credit || 0), 0);
        
        // Use the balance from the most recent transaction as the baseline balance
        // If no transactions, fall back to the customer's cached balance.
        const currentBalance = filteredTransactions.length > 0 
            ? filteredTransactions[0].balance 
            : (selectedCustomer?.balance || 0);

        return {
            debit: debitTotal,
            credit: creditTotal,
            balance: currentBalance
        };
    }, [filteredTransactions, selectedCustomer]);

    // --- Render ---
    return (
        <div className="min-h-screen bg-[#F9FAFB] text-gray-900 pb-12 print:bg-white print:pb-0">
            {/* Header */}
            <div className="max-w-[1600px] mx-auto px-6 py-8 print:hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <img src="/ilaclamatik-logo.png" alt="İlaçlamatik" className="h-16 md:h-20 object-contain" />
                        <div className="w-px h-10 bg-gray-200" />
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3 italic">
                                PestMentor
                            </h1>
                            <p className="text-gray-500 font-medium text-xs uppercase tracking-widest leading-loose">
                                SİSTEM İLAÇLAMA <span className="mx-2 text-gray-300">|</span> Mutabakat Yönetimi
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link 
                            to="/admin/mutabakat-yanitlari"
                            className="flex items-center gap-2 bg-white text-slate-700 border-2 border-slate-100 px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95"
                        >
                            <MessageSquare className="w-5 h-5 text-indigo-500" />
                            Mutabakat Yanıtları
                        </Link>
                        <button
                            onClick={() => setIsEmailModalOpen(true)}
                            disabled={!selectedCustomer}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:bg-gray-400"
                        >
                            <Send className="w-4 h-4" />
                            Mutabakat Gönder
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-white text-gray-700 px-5 py-2.5 rounded-xl border border-gray-200 font-semibold shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
                        >
                            <Printer className="w-4 h-4" />
                            Ekstre Yazdır
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 flex flex-col lg:flex-row gap-8 print:p-0 print:block">

                {/* Sidebar - Customer List */}
                <div className="w-full lg:w-96 flex-shrink-0 print:hidden">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[750px]">
                        <div className="p-5 border-b border-gray-50 bg-gray-50/30">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Müşteri ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                            {loading ? (
                                Array(6).fill(0).map((_, i) => (
                                    <div key={i} className="p-4 bg-gray-50/50 rounded-xl space-y-3">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                ))
                            ) : filteredCustomers.length > 0 ? (
                                filteredCustomers.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleCustomerSelect(c)}
                                        className={`w-full text-left p-4 rounded-xl transition-all duration-200 group flex items-center justify-between ${selectedCustomer?.id === c.id
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]'
                                            : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold truncate text-sm mb-1">{c.name}</div>
                                            <div className={`text-xs ${selectedCustomer?.id === c.id ? 'text-indigo-100' : 'text-gray-400'}`}>
                                                Bakiye: <span className="font-semibold">{formatCurrency(c.balance)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {c.auto_reconciliation && (
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200" title="Otomatik Mutabakat Aktif" />
                                            )}
                                            <ChevronRight className={`w-4 h-4 transition-transform ${selectedCustomer?.id === c.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-12 px-6">
                                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p className="text-gray-400 text-sm">Müşteri bulunamadı</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content - Statement Table */}
                <div className="flex-1 min-w-0 print:m-0 print:p-0">
                    {!selectedCustomer ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-20 text-center flex flex-col items-center justify-center min-h-[500px] h-full">
                            <div className="bg-indigo-50 p-6 rounded-full mb-6">
                                <User className="w-12 h-12 text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Mutabakat Başlatın</h2>
                            <p className="text-gray-500 max-w-sm">Sol taraftaki listeden bir müşteri seçerek güncel ekstre dökümünü ve bakiye durumunu görüntüleyin.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Selected Customer Card */}
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between gap-8 items-start md:items-center">
                                <div className="flex gap-5 items-center">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                                        <Building2 className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{selectedCustomer.name}</h2>
                                        <div className="flex items-center gap-4 mt-2 text-sm font-medium text-gray-500">
                                            <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {selectedCustomer.tax_office || '—'} {selectedCustomer.tax_number || ''}</span>
                                            {selectedCustomer.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {selectedCustomer.email}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 print:hidden">
                                    <div className="flex items-center bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden group">
                                        <button 
                                            onClick={() => handleToggleAutoReconciliation(selectedCustomer)}
                                            className={`flex items-center gap-2 px-4 py-2.5 font-bold transition-all ${
                                                selectedCustomer.auto_reconciliation 
                                                    ? 'bg-emerald-500 text-white' 
                                                    : 'text-slate-400 hover:bg-slate-50'
                                            }`}
                                        >
                                            <RefreshCw className={`w-4 h-4 ${selectedCustomer.auto_reconciliation ? 'animate-spin-slow' : ''}`} />
                                            {selectedCustomer.auto_reconciliation ? 'Otomatik Aktif' : 'Otomatik Pasif'}
                                        </button>
                                        {selectedCustomer.auto_reconciliation && (
                                            <button 
                                                onClick={() => {
                                                    setAutoDayInput(selectedCustomer.auto_reconciliation_day || 5);
                                                    setAutoPeriodInput(selectedCustomer.auto_reconciliation_period || 'previous_month');
                                                    setIsAutoSettingsOpen(true);
                                                }}
                                                className="px-3 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors border-l border-emerald-400"
                                                title="Otomatik Mutabakat Ayarları"
                                            >
                                                <Info className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <button className="p-2.5 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"><Mail className="w-4 h-4" /></button>
                                    <button className="p-2.5 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"><ExternalLink className="w-4 h-4" /></button>
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard
                                    title="Toplam Borç"
                                    value={formatCurrency(stats.debit)}
                                    icon={TrendingUp}
                                    color="bg-rose-500"
                                    subtitle="Faturalar"
                                />
                                <StatCard
                                    title="Toplam Alacak"
                                    value={formatCurrency(stats.credit)}
                                    icon={TrendingDown}
                                    color="bg-emerald-500"
                                    subtitle="Ödemeler"
                                />
                                <StatCard
                                    title="Güncel Bakiye"
                                    value={formatCurrency(stats.balance)}
                                    icon={DollarSign}
                                    color="bg-indigo-600"
                                    subtitle="Gerçek Zamanlı"
                                />
                            </div>

                            {/* Filters & Table */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                <div className="p-5 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4 bg-gray-50/10 print:hidden">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <input
                                                type="date"
                                                className="text-sm bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                            />
                                            <span className="text-gray-300 mx-1">/</span>
                                            <input
                                                type="date"
                                                className="text-sm bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                            />
                                        </div>
                                        <button
                                            onClick={() => fetchStatement(selectedCustomer)}
                                            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                            disabled={reconciling}
                                        >
                                            <RefreshCw className={`w-4 h-4 ${reconciling ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${stats.balance > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {stats.balance > 0 ? 'BORÇLU DURUM' : 'ALACAKLI DURUM'}
                                        </span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead>
                                            <tr className="bg-gray-50/50">
                                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Tarih</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Açıklama</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Borç</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Alacak</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Bakiye</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {reconciling ? (
                                                Array(8).fill(0).map((_, i) => (
                                                    <tr key={i}>
                                                        {Array(5).fill(0).map((_, j) => (
                                                            <td key={j} className="px-6 py-4"><Skeleton className="h-4 w-full" /></td>
                                                        ))}
                                                    </tr>
                                                ))
                                            ) : filteredTransactions.length > 0 ? (
                                                filteredTransactions.map((t, idx) => (
                                                    <tr key={idx} className={`hover:bg-gray-50/50 transition-colors ${t.is_adjustment ? 'bg-amber-50/30' : ''}`}>
                                                        <td className="px-6 py-4 text-sm font-semibold text-gray-500 whitespace-nowrap tabular-nums">
                                                            {format(new Date(t.date), 'dd MMM yyyy', { locale: tr })}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-lg ${t.type === 'sales_invoice' ? 'bg-indigo-50 text-indigo-500' :
                                                                    t.type === 'payment' ? 'bg-emerald-50 text-emerald-500' :
                                                                        t.type === 'opening_balance' ? 'bg-amber-50 text-amber-600' :
                                                                            t.type === 'customer_return' || t.type === 'supplier_return' ? 'bg-rose-50 text-rose-500' :
                                                                                'bg-gray-50 text-gray-500'
                                                                    }`}>
                                                                    {t.type === 'sales_invoice' ? <FileText className="w-4 h-4" /> :
                                                                        t.type === 'payment' ? <DollarSign className="w-4 h-4" /> :
                                                                            t.type === 'opening_balance' ? <FileText className="w-4 h-4" /> :
                                                                                t.type.includes('return') ? <TrendingDown className="w-4 h-4" /> :
                                                                                    <Info className="w-4 h-4" />}
                                                                </div>
                                                                <span className={`text-sm font-medium ${t.type === 'opening_balance' ? 'text-amber-700 font-bold' : t.is_adjustment ? 'text-amber-700 italic' : 'text-gray-900 uppercase'}`}>
                                                                    {t.description}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-bold text-right text-rose-600 tabular-nums whitespace-nowrap">
                                                            {t.debit > 0 ? formatCurrency(t.debit) : '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-bold text-right text-emerald-600 tabular-nums whitespace-nowrap">
                                                            {t.credit > 0 ? formatCurrency(t.credit) : '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-black text-right text-gray-900 tabular-nums whitespace-nowrap">
                                                            {formatCurrency(t.balance)}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                                                        Bu tarih aralığında hareket bulunamadı.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {filteredTransactions.length > 0 && (
                                            <tfoot>
                                                <tr className="bg-gray-50 font-bold border-t-2 border-gray-100">
                                                    <td colSpan={2} className="px-6 py-5 text-gray-900 text-sm uppercase tracking-wide">Genel Toplamlar</td>
                                                    <td className="px-6 py-5 text-right text-rose-600 text-lg tabular-nums">{formatCurrency(stats.debit)}</td>
                                                    <td className="px-6 py-5 text-right text-emerald-600 text-lg tabular-nums">{formatCurrency(stats.credit)}</td>
                                                    <td className="px-6 py-5 text-right text-indigo-600 text-lg tabular-nums">{formatCurrency(stats.balance)}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            {/* Footer Info */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 bg-indigo-50/30 rounded-2xl border border-indigo-100 print:hidden">
                                <div className="flex items-center gap-3 text-sm text-indigo-700 font-medium">
                                    <AlertCircle className="w-5 h-5" />
                                    <span>Paraşüt API v4 üzerinden canlı olarak hesaplanmaktadır.</span>
                                </div>
                                <div className="text-xs text-gray-400 font-medium">
                                    Son Senkronizasyon: {new Date().toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reconciliation Email Modal */}
            {isEmailModalOpen && selectedCustomer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                                    <Mail className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Mutabakat Mektubu</h2>
                                    <p className="text-sm text-gray-500 font-medium">{selectedCustomer.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsEmailModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">&times;</button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700">Mutabakat Dönemi Seçin</label>
                                <div className="grid grid-cols-1 gap-4">
                                    <input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Seçilen ayın sonundaki bakiye otomatik olarak hesaplanacak ve müşteriye onay için gönderilecektir.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700">Mutabakat E-posta Adresi</label>
                                <input
                                    type="email"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    placeholder="ornek@mail.com"
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                                <p className="text-xs text-indigo-400 font-medium">Bu mail adresi kaydedilecek ve bir sonraki mutabakatta otomatik gelecektir.</p>
                            </div>

                            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-3">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="font-medium text-gray-700">Dönem Sonu Bakiye:</span>
                                    <span className="font-black text-gray-900 tabular-nums">
                                        {(() => {
                                            const end = endOfMonth(new Date(selectedMonth + '-01'));
                                            const monthEndStr = format(end, 'yyyy-MM-dd');
                                            // Find last transaction before or on month end
                                            const lastTx = [...transactions].reverse().filter(t => t.date <= monthEndStr).pop();
                                            return formatCurrency(lastTx?.balance || 0);
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50/50 flex gap-4">
                            <button
                                onClick={() => setIsEmailModalOpen(false)}
                                className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition-all active:scale-95"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={async () => {
                                    if (!emailInput) {
                                        toast.error('Lütfen bir e-posta adresi giriniz!');
                                        return;
                                    }
                                    setSendingEmail(true);
                                    try {
                                        const pId = parseInt(selectedCustomer.id);
                                        
                                        // 1. Ensure customer exists in local "customers" table and update email
                                        let { data: localCust } = await supabase
                                            .from('customers')
                                            .select('id')
                                            .eq('parasut_id', pId)
                                            .maybeSingle();
                                        
                                        let localCustId = localCust?.id;

                                        if (!localCustId) {
                                            // Create new local customer record if it doesn't exist
                                            // Using kisa_isim and cari_isim based on other pages
                                            const { data: newCust, error: createError } = await supabase
                                                .from('customers')
                                                .insert({
                                                    parasut_id: pId,
                                                    kisa_isim: selectedCustomer.name,
                                                    cari_isim: selectedCustomer.name,
                                                    reconciliation_email: emailInput
                                                })
                                                .select('id')
                                                .single();
                                            
                                            if (createError) {
                                                console.warn('Customer Create Error:', createError);
                                                // If we can't create (e.g. missing columns), we proceed without localCustId
                                            } else {
                                                localCustId = newCust.id;
                                            }
                                        } else {
                                            // Update existing
                                            const { error: updateError } = await supabase
                                                .from('customers')
                                                .update({ reconciliation_email: emailInput })
                                                .eq('id', localCustId);
                                            
                                            if (updateError) console.warn('Customer Update Error:', updateError);
                                        }

                                        // Update local state to reflect change immediately
                                        setCustomers(prev => prev.map(c => 
                                            c.id === selectedCustomer.id 
                                                ? { ...c, reconciliation_email: emailInput } 
                                                : c
                                        ));

                                        const end = endOfMonth(new Date(selectedMonth + '-01'));
                                        const monthEndStr = format(end, 'yyyy-MM-dd');
                                        const lastTx = [...transactions].reverse().filter(t => t.date <= monthEndStr).pop();
                                        const balance = lastTx?.balance || 0;
                                        const monthName = format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: tr });
                                        
                                        const responseId = crypto.randomUUID();

                                        // 2. Register pending request in DB
                                        // Note: If you get a check constraint error, make sure 'pending' is allowed in the DB.
                                        const { error: regError } = await supabase
                                            .from('reconciliation_responses')
                                            .insert({
                                                token: responseId,
                                                customer_id: localCustId || null,
                                                parasut_id: pId,
                                                month: selectedMonth,
                                                balance: balance,
                                                status: 'pending',
                                                full_name: '(Bekleniyor)'
                                            });

                                        if (regError) {
                                            console.error('Pending Reg Error:', regError);
                                            let errorDetail = regError.message;
                                            if (regError.message.includes('check constraint')) {
                                                errorDetail = "Veritabanı kısıtlaması hatası. Lütfen sistem yöneticisine 'pending status' hatasını iletiniz.";
                                            }
                                            toast.error('Mutabakat kaydı oluşturulamadı: ' + errorDetail);
                                            setSendingEmail(false);
                                            return;
                                        }

                                        const baseUrl = window.location.origin;
                                        const approveUrl = `${baseUrl}/mutabakat-onay?token=${responseId}&type=approve`;
                                        const rejectUrl = `${baseUrl}/mutabakat-onay?token=${responseId}&type=reject`;

                                        const html = `
                                            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937; padding: 20px; background-color: #f9fafb;">
                                                <div style="text-align: center; margin-bottom: 32px; padding-top: 20px;">
                                                    <div style="display: inline-block; width: 64px; height: 64px; background: #059669; border-radius: 20px; padding: 12px; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
                                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/><path d="M12 16L16 12L12 8"/><path d="M8 12H16"/></svg>
                                                    </div>
                                                    <h1 style="color: #064e3b; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -0.025em; text-transform: uppercase;">İLAÇLAMATİK</h1>
                                                    <p style="color: #059669; font-size: 13px; margin-top: 4px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">Güvenli Mutabakat Servisi</p>
                                                </div>

                                                <div style="background: white; border-radius: 32px; border: 1px solid #d1fae5; padding: 40px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);">
                                                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #111827;">Sayın <strong>${selectedCustomer.name}</strong>,</p>
                                                    
                                                    <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 32px;">
                                                        <strong>${monthName}</strong> dönemi sonu itibarıyla kayıtlarımızdaki güncel bakiye durumunuz aşağıda belirtilmiştir.
                                                    </p>
                                                    
                                                    <div style="background-color: #f0fdf4; border-radius: 24px; padding: 32px; margin-bottom: 32px; text-align: center; border: 1px solid #d1fae5;">
                                                        <div style="font-size: 11px; color: #065f46; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px;">Dönem Sonu Bakiyesi</div>
                                                        <div style="font-size: 36px; font-weight: 900; color: #064e3b; margin-bottom: 12px;">${formatCurrency(balance)}</div>
                                                        <div style="display: inline-block; padding: 6px 14px; border-radius: 12px; font-size: 11px; font-weight: 800; background: ${balance >= 0 ? '#fee2e2' : '#dcfce7'}; color: ${balance >= 0 ? '#991b1b' : '#166534'};">
                                                            ${balance >= 0 ? 'BORÇLU' : 'ALACAKLI'} DURUMDASINIZ
                                                        </div>
                                                    </div>

                                                    <div style="margin-top: 8px;">
                                                        <p style="font-size: 13px; font-weight: 800; color: #064e3b; margin-bottom: 16px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">Lütfen Yanıtınızı Bildiriniz:</p>
                                                        
                                                        <table width="100%" cellspacing="0" cellpadding="0">
                                                            <tr>
                                                                <td align="center" style="padding-bottom: 12px;">
                                                                    <a href="${approveUrl}" style="display: block; background-color: #059669; color: #ffffff; padding: 18px 24px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 16px; text-align: center;">
                                                                        BAKİYE DOĞRUDUR
                                                                    </a>
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td align="center">
                                                                    <a href="${rejectUrl}" style="display: block; background-color: #ffffff; color: #374151; border: 2px solid #e5e7eb; padding: 18px 24px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 15px; text-align: center;">
                                                                        BAKİYEDE UYUŞMAZLIK VAR
                                                                    </a>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </div>

                                                    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
                                                        <div style="font-size: 12px; color: #6b7280; line-height: 1.6; margin-bottom: 16px;">
                                                            <strong>Notlar:</strong><br>
                                                            1. Hata ve unutma müstesnadır.<br>
                                                            2. Mutabakat veya itirazınızı bir ay içinde bildirmediğiniz takdirde T.T.K. 94. maddesi gereğince mutabık sayılacağınızı bildiririz.
                                                        </div>
                                                        <p style="font-size: 12px; color: #b91c1c; font-weight: 800; line-height: 1.6; text-align: center; margin: 0; padding: 12px; background-color: #fef2f2; border-radius: 12px; border: 1px solid #fee2e2;">
                                                            LÜTFEN BU E-POSTAYI YANITLAMAYINIZ, YUKARIDAKİ LİNKE TIKLAYARAK CEVAPLAYINIZ.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div style="margin-top: 32px; text-align: center; padding: 0 20px;">
                                                    <p style="font-size: 11px; color: #6b7280; font-weight: 800; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">
                                                        SİSTEM İLAÇLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ
                                                    </p>
                                                    <p style="font-size: 10px; color: #9ca3af; margin: 0; font-weight: 600;">
                                                        İLAÇLAMATİK™ BİR MARKADIR • PestMentor® Hizmet Markası
                                                    </p>
                                                </div>
                                            </div>
                                        `;

                                        await sendEmail(
                                            emailInput,
                                            `${monthName} Mutabakat Talebi - ${selectedCustomer.name}`,
                                            html
                                        );

                                        toast.success('Mutabakat maili başarıyla gönderildi');
                                        setIsEmailModalOpen(false);
                                    } catch (err: any) {
                                        toast.error(err.message || 'Hata oluştu');
                                    } finally {
                                        setSendingEmail(false);
                                    }
                                }}
                                disabled={sendingEmail}
                                className="flex-1 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {sendingEmail ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                Gönder
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Header (Only visible when printing) */}
            <div className="hidden print:block fixed top-0 w-full p-8 border-b-2 border-gray-900">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter">CARİ HESAP EKSTRESİ</h1>
                        <p className="text-gray-500 font-bold mt-2">Döküm Tarihi: {format(new Date(), 'dd MMMM yyyy', { locale: tr })}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold">{selectedCustomer?.name}</h2>
                        <p className="font-medium text-gray-600">{selectedCustomer?.tax_office} / {selectedCustomer?.tax_number}</p>
                    </div>
                </div>
            </div>
            {/* Auto-Reconciliation Settings Modal */}
            {isAutoSettingsOpen && selectedCustomer && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-emerald-100">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-br from-emerald-50 to-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-100">
                                    <RefreshCw className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 leading-none">Otomatik Ayarlar</h2>
                                    <p className="text-xs text-emerald-600 font-bold mt-1.5 uppercase tracking-wider">{selectedCustomer.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAutoSettingsOpen(false)} className="p-2 hover:bg-emerald-100/50 rounded-full transition-colors text-gray-400">&times;</button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-sm font-black text-gray-700 uppercase tracking-wide">
                                    <Calendar className="w-4 h-4 text-emerald-500" />
                                    Her Ayın Hangi Günü?
                                </label>
                                <div className="grid grid-cols-7 gap-2">
                                    {[1, 5, 10, 15, 20, 25, 28].map(day => (
                                        <button
                                            key={day}
                                            onClick={() => setAutoDayInput(day)}
                                            className={`p-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                                                autoDayInput === day 
                                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                                                    : 'bg-gray-50 border-transparent text-gray-400 hover:border-emerald-200'
                                            }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                    <div className="col-span-7 mt-2">
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="31" 
                                            value={autoDayInput}
                                            onChange={(e) => setAutoDayInput(parseInt(e.target.value))}
                                            placeholder="Özel gün (1-31)"
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-center font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 font-medium">Seçilen günde sistem otomatik olarak mutabakat e-postası gönderecektir.</p>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-sm font-black text-gray-700 uppercase tracking-wide">
                                    <Info className="w-4 h-4 text-emerald-500" />
                                    Hangi Dönem Bakiyesi?
                                </label>
                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => setAutoPeriodInput('previous_month')}
                                        className={`p-4 rounded-2xl text-left transition-all border-2 ${
                                            autoPeriodInput === 'previous_month' 
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900' 
                                                : 'bg-gray-50 border-transparent text-gray-500'
                                        }`}
                                    >
                                        <div className="font-bold">Önceki Ay Bakiyesi</div>
                                        <div className="text-xs opacity-70">Uygulama tarihi itibarıyla biten bir önceki ayın ekstresini gönderir.</div>
                                    </button>
                                    <button
                                        onClick={() => setAutoPeriodInput('current_month')}
                                        className={`p-4 rounded-2xl text-left transition-all border-2 ${
                                            autoPeriodInput === 'current_month' 
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900' 
                                                : 'bg-gray-50 border-transparent text-gray-500'
                                        }`}
                                    >
                                        <div className="font-bold">Güncel Bakiye</div>
                                        <div className="text-xs opacity-70">Uygulama tarihindeki anlık resmi bakiyeyi gönderir.</div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50/50 flex flex-col gap-4">
                            <button
                                onClick={handleTestAutoReconciliation}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-emerald-500 text-emerald-600 rounded-2xl font-black hover:bg-emerald-50 transition-all active:scale-95"
                            >
                                <Mail className="w-5 h-5" />
                                ŞİMDİ TEST ET (MAİL GÖNDER)
                            </button>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsAutoSettingsOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-600 hover:bg-gray-200 transition-all mt-auto"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    onClick={handleUpdateAutoSettings}
                                    className="flex-[2] bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                                >
                                    Ayarları Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReconciliation;
