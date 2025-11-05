// src/pages/CariSatisRaporu.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { getMonth, getYear } from 'date-fns';
import {
  DollarSign, Search, Download, Loader2, Users, Building, Eye
} from 'lucide-react'; // 'Bar' bileşeni buradan kaldırıldı
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { BarChart as ReBarChart, Bar, LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Bar bileşeni buradan geliyor

// Türkçe ay isimleri
const allMonths = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

// Arayüzler
interface Customer {
  id: string;
  kisa_isim: string;
  cari_isim?: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
  customer?: {
    kisa_isim: string;
  };
}

interface Visit {
  id: string;
  branch_id: string | null;
  visit_date: string;
  customer_id: string;
  status: string;
}

interface PaidMaterialSale {
  id: string;
  total_amount: number;
  sale_date: string;
  visit_id: string | null;
  customer_id: string;
  branch_id: string | null;
}

interface CustomerPricing {
  customer_id: string;
  monthly_price: number | null;
  per_visit_price: number | null;
}

interface BranchPricing {
  branch_id: string;
  monthly_price: number | null;
  per_visit_price: number | null;
}

interface MonthlyData {
  materialSales: number;
  monthlyFee: number; // Fixed monthly fee
  perVisitFee: number; // Per visit fee
  total: number;
  visitCount: number;
}

interface ReportItem {
  id: string;
  name: string;
  monthlyData: MonthlyData[];
  total: number;
}

// createEmptyDetails fonksiyonu useMemo bloğunun dışına taşındı
const createEmptyDetails = (): MonthlyData => ({ materialSales: 0, monthlyFee: 0, perVisitFee: 0, total: 0, visitCount: 0 });

const CariSatisRaporu = () => {
  // State'ler
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()));
  const [searchTerm, setSearchTerm] = useState('');
  const [reportType, setReportType] = useState<'customer' | 'branch'>('customer');
  const [debugMode, setDebugMode] = useState(false);

  // Veri state'leri
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customerPricing, setCustomerPricing] = useState<CustomerPricing[]>([]);
  const [branchPricing, setBranchPricing] = useState<BranchPricing[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [paidMaterialSales, setPaidMaterialSales] = useState<PaidMaterialSale[]>([]);
  const [firmaId, setFirmaId] = useState<string | null>(null); // Firma ID'si için state

  // Veri çekme
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Kullanıcı oturumu bulunamadı.");
        setLoading(false);
        return;
      }

      const { data: firmaData, error: firmaError } = await supabase
        .from('firmalar')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (firmaError) {
        console.warn("Firma bilgisi çekilirken hata:", firmaError.message);
      }
      setFirmaId(firmaData?.id || null);
      
      const startDate = new Date(selectedYear, 0, 1).toISOString();
      const endDate = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();

      const [
        customersRes,
        branchesRes,
        customerPricingRes,
        branchPricingRes,
        visitsRes,
        paidMaterialSalesRes
      ] = await Promise.all([
        supabase.from('customers').select('id, kisa_isim, cari_isim').order('kisa_isim'),
        supabase.from('branches').select('id, sube_adi, customer_id').order('sube_adi'),
        supabase.from('customer_pricing').select('customer_id, monthly_price, per_visit_price'),
        supabase.from('branch_pricing').select('branch_id, monthly_price, per_visit_price'),
        supabase.from('visits').select('id, branch_id, visit_date, customer_id, status').eq('status', 'completed').gte('visit_date', startDate).lte('visit_date', endDate),
        supabase.from('paid_material_sales').select('id, total_amount, sale_date, visit_id, customer_id, branch_id').gte('sale_date', startDate).lte('sale_date', endDate)
      ]);

      const responses = [customersRes, branchesRes, customerPricingRes, branchPricingRes, visitsRes, paidMaterialSalesRes];
      for (const res of responses) {
        if (res.error) throw res.error;
      }

      setCustomers(customersRes.data || []);
      setBranches(branchesRes.data || []);
      setCustomerPricing(customerPricingRes.data || []);
      setBranchPricing(branchPricingRes.data || []);
      setVisits(visitsRes.data || []);
      setPaidMaterialSales(paidMaterialSalesRes.data || []);

    } catch (error: any) {
      toast.error("Veriler çekilirken hata oluştu: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✅ DÜZELTİLMİŞ HESAPLAMA MANTIĞI
  const reportData = useMemo(() => {
    if (loading) return [];

    if(debugMode) console.log('🔄 Rapor hesaplaması başlıyor...', {
        reportType,
        visitsCount: visits.length,
        paidMaterialSalesCount: paidMaterialSales.length,
        customersCount: customers.length,
        branchesCount: branches.length
    });

    // --- 1. ADIM: HAZIRLIK - Haritaları Oluştur ---
    const customerPricingMap = new Map(customerPricing.map(cp => [cp.customer_id, { monthly: cp.monthly_price || 0, perVisit: cp.per_visit_price || 0 }]));
    const branchPricingMap = new Map(branchPricing.map(bp => [bp.branch_id, { monthly: bp.monthly_price || 0, perVisit: bp.per_visit_price || 0 }]));
    const branchCustomerMap = new Map(branches.map(b => [b.id, b.customer_id]));

    // --- 2. ADIM: RAPOR SATIRLARINI OLUŞTURMA İÇİN BOŞ YAPILARI HAZIRLA ---
    const createEmptyReportItem = (id: string, name: string): ReportItem => ({
        id,
        name,
        monthlyData: Array(12).fill(null).map(() => createEmptyDetails()),
        total: 0
    });

    const dataMap = new Map<string, ReportItem>();
    const reportEntities = reportType === 'customer' ? customers : branches;

    reportEntities.forEach(entity => {
        const name = reportType === 'customer'
            ? entity.kisa_isim
            : `${entity.sube_adi} (${customers.find(c => c.id === entity.customer_id)?.kisa_isim || 'N/A'})`;
        dataMap.set(entity.id, createEmptyReportItem(entity.id, name));
    });

    // --- 3. ADIM: FİNANSAL İŞLEMLERİ İŞLEME ---

    // a) Malzeme Satışları (materialSales)
    paidMaterialSales.forEach(sale => {
      const month = getMonth(new Date(sale.sale_date));
      const entityId = reportType === 'customer' ? sale.customer_id : sale.branch_id;

      if (entityId && dataMap.has(entityId)) {
        dataMap.get(entityId)!.monthlyData[month].materialSales += sale.total_amount;
      }
    });

    // b) Ziyaret Başı Ücretler (perVisitFee)
    visits.forEach(visit => {
        const month = getMonth(new Date(visit.visit_date));
        const entityId = reportType === 'customer' ? visit.customer_id : visit.branch_id;
        
        if (entityId && dataMap.has(entityId)) {
            const monthlyData = dataMap.get(entityId)!.monthlyData[month];
            monthlyData.visitCount += 1; // Ziyaret sayısını artır

            const branchPricing = visit.branch_id ? branchPricingMap.get(visit.branch_id) : undefined;
            const customerPricing = visit.customer_id ? customerPricingMap.get(visit.customer_id) : undefined;

            let perVisitFee = 0;

            // Fiyatlandırma Hiyerarşisi:
            // 1. Şube ziyaret başı fiyatı (per_visit_price)
            if (branchPricing?.perVisit > 0) {
                perVisitFee = branchPricing.perVisit;
            } 
            // 2. Müşteri ziyaret başı fiyatı (per_visit_price)
            else if (customerPricing?.perVisit > 0) {
                perVisitFee = customerPricing.perVisit;
            }
            
            monthlyData.perVisitFee += perVisitFee;
        }
    });

    // c) Sabit Aylık Ücretler (monthlyFee)
    // AdminRevenue.tsx mantığına göre, aylık ücretler ziyaret sayısından bağımsız olarak eklenir.
    // Ancak, Cari Satış Raporu'nda her bir müşteri/şube için aylık bazda gösterildiği için,
    // bu ücreti ilgili ayın toplamına ekliyoruz.
    for (let month = 0; month < 12; month++) {
        if (reportType === 'customer') {
            customers.forEach(customer => {
                let customerFixedMonthly = customerPricingMap.get(customer.id)?.monthly || 0;
                
                // Müşteriye ait şubelerin aylık fiyatlarını topla (eğer şubenin kendi aylık fiyatı varsa)
                branches.filter(b => b.customer_id === customer.id).forEach(branch => {
                    const branchPricing = branchPricingMap.get(branch.id);
                    if (branchPricing?.monthly > 0) {
                        customerFixedMonthly += branchPricing.monthly;
                    }
                });
                dataMap.get(customer.id)!.monthlyData[month].monthlyFee += customerFixedMonthly;
            });
        } else { // reportType === 'branch'
            branches.forEach(branch => {
                let branchFixedMonthly = branchPricingMap.get(branch.id)?.monthly || 0;
                
                // Eğer şubenin kendi aylık fiyatı yoksa, müşterinin aylık fiyatını yedek olarak kullan
                if (branchFixedMonthly === 0) {
                    const customerId = branchCustomerMap.get(branch.id);
                    if (customerId) {
                        branchFixedMonthly = customerPricingMap.get(customerId)?.monthly || 0;
                    }
                }
                dataMap.get(branch.id)!.monthlyData[month].monthlyFee += branchFixedMonthly;
            });
        }
    }


    // --- 5. ADIM: TOPLAMLARI HESAPLA ---
    for (const row of dataMap.values()) {
        let grandTotal = 0;
        row.monthlyData.forEach(md => {
            md.total = md.materialSales + md.monthlyFee + md.perVisitFee;
            grandTotal += md.total;
        });
        row.total = grandTotal;
    }

    const result = Array.from(dataMap.values());
    if(debugMode) console.log('✅ Hesaplama tamamlandı. Sonuç kayıt sayısı:', result.length);
    return result;
  }, [loading, customers, branches, customerPricing, branchPricing, visits, paidMaterialSales, reportType, debugMode]);

  // Filtrelenmiş veri
  const filteredData = useMemo(() => {
    if (searchTerm.trim() === '') {
        return reportData.filter(item => item.total > 0);
    }
    return reportData.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reportData, searchTerm]);

  // Görünür aylar
  const visibleMonths = useMemo(() => {
    const currentYear = getYear(new Date());
    const currentMonth = getMonth(new Date());
    return selectedYear < currentYear ? allMonths : allMonths.slice(0, currentMonth + 1);
  }, [selectedYear]);

  // Aylık toplamlar
  const monthlyTotals = useMemo(() => {
    const totals: MonthlyData[] =
      Array(12).fill(null).map(() => ({ materialSales: 0, monthlyFee: 0, perVisitFee: 0, total: 0, visitCount: 0 }));

    filteredData.forEach(item => {
      item.monthlyData.forEach((monthData, index) => {
        totals[index].materialSales += monthData.materialSales;
        totals[index].monthlyFee += monthData.monthlyFee;
        totals[index].perVisitFee += monthData.perVisitFee;
        totals[index].total += monthData.total;
        totals[index].visitCount += monthData.visitCount;
      });
    });
    return totals;
  }, [filteredData]);

  const grandTotal = monthlyTotals.reduce((acc, month) => acc + month.total, 0);

  // Grafik verileri
  const lineChartData = visibleMonths.map((month, index) => ({
    name: month,
    'Toplam Satış': monthlyTotals[index].total
  }));

  const barChartData = [...reportData]
    .sort((a, b) => b.total - a.total)
    .filter(item => item.total > 0)
    .slice(0, 10)
    .map(item => ({
      name: item.name,
      'Toplam Satış': item.total
    }));

  // Excel export
  const exportToExcel = () => {
    const dataToExport = filteredData.map(item => {
      const row: { [key: string]: any } = { [reportType === 'customer' ? 'Müşteri Adı' : 'Şube Adı']: item.name };
      visibleMonths.forEach((month, index) => {
        row[month] = item.monthlyData[index].total.toFixed(2);
      });
      row['Toplam'] = item.total.toFixed(2);
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, ws, "Rapor");
    XLSX.writeFile(wb, `Cari_Satis_Raporu_${selectedYear}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Yıllık Cari Satış Raporu</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="p-2 border rounded-lg w-24"
          />
          <button
            onClick={() => setDebugMode(!debugMode)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 ${debugMode ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}
          >
            <Eye size={16} />
            Debug
          </button>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download size={18} />
            Excel
          </button>
        </div>
      </header>

      {/* Debug Bilgisi */}
      {debugMode && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Debug Bilgisi:</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <div><span className="font-medium">Müşteriler:</span> {customers.length}</div>
            <div><span className="font-medium">Şubeler:</span> {branches.length}</div>
            <div><span className="font-medium">Satışlar:</span> {paidMaterialSales.length}</div>
            <div><span className="font-medium">Ziyaretler:</span> {visits.length}</div>
            <div><span className="font-medium">Firma ID:</span> {firmaId || 'Yok'}</div>
          </div>
          <div className="mt-2 text-sm">
            <span className="font-medium">Raporda Görünen:</span> {filteredData.length} kayıt
          </div>
        </div>
      )}

      {/* Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border">
          <h2 className="text-xl font-semibold mb-4">Aylık Toplam Satış Trendi</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ReLineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `${(value / 1000).toLocaleString('tr-TR')}k ₺`} />
              <Tooltip formatter={(value) => [value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }), "Toplam Satış"]} />
              <Legend />
              <Line type="monotone" dataKey="Toplam Satış" stroke="#10b981" strokeWidth={2} />
            </ReLineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border">
          <h2 className="text-xl font-semibold mb-4">En İyi 10 {reportType === 'customer' ? 'Müşteri' : 'Şube'}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ReBarChart data={barChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toLocaleString('tr-TR')}k`} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => [value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }), "Toplam Satış"]} />
              <Bar dataKey="Toplam Satış" fill="#10b981" />
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ana Tablo */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        {/* Filtreler */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div className="relative w-full md:w-1/3">
            <input
              type="text"
              placeholder={`${reportType === 'customer' ? 'Müşteri' : 'Şube'} adıyla ara...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 border border-gray-300 rounded-lg"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>

          <div className="flex items-center p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setReportType('customer')}
              className={`px-3 py-1 text-sm font-medium rounded-md flex items-center gap-2 ${
                reportType === 'customer' ? 'bg-white shadow' : 'text-gray-600'
              }`}
            >
              <Users size={16} />
              Müşteri Bazlı
            </button>
            <button
              onClick={() => setReportType('branch')}
              className={`px-3 py-1 text-sm font-medium rounded-md flex items-center gap-2 ${
                reportType === 'branch' ? 'bg-white shadow' : 'text-gray-600'
              }`}
            >
              <Building size={16} />
              Şube Bazlı
            </button>
          </div>
        </div>

        {/* Loading veya Tablo */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-green-500" size={48} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {reportType === 'customer' ? 'Müşteri Adı' : 'Şube Adı'}
                  </th>
                  {visibleMonths.map(month => (
                    <th key={month} className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {month}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Toplam
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {item.name}
                    </td>
                    {item.monthlyData.slice(0, visibleMonths.length).map((monthData, monthIndex) => (
                      <td key={monthIndex} className="px-4 py-3 text-sm text-right text-gray-600 group relative">
                        {monthData.total > 0 ? monthData.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'}

                        {/* Tooltip */}
                        {monthData.total > 0 && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-lg z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                            <h4 className="font-bold mb-2 border-b border-gray-600 pb-1">
                              {visibleMonths[monthIndex]} Detayı
                            </h4>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span>Malzeme Satışı:</span>
                                <span>{monthData.materialSales.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Aylık Ücret:</span>
                                <span>{monthData.monthlyFee.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Ziyaret Ücreti ({monthData.visitCount} ziyaret):</span>
                                <span>{monthData.perVisitFee.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                              </div>
                            </div>
                            <div className="border-t border-gray-600 mt-2 pt-1 flex justify-between font-bold">
                              <span>TOPLAM:</span>
                              <span>{monthData.total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm font-bold text-right text-gray-900 whitespace-nowrap">
                      {item.total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">Genel Toplam</td>
                  {monthlyTotals.slice(0, visibleMonths.length).map((total, index) => (
                    <td key={index} className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                      {total.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm font-extrabold text-right text-blue-600">
                    {grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CariSatisRaporu;
