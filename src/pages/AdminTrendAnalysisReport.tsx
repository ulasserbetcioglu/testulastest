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
  XCircle
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
interface Branch { id: string; sube_adi: string; musteri_id: string; }

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

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

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCustomers();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      setFilteredBranches(branches.filter(b => b.musteri_id === selectedCustomerId));
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
        .select('id, sube_adi, musteri_id')
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
      await Promise.all([
        fetchVisitStats(),
        fetchEquipmentData(),
        fetchMonthlyTrends(),
        fetchPestTypeStats()
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {filteredBranches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Şube (Opsiyonel)</label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tüm Şubeler</option>
                  {filteredBranches.map(b => (
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
              <button
                onClick={handleExportImage}
                disabled={generating}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
              >
                {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                Raporu İndir
              </button>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTrendAnalysisReport;
