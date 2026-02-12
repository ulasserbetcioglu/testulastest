import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Shield, Building, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
import BranchActionPlanView from '../components/CriticalLimits/BranchActionPlanView';

interface CustomerOption { id: string; kisa_isim: string; }
interface BranchOption { id: string; sube_adi: string; customer_id: string; }

const AdminActionPlan: React.FC = () => {
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [customersRes, branchesRes] = await Promise.all([
                supabase.from('customers').select('id, kisa_isim').eq('is_active', true).order('kisa_isim'),
                supabase.from('branches').select('id, sube_adi, customer_id').order('sube_adi'),
            ]);
            setCustomers(customersRes.data || []);
            setBranches(branchesRes.data || []);
        } catch (error) {
            console.error('Veri yuklenirken hata:', error);
            toast.error('Müşteri ve şube listesi yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoGenerate = async () => {
        if (!confirm('Planı olmayan tüm şubeler için varsayılan acil eylem planı oluşturulacak. Onaylıyor musunuz?')) return;
        setGenerating(true);
        try {
            // 1. Get all branches with customer info
            const { data: allBranches } = await supabase
                .from('branches')
                .select('id, sube_adi, customer_id, customers(kisa_isim)'); // ensure we get customer name

            if (!allBranches) throw new Error('Şubeler çekilemedi');

            // 2. Get existing plans to filter
            const { data: existingPlans } = await supabase.from('branch_critical_limits').select('branch_id');
            const existingBranchIds = new Set(existingPlans?.map(p => p.branch_id));

            // 3. Identify target branches
            const targetBranches = allBranches.filter(b => !existingBranchIds.has(b.id));

            if (targetBranches.length === 0) {
                toast.info('Tüm şubelerin planı zaten mevcut.');
                return;
            }

            const companyName = 'PestMentor';

            // 4. Prepare inserts with dynamic names
            const allInserts = targetBranches.flatMap(b => {
                // @ts-ignore
                const customerName = b.customers?.kisa_isim || 'Müşteri';
                const branchName = b.sube_adi;
                const fullName = `${customerName} ${branchName}`;

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
                    }
                ];

                return defaultItems.map(item => ({
                    branch_id: b.id,
                    ...item
                }));
            });

            // 6. Bulk insert
            const { error } = await supabase.from('branch_critical_limits').insert(allInserts);
            if (error) throw error;

            toast.success(`${targetBranches.length} şube için plan oluşturuldu.`);
            if (selectedBranchId) {
                // Refresh if current view is affected
                window.location.reload();
            }

        } catch (error: any) {
            console.error('Auto generate error:', error);
            toast.error('Hata: ' + error.message);
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-orange-600" size={32} />
            </div>
        );
    }

    const filteredBranches = selectedCustomerId
        ? branches.filter(b => b.customer_id === selectedCustomerId)
        : [];

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="text-orange-600" /> Acil Eylem Planı Yönetimi
                    </h1>
                    <p className="text-sm text-gray-500">
                        Acil eylem planlarını görüntülemek ve düzenlemek için lütfen bir müşteri ve şube seçiniz.
                    </p>
                </div>
                <button
                    onClick={handleAutoGenerate}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-sm font-medium hover:bg-orange-200 disabled:opacity-50"
                >
                    {generating ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                    Tüm Şubeler İçin Otomatik Oluştur
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Müşteri Seçimi</label>
                    <div className="relative">
                        <select
                            value={selectedCustomerId}
                            onChange={(e) => {
                                setSelectedCustomerId(e.target.value);
                                setSelectedBranchId('');
                            }}
                            className="w-full p-2.5 pl-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="">Lütfen müşteri seçiniz...</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.kisa_isim}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Şube Seçimi</label>
                    <div className="relative">
                        <select
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                            disabled={!selectedCustomerId}
                            className="w-full p-2.5 pl-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                            <option value="">Lütfen şube seçiniz...</option>
                            {filteredBranches.map(b => (
                                <option key={b.id} value={b.id}>{b.sube_adi}</option>
                            ))}
                        </select>
                        {!selectedCustomerId && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                                <span className="text-xs">Önce müşteri seçilmeli</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedBranchId ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
                    <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center gap-2">
                        <Shield className="text-orange-600 w-5 h-5" />
                        <span className="font-semibold text-orange-900">
                            {customers.find(c => c.id === selectedCustomerId)?.kisa_isim} - {branches.find(b => b.id === selectedBranchId)?.sube_adi}
                        </span>
                        <ChevronRight className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-orange-700">Acil Eylem Planı</span>
                    </div>
                    <div className="p-6">
                        <BranchActionPlanView branchId={selectedBranchId} readOnly={false} />
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl text-center">
                    <Building className="w-12 h-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Şube Seçimi Bekleniyor</h3>
                    <p className="text-gray-500 max-w-sm mt-1">İşlem yapmak istediğiniz şubeyi yukarıdan seçiniz.</p>
                </div>
            )}
        </div>
    );
};

export default AdminActionPlan;
