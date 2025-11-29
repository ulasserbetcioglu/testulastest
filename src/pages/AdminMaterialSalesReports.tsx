import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Filter, TrendingUp, Download, RefreshCw, Package, Search, Building2, UserCheck, AlertTriangle } from 'lucide-react';
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

const AdminMaterialSalesReports: React.FC = () => {
  const [sales, setSales] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Varsayılan olarak son 1 ayı getir
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 0)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState(''); 

  // --- VERİ ÇEKME ---
  const fetchAllSales = async () => {
    setLoading(true);
    setError(null);
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
    } catch (err: any) {
      console.error('Veri çekme hatası:', err);
      setError(err.message || 'Veriler çekilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSales();
  }, [startDate, endDate]);

  // --- HESAPLAMA MOTORU ---
  const filteredItems = useMemo(() => {
    let allItems: SaleItemFlat[] = [];

    if (!sales) return [];

    sales.forEach(sale => {
      // items dizisi boş veya null ise atla
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          allItems.push({
            sale_id: sale.id,
            sale_date: sale.sale_date,
            customer_name: sale.customer?.kisa_isim || 'Bilinmeyen Müşteri',
            branch_name: sale.branch?.sube_adi || 'Merkez / Şube Yok',
            operator_name: sale.visit?.operator?.name || 'Belirsiz',
            product_name: item.product?.name || 'İsimsiz Ürün',
            quantity: item.quantity || 0,
            total_price: item.total_price || 0
          });
        });
      }
    });

    // Filtreleme (Ürün Adına Göre)
    if (searchTerm.trim() !== '') {
      const lowerTerm = searchTerm.toLowerCase();
      allItems = allItems.filter(item => 
        (item.product_name && item.product_name.toLowerCase().includes(lowerTerm))
      );
    }

    return allItems;
  }, [sales, searchTerm]);

  // --- İSTATİSTİKLER ---
  const stats = useMemo(() => {
    return {
      totalRevenue: filteredItems.reduce((sum, item) => sum + (item.total_price || 0), 0),
      totalQuantity: filteredItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
      uniqueTransactions: new Set(filteredItems.map(i => i.sale_id)).size,
    };
  }, [filteredItems]);

  const customerStats = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredItems.forEach(item => {
      groups[item.customer_name] = (groups[item.customer_name] || 0) + item.total_price;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredItems]);

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
    XLSX.writeFile(wb, `Malzeme_Analiz.xlsx`);
  };

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <AlertTriangle className="mx-auto mb-2" size={40} />
        <h2 className="text-xl font-bold">Bir hata oluştu</h2>
        <p>{error}</p>
        <button onClick={fetchAllSales} className="mt-4 px-4 py-2 bg-red-100 rounded hover:bg-red-200">Tekrar Dene</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      
      {/* ÜST PANEL */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-blue-600" />
            Malzeme Satış Analizi
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {searchTerm ? `"${searchTerm}" için sonuçlar.` : 'Tüm ürün satışları.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative group flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Ürün adı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg p-1.5 px-3">
            <Calendar size={18} className="text-gray-500" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-sm outline-none w-32" />
            <span className="text-gray-400">-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-sm outline-none w-32" />
          </div>

          <button onClick={fetchAllSales} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm">
            <Download size={18} />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* KPI KARTLARI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalQuantity} Adet</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={20} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">İşlem Hacmi</p>
          <div className="flex justify-between items-end mt-2">
            <h3 className="text-2xl font-bold text-gray-900">{stats.uniqueTransactions} İşlem</h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Filter size={20} /></div>
          </div>
        </div>
      </div>

      {/* DETAY TABLOLARI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Ürün Listesi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[500px] flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-800">Bulunan Ürünler</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {productStats.map((prod, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 mb-2 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="font-medium text-sm text-gray-900 truncate">{prod.name}</p>
                  <p className="text-xs text-gray-500">{prod.revenue.toLocaleString('tr-TR')} ₺ Ciro</p>
                </div>
                <div className="bg-white px-2 py-1 rounded border text-xs font-bold text-gray-700 whitespace-nowrap">
                  {prod.qty} Adet
                </div>
              </div>
            ))}
             {productStats.length === 0 && (
               <p className="text-center text-gray-400 text-sm mt-10">Kayıt bulunamadı.</p>
             )}
          </div>
        </div>

        {/* Müşteri Listesi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[500px] flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Müşteri Bazlı Dağılım</h3>
              <UserCheck size={18} className="text-gray-400" />
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Müşteri</th>
                    <th className="px-6 py-3 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerStats.map((cust, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{cust.name}</td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-700">{cust.value.toLocaleString('tr-TR')} ₺</td>
                    </tr>
                  ))}
                   {customerStats.length === 0 && (
                    <tr><td colSpan={2} className="p-4 text-center text-gray-500">Veri bulunamadı.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </div>

       {/* Personel Listesi */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-800">Personel Satış Performansı</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Personel</th>
                  <th className="px-6 py-3 text-right">Toplam Satış (₺)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {operatorStats.map((op, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{op.name}</td>
                    <td className="px-6 py-3 text-right font-bold text-green-600">{op.value.toLocaleString('tr-TR')} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

    </div>
  );
};

export default AdminMaterialSalesReports;