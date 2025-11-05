import React, { useState, useEffect, useRef } from 'react';
// Hata düzeltmesi: Supabase import yolu, projenin standart yapısına uygun olarak güncellendi.
import { supabase } from '../lib/supabase';
import {
    Loader2, AlertTriangle, FileText, Building2, Calendar, User, MapPin, 
    Phone, Mail, Globe, Printer, CheckCircle, XCircle, ChevronDown, ArrowLeft,
    ShieldCheck, BarChart3, ClipboardList, Target, Map, Search,
    FileSignature, LayoutTemplate, LineChart, CalendarDays, Bot, Presentation,
    Award, FileSpreadsheet, Download
} from 'lucide-react';

// --- ARAYÜZLER ---
interface BaseReportData {
    id: string;
    report_number: string;
    customer_name: string;
    report_date: string;
    [key: string]: any; 
}

interface ReportRecord {
    id: string;
    report_data: BaseReportData;
    report_number: string;
    customer_name: string;
    report_date: string;
}

interface OfferItem {
    id: number;
    description: string;
    explanation: string;
    quantity: number;
    unit: string;
    unit_price: number;
    vat_rate: number;
    total_price: number;
}

// --- MODÜL TANIMLARI ---
const modules = [
    { name: 'Fiyat Teklifi', description: 'Özelleştirilebilir profesyonel teklifler.', icon: FileSpreadsheet, table: 'proporsals', viewer: 'FiyatTeklifiViewer' },
    { name: 'Hizmet Planı Raporu', description: 'Kapsam, standartlar ve taahhütleri özetler.', icon: ClipboardList, table: 'service_plan_reports' },
    { name: 'Risk Değerlendirme', description: 'Detaylı risk analizi ve öneriler sunar.', icon: ShieldCheck, table: 'risk_assessment_reports' },
    { name: 'Tehlike ve Risk Değerlendirme', description: 'Risk matrisi ve önlem planları içerir.', icon: BarChart3, table: 'hazard_risk_reports' },
    { name: 'Risk Eylem Planı', description: 'Aksiyon planı, sorumlular ve hedef tarihler.', icon: Target, table: 'action_plan_reports' },
    { name: 'Riskli Alan Belirleme', description: 'Kroki üzerinde riskli alanları işaretler.', icon: Map, table: 'risky_area_reports' },
    { name: 'Denetim Raporu', description: 'Periyodik denetim bulguları ve öneriler.', icon: Search, table: 'audit_reports' },
    { name: 'Uygunluk Kontrol', description: 'BRC, IFS, HACCP standartlarına uygunluk.', icon: CheckCircle, table: 'compliance_reports' },
    { name: 'Hizmet Sözleşmesi', description: 'Profesyonel hizmet sözleşmeleri oluşturur.', icon: FileSignature, table: 'contracts' },
    { name: 'Ekipman Krokisi', description: 'Sürükle-bırak ile ekipman yerleşimi.', icon: LayoutTemplate, table: 'equipment_layouts' },
    { name: 'Trend Analiz', description: 'Ekipman aktivite verileri ve grafikleri.', icon: LineChart, table: 'trend_analysis_reports' },
    { name: 'Ziyaret Takvimi', description: 'Yıllık ilaçlama ziyaret takvimi.', icon: CalendarDays, table: 'visit_schedules' },
    { name: 'Otomatik Trend Analiz', description: 'Otomatik veri ile hızlı rapor oluşturma.', icon: Bot, table: 'auto_trend_reports' },
    { name: 'Eğitim Sunumu', description: 'BRC, AIB, HACCP için hazır sunumlar.', icon: Presentation, table: 'training_presentations' },
    { name: 'Eğitim Sertifikası', description: 'Katılımcılar için profesyonel sertifikalar.', icon: Award, table: 'training_certificates' },
];

