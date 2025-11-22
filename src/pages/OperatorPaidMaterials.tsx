import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { Search, Filter, Calendar, Eye, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface PaidMaterialSale {
  id: string;
  customer: {
    kisa_isim: string;
  };
  branch: {
    sube_adi: string;
  };
  sale_date: string;
  items: {
    id: string;
    product: {
      name: string;
    };
    quantity: number;
  }[];
  status: 'pending' | 'approved' | 'rejected' | 'invoiced' | 'paid';
  visit_id?: string;
}

interface MonthlyReport {
  branch_id: string;
  branch_name: string;
  customer_id: string;
  customer_name: string;
  month: string;
  year: number;
  visit_count: number;
  items: {
    product_id: string;
    product_name: string;
    total_quantity: number;
  }[];
}

const OperatorPaidMaterials: React.FC = () => {
  const [sales, setSales] = useState<PaidMaterialSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [viewMode, setViewMode] = useState<'sales' | 'monthly'>('monthly');
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<PaidMaterialSale | null>(null);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [autoApprove, setAutoApprove] = useState(true);

  useEffect(() => {
    fetchOperatorId();
  }, []);

  useEffect(() => {
    if (operatorId) {
      fetchSales();
    }
  }, [operatorId]);

  const fetchOperatorId = async () => {
    try {
      const opId = await localAuth.getCurrentOperatorId();
      if (!opId) throw new Error('Kullanıcı bulunamadı');

      const { data, error } = await supabase
        .from('operators')
        .select('id')
        .eq('id', opId)
        .single();

      if (error) throw error;
      setOperatorId(data.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      
      if (!operatorId) {
        throw new Error('Operatör ID bulunamadı');
      }
      
      // First get visits for this operator
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('id')
        .eq('operator_id', operatorId);
        
      if (visitsError) throw visitsError;
      
      if (!visits || visits.length === 0) {
        setSales([]);
        setMonthlyReports([]);
        setLoading(false);
        return;
      }
      
      const visitIds = visits.map(v => v.id);
      
      // Then fetch sales related to these visits
      const { data, error } = await supabase
        .from('paid_material_sales')
        .select(`
          id,
          customer_id,
          customer:customer_id (kisa_isim),
          branch_id,
          branch:branch_id (sube_adi),
          sale_date,
          status,
          visit_id,
          visit:visit_id (
            operator_id
          ),
          items:paid_material_sale_items (
            id,
            product_id,
            product:product_id (name),
            quantity
          )
        `)
        .in('visit_id', visitIds)
        .order('sale_date', { ascending: false });
      
      if (error) throw error;
      
      // Auto-approve pending sales if enabled
      if (autoApprove) {
        const pendingSales = (data || []).filter(sale => sale.status === 'pending');
        
        for (const sale of pendingSales) {
          await supabase
            .from('paid_material_sales')
            .update({ status: 'approved' })
            .eq('id', sale.id);
            
          // Update the status in the local data
          sale.status = 'approved';
        }
      }
      
      setSales(data || []);
      
      // Generate monthly reports
      generateMonthlyReports(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate monthly reports for each branch
  const generateMonthlyReports = (salesData: PaidMaterialSale[]) => {
    const reports: MonthlyReport[] = [];
    const branchMonthMap: Record<string, Record<string, boolean>> = {};

    // Group sales by branch and month
    salesData.forEach(sale => {
      const date = new Date(sale.sale_date);
      const month = format(date, 'MMMM', { locale: tr });
      const year = date.getFullYear();
      const monthYear = `${month}-${year}`;
      const branchKey = `${sale.branch_id}-${monthYear}`;

      // Check if we already have a report for this branch and month
      if (!branchMonthMap[branchKey]) {
        branchMonthMap[branchKey] = { processed: true };

        // Find all sales for this branch in this month
        const branchSales = salesData.filter(s => {
          const sDate = new Date(s.sale_date);
          return s.branch_id === sale.branch_id && 
                 sDate.getMonth() === date.getMonth() && 
                 sDate.getFullYear() === date.getFullYear();
        });

        // Count unique visits
        const uniqueVisits = new Set(branchSales.map(s => s.visit_id).filter(Boolean)).size;

        // Aggregate items
        const itemsMap: Record<string, {
          product_id: string;
          product_name: string;
          total_quantity: number;
        }> = {};

        branchSales.forEach(s => {
          s.items.forEach(item => {
            if (!itemsMap[item.product_id]) {
              itemsMap[item.product_id] = {
                product_id: item.product_id,
                product_name: item.product.name,
                total_quantity: 0
              };
            }
            itemsMap[item.product_id].total_quantity += item.quantity;
          });
        });

        // Create report
        reports.push({
          branch_id: sale.branch_id,
          branch_name: sale.branch.sube_adi,
          customer_id: sale.customer_id,
          customer_name: sale.customer.kisa_isim,
          month,
          year,
          visit_count: uniqueVisits,
          items: Object.values(itemsMap)
        });
      }
    });

    setMonthlyReports(reports);
  };

  const handleViewDetails = (sale: PaidMaterialSale) => {
    setSelectedSale(sale);
    setShowDetailsModal(true);
  };

  const exportMonthlyReportToExcel = (report: MonthlyReport) => {
    // Prepare data for export
    const reportData = [
      // Header row with report info
      {
        'Müşteri': report.customer_name,
        'Şube': report.branch_name,
        'Dönem': `${report.month} ${report.year}`,
        'Ziyaret Sayısı': report.visit_count
      },
      // Empty row for spacing
      {},
      // Column headers for items
      {
        'Malzeme Adı': 'Malzeme Adı',
        'Toplam Miktar': 'Toplam Miktar'
      }
    ];

    // Add items to report data
    report.items.forEach(item => {
      reportData.push({
        'Malzeme Adı': item.product_name,
        'Toplam Miktar': item.total_quantity
      });
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(reportData, { skipHeader: true });

    // Set column widths
    const columnWidths = [
      { wch: 40 }, // Malzeme Adı
      { wch: 15 }  // Toplam Miktar
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Aylık Rapor');

    // Generate filename
    const filename = `${report.branch_name.replace(/\s+/g, '_')}_${report.month}_${report.year}_Rapor.xlsx`;

    // Export to file
    XLSX.writeFile(workbook, filename);
  };

  // Filter monthly reports
  const filteredMonthlyReports = monthlyReports.filter(report => {
    const matchesSearch = 
      report.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.branch_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by selected month (yyyy-MM format)
    const reportMonth = `${report.year}-${String(new Date(Date.parse(`${report.month} 1, ${report.year}`)).getMonth() + 1).padStart(2, '0')}`;
    const matchesMonth = !selectedMonth || reportMonth === selectedMonth;
    
    return matchesSearch && matchesMonth;
  });

  // Filter sales
  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.customer.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.branch.sube_adi.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center">
            Onaylandı
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

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">ÜCRETLİ MALZEME SATIŞLARIM</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'sales' ? 'monthly' : 'sales')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {viewMode === 'sales' ? 'Aylık Rapor Görünümü' : 'Satış Görünümü'}
          </button>
        </div>
      </div>

      {/* Auto-approve toggle */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoApprove"
            checked={autoApprove}
            onChange={(e) => setAutoApprove(e.target.checked)}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="autoApprove" className="ml-2 block text-sm text-gray-700">
            Yeni satışları otomatik olarak onayla
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Müşteri veya Şube"
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
            {viewMode === 'monthly' && (
              <input
                type="month"
                className="border rounded p-2"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            )}

            <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 md:col-span-1">
              Filtrele
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-2 text-left">Dönem</th>
                <th className="px-4 py-2 text-center">Ziyaret Sayısı</th>
                <th className="px-4 py-2 text-center">Malzeme Çeşidi</th>
                <th className="px-4 py-2 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredMonthlyReports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-gray-500">
                    Aylık rapor bulunamadı
                  </td>
                </tr>
              ) : (
                filteredMonthlyReports.map((report, index) => (
                  <tr key={`${report.branch_id}-${report.month}-${report.year}-${index}`} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{report.month} {report.year}</td>
                    <td className="px-4 py-3 text-center">{report.visit_count}</td>
                    <td className="px-4 py-3 text-center">{report.items.length}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => exportMonthlyReportToExcel(report)}
                          className="text-green-600 hover:text-green-800"
                          title="Excel'e Aktar"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Details Modal */}
      {showDetailsModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Satış Detayları</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSale(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Tarih</h4>
                  <p className="font-medium">{format(new Date(selectedSale.sale_date), 'dd MMMM yyyy', { locale: tr })}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Müşteri</h4>
                  <p className="font-medium">{selectedSale.customer.kisa_isim}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Şube</h4>
                  <p className="font-medium">{selectedSale.branch.sube_adi}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Durum</h4>
                  <div className="flex items-center">
                    {getStatusBadge(selectedSale.status)}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3 pb-2 border-b">Kullanılan Malzemeler</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Malzeme</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedSale.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product?.name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-center">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedSale(null);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorPaidMaterials;