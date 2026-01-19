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
  Filter
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
  Line
} from 'recharts';
import html2canvas from 'html2canvas';

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
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  
  const [dateRange, setDateRange] = useState({
    from: format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [biocidalProducts, setBiocidalProducts] = useState<BiocidalProductUsage[]>([]);
  const [equipmentTypeData, setEquipmentTypeData] = useState<EquipmentTypeData[]>([]);
  const [equipmentTypeTrends, setEquipmentTypeTrends] = useState<EquipmentTypeTrend[]>([]);
  const [chartViewMode, setChartViewMode] = useState<'total' | 'per_visit'>('total');

  const reportRef = useRef<HTMLDivElement>(null);

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

  const handleGenerateReport = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      await Promise.all([
        fetchVisitStats(),
        fetchMonthlyTrends(),
        fetchBiocidalProducts(),
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

  useEffect(() => {
    if (customerId) {
      handleGenerateReport();
    }
  }, [customerId, selectedBranchId, dateRange.from, dateRange.to]);

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

      console.log('📊 Ekipman Data:', equipmentData?.slice(0, 2));

      const { data: visitsData } = await supabase
        .from('visits')
        .select('equipment_checks')
        .in('branch_id', branchIds)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .eq('status', 'completed');

      console.log('🔍 Ziyaret Data:', visitsData?.slice(0, 2));

      const equipmentByCode = new Map<string, any>();
      const equipmentById = new Map<string, any>();

      equipmentData?.forEach(eq => {
        equipmentByCode.set(eq.equipment_code, eq);
        equipmentById.set(eq.id, eq);
      });

      console.log('🗺️ Equipment Maps:', {
        byCode: Array.from(equipmentByCode.keys()).slice(0, 3),
        byId: Array.from(equipmentById.keys()).slice(0, 3)
      });

      const activityMap = new Map<string, Record<string, number>>();
      const visitCountMap = new Map<string, number>();

      visitsData?.forEach(visit => {
        if (visit.equipment_checks) {
          Object.entries(visit.equipment_checks).forEach(([key, checkData]: [string, any]) => {
            console.log('🔑 Check Key:', key, 'Data:', checkData);
            
            let equipment = equipmentById.get(key);
            if (!equipment) {
              equipment = equipmentByCode.get(key);
            }
            
            if (!equipment) {
              console.warn('⚠️ Ekipman bulunamadı:', key);
              return;
            }

            const eqId = equipment.id;
            if (!activityMap.has(eqId)) activityMap.set(eqId, {});
            visitCountMap.set(eqId, (visitCountMap.get(eqId) || 0) + 1);

            const activity = activityMap.get(eqId)!;
            
            if (checkData && typeof checkData === 'object') {
              Object.entries(checkData).forEach(([fieldKey, value]) => {
                if (['equipment_name', 'equipment_code', 'status', 'notes', 'photos'].includes(fieldKey)) {
                  return;
                }

                if (typeof value === 'number' && value > 0) {
                  activity[fieldKey] = (activity[fieldKey] || 0) + value;
                } 
                else if (value === true || value === 'true' || value === 'var' || value === 1) {
                  activity[fieldKey] = (activity[fieldKey] || 0) + 1;
                }
                else if (typeof value === 'string' && !isNaN(Number(value)) && Number(value) > 0) {
                  activity[fieldKey] = (activity[fieldKey] || 0) + Number(value);
                }
              });
            }
          });
        }
      });

      console.log('📈 Activity Map:', Array.from(activityMap.entries()).slice(0, 2));

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

      console.log('👥 Name Groups:', Array.from(nameGroups.keys()));

      const resultData: EquipmentTypeData[] = [];

      nameGroups.forEach((group, equipmentName) => {
        const propertyKeys: string[] = [];
        const propertyLabels: Record<string, string> = {};
        const allFieldsInData = new Set<string>();

        group.equipments.forEach((eq: any) => {
          const rawTotals = activityMap.get(eq.id) || {};
          Object.keys(rawTotals).forEach(key => {
            if (typeof rawTotals[key] === 'number' && rawTotals[key] > 0) {
              allFieldsInData.add(key);
            }
          });
        });

        console.log(`🎯 ${equipmentName} - Fields in Data:`, Array.from(allFieldsInData));

        if (group.properties && Object.keys(group.properties).length > 0) {
          Object.entries(group.properties).forEach(([key, value]: [string, any]) => {
            if (value && (value.type === 'number' || value.type === 'boolean')) {
              if (!propertyKeys.includes(key)) {
                propertyKeys.push(key);
                propertyLabels[key] = value.label || key;
              }
            }
          });
        }

        allFieldsInData.forEach(key => {
          if (!propertyKeys.includes(key)) {
            propertyKeys.push(key);
            propertyLabels[key] = key
              .replace(/_/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase())
              .replace(/Count/gi, 'Sayısı')
              .replace(/Activity/gi, 'Aktivite')
              .replace(/Consumption/gi, 'Tüketim')
              .replace(/Catch/gi, 'Yakalanan')
              .replace(/Canli/gi, 'Canlı')
              .replace(/Sayi/gi, 'Sayı');
          }
        });

        console.log(`✅ ${equipmentName} - Property Keys:`, propertyKeys);

        if (propertyKeys.length === 0) {
          console.warn(`⚠️ ${equipmentName} için sayısal alan bulunamadı`);
          return;
        }

        const activities: EquipmentTypeActivity[] = [];

        group.equipments.forEach((eq: any) => {
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

          if (hasActivity) {
            activities.push(activityRow);
          }
        });

        console.log(`📊 ${equipmentName} - Activities:`, activities.length);

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

      console.log('✨ Final Result Data:', resultData.map(r => ({ type: r.type, count: r.activities.length })));
      setEquipmentTypeData(resultData);

    } catch (error) {
      console.error('Ekipman aktivite analizi hatası:', error);
    }
  };

  const fetchEquipmentTrendsByDate = async () => {
    if (!customerId || branches.length === 0) return;

    try {
      let branchIds: string[] = [];
      if (selectedBranchId) {
        branchIds = [selectedBranchId];
      } else {
        branchIds = branches.map(b => b.id);
      }

      if (branchIds.length === 0) {
        setEquipmentTypeTrends([]);
        return;
      }

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

      const { data: visitsData } = await supabase
        .from('visits')
        .select('visit_date, equipment_checks')
        .in('branch_id', branchIds)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .eq('status', 'completed')
        .order('visit_date', { ascending: true });

      const equipmentByCode = new Map<string, any>();
      const equipmentById = new Map<string, any>();

      equipmentData?.forEach(eq => {
        equipmentByCode.set(eq.equipment_code, eq);
        equipmentById.set(eq.id, eq);
      });

      const dateEquipmentMap = new Map<string, Map<string, Record<string, number>>>();

      visitsData?.forEach(visit => {
        const visitDate = format(parseISO(visit.visit_date), 'dd MMM', { locale: tr });

        if (!dateEquipmentMap.has(visitDate)) {
          dateEquipmentMap.set(visitDate, new Map());
        }

        const dateMap = dateEquipmentMap.get(visitDate)!;

        if (visit.equipment_checks) {
          Object.entries(visit.equipment_checks).forEach(([key, checkData]: [string, any]) => {
            const equipment = equipmentById.get(key) || equipmentByCode.get(key);
            if (!equipment) return;

            const equipmentName = equipment.equipment?.name || 'Diğer';
            if (!dateMap.has(equipmentName)) {
              dateMap.set(equipmentName, {});
            }

            const activity = dateMap.get(equipmentName)!;
            if (checkData && typeof checkData === 'object') {
              Object.entries(checkData).forEach(([fieldKey, value]) => {
                if (fieldKey === 'equipment_name' || fieldKey === 'equipment_code' || fieldKey === 'status') return;

                if (typeof value === 'number' && value > 0) {
                  activity[fieldKey] = (activity[fieldKey] || 0) + value;
                  activity[`${fieldKey}_count`] = (activity[`${fieldKey}_count`] || 0) + 1;
                } else if (value === true || value === 'true' || value === 'var') {
                  activity[fieldKey] = (activity[fieldKey] || 0) + 1;
                  activity[`${fieldKey}_count`] = (activity[`${fieldKey}_count`] || 0) + 1;
                }
              });
            }
          });
        }
      });

      const equipmentGroups = new Map<string, { properties: any, dates: Set<string> }>();

      equipmentData?.forEach((item: any) => {
        const equipmentName = item.equipment?.name || 'Diğer';
        if (!equipmentGroups.has(equipmentName)) {
          equipmentGroups.set(equipmentName, { properties: {}, dates: new Set() });
        }
        const group = equipmentGroups.get(equipmentName)!;
        if (item.equipment?.properties) {
          group.properties = { ...group.properties, ...item.equipment.properties };
        }
      });

      const resultData: EquipmentTypeTrend[] = [];

      equipmentGroups.forEach((group, equipmentName) => {
        const propertyKeys: string[] = [];
        const propertyLabels: Record<string, string> = {};
        const allFieldsInData = new Set<string>();

        dateEquipmentMap.forEach((dateMap) => {
          const equipmentData = dateMap.get(equipmentName);
          if (equipmentData) {
            Object.keys(equipmentData).forEach(key => {
              if (!key.endsWith('_count')) {
                allFieldsInData.add(key);
              }
            });
          }
        });

        if (group.properties && Object.keys(group.properties).length > 0) {
          Object.entries(group.properties).forEach(([key, value]: [string, any]) => {
            if (value && (value.type === 'number' || value.type === 'boolean')) {
              if (!propertyKeys.includes(key)) {
                propertyKeys.push(key);
                propertyLabels[key] = value.label || key;
              }
            }
          });
        }

        allFieldsInData.forEach(key => {
          if (!propertyKeys.includes(key)) {
            propertyKeys.push(key);
            propertyLabels[key] = key
              .replace(/_/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase())
              .replace(/Count/gi, 'Sayısı')
              .replace(/Activity/gi, 'Aktivite')
              .replace(/Consumption/gi, 'Tüketim')
              .replace(/Catch/gi, 'Yakalanan')
              .replace(/Canli/gi, 'Canlı')
              .replace(/Sayi/gi, 'Sayı');
          }
        });

        if (propertyKeys.length === 0) return;

        const trends: VisitDateTrendData[] = [];

        dateEquipmentMap.forEach((dateMap, visitDate) => {
          const equipmentData = dateMap.get(equipmentName);
          if (equipmentData) {
            const trendRow: VisitDateTrendData = { date: visitDate };

            propertyKeys.forEach(key => {
              const totalVal = equipmentData[key] || 0;
              const count = equipmentData[`${key}_count`] || 1;
              trendRow[key] = Number((totalVal / count).toFixed(1));
            });

            trends.push(trendRow);
          }
        });

        if (trends.length > 0) {
          resultData.push({
            type: equipmentName,
            type_label: `${equipmentName} - Ziyaret Bazlı Trend`,
            trends,
            propertyKeys,
            propertyLabels
          });
        }
      });

      setEquipmentTypeTrends(resultData);

    } catch (error) {
      console.error('Ekipman trend analizi hatası:', error);
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
                  <div className="text-blue-600 text-sm font-medium mb-1">Toplam<function_calls>
<invoke name="artifacts">
<parameter name="command">update</parameter>
<parameter name="id">01jhhqdp8rrc7b8a0hytm67qsx</parameter>
<parameter name="old_str">                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
<div className="text-blue-600 text-sm font-medium mb-1">Toplam</parameter>
<parameter name="new_str">                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
<div className="text-blue-600 text-sm font-medium mb-1">Toplam Ziyaret</parameter>