// src/pages/PaidMaterialSales.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, Search, Filter, CheckCircle, Clock, X, AlertTriangle, Eye, Edit2, Trash2, BarChart2, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import SaleDetailsModal from '../components/PaidMaterialSales/SaleDetailsModal';
import MonthlyReportModal from '../components/PaidMaterialSales/MonthlyReportModal';
import { toast } from 'sonner';

// --- ARAYÜZLER (INTERFACES) ---
interface PaidMaterialSale {
  id: string;
  customer_id: string;
  customer: { kisa_isim: string; is_one_time?: boolean; } | null; // YENİ: is_one_time eklendi
  branch_id: string | null;
  branch: { sube_adi: string; is_one_time?: boolean; } | null; // YENİ: is_one_time eklendi
  sale_date: string;
  // DÜZELTME: `items` dizisi, bir satışta hiç ürün olmayabileceği için opsiyonel yapıldı.
  items?: {
    id: string;
    product_id: string;
    product: { 
        name: string;
        price?: number; // Liste fiyatı (varsayılan)
    } | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'invoiced' | 'paid';
  invoice_number?: string;
  invoice_date?: string;
  payment_date?: string;
  notes?: string;
  visit_id?: string;
  visit?: { 
    visit_date: string;
    operator: { name: string; } | null; 
  } | null;
}

interface MonthlyBranchReport {
  branch_id: string | null;
  branch_name: string;
  customer_id: string;
  customer_name: string;
  month: string;
  year: number;
  yearMonth: string;
  visit_count: number;
  items: {
    product_id: string;
    product_name: string;
    total_quantity: number;
    unit_price: number;
    total_price: number;
  }[];
  total_amount: number;
  operator_name?: string;
}

// --- BİLEŞEN (COMPONENT) ---
const PaidMaterialSales: React.FC = () => {
  // --- STATE TANIMLAMALARI ---
  const [sales, setSales] = useState<PaidMaterialSale[]>([]);
  const [customers, setCustomers] = useState<{ id: string, kisa_isim: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string, sube_adi: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [monthlyReports, setMonthlyReports] = useState<MonthlyBranchReport[]>([]);
  const [viewMode, setViewMode] = useState<'sales' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoApprove, setAutoApprove] = useState(true);
  const [selectedSale, setSelectedSale] = useState<PaidMaterialSale | null>(null);
  const [selectedMonthlyReport, setSelectedMonthlyReport] = useState<MonthlyBranchReport | null>(null);

  // --- MANTIK ve FONKSİYONLAR ---

  const generateMonthlyReports = useCallback((salesData: PaidMaterialSale[]) => {
    if (!salesData || salesData.length === 0) {
      setMonthlyReports([]);
      return;
    }
    const reportsMap = new Map<string, MonthlyBranchReport>();
    salesData.forEach(sale => {
      if (!sale || !sale.customer) return;

      const reportDate = new Date(sale.visit?.visit_date || sale.sale_date);
      
      const year = reportDate.getFullYear();
      const monthIndex = reportDate.getMonth();
      const monthName = format(reportDate, 'MMMM', { locale: tr });
      const reportKey = sale.branch_id ? `branch-${sale.branch_id}-${year}-${monthIndex}` : `direct-${sale.customer_id}-${year}-${monthIndex}`;
      
      let report = reportsMap.get(reportKey);
      if (!report) {
        report = {
          branch_id: sale.branch_id,
          branch_name: sale.branch ? sale.branch.sube_adi : `${sale.customer.kisa_isim} (Direkt)`,
          customer_id: sale.customer_id,
          customer_name: sale.customer.kisa_isim,
          month: monthName,
          year: year,
          yearMonth: format(reportDate, 'yyyy-MM'),
          visit_count: 0,
          items: [],
          total_amount: 0,
          operator_name: undefined,
        };
      }
      report.total_amount += sale.total_amount;
      if (!report.operator_name && sale.visit?.operator?.name) {
          report.operator_name = sale.visit.operator.name;
      }
      // DÜZELTME: sale.items'ın varlığını kontrol et
      (sale.items || []).forEach(item => {
        if (!item?.product) return;
        let existingItem = report!.items.find(i => i.product_id === item.product_id);
        if (existingItem) {
          existingItem.total_quantity += item.quantity;
          existingItem.total_price += item.total_price;
        } else {
          report!.items.push({ product_id: item.product_id, product_name: item.product.name, total_quantity: item.quantity, unit_price: item.unit_price, total_price: item.total_price });
        }
      });
      reportsMap.set(reportKey, report);
    });
    const visitMap = new Map<string, Set<string>>();
    salesData.forEach(sale => {
        if (sale?.visit_id) {
            const reportDate = new Date(sale.visit?.visit_date || sale.sale_date);
            const key = sale.branch_id ? `branch-${sale.branch_id}-${reportDate.getFullYear()}-${reportDate.getMonth()}` : `direct-${sale.customer_id}-${reportDate.getFullYear()}-${reportDate.getMonth()}`;
            if (!visitMap.has(key)) visitMap.set(key, new Set());
            visitMap.get(key)!.add(sale.visit_id);
        }
    });
    reportsMap.forEach((report, key) => { report.visit_count = visitMap.get(key)?.size || 0; });
    setMonthlyReports(Array.from(reportsMap.values()));
  }, []);

  const fetchAndProcessData = useCallback(async (currentMonth: string) => {
    setLoading(true);
    setError(null);
    try {
        const [year, month] = currentMonth.split('-').map(Number);
        const startDate = new Date(year, month - 2, 1);
        const endDate = new Date(year, month, 0);
        endDate.setHours(23, 59, 59, 999);

        const { data: salesData, error: salesError } = await supabase.from('paid_material_sales')
            .select(`id, customer_id, customer:customer_id(kisa_isim, is_one_time), branch_id, branch:branch_id(sube_adi, is_one_time), sale_date, status, total_amount, visit_id, visit:visit_id(visit_date, operator:operator_id(name)), items:paid_material_sale_items(id, product_id, product:product_id(name, price), quantity, unit_price, total_price)`)
            .gte('sale_date', startDate.toISOString())
            .lte('sale_date', endDate.toISOString())
            .order('sale_date', { ascending: false });

        if (salesError) throw salesError;
        
        const safeSalesData = salesData || [];
        const customerIds = [...new Set(safeSalesData.map(s => s.customer_id).filter(Boolean))];
        
        let customerPriceMap = new Map<string, Map<string, number>>();
        if (customerIds.length > 0) {
            const { data: priceData, error: priceError } = await supabase.from('customer_product_prices').select('customer_id, product_id, price').in('customer_id', customerIds);
            if (priceError) throw priceError;

            priceData.forEach(p => {
                if (!customerPriceMap.has(p.customer_id)) {
                    customerPriceMap.set(p.customer_id, new Map());
                }
                customerPriceMap.get(p.customer_id)!.set(p.product_id, p.price);
            });
        }

        const processedSales = safeSalesData.map(sale => {
            if (!sale) return null;
            let newTotalAmount = 0;
            const newItems = (sale.items || []).map(item => {
                if (!item || !item.product) return item;
                const customerPrices = customerPriceMap.get(sale.customer_id);
                const specialPrice = customerPrices?.get(item.product_id);
                const defaultPrice = item.product?.price ?? item.unit_price;
                const unit_price = specialPrice !== undefined ? specialPrice : defaultPrice;
                const total_price = item.quantity * unit_price;
                newTotalAmount += total_price;
                return { ...item, unit_price, total_price };
            });
            return { ...sale, items: newItems, total_amount: newTotalAmount };
        }).filter(Boolean) as PaidMaterialSale[];

        if (autoApprove) {
            const pendingSaleIds = processedSales.filter(s => s.status === 'pending').map(s => s.id);
            if (pendingSaleIds.length > 0) {
                const { error: updateError } = await supabase.from('paid_material_sales').update({ status: 'approved' }).in('id', pendingSaleIds);
                if (updateError) throw updateError;
                processedSales.forEach(s => { if (pendingSaleIds.includes(s.id)) s.status = 'approved'; });
                toast.success(`${pendingSaleIds.length} bekleyen satış otomatik olarak onaylandı.`);
            }
        }
        
        setSales(processedSales);
        generateMonthlyReports(processedSales);

    } catch (err: any) {
        setError(err.message);
        console.error('Error fetching data:', err);
        toast.error('Veri çekilirken bir hata oluştu.');
    } finally {
        setLoading(false);
    }
}, [autoApprove, generateMonthlyReports]);

  // --- useEffect HOOKS ---

  useEffect(() => {
    const fetchInitialStaticData = async () => {
        try {
            const [customersRes, branchesRes] = await Promise.all([
                supabase.from('customers').select('id, kisa_isim').order('kisa_isim'),
                supabase.from('branches').select('id, sube_adi').order('sube_adi')
            ]);
            if (customersRes.error) throw customersRes.error;
            if (branchesRes.error) throw branchesRes.error;
            setCustomers(customersRes.data || []);
            setBranches(branchesRes.data || []);
        } catch (err: any) {
            setError(err.message);
            toast.error("Müşteri veya şube listesi yüklenemedi.");
        }
    };
    fetchInitialStaticData();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      fetchAndProcessData(selectedMonth);
    }
  }, [selectedMonth, fetchAndProcessData]);

  useEffect(() => {
    const handleFocus = () => {
        toast.info("Veriler güncelleniyor...");
        if (selectedMonth) {
            fetchAndProcessData(selectedMonth);
        }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
        window.removeEventListener('focus', handleFocus);
    };
  }, [selectedMonth, fetchAndProcessData]);


  const filteredSales = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStartDate = new Date(year, month - 1, 1);
    const monthEndDate = new Date(year, month, 0);

    return sales.filter(sale => {
        const saleDate = new Date(sale.sale_date);
        const isInMonth = saleDate >= monthStartDate && saleDate <= monthEndDate;

        return isInMonth &&
            (!selectedCustomer || sale.customer_id === selectedCustomer) &&
            (!selectedBranch || sale.branch_id === selectedBranch) &&
            (!selectedStatus || sale.status === selectedStatus) &&
            (searchTerm === '' ||
            (sale.customer?.kisa_isim || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sale.branch?.sube_adi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sale.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sale.visit?.operator?.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    });
}, [sales, searchTerm, selectedCustomer, selectedBranch, selectedStatus, selectedMonth]);


  const filteredMonthlyReports = useMemo(() => monthlyReports.filter(report =>
    (!selectedCustomer || report.customer_id === selectedCustomer) &&
    (!selectedBranch || report.branch_id === selectedBranch) &&
    (report.yearMonth === selectedMonth) && 
    (searchTerm === '' ||
      report.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.operator_name || '').toLowerCase().includes(searchTerm.toLowerCase()))
  ), [monthlyReports, searchTerm, selectedCustomer, selectedBranch, selectedMonth]);

  const handleUpdateStatus = useCallback(async (saleId: string, newStatus: PaidMaterialSale['status']) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'invoiced') updates.invoice_date = new Date().toISOString();
      if (newStatus === 'paid') updates.payment_date = new Date().toISOString();
      const { error } = await supabase.from('paid_material_sales').update(updates).eq('id', saleId);
      if (error) throw error;
      setSales(prevSales => prevSales.map(sale => sale.id === saleId ? { ...sale, ...updates } : sale));
      setSelectedSale(null);
      toast.success("Satış durumu başarıyla güncellendi.");
    } catch (err: any) {
      console.error('Error updating status:', err);
      toast.error('Durum güncellenirken bir hata oluştu.');
    }
  }, []);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center">
            Beklemede
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center">
            Onaylandı
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs flex items-center">
            Reddedildi
          </span>
        );
      case 'invoiced':
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center">
            Faturalandı
          </span>
        );
      case 'paid':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
            Ödendi
          </span>
        );
      default:
        return null;
    }
  };

  const exportAllMonthlyReportsToExcel = () => {
    const data = filteredMonthlyReports.map(report => {
      const baseData = {
        'Müşteri': report.customer_name,
        'Şube': report.branch_name,
        'Dönem': `${report.month} ${report.year}`,
        'Ziyaret Sayısı': report.visit_count,
        'Operatör': report.operator_name || 'Belirtilmemiş',
        'Toplam Tutar': report.total_amount
      };
      report.items.forEach(item => {
        baseData[`${item.product_name} Miktar`] = item.total_quantity;
        baseData[`${item.product_name} Birim Fiyat`] = item.unit_price;
        baseData[`${item.product_name} Toplam`] = item.total_price;
      });
      return baseData;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Aylık Raporlar');
    XLSX.writeFile(wb, `Tum_Aylik_Malzeme_Raporlari_${selectedMonth}.xlsx`);
    toast.success("Tüm aylık raporlar Excel'e aktarıldı!");
  };

  const exportMonthlyReportToExcel = (report: MonthlyBranchReport) => {
    // Prepare data for export
    const reportData = [
      // Header row with report info
      { 
        'Müşteri': report.customer_name, 
        'Şube': report.branch_name, 
        'Dönem': `${report.month} ${report.year}`,
        'Ziyaret Sayısı': report.visit_count,
        'Operatör': report.operator_name || 'Belirtilmemiş',
        'Toplam Tutar': report.total_amount.toLocaleString('tr-TR') + ' ₺'
      },
      {}, // Boş satır
      { 
        'Malzeme Kodu': 'Malzeme Kodu', 
        'Malzeme Adı': 'Malzeme Adı', 
        'Miktar': 'Miktar', 
        'Birim Fiyat': 'Birim Fiyat (₺)', 
        'Toplam': 'Toplam (₺)' 
      }
    ];

    // Add items to report data
    (report.items || []).forEach(item => { // items'ın null olabileceği kontrol edildi
      reportData.push({
        'Malzeme Kodu': item.product_id,
        'Malzeme Adı': item.product_name,
        'Miktar': item.total_quantity,
        'Birim Fiyat': item.unit_price.toLocaleString('tr-TR'),
        'Toplam': item.total_price.toLocaleString('tr-TR')
      });
    });

    // Toplam satırını ekle
    reportData.push(
      {},
      {
        'Malzeme Kodu': '', 'Malzeme Adı': '', 'Miktar': '',
        'Birim Fiyat': 'GENEL TOPLAM:',
        'Toplam': report.total_amount.toLocaleString('tr-TR')
      }
    );

    const worksheet = XLSX.utils.json_to_sheet(reportData, { skipHeader: true });
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Aylık Rapor');
    const filename = `${report.branch_name.replace(/\s+/g, '_')}_${report.month}_${report.year}_Rapor.xlsx`;
    XLSX.writeFile(workbook, filename);
    toast.success("Aylık rapor Excel'e aktarıldı!");
  };

  // --- RENDER ---
  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Hata: {error}</div>;

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">ÜCRETLİ MALZEME SATIŞLARI</h2>
        <div className="flex gap-2">
           <button onClick={() => setViewMode(viewMode === 'sales' ? 'monthly' : 'sales')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2">
             <Calendar size={20} />
             {viewMode === 'sales' ? 'Aylık Rapor Görünümü' : 'Satış Görünümü'}
           </button>
           <button onClick={exportAllMonthlyReportsToExcel} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2">
             <Download size={20} />
             Rapor İndir
           </button>
         </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input type="text" placeholder={viewMode === 'sales' ? "Müşteri, Şube, Operatör veya Fatura No Ara" : "Müşteri, Şube veya Operatör Ara"} className="w-full border rounded-lg pl-10 pr-4 py-2" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
          <input type="month" className="border rounded p-2" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <Filter className="w-5 h-5" />
            Detaylı Filtre
          </button>
        </div>
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
            <select className="border rounded p-2" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
              <option value="">Müşteri (Tümü)</option>
              {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.kisa_isim}</option>)}
            </select>
            <select className="border rounded p-2" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              <option value="">Şube (Tümü)</option>
              {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.sube_adi}</option>)}
            </select>
            {viewMode === 'sales' && (
              <select className="border rounded p-2" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="">Durum (Tümü)</option>
                <option value="pending">Beklemede</option><option value="approved">Onaylandı</option><option value="rejected">Reddedildi</option><option value="invoiced">Faturalandı</option><option value="paid">Ödendi</option>
              </select>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {viewMode === 'sales' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-2 text-left">Satış No</th><th className="px-4 py-2 text-left">Satış Tarihi</th><th className="px-4 py-2 text-left">Ziyaret Tarihi</th><th className="px-4 py-2 text-left">Müşteri</th><th className="px-4 py-2 text-left">Şube</th><th className="px-4 py-2 text-left">Operatör</th><th className="px-4 py-2 text-center">Ürün Sayısı</th><th className="px-4 py-2 text-right">Tutar</th><th className="px-4 py-2 text-center">Durum</th><th className="px-4 py-2 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-4 text-center text-gray-500">Filtrelerle eşleşen satış kaydı bulunamadı.</td></tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{sale.id.substring(0, 8)}...</td>
                      <td className="px-4 py-3">{format(new Date(sale.sale_date), 'dd.MM.yyyy')}</td>
                      <td className="px-4 py-3">
                        {sale.visit?.visit_date ? format(new Date(sale.visit.visit_date), 'dd.MM.yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {sale.customer?.kisa_isim || '-'}
                        {sale.customer?.is_one_time && <span className="ml-1 px-1 py-0.5 bg-gray-200 text-gray-700 rounded-full text-[8px]">(Tek Seferlik)</span>}
                      </td>
                      <td className="px-4 py-3">
                        {sale.branch?.sube_adi || '-'}
                        {sale.branch?.is_one_time && <span className="ml-1 px-1 py-0.5 bg-gray-200 text-gray-700 rounded-full text-[8px]">(Tek Seferlik)</span>}
                      </td>
                      <td className="px-4 py-3">{sale.visit?.operator?.name || '-'}</td>
                      <td className="px-4 py-3 text-center">{(sale.items || []).length}</td>
                      <td className="px-4 py-3 text-right">{sale.total_amount.toLocaleString('tr-TR')} ₺</td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(sale.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => setSelectedSale(sale)} className="text-blue-600 hover:text-blue-800" title="Görüntüle"><Eye className="w-4 h-4" /></button>
                          <button className="text-gray-600 hover:text-gray-800" title="Düzenle"><Edit2 className="w-4 h-4" /></button>
                          <button className="text-red-600 hover:text-red-800" title="Sil"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-2 text-left">Müşteri</th><th className="px-4 py-2 text-left">Şube</th><th className="px-4 py-2 text-left">Operatör</th><th className="px-4 py-2 text-center">Dönem</th><th className="px-4 py-2 text-center">Ziyaret Sayısı</th><th className="px-4 py-2 text-center">Malzeme Çeşidi</th><th className="px-4 py-2 text-right">Toplam Tutar</th><th className="px-4 py-2 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthlyReports.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-4 text-center text-gray-500">Aylık rapor bulunamadı.</td></tr>
                ) : (
                  filteredMonthlyReports.map((report) => (
                    <tr key={`${report.branch_id || 'direct'}-${report.month}-${report.year}`} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{report.customer_name}</td>
                      <td className="px-4 py-3">{report.branch_name}</td>
                      <td className="px-4 py-3">{report.operator_name || '-'}</td>
                      <td className="px-4 py-3 text-center">{report.month} {report.year}</td>
                      <td className="px-4 py-3 text-center">{report.visit_count}</td>
                      <td className="px-4 py-3 text-center">{report.items.length}</td>
                      <td className="px-4 py-3 text-right">{report.total_amount.toLocaleString('tr-TR')} ₺</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => setSelectedMonthlyReport(report)} className="text-blue-600 hover:text-blue-800" title="Görüntüle"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => exportMonthlyReportToExcel(report)} className="text-green-600 hover:text-green-800" title="Excel'e Aktar"><FileText className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSale && <SaleDetailsModal sale={selectedSale} isOpen={!!selectedSale} onClose={() => setSelectedSale(null)} onStatusChange={handleUpdateStatus} />}
      {selectedMonthlyReport && <MonthlyReportModal report={selectedMonthlyReport} isOpen={!!selectedMonthlyReport} onClose={() => setSelectedMonthlyReport(null)} />}
    </div>
  );
};

export default PaidMaterialSales;
