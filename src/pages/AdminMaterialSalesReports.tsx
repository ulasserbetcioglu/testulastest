import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Calendar, Filter, TrendingUp, Download, RefreshCw, Package, Search, Building2, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- TİP TANIMLAMALARI ---
interface SaleItemFlat {
  sale_id: string;
  sale_date: string;
  customer_name: string;
  branch_name: string;
  operator_name: string;
  product_name: string;
  quantity: number;
  total_price: number;
}

interface SaleData {
  id: string;
  sale_date: string;
  total_amount: number;
  customer: { kisa_isim: string };
  branch: { sube_adi: string } | null;
  visit: {
    operator: { name: string } | null;
  } | null;
  items: {
    quantity: number;
    total_price: number;
    product: { name: string };
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff6b6b', '#4ecdc4'];

const AdminMaterialSalesReports: React.FC = () => {
  const [sales, setSales] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtreler
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 0)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState(''); // Ürün arama filtresi
  
  const [activeTab, setActiveTab] = useState<'ozet' | 'detay' | 'urun_dagilimi'>('ozet');

  // --- VERİ ÇEKME ---
  const fetchAllSales = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('paid_material_sales')
        .select(`
          id,
          sale_date,
          total_amount,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi),
          visit:visit_id (
            operator:operator_id (name)
          ),
          items:paid_material_sale_items (
            quantity,
            total_price,
            product:product_id (name)
          )
        `)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error('Veri çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSales();
  }, [startDate, endDate]);

  // --- HESAPLAMA MOTORU (Flatten & Filter) ---
  // Tüm satışları tek tek ürün satırlarına (line items) dönüştürüyoruz.
  // Bu sayede "Fare Zehri" arandığında sadece o satırları filtreleyip analiz edebiliriz.
  const filteredItems = useMemo(() => {
    let allItems: SaleItemFlat[] = [];

    sales.forEach(sale => {
      sale.items.forEach(item => {
        allItems.push({
          sale_id: sale.id,
          sale_date: sale.sale_date,
          customer_name: sale.customer?.kisa_isim || 'Bilinmeyen Müşteri',
          branch_name: sale.branch?.sube_adi || 'Merkez / Şube Yok',
          operator_name: sale.visit?.operator?.name || 'Belirsiz',
          product_name: item.product?.name || 'İsimsiz Ürün',
          quantity: item.quantity,
          total_price: item.total_price || 0
        });
      });
    });

    // Filtreleme (Ürün Adına Göre)
    if (searchTerm.trim() !== '') {
      const lowerTerm = searchTerm.toLowerCase();
      allItems = allItems.filter(item => 
        item.product_name.toLowerCase().includes(lowerTerm)
      );
    }

    return allItems;
  }, [sales, searchTerm]);

  // --- İSTATİSTİKLER ---

  const stats = useMemo(() => {
    return {
      totalRevenue: filteredItems.reduce((sum, item) => sum + item.total_price, 0),
      totalQuantity: filteredItems.reduce((sum, item) => sum + item.quantity, 0),
      uniqueTransactions: new Set(filteredItems.map(i => i.sale_id)).size,
      topProduct: '...' // Aşağıda hesaplanacak
    };
  }, [filteredItems]);

  // Müşteri Bazlı Dağılım
  const customerStats = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredItems.forEach(item => {
      groups[item.customer_name] = (groups[item.customer_name] || 0) + item.total_price;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10
  }, [filteredItems]);

