import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    CheckCircle2, XCircle, Search, Calendar, 
    ArrowLeft, User, MessageSquare,
    RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

interface ReconciliationResponse {
    id: string;
    customer_id: string;
    parasut_id: number;
    month: string;
    balance: number;
    status: 'approved' | 'rejected';
    full_name: string;
    unit: string;
    message: string;
    created_at: string;
    customers?: {
        cari_isim: string;
    };
}

const AdminReconciliationResponses: React.FC = () => {
    const [responses, setResponses] = useState<ReconciliationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');

    useEffect(() => {
        fetchResponses();
    }, []);

    const fetchResponses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('reconciliation_responses')
                .select('*, customers(cari_isim)')
                .neq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setResponses(data || []);
        } catch (err: any) {
            toast.error('Yanıtlar yüklenemedi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredResponses = responses.filter(r => {
        const customerName = r.customers?.cari_isim || '';
        const matchesSearch = r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (r.message && r.message.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-4 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <img src="/ilaclamatik-logo.png" alt="İlaçlamatik" className="h-10 md:h-12 object-contain" />
                    <div className="w-px h-8 bg-gray-200" />
                    <div>
                        <Link to="/admin/mutabakat" className="inline-flex items-center gap-1.5 text-indigo-600 font-bold text-xs mb-0.5 hover:gap-2 transition-all uppercase tracking-widest">
                            <ArrowLeft className="w-3 h-3" />
                            Panel
                        </Link>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight italic leading-none">PestMentor</h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                            Mutabakat Yanıtları
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={fetchResponses}
                        className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                        title="Yenile"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm">
                        Canlı Liste
                    </div>
                </div>
            </div>

            {/* Compact Stats Overview */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">Toplam</div>
                        <div className="text-xl font-black text-gray-900 leading-none">{responses.length}</div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">Mutabık</div>
                        <div className="text-xl font-black text-emerald-600 leading-none">
                            {responses.filter(r => r.status === 'approved').length}
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
                        <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">Uyuşmazlık</div>
                        <div className="text-xl font-black text-rose-600 leading-none">
                            {responses.filter(r => r.status === 'rejected').length}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="İsim veya notlarda ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-100 transition-all"
                    />
                </div>
                <div className="flex gap-1 p-1 bg-gray-50 rounded-xl border border-gray-100 shrink-0">
                    <button 
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Tümü
                    </button>
                    <button 
                        onClick={() => setStatusFilter('approved')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'approved' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Mutabık
                    </button>
                    <button 
                        onClick={() => setStatusFilter('rejected')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'rejected' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Uyuşmazlık
                    </button>
                </div>
            </div>

            {/* Compact Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Müşteri Bilgisi</th>
                            <th className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Dönem</th>
                            <th className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Yanıtlayan</th>
                            <th className="px-5 py-4 text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest">Durum</th>
                            <th className="px-5 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-widest">Görüş/Not</th>
                            <th className="px-5 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-widest">Tarih</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-8 py-20 text-center">
                                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Veriler Güncelleniyor...</span>
                                </td>
                            </tr>
                        ) : filteredResponses.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-8 py-20 text-center text-gray-400 text-sm font-semibold italic">
                                    Kriterlere uygun yanıt bulunamadı.
                                </td>
                            </tr>
                        ) : filteredResponses.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="px-5 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate max-w-[240px]">
                                            {r.customers?.cari_isim || `P-ID: ${r.parasut_id}`}
                                        </span>
                                        <span className="text-[11px] font-medium text-gray-400">P-ID: {r.parasut_id}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {r.month}
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 shrink-0 border border-gray-100 group-hover:bg-white transition-colors">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-gray-800 leading-tight truncate">{r.full_name}</div>
                                            <div className="text-[11px] text-gray-500 font-medium truncate">
                                                {r.unit || 'Birim Belirtilmemiş'}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-center">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide ${
                                        r.status === 'approved' 
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                                    }`}>
                                        {r.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                        {r.status === 'approved' ? 'Mutabık' : 'Uyuşmazlık'}
                                    </span>
                                </td>
                                <td className="px-5 py-4 max-w-[240px]">
                                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                                        {r.message || <span className="text-gray-300 italic">Not bırakılmamış</span>}
                                    </p>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <div className="flex flex-col items-end leading-tight gap-1">
                                        <span className="text-sm font-bold text-gray-900">{format(new Date(r.created_at), 'd MMM yyyy', { locale: tr })}</span>
                                        <span className="text-xs font-medium text-gray-400">{format(new Date(r.created_at), 'HH:mm')}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminReconciliationResponses;
