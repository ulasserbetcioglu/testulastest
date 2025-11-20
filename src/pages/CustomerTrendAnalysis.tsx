import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/Auth/AuthProvider';
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
  AreaChart,
  Area
} from 'recharts';
import html2canvas from 'html2canvas';

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
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

const CustomerTrendAnalysis: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

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
  const [customerName, setCustomerName] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.customer_id) {
      fetchCustomerName();
      fetchBranches();
    }
  }, [user?.customer_id]);

  useEffect(() => {
    if (user?.customer_id && branches.length > 0) {
      handleGenerateReport();
    }
  }, [user?.customer_id, branches]);

  const fetchCustomerName = async () => {
    if (!user?.customer_id) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('kisa_isim')
        .eq('id', user.customer_id)
        .single();

      if (error) throw error;
      setCustomerName(data?.kisa_isim || '');
    } catch (error) {
      console.error('Error fetching customer name:', error);
    }
  };

  const fetchBranches = async () => {
    if (!user?.customer_id) return;

    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, sube_adi')
        .eq('musteri_id', user.customer_id)
        .order('sube_adi');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (!user?.customer_id) {
      toast.error('Müşteri bilgisi bulunamadı');
      return;
    }

    setLoading(true);
    try {
      await Promise.all([
        fetchVisitStats(),
        fetchEquipmentData(),
        fetchMonthlyTrends(),
        fetchPestTypeStats(),
        fetchBiocidalProducts(),
        fetchEquipmentList()
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
    if (!user?.customer_id) return;

    try {
      let query = supabase
        .from('visits')
        .select('id, status, visit_date')
        .eq('customer_id', user.customer_id)
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
    if (!user?.customer_id) return;

    try {
      let query = supabase
        .from('visits')
        .select('equipment_checks, visit_date')
        .eq('customer_id', user.customer_id)
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
    if (!user?.customer_id) return;

    try {
      const startDate = parseISO(dateRange.from);
      const endDate = parseISO(dateRange.to);
      const months = eachMonthOfInterval({ start: startDate, end: endDate });

      const trendsPromises = months.map(async (month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        let query = supabase
          .from('visits')
          .select('id, equipment_checks')
          .eq('customer_id', user.customer_id)
          .gte('visit_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('visit_date', format(monthEnd, 'yyyy-MM-dd'));

        if (selectedBranchId) {
          query = query.eq('branch_id', selectedBranchId);
        }

        const { data, error } = await query;

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
    if (!user?.customer_id) return;

    try {
      let query = supabase
        .from('visits')
        .select('pest_types')
        .eq('customer_id', user.customer_id)
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
    if (!user?.customer_id) return;

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
        .eq('customer_id', user.customer_id)
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
    if (!user?.customer_id) return;

    try {
      let query = supabase
        .from('branch_equipment')
        .select(`
          equipment_code,
          department,
          last_check,
          equipment:equipment_id (
            name
          ),
          branch:branch_id (
            sube_adi
          )
        `)
        .eq('customer_id', user.customer_id);

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const equipmentArray: EquipmentListItem[] = data?.map((item: any) => ({
        equipment_name: item.equipment?.name || 'Bilinmeyen Ekipman',
        equipment_code: item.equipment_code || '',
        department: item.department || 'Belirtilmemiş',
        branch_name: item.branch?.sube_adi || 'Bilinmeyen Şube',
        last_check_status: item.last_check?.status || 'Kontrol edilmedi',
        last_check_date: item.last_check?.date ? format(parseISO(item.last_check.date), 'dd.MM.yyyy') : 'Yok'
      })) || [];

      setEquipmentList(equipmentArray);
    } catch (error) {
      console.error('Error fetching equipment list:', error);
    }
  };

  const handleSaveReport = async () => {
    if (!user?.customer_id || !visitStats) {
      toast.error('Rapor verisi bulunamadı');
      return;
    }

    try {
      const reportName = `${customerName} - ${format(parseISO(dateRange.from), 'dd/MM/yyyy')} - ${format(parseISO(dateRange.to), 'dd/MM/yyyy')}`;
      const selectedBranchName = selectedBranchId ? branches.find(b => b.id === selectedBranchId)?.sube_adi : null;

      const reportData = {
        visitStats,
        equipmentData,
        monthlyTrends,
        pestTypeStats,
        biocidalProducts,
        equipmentList,
        customerName,
        branchName: selectedBranchName,
        dateRange
      };

      const { error } = await supabase
        .from('trend_analysis_reports')
        .insert({
          customer_id: user.customer_id,
          branch_id: selectedBranchId || null,
          report_name: reportName,
          date_from: dateRange.from,
          date_to: dateRange.to,
          report_data: reportData,
          created_by: user.email
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

  if (loading && !visitStats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Rapor hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Trend Analizi</h1>
                <p className="text-gray-600">Ziyaret ve ekipman performansı analizi</p>
              </div>
            </div>
            {visitStats && (
              <div className="flex gap-2">
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
              </div>
            )}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Filtreler
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {branches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Şube (Opsiyonel)</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tüm Şubeler</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.sube_adi}</option>
                  ))}
                </select>
              </div>
            )}

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

            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Activity className="h-5 w-5" />}
                {loading ? 'Güncelleniyor...' : 'Raporu Güncelle'}
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {visitStats && (
          <div ref={reportRef} className="bg-white rounded-lg shadow-sm p-8">
            {/* Report Header */}
            <div className="text-center mb-8 pb-6 border-b">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Trend Analizi Raporu</h2>
              <p className="text-lg text-gray-600">{customerName}</p>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ekipman Listesi</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ekipman Adı</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Kod</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Departman</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Şube</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Son Kontrol</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {equipmentList.map((eq, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{eq.equipment_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono">{eq.equipment_code}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{eq.department}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{eq.branch_name}</td>
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

            {equipmentData.length === 0 && monthlyTrends.length === 0 && pestTypeStats.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Seçilen tarih aralığında veri bulunamadı.</p>
                <p className="text-sm text-gray-500 mt-2">Lütfen farklı bir tarih aralığı seçin.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerTrendAnalysis;
