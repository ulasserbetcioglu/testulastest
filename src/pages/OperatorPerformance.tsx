import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { BarChart3, Users, Route, DollarSign, Filter, Loader2 as Loader } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Arayüz (Interface) tanımları
interface Operator {
  id: string;
  name: string;
}

interface PerformanceData {
  operatorId: string;
  operatorName: string;
  materialSalesTotal: number;
  visitRevenueTotal: number;
  totalRevenue: number;
  totalVisits: number;
  paidVisits: number;
}

const OperatorPerformance = () => {
  // State'ler
  const [operators, setOperators] = useState<Operator[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Filtre State'leri
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedOperator, setSelectedOperator] = useState<string>('all');

  // Operatör listesini ilk yüklemede çek
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const { data, error } = await supabase.from('operators').select('id, name').order('name');
        if (error) throw error;
        setOperators(data || []);
      } catch (error: any) {
        toast.error('Operatörler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchOperators();
  }, []);

  // Ana veri çekme ve hesaplama fonksiyonu
  const calculatePerformance = useCallback(async () => {
    if (!startDate || !endDate) {
      toast.error('Lütfen başlangıç ve bitiş tarihlerini seçin.');
      return;
    }
    setIsCalculating(true);
    try {
      const startTime = new Date(startDate).toISOString();
      const endTime = new Date(endDate + 'T23:59:59').toISOString();

      // 1. Gerekli tüm verileri paralel olarak çek
      const [
        visitsRes,
        salesRes,
        customerPricingRes,
        branchPricingRes,
        branchesRes,
      ] = await Promise.all([
        // ✅ DEĞİŞİKLİK: Ziyaretlerden 'id' de çekiliyor.
        supabase.from('visits').select('id, operator_id, branch_id').eq('status', 'completed').gte('visit_date', startTime).lte('visit_date', endTime),
        // ✅ DEĞİŞİKLİK: Satışlardan 'operator_id' yerine 'visit_id' çekiliyor.
        supabase.from('paid_material_sales').select('visit_id, total_amount').gte('sale_date', startTime).lte('sale_date', endTime),
        supabase.from('customer_pricing').select('customer_id, monthly_price, per_visit_price'),
        supabase.from('branch_pricing').select('branch_id, monthly_price, per_visit_price'),
        supabase.from('branches').select('id, customer_id'),
      ]);

      // Hata kontrolü
      const responses = [visitsRes, salesRes, customerPricingRes, branchPricingRes, branchesRes];
      for (const res of responses) {
        if (res.error) throw res.error;
      }
      
      const visits = visitsRes.data || [];
      const sales = salesRes.data || [];
      const customerPricing = customerPricingRes.data || [];
      const branchPricing = branchPricingRes.data || [];
      const branches = branchesRes.data || [];

      // 2. Hızlı erişim için haritalar oluştur
      const branchCustomerMap = new Map(branches.map(b => [b.id, b.customer_id]));
      const branchPriceMap = new Map(branchPricing.map(bp => [bp.branch_id, { monthly: bp.monthly_price, perVisit: bp.per_visit_price }]));
      const customerPriceMap = new Map(customerPricing.map(cp => [cp.customer_id, { monthly: cp.monthly_price, perVisit: cp.per_visit_price }]));
      // ✅ YENİ: Ziyaret ID'sini Operatör ID'sine bağlayan harita
      const visitOperatorMap = new Map(visits.map(v => [v.id, v.operator_id]));

      // 3. Her operatör için performansı hesapla
      const performanceResults = operators.map(op => {
        const operatorVisits = visits.filter(v => v.operator_id === op.id);
        
        // ✅ DEĞİŞİKLİK: Satışlar, 'visit_id' üzerinden operatöre bağlanıyor.
        const operatorSales = sales.filter(s => visitOperatorMap.get(s.visit_id) === op.id);

        const materialSalesTotal = operatorSales.reduce((sum, sale) => sum + sale.total_amount, 0);
        
        let visitRevenueTotal = 0;
        let paidVisits = 0;

        const visitsByBranch = operatorVisits.reduce((acc, visit) => {
            if (!acc[visit.branch_id]) acc[visit.branch_id] = [];
            acc[visit.branch_id].push(visit);
            return acc;
        }, {});

        for (const branchId in visitsByBranch) {
            const branchVisits = visitsByBranch[branchId];
            const visitCount = branchVisits.length;
            const customerId = branchCustomerMap.get(branchId);
            const branchPriceInfo = branchPriceMap.get(branchId);
            const customerPriceInfo = customerPriceMap.get(customerId);

            let unitPrice = 0;
            if (branchPriceInfo?.perVisit) unitPrice = branchPriceInfo.perVisit;
            else if (customerPriceInfo?.perVisit) unitPrice = customerPriceInfo.perVisit;
            else if (branchPriceInfo?.monthly) unitPrice = branchPriceInfo.monthly / visitCount;
            else if (customerPriceInfo?.monthly) unitPrice = customerPriceInfo.monthly / visitCount;

            if (unitPrice > 0) {
                visitRevenueTotal += unitPrice * visitCount;
                paidVisits += visitCount;
            }
        }
        
        return {
          operatorId: op.id,
          operatorName: op.name,
          materialSalesTotal,
          visitRevenueTotal,
          totalRevenue: materialSalesTotal + visitRevenueTotal,
          totalVisits: operatorVisits.length,
          paidVisits,
        };
      });

      setPerformanceData(performanceResults);

    } catch (error: any) {
      toast.error('Performans verileri hesaplanırken bir hata oluştu: ' + error.message);
    } finally {
      setIsCalculating(false);
    }
  }, [startDate, endDate, operators]);

  // Filtrelenmiş ve özetlenmiş veriler
  const filteredPerformanceData = useMemo(() => {
    if (selectedOperator === 'all') {
      return performanceData;
    }
    return performanceData.filter(p => p.operatorId === selectedOperator);
  }, [performanceData, selectedOperator]);

  const summaryData = useMemo(() => {
    return filteredPerformanceData.reduce((acc, current) => {
        acc.totalRevenue += current.totalRevenue;
        acc.totalVisits += current.totalVisits;
        acc.paidVisits += current.paidVisits;
        acc.materialSalesTotal += current.materialSalesTotal;
        return acc;
    }, { totalRevenue: 0, totalVisits: 0, paidVisits: 0, materialSalesTotal: 0 });
  }, [filteredPerformanceData]);

  const chartData = useMemo(() => {
      return filteredPerformanceData
        .filter(d => d.totalRevenue > 0)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);
  }, [filteredPerformanceData]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader className="w-12 h-12 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Operatör Performans Raporu</h1>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white p-4 rounded-xl shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operatör</label>
            <select value={selectedOperator} onChange={e => setSelectedOperator(e.target.value)} className="w-full p-2 border rounded-lg bg-white">
              <option value="all">Tüm Operatörler</option>
              {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
          </div>
          <button onClick={calculatePerformance} disabled={isCalculating} className="w-full flex items-center justify-center gap-2 p-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
            {isCalculating ? <Loader className="animate-spin" /> : <Filter />}
            {isCalculating ? 'Hesaplanıyor...' : 'Raporu Getir'}
          </button>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Toplam Ciro</p>
                <p className="text-3xl font-bold text-gray-800">{summaryData.totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-500" />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Malzeme Satışları</p>
                <p className="text-3xl font-bold text-gray-800">{summaryData.materialSalesTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            </div>
            <DollarSign className="w-10 h-10 text-indigo-500" />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Toplam Ziyaret</p>
                <p className="text-3xl font-bold text-gray-800">{summaryData.totalVisits}</p>
            </div>
            <Route className="w-10 h-10 text-blue-500" />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">Ücretli Ziyaret</p>
                <p className="text-3xl font-bold text-gray-800">{summaryData.paidVisits}</p>
            </div>
            <Users className="w-10 h-10 text-orange-500" />
        </div>
      </div>

      {/* Grafik ve Tablo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold mb-4">Operatör Ciro Dağılımı (Top 10)</h3>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => `${(value / 1000)}k`} />
                    <YAxis type="category" dataKey="operatorName" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => [value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }), "Toplam Ciro"]} />
                    <Bar dataKey="totalRevenue" fill="#3b82f6" name="Toplam Ciro" />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operatör</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Malzeme Satışı</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ziyaret Geliri</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam Ciro</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Toplam Ziyaret</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ücretli Ziyaret</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredPerformanceData.map(data => (
                            <tr key={data.operatorId} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.operatorName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">{data.materialSalesTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">{data.visitRevenueTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">{data.totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">{data.totalVisits}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">{data.paidVisits}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorPerformance;