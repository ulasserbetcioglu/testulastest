import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
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
  Save
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];
const STATUS_COLORS = {
  open: '#FF4560',
  in_progress: '#FFBB28',
  completed: '#00C49F',
  verified: '#0088FE'
};

const AdminTrendAnalysisReport: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

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
  const [customerName, setCustomerName] = useState('');
  const [branchName, setBranchName] = useState('');

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCustomers();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      setFilteredBranches(branches.filter(b => b.customer_id === selectedCustomerId));
      setSelectedBranchId('');
    } else {
      setFilteredBranches([]);
    }
  }, [selectedCustomerId, branches]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, kisa_isim')
        .order('kisa_isim');
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Müşteriler yüklenemedi');
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, sube_adi, customer_id')
        .order('sube_adi');
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Şubeler yüklenemedi');
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedCustomerId) {
      toast.error('Lütfen bir müşteri seçin');
      return;
    }

    setLoading(true);
    try {
      // Fetch customer and branch names first
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
        fetchVisitCompletionRates()
      ]);
      toast.success('Rapor başarıyla oluşturuldu');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Rapor oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitStats = async () => {
    try {
      let query = supabase
        .from('visits')
        .select('id, status, visit_date')
        .eq('customer_id', selectedCustomerId)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to);

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats: VisitStats = {
        total_visits: data?.length || 0,
        completed_visits: data?.filter(v => v.status === 'completed').length || 0,
        pending_visits: data?.filter(v => v.status === 'scheduled').length || 0,
        cancelled_visits: data?.filter(v => v.status === 'cancelled').length || 0,
      };

      setVisitStats(stats);
    } catch (error) {
      console.error('Error fetching visit stats:', error);
    }
  };

  const fetchEquipmentData = async () => {
    try {
      let query = supabase
        .from('visits')
        .select('equipment_checks, visit_date')
        .eq('customer_id', selectedCustomerId)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .not('equipment_checks', 'is', null);

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const equipmentMap = new Map<string, EquipmentCheckData>();

      data?.forEach(visit => {
        const checks = visit.equipment_checks as any;
        if (checks && typeof checks === 'object') {
          Object.entries(checks).forEach(([equipmentId, checkData]: [string, any]) => {
            const equipmentName = checkData?.equipment_name || checkData?.name || `Ekipman ${equipmentId}`;
            const status = checkData?.status || checkData?.check_status || 'unknown';

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

            if (status === 'ok' || status === 'working' || status === 'good') {
              equipment.ok_count++;
            } else if (status === 'issue' || status === 'problem' || status === 'needs_attention') {
              equipment.issue_count++;
            } else if (status === 'missing' || status === 'not_found') {
              equipment.missing_count++;
            }
          });
        }
      });

      const equipmentArray = Array.from(equipmentMap.values()).map(eq => ({
        ...eq,
        effectiveness_rate: eq.total_checks > 0 ? Math.round((eq.ok_count / eq.total_checks) * 100) : 0
      }));

      setEquipmentData(equipmentArray);
    } catch (error) {
      console.error('Error fetching equipment data:', error);
    }
  };

  const fetchMonthlyTrends = async () => {
    try {
      const startDate = parseISO(dateRange.from);
      const endDate = parseISO(dateRange.to);
      const months = eachMonthOfInterval({ start: startDate, end: endDate });

      const trendsPromises = months.map(async (month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        let visitQuery = supabase
          .from('visits')
          .select('id, equipment_checks')
          .eq('customer_id', selectedCustomerId)
          .gte('visit_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('visit_date', format(monthEnd, 'yyyy-MM-dd'));

        if (selectedBranchId) {
          visitQuery = visitQuery.eq('branch_id', selectedBranchId);
        }

        const { data, error } = await visitQuery;
        if (error) throw error;

        let equipmentCheckCount = 0;
        let issuesFound = 0;

        data?.forEach(visit => {
          const checks = visit.equipment_checks as any;
          if (checks && typeof checks === 'object') {
            const checkCount = Object.keys(checks).length;
            equipmentCheckCount += checkCount;

            Object.values(checks).forEach((checkData: any) => {
              const status = checkData?.status || checkData?.check_status;
              if (status === 'issue' || status === 'problem' || status === 'needs_attention') {
                issuesFound++;
              }
            });
          }
        });

        return {
          month: format(month, 'MMM yyyy', { locale: tr }),
          visits: data?.length || 0,
          equipment_checks: equipmentCheckCount,
          issues_found: issuesFound
        };
      });

      const trends = await Promise.all(trendsPromises);
      setMonthlyTrends(trends);
    } catch (error) {
      console.error('Error fetching monthly trends:', error);
    }
  };

  const fetchPestTypeStats = async () => {
    try {
      let query = supabase
        .from('visits')
        .select('pest_types')
        .eq('customer_id', selectedCustomerId)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .not('pest_types', 'is', null);

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const pestMap = new Map<string, number>();

      data?.forEach(visit => {
        const types = visit.pest_types as string[];
        if (Array.isArray(types)) {
          types.forEach(type => {
            pestMap.set(type, (pestMap.get(type) || 0) + 1);
          });
        }
      });

      const pestArray = Array.from(pestMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      setPestTypeStats(pestArray);
    } catch (error) {
      console.error('Error fetching pest type stats:', error);
    }
  };

  const fetchBiocidalProducts = async () => {
    try {
      let query = supabase
        .from('biocidal_products_usage')
        .select(`
          quantity,
          unit,
          biocidal_products (
            name,
            active_ingredient
          )
        `)
        .eq('customer_id', selectedCustomerId)
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to);

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const productMap = new Map<string, BiocidalProductUsage>();

      data?.forEach((usage: any) => {
        const productName = usage.biocidal_products?.name || 'Bilinmeyen Ürün';
        const activeIngredient = usage.biocidal_products?.active_ingredient || '';
        const unit = usage.unit || 'adet';
        const quantity = parseFloat(usage.quantity) || 0;

        if (!productMap.has(productName)) {
          productMap.set(productName, {
            product_name: productName,
            active_ingredient: activeIngredient,
            total_quantity: 0,
            unit: unit,
            usage_count: 0
          });
        }

        const product = productMap.get(productName)!;
        product.total_quantity += quantity;
        product.usage_count++;
      });

      const productArray = Array.from(productMap.values())
        .sort((a, b) => b.total_quantity - a.total_quantity);

      setBiocidalProducts(productArray);
    } catch (error) {
      console.error('Error fetching biocidal products:', error);
    }
  };

  const fetchEquipmentList = async () => {
    try {
      // First get the branch IDs for the selected customer
      let branchIds: string[] = [];

      if (selectedBranchId) {
        // If specific branch selected, use only that
        branchIds = [selectedBranchId];
      } else {
        // Get all branches for the customer
        const customerBranches = branches.filter(b => b.customer_id === selectedCustomerId);
        branchIds = customerBranches.map(b => b.id);
      }

      if (branchIds.length === 0) {
        setEquipmentList([]);
        return;
      }

      // Fetch equipment with properties for these branches
      const { data, error } = await supabase
        .from('branch_equipment')
        .select(`
          equipment_code,
          department,
          last_check,
          equipment:equipment_id (
            name,
            properties
          ),
          branch:branch_id (
            sube_adi
          )
        `)
        .in('branch_id', branchIds);

      if (error) throw error;

      // Fetch visits for activity data in the selected date range
      const { data: visitsData } = await supabase
        .from('visits')
        .select('equipment_checks, visit_date')
        .in('branch_id', branchIds)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .eq('status', 'completed');

      // Calculate activity for each equipment code
      const activityMap = new Map<string, { total: number; details: Record<string, number> }>();

      visitsData?.forEach(visit => {
        if (visit.equipment_checks) {
          Object.entries(visit.equipment_checks).forEach(([code, checkData]: [string, any]) => {
            if (!activityMap.has(code)) {
              activityMap.set(code, { total: 0, details: {} });
            }
            const activity = activityMap.get(code)!;

            // Sum up numeric properties (counts, quantities, etc.)
            if (checkData && typeof checkData === 'object') {
              Object.entries(checkData).forEach(([key, value]) => {
                if (typeof value === 'number') {
                  activity.total += value;
                  activity.details[key] = (activity.details[key] || 0) + value;
                }
              });
            }
          });
        }
      });

      const equipmentArray: EquipmentListItem[] = data?.map((item: any) => {
        const activityData = activityMap.get(item.equipment_code);
        return {
          equipment_name: item.equipment?.name || 'Bilinmeyen Ekipman',
          equipment_code: item.equipment_code || '',
          department: item.department || 'Belirtilmemiş',
          branch_name: item.branch?.sube_adi || 'Bilinmeyen Şube',
          last_check_status: item.last_check?.status || 'Kontrol edilmedi',
          last_check_date: item.last_check?.date ? format(parseISO(item.last_check.date), 'dd.MM.yyyy') : 'Yok',
          properties: item.equipment?.properties || {},
          total_activity: activityData?.total || 0,
          activity_details: activityData?.details || {}
        };
      }) || [];

      setEquipmentList(equipmentArray);
    } catch (error) {
      console.error('Error fetching equipment list:', error);
    }
  };

  const fetchCorrectiveActions = async () => {
    try {
      let branchIds: string[] = [];

      if (selectedBranchId) {
        branchIds = [selectedBranchId];
      } else {
        const customerBranches = branches.filter(b => b.customer_id === selectedCustomerId);
        branchIds = customerBranches.map(b => b.id);
      }

      if (branchIds.length === 0) {
        setCorrectiveActions([]);
        return;
      }

      const { data, error } = await supabase
        .from('corrective_actions')
        .select('*')
        .in('branch_id', branchIds)
        .gte('created_at', dateRange.from)
        .lte('created_at', dateRange.to)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const actionsArray: CorrectiveAction[] = data?.map((item: any) => ({
        id: item.id,
        non_compliance_type: item.non_compliance_type || 'Belirtilmemiş',
        non_compliance_description: item.non_compliance_description || '',
        corrective_action: item.corrective_action || '',
        preventive_action: item.preventive_action || '',
        status: item.status || 'open',
        due_date: item.due_date ? format(parseISO(item.due_date), 'dd.MM.yyyy') : '-',
        completion_date: item.completion_date ? format(parseISO(item.completion_date), 'dd.MM.yyyy') : null,
        responsible: item.responsible || '-',
        related_standard: item.related_standard || '-'
      })) || [];

      setCorrectiveActions(actionsArray);
    } catch (error) {
      console.error('Error fetching corrective actions:', error);
    }
  };

  const fetchVisitCompletionRates = async () => {
    try {
      let branchIds: string[] = [];

      if (selectedBranchId) {
        branchIds = [selectedBranchId];
      } else {
        const customerBranches = branches.filter(b => b.customer_id === selectedCustomerId);
        branchIds = customerBranches.map(b => b.id);
      }

      if (branchIds.length === 0) {
        setVisitCompletionRates([]);
        return;
      }

      const { data, error } = await supabase
        .from('visits')
        .select('visit_date, status')
        .in('branch_id', branchIds)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to);

      if (error) throw error;

      // Group by month
      const monthlyData = new Map<string, { total: number; completed: number; cancelled: number; pending: number }>();

      data?.forEach(visit => {
        const month = format(parseISO(visit.visit_date), 'MMM yyyy');
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { total: 0, completed: 0, cancelled: 0, pending: 0 });
        }
        const stats = monthlyData.get(month)!;
        stats.total++;
        if (visit.status === 'completed') stats.completed++;
        else if (visit.status === 'cancelled') stats.cancelled++;
        else stats.pending++;
      });

      const ratesArray: VisitCompletionRate[] = Array.from(monthlyData.entries())
        .map(([month, stats]) => ({
          month,
          total: stats.total,
          completed: stats.completed,
          cancelled: stats.cancelled,
          pending: stats.pending,
          rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
        }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      setVisitCompletionRates(ratesArray);
    } catch (error) {
      console.error('Error fetching visit completion rates:', error);
    }
  };

  const handleSaveReport = async () => {
    if (!selectedCustomerId || !visitStats) {
      toast.error('Lütfen önce rapor oluşturun');
      return;
    }

    try {
      const reportName = `${customerName}${branchName ? ' - ' + branchName : ''} - ${format(parseISO(dateRange.from), 'dd/MM/yyyy')} - ${format(parseISO(dateRange.to), 'dd/MM/yyyy')}`;

      const reportData = {
        visitStats,
        equipmentData,
        monthlyTrends,
        pestTypeStats,
        biocidalProducts,
        equipmentList,
        customerName,
        branchName,
        dateRange
      };

      const { error } = await supabase
        .from('trend_analysis_reports')
        .insert({
          customer_id: selectedCustomerId,
          branch_id: selectedBranchId || null,
          report_name: reportName,
          date_from: dateRange.from,
          date_to: dateRange.to,
          report_data: reportData,
          created_by: 'admin'
        });

      if (error) throw error;

      toast.success('Rapor başarıyla kaydedildi');
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Rapor kaydedilirken hata oluştu');
    }
  };

  const handleExportImage = async () => {
    if (!reportRef.current) return;

    setGenerating(true);
    toast.info('Rapor görüntüsü oluşturuluyor...');

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      const customerName = customers.find(c => c.id === selectedCustomerId)?.kisa_isim || 'rapor';
      link.download = `Trend_Analiz_${customerName}_${format(new Date(), 'dd-MM-yyyy')}.jpg`;
      link.click();

      toast.success('Rapor başarıyla indirildi');
    } catch (error) {
      console.error('Error exporting image:', error);
      toast.error('Görüntü oluşturulurken hata oluştu');
    } finally {
      setGenerating(false);
    }
  };

  const selectedCustomerName = customers.find(c => c.id === selectedCustomerId)?.kisa_isim || '';
  const selectedBranchName = filteredBranches.find(b => b.id === selectedBranchId)?.sube_adi || '';

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Trend Analizi Raporu</h1>
              <p className="text-gray-600">Ziyaret ve ekipman kontrol verilerine dayalı detaylı analiz</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtreler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Müşteri *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Müşteri Seçin</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.kisa_isim}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Şube (Opsiyonel)</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={!selectedCustomerId || filteredBranches.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!selectedCustomerId ? 'Önce müşteri seçin' : filteredBranches.length === 0 ? 'Şube yok' : 'Tüm Şubeler'}
                </option>
                {filteredBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.sube_adi}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-4">
            <button
              onClick={handleGenerateReport}
              disabled={loading || !selectedCustomerId}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BarChart3 className="h-5 w-5" />}
              {loading ? 'Oluşturuluyor...' : 'Rapor Oluştur'}
            </button>

            {visitStats && (
              <>
                <button
                  onClick={handleSaveReport}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  Raporu Kaydet
                </button>
                <button
                  onClick={handleExportImage}
                  disabled={generating}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  Raporu İndir
                </button>
              </>
            )}
          </div>
        </div>

        {/* Report Content */}
        {visitStats && (
          <div ref={reportRef} className="bg-white rounded-lg shadow-sm p-8">
            {/* Report Header */}
            <div className="text-center mb-8 pb-6 border-b">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Trend Analizi Raporu</h2>
              <p className="text-lg text-gray-600">{selectedCustomerName}</p>
              {selectedBranchName && <p className="text-gray-500">{selectedBranchName}</p>}
              <p className="text-sm text-gray-500 mt-2">
                Tarih Aralığı: {format(parseISO(dateRange.from), 'dd MMM yyyy', { locale: tr })} - {format(parseISO(dateRange.to), 'dd MMM yyyy', { locale: tr })}
              </p>
            </div>

            {/* Visit Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Toplam Ziyaret</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{visitStats.total_visits}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Tamamlanan</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">{visitStats.completed_visits}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">Bekleyen</p>
                    <p className="text-3xl font-bold text-yellow-900 mt-2">{visitStats.pending_visits}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 font-medium">İptal Edilen</p>
                    <p className="text-3xl font-bold text-red-900 mt-2">{visitStats.cancelled_visits}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </div>

            {/* Monthly Trends Chart */}
            {monthlyTrends.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Aylık Trend Analizi</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="visits" stackId="1" stroke="#0088FE" fill="#0088FE" name="Ziyaretler" />
                    <Area type="monotone" dataKey="equipment_checks" stackId="1" stroke="#00C49F" fill="#00C49F" name="Ekipman Kontrolleri" />
                    <Area type="monotone" dataKey="issues_found" stackId="1" stroke="#FF8042" fill="#FF8042" name="Bulunan Sorunlar" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Equipment Performance */}
            {equipmentData.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ekipman Performansı</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ekipman</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Toplam Kontrol</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Sorunsuz</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Sorunlu</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Eksik</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Etkinlik</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {equipmentData.map((eq, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{eq.equipment_name}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">{eq.total_checks}</td>
                          <td className="px-4 py-3 text-sm text-center text-green-600 font-medium">{eq.ok_count}</td>
                          <td className="px-4 py-3 text-sm text-center text-red-600 font-medium">{eq.issue_count}</td>
                          <td className="px-4 py-3 text-sm text-center text-yellow-600 font-medium">{eq.missing_count}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              eq.effectiveness_rate >= 80 ? 'bg-green-100 text-green-800' :
                              eq.effectiveness_rate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              %{eq.effectiveness_rate}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pest Types Distribution */}
            {pestTypeStats.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Zararlı Türü Dağılımı</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pestTypeStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {pestTypeStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Biocidal Products Usage */}
            {biocidalProducts.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Biyosidal Ürün Kullanımı</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ürün Adı</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Etken Madde</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Toplam Miktar</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Birim</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Kullanım Sayısı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {biocidalProducts.map((product, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{product.product_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{product.active_ingredient || '-'}</td>
                          <td className="px-4 py-3 text-sm text-center text-blue-600 font-medium">{product.total_quantity.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">{product.unit}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">{product.usage_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Equipment List */}
            {equipmentList.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ekipman Listesi ve Aktivite Detayları</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ekipman Adı</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Kod</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Departman</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Şube</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Aktivite Detayları</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Toplam Aktivite</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Son Kontrol</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {equipmentList.map((eq, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{eq.equipment_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">{eq.equipment_code}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{eq.department}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{eq.branch_name}</td>
                          <td className="px-4 py-3 text-sm">
                            {eq.activity_details && Object.keys(eq.activity_details).length > 0 ? (
                              <div className="space-y-1">
                                {Object.entries(eq.activity_details).map(([key, value]) => {
                                  const propertyLabel = eq.properties?.[key]?.label || key;
                                  return (
                                    <div key={key} className="flex items-center gap-2">
                                      <span className="text-gray-500 text-xs">{propertyLabel}:</span>
                                      <span className="text-blue-600 font-medium">{value}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Veri yok</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {eq.total_activity !== undefined && eq.total_activity > 0 ? (
                              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold">
                                {eq.total_activity}
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-600">{eq.last_check_date}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              eq.last_check_status === 'ok' || eq.last_check_status === 'working' ? 'bg-green-100 text-green-800' :
                              eq.last_check_status === 'issue' || eq.last_check_status === 'problem' ? 'bg-red-100 text-red-800' :
                              eq.last_check_status === 'missing' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {eq.last_check_status === 'ok' ? 'Sorunsuz' :
                               eq.last_check_status === 'working' ? 'Çalışıyor' :
                               eq.last_check_status === 'issue' ? 'Sorunlu' :
                               eq.last_check_status === 'problem' ? 'Problem' :
                               eq.last_check_status === 'missing' ? 'Eksik' :
                               eq.last_check_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Corrective Actions (DOF) */}
            {correctiveActions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Düzeltici ve Önleyici Faaliyetler (DÖF)
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    ({correctiveActions.length} kayıt)
                  </span>
                </h3>
                <div className="space-y-4">
                  {correctiveActions.map((action, idx) => (
                    <div key={action.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-gray-500">#{idx + 1}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              action.status === 'completed' ? 'bg-green-100 text-green-800' :
                              action.status === 'verified' ? 'bg-blue-100 text-blue-800' :
                              action.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {action.status === 'completed' ? 'Tamamlandı' :
                               action.status === 'verified' ? 'Doğrulandı' :
                               action.status === 'in_progress' ? 'Devam Ediyor' :
                               'Açık'}
                            </span>
                            {action.related_standard !== '-' && (
                              <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                                {action.related_standard}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">
                            {action.non_compliance_type}
                          </h4>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Termin: {action.due_date}</div>
                          {action.completion_date && (
                            <div className="text-xs text-green-600 font-medium">
                              Tamamlanma: {action.completion_date}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 font-medium mb-1">Uygunsuzluk:</p>
                          <p className="text-gray-800 text-xs leading-relaxed">{action.non_compliance_description}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-medium mb-1">Düzeltici Faaliyet:</p>
                          <p className="text-gray-800 text-xs leading-relaxed">{action.corrective_action}</p>
                        </div>
                      </div>

                      {action.preventive_action && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-gray-600 font-medium mb-1 text-sm">Önleyici Faaliyet:</p>
                          <p className="text-gray-800 text-xs leading-relaxed">{action.preventive_action}</p>
                        </div>
                      )}

                      {action.responsible !== '-' && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Sorumlu:</span>
                          <span className="text-xs font-medium text-gray-700">{action.responsible}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visit Completion Rate Chart */}
            {visitCompletionRates.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ziyaret Tamamlanma Oranları</h3>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={visitCompletionRates}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" style={{ fontSize: '12px' }} />
                      <YAxis yAxisId="left" style={{ fontSize: '12px' }} />
                      <YAxis yAxisId="right" orientation="right" style={{ fontSize: '12px' }} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="completed" stroke="#00C49F" strokeWidth={2} name="Tamamlanan" />
                      <Line yAxisId="left" type="monotone" dataKey="cancelled" stroke="#FF4560" strokeWidth={2} name="İptal" />
                      <Line yAxisId="left" type="monotone" dataKey="pending" stroke="#FFBB28" strokeWidth={2} name="Bekleyen" />
                      <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#0088FE" strokeWidth={3} name="Tamamlanma Oranı (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Pest Type Distribution Pie Chart */}
            {pestTypeStats.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Zararlı Türü Dağılımı</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pestTypeStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {pestTypeStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Detaylı İstatistikler</h4>
                    <div className="space-y-2">
                      {pestTypeStats.map((pest, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="text-sm font-medium text-gray-700">{pest.name}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{pest.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Equipment Effectiveness Summary */}
            {equipmentData.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ekipman Etkinlik Özeti</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {equipmentData.slice(0, 6).map((eq, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                      <h4 className="font-semibold text-gray-900 text-sm mb-3">{eq.equipment_name}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Toplam Kontrol:</span>
                          <span className="text-sm font-bold text-blue-600">{eq.total_checks}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Sorunsuz:</span>
                          <span className="text-sm font-bold text-green-600">{eq.ok_count}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Sorunlu:</span>
                          <span className="text-sm font-bold text-red-600">{eq.issue_count}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Eksik:</span>
                          <span className="text-sm font-bold text-yellow-600">{eq.missing_count}</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-700">Etkinlik Oranı:</span>
                            <span className="text-lg font-bold text-purple-600">{eq.effectiveness_rate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTrendAnalysisReport;
