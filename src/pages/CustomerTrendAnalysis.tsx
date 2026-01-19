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
  Calculator
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

// --- TİP TANIMLARI ---
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

  // --- VERİ ÇEKME FONKSİYONLARI ---

  const fetchVisitStats = async (branchIds: string[]) => {
    if (branchIds.length === 0) return;
    let query = supabase
      .from('visits')
      .select('id, status')
      .in('branch_id', branchIds)
      .gte('visit_date', dateRange.from)
      .lte('visit_date', dateRange.to);

    const { data } = await query;
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

      // 1. Ziyaret Sayısı (visits tablosundan)
      let queryVisits = supabase
        .from('visits')
        .select('id')
        .in('branch_id', branchIds)
        .gte('visit_date', start)
        .lte('visit_date', end);
      const { data: visitsData } = await queryVisits;

      // 2. Ekipman Trendleri (ekipmantrend tablosundan)
      let queryTrends = supabase
        .from('ekipmantrend')
        .select('*')
        .in('branch_id', branchIds)
        .gte('visit_date', start)
        .lte('visit_date', end);
      
      const { data: trendData } = await queryTrends;

      let issues = 0;
      let checks = 0;

      if (trendData) {
        checks = trendData.length;
        trendData.forEach((t: any) => {
          // Sorun tespiti: aktivite, kırık, kayıp veya statüde sorun varsa
          if (t.aktivite_var || t.kirik || t.kayip || (t.status && t.status !== 'ok' && t.status !== 'normal')) {
            issues++;
          }
        });
      }

      return {
        month: format(month, 'MMM yyyy', { locale: tr }),
        visits: visitsData?.length || 0,
        equipment_checks: checks,
        issues_found: issues
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

  // --- EKİPMANTREND TABLOSUNDAN VERİ ÇEKME ---
  const fetchEquipmentTypeActivities = async (branchIds: string[]) => {
    if (branchIds.length === 0) { setEquipmentTypeData([]); return; }

    try {
      // 1. Şubelerin adlarını almak için map (ekipmantrend'de sadece branch_id olabilir)
      // Ancak ekipmantrend içinde branch_id var, join yapmak yerine elimizdeki branches state'ini kullanabiliriz
      // veya branch_id üzerinden gruplayabiliriz.
      
      // 2. Trend Verilerini Çek
      const { data: trendData, error } = await supabase
        .from('ekipmantrend')
        .select('*')
        .in('branch_id', branchIds)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to);

      if (error) throw error;
      if (!trendData || trendData.length === 0) {
          setEquipmentTypeData([]);
          return;
      }

      // 3. Verileri Ekipman Tipine/Adına Göre Grupla
      // ekipman_name üzerinden grupluyoruz
      const nameGroups = new Map<string, EquipmentTypeActivity[]>();
      
      // Takip edilecek sayısal/boolean sütunlar
      const metrics = [
          { key: 'aktivite_var', label: 'Aktivite' },
          { key: 'tuketim_var', label: 'Tüketim' },
          { key: 'kirik', label: 'Kırık' },
          { key: 'kayip', label: 'Kayıp' },
          { key: 'ari_sayisi', label: 'Arı Sayısı' },
          { key: 'karasinek_sayisi', label: 'Karasinek' },
          { key: 'sivrisinek_sayisi', label: 'Sivrisinek' },
          { key: 'meyvesinegi_sayisi', label: 'Meyve Sineği' },
          { key: 'diger_sayisi', label: 'Diğer' },
          { key: 'ambar_zararlisi_sayisi', label: 'Ambar Zararlısı' },
          { key: 'toplam_sayi', label: 'Toplam Sayı' }
      ];

      // Her bir satırı işle
      const equipmentMap = new Map<string, EquipmentTypeActivity>(); // Kod bazlı birleştirme

      trendData.forEach((row: any) => {
          const eqName = row.equipment_name || 'Diğer Ekipmanlar';
          const eqCode = row.equipment_key || 'KODSUZ'; // Key genelde code veya id'dir.
          const uniqueId = `${eqName}-${eqCode}`; // Benzersizlik için

          if (!equipmentMap.has(uniqueId)) {
             // Şube adını bul
             const br = branches.find(b => b.id === row.branch_id);
             equipmentMap.set(uniqueId, {
                 equipment_code: eqCode,
                 equipment_name: eqName,
                 branch_name: br?.sube_adi || 'Bilinmeyen',
                 visit_count: 0 // Kaç kez ziyaret edildiğini saymak için
             });
          }

          const eqActivity = equipmentMap.get(uniqueId)!;
          eqActivity.visit_count = (Number(eqActivity.visit_count) || 0) + 1;

          // Metrikleri topla
          metrics.forEach(metric => {
              const val = row[metric.key];
              let numVal = 0;
              if (typeof val === 'boolean') numVal = val ? 1 : 0;
              else if (typeof val === 'number') numVal = val;
              
              eqActivity[metric.key] = (Number(eqActivity[metric.key]) || 0) + numVal;
          });
      });

      // Gruplara ayır
      equipmentMap.forEach((activity) => {
          if (!nameGroups.has(activity.equipment_name)) {
              nameGroups.set(activity.equipment_name, []);
          }
          nameGroups.get(activity.equipment_name)!.push(activity);
      });

      // Sonuç formatına dönüştür
      const resultData: EquipmentTypeData[] = [];

      nameGroups.forEach((activities, typeName) => {
          // Hangi metriklerin bu grupta verisi var?
          const validKeys: string[] = [];
          const labels: Record<string, string> = {};

          metrics.forEach(m => {
              const hasData = activities.some(a => Number(a[m.key]) > 0);
              if (hasData) {
                  validKeys.push(m.key);
                  labels[m.key] = m.label;
              }
          });

          if (validKeys.length > 0) {
              // Ortalama hesaplama modu için visit_count kullan
              if (chartViewMode === 'per_visit') {
                  activities = activities.map(a => {
                      const count = Number(a.visit_count) || 1;
                      const newA = { ...a };
                      validKeys.forEach(k => {
                          newA[k] = Number((Number(a[k]) / count).toFixed(2));
                      });
                      return newA;
                  });
              }

              resultData.push({
                  type: typeName,
                  type_label: `${typeName} Analizi`,
                  activities: activities.sort((a,b) => a.equipment_code.localeCompare(b.equipment_code)),
                  propertyKeys: validKeys,
                  propertyLabels: labels
              });
          }
      });

      setEquipmentTypeData(resultData);

    } catch (error) {
      console.error('Ekipman trend hatası:', error);
    }
  };

  // --- EKİPMANTREND TABLOSUNDAN ZAMAN ÇİZELGESİ ---
  const fetchEquipmentTrendsByDate = async (branchIds: string[]) => {
    if (branchIds.length === 0) return;

    try {
      const { data: trendData, error } = await supabase
        .from('ekipmantrend')
        .select('*')
        .in('branch_id', branchIds)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .order('visit_date', { ascending: true });

      if (error || !trendData) return;

      const dateMap = new Map<string, Map<string, Record<string, number>>>();
      // Map<Date, Map<EquipmentName, {metric: total}>>

      trendData.forEach((row: any) => {
          const dateStr = format(parseISO(row.visit_date), 'dd MMM', { locale: tr });
          const eqName = row.equipment_name || 'Diğer';

          if (!dateMap.has(dateStr)) dateMap.set(dateStr, new Map());
          const eqMap = dateMap.get(dateStr)!;

          if (!eqMap.has(eqName)) eqMap.set(eqName, {});
          const metricsObj = eqMap.get(eqName)!;

           // Sütunları topla
           ['aktivite_var', 'tuketim_var', 'kirik', 'kayip', 'ari_sayisi', 'karasinek_sayisi', 'sivrisinek_sayisi', 'diger_sayisi', 'toplam_sayi'].forEach(key => {
               let val = 0;
               if (typeof row[key] === 'boolean') val = row[key] ? 1 : 0;
               else if (typeof row[key] === 'number') val = row[key];
               
               metricsObj[key] = (metricsObj[key] || 0) + val;
           });
      });

      const resultData: EquipmentTypeTrend[] = [];
      
      // Tüm ekipman isimlerini bul
      const allEqNames = new Set<string>();
      dateMap.forEach(em => Array.from(em.keys()).forEach(n => allEqNames.add(n)));

      allEqNames.forEach(name => {
          // Bu ekipman için geçerli metrikleri bul
          const validKeys = new Set<string>();
          const labels: Record<string, string> = {
              'aktivite_var': 'Aktivite',
              'tuketim_var': 'Tüketim',
              'kirik': 'Kırık',
              'kayip': 'Kayıp',
              'ari_sayisi': 'Arı',
              'karasinek_sayisi': 'Karasinek',
              'sivrisinek_sayisi': 'Sivrisinek',
              'diger_sayisi': 'Diğer',
              'toplam_sayi': 'Toplam'
          };

          const trends: VisitDateTrendData[] = [];
          
          // Tarihleri sırala
          const dates = Array.from(dateMap.keys()); 
          // (Not: dd MMM string sıralaması her zaman doğru olmayabilir ama basitlik için kalsın)

          dates.forEach(d => {
              const eqData = dateMap.get(d)?.get(name);
              if (eqData) {
                  const row: VisitDateTrendData = { date: d };
                  Object.entries(eqData).forEach(([k, v]) => {
                      if (v > 0) validKeys.add(k);
                      row[k] = v;
                  });
                  trends.push(row);
              }
          });

          if (validKeys.size > 0) {
              resultData.push({
                  type: name,
                  type_label: `${name} - Zaman İçindeki Değişim`,
                  trends,
                  propertyKeys: Array.from(validKeys),
                  propertyLabels: labels
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

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-3 text-gray-700 font-medium">
            <Filter className="h-4 w-4" /> Filtreleme Seçenekleri
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <div ref={reportRef} className="bg-white rounded-xl shadow-lg p-8 min-h-[600px]">
          <div className="text-center border-b pb-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Dönemsel Aktivite ve Trend Raporu</h2>
            <p className="text-gray-500 mt-1">
              {format(parseISO(dateRange.from), 'dd MMMM yyyy', { locale: tr })} - {format(parseISO(dateRange.to), 'dd MMMM yyyy', { locale: tr })}
            </p>
          </div>

          {visitStats && (
            <>
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

              <div className="mb-10">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-l-4 border-blue-500 pl-3 flex items-center gap-2">
                  <Activity size={20} /> Aylık Ziyaret ve Sorun Grafiği
                </h3>
                <div className="h-64 w-full bg-gray-50 rounded-lg p-2 border border-gray-100">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrends}>
                      <defs>
                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#0088FE" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="month" style={{fontSize: '12px'}} tick={{fill: '#6b7280'}} />
                      <YAxis style={{fontSize: '12px'}} tick={{fill: '#6b7280'}} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                      <Area type="monotone" dataKey="visits" name="Ziyaret Sayısı" stroke="#0088FE" fillOpacity={1} fill="url(#colorVisits)" />
                      <Area type="monotone" dataKey="issues_found" name="Tespit Edilen Sorunlar" stroke="#FF8042" fill="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {equipmentTypeData.length > 0 ? (
                <div className="mb-10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-purple-500 pl-3 flex items-center gap-2">
                      <BarChart3 size={20} /> Ekipman Aktivite Analizi
                    </h3>
                    <div className="flex bg-gray-100 rounded-lg p-1 text-xs">
                      <button 
                        onClick={() => setChartViewMode('total')}
                        className={`px-3 py-1 rounded-md transition-all ${chartViewMode === 'total' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}
                      >
                        Toplam
                      </button>
                      <button 
                        onClick={() => setChartViewMode('per_visit')}
                        className={`px-3 py-1 rounded-md transition-all ${chartViewMode === 'per_visit' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500'}`}
                      >
                        Ortalama
                      </button>
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
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            {typeData.type_label}
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
                              <BarChart 
                                data={typeData.activities}
                                layout="horizontal"
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis 
                                  dataKey="equipment_code" 
                                  style={{fontSize: '10px'}} 
                                  interval={0} 
                                  angle={-45} 
                                  textAnchor="end" 
                                  height={60}
                                  tick={{fill: '#6b7280'}}
                                />
                                <YAxis style={{fontSize: '12px'}} tick={{fill: '#6b7280'}} />
                                <Tooltip 
                                  contentStyle={{fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                  formatter={(value: number, name: string) => [value, typeData.propertyLabels[name] || name]}
                                  labelFormatter={(label) => {
                                    const eq = typeData.activities.find(a => a.equipment_code === label);
                                    return `Ekipman: ${label} (${eq?.branch_name || ''})`;
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
                                    barSize={30}
                                  >
                                    <LabelList dataKey={key} position="top" style={{ fontSize: '10px', fill: '#6b7280' }} />
                                  </Bar>
                                ))}
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="mt-6 overflow-x-auto border-t pt-4">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="px-3 py-2 text-left font-medium text-gray-700 border">Ekipman Kodu</th>
                                  {typeData.propertyKeys.map(key => (
                                    <th key={key} className="px-3 py-2 text-center font-medium text-gray-700 border">{typeData.propertyLabels[key]}</th>
                                  ))}
                                  <th className="px-3 py-2 text-center font-medium text-gray-700 bg-blue-50 border">Toplam</th>
                                </tr>
                              </thead>
                              <tbody>
                                {typeData.activities.map((activity, idx) => {
                                  const total = typeData.propertyKeys.reduce((sum, key) => sum + (Number(activity[key]) || 0), 0);
                                  return (
                                    <tr key={idx} className="hover:bg-gray-50">
                                      <td className="px-3 py-2 font-mono text-gray-900 border">{activity.equipment_code}</td>
                                      {typeData.propertyKeys.map(key => (
                                        <td key={key} className="px-3 py-2 text-center border">
                                          <span className={`font-medium ${Number(activity[key]) > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                                            {activity[key] || 0}
                                          </span>
                                        </td>
                                      ))}
                                      <td className="px-3 py-2 text-center bg-blue-50 border">
                                        <span className="font-bold text-blue-700">{total}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mb-10 p-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
                  <div className="text-gray-400 mb-2">📊</div>
                  <p className="text-gray-500 font-medium">Bu tarih aralığında detaylı ekipman aktivite verisi bulunamadı.</p>
                  <p className="text-gray-400 text-xs mt-1">Ziyaretler tamamlanmış ancak ekipman kontrol verisi girilmemiş olabilir.</p>
                </div>
              )}

              {/* TRENDLER */}
              {equipmentTypeTrends.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-green-500 pl-3 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} /> Zaman İçindeki Değişim (Trendler)
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {equipmentTypeTrends.map((trendData, idx) => {
                      const totals = trendData.propertyKeys.reduce((acc, key) => {
                        acc[key] = trendData.trends.reduce((sum, t) => sum + (Number(t[key]) || 0), 0);
                        return acc;
                      }, {} as Record<string, number>);

                      return (
                        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <h4 className="text-md font-bold text-gray-700 mb-3">{trendData.type_label}</h4>
                          
                          <div className="flex flex-wrap gap-3 mb-4 bg-gray-50 p-2 rounded border border-gray-100">
                            <div className="flex items-center gap-2 px-2">
                              <Calculator size={14} className="text-gray-400"/>
                              <span className="text-xs font-bold text-gray-500 uppercase">Dönem Toplamı:</span>
                            </div>
                            {Object.entries(totals).map(([key, val]) => (
                              <div key={key} className="px-2 py-1 bg-white rounded border border-gray-200 text-xs shadow-sm">
                                <span className="text-gray-500 mr-1">{trendData.propertyLabels[key]}:</span>
                                <span className="font-bold text-gray-800">{val}</span>
                              </div>
                            ))}
                          </div>

                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendData.trends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="date" style={{fontSize: '11px'}} height={30} tick={{fill: '#6b7280'}} />
                                <YAxis style={{fontSize: '12px'}} tick={{fill: '#6b7280'}} />
                                <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value: number, name: string) => [value, trendData.propertyLabels[name] || name]} />
                                <Legend wrapperStyle={{fontSize: '11px'}} />
                                {trendData.propertyKeys.map((key, kIdx) => (
                                  <Line key={key} type="monotone" dataKey={key} name={trendData.propertyLabels[key]} stroke={COLORS[kIdx % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                ))}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {biocidalProducts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-l-4 border-yellow-500 pl-3 flex items-center gap-2">
                    <PieChartIcon size={20} /> Biyosidal Ürün Kullanım Özeti
                  </h3>
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