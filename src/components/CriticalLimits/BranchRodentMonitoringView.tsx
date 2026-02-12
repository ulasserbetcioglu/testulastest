import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Loader2, Download, FileText, Bug } from 'lucide-react';
import { format, subMonths, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

interface BranchRodentMonitoringViewProps {
    branchId: string;
}

const BranchRodentMonitoringView: React.FC<BranchRodentMonitoringViewProps> = ({ branchId }) => {
    const [loading, setLoading] = useState(true);
    const [stations, setStations] = useState<any[]>([]);
    const [visits, setVisits] = useState<any[]>([]);
    const [branchData, setBranchData] = useState<any>(null);
    const [companySettings, setCompanySettings] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, [branchId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Company Settings
            const { data: settings } = await supabase.from('company_settings').select('*').single();
            setCompanySettings(settings);

            // 2. Fetch Branch Data
            const { data: branch } = await supabase
                .from('branches')
                .select(`id, sube_adi, customers (kisa_isim)`)
                .eq('id', branchId)
                .single();
            setBranchData(branch);

            // 3. Fetch Equipment (Stations)
            const { data: eqData } = await supabase
                .from('branch_equipment')
                .select('id, equipment_code, equipment:equipment_id(name, type)')
                .eq('branch_id', branchId);

            const mappedStations = eqData?.map(eq => ({
                id: eq.id,
                code: eq.equipment_code || '-',
                name: eq.equipment?.name || '-',
                type: eq.equipment?.type || '-'
            })) || [];
            setStations(mappedStations);

            // 4. Fetch Visits (Last 6 Months)
            const endDate = new Date();
            const startDate = subMonths(endDate, 6);
            const { data: visitsData } = await supabase
                .from('visits')
                .select('visit_date, equipment_checks')
                .eq('branch_id', branchId)
                .eq('status', 'completed')
                .gte('visit_date', startDate.toISOString())
                .lte('visit_date', endDate.toISOString())
                .order('visit_date', { ascending: false }); // Newest first for preview

            setVisits(visitsData || []);

        } catch (error: any) {
            console.error('Error fetching rodent data:', error);
            toast.error('Veriler yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (visits.length === 0) {
            toast.error('Görüntülenecek ziyaret verisi bulunamadı.');
            return;
        }

        const loadingToast = toast.loading('Rapor hazırlanıyor...');
        try {
            const { generateRodentMonitoringPDF } = await import('../../lib/RodentBaitStationPdfGenerator');

            const endDate = new Date();
            const startDate = subMonths(endDate, 6);

            generateRodentMonitoringPDF({
                stations,
                visits,
                branchData: branchData ? { sube_adi: branchData.sube_adi, customers: branchData.customers } : null,
                companySettings,
                startDate,
                endDate
            });
            toast.success('Rapor indirildi.');
        } catch (error: any) {
            toast.error('PDF oluşturulurken hata: ' + error.message);
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Bug className="text-amber-600" size={20} />
                        Kemirgen İzleme Kayıtları
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Son 6 aya ait kemirgen istasyon kontrolleri ve aktivite takibi.
                    </p>
                </div>
                <button
                    onClick={handleDownload}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-700 transition shadow-sm"
                >
                    <Download size={18} />
                    PDF Formu İndir
                </button>
            </div>

            {/* PREVIEW TABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <h4 className="font-medium text-gray-700 text-sm">İstasyon Durum Özeti (Son Ziyaretler)</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-100 text-gray-700 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 min-w-[150px]">İstasyon</th>
                                {visits.slice(0, 5).map((v, i) => (
                                    <th key={i} className="px-4 py-3 text-center">
                                        {format(parseISO(v.visit_date), 'dd.MM')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stations.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                        Tanımlı istasyon bulunamadı.
                                    </td>
                                </tr>
                            ) : (
                                stations.map((station) => (
                                    <tr key={station.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{station.code}</div>
                                            <div className="text-xs text-gray-500">{station.name}</div>
                                        </td>
                                        {visits.slice(0, 5).map((visit, i) => {
                                            const check = visit.equipment_checks?.[station.id];
                                            let status = '-';
                                            let colorClass = 'text-gray-400';

                                            // Simple mapping for preview
                                            if (check) {
                                                if (check.activity) { status = 'AKTİF'; colorClass = 'text-red-600 font-bold'; }
                                                else if (check.broken) { status = 'KIRIK'; colorClass = 'text-orange-600'; }
                                                else if (check.missing) { status = 'KAYIP'; colorClass = 'text-orange-600'; }
                                                else { status = 'PASİF'; colorClass = 'text-green-600'; }
                                            }

                                            return (
                                                <td key={i} className={`px-4 py-3 text-center ${colorClass} text-xs`}>
                                                    {status}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
                    * Tabloda sadece son 5 ziyaret gösterilmektedir. Tüm veriler için PDF indiriniz.
                </div>
            </div>
        </div>
    );
};

export default BranchRodentMonitoringView;
