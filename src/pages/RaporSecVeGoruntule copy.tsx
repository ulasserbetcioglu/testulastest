import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Bu yolun projenize uygun olduğunu varsayıyorum
import {
    Loader2, AlertTriangle, FileText, Building2, Calendar, User, MapPin, 
    Phone, Mail, Globe, Printer, CheckCircle, XCircle, 
    PieChart, Hash, ScanLine, ChevronDown
} from 'lucide-react';

// --- ARAYÜZLER ---
interface UvLampDevice {
    id: string; equipment_code: string; department: string; value: number | string;
}
interface CompanyInfo {
    name: string; address: string; phone: string; email: string; website: string;
    logo: string; taxNumber: string; authorizedPerson: string; licenseNumber: string;
}
type SavedReportData = {
    id:string; customerName:string; branchName:string; reportDate:string; reportNumber:string;
    technician:string; nextInspectionDate:string; devices:UvLampDevice[]; criticalLimit?:number;
};
// Supabase'den gelen tam satır verisi için
type ReportRecord = {
    id: string;
    report_data: SavedReportData;
    report_number: string;
    customer_name: string;
    report_date: string;
}

const RaporSecVeGoruntule: React.FC = () => {
    const navigate = useNavigate();

    // --- STATE YÖNETİMİ ---
    const [allReports, setAllReports] = useState<ReportRecord[]>([]);
    const [selectedReport, setSelectedReport] = useState<SavedReportData | null>(null);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    
    const [loading, setLoading] = useState({ list: true, company: true });
    const [error, setError] = useState<string | null>(null);

    // --- VERİ ÇEKME ---
    useEffect(() => {
        const fetchInitialData = async () => {
            setError(null);
            try {
                // Rapor listesini ve firma bilgilerini aynı anda çekelim
                const [reportsRes, companyRes] = await Promise.all([
                    supabase.from('uv_lamp_reports').select('id, report_number, customer_name, report_date, report_data').order('report_date', { ascending: false }),
                    supabase.from('company_settings').select('*').single()
                ]);

                if (reportsRes.error) throw new Error("Rapor listesi çekilemedi.");
                setAllReports(reportsRes.data as ReportRecord[]);
                setLoading(prev => ({ ...prev, list: false }));

                if (companyRes.error) throw new Error("Firma bilgileri çekilemedi.");
                if (companyRes.data) {
                    setCompanyInfo({
                         name: companyRes.data.name || '', address: companyRes.data.address || '',
                         phone: companyRes.data.phone || '', email: companyRes.data.email || '',
                         website: companyRes.data.website || '', logo: companyRes.data.logo_url || '',
                         taxNumber: companyRes.data.tax_number || '', authorizedPerson: companyRes.data.authorized_person || '',
                         licenseNumber: companyRes.data.license_number || ''
                    });
                }
                 setLoading(prev => ({ ...prev, company: false }));

            } catch (err: any) {
                setError(err.message || 'Bir hata oluştu.');
                setLoading({ list: false, company: false });
            }
        };
        fetchInitialData();
    }, []);
    
    // --- YARDIMCI FONKSİYONLAR ---
    const formatDate = (date: Date | string | null | undefined): string => {
        if (!date) return 'Belirtilmemiş';
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return 'Geçersiz Tarih';
            const year = d.getUTCFullYear();
            const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
            const day = d.getUTCDate().toString().padStart(2, '0');
            return `${day}.${month}.${year}`;
        } catch { return 'Hatalı Tarih'; }
    };

    const handleReportSelect = (reportId: string) => {
        if (!reportId) {
            setSelectedReport(null);
            return;
        }
        const report = allReports.find(r => r.id === reportId);
        if (report) {
            setSelectedReport(report.report_data);
        }
    };
    
    const getStatistics = () => {
        if (!selectedReport) return { total: 0, sufficient: 0, insufficient: 0, efficiency: 0, limit: 8 };
        const CRITICAL_LIMIT = selectedReport.criticalLimit || 8;
        const validDevices = selectedReport.devices.filter(d => d.value !== null && d.value !== '' && !isNaN(Number(d.value)));
        const total = validDevices.length;
        const sufficient = validDevices.filter(d => Number(d.value) >= CRITICAL_LIMIT).length;
        const insufficient = total - sufficient;
        const efficiency = total > 0 ? (sufficient / total) * 100 : 0;
        return { total, sufficient, insufficient, efficiency, limit: CRITICAL_LIMIT };
    };

    const stats = getStatistics();

    // --- RENDER ---

    if (loading.list || loading.company) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    }

    if (error) {
        return <div className="flex items-center justify-center h-screen text-red-600"><AlertTriangle className="h-12 w-12 mr-4" />{error}</div>;
    }

    return (
        <>
            <style>{`@media print {.no-print{display:none !important;} #report-content { box-shadow: none !important; border: none !important; } body{-webkit-print-color-adjust: exact; print-color-adjust: exact;}}`}</style>
            
            <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans">
                {/* --- RAPOR SEÇİM ALANI --- */}
                <div className="max-w-4xl mx-auto mb-8 no-print">
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h1 className="text-xl font-bold text-gray-800 mb-3">Modül Raporu Görüntüleme</h1>
                        <label htmlFor="report-selector" className="block text-sm font-medium text-gray-600 mb-1">Görüntülemek için bir rapor seçin:</label>
                        <div className="relative">
                            <select
                                id="report-selector"
                                onChange={(e) => handleReportSelect(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                defaultValue=""
                            >
                                <option value="" disabled>-- Rapor Seçiniz --</option>
                                {allReports.map(report => (
                                    <option key={report.id} value={report.id}>
                                        {`[${formatDate(report.report_date)}] - ${report.customer_name} - (No: ${report.report_number})`}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* --- SEÇİLEN RAPORUN GÖRÜNTÜLENDİĞİ ALAN --- */}
                {selectedReport && companyInfo ? (
                    <main id="report-content" className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl border">
                        {/* Raporun başlığına yazdırma butonu ekleyelim */}
                        <div className="p-8 pb-0 flex justify-between items-center">
                            <h2 className="text-2xl font-extrabold text-gray-800">{companyInfo.name}</h2>
                            <button onClick={() => window.print()} className="no-print px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Printer size={16} /> Yazdır</button>
                        </div>
                        <p className="px-8 text-sm text-gray-500">UV Lamba Hijyen Kontrol Raporu</p>
                        
                        {/* Raporun geri kalanı... */}
                        <section className="p-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6 border-b">
                           {/* ... Rapor künyesi ... */}
                        </section>
                        <section className="p-8">
                           {/* ... Ölçüm sonuçları tablosu ... */}
                        </section>
                        {/* ... Diğer section'lar ve footer ... */}
                    </main>
                ) : (
                    <div className="max-w-4xl mx-auto text-center py-10 bg-white rounded-xl shadow-md border-2 border-dashed">
                        <FileText size={48} className="mx-auto text-gray-300" />
                        <h2 className="mt-4 text-xl font-semibold text-gray-600">Rapor İçeriği Burada Görüntülenecek</h2>
                        <p className="mt-1 text-gray-400">Lütfen yukarıdaki listeden bir rapor seçimi yapınız.</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default RaporSecVeGoruntule;