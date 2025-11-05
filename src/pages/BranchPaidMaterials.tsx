import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { Search, Filter, Calendar, Download, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface PaidMaterialUsage {
  id: string;
  sale_date: string;
  items: {
    id: string;
    product: {
      name: string;
    };
    quantity: number;
  }[];
  visit_id?: string;
  visit?: {
    operator: {
      name: string;
    } | null;
  } | null;
}

interface MonthlyUsageReport {
  month: string;
  year: number;
  items: {
    product_name: string;
    total_quantity: number;
  }[];
  visit_count: number;
}

const BranchPaidMaterials: React.FC = () => {
  const [sales, setSales] = useState<PaidMaterialUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [viewMode, setViewMode] = useState<'sales' | 'monthly'>('monthly');
  const [monthlyReports, setMonthlyReports] = useState<MonthlyUsageReport[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<PaidMaterialUsage | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);

  useEffect(() => {
    fetchBranchId();
  }, []);

  useEffect(() => {
    if (branchId) {
      fetchSales();
    }
  }, [branchId, selectedMonth]);

  const fetchBranchId = async () => {
    try {
      const id = await localAuth.getCurrentBranchId();
      if (!id) throw new Error('Şube kaydı bulunamadı');
      setBranchId(id);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching branch ID:', err);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      
      // Parse selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      
      const { data, error: fetchError } = await supabase
        .from('paid_material_sales')
        .select(`
          id,
          sale_date,
          visit_id,
          visit:visit_id (
            id,
            visit_date,
            status,
            visit_type,
            report_number,
            notes,
            operator:operator_id (name)
          ),
          items:paid_material_sale_items (
            id,
            product:product_id!paid_material_sale_items_product_id_fkey (name),
            quantity
          )
        `)
        .eq('branch_id', branchId)
        .eq('status', 'approved')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate);
      
      if (fetchError) throw fetchError;
      setSales(data || []);
      
      // Generate monthly reports
      generateMonthlyReports(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyReports = (salesData: PaidMaterialUsage[]) => {
    if (salesData.length === 0) {
      setMonthlyReports([]);
      return;
    }

    // Group sales by month
    const salesByMonth: Record<string, PaidMaterialUsage[]> = {};
    
    salesData.forEach(sale => {
      const date = new Date(sale.sale_date);
      const monthYear = `${format(date, 'MMMM', { locale: tr })}-${date.getFullYear()}`;
      
      if (!salesByMonth[monthYear]) {
        salesByMonth[monthYear] = [];
      }
      
      salesByMonth[monthYear].push(sale);
    });

    // Generate monthly reports
    const reports: MonthlyUsageReport[] = Object.entries(salesByMonth).map(([monthYear, sales]) => {
      const [month, yearStr] = monthYear.split('-');
      const year = parseInt(yearStr);
      
      // Count unique visits
      const uniqueVisits = new Set(sales.map(s => s.visit_id).filter(Boolean)).size;
      
      // Aggregate items
      const itemsMap: Record<string, {
        product_name: string;
        total_quantity: number;
      }> = {};
      
      sales.forEach(sale => {
        sale.items.forEach(item => {
          if (!item.product) return;
          
          const productName = item.product.name;
          if (!itemsMap[productName]) {
            itemsMap[productName] = {
              product_name: productName,
              total_quantity: 0
            };
          }
          
          itemsMap[productName].total_quantity += item.quantity;
        });
      });
      
      return {
        month,
        year,
        items: Object.values(itemsMap),
        visit_count: uniqueVisits
      };
    });
    
    setMonthlyReports(reports);
  };

  const handleViewDetails = (sale: PaidMaterialUsage) => {
    setSelectedSale(sale);
    setShowDetailsModal(true);
  };

  const handleViewVisit = async (visitId: string) => {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          visit_date,
          status,
          visit_type,
          report_number,
          notes,
          branch:branch_id(sube_adi),
          operator:operator_id(name)
        `)
        .eq('id', visitId)
        .single();

      if (error) throw error;
      setSelectedVisit(data);
      setShowVisitModal(true);
    } catch (err: any) {
      console.error('Ziyaret detayları yüklenirken hata:', err);
    }
  };

  const exportMonthlyReportToExcel = (report: MonthlyUsageReport) => {
    // Prepare data for export
    const reportData = [
      // Header row with report info
      {
        'Dönem': `${report.month} ${report.year}`,
        'Ziyaret Sayısı': report.visit_count
      },
      // Empty row for spacing
      {},
      // Column headers for items
      {
        'Malzeme Adı': 'Malzeme Adı',
        'Miktar': 'Miktar'
      }
    ];

    // Add items to report data
    report.items.forEach(item => {
      reportData.push({
        'Malzeme Adı': item.product_name,
        'Miktar': item.total_quantity
      });
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(reportData, { skipHeader: true });

    // Set column widths
    const columnWidths = [
      { wch: 40 }, // Malzeme Adı
      { wch: 10 }  // Miktar
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Aylık Rapor');

    // Generate filename
    const filename = `Malzeme_Kullanim_${report.month}_${report.year}_Rapor.xlsx`;

    // Export to file
    XLSX.writeFile(workbook, filename);
  };

  // Filter monthly reports
  const filteredMonthlyReports = monthlyReports.filter(report => {
    // Filter by selected month (yyyy-MM format)
    const reportMonth = `${report.year}-${String(new Date(Date.parse(`${report.month} 1, ${report.year}`)).getMonth() + 1).padStart(2, '0')}`;
    const matchesMonth = !selectedMonth || reportMonth === selectedMonth;
    
    return matchesMonth;
  });

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">KULLANILAN MALZEMELER</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'sales' ? 'monthly' : 'sales')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Calendar size={20} />
            {viewMode === 'sales' ? 'Aylık Rapor Görünümü' : 'Detaylı Görünüm'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Malzeme Ara..."
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dönem
              </label>
              <input
                type="month"
                className="w-full p-2 border rounded"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-4 py-2 text-center">Dönem</th>
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
                  <tr key={`${report.month}-${report.year}-${index}`} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">{report.month} {report.year}</td>
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

      {/* Visit Details Modal */}
      {showVisitModal && selectedVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Ziyaret Detayları</h2>
              <button
                onClick={() => {
                  setShowVisitModal(false);
                  setSelectedVisit(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1">ŞUBE</p>
                  <p className="text-lg font-semibold">{selectedVisit.branch?.sube_adi || 'Genel Merkez'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1">TARİH</p>
                  <p className="text-lg font-semibold">{format(new Date(selectedVisit.visit_date), 'dd MMMM yyyy, HH:mm', { locale: tr })}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1">OPERATÖR</p>
                  <p className="text-lg font-semibold">{selectedVisit.operator?.name || 'Atanmadı'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1">ZİYARET TÜRÜ</p>
                  <p className="text-lg font-semibold">{selectedVisit.visit_type || 'Belirtilmemiş'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1">RAPOR NO</p>
                  <p className="text-lg font-semibold font-mono">{selectedVisit.report_number || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1">DURUM</p>
                  <p className="text-lg font-semibold capitalize">
                    {selectedVisit.status === 'completed' ? 'Tamamlandı' : selectedVisit.status === 'planned' ? 'Planlandı' : 'İptal Edildi'}
                  </p>
                </div>
              </div>

              {selectedVisit.notes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-2">NOTLAR</p>
                  <p className="text-sm text-gray-700">{selectedVisit.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sale Details Modal */}
      {showDetailsModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Malzeme Kullanım Detayları</h3>
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
                {selectedSale.visit?.operator?.name && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Operatör</h4>
                    <p className="font-medium">{selectedSale.visit.operator.name}</p>
                  </div>
                )}
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

              <div className="mt-6 flex justify-between gap-2">
                {selectedSale.visit_id && (
                  <button
                    onClick={() => handleViewVisit(selectedSale.visit_id!)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Eye size={18} />
                    Ziyaret Detayları
                  </button>
                )}
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

export default BranchPaidMaterials;