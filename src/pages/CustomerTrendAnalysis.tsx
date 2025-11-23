import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/Auth/AuthProvider';
import { localAuth } from '../lib/localAuth';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  TrendingUp,
  Download,
  Loader2,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
  Save,
  Filter
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import html2canvas from 'html2canvas';

// --- ARAYÜZLER ---
interface VisitStats {
  total_visits: number;
  completed_visits: number;
  pending_visits: number;
  cancelled_visits: number;
}

interface MonthlyTrend {
  month: string;
  visits: number;
  equipment_checks: number;
  issues_found: number;
}

interface BiocidalProductUsage {
  product_name: string;
  active_ingredient: string;
  total_quantity: number;
  unit: string;
  usage_count: number;
}

interface EquipmentTypeActivity {
  equipment_code: string;
  equipment_name: string;
  branch_name: string;
  [key: string]: string | number;
}

interface EquipmentTypeData {
  type: string;
  type_label: string;
  activities: EquipmentTypeActivity[];
  propertyKeys: string[];
  propertyLabels: Record<string, string>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

const CustomerTrendAnalysis: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // State
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  
  const [dateRange, setDateRange] = useState({
    from: format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  // Data States
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [biocidalProducts, setBiocidalProducts] = useState<BiocidalProductUsage[]>([]);
  const [equipmentTypeData, setEquipmentTypeData] = useState<EquipmentTypeData[]>([]);
  const [chartViewMode, setChartViewMode] = useState<'total' | 'per_visit'>('total');

  const reportRef = useRef<HTMLDivElement>(null);

  // 1. Müşteri Kimliğini Belirle
  useEffect(() => {
    const init = async () => {
      const id = await localAuth.getCurrentCustomerId();
      if (id) {
        setCustomerId(id);
        fetchBranches(id);
      } else if (user?.customer_id) {
        setCustomerId(user.customer_id);
        fetchBranches(user.customer_id);
      }
    };
    init();
  }, [user]);

  // 2. Şubeleri Çek
  const fetchBranches = async (id: string) => {
    try {
      const { data } = await supabase
        .from('branches')
        .select('id, sube_adi')
        .eq('customer_id', id)
        .order('sube_adi');
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // 3. Raporu Oluştur
  const handleGenerateReport = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      await Promise.all([
        fetchVisitStats(),
        fetchMonthlyTrends(),
        fetchBiocidalProducts(),
        fetchEquipmentTypeActivities()
      ]);
      toast.success('Analiz güncellendi');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Veriler alınırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      handleGenerateReport();
    }
  }, [customerId, selectedBranchId, dateRange.from, dateRange.to]);

  // --- Veri Çekme Fonksiyonları ---

  const fetchVisitStats = async () => {
    if (!customerId) return;
    let query = supabase
      .from('visits')
      .select('id, status')
      .eq('customer_id', customerId)
      .gte('visit_date', dateRange.from)
      .lte('visit_date', dateRange.to);

    if (selectedBranchId) query = query.eq('branch_id', selectedBranchId);

    const { data } = await query;
    const visits = data || [];

    setVisitStats({
      total_visits: visits.length,
      completed_visits: visits.filter(v => v.status === 'completed').length,
      pending_visits: visits.filter(v => v.status === 'planned').length,
      cancelled_visits: visits.filter(v => v.status === 'cancelled').length,
    });
  };

  const fetchMonthlyTrends = async () => {
    if (!customerId) return;
    const startDate = parseISO(dateRange.from);
    const endDate = parseISO(dateRange.to);
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const trendsData = await Promise.all(months.map(async (month) => {
      const start = format(startOfMonth(month), 'yyyy-MM-dd');
      const end = format(endOfMonth(month), 'yyyy-MM-dd');

      let query = supabase
        .from('visits')
        .select('id, equipment_checks')
        .eq('customer_id', customerId)
        .gte('visit_date', start)
        .lte('visit_date', end);

      if (selectedBranchId) query = query.eq('branch_id', selectedBranchId);

      const { data } = await query;
      const visits = data || [];
      
      let issues = 0;
      let checks = 0;

      visits.forEach((v: any) => {
        if (v.equipment_checks) {
          checks += Object.keys(v.equipment_checks).length;
          Object.values(v.equipment_checks).forEach((c: any) => {
            if (c.status === 'issue' || c.status === 'problem' || c.status === 'missing') issues++;
          });
        }
      });

      return {
        month: format(month, 'MMM yyyy', { locale: tr }),
        visits: visits.length,
        equipment_checks: checks,
        issues_found: issues
      };
    }));

    setMonthlyTrends(trendsData);
  };

  const fetchBiocidalProducts = async () => {
    if (!customerId) return;
    let query = supabase
      .from('biocidal_products_usage')
      .select(`
        quantity, unit,
        biocidal_products (name, active_ingredient)
      `)
      .eq('customer_id', customerId)
      .gte('created_at', dateRange.from)
      .lte('created_at', dateRange.to);

    if (selectedBranchId) query = query.eq('branch_id', selectedBranchId);

    const { data } = await query;
    const productMap = new Map<string, BiocidalProductUsage>();

    data?.forEach((usage: any) => {
      const name = usage.biocidal_products?.name || 'Bilinmeyen';
      const quantity = parseFloat(usage.quantity) || 0;
      
      if (!productMap.has(name)) {
        productMap.set(name, {
          product_name: name,
          active_ingredient: usage.biocidal_products?.active_ingredient || '',
          total_quantity: 0,
          unit: usage.unit || 'adet',
          usage_count: 0
        });
      }
      const p = productMap.get(name)!;
      p.total_quantity += quantity;
      p.usage_count++;
    });

    setBiocidalProducts(Array.from(productMap.values()).sort((a,b) => b.total_quantity - a.total_quantity));
  };

  const fetchEquipmentTypeActivities = async () => {
    if (!customerId) return;

    try {
      // 1. İlgili Şubeleri Bul
      let branchIds: string[] = [];
      if (selectedBranchId) {
        branchIds = [selectedBranchId];
      } else {
        branchIds = branches.map(b => b.id);
      }

      if (branchIds.length === 0) {
        setEquipmentTypeData([]);
        return;
      }

      // 2. Ekipman Tanımlarını Çek (Tip ve Özellikleri öğrenmek için)
      // DÜZELTME: 'id' alanını da çekiyoruz, çünkü visits tablosunda veriler id ile eşleşiyor.
      const { data: equipmentData, error: eqError } = await supabase
        .from('branch_equipment')
        .select(`
          id,
          equipment_code,
          equipment:equipment_id ( name, type, properties ),
          branch:branch_id ( sube_adi )
        `)
        .in('branch_id', branchIds);

      if (eqError) throw eqError;

      // 3. Ziyaret Verilerini Çek (Aktivite sayıları burada)
      const { data: visitsData } = await supabase
        .from('visits')
        .select('equipment_checks')
        .in('branch_id', branchIds)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .eq('status', 'completed');

      // 4. Hesaplama Mantığı
      // Her bir ekipman ID'si için toplam aktiviteleri topla
      const activityMap = new Map<string, Record<string, number>>();
      const visitCountMap = new Map<string, number>(); // Ortalama hesabı için

      visitsData?.forEach(visit => {
        if (visit.equipment_checks) {
          // DÜZELTME: equipment_checks içindeki anahtarlar branch_equipment.id'dir (UUID)
          Object.entries(visit.equipment_checks).forEach(([eqId, checkData]: [string, any]) => {
            if (!activityMap.has(eqId)) activityMap.set(eqId, {});
            visitCountMap.set(eqId, (visitCountMap.get(eqId) || 0) + 1);

            const activity = activityMap.get(eqId)!;
            if (checkData && typeof checkData === 'object') {
              // Sayısal değerleri topla (örn: catch_count, consumption, activity_level vb.)
              Object.entries(checkData).forEach(([key, value]) => {
                // 'true' boolean değerlerini 1 olarak say, sayıları olduğu gibi topla
                if (typeof value === 'number') {
                  activity[key] = (activity[key] || 0) + value;
                } else if (value === true || value === 'true') {
                   // Boolean aktiviteler (örn: aktivite var mı?) için sayım yap
                   activity[key] = (activity[key] || 0) + 1;
                }
              });
            }
          });
        }
      });

      // 5. Gruplama (Ekipman Türüne Göre)
      const typeGroups = new Map<string, { equipments: any[], properties: any }>();
      
      equipmentData?.forEach((item: any) => {
        const type = item.equipment?.type || 'DIGER';
        if (!typeGroups.has(type)) typeGroups.set(type, { equipments: [], properties: {} });
        
        const group = typeGroups.get(type)!;
        group.equipments.push(item);
        if (item.equipment?.properties) group.properties = item.equipment.properties;
      });

      // 6. Sonuç Dizisini Oluştur
      const typeLabels: Record<string, string> = {
        UCAN: 'Uçan Zararlılar (EFC/UV)',
        KEMIRGEN: 'Kemirgen İstasyonları',
        YURUYEN: 'Yürüyen Haşereler',
        AMBAR: 'Ambar Zararlıları',
        DIGER: 'Diğer Ekipmanlar'
      };

      const resultData: EquipmentTypeData[] = [];

      typeGroups.forEach((group, type) => {
        const propertyKeys: string[] = [];
        const propertyLabels: Record<string, string> = {};

        if (group.properties) {
          Object.entries(group.properties).forEach(([key, value]: [string, any]) => {
            // Sayısal veya Boolean (sayılabilir) özellikleri grafiğe dahil et
            if (value.type === 'number' || value.type === 'boolean') {
              propertyKeys.push(key);
              propertyLabels[key] = value.label || key;
            }
          });
        }

        if (propertyKeys.length === 0) return; 

        const activities: EquipmentTypeActivity[] = [];

        group.equipments.forEach((eq: any) => {
          // DÜZELTME: Eşleşmeyi UUID (eq.id) üzerinden yapıyoruz
          const rawTotals = activityMap.get(eq.id) || {};
          const visitCount = visitCountMap.get(eq.id) || 1;

          const activityRow: EquipmentTypeActivity = {
            equipment_code: eq.equipment_code,
            equipment_name: eq.equipment?.name || 'Bilinmeyen',
            branch_name: eq.branch?.sube_adi || '',
          };

          let hasActivity = false;
          propertyKeys.forEach(key => {
            const totalVal = rawTotals[key] || 0;
            activityRow[key] = chartViewMode === 'total' 
              ? totalVal 
              : Number((totalVal / visitCount).toFixed(1));
            
            if (totalVal > 0) hasActivity = true;
          });

          // Sadece aktivitesi olan ekipmanları veya tümünü gösterme tercihi
          // Burada tümünü gösteriyoruz ama değerler 0 olabilir
          activities.push(activityRow);
        });

        // Sadece verisi olan grupları ekle
        if (activities.some(a => propertyKeys.some(k => Number(a[k]) > 0))) {
          resultData.push({
            type,
            type_label: typeLabels[type] || type,
            activities: activities.sort((a,b) => a.equipment_code.localeCompare(b.equipment_code)), // Koda göre sırala
            propertyKeys,
            propertyLabels
          });
        }
      });

      setEquipmentTypeData(resultData);

    } catch (error) {
      console.error('Ekipman aktivite analizi hatası:', error);
    }
  };

  const handleExportImage = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.download = `Trend_Analiz_${format(new Date(), 'dd-MM-yyyy')}.jpg`;
      link.click();
      toast.success('İndirildi');
    } catch (error) {
      toast.error('Hata oluştu');
    } finally {
      setGenerating(false);
    }
  };

  if (loading && !visitStats) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Veriler analiz ediliyor...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Üst Başlık ve Aksiyonlar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              Trend Analizi ve Raporlama
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Ziyaret verilerine dayalı performans, aktivite ve kullanım analizleri.
            </p>
          </div>
          <button
            onClick={handleExportImage}
            disabled={generating || !visitStats}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-gray-700 transition-colors"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Raporu İndir (JPG)
          </button>
        </div>

        {/* Filtreler */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-3 text-gray-700 font-medium">
            <Filter className="h-4 w-4" /> Filtreleme Seçenekleri
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Şube Seçimi */}
            {branches.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Şube</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Tüm Şubeler</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.sube_adi}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Tarih Aralığı */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Başlangıç</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bitiş</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Rapor İçeriği */}
        <div ref={reportRef} className="bg-white rounded-xl shadow-lg p-8 min-h-[600px]">
          {/* Rapor Başlığı */}
          <div className="text-center border-b pb-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Dönemsel Aktivite ve Trend Raporu</h2>
            <p className="text-gray-500 mt-1">
              {format(parseISO(dateRange.from), 'dd MMMM yyyy', { locale: tr })} - {format(parseISO(dateRange.to), 'dd MMMM yyyy', { locale: tr })}
            </p>
          </div>

          {visitStats && (
            <>
              {/* Özet Kartlar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="text-blue-600 text-sm font-medium mb-1">Toplam Ziyaret</div>
                  <div className="text-2xl font-bold text-blue-900">{visitStats.total_visits}</div>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="text-green-600 text-sm font-medium mb-1">Tamamlanan</div>
                  <div className="text-2xl font-bold text-green-900">{visitStats.completed_visits}</div>
                </div>
                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-100">
                  <div className="text-yellow-600 text-sm font-medium mb-1">Bekleyen</div>
                  <div className="text-2xl font-bold text-yellow-900">{visitStats.pending_visits}</div>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                  <div className="text-red-600 text-sm font-medium mb-1">İptal</div>
                  <div className="text-2xl font-bold text-red-900">{visitStats.cancelled_visits}</div>
                </div>
              </div>

              {/* Ziyaret Trend Grafiği */}
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-l-4 border-blue-500 pl-3">
                  Aylık Ziyaret ve Sorun Grafiği
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrends}>
                      <defs>
                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#0088FE" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" style={{fontSize: '12px'}} />
                      <YAxis style={{fontSize: '12px'}} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="visits" name="Ziyaret Sayısı" stroke="#0088FE" fillOpacity={1} fill="url(#colorVisits)" />
                      <Area type="monotone" dataKey="issues_found" name="Tespit Edilen Sorunlar" stroke="#FF8042" fill="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* EKİPMAN TÜRÜ BAZLI AKTİVİTE ANALİZİ (DÜZELTİLDİ) */}
              {equipmentTypeData.length > 0 ? (
                <div className="mb-10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-purple-500 pl-3">
                      Ekipman Aktivite Analizi (Canlı/Hareket)
                    </h3>
                    {/* Görünüm Modu Değiştirici */}
                    <div className="flex bg-gray-100 rounded-lg p-1 text-xs">
                      <button 
                        onClick={() => setChartViewMode('total')}
                        className={`px-3 py-1 rounded-md transition-all ${chartViewMode === 'total' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}
                      >
                        Toplam Sayı
                      </button>
                      <button 
                        onClick={() => setChartViewMode('per_visit')}
                        className={`px-3 py-1 rounded-md transition-all ${chartViewMode === 'per_visit' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}
                      >
                        Ziyaret Ort.
                      </button>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {equipmentTypeData.map((typeData, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="text-md font-bold text-gray-700 mb-3">{typeData.type_label}</h4>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={typeData.activities}
                              layout="horizontal"
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="equipment_code" style={{fontSize: '10px'}} interval={0} angle={-45} textAnchor="end" height={60}/>
                              <YAxis style={{fontSize: '12px'}} />
                              <Tooltip 
                                contentStyle={{fontSize: '12px'}}
                                formatter={(value: number, name: string) => [value, typeData.propertyLabels[name] || name]}
                                labelFormatter={(label) => {
                                  const eq = typeData.activities.find(a => a.equipment_code === label);
                                  return `Ekipman: ${label} (${eq?.branch_name})`;
                                }}
                              />
                              <Legend />
                              {typeData.propertyKeys.map((key, kIdx) => (
                                <Bar 
                                  key={key} 
                                  dataKey={key} 
                                  name={typeData.propertyLabels[key]} 
                                  fill={COLORS[kIdx % COLORS.length]} 
                                  radius={[4, 4, 0, 0]}
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-10 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                  Ekipman aktivite verisi bulunamadı veya özellikler sayısal değil.
                </div>
              )}

              {/* Biyosidal Ürün Kullanımı */}
              {biocidalProducts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-l-4 border-green-500 pl-3">
                    Biyosidal Ürün Kullanım Özeti
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 border rounded-lg">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                          <th className="px-4 py-3">Ürün Adı</th>
                          <th className="px-4 py-3">Etken Madde</th>
                          <th className="px-4 py-3 text-center">Toplam Miktar</th>
                          <th className="px-4 py-3 text-center">Birim</th>
                          <th className="px-4 py-3 text-center">Kullanım Sıklığı</th>
                        </tr>
                      </thead>
                      <tbody>
                        {biocidalProducts.map((product, idx) => (
                          <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{product.product_name}</td>
                            <td className="px-4 py-3">{product.active_ingredient || '-'}</td>
                            <td className="px-4 py-3 text-center font-bold text-blue-600">{product.total_quantity.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center">{product.unit}</td>
                            <td className="px-4 py-3 text-center">{product.usage_count} kez</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {biocidalProducts.length === 0 && equipmentTypeData.length === 0 && (
                <div className="text-center py-10 text-gray-500 italic">
                  Seçilen tarih aralığında analiz edilecek detaylı veri bulunamadı.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerTrendAnalysis;