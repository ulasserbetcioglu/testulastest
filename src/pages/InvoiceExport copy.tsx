import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Download, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  exportInvoicesToExcel,
  generateInvoicesFromSales,
  generateInvoicesFromVisits,
} from '../utils/invoiceExport';
import { useNavigate } from 'react-router-dom';

const InvoiceExport: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [exportType, setExportType] = useState<'visits' | 'materials'>('materials');
  const [selectAll, setSelectAll] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [paidProducts, setPaidProducts] = useState<any[]>([]);
  const [combineInvoices, setCombineInvoices] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchCustomers();
      fetchPaidProducts();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isAdminUser = user?.email === 'admin@ilaclamatik.com';
      setIsAdmin(isAdminUser);
      
      if (!isAdminUser) {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error checking admin access:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id, 
          kisa_isim,
          cari_isim,
          tax_office,
          tax_number,
          pricing:customer_pricing(id, monthly_price, per_visit_price)
        `)
        .order('kisa_isim');
        
      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaidProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('paid_products')
        .select('id, name, price, unit_type, vat_rate')
        .eq('is_active', true);

      if (error) throw error;
      setPaidProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching paid products:', err);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomers(prev => [...prev, customerId]);
    } else {
      setSelectedCustomers(prev => prev.filter(id => id !== customerId));
      setSelectAll(false);
    }
  };

  const generatePreview = async () => {
    if (selectedCustomers.length === 0) {
      alert('Lütfen en az bir müşteri seçin');
      return;
    }

    try {
      setIsGenerating(true);
      
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      
      if (exportType === 'materials') {
        const { data: salesData, error: salesError } = await supabase
          .from('paid_material_sales')
          .select(`
            id,
            customer_id,
            customer:customer_id (id, kisa_isim, cari_isim),
            branch_id,
            branch:branch_id (id, sube_adi, pricing:branch_pricing(monthly_price, per_visit_price)),
            sale_date,
            status,
            total_amount,
            items:paid_material_sale_items (
              id,
              product:product_id (id, name, vat_rate),
              quantity,
              unit_price,
              total_price
            )
          `)
          .in('customer_id', selectedCustomers)
          .in('status', ['approved', 'invoiced', 'paid'])
          .gte('sale_date', startDate)
          .lte('sale_date', endDate);
          
        if (salesError) throw salesError;
        
        const enhancedSalesData = salesData?.map(sale => {
          const enhancedItems = sale.items?.map(item => ({
            ...item,
            product: {
              ...item.product,
              vat_rate: item.product.vat_rate || 20
            }
          }));
          
          return {
            ...sale,
            items: enhancedItems
          };
        });
        
        let invoices = generateInvoicesFromSales(enhancedSalesData || [], customers);
        
        if (combineInvoices) {
          invoices = combineCustomerInvoices(invoices);
        }
        
        setPreviewData(invoices);
      } else {
        // ✅ DÜZELTME: 'report_number' alanı sorguya eklendi.
        const { data: visitsData, error: visitsError } = await supabase
          .from('visits')
          .select(`
            id,
            customer_id,
            customer:customer_id (
              id, 
              kisa_isim, 
              cari_isim,
              pricing:customer_pricing(monthly_price, per_visit_price)
            ),
            branch_id,
            branch:branch_id (
              id, 
              sube_adi,
              pricing:branch_pricing(monthly_price, per_visit_price)
            ),
            visit_date,
            status,
            report_number
          `)
          .in('customer_id', selectedCustomers)
          .eq('status', 'completed')
          .gte('visit_date', startDate)
          .lte('visit_date', endDate);
          
        if (visitsError) throw visitsError;
        
        let invoices = generateInvoicesFromVisits(visitsData || [], customers);
        
        if (combineInvoices) {
          invoices = combineCustomerInvoices(invoices);
        }
        
        setPreviewData(invoices);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error generating preview:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const combineCustomerInvoices = (invoices: any[]) => {
    const combinedInvoices: any = {};
    
    invoices.forEach(invoice => {
      if (!combinedInvoices[invoice.customerName]) {
        combinedInvoices[invoice.customerName] = {
          ...invoice,
          items: [],
          branchName: 'Tüm Şubeler'
        };
      }
      
      combinedInvoices[invoice.customerName].items = [
        ...combinedInvoices[invoice.customerName].items,
        ...invoice.items.map((item: any) => ({
          ...item,
          explanation: item.explanation + (invoice.branchName ? ` (${invoice.branchName})` : '')
        }))
      ];
    });
    
    return Object.values(combinedInvoices);
  };

  const handleExport = () => {
    if (previewData.length === 0) {
      alert('Dışa aktarılacak veri bulunamadı');
      return;
    }

    const [year, month] = selectedMonth.split('-');
    const monthName = format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM', { locale: tr });
    
    const filename = `Faturalar_${monthName}_${year}.xlsx`;
    exportInvoicesToExcel(previewData, filename);
  };

  const filteredCustomers = customers.filter(customer => 
    customer.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.cari_isim && customer.cari_isim.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;
  if (!isAdmin) return <div>Bu sayfaya erişim yetkiniz bulunmamaktadır.</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">FATURA DIŞA AKTARMA</h1>
        <div className="flex gap-2">
          {previewData.length > 0 && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download size={20} />
              Excel'e Aktar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Müşteri Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Filter className="w-5 h-5" />
            Filtrele
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dönem</label>
              <input
                type="month"
                className="w-full p-2 border rounded"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Veri Kaynağı</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="exportType"
                    checked={exportType === 'materials'}
                    onChange={() => setExportType('materials')}
                    className="mr-2"
                  />
                  <span>Ücretli Malzemeler</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="exportType"
                    checked={exportType === 'visits'}
                    onChange={() => setExportType('visits')}
                    className="mr-2"
                  />
                  <span>Ziyaretler</span>
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={combineInvoices}
                  onChange={(e) => setCombineInvoices(e.target.checked)}
                  className="mr-2"
                />
                <span className="font-medium">Müşteri şubelerini tek faturada birleştir</span>
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Bu seçenek, aynı müşteriye ait tüm şubelerin faturalarını tek bir faturada birleştirir.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="mr-2"
            />
            <span className="font-medium">Tüm Müşterileri Seç</span>
          </div>
          <button
            onClick={generatePreview}
            disabled={selectedCustomers.length === 0 || isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? <RefreshCw size={20} className="animate-spin" /> : <Calendar size={20} />}
            {isGenerating ? 'Oluşturuluyor...' : 'Önizleme Oluştur'}
          </button>
        </div>
        <div className="overflow-y-auto max-h-[400px]">
          <table className="min-w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="w-10 px-3 py-3 text-left"><span className="sr-only">Seç</span></th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kısa İsim</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cari İsim</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className={selectedCustomers.includes(customer.id) ? 'bg-blue-50' : ''}>
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={(e) => handleSelectCustomer(customer.id, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.kisa_isim}</td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{customer.cari_isim || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {previewData.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Fatura Önizleme</h2>
            <p className="text-sm text-gray-500">
              Toplam {previewData.length} fatura, {previewData.reduce((sum, invoice) => sum + invoice.items.length, 0)} kalem
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri Ünvanı</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şube</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fatura Tarihi</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kalem Sayısı</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((invoice, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.customerName}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.branchName || '-'}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.invoiceDate}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.items.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceExport;
