import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
// import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Loader2, AlertTriangle, Plus, Trash2, Save, X, Edit2, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface CriticalLimit {
    id: string;
    branch_id: string;
    danger_source: string;
    detection_method: string;
    critical_limit: string;
    responsible: string;
    corrective_action: string;
    record_type: string;
}

interface Props {
    branchId: string;
    readOnly?: boolean;
}

const BranchActionPlanView: React.FC<Props> = ({ branchId, readOnly = false }) => {
    const [limits, setLimits] = useState<CriticalLimit[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // PDF Header Data
    const [headerData, setHeaderData] = useState<{
        customerName: string;
        branchName?: string;
        mainCustomerName?: string;
        customerAddress: string;
        customerCity: string;
        revisionDate: string;
        responsiblePerson: string;
        companyLogo: string | null;
    } | null>(null);

    // Edit forms state
    const [newLimit, setNewLimit] = useState<Partial<CriticalLimit>>({});
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (branchId) {
            fetchLimits();
            fetchHeaderData();
        }
    }, [branchId]);

    const fetchHeaderData = async () => {
        try {
            // 1. Get Company Settings (for Logo)
            const { data: companySettings } = await supabase
                .from('company_settings')
                .select('logo_url')
                .maybeSingle();

            // 2. Get Branch & Customer Info
            const { data: branchData } = await supabase
                .from('branches')
                .select('id, sube_adi, address, city, customers(id, kisa_isim, cari_isim, address, city)')
                .eq('id', branchId)
                .maybeSingle();

            if (branchData) {
                // Supabase types might return array or object depending on relationship. 
                const rawCust = branchData.customers;
                const cust = Array.isArray(rawCust) ? rawCust[0] : rawCust;
                const mainName = cust?.kisa_isim || cust?.cari_isim || '';
                const bName = branchData.sube_adi || '';

                setHeaderData({
                    customerName: mainName || bName || 'Müşteri',
                    branchName: bName,
                    mainCustomerName: mainName,
                    // Prefer branch address if available, else customer
                    customerAddress: branchData.address || cust?.address || '',
                    customerCity: branchData.city || cust?.city || '',
                    revisionDate: new Date().toLocaleDateString('tr-TR'),
                    responsiblePerson: 'PestMentor',
                    companyLogo: companySettings?.logo_url || null
                });
            } else {
                // Fallback if branch not found (rare)
                setHeaderData({
                    customerName: 'Müşteri',
                    branchName: '',
                    mainCustomerName: '',
                    customerAddress: '',
                    customerCity: '',
                    revisionDate: new Date().toLocaleDateString('tr-TR'),
                    responsiblePerson: 'PestMentor',
                    companyLogo: companySettings?.logo_url || null
                });
            }
        } catch (error) {
            console.error('Header data fetch error:', error);
            // Fallback on error
            setHeaderData({
                customerName: 'Müşteri (Hata)',
                branchName: '',
                mainCustomerName: '',
                customerAddress: '',
                customerCity: '',
                revisionDate: new Date().toLocaleDateString('tr-TR'),
                responsiblePerson: 'PestMentor',
                companyLogo: null
            });
        }
    }

    const fetchLimits = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('branch_critical_limits')
                .select('*')
                .eq('branch_id', branchId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setLimits(data || []);
        } catch (error) {
            console.error('Error fetching action plan:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (limit: Partial<CriticalLimit>, id?: string) => {
        try {
            if (!limit.danger_source || !limit.critical_limit) {
                toast.error('Lütfen zorunlu alanları doldurunuz (Tehlike ve Kritik Limit)');
                return;
            }

            const limitData = {
                branch_id: branchId,
                danger_source: limit.danger_source,
                detection_method: limit.detection_method,
                critical_limit: limit.critical_limit,
                responsible: limit.responsible,
                corrective_action: limit.corrective_action,
                record_type: limit.record_type
            };

            let error;
            if (id) {
                const { error: err } = await supabase
                    .from('branch_critical_limits')
                    .update(limitData)
                    .eq('id', id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('branch_critical_limits')
                    .insert([limitData]);
                error = err;
            }

            if (error) throw error;

            toast.success(id ? 'Güncellendi' : 'Eklendi');
            setNewLimit({});
            setEditingId(null);
            fetchLimits();
        } catch (error: any) {
            console.error('Error saving:', error);
            toast.error('Kaydedilirken hata oluştu: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
        try {
            const { error } = await supabase
                .from('branch_critical_limits')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Silindi');
            setLimits(limits.filter(l => l.id !== id));
        } catch (error: any) {
            toast.error('Silinirken hata oluştu');
        }
    };

    const handleAutoFill = async () => {
        if (!window.confirm('Varsayılan acil eylem planı maddeleri eklenecek. Onaylıyor musunuz?')) return;
        setLoading(true);
        try {
            // Fetch branch and customer details for name replacement
            const { data: branchData, error: branchError } = await supabase
                .from('branches')
                .select('sube_adi, customers (kisa_isim)')
                .eq('id', branchId)
                .single();

            if (branchError) throw branchError;

            // @ts-ignore
            const customerName = branchData?.customers?.kisa_isim || 'Müşteri';
            const branchName = branchData?.sube_adi || 'Şube';
            const fullName = `${customerName} ${branchName}`;
            const companyName = 'PestMentor';

            const defaultItems = [
                {
                    danger_source: 'Dış alanda kemirgen aktivitesi',
                    detection_method: 'Kemirgen yem istasyonlarının aylık kontrollerinde',
                    critical_limit: 'Aynı istasyonda aylık kontrollerde peşpeşe iki hafta yem tüketimi görülmesi',
                    responsible: `${companyName} & ${fullName}`,
                    corrective_action: `1. Aktif yuvaların ${companyName} tarafından bulunması ve kaynağın tespiti, 2. Peşpeşe 3 (ÜÇ) ziyaret takip edilerek yeni bir aktivite yoksa rutine geçimesi...`,
                    record_type: 'SERVİS RAPORU'
                },
                {
                    danger_source: 'Dış alanda kemirgen istilası',
                    detection_method: 'Kemirgen yem istasyonlarının aylık kontrolleri ve GMP denetimlerinde',
                    critical_limit: 'Bir kontrolde toplam yem istasyonu sayısının %25\'inde yem tüketimi tespit edilmesi',
                    responsible: `${companyName} & ${fullName}`,
                    corrective_action: `1. Sorunun kaynağının ${companyName} tarafından tespit edilmesi, 2. Yoğunluk normal limitlere dönene kadar iki haftalık periyotta yem istasyonlarının kontrolüne devam edilmesi...`,
                    record_type: 'SERVİS RAPORU'
                },
                {
                    danger_source: 'Fabrika binası üzerinde kuş yuvası',
                    detection_method: 'aylık dış saha gözlemleri ve aylık GMP denetimleri ve personel geri bildirimlerinde',
                    critical_limit: 'Bir (1) adet kuş yuvası gözlenmesi',
                    responsible: `${companyName} & ${fullName}`,
                    corrective_action: `1. Kuş yuvası tespit edilir edilmez en geç 24 saat içinde ${fullName} tarafından kaldırılması, 2. Yuvanın yeniden yapılma olasılığından hareketle her gün bir hafta boyunca aynı bölgenin takibi...`,
                    record_type: 'SERVİS RAPORU'
                },
                {
                    danger_source: 'Dış alanda uçkun zararlı yoğunluğu',
                    detection_method: 'Aylık dış saha gözlemleri, personel geri bildirimleri ve sinek yakalama cihazlarındaki sayımların dış alan gözlemleriyle örtüşmesiyle',
                    critical_limit: 'Dış kapı yakınlarındaki Sinek yakalama cihazlarındaki yapışkan levhaların ölçümlerinin MAX düzeye ulaşması ve/veya yeni değişen bir yapışkan levhanın hafta içinde tüm yüzeyinin kaplanması vb.',
                    responsible: `${companyName} & ${fullName}`,
                    corrective_action: `1. Türün ${companyName} tarafından tespiti ve yoğunluğun nedeninin bulunması, 2. Sorunun kaynağının tespit ve eliminasyonu, 3. Uçan haşerelerin içeri girebileceği noktaların tespiti ve yalıtımlarının sağlanması...`,
                    record_type: 'SERVİS RAPORU'
                },
                {
                    danger_source: 'Dış alanda kedi veya köpek aktivitesi',
                    detection_method: 'Aylık rutin gözlemler ve personel geri bildirimlerinde',
                    critical_limit: 'Bir (1) adet kedi veya köpek varlığı',
                    responsible: `${companyName} & ${fullName}`,
                    corrective_action: `1. Kedi veya köpek kafesinin ${fullName} tarafından tedarik edilerek uygun noktalarda kurulması yakalanıp uzaklaştırılana kadar takibin devam etmesi...`,
                    record_type: 'SERVİS RAPORU'
                },
                {
                    danger_source: 'İç alanda kemirgen yakalanması',
                    detection_method: 'Canlı yakalama kapanlarının aylık kontrolleri ve personel geri bildirimlerinde',
                    critical_limit: 'Canlı kapanlarda bir (1) adet yakalanma',
                    responsible: `${companyName} & ${fullName}`,
                    corrective_action: `1. Türün tespiti, 2. Kaynağın bulunması ve buna bağlı önlemlerin geliştirilmesi, 3. Peşpeşe 3 (ÜÇ) gün yeni bir yakalanma olup olmadıgının ${fullName} personelince izlenmesi...`,
                    record_type: 'SERVİS RAPORU'
                },
                {
                    danger_source: 'İç alanda kemirgen aktivitesi ve/veya buna bağlı bulgular',
                    detection_method: 'Canlı yakalama kapanlarının aylık kontrolleri ve GMP denetimleri ve personel geri bildirimlerinde',
                    critical_limit: 'En az bir (1) adet gözlem',
                    responsible: `${companyName} & ${fullName}`,
                    corrective_action: `1. Kemirgen yakalanana veya uzaklaştırılana kadar ${fullName} tarafından günlük takiplerin devam etmesi, 2. Kemirgen türünün tespiti, 3. Sorunun kaynağının bulunması...`,
                    record_type: 'SERVİS RAPORU'
                },
                {
                    danger_source: 'Üretim ve paketleme alanlarında sinek aktivitesi',
                    detection_method: 'Aylık kontroller, Sinek yakalama cihazları, GMP denetimleri ve personel geri bildirimlerinde',
                    critical_limit: 'Bir ekipman çevresinde, dar bir alanda aynı anda 5 adet sineğin varlığı',
                    responsible: `${companyName} & ${fullName}`,
                    corrective_action: `1. Yoğunluğa neden olan ağırlıklı sinek türünün ${companyName} tarafından tespiti, 2. Sinek kaynağının bulunması, 3. Popülasyon küçük sineklerden oluşuyorsa kanal içlerinin kontrolleri ve temizliklerinin yapılması, 4. Toksik olmayan yöntemlerle (yapışkan levhalarla) mevcut popülasyonun eliminasyonu, 5. Sorun yaşanan noktada her vardiyada gün boyunca ${fullName} tarafından takibin sürdürülmesi (her vardiyada yapışkan levha sayımı ve levhaların yenilenmesi), 6. Bölgedeki Sinek yakalama cihazlarının etkinliklerinin test edilmesi.`,
                    record_type: 'SERVİS RAPORU'
                },
                {
                    danger_source: 'Hassas noktalardaki Sinek Yakalama cihazlarında yakalanan sinek sayısındaki artış',
                    detection_method: 'Aylık Sinek Yakalama Cihazları ve sayımlarında',
                    critical_limit: 'İki haftalık sayımlarda cihaz başına yakalanma ortalamasının 150\'den fazla olması',
                    responsible: `${companyName} & ${fullName}`,
                    corrective_action: `1. Ağırlıklı sinek türünün ${companyName} tarafından tespiti, 2. Yoğunluk nedenlerinin bulunması, 3. Bu bilgilere bağlı ek önlemlerin alınması, 4. Gerekirse Sinek yakalama cihazları sayısında geçici artış sağlanması, 5. Yalıtımla ilgili sorunlar varsa tespit edilmesi.`,
                    record_type: 'SERVİS RAPORU'
                },
                {
                    danger_source: 'Depo zararlısı aktivitesi',
                    detection_method: 'Aylık kontroller, feromonlu tuzakları kontrolü, personel geri bildirimleri ve hammadde alımında',
                    critical_limit: 'Herhangi bir depo zararlısının bir (1) adet yakalanmasının tespit edilmesi veya gözlenmesi',
                    responsible: `${companyName} & ${fullName}`,
                    corrective_action: `1. Depo zararlısının ${companyName} tarafından türü tespit edilmesi, 2. Türe bağlı önlemler değerlendirilmesi, 3. Tedarikçi ilişkisi kurularak destek sağlanması, 4. Sorun yaygın ise ret, karantina gibi radikal önlemler alınması, 5. Sorun görülen alanda ve üründe peşpeşe 1 (BİR) bir hafta boyunca her gün ${fullName} personelince kontrol yapılması, 6. Rutin kontrole dönüldükten 21 gün sonra aynı noktada tekrar kontrol yapılması.`,
                    record_type: 'SERVİS RAPORU'
                },
                {
                    danger_source: 'Bina içerisinde kuş aktivitesi',
                    detection_method: 'Aylık kontroller ve personel geri bildirimlerinde',
                    critical_limit: 'Bir (1) adet kuş aktivitesi gözlenmesi',
                    responsible: `${companyName} & ${fullName}`,
                    corrective_action: `1. Kuş yakalanan veya dışarı çıkartılana kadar ${fullName} tarafından takiplerin devam ettirilmesi, 2. Kuşun içeride iken yarattığı kirliliklerin temizlenmesi - başka bir kuşun henüz tespit edilmeyen giriş noktası hesaba katılarak sabah erken saatler mutlaka olmak üzere değişik saatlerde ${fullName} tarafından günlük kontrollerin 2 (İKİ) gün boyunca sürdürülmesi, 3. Giriş noktasının ve nedeninin bulunması, 4. Sorun yaşanan yerin dış çevresindeki kuş kontrol önlemlerinin değerlendirilmesi.`,
                    record_type: 'SERVİS RAPORU'
                },
                {
                    danger_source: 'İşletme içerisinde herhangi bir yerde hamamböceği aktivitesi veya yakalanması',
                    detection_method: 'Haftalık kontroller, böcek trapları, canlı kapanlar, GMP denetimleri ve personel geri bildirimlerinde',
                    critical_limit: 'Bir (1) adet hamamböceği gözlenmesi',
                    responsible: `${companyName} & ${fullName}`,
                    corrective_action: `1. Türün ${companyName} tarafından tespiti, 2. Kaynağın bulunması, 3. Peşpeşe 3 (ÜÇ) gün yeni bir yakalanma olup olmadığının ${fullName} tarafından izlenmesi sonuç olumlu ise rutin kontrollere dönülmesi, 4. Gerekiyorsa canlı kapan ve toksik olmayan kontrol yöntemlerinin sayısının artırılması, 5. Zorunlu ise, üretim dışı bir zaman diliminde uygun yöntemlerle ilaçlama yapılması, 6. Personelle taşınma olasılığına karşı personel dolaplarında örnekleme yöntemiyle gıda olup olmadığının kontrol edilmesi.`,
                    record_type: 'SERVİS RAPORU'
                },
                {
                    danger_source: 'Bulaşıcı hastalık etmeni zararlıların varlığı',
                    detection_method: 'Haftalık rutin gözlemlerde',
                    critical_limit: 'Bir (1) adet hastalık etmeni gözlenmesi',
                    responsible: `${companyName} & ${fullName}`,
                    corrective_action: `1. Zararlı türünün ${companyName} tarafından tespiti, 2. ${fullName} yönetimi ile birlikte alınabilecek en geniş önlemin alınması, 3. Saptanan kontrol yöntemlerinin öncelikli olarak hayata geçirilmesi, 4. Konu ile ilgili işyeri hekiminin bilgilendirilmesi.`,
                    record_type: 'SERVİS RAPORU'
                }
            ];

            const inserts = defaultItems.map(item => ({
                branch_id: branchId,
                ...item
            }));

            const { error: insertError } = await supabase.from('branch_critical_limits').insert(inserts);
            if (insertError) throw insertError;

            toast.success('Varsayılan plan maddeleri eklendi');
            fetchLimits();

        } catch (error: any) {
            console.error('Error autofilling:', error);
            toast.error('Hata: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async () => {
        let currentHeader = headerData;

        // JIT Fetch if missing
        if (!currentHeader) {
            // Fetch Company Settings
            const { data: companySettings } = await supabase
                .from('company_settings')
                .select('logo_url')
                .maybeSingle();

            const { data: branchData } = await supabase
                .from('branches')
                .select('id, sube_adi, address, city, customers(id, kisa_isim, cari_isim, address, city)')
                .eq('id', branchId)
                .maybeSingle();

            if (branchData) {
                const rawCust = branchData.customers;
                const cust = Array.isArray(rawCust) ? rawCust[0] : rawCust;
                const mainName = cust?.kisa_isim || cust?.cari_isim || '';
                const bName = branchData.sube_adi || '';

                currentHeader = {
                    customerName: mainName || bName || 'Müşteri',
                    branchName: bName,
                    mainCustomerName: mainName,
                    customerAddress: branchData.address || cust?.address || '',
                    customerCity: branchData.city || cust?.city || '',
                    revisionDate: new Date().toLocaleDateString('tr-TR'),
                    responsiblePerson: 'PestMentor',
                    companyLogo: companySettings?.logo_url || null
                };
                setHeaderData(currentHeader);
            }
        }

        // Ultimate fallback
        if (!currentHeader) {
            currentHeader = {
                customerName: 'Müşteri',
                branchName: '',
                mainCustomerName: '',
                customerAddress: '',
                customerCity: '',
                revisionDate: new Date().toLocaleDateString('tr-TR'),
                responsiblePerson: 'PestMentor Uzmanı',
                companyLogo: null
            };
        }

        try {
            // Dynamic import to avoid circular dependencies if any
            const { generateActionPlanPdf } = await import('../../utils/actionPlanPdfGenerator');

            await generateActionPlanPdf({
                customerName: currentHeader.customerName,
                branchName: currentHeader.branchName,
                mainCustomerName: currentHeader.mainCustomerName,
                customerAddress: currentHeader.customerAddress,
                customerCity: currentHeader.customerCity,
                responsiblePerson: currentHeader.responsiblePerson,
                reportDate: currentHeader.revisionDate,
                companyLogo: currentHeader.companyLogo,
                items: limits
            });
        } catch (err) {
            console.error('PDF Generation Error:', err);
            toast.error('PDF oluşturulurken bir hata oluştu.');
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-amber-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-amber-50 p-4 rounded-lg border border-amber-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full shadow-sm text-amber-600">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-900">Acil Eylem Planı</h4>
                        <p className="text-xs text-amber-700">Zararlı Kontrolü Acil Eylem Planı (Pest Control Contingency Plan)</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={downloadPDF}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50"
                        title="PDF İndir"
                    >
                        <FileDown size={16} />
                        <span className="hidden sm:inline">PDF İndir</span>
                    </button>
                    {!readOnly && (
                        <>
                            {limits.length === 0 && (
                                <button onClick={handleAutoFill} className="px-3 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50">
                                    Varsayılanları Yükle
                                </button>
                            )}
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isEditing ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-amber-600 text-white hover:bg-amber-700'
                                    }`}
                            >
                                {isEditing ? 'Düzenlemeyi Bitir' : 'Düzenle'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                            <tr>
                                <th className="p-3 w-10">No</th>
                                <th className="p-3">Tehlike</th>
                                <th className="p-3">Tespit Yöntemi</th>
                                <th className="p-3">Kritik Limit</th>
                                <th className="p-3">Sorumlu</th>
                                <th className="p-3">Düzeltici Faaliyet</th>
                                <th className="p-3">Kayıt</th>
                                {!readOnly && isEditing && <th className="p-3 w-20">İşlem</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {limits.map((limit, index) => (
                                <tr key={limit.id} className="hover:bg-gray-50 group">
                                    <td className="p-3 font-medium text-gray-500">{index + 1}</td>

                                    {editingId === limit.id ? (
                                        <>
                                            <td className="p-2"><textarea className="w-full p-2 border rounded" defaultValue={limit.danger_source} id={`edit-danger-${limit.id}`} /></td>
                                            <td className="p-2"><textarea className="w-full p-2 border rounded" defaultValue={limit.detection_method} id={`edit-method-${limit.id}`} /></td>
                                            <td className="p-2"><textarea className="w-full p-2 border rounded" defaultValue={limit.critical_limit} id={`edit-limit-${limit.id}`} /></td>
                                            <td className="p-2"><input className="w-full p-2 border rounded" defaultValue={limit.responsible} id={`edit-resp-${limit.id}`} /></td>
                                            <td className="p-2"><textarea className="w-full p-2 border rounded" defaultValue={limit.corrective_action} id={`edit-action-${limit.id}`} /></td>
                                            <td className="p-2"><input className="w-full p-2 border rounded" defaultValue={limit.record_type} id={`edit-record-${limit.id}`} /></td>
                                            <td className="p-2">
                                                <div className="flex gap-1">
                                                    <button onClick={() => {
                                                        const danger = (document.getElementById(`edit-danger-${limit.id}`) as HTMLTextAreaElement).value;
                                                        const method = (document.getElementById(`edit-method-${limit.id}`) as HTMLTextAreaElement).value;
                                                        const lim = (document.getElementById(`edit-limit-${limit.id}`) as HTMLTextAreaElement).value;
                                                        const resp = (document.getElementById(`edit-resp-${limit.id}`) as HTMLInputElement).value;
                                                        const action = (document.getElementById(`edit-action-${limit.id}`) as HTMLTextAreaElement).value;
                                                        const record = (document.getElementById(`edit-record-${limit.id}`) as HTMLInputElement).value;
                                                        handleSave({ danger_source: danger, detection_method: method, critical_limit: lim, responsible: resp, corrective_action: action, record_type: record }, limit.id);
                                                    }} className="p-1.5 text-green-600 bg-green-50 rounded hover:bg-green-100"><Save size={16} /></button>
                                                    <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-600 bg-gray-50 rounded hover:bg-gray-100"><X size={16} /></button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-3 font-medium text-gray-900">{limit.danger_source}</td>
                                            <td className="p-3 text-gray-600">{limit.detection_method}</td>
                                            <td className="p-3 font-medium text-red-600 bg-red-50 rounded-lg">{limit.critical_limit}</td>
                                            <td className="p-3 text-gray-600">{limit.responsible}</td>
                                            <td className="p-3 text-gray-600">{limit.corrective_action}</td>
                                            <td className="p-3 text-gray-600">{limit.record_type}</td>
                                            {!readOnly && isEditing && (
                                                <td className="p-3">
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setEditingId(limit.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                                                        <button onClick={() => handleDelete(limit.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            )}
                                        </>
                                    )}
                                </tr>
                            ))}

                            {!readOnly && isEditing && !editingId && (
                                <tr className="bg-amber-50">
                                    <td className="p-3 text-center"><Plus size={16} className="mx-auto text-amber-600" /></td>
                                    <td className="p-2"><textarea placeholder="Tehlike" className="w-full p-2 border rounded text-sm" value={newLimit.danger_source || ''} onChange={e => setNewLimit({ ...newLimit, danger_source: e.target.value })} /></td>
                                    <td className="p-2"><textarea placeholder="Tespit Yöntemi" className="w-full p-2 border rounded text-sm" value={newLimit.detection_method || ''} onChange={e => setNewLimit({ ...newLimit, detection_method: e.target.value })} /></td>
                                    <td className="p-2"><textarea placeholder="Kritik Limit" className="w-full p-2 border rounded text-sm" value={newLimit.critical_limit || ''} onChange={e => setNewLimit({ ...newLimit, critical_limit: e.target.value })} /></td>
                                    <td className="p-2"><input placeholder="Sorumlu" className="w-full p-2 border rounded text-sm" value={newLimit.responsible || ''} onChange={e => setNewLimit({ ...newLimit, responsible: e.target.value })} /></td>
                                    <td className="p-2"><textarea placeholder="Düzeltici Faaliyet" className="w-full p-2 border rounded text-sm" value={newLimit.corrective_action || ''} onChange={e => setNewLimit({ ...newLimit, corrective_action: e.target.value })} /></td>
                                    <td className="p-2"><input placeholder="Kayıt Türü" className="w-full p-2 border rounded text-sm" value={newLimit.record_type || ''} onChange={e => setNewLimit({ ...newLimit, record_type: e.target.value })} /></td>
                                    <td className="p-2">
                                        <button onClick={() => handleSave(newLimit)} className="w-full py-2 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm font-medium">Ekle</button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {limits.length === 0 && !loading && (
                        <div className="p-8 text-center text-gray-500">
                            Henüz acil eylem planı oluşturulmamış. {!readOnly && 'Varsayılanları Yükle butonunu kullanarak standart planı ekleyebilirsiniz.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BranchActionPlanView;
