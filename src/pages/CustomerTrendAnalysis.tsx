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
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Calculator,
  AlertTriangle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  LabelList
} from 'recharts';
import html2canvas from 'html2canvas';

// --- TİPLER ---
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

interface VisitDateTrendData {
  date: string;
  [key: string]: string | number;
}

interface EquipmentTypeTrend {
  type: string;
  type_label: string;
  trends: VisitDateTrendData[];
  propertyKeys: string[];
  propertyLabels: Record<string, string>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];

const CustomerTrendAnalysis: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
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
  const [equipmentTypeTrends, setEquipmentTypeTrends] = useState<EquipmentTypeTrend[]>([]);
  const [chartViewMode, setChartViewMode] = useState<'total' | 'per_visit'>('total');

  const reportRef = useRef<HTMLDivElement>(null);

  // --- BAŞLANGIÇ ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const id = await localAuth.getCurrentCustomerId();
        const activeId = id || user?.customer_id;
        
        if (activeId) {
          setCustomerId(activeId);
          await fetchBranches(activeId);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Başlangıç hatası:", error);
        setLoading(false);
      }
    };
    init();
  }, [user]);

  const fetchBranches = async (id: string) => {
    try {
      const { data } = await supabase
        .from('branches')
        .select('id, sube_adi')
        .eq('customer_id', id)
        .order('sube_adi');
      setBranches(data || []);
    } catch (error) {
      console.error('Şubeler alınamadı:', error);
    }
  };

  // --- RAPOR TETİKLEME ---
  useEffect(() => {
    if (customerId) {
      handleGenerateReport();
    }
  }, [customerId, selectedBranchId, dateRange.from, dateRange.to]);

  const handleGenerateReport = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      let targetBranchIds: string[] = [];
      if (selectedBranchId) {
        targetBranchIds = [selectedBranchId];
      } else {
        const { data: bData } = await supabase
          .from('branches')
          .select('id')
          .eq('customer_id', customerId);
        targetBranchIds = bData?.map(b => b.id) || [];
      }

      await Promise.all([
        fetchVisitStats(targetBranchIds),
        fetchMonthlyTrends(targetBranchIds),
        fetchBiocidalProducts(targetBranchIds),
        fetchEquipmentTypeActivities(targetBranchIds), 
        fetchEquipmentTrendsByDate(targetBranchIds)    
      ]);
    } catch (error) {
      console.error('Rapor oluşturma hatası:', error);
      toast.error('Veriler alınırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // --- PARSE VALUE (Değer Okuyucu) ---
  const parseValue = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (value === true) return 1;
    if (value === false) return 0;
    
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      // Pozitif Durumlar
      if (['evet', 'var', 'true', 'active', 'ok', 'mevcut', 'değişti', 'kirik', 'kırık', 'kayip', 'kayıp'].some(t => lower.includes(t))) {
         // İstisna: "Yok" kelimesi geçiyorsa 0 (Örn: "Aktivite Yok")
         if (lower.includes('yok') || lower.includes('hayır') || lower.includes('false')) return 0;
         return 1;
      }
      // Sayısal String
      const cleanStr = lower.replace(',', '.').replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleanStr);
      if (!isNaN(parsed)) return parsed;
      
      // Eğer string doluysa ve negatif kelime içermiyorsa 1
      if (lower.length > 0 && !['yok', 'hayır', 'false', '0', 'boş', 'temiz', 'normal'].some(t => lower.includes(t))) return 1;
    }
    return 0;
  };

  // --- VERİ ÇEKME FONKSİYONLARI ---

  const fetchVisitStats = async (branchIds: string[]) => {
    if (branchIds.length === 0) return;
    const { data } = await supabase
      .from('visits')
      .select('id, status')
      .in('branch_id', branchIds)
      .gte('visit_date', dateRange.from)
      .lte('visit_date', dateRange.to);

    const visits = data || [];
    setVisitStats({
      total_visits: visits.length,
      completed_visits: visits.filter(v => ['completed', 'done', 'finished', 'tamamlandi'].includes(v.status)).length,
      pending_visits: visits.filter(v => v.status === 'planned').length,
      cancelled_visits: visits.filter(v => v.status === 'cancelled').length,
    });
  };

  const fetchMonthlyTrends = async (branchIds: string[]) => {
    if (branchIds.length === 0) return;
    const startDate = parseISO(dateRange.from);
    const endDate = parseISO(dateRange.to);
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const trendsData = await Promise.all(months.map(async (month) => {
      const start = format(startOfMonth(month), 'yyyy-MM-dd');
      const end = format(endOfMonth(month), 'yyyy-MM-dd');

      // Ziyaretler
      const { data: visits } = await supabase
        .from('visits')
        .select('id')
        .in('branch_id', branchIds)
        .gte('visit_date', start)
        .lte('visit_date', end);

      // Detaylar (Ekipman Trend Tablosu)
      const { data: details } = await supabase
        .from('ekipmantrend') // KULLANICI TALEBİ: ekipmantrend tablosu
        .select('id, visits!inner(branch_id)')
        .in('visits.branch_id', branchIds)
        .gte('visits.visit_date', start)
        .lte('visits.visit_date', end);

      // Burada issues saymak için 'ekipmantrend' içindeki kolonları kontrol etmek lazım
      // Ancak genel trend için kayıt sayısı yeterli olabilir veya belirli bir status kolonu varsa o sayılabilir.
      // Şimdilik kayıt sayısını equipment_checks olarak dönüyoruz.
      
      return {
        month: format(month, 'MMM yyyy', { locale: tr }),
        visits: visits?.length || 0,
        equipment_checks: details?.length || 0,
        issues_found: 0 // Detaylı analiz aşağıda yapılıyor, burası özet
      };
    }));

    setMonthlyTrends(trendsData);
  };

  const fetchBiocidalProducts = async (branchIds: string[]) => {
    if (branchIds.length === 0) return;
    const { data } = await supabase
      .from('biocidal_products_usage')
      .select('quantity, unit, biocidal_products (name, active_ingredient)')
      .in('branch_id', branchIds)
      .gte('created_at', dateRange.from)
      .lte('created_at', dateRange.to);

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

  // --- ANA FONKSİYON: ekipmantrend TABLOSUNDAN VERİ ÇEKME ---
  const fetchEquipmentTypeActivities = async (branchIds: string[]) => {
    if (branchIds.length === 0) { setEquipmentTypeData([]); return; }

    try {
      // 1. Ekipmantrend tablosundan verileri çek
      const { data: trendData, error } = await supabase
        .from('ekipmantrend')
        .select(`
          *,
          visits!inner (
            id,
            visit_date,
            branch_id,
            status
          ),
          branch_equipment (
            id,
            equipment_code,
            equipment:equipment_id ( name, type, properties ),
            branch:branch_id ( sube_adi )
          )
        `)
        .in('visits.branch_id', branchIds)
        .gte('visits.visit_date', dateRange.from)
        .lte('visits.visit_date', dateRange.to)
        // Status filtresini genişletiyoruz
        .in('visits.status', ['completed', 'done', 'finished', 'tamamlandi', 'planned']);

      if (error) throw error;

      console.log('Ekipmantrend Verisi:', trendData?.length);

      // 2. Gruplama
      const nameGroups = new Map<string, { activities: any[], properties: any }>();
      const visitCountMap = new Map<string, number>();

      trendData?.forEach((row: any) => {
        // Ekipman bilgisi branch_equipment ilişkisinden gelir
        const eqInfo = row.branch_equipment;
        // Eğer ilişki yoksa bile (silinmiş ekipman) veriyi göster
        const equipmentName = eqInfo?.equipment?.name || 'Diğer / Silinmiş Ekipmanlar';
        const eqCode = eqInfo?.equipment_code || 'Bilinmeyen Kod';
        const branchName = eqInfo?.branch?.sube_adi || 'Bilinmeyen Şube';
        
        // Benzersiz ID olarak satır ID'sini veya varsa ekipman ID'sini kullan
        const eqId = eqInfo?.id || row.id;

        // Ziyaret sayısını takip et
        visitCountMap.set(eqId, (visitCountMap.get(eqId) || 0) + 1);

        if (!nameGroups.has(equipmentName)) {
          nameGroups.set(equipmentName, { 
            activities: [], 
            properties: eqInfo?.equipment?.properties || {} 
          });
        }

        const group = nameGroups.get(equipmentName)!;
        
        // Satırdaki verileri temizle (ilişkisel alanları çıkar)
        const rowData = { ...row };
        delete rowData.visits;
        delete rowData.branch_equipment;
        delete rowData.id;
        delete rowData.created_at;
        delete rowData.visit_id;
        delete rowData.branch_equipment_id;

        group.activities.push({
          eqId,
          code: eqCode,
          branch: branchName,
          data: rowData
        });
      });

      // 3. Sonuç Formatı
      const resultData: EquipmentTypeData[] = [];

      nameGroups.forEach((group, equipmentName) => {
        const propertyKeys: string[] = [];
        const propertyLabels: Record<string, string> = {};
        const aggregatedActivities = new Map<string, EquipmentTypeActivity>();

        // Tanımlı özellikleri ekle
        if (group.properties) {
          Object.entries(group.properties).forEach(([key, value]: [string, any]) => {
            if (value?.label) {
               propertyKeys.push(key);
               propertyLabels[key] = value.label;
            }
          });
        }

        // Veri içindeki (tablodaki kolonlar) tüm alanları tara
        group.activities.forEach(item => {
          Object.entries(item.data).forEach(([key, value]) => {
            // Eğer property listesinde yoksa ve anlamlı bir veri ise ekle
            if (!propertyKeys.includes(key)) {
               // Gereksiz sistem kolonlarını atla
               if (!['tenant_id', 'updated_at'].includes(key)) {
                  propertyKeys.push(key);
                  propertyLabels[key] = key.replace(/_/g, ' ').toUpperCase();
               }
            }
          });
        });

        if (propertyKeys.length === 0) return;

        // Toplama (Aggregation)
        group.activities.forEach(item => {
          const eqCode = item.code;
          
          if (!aggregatedActivities.has(eqCode)) {
            aggregatedActivities.set(eqCode, {
              equipment_code: eqCode,
              equipment_name: equipmentName,
              branch_name: item.branch,
            });
          }
          const aggRow = aggregatedActivities.get(eqCode)!;

          propertyKeys.forEach(key => {
             const val = item.data[key];
             const numVal = parseValue(val);
             aggRow[key] = (Number(aggRow[key]) || 0) + numVal;
          });
        });

        const finalActivities = Array.from(aggregatedActivities.values());

        if (finalActivities.length > 0) {
          resultData.push({
            type: equipmentName,
            type_label: `${equipmentName} Analizi`,
            activities: finalActivities.sort((a,b) => String(a.equipment_code).localeCompare(String(b.equipment_code))),
            propertyKeys,
            propertyLabels
          });
        }
      });

      setEquipmentTypeData(resultData);

    } catch (error) {
      console.error('Ekipman aktivite analizi hatası:', error);
      toast.error('Veri yüklenirken hata oluştu.');
    }
  };

  // --- TREND ANALİZİ ---
  const fetchEquipmentTrendsByDate = async (branchIds: string[]) => {
    if (branchIds.length === 0) return;

    try {
      const { data: trendData } = await supabase
        .from('ekipmantrend') // KULLANICI TALEBİ
        .select(`
          *,
          visits!inner ( visit_date, branch_id, status ),
          branch_equipment ( name, equipment_code )
        `)
        .in('visits.branch_id', branchIds)
        .gte('visits.visit_date', dateRange.from)
        .lte('visits.visit_date', dateRange.to)
        .in('visits.status', ['completed', 'done', 'finished', 'tamamlandi'])
        .order('visits(visit_date)', { ascending: true });

      if (!trendData) return;

      // Tarih bazlı gruplama
      const dateEquipmentMap = new Map<string, Map<string, Record<string, number>>>();

      trendData.forEach((row: any) => {
        const visitDate = format(parseISO(row.visits.visit_date), 'dd MMM', { locale: tr });
        const eqName = row.branch_equipment?.name || 'Diğer';

        if (!dateEquipmentMap.has(visitDate)) dateEquipmentMap.set(visitDate, new Map());
        const dateMap = dateEquipmentMap.get(visitDate)!;

        if (!dateMap.has(eqName)) dateMap.set(eqName, {});
        const activity = dateMap.get(eqName)!;

        // Row verilerini işle
        Object.entries(row).forEach(([key, value]) => {
          if (['id', 'visit_id', 'branch_equipment_id', 'branch_equipment', 'visits', 'created_at', 'tenant_id'].includes(key)) return;
          const numVal = parseValue(value);
          activity[key] = (activity[key] || 0) + numVal;
        });
      });

      const resultData: EquipmentTypeTrend[] = [];
      const allEqTypes = new Set<string>();
      dateEquipmentMap.forEach(dm => Array.from(dm.keys()).forEach(k => allEqTypes.add(k)));

      allEqTypes.forEach(eqType => {
          const propertyKeys: string[] = [];
          const propertyLabels: Record<string, string> = {};
          
          dateEquipmentMap.forEach(dm => {
              const acts = dm.get(eqType);
              if(acts) {
                  Object.keys(acts).forEach(k => {
                      if(!propertyKeys.includes(k)) {
                          propertyKeys.push(k);
                          propertyLabels[k] = k.replace(/_/g, ' ').toUpperCase();
                      }
                  });
              }
          });

          if(propertyKeys.length === 0) return;

          const trends: VisitDateTrendData[] = [];
          const sortedDates = Array.from(dateEquipmentMap.keys()); // UI için yeterli sorting

          sortedDates.forEach(date => {
              const dm = dateEquipmentMap.get(date);
              const acts = dm?.get(eqType);
              const trendRow: VisitDateTrendData = { date };
              propertyKeys.forEach(pk => {
                  trendRow[pk] = acts ? (acts[pk] || 0) : 0; 
              });
              trends.push(trendRow);
          });

          if(trends.length > 0) {
              resultData.push({
                  type: eqType,
                  type_label: `${eqType} - Zaman İçindeki Değişim`,
                  trends,
                  propertyKeys,
                  propertyLabels
              });
          }
      });

      setEquipmentTypeTrends(resultData);

    } catch (error) {
      console.error('Trend analizi hatası:', error);
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

  if (!customerId) {
      return (
          <div className="flex flex-col justify-center items-center h-96 text-gray-500">
              <AlertTriangle className="h-12 w-12 mb-2 text-yellow-500" />
              <p className="text-lg font-medium">Müşteri Seçilmedi</p>
              <p className="text-sm">Lütfen analiz yapmak için bir müşteri seçiniz.</p>
          </div>
      )
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
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
          <button onClick={handleExportImage} disabled={generating || !visitStats} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-gray-700 transition-colors">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Raporu İndir (JPG)
          </button>
        </div>

        {/* FİLTRELER */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-3 text-gray-700 font-medium"><Filter className="h-4 w-4" /> Filtreleme Seçenekleri</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {branches.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Şube</label>
                <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Tüm Şubeler</option>
                  {branches.map(b => (<option key={b.id} value={b.id}>{b.sube_adi}</option>))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Başlangıç</label>
              <input type="date" value={dateRange.from} onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bitiş</label>
              <input type="date" value={dateRange.to} onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>

        {/* RAPOR */}
        <div ref={reportRef} className="bg-white rounded-xl shadow-lg p-8 min-h-[600px]">
          <div className="text-center border-b pb-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Dönemsel Aktivite ve Trend Raporu</h2>
            <p className="text-gray-500 mt-1">{format(parseISO(dateRange.from), 'dd MMMM yyyy', { locale: tr })} - {format(parseISO(dateRange.to), 'dd MMMM yyyy', { locale: tr })}</p>
          </div>

          {visitStats && (
            <>
              {/* ÖZET */}
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

              {/* EKİPMAN ANALİZİ */}
              {equipmentTypeData.length > 0 ? (
                <div className="mb-10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-purple-500 pl-3 flex items-center gap-2">
                      <BarChart3 size={20} /> Ekipman Aktivite Analizi
                    </h3>
                    <div className="flex bg-gray-100 rounded-lg p-1 text-xs">
                      <button onClick={() => setChartViewMode('total')} className={`px-3 py-1 rounded-md transition-all ${chartViewMode === 'total' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}>Toplam</button>
                      <button onClick={() => setChartViewMode('per_visit')} className={`px-3 py-1 rounded-md transition-all ${chartViewMode === 'per_visit' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}>Ortalama</button>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {equipmentTypeData.map((typeData, idx) => {
                      const totals = typeData.propertyKeys.reduce((acc, key) => {
                        acc[key] = typeData.activities.reduce((sum, act) => sum + (Number(act[key]) || 0), 0);
                        return acc;
                      }, {} as Record<string, number>);

                      return (
                        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <h4 className="text-md font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>{typeData.type_label}
                          </h4>

                          <div className="flex flex-wrap gap-3 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            {Object.entries(totals).map(([key, val]) => (
                              <div key={key} className="flex flex-col items-center justify-center bg-white px-4 py-2 rounded shadow-sm border border-gray-200 min-w-[100px]">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{typeData.propertyLabels[key]}</span>
                                <span className="text-xl font-black text-gray-800">{val}</span>
                              </div>
                            ))}
                          </div>

                          <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={typeData.activities} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="equipment_code" style={{fontSize: '10px'}} interval={0} angle={-45} textAnchor="end" height={60} tick={{fill: '#6b7280'}} />
                                <YAxis style={{fontSize: '12px'}} tick={{fill: '#6b7280'}} />
                                <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px'}} />
                                <Legend />
                                {typeData.propertyKeys.map((key, kIdx) => (
                                  <Bar key={key} dataKey={key} name={typeData.propertyLabels[key]} fill={COLORS[kIdx % COLORS.length]} radius={[4, 4, 0, 0]} barSize={30}>
                                    <LabelList dataKey={key} position="top" style={{ fontSize: '10px', fill: '#6b7280' }} />
                                  </Bar>
                                ))}
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mb-10 p-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
                  <div className="text-gray-400 mb-2">📊</div>
                  <p className="text-gray-500 font-medium">Ekipmantrend tablosunda veri bulunamadı.</p>
                </div>
              )}

              {/* TRENDLER */}
              {equipmentTypeTrends.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-green-500 pl-3 mb-4 flex items-center gap-2"><TrendingUp size={20} /> Zaman İçindeki Değişim</h3>
                  <div className="grid grid-cols-1 gap-6">
                    {equipmentTypeTrends.map((trendData, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <h4 className="text-md font-bold text-gray-700 mb-3">{trendData.type_label}</h4>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData.trends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="date" style={{fontSize: '11px'}} height={30} tick={{fill: '#6b7280'}} />
                              <YAxis style={{fontSize: '12px'}} tick={{fill: '#6b7280'}} />
                              <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px'}} />
                              <Legend />
                              {trendData.propertyKeys.map((key, kIdx) => (
                                <Line key={key} type="monotone" dataKey={key} name={trendData.propertyLabels[key]} stroke={COLORS[kIdx % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BİYOSİDAL */}
              {biocidalProducts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-l-4 border-yellow-500 pl-3 flex items-center gap-2"><PieChartIcon size={20} /> Biyosidal Ürün Kullanım Özeti</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 border rounded-lg shadow-sm overflow-hidden">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                          <th className="px-4 py-3">Ürün Adı</th>
                          <th className="px-4 py-3">Etken Madde</th>
                          <th className="px-4 py-3 text-center">Toplam Miktar</th>
                          <th className="px-4 py-3 text-center">Birim</th>
                          <th className="px-4 py-3 text-center">Kullanım Sıklığı</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {biocidalProducts.map((product, idx) => (
                          <tr key={idx} className="bg-white hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{product.product_name}</td>
                            <td className="px-4 py-3">{product.active_ingredient || '-'}</td>
                            <td className="px-4 py-3 text-center font-bold text-blue-600">{product.total_quantity.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center">{product.unit}</td>
                            <td className="px-4 py-3 text-center"><span className="bg-gray-100 text-gray-800 py-1 px-2 rounded text-xs font-medium">{product.usage_count} kez</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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