import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { Calendar, Users, Building, TrendingUp, Download, RefreshCw, Filter, Package } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- TİP TANIMLAMALARI ---
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
    total_price: number; // Ürün bazlı ciro için eklendi
    product: { name: string };
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AdminMaterialSalesReports: React.FC = () => {
  const [sales, setSales] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Varsayılan olarak son 1 ayı getir
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 0)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'ozet' | 'personel' | 'musteri' | 'urunler'>('ozet');

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

  // --- ANALİZ VE HESAPLAMALAR ---

  // 1. Genel Özet İstatistikleri
  const summaryStats = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalSalesCount = sales.length;
    const totalItemsSold = sales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);
    
    return { totalRevenue, totalSalesCount, totalItemsSold };
  }, [sales]);

  // 2. Personel Performansı
  const personnelPerformance = useMemo(() => {
    const stats: Record<string, { name: string; revenue: number; count: number }> = {};

    sales.forEach(sale => {
      const opName = sale.visit?.operator?.name || 'Belirsiz';
      if (!stats[opName]) stats[opName] = { name: opName, revenue: 0, count: 0 };
      stats[opName].revenue += sale.total_amount;
      stats[opName].count += 1;
    });

    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  // 3. Müşteri ve Şube Sıralaması
  const customerPerformance = useMemo(() => {
    const stats: Record<string, { name: string; revenue: number }> = {};
    sales.forEach(sale => {
      const custName = sale.customer?.kisa_isim || 'Bilinmeyen';
      if (!stats[custName]) stats[custName] = { name: custName, revenue: 0 };
      stats[custName].revenue += sale.total_amount;
    });
    // Top 10 Müşteri
    return Object.values(stats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [sales]);

  const branchPerformance = useMemo(() => {
    const stats: Record<string, { name: string; customer: string; revenue: number }> = {};
    sales.forEach(sale => {
      const branchName = sale.branch?.sube_adi || 'Merkez';
      const key = `${sale.customer?.kisa_isim} - ${branchName}`;
      
      if (!stats[key]) stats[key] = { name: branchName, customer: sale.customer?.kisa_isim, revenue: 0 };
      stats[key].revenue += sale.total_amount;
    });
    // Top 10 Şube
    return Object.values(stats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [sales]);

  // 4. Ürün Performansı (YENİ EKLENDİ)
  const productPerformance = useMemo(() => {
    const stats: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const pName = item.product?.name || 'Bilinmeyen Ürün';
        if (!stats[pName]) stats[pName] = { name: pName, quantity: 0, revenue: 0 };
        stats[pName].quantity += item.quantity;
        stats[pName].revenue += item.total_price || 0;
      });
    });

    // Adet sayısına göre azalan sıralama
    return Object.values(stats).sort((a, b) => b.quantity - a.quantity);
  }, [sales]);


  // --- EXCEL DIŞA AKTARMA ---
  const exportReport = () => {
    // Personel Raporu
    const wsPersonnel = XLSX.utils.json_to_sheet(personnelPerformance.map(p => ({
      'Personel': p.name,
      'Toplam Satış Tutarı': p.revenue,
      'İşlem Sayısı': p.count
    })));

    // Ürün Raporu (YENİ)
    const wsProducts = XLSX.utils.json_to_sheet(productPerformance.map(p => ({
      'Ürün Adı': p.name,
      'Satılan Adet': p.quantity,
      'Toplam Gelir': p.revenue
    })));

    // Müşteri Raporu
    const wsCustomer = XLSX.utils.json_to_sheet(customerPerformance.map(c => ({
      'Müşteri': c.name,
      'Toplam Alım Tutarı': c.revenue
    })));

    // Ham Veri
    const wsRaw = XLSX.utils.json_to_sheet(sales.map(s => ({
      'Tarih': format(new Date(s.sale_date), 'dd.MM.yyyy', { locale: tr }),
      'Müşteri': s.customer?.kisa_isim,
      'Şube': s.branch?.sube_adi,
      'Personel': s.visit?.operator?.name,
      'Tutar': s.total_amount,
      'Ürünler': s.items.map(i => `${i.product?.name} (${i.quantity})`).join(', ')
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsProducts, "Ürün Analizi");
    XLSX.utils.book_append_sheet(wb, wsPersonnel, "Personel Performans");
    XLSX.utils.book_append_sheet(wb, wsCustomer, "Müşteri Analizi");
    XLSX.utils.book_append_sheet(wb, wsRaw, "Tüm Satışlar");

    XLSX.writeFile(wb, `Satis_Raporu_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* BAŞLIK VE FİLTRELER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Malzeme Satış Raporları</h1>
          <p className="text-gray-500 text-sm">Satış performansını, ürünleri ve dağılımları analiz edin.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border">
            <Calendar size={18} className="text-gray-500" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm focus:outline-none"
            />
            <span className="text-gray-400">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm focus:outline-none"
            />
          </div>
          
          <button 
            onClick={fetchAllSales} 
            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            title="Yenile"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          <button 
            onClick={exportReport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <Download size={18} />
            <span>Excel Raporu</span>
          </button>
        </div>
      </div>

      {/* KPI KARTLARI (ÖZET) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Toplam Ciro</p>
            <h3 className="text-3xl font-bold text-gray-800">{summaryStats.totalRevenue.toLocaleString('tr-TR')} ₺</h3>
          </div>
          <div className="p-4 bg-green-50 rounded-full text-green-600">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Toplam İşlem</p>
            <h3 className="text-3xl font-bold text-gray-800">{summaryStats.totalSalesCount}</h3>
          </div>
          <div className="p-4 bg-blue-50 rounded-full text-blue-600">
            <Filter size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Satılan Ürün Adedi</p>
            <h3 className="text-3xl font-bold text-gray-800">{summaryStats.totalItemsSold}</h3>
          </div>
          <div className="p-4 bg-purple-50 rounded-full text-purple-600">
            <Package size={24} />
          </div>
        </div>
      </div>

      {/* SEKME YAPISI */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          <button 
            onClick={() => setActiveTab('ozet')}
            className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'ozet' ? 'border-b-2 border-green-600 text-green-700 bg-green-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Genel Bakış
          </button>
          <button 
            onClick={() => setActiveTab('urunler')}
            className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'urunler' ? 'border-b-2 border-green-600 text-green-700 bg-green-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Ürün Analizi
          </button>
          <button 
            onClick={() => setActiveTab('personel')}
            className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'personel' ? 'border-b-2 border-green-600 text-green-700 bg-green-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Personel Performansı
          </button>
          <button 
            onClick={() => setActiveTab('musteri')}
            className={`px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'musteri' ? 'border-b-2 border-green-600 text-green-700 bg-green-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Müşteri & Şube Analizi
          </button>
        </div>

        <div className="p-6">
          {/* SEKME 1: GENEL BAKIŞ (Grafikler) */}
          {activeTab === 'ozet' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">En Çok Satış Yapan Personeller</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={personnelPerformance.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <RechartsTooltip formatter={(value) => `${Number(value).toLocaleString('tr-TR')} ₺`} />
                      <Bar dataKey="revenue" fill="#10B981" radius={[0, 4, 4, 0]} name="Ciro" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">En Büyük 5 Müşteri</h3>
                <div className="h-80 w-full flex justify-center">
                   <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={customerPerformance.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="revenue"
                        nameKey="name"
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {customerPerformance.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `${Number(value).toLocaleString('tr-TR')} ₺`} />
                    </PieChart>
                   </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* SEKME 2: ÜRÜN ANALİZİ (YENİ SEKME) */}
          {activeTab === 'urunler' && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Satılan Malzemeler (Adet ve Ciro)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Satılan Adet</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Elde Edilen Gelir</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ortalama Birim Fiyat</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productPerformance.map((p, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex items-center">
                             <span className="font-medium text-gray-900">{idx + 1}. {p.name}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-700">
                          {p.quantity} Adet
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                          {p.revenue.toLocaleString('tr-TR')} ₺
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                          {(p.quantity > 0 ? (p.revenue / p.quantity) : 0).toLocaleString('tr-TR')} ₺
                        </td>
                      </tr>
                    ))}
                    {productPerformance.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          Seçilen tarih aralığında ürün satışı bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEKME 3: PERSONEL LİSTESİ */}
          {activeTab === 'personel' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Personel</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlem Sayısı</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam Ciro</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ort. İşlem Tutarı</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {personnelPerformance.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{p.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">{p.count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-600">
                        {p.revenue.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">
                        {(p.revenue / p.count).toLocaleString('tr-TR')} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SEKME 4: MÜŞTERİ VE ŞUBE LİSTESİ */}
          {activeTab === 'musteri' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Müşteri Tablosu */}
              <div>
                <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">En Çok Alım Yapan Müşteriler (Top 10)</h3>
                <ul className="space-y-3">
                  {customerPerformance.map((c, idx) => (
                    <li key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">{idx + 1}. {c.name}</span>
                      <span className="font-bold text-green-600">{c.revenue.toLocaleString('tr-TR')} ₺</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Şube Tablosu */}
              <div>
                <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">En Çok Alım Yapan Şubeler (Top 10)</h3>
                <ul className="space-y-3">
                  {branchPerformance.map((b, idx) => (
                    <li key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="block font-medium text-gray-700">{idx + 1}. {b.name}</span>
                        <span className="text-xs text-gray-500">{b.customer}</span>
                      </div>
                      <span className="font-bold text-green-600">{b.revenue.toLocaleString('tr-TR')} ₺</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMaterialSalesReports;