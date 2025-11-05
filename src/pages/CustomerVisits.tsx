import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Calendar, CheckCircle, Clock, X, User, Building, FileText, Loader2, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

// --- ARAYÜZLER (INTERFACES) ---
interface Visit {
  id: string;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
  visit_type: string;
  report_number: string | null;
  notes: string | null;
  branch: { sube_adi: string } | null;
  operator: { name: string } | null;
}

// --- YARDIMCI BİLEŞENLER ---
const VisitCard: React.FC<{ visit: Visit }> = ({ visit }) => {
    const statusConfig = {
        planned: { icon: Clock, color: 'border-yellow-500 bg-yellow-50', textColor: 'text-yellow-700', text: 'Planlandı' },
        completed: { icon: CheckCircle, color: 'border-green-500 bg-green-50', textColor: 'text-green-700', text: 'Tamamlandı' },
        cancelled: { icon: X, color: 'border-red-500 bg-red-50', textColor: 'text-red-700', text: 'İptal Edildi' },
    };
    const currentStatus = statusConfig[visit.status] || { icon: Info, color: 'border-gray-500 bg-gray-50', textColor: 'text-gray-700', text: 'Bilinmiyor' };
    const Icon = currentStatus.icon;

    return (
        <div className={`p-5 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 bg-white border-l-4 ${currentStatus.color}`}>
            <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                    <p className="font-bold text-lg text-gray-800">{visit.branch?.sube_adi || 'Genel Merkez'}</p>
                    <p className="text-sm text-gray-500">{format(new Date(visit.visit_date), 'dd MMMM yyyy, HH:mm', { locale: tr })}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${currentStatus.color} ${currentStatus.textColor}`}>
                    <Icon size={14} />
                    {currentStatus.text}
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                    <p className="text-xs text-gray-400 font-semibold">OPERATÖR</p>
                    <p className="flex items-center gap-2 mt-1"><User size={14} /> {visit.operator?.name || 'Atanmadı'}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-400 font-semibold">ZİYARET TÜRÜ</p>
                    <p className="mt-1">{visit.visit_type || 'Belirtilmemiş'}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-400 font-semibold">RAPOR NO</p>
                    <p className="flex items-center gap-2 mt-1 font-mono"><FileText size={14} /> {visit.report_number || '-'}</p>
                </div>
            </div>
            {visit.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                     <p className="text-xs text-gray-400 font-semibold">NOTLAR</p>
                     <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded-md">{visit.notes}</p>
                </div>
            )}
        </div>
    );
};

const SkeletonLoader: React.FC = () => (
    <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="p-5 rounded-xl shadow-lg bg-white animate-pulse">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <div className="h-6 bg-gray-200 rounded w-48"></div>
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded-full w-24"></div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                </div>
            </div>
        ))}
    </div>
);


// --- ANA BİLEŞEN ---
const CustomerVisits: React.FC = () => {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        searchTerm: '',
        status: '',
        type: '',
        startDate: '',
        endDate: '',
    });
    // Sayfalama için state'ler
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [totalVisits, setTotalVisits] = useState(0);

    useEffect(() => {
        const fetchCustomerId = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Oturum bulunamadı.');
                const { data, error } = await supabase.from('customers').select('id').eq('auth_id', user.id).single();
                if (error) throw error;
                setCustomerId(data.id);
            } catch (err: any) {
                toast.error(`Kimlik doğrulama hatası: ${err.message}`);
                setLoading(false);
            }
        };
        fetchCustomerId();
    }, []);

    useEffect(() => {
        if (!customerId) return;

        const fetchVisits = async () => {
            setLoading(true);
            try {
                const from = (currentPage - 1) * itemsPerPage;
                const to = from + itemsPerPage - 1;

                let query = supabase
                    .from('visits')
                    .select(`id, visit_date, status, visit_type, report_number, notes, branch:branch_id(sube_adi), operator:operator_id(name)`, { count: 'exact' })
                    .eq('customer_id', customerId)
                    .order('visit_date', { ascending: false });

                if (filters.status) query = query.eq('status', filters.status);
                if (filters.type) query = query.eq('visit_type', filters.type);
                if (filters.startDate) query = query.gte('visit_date', filters.startDate);
                if (filters.endDate) query = query.lte('visit_date', filters.endDate);
                if (filters.searchTerm) {
                    query = query.or(`branch.sube_adi.ilike.%${filters.searchTerm}%,operator.name.ilike.%${filters.searchTerm}%,notes.ilike.%${filters.searchTerm}%`);
                }

                // Sayfalama için .range() ekleniyor
                query = query.range(from, to);

                const { data, error, count } = await query;
                if (error) throw error;
                setVisits(data || []);
                setTotalVisits(count || 0);

            } catch (err: any) {
                toast.error(`Ziyaretler getirilirken hata: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchVisits();
    }, [customerId, filters, currentPage]);

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setCurrentPage(1); // Filtre değiştiğinde ilk sayfaya dön
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const exportToExcel = async () => {
        toast.info("Tüm veriler Excel için hazırlanıyor...");
        try {
            // Excel'e aktarmak için tüm verileri (sayfalama olmadan) çek
            let query = supabase
                .from('visits')
                .select(`visit_date, status, visit_type, report_number, notes, branch:branch_id(sube_adi), operator:operator_id(name)`)
                .eq('customer_id', customerId!)
                .order('visit_date', { ascending: false });

            if (filters.status) query = query.eq('status', filters.status);
            if (filters.type) query = query.eq('visit_type', filters.type);
            if (filters.startDate) query = query.gte('visit_date', filters.startDate);
            if (filters.endDate) query = query.lte('visit_date', filters.endDate);
            if (filters.searchTerm) {
                query = query.or(`branch.sube_adi.ilike.%${filters.searchTerm}%,operator.name.ilike.%${filters.searchTerm}%,notes.ilike.%${filters.searchTerm}%`);
            }

            const { data: allVisits, error } = await query;
            if (error) throw error;

            if (allVisits.length === 0) return toast.error('Dışa aktarılacak veri bulunamadı.');

            const data = allVisits.map(visit => ({
                'Tarih': format(new Date(visit.visit_date), 'dd.MM.yyyy HH:mm'),
                'Şube': visit.branch?.sube_adi || 'Genel Merkez',
                'Operatör': visit.operator?.name || 'Atanmamış',
                'Tür': visit.visit_type,
                'Durum': { planned: 'Planlandı', completed: 'Tamamlandı', cancelled: 'İptal Edildi' }[visit.status] || 'Bilinmiyor',
                'Rapor No': visit.report_number || '-',
                'Notlar': visit.notes || ''
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Ziyaretler');
            XLSX.writeFile(wb, `ziyaret_raporu_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
            toast.success("Excel dosyası başarıyla indirildi.");
        } catch (err: any) {
            toast.error("Excel'e aktarma sırasında bir hata oluştu.");
        }
    };
    
    const totalPages = Math.ceil(totalVisits / itemsPerPage);

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <h1 className="text-4xl font-bold text-gray-800">Ziyaretlerim</h1>
                <button onClick={exportToExcel} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors">
                    <Download size={20} /> Excel'e Aktar
                </button>
            </header>

            <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input type="text" placeholder="Şube, operatör veya not içinde ara..." value={filters.searchTerm} onChange={e => handleFilterChange('searchTerm', e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg"/>
                    </div>
                    <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="w-full p-2 border rounded-lg bg-white">
                        <option value="">Tüm Durumlar</option>
                        <option value="planned">Planlandı</option>
                        <option value="completed">Tamamlandı</option>
                        <option value="cancelled">İptal Edildi</option>
                    </select>
                    <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="w-full p-2 border rounded-lg"/>
                    <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="w-full p-2 border rounded-lg"/>
                </div>
            </div>

            {loading ? <SkeletonLoader /> : visits.length === 0 ? (
                <div className="text-center p-10 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-gray-700">Ziyaret Bulunamadı</h3>
                    <p className="text-gray-500 mt-2">Seçtiğiniz kriterlere uygun ziyaret bulunamadı.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {visits.map(visit => <VisitCard key={visit.id} visit={visit} />)}
                </div>
            )}

            {/* Sayfalama Kontrolleri */}
            {totalPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-4">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1 || loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        <ChevronLeft size={16} /> Önceki
                    </button>
                    <span className="text-sm font-semibold text-gray-600">
                        Sayfa {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages || loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        Sonraki <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default CustomerVisits;