// --- YARDIMCI FONKSİYONLAR ---
const formatDate = (date: any) => {
    try {
        return new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return 'Geçersiz Tarih'; }
};
const formatCurrency = (value: number) => (value || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

// --- RAPOR GÖRÜNTÜLEYİCİ BİLEŞENLERİ ---

// Fiyat Teklifi için özel görüntüleyici
const FiyatTeklifiViewer = ({ report }: { report: BaseReportData }) => {
    const [items, setItems] = useState<OfferItem[]>([]);
    const [loading, setLoading] = useState(true);
    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('offer_items')
                .select('*')
                .eq('offer_id', report.id);
            if (!error && data) setItems(data);
            setLoading(false);
        };
        fetchItems();
    }, [report.id]);

    const subTotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const vatAmount = items.reduce((sum, item) => sum + (item.total_price * item.vat_rate / 100), 0);
    const grandTotal = subTotal + vatAmount;

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div ref={previewRef} className="offer-preview p-8 border rounded-lg bg-white">
            <style>{`
                .offer-preview h2 { font-size: 1.5rem; font-weight: bold; }
                .offer-preview table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .offer-preview th, .offer-preview td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
                .offer-preview thead { background-color: #f3f4f6; }
                .offer-preview .text-right { text-align: right; }
            `}</style>
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-2xl font-bold">{report.customer_name}</h2>
                    <p className="text-gray-600">Teklif No: {report.report_number}</p>
                    <p className="text-gray-500">Tarih: {formatDate(report.report_date)}</p>
                </div>
            </div>
            <h3 className="font-semibold text-lg mb-2">Teklif Kalemleri</h3>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Açıklama</th>
                        <th className="text-right">Miktar</th>
                        <th className="text-right">Birim Fiyat</th>
                        <th className="text-right">Toplam</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={item.id}>
                            <td>{index + 1}</td>
                            <td>
                                <p className="font-semibold">{item.description}</p>
                                {item.explanation && <p className="text-sm text-gray-500">{item.explanation}</p>}
                            </td>
                            <td className="text-right">{item.quantity} {item.unit}</td>
                            <td className="text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="text-right">{formatCurrency(item.total_price)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex justify-end mt-6">
                <div className="w-full max-w-xs">
                    <div className="flex justify-between py-1"><span className="text-gray-600">Ara Toplam:</span><span>{formatCurrency(subTotal)}</span></div>
                    <div className="flex justify-between py-1"><span className="text-gray-600">KDV:</span><span>{formatCurrency(vatAmount)}</span></div>
                    <div className="flex justify-between py-2 mt-2 border-t-2 border-black font-bold text-lg"><span >Genel Toplam:</span><span>{formatCurrency(grandTotal)}</span></div>
                </div>
            </div>
        </div>
    );
};

