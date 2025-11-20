import React, { useState, useEffect, useRef } from 'react';
import { 
    Zap, 
    Download, 
    FileImage, 
    Loader2, 
    AlertTriangle, 
    PlusCircle, 
    Trash2, 
    Building2,
    Calendar,
    User,
    MapPin,
    Phone,
    Mail,
    Globe,
    Camera,
    Save,
    UploadCloud
} from 'lucide-react';
import { supabase } from '../../lib/supabase'; 

// --- ARAYÜZLER (INTERFACES) ---
interface UvLampDevice {
    id: string; // Bu artık equipment.id olacak
    equipment_code: string; 
    department: string;
    value: number | string;
}

interface CompanyInfo {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo: string; // logo_url olarak gelecek
    taxNumber: string;
    authorizedPerson: string;
    licenseNumber: string;
}

type ReportInfo = {
    customerName: string;
    branchName: string;
    reportDate: string;
    reportNumber: string;
    technician: string;
    nextInspectionDate: string;
};

type SavedReport = ReportInfo & {
    id: string;
    devices: UvLampDevice[];
    customerId?: string;
    branchId?: string;
    equipmentTypeId?: string;
};

interface Customer { id: string; kisa_isim: string; }
interface Branch { id: string; sube_adi: string; }
interface EquipmentType { id: string; name: string; }


