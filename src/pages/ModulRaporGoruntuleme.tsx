import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Supabase import'unun projenin yapısına göre doğru olduğunu varsayıyorum.
// Genelde src/lib/supabase.ts gibi bir yerde olur.
import { supabase } from '../lib/supabase'; 
import {
    Loader2, AlertTriangle, FileText, Building2, Calendar, User, MapPin, 
    Phone, Mail, Globe, ArrowLeft, Printer, CheckCircle, XCircle, 
    PieChart, Hash, ScanLine
} from 'lucide-react';

// --- ARAYÜZLER ---
interface UvLampDevice {
    id: string; equipment_code: string; department: string; value: number | string;
}
interface CompanyInfo {
    name: string; address: string; phone: string; email: string; website: string;
    logo: string; taxNumber: string; authorizedPerson: string; licenseNumber: string;
}
type SavedReport = {
    id:string; customerName:string; branchName:string; reportDate:string; reportNumber:string;
    technician:string; nextInspectionDate:string; devices:UvLampDevice[]; criticalLimit?:number;
};

const ModulRaporGoruntuleme: React.FC = () => {
    const { reportId } = useParams<{ reportId: string }>();
    const navigate = useNavigate();

    const [report, setReport] = useState<SavedReport | null>(null);
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    useEffect(() => {
        if (!reportId) {
            setError("Rapor ID'si bulunamadı.");
            setLoading(false);
            return;
        }

        const fetchReportData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [reportRes, companyRes] = await Promise.all([
                    supabase.from('uv_lamp_reports').select('report_data').eq('id', reportId).single(),
                    supabase.from('company_settings').select('*').single()
                ]);

                if (reportRes.error || !reportRes.data) { throw new Error("Rapor verisi bulunamadı."); }
                setReport(reportRes.data.report_data as SavedReport);

                if (companyRes.data) {
                    setCompanyInfo({
                         name: companyRes.data.name || '', address: companyRes.data.address || '',
                         phone: companyRes.data.phone || '', email: companyRes.data.email || '',
                         website: companyRes.data.website || '', logo: companyRes.data.logo_url || '',
                         taxNumber: companyRes.data.tax_number || '', authorizedPerson: companyRes.data.authorized_person || '',
                         licenseNumber: companyRes.data.license_number || ''
                    });
                } else { setCompanyInfo({} as CompanyInfo); }

            } catch (err: any) {
                setError(err.message || 'Hata oluştu.');
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [reportId]);

    const getStatistics = () => {
        if (!report || !report.devices) return { total: 0, sufficient: 0, insufficient: 0, efficiency: 0, limit: 8 };
        const CRITICAL_LIMIT = report.criticalLimit || 8;
        const validDevices = report.devices.filter(d => d.value !== null && d.value !== '' && !isNaN(Number(d.value)));
        const total = validDevices.length;
        const sufficient = validDevices.filter(d => Number(d.value) >= CRITICAL_LIMIT).length;
        const insufficient = total - sufficient;
        const efficiency = total > 0 ? (sufficient / total) * 100 : 0;
        return { total, sufficient, insufficient, efficiency, limit: CRITICAL_LIMIT };
    };

    const stats = getStatistics();

    if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    if (error) return <div className="flex items-center justify-center h-screen text-red-600"><AlertTriangle className="h-12 w-12 mr-4" />{error}</div>;
    if (!report || !companyInfo) return <div>Rapor bulunamadı.</div>;

    return (
        <>
            <style>{`@media print {.no-print{display:none !important;} body{-webkit-print-color-adjust: exact; print-color-adjust: exact;}}`}</style>
            <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans">
                <div className="max-w-4xl mx-auto mb-6 no-print">
                    <div className="bg-white p-4 rounded-xl shadow-md flex justify-between items-center">
                        <h1 className="text-xl font-bold text-gray-700">Modül Rapor Görüntüleme</h1>
                        <div className="flex items-center gap-2">
                            <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 flex items-center gap-2"><ArrowLeft size={16} /> Geri</button>
                            <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Printer size={16} /> Yazdır</button>
                        </div>
                    </div>
                </div>
                <main id="report-content" className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl border">
                    {/* ... (Raporun içeriği aynı, buraya tekrar eklemiyorum) ... */}
                    <header className="p-8 border-b-2 flex justify-between gap-6">
                        <div className="flex items-center gap-6">
                           {companyInfo.logo && <img src={companyInfo.logo} alt="Logo" className="h-20 w-auto object-contain" />}
                           <div>
                                <h2 className="text-2xl font-extrabold text-gray-800">{companyInfo.name}</h2>
                                <p className="text-sm text-gray-500 mt-1">UV Lamba Hijyen Kontrol Raporu</p>
                           </div>
                        </div>
                    </header>
                    <section className="p-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6 border-b">
                        <div className="lg:col-span-3"><h3 className="font-bold text-lg mb-3 flex items-center gap-2"><FileText size={20}/>Rapor Künyesi</h3></div>
                        <div><strong className="text-gray-500 block">Müşteri:</strong><span className="text-gray-800 text-lg">{report.customerName}</span></div>
                        <div><strong className="text-gray-500 block">Şube:</strong><span className="text-gray-800 text-lg">{report.branchName}</span></div>
                        <div><strong className="text-gray-500 block">Rapor No:</strong><span className="text-gray-800 text-lg font-mono">{report.reportNumber}</span></div>
                        <div><strong className="text-gray-500 block">Ölçüm Tarihi:</strong><span className="text-gray-800 text-lg">{formatDate(report.reportDate)}</span></div>
                        <div><strong className="text-gray-500 block">Sonraki Kontrol:</strong><span className="text-gray-800 text-lg">{formatDate(report.nextInspectionDate)}</span></div>
                        <div><strong className="text-gray-500 block">Teknisyen:</strong><span className="text-gray-800 text-lg">{report.technician}</span></div>
                    </section>
                    <section className="p-8">
                         <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ScanLine size={20}/>Ölçüm Sonuçları</h3>
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-center"><Hash size={14}/></th>
                                    <th className="px-6 py-3">Ekipman Kodu</th>
                                    <th className="px-6 py-3">Departman</th>
                                    <th className="px-6 py-3 text-center">Ölçüm (µW/cm²)</th>
                                    <th className="px-6 py-3 text-center">Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.devices.map((device, index) => {
                                    const value = Number(device.value);
                                    const isValid = !isNaN(value) && device.value !== '';
                                    const isSufficient = isValid && value >= stats.limit;
                                    return (
                                        <tr key={device.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-4 py-4 text-center">{index + 1}</td>
                                            <td className="px-6 py-4 font-mono">{device.equipment_code}</td>
                                            <td className="px-6 py-4">{device.department}</td>
                                            <td className={`px-6 py-4 text-center font-bold ${isSufficient ? 'text-green-600' : 'text-red-600'}`}>{isValid ? value.toFixed(2) : 'N/A'}</td>
                                            <td className="px-6 py-4 text-center">
                                                {isValid ? (isSufficient ? <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={14} />Yeterli</span> : <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle size={14} />Yetersiz</span>) : "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </section>
                </main>
            </div>
        </>
    );
};

export default ModulRaporGoruntuleme;