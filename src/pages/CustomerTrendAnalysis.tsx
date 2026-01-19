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
  AlertTriangle,
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

  // 1. Müşteri Kimliğini Belirle
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
          console.warn("Müşteri ID bulunamadı.");
          setLoading(false);
        }
      } catch (error) {
        console.error("Başlangıç hatası:", error);
        setLoading(false);
      }
    };
    init();
  }, [user]);

  // 2. Şubeleri Çek
  const fetchBranches = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, sube_adi')
        .eq('customer_id', id)
        .order('sube_adi');
        
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error("Şubeler yüklenemedi.");
    }
  };

  // 3. Raporu Oluştur (Trigger)
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
      console.error('Error generating report:', error);
      toast.error('Veriler alınırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // --- GELİŞMİŞ DEĞER DÖNÜŞTÜRÜCÜ ---
  const parseValue = (value: any, propertyType: string = 'number'): number => {
    if (value === null || value === undefined) return 0;
    
    // 1. Sayısal Değerler
    if (typeof value === 'number') return value;
    
    // 2. Boolean Değerler
    if (value === true) return 1;
    if (value === false) return 0;
    
    // 3. String İşleme
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      
      // Negatif/Boş ifadeler (Kesin 0)
      if (['false', 'yok', 'hayır', 'no', 'boş', '0'].includes(lower)) return 0;
      
      // Pozitif ifadeler (Kesin 1)
      if (['true', 'var', 'evet', 'yes', 'mevcut', '1'].includes(lower)) return 1;
      
      // Sayısal String Kontrolü ("10,5" -> 10.5)
      const cleanStr = lower.replace(',', '.');
      const parsed = parseFloat(cleanStr);
      
      if (!isNaN(parsed)) {
        return parsed;
      }

      // 4. Metin Değerleri ("Temiz", "Kirli", "Değişti" vb.)
      // Eğer sayısal bir alan değilse ve string doluysa, bu bir "aktivite" veya "durum" belirtir.
      // Dolayısıyla bunu 1 (var) olarak sayarız.
      if (lower.length > 0) return 1;
    }
    
    return 0;
  };

  // --- Veri Çekme Fonksiyonları ---

  const fetchVisitStats = async (branchIds: string[]) => {
    if (branchIds.length === 0) return;

    let query = supabase
      .from('visits')
      .select('id, status')
      .in('branch_id', branchIds)
      .gte('visit_date', dateRange.from)
      .lte('visit_date', dateRange.to);

    const { data, error } = await query;
    if (error) { console.error(error); return; }
    const visits = data || [];

    setVisitStats({
      total_visits: visits.length,
      completed_visits: visits.filter(v => v.status === 'completed').length,
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

      let query = supabase
        .from('visits')
        .select('id, equipment_checks')
        .in('branch_id', branchIds)
        .gte('visit_date', start)
        .lte('visit_date', end);

      const { data } = await query;
      const visits = data || [];
      
      let issues = 0;
      let checks = 0;

      visits.forEach((v: any) => {
        if (v.equipment_checks && typeof v.equipment_checks === 'object') {
          checks += Object.keys(v.equipment_checks).length;
          
          Object.values(v.equipment_checks).forEach((c: any) => {
            if (typeof c === 'object' && c !== null) {
                // Status veya Activity true ise sorun/aktivite var say
                if (c.status === 'issue' || c.status === 'problem' || c.status === 'missing' || c.activity === true || c.pest_activity === true) {
                    issues++;
                }
            } else if (typeof c === 'string' && (c === 'problem' || c === 'issue' || c === 'var')) {
                issues++;
            }
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

  const fetchBiocidalProducts = async (branchIds: string[]) => {
    if (branchIds.length === 0) return;

    let query = supabase
      .from('biocidal_products_usage')
      .select(`
        quantity, unit,
        biocidal_products (name, active_ingredient)
      `)
      .in('branch_id', branchIds)
      .gte('created_at', dateRange.from)
      .lte('created_at', dateRange.to);

    const { data, error } = await query;
    if(error) { console.error(error); return; }

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

  const fetchEquipmentTypeActivities = async (branchIds: string[]) => {
    if (branchIds.length === 0) {
      setEquipmentTypeData([]);
      return;
    }

    try {
      // 1. Ekipman Tanımlarını Çek (properties ile birlikte)
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

      // 2. Ziyaret Verilerini Çek (JSONB)
      const { data: visitsData, error: vError } = await supabase
        .from('visits')
        .select('equipment_checks')
        .in('branch_id', branchIds)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .eq('status', 'completed');

      if (vError) throw vError;

      // 3. Eşleştirme Haritaları
      const equipmentByCode = new Map<string, any>();
      const equipmentById = new Map<string, any>();

      equipmentData?.forEach(eq => {
        if(eq.equipment_code) equipmentByCode.set(eq.equipment_code, eq);
        if(eq.id) equipmentById.set(eq.id, eq);
      });

      // 4. Veriyi İşleme
      const activityMap = new Map<string, Record<string, number>>();
      const visitCountMap = new Map<string, number>();

      visitsData?.forEach(visit => {
        if (visit.equipment_checks && typeof visit.equipment_checks === 'object') {
          Object.entries(visit.equipment_checks).forEach(([key, checkData]: [string, any]) => {
            const equipment = equipmentById.get(key) || equipmentByCode.get(key);
            if (!equipment) return; 

            const eqId = equipment.id;
            const eqProps = equipment.equipment?.properties || {}; // Tanımlı özellikler

            if (!activityMap.has(eqId)) activityMap.set(eqId, {});
            visitCountMap.set(eqId, (visitCountMap.get(eqId) || 0) + 1);

            const activity = activityMap.get(eqId)!;
            
            if (checkData && typeof checkData === 'object') {
              Object.entries(checkData).forEach(([fieldKey, value]) => {
                if (['equipment_name', 'equipment_code', 'status', 'description', 'notes', 'image_url'].includes(fieldKey)) return;

                // Property tipini bul
                const propDef = eqProps[fieldKey];
                const propType = propDef?.type || 'string'; // Varsayılan string

                // GÜÇLENDİRİLMİŞ PARSER
                const numVal = parseValue(value, propType);
                
                // 0 olsa bile (false, yok) toplama ekle ki grafiklerde görünsün
                // Eğer key daha önce yoksa 0 olarak başlat
                if (activity[fieldKey] === undefined) activity[fieldKey] = 0;
                
                activity[fieldKey] += numVal;
              });
            }
          });
        }
      });

      // 5. Ekipman İsmine Göre Gruplama
      const nameGroups = new Map<string, { equipments: any[], properties: any }>();

      equipmentData?.forEach(item => {
        const equipmentName = item.equipment?.name || 'Diğer Ekipmanlar';
        if (!nameGroups.has(equipmentName)) {
          nameGroups.set(equipmentName, { equipments: [], properties: {} });
        }

        const group = nameGroups.get(equipmentName)!;
        group.equipments.push(item);
        if (item.equipment?.properties) {
          group.properties = { ...group.properties, ...item.equipment.properties };
        }
      });

      const resultData: EquipmentTypeData[] = [];

      nameGroups.forEach((group, equipmentName) => {
        const propertyKeys: string[] = [];
        const propertyLabels: Record<string, string> = {};
        const allFieldsInData = new Set<string>();

        // Veri içinde geçen tüm alanları bul
        group.equipments.forEach((eq: any) => {
          const rawTotals = activityMap.get(eq.id) || {};
          Object.keys(rawTotals).forEach(key => {
            // Değer varsa (0 dahil) ekle
            if (rawTotals[key] !== undefined) allFieldsInData.add(key);
          });
        });

        // Tanımlı özellikleri ekle
        if (group.properties) {
          Object.entries(group.properties).forEach(([key, value]: [string, any]) => {
            if (value && (value.type === 'number' || value.type === 'boolean' || value.type === 'select')) {
              if (!propertyKeys.includes(key)) {
                propertyKeys.push(key);
                propertyLabels[key] = value.label || key;
              }
            }
          });
        }

        // Veride olan diğer alanları ekle
        allFieldsInData.forEach(key => {
          if (!propertyKeys.includes(key)) {
            propertyKeys.push(key);
            propertyLabels[key] = key.replace(/_/g, ' ').toUpperCase();
          }
        });

        if (propertyKeys.length === 0) return;

        const activities: EquipmentTypeActivity[] = [];

        group.equipments.forEach((eq: any) => {
          const rawTotals = activityMap.get(eq.id) || {};
          const visitCount = visitCountMap.get(eq.id) || 1;

          const activityRow: EquipmentTypeActivity = {
            equipment_code: eq.equipment_code || 'Kodsuz',
            equipment_name: eq.equipment?.name || 'Bilinmeyen',
            branch_name: eq.branch?.sube_adi || 'Merkez',
          };

          let hasData = false;
          propertyKeys.forEach(key => {
            const totalVal = rawTotals[key] || 0;
            
            activityRow[key] = chartViewMode === 'total'
              ? totalVal
              : Number((totalVal / visitCount).toFixed(1));
            
            if (rawTotals.hasOwnProperty(key)) hasData = true;
          });

          // Verisi olanları veya hepsini ekle (Hepsini eklemek daha iyi tablo yapısı verir)
          activities.push(activityRow);
        });

        if (activities.length > 0) {
          resultData.push({
            type: equipmentName,
            type_label: `${equipmentName} Analizi`,
            activities: activities.sort((a,b) => a.equipment_code.localeCompare(b.equipment_code)),
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

  const fetchEquipmentTrendsByDate = async (branchIds: string[]) => {
    if (branchIds.length === 0) return;

    try {
      const { data: equipmentData, error: eqError } = await supabase
        .from('branch_equipment')
        .select(`
          id,
          equipment_code,
          equipment:equipment_id ( name, properties )
        `)
        .in('branch_id', branchIds);

      if (eqError) throw eqError;

      const { data: visitsData } = await supabase
        .from('visits')
        .select('visit_date, equipment_checks')
        .in('branch_id', branchIds)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .eq('status', 'completed')
        .order('visit_date', { ascending: true });

      if (!equipmentData || !visitsData) return;

      const equipmentById = new Map<string, any>();
      equipmentData?.forEach(eq => {
        if(eq.id) equipmentById.set(eq.id, eq);
      });

      const dateEquipmentMap = new Map<string, Map<string, Record<string, number>>>();

      visitsData.forEach((visit: any) => {
        const visitDate = format(parseISO(visit.visit_date), 'dd MMM', { locale: tr });

        if (!dateEquipmentMap.has(visitDate)) dateEquipmentMap.set(visitDate, new Map());
        const dateMap = dateEquipmentMap.get(visitDate)!;

        if (visit.equipment_checks && typeof visit.equipment_checks === 'object') {
          Object.entries(visit.equipment_checks).forEach(([key, checkData]: [string, any]) => {
            const equipment = equipmentById.get(key);
            if (!equipment) return;

            const eqName = equipment.equipment?.name || 'Diğer';
            if (!dateMap.has(eqName)) dateMap.set(eqName, {});
            const activity = dateMap.get(eqName)!;

            if (checkData && typeof checkData === 'object') {
              Object.entries(checkData).forEach(([fieldKey, value]) => {
                if (['equipment_name', 'equipment_code', 'status'].includes(fieldKey)) return;

                const numVal = parseValue(value);
                // Trend analizinde de 0 olsa bile ekleyelim ki çizgi grafikte 0 noktaları görünsün
                if (activity[fieldKey] === undefined) activity[fieldKey] = 0;
                activity[fieldKey] += numVal;
              });
            }
          });
        }
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
                      if(!k.endsWith('_count') && !propertyKeys.includes(k)) {
                          propertyKeys.push(k);
                          propertyLabels[k] = k.replace(/_/g, ' ').toUpperCase();
                      }
                  });
              }
          });

          if(propertyKeys.length === 0) return;

          const trends: VisitDateTrendData[] = [];
          const sortedDates = Array.from(dateEquipmentMap.keys()); 

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

        {/* Rapor İçeriği */}
        <div ref={reportRef} className="bg-white rounded-xl shadow-lg p-8 min-h-[600px]">
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
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-l-4 border-blue-500 pl-3 flex items-center gap-2">
                  <Activity size={20} />
                  Aylık Ziyaret ve Sorun Grafiği
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
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="visits" name="Ziyaret Sayısı" stroke="#0088FE" fillOpacity={1} fill="url(#colorVisits)" />
                      <Area type="monotone" dataKey="issues_found" name="Tespit Edilen Sorunlar" stroke="#FF8042" fill="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* EKİPMAN TÜRÜ BAZLI AKTİVİTE ANALİZİ */}
              {equipmentTypeData.length > 0 ? (
                <div className="mb-10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-purple-500 pl-3 flex items-center gap-2">
                      <BarChart3 size={20} />
                      Ekipman Aktivite Analizi
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
                      // Özet Toplamları Hesapla
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

                          {/* ÖZET SAYI KARTLARI */}
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

                          {/* Detay Tablosu */}
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

              {/* ZAMAN İÇİNDEKİ DEĞİŞİM (TRENDLER) */}
              {equipmentTypeTrends.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-green-500 pl-3 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} />
                    Zaman İçindeki Değişim (Trendler)
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {equipmentTypeTrends.map((trendData, idx) => {
                      // Trend toplamlarını hesapla
                      const totals = trendData.propertyKeys.reduce((acc, key) => {
                        acc[key] = trendData.trends.reduce((sum, t) => sum + (Number(t[key]) || 0), 0);
                        return acc;
                      }, {} as Record<string, number>);

                      return (
                        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <h4 className="text-md font-bold text-gray-700 mb-3">{trendData.type_label}</h4>
                          
                          {/* ÖZET KARTLAR */}
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
                              <LineChart
                                data={trendData.trends}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                  dataKey="date"
                                  style={{fontSize: '11px'}}
                                  height={30}
                                  tick={{fill: '#6b7280'}}
                                />
                                <YAxis style={{fontSize: '12px'}} tick={{fill: '#6b7280'}} />
                                <Tooltip
                                  contentStyle={{fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                  formatter={(value: number, name: string) => [value, trendData.propertyLabels[name] || name]}
                                />
                                <Legend wrapperStyle={{fontSize: '11px'}} />
                                {trendData.propertyKeys.map((key, kIdx) => (
                                  <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    name={trendData.propertyLabels[key]}
                                    stroke={COLORS[kIdx % COLORS.length]}
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                  />
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

              {/* Biyosidal Ürün Kullanımı */}
              {biocidalProducts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-l-4 border-yellow-500 pl-3 flex items-center gap-2">
                    <PieChartIcon size={20} />
                    Biyosidal Ürün Kullanım Özeti
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
                            <td className="px-4 py-3 text-center">
                              <span className="bg-gray-100 text-gray-800 py-1 px-2 rounded text-xs font-medium">
                                {product.usage_count} kez
                              </span>
                            </td>
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