const UvLampReport: React.FC = () => {
    // --- YARDIMCI FONKSİYONLAR ---
    const formatDate = (date: Date | string | null | undefined, format: string = 'dd.MM.yyyy'): string => {
        if (!date) return 'Belirtilmemiş';
        try {
            let d: Date;
            if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                const parts = date.split('-');
                d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
            } else { d = new Date(date); }
            if (isNaN(d.getTime())) return 'Geçersiz Tarih';
            
            const year = d.getUTCFullYear();
            const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
            const day = d.getUTCDate().toString().padStart(2, '0');

            if (format === 'yyyy-MM-dd') return `${year}-${month}-${day}`;
            return `${day}.${month}.${year}`;
        } catch (e) {
            console.error("Date formatting error:", e, "with input:", date);
            return 'Hatalı Tarih';
        }
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        console.log(`${type.toUpperCase()}: ${message}`);
    };

    // --- STATE YÖNETİMİ ---
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
    const [reportInfo, setReportInfo] = useState<ReportInfo>({
        customerName: '',
        branchName: '',
        reportDate: formatDate(new Date(), 'yyyy-MM-dd'),
        reportNumber: `UV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        technician: '',
        nextInspectionDate: formatDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    });

    const [devices, setDevices] = useState<UvLampDevice[]>([]);
    const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
    
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [selectedEquipmentTypeId, setSelectedEquipmentTypeId] = useState<string>('');

    const [loading, setLoading] = useState({
        reports: true,
        customers: true,
        branches: false,
        equipmentTypes: true,
        companyInfo: true,
        saving: false,
        generating: false
    });

    const [criticalLimit, setCriticalLimit] = useState<number>(8);
    const [showCompanyForm, setShowCompanyForm] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // --- SUPABASE VERİ ÇEKME İŞLEMLERİ ---
    useEffect(() => {
        const fetchInitialData = async () => {
            await Promise.all([
                fetchReports(),
                fetchCustomers(),
                fetchEquipmentTypes(),
                fetchCompanySettings()
            ]);
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedCustomerId) fetchBranches(selectedCustomerId);
        else setBranches([]);
    }, [selectedCustomerId]);

    useEffect(() => {
        if (selectedBranchId && selectedEquipmentTypeId) {
            fetchBranchEquipments(selectedBranchId, selectedEquipmentTypeId);
        } else {
            setDevices([]);
        }
    }, [selectedBranchId, selectedEquipmentTypeId]);

    const fetchReports = async () => {
        setLoading(prev => ({ ...prev, reports: true }));
        const { data, error } = await supabase.from('uv_lamp_reports').select('*').order('created_at', { ascending: false });
        if (error) showToast('Raporlar çekilirken hata oluştu.', 'error');
        else if (data) setSavedReports(data.map(item => ({ id: item.id, ...item.report_data })) as SavedReport[]);
        setLoading(prev => ({ ...prev, reports: false }));
    };

    const fetchCustomers = async () => {
        setLoading(prev => ({ ...prev, customers: true }));
        const { data, error } = await supabase.from('customers').select('id, kisa_isim').order('kisa_isim');
        if (error) showToast('Müşteriler çekilirken hata oluştu.', 'error');
        else if (data) setCustomers(data);
        setLoading(prev => ({ ...prev, customers: false }));
    };

    const fetchBranches = async (customerId: string) => {
        setLoading(prev => ({ ...prev, branches: true }));
        const { data, error } = await supabase.from('branches').select('id, sube_adi').eq('customer_id', customerId).order('sube_adi');
        if (error) showToast('Şubeler çekilirken bir hata oluştu.', 'error');
        else if (data) setBranches(data);
        setLoading(prev => ({ ...prev, branches: false }));
    };

    const fetchEquipmentTypes = async () => {
        setLoading(prev => ({ ...prev, equipmentTypes: true }));
        const { data, error } = await supabase.from('equipment_type').select('id, name').order('name');
        if (error) showToast('Ekipman türleri çekilirken hata oluştu.', 'error');
        else if (data) setEquipmentTypes(data);
        setLoading(prev => ({ ...prev, equipmentTypes: false }));
    };

    const fetchCompanySettings = async () => {
        setLoading(prev => ({ ...prev, companyInfo: true }));
        const { data, error } = await supabase.from('company_settings').select('*').single();
        if (error) showToast('Firma bilgileri çekilirken hata oluştu.', 'error');
        else if (data) {
            setCompanyInfo({
                name: data.name || '',
                address: data.address || '',
                phone: data.phone || '',
                email: data.email || '',
                website: data.website || '',
                logo: data.logo_url || '',
                taxNumber: data.tax_number || '',
                authorizedPerson: data.authorized_person || '',
                licenseNumber: data.license_number || ''
            });
        }
        setLoading(prev => ({ ...prev, companyInfo: false }));
    };

    const fetchBranchEquipments = async (branchId: string, typeId: string) => {
        // ✅ DÜZELTME: Tablo adı 'equipment' olarak değiştirildi
        const { data, error } = await supabase
            .from('equipment') 
            .select('id, equipment_code, department')
            .eq('branch_id', branchId)
            .eq('equipment_type_id', typeId);

        if (error) {
            showToast('Şube ekipmanları çekilirken hata oluştu.', 'error');
            setDevices([]);
        } else if (data) {
            const devicesWithValue = data.map(d => ({ ...d, value: '' }));
            setDevices(devicesWithValue);
        }
    };

    // --- SUPABASE KAYIT/SİLME İŞLEMLERİ ---
    const handleSaveReport = async (reportUrl?: string) => {
        setLoading(prev => ({ ...prev, saving: true }));
        const reportDataPayload = {
            ...reportInfo,
            devices: devices,
            customerId: selectedCustomerId,
            branchId: selectedBranchId,
            equipmentTypeId: selectedEquipmentTypeId
        };

        const { error } = await supabase.from('uv_lamp_reports').upsert({
            report_number: reportInfo.reportNumber,
            customer_id: selectedCustomerId || null,
            branch_id: selectedBranchId || null,
            customer_name: reportInfo.customerName,
            report_date: reportInfo.reportDate,
            prepared_by: reportInfo.technician,
            location: reportInfo.branchName,
            report_url: reportUrl || null,
            report_data: reportDataPayload,
            status: 'active'
        }, { onConflict: 'report_number' });

        if (error) showToast('Rapor kaydedilirken bir hata oluştu.', 'error');
        else {
            showToast('Rapor başarıyla kaydedildi!', 'success');
            await fetchReports();
        }
        setLoading(prev => ({ ...prev, saving: false }));
    };

    const handleDeleteReport = async (reportId: string, reportNumber: string) => {
        const isConfirmed = window.confirm(`${reportNumber} numaralı raporu silmek istediğinizden emin misiniz?`);
        if (isConfirmed) {
            const { error } = await supabase.from('uv_lamp_reports').delete().eq('id', reportId);
            if (error) showToast('Rapor silinirken bir hata oluştu.', 'error');
            else {
                showToast('Rapor başarıyla silindi.', 'success');
                setSavedReports(prev => prev.filter(r => r.id !== reportId));
            }
        }
    };

    // --- FORM İŞLEMLERİ ---
    const handleInfoChange = (field: keyof ReportInfo, value: string) => setReportInfo(prev => ({ ...prev, [field]: value }));
    const handleCompanyChange = (field: keyof CompanyInfo, value: string) => setCompanyInfo(prev => prev ? { ...prev, [field]: value } : null);
    const handleDeviceChange = (id: string, field: keyof UvLampDevice, value: string | number) => setDevices(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
    
    const handleLoadReport = (reportId: string) => {
        const reportToLoad = savedReports.find(r => r.id === reportId);
        if (reportToLoad) {
            setSelectedCustomerId(reportToLoad.customerId || '');
            setSelectedBranchId(reportToLoad.branchId || '');
            setSelectedEquipmentTypeId(reportToLoad.equipmentTypeId || '');
            setReportInfo({
                customerName: reportToLoad.customerName,
                branchName: reportToLoad.branchName,
                reportDate: reportToLoad.reportDate,
                reportNumber: reportToLoad.reportNumber,
                technician: reportToLoad.technician,
                nextInspectionDate: reportToLoad.nextInspectionDate
            });
            setDevices(reportToLoad.devices);
            showToast(`${reportToLoad.reportNumber} numaralı rapor yüklendi.`, 'info');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    
    // --- İSTATİSTİKLER ---
    const getStatistics = () => {
        const validDevices = devices.filter(d => {
            const value = typeof d.value === 'string' ? parseFloat(d.value) : d.value;
            return !isNaN(value) && d.value !== '';
        });
        
        const sufficient = validDevices.filter(d => {
            const value = typeof d.value === 'string' ? parseFloat(d.value) : d.value;
            return value >= criticalLimit;
        }).length;
        
        const insufficient = validDevices.length - sufficient;
        const total = validDevices.length;
        
        return { total, sufficient, insufficient, efficiency: total > 0 ? (sufficient / total) * 100 : 0 };
    };

    // --- DIŞA AKTARMA ---
    const handleExport = async (formatType: 'jpeg' | 'pdf') => {
        if (!reportRef.current) return showToast("Rapor alanı bulunamadı.", 'error');
        
        const loadScript = (src: string, id: string) => new Promise((resolve, reject) => {
            if (document.getElementById(id)) return resolve(true);
            const script = document.createElement('script');
            script.id = id; script.src = src; script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error(`Script load error for ${src}`));
            document.body.appendChild(script);
        });

        try {
            await Promise.all([
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script'),
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas-script')
            ]);
        } catch (error) {
            showToast("Gerekli indirme kütüphaneleri yüklenemedi.", 'error');
            return;
        }

        const html2canvas = (window as any).html2canvas;
        const jsPDF = (window as any).jspdf.jsPDF;
        
        setLoading(prev => ({ ...prev, generating: true }));
        showToast(`${formatType.toUpperCase()} oluşturuluyor...`, 'info');
        
        try {
            const canvas = await html2canvas(reportRef.current, { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: '#ffffff',
                logging: false,
                allowTaint: true
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const fileName = `UV_Lamba_Raporu_${reportInfo.reportNumber}_${reportInfo.customerName.replace(/\s+/g, '_')}`;

            if (formatType === 'jpeg') {
                const link = document.createElement('a');
                link.href = imgData;
                link.download = `${fileName}.jpeg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Upload to Supabase Storage and save to database
                try {
                    const blob = await (await fetch(imgData)).blob();
                    const storageFileName = `uv_lamp_reports/${selectedCustomerId}_${Date.now()}.jpg`;

                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('documents')
                        .upload(storageFileName, blob, {
                            contentType: 'image/jpeg',
                            upsert: false
                        });

                    if (!uploadError) {
                        const { data: urlData } = supabase.storage
                            .from('documents')
                            .getPublicUrl(storageFileName);

                        await handleSaveReport(urlData.publicUrl);
                    }
                } catch (storageError) {
                    console.error('Storage upload error:', storageError);
                }
            } else {
                const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const ratio = canvasWidth / pdfWidth;
                const canvasHeightInPdf = canvasHeight / ratio;

                let position = 0;
                let heightLeft = canvasHeightInPdf;

                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, canvasHeightInPdf);
                heightLeft -= pdfHeight;

                while (heightLeft > 0) {
                    position -= pdfHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, canvasHeightInPdf);
                    heightLeft -= pdfHeight;
                }
                pdf.save(`${fileName}.pdf`);
            }
            showToast("Rapor başarıyla dışa aktarıldı!", 'success');
        } catch (error) {
            showToast("Rapor oluşturulurken bir hata oluştu.", 'error');
            console.error(error);
        } finally {
            setLoading(prev => ({ ...prev, generating: false }));
        }
    };

    const stats = getStatistics();

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            {/* ... (Header, İstatistikler, Firma Bilgileri JSX'i aynı) ... */}

            <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200 space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4 flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Rapor Bilgileri
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-600 mb-1">Rapor No</label><input type="text" value={reportInfo.reportNumber} onChange={(e) => handleInfoChange('reportNumber', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50" readOnly /></div>
                            <div><label className="block text-sm font-medium text-gray-600 mb-1">Teknisyen</label><input type="text" value={reportInfo.technician} onChange={(e) => handleInfoChange('technician', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="Teknisyen adı" /></div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Müşteri Adı</label>
                                <select
                                    value={selectedCustomerId}
                                    onChange={(e) => {
                                        const customerId = e.target.value;
                                        const customer = customers.find(c => c.id === customerId);
                                        setSelectedCustomerId(customerId);
                                        handleInfoChange('customerName', customer ? customer.kisa_isim : '');
                                        setSelectedBranchId(''); 
                                        handleInfoChange('branchName', '');
                                    }}
                                    className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                                    disabled={loading.customers}
                                >
                                    <option value="">{loading.customers ? 'Yükleniyor...' : 'Müşteri Seçin'}</option>
                                    {customers.map(customer => (
                                        <option key={customer.id} value={customer.id}>{customer.kisa_isim}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Şube/Lokasyon</label>
                                <select
                                    value={selectedBranchId}
                                    onChange={(e) => {
                                        const branchId = e.target.value;
                                        const branch = branches.find(b => b.id === branchId);
                                        setSelectedBranchId(branchId);
                                        handleInfoChange('branchName', branch ? branch.sube_adi : '');
                                    }}
                                    className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                                    disabled={!selectedCustomerId || loading.branches}
                                >
                                    <option value="">
                                        {!selectedCustomerId ? 'Önce Müşteri Seçin' : loading.branches ? 'Yükleniyor...' : 'Şube Seçin'}
                                    </option>
                                    {branches.map(branch => (
                                        <option key={branch.id} value={branch.id}>{branch.sube_adi}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">UV Lamba Ekipman Türü</label>
                                <select
                                    value={selectedEquipmentTypeId}
                                    onChange={(e) => setSelectedEquipmentTypeId(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                                    disabled={loading.equipmentTypes || !selectedBranchId}
                                >
                                    <option value="">
                                        {loading.equipmentTypes ? 'Yükleniyor...' : !selectedBranchId ? 'Önce Şube Seçin' : 'Ekipman Türü Seçin'}
                                    </option>
                                    {equipmentTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div><label className="block text-sm font-medium text-gray-600 mb-1">Ölçüm Tarihi</label><input type="date" value={reportInfo.reportDate} onChange={(e) => handleInfoChange('reportDate', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" /></div>
                            <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-600 mb-1">Sonraki Kontrol</label><input type="date" value={reportInfo.nextInspectionDate} onChange={(e) => handleInfoChange('nextInspectionDate', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" /></div>
                            <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-600 mb-1">Kritik Limit (µW/cm²)</label><input type="number" step="0.1" value={criticalLimit} onChange={e => setCriticalLimit(parseFloat(e.target.value) || 8)} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="Minimum etkinlik değeri"/></div>
                        </div>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-semibold text-gray-700 border-b pb-3 mb-4 flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Cihaz Ölçümleri
                        </h2>
                        <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                            {devices.length > 0 ? devices.map((device, index) => {
                                const value = typeof device.value === 'string' ? parseFloat(device.value) : device.value;
                                const isValid = !isNaN(value) && device.value !== '';
                                const status = isValid ? (value >= criticalLimit ? 'sufficient' : 'insufficient') : 'empty';
                                
                                return (
                                    <div key={device.id} className={`grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-lg border-2 relative ${
                                        status === 'sufficient' ? 'bg-green-50 border-green-200' :
                                        status === 'insufficient' ? 'bg-red-50 border-red-200' :
                                        'bg-gray-50 border-gray-200'
                                    }`}>
                                        <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                                            <input type="text" value={device.equipment_code} readOnly className="w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-100" />
                                            <input type="text" value={device.department} readOnly className="w-full p-2 border border-gray-300 rounded-md text-sm bg-gray-100" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="number" step="0.01" value={device.value} onChange={(e) => handleDeviceChange(device.id, 'value', e.target.value)} placeholder="µW/cm²" className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                                            {isValid && (
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                    value >= criticalLimit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {value >= criticalLimit ? '✓' : '⚠'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p className="text-center text-gray-500 py-4">Lütfen bir ekipman türü seçin.</p>
                            )}
                        </div>
                    </section>
                </div>

                <div className="bg-white shadow-lg print-section border-2 border-gray-200 rounded-xl overflow-hidden">
                    {/* ... Rapor Önizleme ... */}
                </div>
            </div>

            {/* ... Kayıtlı Raporlar Tablosu ... */}
        </div>
    );
};

export default UvLampReport;