  // Şube Bazlı Dağılım
  const branchStats = useMemo(() => {
    const groups: Record<string, { total: number, customer: string }> = {};
    filteredItems.forEach(item => {
      const key = `${item.customer_name} - ${item.branch_name}`;
      if (!groups[key]) groups[key] = { total: 0, customer: item.customer_name };
      groups[key].total += item.total_price;
    });
    return Object.entries(groups)
      .map(([name, data]) => ({ name, value: data.total }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredItems]);

  // Ürün Bazlı Dağılım (Arama yoksa en çok satılanlar)
  const productStats = useMemo(() => {
    const groups: Record<string, { qty: number, revenue: number }> = {};
    filteredItems.forEach(item => {
      if (!groups[item.product_name]) groups[item.product_name] = { qty: 0, revenue: 0 };
      groups[item.product_name].qty += item.quantity;
      groups[item.product_name].revenue += item.total_price;
    });
    return Object.entries(groups)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty);
  }, [filteredItems]);

  // Personel Bazlı
  const operatorStats = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredItems.forEach(item => {
      groups[item.operator_name] = (groups[item.operator_name] || 0) + item.total_price;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredItems]);


  // --- EXCEL ---
  const exportExcel = () => {
    const wsData = filteredItems.map(item => ({
      'Tarih': format(new Date(item.sale_date), 'dd.MM.yyyy', { locale: tr }),
      'Ürün': item.product_name,
      'Müşteri': item.customer_name,
      'Şube': item.branch_name,
      'Personel': item.operator_name,
      'Adet': item.quantity,
      'Tutar': item.total_price
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Rapor");
    XLSX.writeFile(wb, `Malzeme_Analiz_${searchTerm || 'Genel'}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      
      {/* ÜST PANEL: Başlık ve Filtreler */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-blue-600" />
            Malzeme Satış Analizi
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm ? `"${searchTerm}" için sonuçlar gösteriliyor.` : 'Tüm ürün satışları.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Ürün Arama */}
          <div className="relative group flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Ürün adı ile filtrele..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
            />
          </div>

          {/* Tarih */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg p-1.5 px-3">
            <Calendar size={18} className="text-gray-500" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-sm outline-none w-32" />
            <span className="text-gray-400">-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-sm outline-none w-32" />
          </div>

          <button onClick={fetchAllSales} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200" title="Yenile">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors">
            <Download size={18} />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* KPI KARTLARI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Seçili Ciro</p>
          <div className="flex justify-between items-end mt-2">
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toLocaleString('tr-TR')} ₺</h3>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={20} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Satılan Miktar</p>
          <div className="flex justify-between items-end mt-2">
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalQuantity} <span className="text-sm font-normal text-gray-500">Adet</span></h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={20} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">İşlem Hacmi</p>
          <div className="flex justify-between items-end mt-2">
            <h3 className="text-2xl font-bold text-gray-900">{stats.uniqueTransactions} <span className="text-sm font-normal text-gray-500">Satış</span></h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Filter size={20} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">En Aktif Müşteri</p>
          <div className="flex justify-between items-end mt-2">
            <h3 className="text-lg font-bold text-gray-900 truncate max-w-[150px]" title={customerStats[0]?.name}>{customerStats[0]?.name || '-'}</h3>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><UserCheck size={20} /></div>
          </div>
        </div>
      </div>

      {/* GRAFİKLER VE DETAY TABLOLARI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SOL KOLON: Detaylı Analiz Tabloları */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Müşteri Sıralaması */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Müşteri Dağılımı (En Çok Alanlar)</h3>
              <span className="text-xs text-gray-500 bg-white border px-2 py-1 rounded">Ciro Bazlı</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Müşteri</th>
                    <th className="px-6 py-3 text-right">Alım Tutarı</th>
                    <th className="px-6 py-3 text-right">Oran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerStats.map((cust, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{cust.name}</td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-700">{cust.value.toLocaleString('tr-TR')} ₺</td>
                      <td className="px-6 py-3 text-right text-gray-500">
                        %{(stats.totalRevenue > 0 ? (cust.value / stats.totalRevenue * 100) : 0).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                  {customerStats.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-gray-500">Veri bulunamadı.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Şube Sıralaması */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Şube Dağılımı (Nereye Teslim Edildi?)</h3>
              <Building2 size={18} className="text-gray-400" />
            </div>
             <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Şube / Lokasyon</th>
                    <th className="px-6 py-3 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {branchStats.map((branch, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="font-medium text-gray-900">{branch.name.split(' - ')[1]}</div>
                        <div className="text-xs text-gray-500">{branch.name.split(' - ')[0]}</div>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-700">{branch.value.toLocaleString('tr-TR')} ₺</td>
                    </tr>
                  ))}
                   {branchStats.length === 0 && (
                    <tr><td colSpan={2} className="p-4 text-center text-gray-500">Veri bulunamadı.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* SAĞ KOLON: Grafikler ve Ürün Listesi */}
        <div className="space-y-6">
          
          {/* Personel Pasta Grafiği */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-4 text-center">Satışı Yapan Personel</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={operatorStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {operatorStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val:number) => `${val.toLocaleString('tr-TR')} ₺`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {operatorStats.slice(0, 5).map((op, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    {op.name}
                  </span>
                  <span className="font-medium">{op.value.toLocaleString('tr-TR')} ₺</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ürün Listesi (Filtre Sonuçları) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
             <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-800">Bulunan Ürünler</h3>
              <p className="text-xs text-gray-500">Miktara göre sıralı</p>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {productStats.map((prod, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 mb-2 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="font-medium text-sm text-gray-900 truncate" title={prod.name}>{prod.name}</p>
                    <p className="text-xs text-gray-500">{prod.revenue.toLocaleString('tr-TR')} ₺ Ciro</p>
                  </div>
                  <div className="bg-white px-2 py-1 rounded border text-xs font-bold text-gray-700 whitespace-nowrap">
                    {prod.qty} Adet
                  </div>
                </div>
              ))}
               {productStats.length === 0 && (
                 <p className="text-center text-gray-400 text-sm mt-10">Kriterlere uygun ürün bulunamadı.</p>
               )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminMaterialSalesReports;