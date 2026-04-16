import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Star, Calendar, User, MessageSquare, Search, Download, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface SurveyResponse {
    id: string;
    created_at: string;
    customer_id: string | null;
    rating_personnel: number;
    rating_attitude: number;
    rating_interest: number;
    rating_solution: number;
    feedback: string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    nps_score?: number; // NEW
    service_types?: string[]; // NEW
    customers?: {
        kisa_isim: string;
        email: string;
    };
}

const SurveyResults: React.FC = () => {
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRating, setFilterRating] = useState<number | 'all'>('all');

    useEffect(() => {
        fetchResponses();
    }, []);

    const fetchResponses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('survey_responses')
                .select(`
          *,
          customers (
            kisa_isim,
            email
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setResponses(data || []);
        } catch (error) {
            console.error('Error fetching survey responses:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateAverage = (r: SurveyResponse) => {
        return ((r.rating_personnel + r.rating_attitude + r.rating_interest + r.rating_solution) / 4).toFixed(1);
    };

    const filteredResponses = responses.filter(r => {
        const avg = parseFloat(calculateAverage(r));
        const matchesSearch =
            (r.feedback?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (r.customers?.kisa_isim?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRating = filterRating === 'all' ? true : Math.round(avg) === filterRating;

        return matchesSearch && matchesRating;
    });

    const exportToCSV = () => {
        const headers = ['Tarih', 'Müşteri', 'Personel', 'Tavır', 'İlgi', 'Çözüm', 'Ortalama', 'NPS', 'Hizmetler', 'Yorum', 'İletişim'];
        const csvContent = [
            headers.join(','),
            ...filteredResponses.map(r => [
                format(new Date(r.created_at), 'dd.MM.yyyy HH:mm'),
                `"${r.customer_name || r.customers?.kisa_isim || 'Anonim'}"`,
                r.rating_personnel,
                r.rating_attitude,
                r.rating_interest,
                r.rating_solution,
                calculateAverage(r),
                r.nps_score ?? '',
                `"${(r.service_types || []).join(', ')}"`,
                `"${r.feedback?.replace(/"/g, '""') || ''}"`,
                `"${r.customer_email || r.customers?.email || ''} ${r.customer_phone || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `anket_sonuclari_${format(new Date(), 'dd-MM-yyyy')}.csv`;
        link.click();
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-[1600px] mx-auto">

                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <MessageSquare className="w-8 h-8 text-blue-600" />
                            Müşteri Anket Sonuçları
                        </h1>
                        <p className="text-gray-500 mt-1">Müşterilerinizden gelen geri bildirimleri ve memnuniyet oranlarını takip edin.</p>
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" /> Excel/CSV İndir
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium">Toplam Anket</h3>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{responses.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-500 text-sm font-medium">Ortalama Memnuniyet</h3>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-3xl font-bold text-blue-600">
                                {responses.length > 0
                                    ? (responses.reduce((acc, r) => acc + parseFloat(calculateAverage(r)), 0) / responses.length).toFixed(1)
                                    : '0.0'}
                            </span>
                            <span className="text-gray-400 text-sm">/ 5.0</span>
                        </div>
                    </div>
                    {/* Add more stats if needed */}
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-grow w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Müşteri adı veya yorumlarda ara..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="text-gray-400 w-5 h-5" />
                        <select
                            className="border rounded-lg px-3 py-2 bg-gray-50 w-full sm:w-48"
                            value={filterRating}
                            onChange={(e) => setFilterRating(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        >
                            <option value="all">Tüm Puanlar</option>
                            <option value="5">5 Yıldız (Mükemmel)</option>
                            <option value="4">4 Yıldız (İyi)</option>
                            <option value="3">3 Yıldız (Orta)</option>
                            <option value="2">2 Yıldız (Düşük)</option>
                            <option value="1">1 Yıldız (Çok Düşük)</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Tarih</th>
                                    <th className="px-6 py-4 font-semibold">Müşteri</th>
                                    <th className="px-6 py-4 font-semibold text-center">NPS</th>
                                    <th className="px-6 py-4 font-semibold text-center">Ortalama</th>
                                    <th className="px-6 py-4 font-semibold text-center">Detaylı Puanlar</th>
                                    <th className="px-6 py-4 font-semibold">Hizmetler</th>
                                    <th className="px-6 py-4 font-semibold">Yorum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Yükleniyor...</td></tr>
                                ) : filteredResponses.length === 0 ? (
                                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                                ) : (
                                    filteredResponses.map((r) => {
                                        const avg = parseFloat(calculateAverage(r));
                                        return (
                                            <tr key={r.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        {format(new Date(r.created_at), 'd MMM yyyy HH:mm', { locale: tr })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">
                                                                {r.customer_name || r.customers?.kisa_isim || 'Anonim Müşteri'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {r.customer_email || r.customers?.email || '-'}
                                                            </div>
                                                            {r.customer_phone && <div className="text-xs text-gray-500">{r.customer_phone}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {r.nps_score !== undefined && r.nps_score !== null ? (
                                                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm border
                              ${r.nps_score >= 9 ? 'bg-green-100 text-green-700 border-green-200'
                                                                : r.nps_score >= 7 ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                                    : 'bg-red-100 text-red-700 border-red-200'}
                            `}>
                                                            {r.nps_score}
                                                        </div>
                                                    ) : <span className="text-gray-300">-</span>}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-sm
                            ${avg >= 4 ? 'bg-green-100 text-green-700' : avg >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}
                          `}>
                                                        <Star className="w-4 h-4 fill-current" />
                                                        {avg}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center gap-4 text-xs text-gray-500">
                                                        <div className="text-center"><div className="font-bold text-gray-700">{r.rating_personnel}</div>Personel</div>
                                                        <div className="text-center"><div className="font-bold text-gray-700">{r.rating_attitude}</div>Tavır</div>
                                                        <div className="text-center"><div className="font-bold text-gray-700">{r.rating_interest}</div>İlgi</div>
                                                        <div className="text-center"><div className="font-bold text-gray-700">{r.rating_solution}</div>Çözüm</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                                        {r.service_types?.map((s, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">
                                                                {s}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-md">
                                                    {r.feedback ? (
                                                        <p className="text-sm text-gray-700 italic border-l-2 border-blue-200 pl-3 py-1">
                                                            "{r.feedback}"
                                                        </p>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Yorum yok</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SurveyResults;
