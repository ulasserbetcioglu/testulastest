import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { Search, Filter, Calendar, Download, Eye } from 'lucide-react';
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
  } | null;
  sale_date: string;
  items: {
    id: string;
    product: {
      name: string;
    };
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
    operator: {
      name: string;
    } | null;
  } | null;
}

const CustomerPaidMaterials: React.FC = () => {
  const [sales, setSales] = useState<PaidMaterialSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<PaidMaterialSale | null>(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);

  useEffect(() => {
    fetchCustomerId();
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchSales();
    }
  }, [selectedMonth, startDate, endDate, customerId]);

  const fetchCustomerId = async () => {
    try {
      const id = await localAuth.getCurrentCustomerId();
      if (!id) throw new Error('Müşteri kaydı bulunamadı');
      setCustomerId(id);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('paid_material_sales')
        .select(`
          id,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi),
          sale_date,
          status,
          total_amount,
          invoice_number,
          invoice_date,
          payment_date,
          notes,
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
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('customer_id', customerId) // Filter by customer ID
        .order('sale_date', { ascending: false });

      // Apply date range filter
      if (startDate && endDate) {
        query = query.gte('sale_date', startDate).lte('sale_date', endDate);
      } else {
        // If no date range is selected, filter by selected month
        const [year, month] = selectedMonth.split('-').map(Number);
        const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];
        query = query.gte('sale_date', startOfMonth).lte('sale_date', endOfMonth);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSales(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setCurrentPage(1);
  };

  const handleViewDetails = (sale: PaidMaterialSale) => {
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

  const exportToExcel = () => {
    const data = filteredSales.map(sale => ({
      'Satış No': sale.id,
      'Tarih': new Date(sale.sale_date).toLocaleDateString('tr-TR'),
      'Müşteri': sale.customer.kisa_isim,
      'Şube': sale.branch?.sube_adi || '-',
      'Ürünler': sale.items.map(item => `${item.product.name} (${item.quantity})`).join(', '),
      'Tutar': sale.total_amount.toLocaleString('tr-TR')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Satışlar');
    XLSX.writeFile(wb, 'satislar.xlsx');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
            Beklemede
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            Onaylandı
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
            Reddedildi
          </span>
        );
      case 'invoiced':
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
            Faturalandı
          </span>
        );
      case 'paid':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
            Ödendi
          </span>
        );
      default:
        return null;
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.customer.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.branch?.sube_adi || '').toLowerCase().includes(searchTerm.toLowerCase());

    const saleDate = new Date(sale.sale_date);
    const matchesDateRange = (!startDate || !endDate ||
      (saleDate >= new Date(startDate) && saleDate <= new Date(endDate)));

    return matchesSearch && matchesDateRange;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSales.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  const renderPageNumbers = () => {
    const pageNumbers = [];

    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-4 py-2 rounded-full ${currentPage === i ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          {i}
        </button>
      );
    }

    return pageNumbers;
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">ÜCRETLİ MALZEME SATIŞLARIM</h2>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
          disabled={!sales || sales.length === 0}
        >
          <Download size={20} />
          Excel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Müşteri veya Şube Ara..."
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
                onChange={(e) => {
                  setSelectedMonth(e.target.value)
                  handleDateRangeChange('', '')
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarih Aralığı
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="w-1/2 p-2 border rounded"
                  value={startDate}
                  onChange={(e) => handleDateRangeChange(e.target.value, endDate)}
                  placeholder="Başlangıç Tarihi"
                />
                <input
                  type="date"
                  className="w-1/2 p-2 border rounded"
                  value={endDate}
                  onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
                  placeholder="Bitiş Tarihi"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Müşteri
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Şube
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tutar
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ziyaret
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Satış kaydı bulunamadı
                  </td>
                </tr>
              ) : (
                currentItems.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(sale.sale_date).toLocaleDateString('tr-TR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.customer.kisa_isim}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.branch?.sube_adi || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {sale.total_amount.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(sale.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      {sale.visit_id ? (
                        <button
                          onClick={() => handleViewVisit(sale.visit_id!)}
                          className="text-blue-600 hover:text-blue-900 flex items-center justify-center mx-auto gap-1"
                          title="Ziyaret detaylarını görüntüle"
                        >
                          <Eye size={18} />
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(sale)}
                        className="text-green-600 hover:text-green-900"
                        title="Satış detaylarını görüntüle"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Toplam {filteredSales.length} kayıt
        </div>
        <div className="space-x-2">
          {renderPageNumbers()}
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
                  <p className="font-medium">{selectedSale.branch?.sube_adi || '-'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Durum</h4>
                  <div className="flex items-center">
                    {getStatusBadge(selectedSale.status)}
                  </div>
                </div>
                {selectedSale.invoice_number && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Fatura No</h4>
                    <p className="font-medium">{selectedSale.invoice_number}</p>
                  </div>
                )}
                {selectedSale.invoice_date && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Fatura Tarihi</h4>
                    <p className="font-medium">{new Date(selectedSale.invoice_date).toLocaleDateString('tr-TR')}</p>
                  </div>
                )}
                {selectedSale.payment_date && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Ödeme Tarihi</h4>
                    <p className="font-medium">{new Date(selectedSale.payment_date).toLocaleDateString('tr-TR')}</p>
                  </div>
                )}
                {selectedSale.visit?.operator?.name && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Operatör</h4>
                    <p className="font-medium">{selectedSale.visit.operator.name}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3 pb-2 border-b">Satış Kalemleri</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Birim Fiyat</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedSale.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.unit_price.toLocaleString('tr-TR')} ₺</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">{item.total_price.toLocaleString('tr-TR')} ₺</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Toplam:</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{selectedSale.total_amount.toLocaleString('tr-TR')} ₺</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedSale.notes && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-3 pb-2 border-b">Notlar</h4>
                  <p className="text-gray-700">{selectedSale.notes}</p>
                </div>
              )}

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

export default CustomerPaidMaterials;