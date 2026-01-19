import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  TrendingUp,
  Download,
  Loader2,
  Filter,
  Activity,
  BarChart3,
  Calendar as CalendarIcon,
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

interface BranchTrendAnalysisProps {
  branchId: string;
  branchName: string;
}

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

interface EquipmentTypeActivity {
  equipment_code: string;
  equipment_name: string;
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

const BranchTrendAnalysis: React.FC<BranchTrendAnalysisProps> = ({ branchId, branchName }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [dateRange, setDateRange] = useState({
    from: format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [equipmentTypeData, setEquipmentTypeData] = useState<EquipmentTypeData[]>([]);
  const [equipmentTypeTrends, setEquipmentTypeTrends] = useState<EquipmentTypeTrend[]>([]);
  const [chartViewMode, setChartViewMode] = useState<'total' | 'per_visit'>('total');

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (branchId) {
      handleGenerateReport();
    }
  }, [branchId, dateRange.from, dateRange.to]);

  const handleGenerateReport = async () => {
    if (!branchId) return;

    setLoading(true);
    try {
      await Promise.all([
        fetchVisitStats(),
        fetchMonthlyTrends(),
        fetchEquipmentTypeActivities(),
        fetchEquipmentTrendsByDate()
      ]);
      toast.success('Analiz güncellendi');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Veriler alınırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // --- YARDIMCI: Değer Dönüştürücü ---
  const parseValue = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (value === true) return 1;
    if (value === false) return 0;
    
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      if (['true', 'var', 'evet', 'yes', 'mevcut', '1', 'on', 'checked'].includes(lower)) return 1;
      if (['false', 'yok', 'hayır', 'no', 'boş', '0', 'off'].includes(lower)) return 0;
      
      const cleanStr = lower.replace(',', '.');
      const parsed = parseFloat(cleanStr);
      if (!isNaN(parsed)) return parsed;
      
      // String doluysa ve negatif değilse 1 say
      if (lower.length > 0) return 1;
    }
    return 0;
  };

  const fetchVisitStats = async () => {
    if (!branchId) return;
    const { data } = await supabase
      .from('visits')
      .select('id, status')
      .eq('branch_id', branchId)
      .gte('visit_date', dateRange.from)
      .lte('visit_date', dateRange.to);

    const visits = data || [];

    setVisitStats({
      total_visits: visits.length,
      completed_visits: visits.filter(v => v.status === 'completed').length,
      pending_visits: visits.filter(v => v.status === 'planned').length,
      cancelled_visits: visits.filter(v => v.status === 'cancelled').length,
    });
  };

  const fetchMonthlyTrends = async () => {
    if (!branchId) return;
    const startDate = parseISO(dateRange.from);
    const endDate = parseISO(dateRange.to);
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const trendsData = await Promise.all(months.map(async (month) => {
      const start = format(startOfMonth(month), 'yyyy-MM-dd');
      const end = format(endOfMonth(month), 'yyyy-MM-dd');

      const { data } = await supabase
        .from('visits')
        .select('id, equipment_checks')
        .eq('branch_id', branchId)
        .gte('visit_date', start)
        .lte('visit_date', end);

      const visits = data || [];

      let issues = 0;
      let checks = 0;

      visits.forEach((v: any) => {
        if (v.equipment_checks && typeof v.equipment_checks === 'object') {
          checks += Object.keys(v.equipment_checks).length;
          Object.values(v.equipment_checks).forEach((c: any) => {
            // Sorun tespiti
            if (typeof c === 'object' && c !== null) {
               if (c.status === 'issue' || c.status === 'problem' || c.status === 'missing' || c.activity === true) issues++;
            } else if (typeof c === 'string' && (c === 'problem' || c === 'issue')) {
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

  const fetchEquipmentTypeActivities = async () => {
    if (!branchId) return;

    try {
      const { data: equipmentData, error: eqError } = await supabase
        .from('branch_equipment')
        .select(`
          id,
          equipment_code,
          equipment:equipment_id ( name, type, properties )
        `)
        .eq('branch_id', branchId);

      if (eqError) throw eqError;

      const { data: visitsData } = await supabase
        .from('visits')
        .select('equipment_checks')
        .eq('branch_id', branchId)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .eq('status', 'completed');

      // Hem ID hem de CODE ile eşleştirme için map oluştur
      const equipmentByCode = new Map<string, any>();
      const equipmentById = new Map<string, any>();

      equipmentData?.forEach(eq => {
        if(eq.equipment_code) equipmentByCode.set(eq.equipment_code, eq);
        if(eq.id) equipmentById.set(eq.id, eq);
      });

      const activityMap = new Map<string, Record<string, number>>();
      const visitCountMap = new Map<string, number>();

      let totalChecksProcessed = 0;
      let totalValuesAdded = 0;

      visitsData?.forEach(visit => {
        if (visit.equipment_checks && typeof visit.equipment_checks === 'object') {
          Object.entries(visit.equipment_checks).forEach(([key, checkData]: [string, any]) => {
            totalChecksProcessed++;
            const equipment = equipmentById.get(key) || equipmentByCode.get(key);
            if (!equipment) {
              console.warn('Equipment bulunamadı:', key);
              return;
            }

            const eqId = equipment.id;
            if (!activityMap.has(eqId)) activityMap.set(eqId, {});
            visitCountMap.set(eqId, (visitCountMap.get(eqId) || 0) + 1);

            const activity = activityMap.get(eqId)!;

            if (checkData && typeof checkData === 'object') {
              Object.entries(checkData).forEach(([fieldKey, value]) => {
                if (['equipment_name', 'equipment_code', 'status', 'description', 'notes', 'image_url'].includes(fieldKey)) return;

                const numVal = parseValue(value);

                if (activity[fieldKey] === undefined) activity[fieldKey] = 0;
                activity[fieldKey] += numVal;
                totalValuesAdded++;

                if (totalValuesAdded <= 10) {
                  console.log(`${equipment.equipment_code} - ${fieldKey}: ${value} => ${numVal}`);
                }
              });
            }
          });
        }
      });

      console.log(`✅ BRANCH ÖZET: ${totalChecksProcessed} check işlendi, ${totalValuesAdded} değer eklendi`);
      console.log('ActivityMap boyutu:', activityMap.size);
      if (activityMap.size > 0) {
        const firstEntry = Array.from(activityMap.entries())[0];
        console.log('İlk activity örneği:', firstEntry);
      }

      // Gruplama
      const nameGroups = new Map<string, { equipments: any[], properties: any }>();

      equipmentData?.forEach((item: any) => {
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

        // Veri içindeki alanları bul
        group.equipments.forEach((eq: any) => {
          const rawTotals = activityMap.get(eq.id) || {};
          Object.keys(rawTotals).forEach(key => {
            if (typeof rawTotals[key] === 'number') {
              allFieldsInData.add(key);
            }
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
          };

          let hasData = false;
          propertyKeys.forEach(key => {
            const totalVal = rawTotals[key] || 0;
            activityRow[key] = chartViewMode === 'total'
              ? totalVal
              : Number((totalVal / visitCount).toFixed(1));
            
            if (Object.prototype.hasOwnProperty.call(rawTotals, key)) hasData = true;
          });

          activities.push(activityRow);
        });

        if (activities.length > 0) {
          resultData.push({
            type: equipmentName,
            type_label: `${equipmentName} Ekipman Kontrolleri`,
            activities: activities.sort((a,b) => a.equipment_code.localeCompare(b.equipment_code)),
            propertyKeys,
            propertyLabels
          });
        }
      });

      setEquipmentTypeData(resultData);

    } catch (error) {
      console.error('Ekipman aktivite analizi hatası:', error);
      toast.error('Ekipman verileri yüklenirken hata: ' + error);
    }
  };

  const fetchEquipmentTrendsByDate = async () => {
    if (!branchId) return;

    try {
      const { data: equipmentData, error: eqError } = await supabase
        .from('branch_equipment')
        .select(`
          id,
          equipment_code,
          equipment:equipment_id ( name, properties )
        `)
        .eq('branch_id', branchId);

      if (eqError) throw eqError;

      const { data: visitsData } = await supabase
        .from('visits')
        .select('visit_date, equipment_checks')
        .eq('branch_id', branchId)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .eq('status', 'completed')
        .order('visit_date', { ascending: true });

      if (!equipmentData || !visitsData) return;

      const equipmentById = new Map<string, any>();
      const equipmentByCode = new Map<string, any>();

      equipmentData?.forEach(eq => {
        if(eq.id) equipmentById.set(eq.id, eq);
        if(eq.equipment_code) equipmentByCode.set(eq.equipment_code, eq);
      });

      const dateEquipmentMap = new Map<string, Map<string, Record<string, number>>>();

      visitsData.forEach((visit: any) => {
        const visitDate = format(parseISO(visit.visit_date), 'dd MMM', { locale: tr });

        if (!dateEquipmentMap.has(visitDate)) dateEquipmentMap.set(visitDate, new Map());
        const dateMap = dateEquipmentMap.get(visitDate)!;

        if (visit.equipment_checks && typeof visit.equipment_checks === 'object') {
          Object.entries(visit.equipment_checks).forEach(([key, checkData]: [string, any]) => {
            const equipment = equipmentById.get(key) || equipmentByCode.get(key);
            if (!equipment) return;

            const eqName = equipment.equipment?.name || 'Diğer';
            if (!dateMap.has(eqName)) dateMap.set(eqName, {});
            const activity = dateMap.get(eqName)!;

            if (checkData && typeof checkData === 'object') {
              Object.entries(checkData).forEach(([fieldKey, value]) => {
                if (['equipment_name', 'equipment_code', 'status'].includes(fieldKey)) return;

                const numVal = parseValue(value);
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
      link.download = `Trend_Analiz_${branchName}_${format(new Date(), 'dd-MM-yyyy')}.jpg`;
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
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Veriler analiz ediliyor...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            Trend Analizi
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {branchName} şubesi için performans ve aktivite analizleri
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
          <Filter className="h-4 w-4" /> Tarih Aralığı
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <h3 className="text-lg text-gray-700 mt-2">{branchName}</h3>
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

            {monthlyTrends.length > 0 && (
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
            )}

            {equipmentTypeData.length > 0 ? (
              <div className="mb-10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-purple-500 pl-3">
                    Ekipman Aktivite Analizi (Canlı/Hareket)
                  </h3>
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
                  {equipmentTypeData.map((typeData, idx) => {
                    const totals = typeData.propertyKeys.reduce((acc, key) => {
                      acc[key] = typeData.activities.reduce((sum, act) => sum + (Number(act[key]) || 0), 0);
                      return acc;
                    }, {} as Record<string, number>);

                    return (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-md font-bold text-gray-700 mb-3">{typeData.type_label}</h4>
                      
                      {/* ÖZET KARTLAR */}
                      <div className="flex flex-wrap gap-3 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {Object.entries(totals).map(([key, val]) => (
                          <div key={key} className="flex flex-col items-center justify-center bg-white px-4 py-2 rounded shadow-sm border border-gray-200 min-w-[100px]">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{typeData.propertyLabels[key]}</span>
                            <span className="text-xl font-black text-gray-800">{val}</span>
                          </div>
                        ))}
                      </div>

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
                                return `Ekipman: ${label}`;
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
                              >
                                <LabelList dataKey={key} position="top" style={{ fontSize: '10px', fill: '#6b7280' }} />
                              </Bar>
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-4 overflow-x-auto">
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
                                      <span className={`font-medium ${Number(activity[key]) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
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
              <div className="mb-10 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                Ekipman aktivite verisi bulunamadı veya özellikler sayısal değil.
              </div>
            )}

            {equipmentTypeTrends.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-gray-800 border-l-4 border-green-500 pl-3 mb-4">
                  Ziyaret Bazlı Ekipman Trendleri
                </h3>
                <p className="text-sm text-gray-600 mb-4">Her ziyaret tarihindeki ekipman ortalama değerleri</p>

                <div className="space-y-8">
                  {equipmentTypeTrends.map((trendData, idx) => {
                    const totals = trendData.propertyKeys.reduce((acc, key) => {
                      acc[key] = trendData.trends.reduce((sum, t) => sum + (Number(t[key]) || 0), 0);
                      return acc;
                    }, {} as Record<string, number>);

                    return (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
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

                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={trendData.trends}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="date"
                              style={{fontSize: '11px'}}
                              angle={-45}
                              textAnchor="end"
                              height={70}
                            />
                            <YAxis style={{fontSize: '12px'}} />
                            <Tooltip
                              contentStyle={{fontSize: '12px'}}
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
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left font-medium text-gray-700 border">Tarih</th>
                              {trendData.propertyKeys.map(key => (
                                <th key={key} className="px-3 py-2 text-center font-medium text-gray-700 border">{trendData.propertyLabels[key]}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {trendData.trends.map((trend, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-gray-900 border">{trend.date}</td>
                                {trendData.propertyKeys.map(key => (
                                  <td key={key} className="px-3 py-2 text-center border">
                                    <span className={`font-medium ${Number(trend[key]) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                      {trend[key] || 0}
                                    </span>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BranchTrendAnalysis;