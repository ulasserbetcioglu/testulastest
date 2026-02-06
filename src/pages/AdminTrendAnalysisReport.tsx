import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import {
  TrendingUp,
  Calendar,
  Download,
  FileImage,
  Loader2,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Save,
  Edit3,
  Info,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText
} from 'lucide-react';
import {
  LineChart,
  Line,
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
  Area,
  AreaChart
} from 'recharts';
import html2canvas from 'html2canvas';

interface Customer { id: string; kisa_isim: string; }
interface Branch { id: string; sube_adi: string; customer_id: string; }

interface VisitStats {
  total_visits: number;
  completed_visits: number;
  pending_visits: number;
  cancelled_visits: number;
}

interface EquipmentCheckData {
  equipment_name: string;
  total_checks: number;
  ok_count: number;
  issue_count: number;
  missing_count: number;
  effectiveness_rate: number;
}

interface MonthlyTrend {
  month: string;
  visits: number;
  equipment_checks: number;
  issues_found: number;
}

interface PestTypeStat {
  name: string;
  count: number;
}

interface BiocidalProductUsage {
  product_name: string;
  active_ingredient: string;
  total_quantity: number;
  unit: string;
  usage_count: number;
}

interface EquipmentListItem {
  equipment_name: string;
  equipment_code: string;
  department: string;
  branch_name: string;
  last_check_status: string;
  last_check_date: string;
  properties?: Record<string, any>;
  total_activity?: number;
  activity_details?: Record<string, number>;
}

interface CorrectiveAction {
  id: string;
  non_compliance_type: string;
  non_compliance_description: string;
  corrective_action: string;
  preventive_action: string;
  status: string;
  due_date: string;
  completion_date: string | null;
  responsible: string;
  related_standard: string;
}

interface VisitCompletionRate {
  month: string;
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  rate: number;
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

interface CompanySettings {
  company_name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

const AdminTrendAnalysisReport: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [dateRange, setDateRange] = useState({
    from: format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [equipmentData, setEquipmentData] = useState<EquipmentCheckData[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [pestTypeStats, setPestTypeStats] = useState<PestTypeStat[]>([]);
  const [biocidalProducts, setBiocidalProducts] = useState<BiocidalProductUsage[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentListItem[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);
  const [visitCompletionRates, setVisitCompletionRates] = useState<VisitCompletionRate[]>([]);
  const [equipmentTypeData, setEquipmentTypeData] = useState<EquipmentTypeData[]>([]);
  const [equipmentTypeDataByVisit, setEquipmentTypeDataByVisit] = useState<EquipmentTypeData[]>([]);
  const [chartViewMode, setChartViewMode] = useState<'total' | 'per_visit'>('total');
  const [customerName, setCustomerName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [reportName, setReportName] = useState('');
  const [saving, setSaving] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCustomers();
    fetchBranches();
    fetchCompanySettings();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      setFilteredBranches(branches.filter(b => b.customer_id === selectedCustomerId));
      setSelectedBranchId('');
    } else {
      setFilteredBranches([]);
    }
  }, [selectedCustomerId, branches]);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, logo_url, address, phone, email, website')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Şirket ayarları alınamadı:', error);
      } else if (data) {
        setCompanySettings(data);
      }
    } catch (error) {
      console.error('Ayar çekme hatası:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase.from('customers').select('id, kisa_isim').eq('is_active', true).order('kisa_isim');
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      toast.error('Müşteriler yüklenemedi');
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase.from('branches').select('id, sube_adi, customer_id').order('sube_adi');
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      toast.error('Şubeler yüklenemedi');
    }
  };

  const handleNavigateToDataEntry = () => {
    if (!selectedCustomerId) {
      toast.error('Lütfen önce bir müşteri seçin');
      return;
    }
    const params = new URLSearchParams();
    params.append('customer_id', selectedCustomerId);
    if (selectedBranchId) params.append('branch_id', selectedBranchId);
    
    navigate(`/admin/visit-data-entry?${params.toString()}`);
  };

  const handleGenerateReport = async () => {
    if (!selectedCustomerId) {
      toast.error('Lütfen bir müşteri seçin');
      return;
    }

    setLoading(true);
    try {
      const customer = customers.find(c => c.id === selectedCustomerId);
      setCustomerName(customer?.kisa_isim || '');
      if (selectedBranchId) {
        const branch = branches.find(b => b.id === selectedBranchId);
        setBranchName(branch?.sube_adi || '');
      } else {
        setBranchName('');
      }

      await Promise.all([
        fetchVisitStats(),
        fetchEquipmentData(),
        fetchMonthlyTrends(),
        fetchPestTypeStats(),
        fetchBiocidalProducts(),
        fetchEquipmentList(),
        fetchCorrectiveActions(),
        fetchVisitCompletionRates(),
        fetchEquipmentTypeActivities()
      ]);
      toast.success('Rapor başarıyla oluşturuldu');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Rapor oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch Functions ---

  const fetchVisitStats = async () => {
      try {
        let query = supabase.from('visits').select('id, status, visit_date').eq('customer_id', selectedCustomerId).gte('visit_date', dateRange.from).lte('visit_date', dateRange.to);
        if (selectedBranchId) query = query.eq('branch_id', selectedBranchId);
        const { data, error } = await query;
        if (error) throw error;
        setVisitStats({
          total_visits: data?.length || 0,
          completed_visits: data?.filter(v => v.status === 'completed').length || 0,
          pending_visits: data?.filter(v => v.status === 'scheduled').length || 0,
          cancelled_visits: data?.filter(v => v.status === 'cancelled').length || 0,
        });
      } catch (error) { console.error(error); }
  };

  const fetchEquipmentData = async () => {
      try {
        let branchIds: string[] = selectedBranchId ? [selectedBranchId] : branches.filter(b => b.customer_id === selectedCustomerId).map(b => b.id);
        if (branchIds.length === 0) { setEquipmentData([]); return; }

        let query = supabase
          .from('ekipmantrend')
          .select('equipment_key, equipment_name, status, kirik, kayip')
          .in('branch_id', branchIds)
          .gte('visit_date', dateRange.from)
          .lte('visit_date', dateRange.to);

        const { data, error } = await query;
        if (error) throw error;

        const equipmentMap = new Map<string, EquipmentCheckData>();
        data?.forEach(item => {
          const equipmentName = item.equipment_name || `Ekipman ${item.equipment_key}`;
          const status = item.status || 'unknown';

          if (!equipmentMap.has(equipmentName)) {
            equipmentMap.set(equipmentName, {
              equipment_name: equipmentName,
              total_checks: 0,
              ok_count: 0,
              issue_count: 0,
              missing_count: 0,
              effectiveness_rate: 0
            });
          }

          const equipment = equipmentMap.get(equipmentName)!;
          equipment.total_checks++;

          if (status === 'ok' || status === 'working' || status === 'good' || status === 'iyi' || status === 'calisiyor') {
            equipment.ok_count++;
          } else if (status === 'issue' || status === 'problem' || status === 'needs_attention' || status === 'sorunlu' || item.kirik) {
            equipment.issue_count++;
          } else if (status === 'missing' || status === 'not_found' || item.kayip) {
            equipment.missing_count++;
          }
        });

        setEquipmentData(
          Array.from(equipmentMap.values()).map(eq => ({
            ...eq,
            effectiveness_rate: eq.total_checks > 0 ? Math.round((eq.ok_count / eq.total_checks) * 100) : 0
          }))
        );
      } catch (error) { console.error(error); }
  };

  const fetchMonthlyTrends = async () => {
      try {
        let branchIds: string[] = selectedBranchId ? [selectedBranchId] : branches.filter(b => b.customer_id === selectedCustomerId).map(b => b.id);
        if (branchIds.length === 0) { setMonthlyTrends([]); return; }

        const startDate = parseISO(dateRange.from);
        const endDate = parseISO(dateRange.to);
        const months = eachMonthOfInterval({ start: startDate, end: endDate });

        const trendsData = await Promise.all(months.map(async (month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);

          let visitsQuery = supabase
            .from('visits')
            .select('id')
            .in('branch_id', branchIds)
            .gte('visit_date', format(monthStart, 'yyyy-MM-dd'))
            .lte('visit_date', format(monthEnd, 'yyyy-MM-dd'));

          let equipmentQuery = supabase
            .from('ekipmantrend')
            .select('id, status, kirik, kayip, aktivite_var')
            .in('branch_id', branchIds)
            .gte('visit_date', format(monthStart, 'yyyy-MM-dd'))
            .lte('visit_date', format(monthEnd, 'yyyy-MM-dd'));

          const [visitsResult, equipmentResult] = await Promise.all([visitsQuery, equipmentQuery]);

          if (visitsResult.error) throw visitsResult.error;
          if (equipmentResult.error) throw equipmentResult.error;

          let checks = equipmentResult.data?.length || 0;
          let issues = 0;

          equipmentResult.data?.forEach(item => {
            const status = item.status || '';
            if (status === 'issue' || status === 'problem' || status === 'missing' || status === 'sorunlu' || item.kirik || item.kayip || item.aktivite_var) {
              issues++;
            }
          });

          return {
            month: format(month, 'MMM yyyy', { locale: tr }),
            visits: visitsResult.data?.length || 0,
            equipment_checks: checks,
            issues_found: issues
          };
        }));

        setMonthlyTrends(trendsData);
      } catch (error) { console.error(error); }
  };

  const fetchPestTypeStats = async () => {
      try {
        let query = supabase.from('visits').select('pest_types').eq('customer_id', selectedCustomerId).gte('visit_date', dateRange.from).lte('visit_date', dateRange.to).not('pest_types', 'is', null);
        if (selectedBranchId) query = query.eq('branch_id', selectedBranchId);
        const { data, error } = await query;
        if (error) throw error;
        const pestMap = new Map<string, number>();
        data?.forEach(visit => {
          const types = visit.pest_types as string[];
          if (Array.isArray(types)) types.forEach(type => pestMap.set(type, (pestMap.get(type) || 0) + 1));
        });
        setPestTypeStats(Array.from(pestMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6));
      } catch (error) { console.error(error); }
  };

  const fetchBiocidalProducts = async () => {
      try {
        let query = supabase.from('biocidal_products_usage').select('quantity, unit, biocidal_products (name, active_ingredient)').eq('customer_id', selectedCustomerId).gte('created_at', dateRange.from).lte('created_at', dateRange.to);
        if (selectedBranchId) query = query.eq('branch_id', selectedBranchId);
        const { data, error } = await query;
        if (error) throw error;
        const productMap = new Map<string, BiocidalProductUsage>();
        data?.forEach((usage: any) => {
          const name = usage.biocidal_products?.name || 'Bilinmeyen';
          if (!productMap.has(name)) productMap.set(name, { product_name: name, active_ingredient: usage.biocidal_products?.active_ingredient || '', total_quantity: 0, unit: usage.unit || 'adet', usage_count: 0 });
          const p = productMap.get(name)!;
          p.total_quantity += parseFloat(usage.quantity) || 0;
          p.usage_count++;
        });
        setBiocidalProducts(Array.from(productMap.values()).sort((a, b) => b.total_quantity - a.total_quantity));
      } catch (error) { console.error(error); }
  };

  const fetchEquipmentList = async () => {
    try {
      let branchIds: string[] = selectedBranchId ? [selectedBranchId] : branches.filter(b => b.customer_id === selectedCustomerId).map(b => b.id);
      if (branchIds.length === 0) { setEquipmentList([]); return; }

      const { data, error } = await supabase.from('branch_equipment').select(`equipment_code, department, last_check, equipment:equipment_id (name, properties), branch:branch_id (sube_adi)`).in('branch_id', branchIds);
      if (error) throw error;

      const { data: equipmentTrendData } = await supabase
        .from('ekipmantrend')
        .select('equipment_key, equipment_data')
        .in('branch_id', branchIds)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to);

      const activityMap = new Map<string, { total: number; details: Record<string, number> }>();

      equipmentTrendData?.forEach(item => {
        const code = item.equipment_key;
        const checkData = item.equipment_data as any;

        if (!activityMap.has(code)) activityMap.set(code, { total: 0, details: {} });
        const activity = activityMap.get(code)!;

        if (checkData && typeof checkData === 'object') {
          Object.entries(checkData).forEach(([key, value]) => {
            if (typeof value === 'number') {
              activity.total += value;
              activity.details[key] = (activity.details[key] || 0) + value;
            } else if (value === true || value === 'true' || value === 'var' || value === 'evet') {
              activity.total += 1;
              activity.details[key] = (activity.details[key] || 0) + 1;
            }
          });
        }
      });

      setEquipmentList(data?.map((item: any) => {
        const act = activityMap.get(item.equipment_code);
        return {
          equipment_name: item.equipment?.name || 'Bilinmeyen',
          equipment_code: item.equipment_code || '',
          department: item.department || '-',
          branch_name: item.branch?.sube_adi || '-',
          last_check_status: item.last_check?.status || '-',
          last_check_date: item.last_check?.date ? format(parseISO(item.last_check.date), 'dd.MM.yyyy') : '-',
          properties: item.equipment?.properties || {},
          total_activity: act?.total || 0,
          activity_details: act?.details || {}
        };
      }) || []);
    } catch (error) { console.error(error); }
  };