// Diğer tüm raporlar için varsayılan görüntüleyici
const DefaultReportViewer = ({ report }: { report: BaseReportData }) => (
    <div className="p-8 border rounded-lg bg-white">
        <div className="flex justify-between items-start mb-8">
            <div>
                <h2 className="text-2xl font-bold">{report.customer_name}</h2>
                <p className="text-gray-600">Rapor No: {report.report_number}</p>
                <p className="text-gray-500">Tarih: {formatDate(report.report_date)}</p>
            </div>
        </div>
        <h3 className="font-semibold text-lg mb-2">Rapor Detayları</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <tbody className="bg-white">
                    {Object.entries(report).map(([key, value]) => (
                        <tr key={key} className="border-b">
                            <td className="py-3 px-4 font-semibold text-gray-600 bg-gray-50 capitalize">{key.replace(/_/g, ' ')}</td>
                            <td className="py-3 px-4">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);


// --- ANA BİLEŞEN ---
const GenelRaporGoruntuleme: React.FC = () => {
    const [selectedModule, setSelectedModule] = useState<typeof modules[0] | null>(null);
    const [reportList, setReportList] = useState<ReportRecord[]>([]);
    const [selectedReport, setSelectedReport] = useState<BaseReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedModule) {
            setReportList([]);
            setSelectedReport(null);
            return;
        }

        const fetchReportList = async () => {
            setLoading(true);
            setError(null);
            setSelectedReport(null);

            const { table } = selectedModule;
            let query = supabase.from(table);

            if (table === 'offers') {
                query = query.select('id, teklif_no, customer_id, offer_date, total_amount, aciklama, (customers:customer_id(kisa_isim))');
            } else {
                query = query.select('id, report_number, customer_name, report_date, report_data');
            }
            
            const { data, error: fetchError } = await query.order(table === 'offers' ? 'offer_date' : 'report_date', { ascending: false });

            if (fetchError) {
                setError(`${selectedModule.name} modülüne ait raporlar çekilemedi.`);
                console.error(fetchError);
                setReportList([]);
            } else if (data) {
                const mappedData = data.map((item: any) => ({
                    id: item.id,
                    report_number: item.report_number || item.teklif_no,
                    customer_name: item.customer_name || item.customers?.kisa_isim,
                    report_date: item.report_date || item.offer_date,
                    report_data: item 
                }));
                setReportList(mappedData);
            }
            setLoading(false);
        };

        fetchReportList();
    }, [selectedModule]);

    const handleReportSelect = (reportId: string) => {
        const report = reportList.find(r => r.id === reportId);
        setSelectedReport(report ? report.report_data : null);
    };

    const renderModuleSelector = () => (
        <div className="max-w-5xl mx-auto">
             <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Rapor Modülleri</h1>
             <p className="text-center text-gray-500 mb-8">Görüntülemek istediğiniz rapor türünü seçiniz.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map(mod => (
                    <div key={mod.name} onClick={() => setSelectedModule(mod)} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border">
                        <div className="flex items-center gap-4">
                            <mod.icon className="h-10 w-10 text-blue-600" />
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">{mod.name}</h2>
                                <p className="text-sm text-gray-500 mt-1">{mod.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderReportViewer = () => {
        const ViewerComponent = selectedModule?.viewer === 'FiyatTeklifiViewer' ? FiyatTeklifiViewer : DefaultReportViewer;
        
        return (
            <div>
                <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedModule(null)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
                        <h1 className="text-2xl font-bold text-gray-800">{selectedModule?.name}</h1>
                    </div>
                    {selectedReport && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => window.print()} className="px-4 py-2 bg-gray-600 text-white rounded-lg flex items-center gap-2 text-sm"><Printer size={16}/> Yazdır/PDF</button>
                        </div>
                    )}
                </div>

                <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-md mb-8">
                    {loading ? <div className="flex justify-center items-center gap-2"><Loader2 className="animate-spin h-5 w-5"/><span>Raporlar Yükleniyor...</span></div> :
                     error ? <div className="text-red-600"><AlertTriangle className="inline mr-2"/>{error}</div> :
                     reportList.length === 0 ? <div>Bu modüle ait görüntülenecek rapor bulunamadı.</div> :
                     (
                        <>
                            <label htmlFor="report-selector" className="block text-sm font-medium text-gray-600 mb-1">Bir rapor seçin:</label>
                            <div className="relative">
                                <select id="report-selector" onChange={(e) => handleReportSelect(e.target.value)} className="w-full p-3 border rounded-lg appearance-none" defaultValue="">
                                    <option value="" disabled>-- Rapor Seçiniz --</option>
                                    {reportList.map(report => (
                                        <option key={report.id} value={report.id}>
                                            {`[${formatDate(report.report_date)}] - ${report.customer_name} - (No: ${report.report_number})`}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            </div>
                        </>
                     )
                    }
                </div>

                {selectedReport ? <ViewerComponent report={selectedReport} /> : 
                    <div className="max-w-4xl mx-auto text-center py-10 bg-white rounded-xl shadow-md border-2 border-dashed">
                        <p className="text-gray-500">İçeriği görmek için lütfen yukarıdan bir rapor seçin.</p>
                    </div>
                }
            </div>
        );
    };

    return (
        <div className="bg-gray-50 min-h-screen p-4 sm:p-8 font-sans">
            {!selectedModule ? renderModuleSelector() : renderReportViewer()}
        </div>
    );
};

export default GenelRaporGoruntuleme;