  const fetchCorrectiveActions = async () => {
      try {
        let branchIds: string[] = selectedBranchId ? [selectedBranchId] : branches.filter(b => b.customer_id === selectedCustomerId).map(b => b.id);
        if (branchIds.length === 0) { setCorrectiveActions([]); return; }
        const { data, error } = await supabase.from('corrective_actions').select('*').in('branch_id', branchIds).gte('created_at', dateRange.from).lte('created_at', dateRange.to);
        if (error) throw error;
        setCorrectiveActions(data?.map((item: any) => ({ id: item.id, non_compliance_type: item.non_compliance_type || '', non_compliance_description: item.non_compliance_description || '', corrective_action: item.corrective_action || '', preventive_action: item.preventive_action || '', status: item.status || 'open', due_date: item.due_date ? format(parseISO(item.due_date), 'dd.MM.yyyy') : '-', completion_date: item.completion_date ? format(parseISO(item.completion_date), 'dd.MM.yyyy') : null, responsible: item.responsible || '-', related_standard: item.related_standard || '-' })) || []);
      } catch (error) { console.error(error); }
  };

  const fetchVisitCompletionRates = async () => {
    try {
      let branchIds: string[] = selectedBranchId ? [selectedBranchId] : branches.filter(b => b.customer_id === selectedCustomerId).map(b => b.id);
      if (branchIds.length === 0) { setVisitCompletionRates([]); return; }
      const { data, error } = await supabase.from('visits').select('visit_date, status').in('branch_id', branchIds).gte('visit_date', dateRange.from).lte('visit_date', dateRange.to);
      if (error) throw error;
      const monthlyData = new Map<string, any>();
      data?.forEach(visit => {
        const month = format(parseISO(visit.visit_date), 'MMM yyyy');
        if (!monthlyData.has(month)) monthlyData.set(month, { total: 0, completed: 0, cancelled: 0, pending: 0 });
        const stats = monthlyData.get(month);
        stats.total++;
        if (visit.status === 'completed') stats.completed++;
        else if (visit.status === 'cancelled') stats.cancelled++;
        else stats.pending++;
      });
      setVisitCompletionRates(Array.from(monthlyData.entries()).map(([month, stats]) => ({ month, ...stats, rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0 })));
    } catch (error) { console.error(error); }
  };

  const fetchEquipmentTypeActivities = async () => {
      try {
        let branchIds: string[] = selectedBranchId ? [selectedBranchId] : branches.filter(b => b.customer_id === selectedCustomerId).map(b => b.id);
        if (branchIds.length === 0) { setEquipmentTypeData([]); return; }

        const { data: equipmentData } = await supabase.from('branch_equipment').select(`id, equipment_code, equipment:equipment_id (name, type, properties), branch:branch_id (sube_adi)`).in('branch_id', branchIds);

        const { data: equipmentTrendData } = await supabase
          .from('ekipmantrend')
          .select('equipment_key, equipment_data, visit_id')
          .in('branch_id', branchIds)
          .gte('visit_date', dateRange.from)
          .lte('visit_date', dateRange.to);

        const activityMapTotal = new Map<string, Record<string, number>>();
        const activityMapPerVisit = new Map<string, Record<string, { sum: number; count: number }>>();
        const visitCountMap = new Map<string, Set<string>>();

        equipmentTrendData?.forEach(item => {
          const eqId = item.equipment_key;
          const checkData = item.equipment_data as any;
          const visitId = item.visit_id;

          if (!activityMapTotal.has(eqId)) activityMapTotal.set(eqId, {});
          if (!activityMapPerVisit.has(eqId)) activityMapPerVisit.set(eqId, {});
          if (!visitCountMap.has(eqId)) visitCountMap.set(eqId, new Set());

          visitCountMap.get(eqId)!.add(visitId);

          const activityTotal = activityMapTotal.get(eqId)!;
          const activityPerVisit = activityMapPerVisit.get(eqId)!;

          if (checkData && typeof checkData === 'object') {
            Object.entries(checkData).forEach(([key, value]) => {
              let num = 0;
              if (typeof value === 'number') {
                num = value;
              } else if (value === true || value === 'true' || value === 'var' || value === 'evet' || value === 'issue') {
                num = 1;
              }

              if (num > 0) {
                activityTotal[key] = (activityTotal[key] || 0) + num;
                if (!activityPerVisit[key]) activityPerVisit[key] = { sum: 0, count: 0 };
                activityPerVisit[key].sum += num;
                activityPerVisit[key].count += 1;
              }
            });
          }
        });

        const activityMapAvg = new Map<string, Record<string, number>>();
        activityMapPerVisit.forEach((val, id) => {
          const avg: Record<string, number> = {};
          const visitCount = visitCountMap.get(id)?.size || 1;
          Object.entries(val).forEach(([k, v]) => {
            avg[k] = visitCount > 0 ? Math.round((v.sum / visitCount) * 10) / 10 : 0;
          });
          activityMapAvg.set(id, avg);
        });

        const typeGroups = new Map<string, { equipments: any[]; properties: Record<string, any>; }>();
        equipmentData?.forEach((item: any) => {
          const type = item.equipment?.type || 'DIGER';
          if (!typeGroups.has(type)) typeGroups.set(type, { equipments: [], properties: {} });
          const g = typeGroups.get(type)!;
          g.equipments.push(item);
          if (item.equipment?.properties) g.properties = { ...g.properties, ...item.equipment.properties };
        });

        const typeDataTotal: EquipmentTypeData[] = [];
        const typeDataAvg: EquipmentTypeData[] = [];
        const typeLabels: Record<string, string> = {
          UCAN: 'Uçan Zararlılar (EFC)',
          KEMIRGEN: 'Kemirgen Kontrol',
          YURUYEN: 'Yürüyen Haşere',
          AMBAR: 'Ambar Zararlıları',
          DIGER: 'Diğer'
        };

        typeGroups.forEach((g, type) => {
          const keys: string[] = [];
          const labels: Record<string, string> = {};

          if (g.properties) {
            Object.entries(g.properties).forEach(([k, v]: [string, any]) => {
              if (v.type === 'number' || v.type === 'boolean' || k.includes('sayi') || k.includes('count') || k.includes('aktivite') || k.includes('Sayisi')) {
                if (!keys.includes(k)) {
                  keys.push(k);
                  labels[k] = v.label || k;
                }
              }
            });
          }

          if (keys.length === 0) return;

          const actTotal: EquipmentTypeActivity[] = [];
          const actAvg: EquipmentTypeActivity[] = [];

          g.equipments.forEach((eq: any) => {
            const dTotal = activityMapTotal.get(eq.equipment_code) || {};
            const dAvg = activityMapAvg.get(eq.equipment_code) || {};

            const rowT: any = {
              equipment_code: eq.equipment_code,
              equipment_name: eq.equipment?.name,
              branch_name: eq.branch?.sube_adi
            };
            const rowA: any = {
              equipment_code: eq.equipment_code,
              equipment_name: eq.equipment?.name,
              branch_name: eq.branch?.sube_adi
            };

            keys.forEach(k => {
              rowT[k] = dTotal[k] || 0;
              rowA[k] = dAvg[k] || 0;
            });

            actTotal.push(rowT);
            actAvg.push(rowA);
          });

          if (actTotal.some(a => keys.some(k => Number(a[k]) > 0))) {
            typeDataTotal.push({
              type,
              type_label: typeLabels[type] || type,
              activities: actTotal,
              propertyKeys: keys,
              propertyLabels: labels
            });
            typeDataAvg.push({
              type,
              type_label: typeLabels[type] || type,
              activities: actAvg,
              propertyKeys: keys,
              propertyLabels: labels
            });
          }
        });

        setEquipmentTypeData(typeDataTotal);
        setEquipmentTypeDataByVisit(typeDataAvg);
      } catch (error) { console.error(error); }
  };

  const handleSaveReport = async () => {
    if (!selectedCustomerId || !visitStats) { toast.error('Önce rapor oluşturun'); return; }
    if (!reportName.trim()) { toast.error('Rapor adı girin'); return; }
    setSaving(true);
    try {
      const reportData = { visitStats, equipmentData, monthlyTrends, pestTypeStats, biocidalProducts, equipmentList, correctiveActions, visitCompletionRates, equipmentTypeData, equipmentTypeDataByVisit, chartViewMode, customerName, branchName, dateRange };
      const { error } = await supabase.from('trend_analysis_reports').insert({ customer_id: selectedCustomerId, branch_id: selectedBranchId || null, report_name: reportName, date_from: dateRange.from, date_to: dateRange.to, report_data: reportData, created_by: 'admin' });
      if (error) throw error;
      toast.success('Rapor kaydedildi'); setReportName('');
    } catch (error) { toast.error('Kayıt hatası'); } finally { setSaving(false); }
  };

  const handleExportImage = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    toast.info('Görüntü oluşturuluyor...');
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.download = `Trend_Analiz_${customerName}.jpg`;
      link.click();
      toast.success('İndirildi');
    } catch (error) { toast.error('Hata oluştu'); } finally { setGenerating(false); }
  };

  const handleExportPDF = async () => {
    setGenerating(true);
    toast.info('PDF oluşturuluyor, lütfen bekleyin...');

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const elements = document.querySelectorAll('.pdf-section');
      let yOffset = 10;
      const pageHeight = 295;
      const pageWidth = 210;
      const margin = 10;
      const contentWidth = pageWidth - (2 * margin);

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        
        // Gizli elemanları atla
        if (element.offsetParent === null) continue;

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        // Yeni sayfa gerekip gerekmediğini kontrol et
        if (yOffset + imgHeight > pageHeight - margin) {
          doc.addPage();
          yOffset = 10;
        }

        doc.addImage(imgData, 'JPEG', margin, yOffset, contentWidth, imgHeight);
        yOffset += imgHeight + 5;
      }

      doc.save(`Trend_Analiz_${customerName}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
      toast.success('PDF başarıyla indirildi');

    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    } finally {
      setGenerating(false);
    }
  };

  const selectedCustomerName = customers.find(c => c.id === selectedCustomerId)?.kisa_isim || '';
  const selectedBranchName = filteredBranches.find(b => b.id === selectedBranchId)?.sube_adi || '';

  const generateEquipmentSummaryText = (typeData: EquipmentTypeData) => {
    const totalActivity = typeData.activities.reduce((sum, act) => {
        return sum + typeData.propertyKeys.reduce((s, k) => s + (Number(act[k]) || 0), 0);
    }, 0);

    const equipmentCount = typeData.activities.length;
    const activeEquipmentCount = typeData.activities.filter(act => 
        typeData.propertyKeys.some(k => Number(act[k]) > 0)
    ).length;

    return (
        <div className="pdf-section">
            <p className="text-sm text-gray-600 mt-2 mb-4 italic bg-blue-50 p-3 rounded border border-blue-100">
            <Info className="w-4 h-4 inline mr-1 text-blue-500" />
            <strong>{typeData.type_label}</strong> kategorisinde toplam <strong>{equipmentCount}</strong> adet ekipman izlenmektedir. 
            Belirtilen dönemde <strong>{activeEquipmentCount}</strong> ekipmanda toplam <strong>{totalActivity}</strong> adet aktivite/bulgu tespit edilmiştir.
            </p>
        </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><TrendingUp className="h-6 w-6 text-blue-600" /></div>
            <div><h1 className="text-2xl font-bold text-gray-900">Trend Analizi Raporu</h1><p className="text-gray-600">Ziyaret ve ekipman kontrol verilerine dayalı detaylı analiz</p></div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtreler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Müşteri *</label>
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">Müşteri Seçin</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Şube</label>
              <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} disabled={!selectedCustomerId || filteredBranches.length === 0} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
                <option value="">{!selectedCustomerId ? 'Önce müşteri seçin' : filteredBranches.length === 0 ? 'Şube yok' : 'Tüm Şubeler'}</option>
                {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç</label>
              <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş</label>
              <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <button onClick={handleGenerateReport} disabled={loading || !selectedCustomerId} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BarChart3 className="h-5 w-5" />} {loading ? 'Oluşturuluyor...' : 'Rapor Oluştur'}
            </button>
            <button onClick={handleNavigateToDataEntry} className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              <Edit3 className="h-5 w-5" /> Veri Girişi / Düzenle
            </button>
            {visitStats && (
              <>
                <button onClick={handleExportImage} disabled={generating} className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 transition-colors">
                  {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />} Raporu İndir (JPG)
                </button>
                <button onClick={handleExportPDF} disabled={generating} className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors">
                  {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />} PDF İndir
                </button>
              </>
            )}
          </div>

          {visitStats && (
            <div className="mt-6 space-y-4">
               <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                  <input type="text" value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="Rapor adı (örn: Ocak 2025)" className="flex-1 px-4 py-2 border border-green-300 rounded-lg" />
                  <button onClick={handleSaveReport} disabled={saving || !reportName.trim()} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Kaydet</button>
               </div>
               {equipmentTypeData.length > 0 && (
                 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3">Grafik Görünümü</h3>
                    <div className="flex gap-3">
                      <button onClick={() => setChartViewMode('total')} className={`flex-1 px-4 py-2 rounded-lg font-medium ${chartViewMode === 'total' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-300'}`}>Toplam Sayılar</button>
                      <button onClick={() => setChartViewMode('per_visit')} className={`flex-1 px-4 py-2 rounded-lg font-medium ${chartViewMode === 'per_visit' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-300'}`}>Ziyaret Başına Ortalama</button>
                    </div>
                 </div>
               )}
            </div>
          )}
        </div>

        {/* Report Content */}
        {visitStats && (
          <div ref={reportRef} className="bg-white rounded-lg shadow-sm p-8 min-h-[1000px] flex flex-col justify-between">
            <div>
                {/* 1. Header & Logo - PDF Section */}
                <div className="flex justify-between items-center border-b-2 border-gray-200 pb-4 mb-6 pdf-section">
                <div className="flex items-center gap-4">
                    {companySettings?.logo_url ? (
                        <img src={companySettings.logo_url} alt="Firma Logosu" className="h-20 object-contain" />
                    ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400 font-bold text-xs">LOGO</div>
                    )}
                    <div>
                    <h1 className="text-2xl font-bold text-gray-900">{companySettings?.company_name || 'İlaçlamatik'}</h1>
                    <p className="text-sm text-gray-500">Haşere Kontrol Hizmetleri</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-800">Trend Analiz Raporu</h2>
                    <p className="text-sm text-gray-600">Rapor Tarihi: {format(new Date(), 'dd.MM.yyyy', { locale: tr })}</p>
                </div>
                </div>

                {/* 2. Report Info Text - PDF Section */}
                <div className="mb-8 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 leading-relaxed border border-gray-100 pdf-section">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><Info size={16} className="text-blue-500"/> Rapor Hakkında</h4>
                <p>
                    Bu rapor, <strong>{selectedCustomerName}</strong> {selectedBranchName && `(${selectedBranchName})`} işletmesinde <strong>{format(parseISO(dateRange.from), 'dd.MM.yyyy', { locale: tr })}</strong> - <strong>{format(parseISO(dateRange.to), 'dd.MM.yyyy', { locale: tr })}</strong> tarihleri arasında gerçekleştirilen haşere kontrol faaliyetlerinin detaylı analizini içermektedir.
                    Raporun amacı; işletmedeki zararlı aktivite trendlerini, ekipman performanslarını ve biyosidal ürün kullanım miktarlarını izleyerek, potansiyel risk alanlarını belirlemek ve önleyici faaliyetlerin etkinliğini artırmaktır.
                    Aşağıdaki grafik ve tablolar, belirtilen dönemdeki ziyaret verilerine, ekipman kontrollerine ve tespit edilen uygunsuzluklara dayanmaktadır.
                </p>
                </div>

                {/* 3. Visit Stats - PDF Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 pdf-section">
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-100"><p className="text-sm text-blue-600 font-medium">Toplam Ziyaret</p><p className="text-3xl font-bold text-blue-900 mt-2">{visitStats.total_visits}</p></div>
                <div className="bg-green-50 rounded-lg p-6 border border-green-100"><p className="text-sm text-green-600 font-medium">Tamamlanan</p><p className="text-3xl font-bold text-green-900 mt-2">{visitStats.completed_visits}</p></div>
                <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-100"><p className="text-sm text-yellow-600 font-medium">Bekleyen</p><p className="text-3xl font-bold text-yellow-900 mt-2">{visitStats.pending_visits}</p></div>
                <div className="bg-red-50 rounded-lg p-6 border border-red-100"><p className="text-sm text-red-600 font-medium">İptal Edilen</p><p className="text-3xl font-bold text-red-900 mt-2">{visitStats.cancelled_visits}</p></div>
                </div>

                {/* 4. Monthly Trends - PDF Section */}
                {monthlyTrends.length > 0 && (
                <div className="mb-10 pdf-section">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-blue-500 pl-3">Aylık Ziyaret ve Sorun Trendi</h3>
                    <ResponsiveContainer width="100%" height={300}><AreaChart data={monthlyTrends}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Area type="monotone" dataKey="visits" stackId="1" stroke="#0088FE" fill="#0088FE" name="Ziyaretler" /><Area type="monotone" dataKey="equipment_checks" stackId="1" stroke="#00C49F" fill="#00C49F" name="Ekipman Kontrolleri" /><Area type="monotone" dataKey="issues_found" stackId="1" stroke="#FF8042" fill="#FF8042" name="Bulunan Sorunlar" /></AreaChart></ResponsiveContainer>
                </div>
                )}
                
                {/* 5. Equipment Summary - PDF Section */}
                {equipmentData.length > 0 && (
                <div className="mb-6 pdf-section">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-purple-500 pl-3">Genel Ekipman Durum Özeti</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white rounded-lg border shadow-sm text-center">
                        <span className="block text-3xl font-bold text-gray-800">{equipmentData.length}</span>
                        <span className="text-sm text-gray-500">Toplam İzlenen Ekipman Tipi</span>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-center">
                        <span className="block text-3xl font-bold text-red-600">{equipmentData.reduce((acc, eq) => acc + eq.issue_count, 0)}</span>
                        <span className="text-sm text-red-600">Toplam Tespit Edilen Sorun</span>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-center">
                        <span className="block text-3xl font-bold text-green-600">
                        %{Math.round(equipmentData.reduce((acc, curr) => acc + curr.effectiveness_rate, 0) / (equipmentData.length || 1))}
                        </span>
                        <span className="text-sm text-green-600">Ortalama Ekipman Etkinliği</span>
                    </div>
                    </div>
                </div>
                )}

                {/* 6. Equipment Type Activity Charts (With Descriptions) - Each is PDF Section */}
                {(chartViewMode === 'total' ? equipmentTypeData : equipmentTypeDataByVisit).map((typeData) => (
                <div key={typeData.type} className="mb-10 break-inside-avoid">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 border-l-4 border-indigo-500 pl-3 pdf-section">{typeData.type_label} - Detaylı Analiz</h3>
                    
                    {/* YENİ EKLENEN AÇIKLAMA METNİ */}
                    {generateEquipmentSummaryText(typeData)}

                    <div className="space-y-6">
                    {typeData.propertyKeys.map((propKey, propIdx) => (
                        <div key={propKey} className="bg-white p-4 rounded-lg border border-gray-200 pdf-section">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3 text-center">{typeData.propertyLabels[propKey]} Dağılımı</h4>
                        <ResponsiveContainer width="100%" height={Math.max(250, typeData.activities.length * 30)}>
                            <BarChart data={typeData.activities} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="equipment_code" type="category" width={90} style={{ fontSize: '11px' }} />
                            <Tooltip contentStyle={{ fontSize: '12px' }} />
                            <Bar dataKey={propKey} fill={COLORS[propIdx % COLORS.length]} radius={[0, 4, 4, 0]} name={typeData.propertyLabels[propKey]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                        </div>
                    ))}
                    
                    {/* Summary Table */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 pdf-section">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Özet Tablo</h4>
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white"><tr><th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Kod</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Şube</th>{typeData.propertyKeys.map(key => (<th key={key} className="px-3 py-2 text-center text-xs font-medium text-gray-700">{typeData.propertyLabels[key]}</th>))}<th className="px-3 py-2 text-center text-xs font-medium text-gray-700 bg-blue-50">Toplam</th></tr></thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {typeData.activities.map((activity, idx) => {
                                const total = typeData.propertyKeys.reduce((sum, key) => sum + (Number(activity[key]) || 0), 0);
                                return (<tr key={idx} className="hover:bg-gray-50"><td className="px-3 py-2 font-mono text-xs text-gray-900">{activity.equipment_code}</td><td className="px-3 py-2 text-xs text-gray-600">{activity.branch_name}</td>{typeData.propertyKeys.map(key => (<td key={key} className="px-3 py-2 text-center text-xs"><span className={`font-medium ${Number(activity[key]) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{activity[key] || 0}</span></td>))}<td className="px-3 py-2 text-center bg-blue-50"><span className="font-bold text-blue-700">{total}</span></td></tr>);
                            })}
                            <tr className="bg-gray-100 font-semibold"><td colSpan={2} className="px-3 py-2 text-xs text-gray-900">TOPLAM</td>{typeData.propertyKeys.map(key => { const columnTotal = typeData.activities.reduce((sum, activity) => sum + (Number(activity[key]) || 0), 0); return (<td key={key} className="px-3 py-2 text-center text-xs text-blue-700 font-bold">{columnTotal}</td>); })}<td className="px-3 py-2 text-center bg-blue-100"><span className="text-sm font-bold text-blue-900">{typeData.activities.reduce((sum, activity) => sum + typeData.propertyKeys.reduce((s, key) => s + (Number(activity[key]) || 0), 0), 0)}</span></td></tr>
                            </tbody>
                        </table>
                        </div>
                    </div>
                    </div>
                </div>
                ))}
                
                {/* 7. Biocidal Products - PDF Section */}
                {biocidalProducts.length > 0 && (
                <div className="mb-8 break-inside-avoid pdf-section">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-l-4 border-green-500 pl-3">Biyosidal Ürün Kullanımı</h3>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-bold"><tr><th className="px-4 py-3">Ürün Adı</th><th className="px-4 py-3">Etken Madde</th><th className="px-4 py-3 text-center">Miktar</th><th className="px-4 py-3 text-center">Birim</th><th className="px-4 py-3 text-center">Sıklık</th></tr></thead>
                        <tbody className="divide-y divide-gray-200">
                        {biocidalProducts.map((p, i) => (
                            <tr key={i} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium">{p.product_name}</td><td className="px-4 py-3">{p.active_ingredient || '-'}</td><td className="px-4 py-3 text-center font-bold text-blue-600">{p.total_quantity}</td><td className="px-4 py-3 text-center">{p.unit}</td><td className="px-4 py-3 text-center">{p.usage_count}</td></tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>
                )}
            </div>

            {/* 8. Footer (Kurumsal Bilgiler) - PDF Section */}
            <div className="mt-8 pt-6 border-t-2 border-gray-200 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 pdf-section">
              <div className="flex items-center gap-4 mb-4 md:mb-0">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-400">
                    {companySettings?.logo_url ? <img src={companySettings.logo_url} className="w-full h-full rounded-full object-cover"/> : 'i'}
                </div>
                <div>
                  <p className="font-bold text-gray-700 uppercase">{companySettings?.company_name || 'İlaçlamatik Haşere Kontrol'}</p>
                  <p>Profesyonel Çözümler, Kalıcı Sonuçlar</p>
                </div>
              </div>
              <div className="text-center md:text-right space-y-1">
                <p className="flex items-center justify-center md:justify-end gap-1"><MapPin size={12}/> {companySettings?.address || 'Adres Bilgisi Yok'}</p>
                <p className="flex items-center justify-center md:justify-end gap-1"><Phone size={12}/> {companySettings?.phone || '-'} <span className="mx-1">|</span> <Mail size={12}/> {companySettings?.email || '-'}</p>
                <p className="flex items-center justify-center md:justify-end gap-1"><Globe size={12}/> {companySettings?.website || 'www.ilaclamatik.com'}</p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTrendAnalysisReport;