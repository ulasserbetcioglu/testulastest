import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { Search, Filter, Calendar, Download, Eye, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  // Supabase'den 'items' olarak alias (takma ad) ile çekeceğiz
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
  }, [selectedMonth, startDate, endDate, customerId, currentPage]); // Sayfa değiştiğinde de veriyi filtrele

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
      setError(null);
      if (!customerId) return; // Müşteri ID'si yoksa sorgu atma

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
            quantity,
            unit_price,
            total_price,
            product:paid_products ( name )
          )
        `)
        .eq('customer_id', customerId)
        .order('sale_date', { ascending: false });

      // Apply date range filter
      if (startDate && endDate) {
        query = query.gte('sale_date', startDate).lte('sale_date', endDate);
      } else {
        const [year, month] = selectedMonth.split('-').map(Number);
        const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];
        query = query.gte('sale_date', startOfMonth).lte('sale_date', endOfMonth);
      }
      
      // Arama terimini filtrele
      if (searchTerm) {
         query = query.or(
           `branch_id.sube_adi.ilike.%${searchTerm}%`,
           `items.paid_products.name.ilike.%${searchTerm}%`
         );
      }

      const { data: salesData, error: salesError } = await query;

      if (salesError) throw salesError;

      // Artık iç içe Promise.all'a gerek yok. Veri tek seferde geldi.
      // Sadece Supabase'den gelen 'null' ürünleri ayıklayalım (opsiyonel)
      const cleanedData = salesData.map(sale => ({
        ...sale,
        items: (sale.items || []).map(item => ({
          ...item,
          product: item.product || { name: 'Bilinmeyen Ürün' }
        }))
      }));

      setSales(cleanedData);

    } catch (err: any) {
      setError(err.message || 'Satışlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  
  // Arama gecikmesi (debounce) için useEffect
  useEffect(() => {
    const handler = setTimeout(() => {
      if(customerId) {
        setCurrentPage(1); // Arama yapıldığında 1. sayfaya dön
        fetchSales();
      }
    }, 500); // 500ms gecikme

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]); // Sadece searchTerm değiştiğinde tetiklenir


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
    // Excel'e tüm filtrelenmiş veriyi aktar, sadece mevcut sayfayı değil
    const data = filteredSales.map(sale => ({
      'Satış ID': sale.id,
      'Tarih': format(new Date(sale.sale_date), 'dd.MM.yyyy', { locale: tr }),
      'Müşteri': sale.customer.kisa_isim,
      'Şube': sale.branch?.sube_adi || '-',
      'Ürünler': sale.items.map(item => `${item.product.name} (${item.quantity} adet)`).join('\n'), // \n ile alt alta
      'Tutar (₺)': sale.total_amount,
      'Durum': getStatusText(sale.status),
      'Fatura No': sale.invoice_number || '-',
      'Operatör': sale.visit?.operator?.name || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    
    // Sütun genişliklerini ayarla
    ws['!cols'] = [
      { wch: 36 }, // ID
      { wch: 12 }, // Tarih
      { wch: 25 }, // Müşteri
      { wch: 25 }, // Şube
      { wch: 40 }, // Ürünler (Geniş)
      { wch: 15 }, // Tutar
      { wch: 15 }, // Durum
      { wch: 15 }, // Fatura No
      { wch: 20 }  // Operatör
    ];
    
    // Ürünler sütununda alt alta yazmayı etkinleştir
     Object.keys(ws).forEach(cellAddress => {
      if (cellAddress.startsWith('E') && cellAddress !== 'E1') { // E sütunu (Ürünler)
        if(ws[cellAddress].v) {
          ws[cellAddress].s = { alignment: { wrapText: true } };
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Satışlar');
    XLSX.writeFile(wb, `satislar_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };
  
  const getStatusText = (status: string) => {
     switch (status) {
      case 'pending': return 'Beklemede';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      case 'invoiced': return 'Faturalandı';
      case 'paid': return 'Ödendi';
      default: return 'Bilinmiyor';
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            Beklemede
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            Onaylandı
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            Reddedildi
          </span>
        );
      case 'invoiced':
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
            Faturalandı
          </span>
        );
      case 'paid':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            Ödendi
          </span>
        );
      default:
        return null;
    }
  };

  // Filtreleme artık sunucu tarafında (fetchSales içinde) yapılıyor.
  // Bu değişkeni sadece sayfalama ve toplam kayıt sayısı için tutuyoruz.
  const filteredSales = sales;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSales.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    const halfMaxPages = Math.floor(maxPagesToShow / 2);

    let startPage = Math.max(1, currentPage - halfMaxPages);
    let endPage = Math.min(totalPages, currentPage + halfMaxPages);

    if (currentPage - halfMaxPages < 1) {
      endPage = Math.min(totalPages, maxPagesToShow);
    }
    
    if (currentPage + halfMaxPages > totalPages) {
      startPage = Math.max(1, totalPages - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      pageNumbers.push(
        <button key={1} onClick={() => handlePageChange(1)} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">
          1
        </button>
      );
      if (startPage > 2) {
        pageNumbers.push(<span key="start-ellipsis" className="px-4 py-2 text-gray-500">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-4 py-2 rounded-full ${currentPage === i ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageNumbers.push(<span key="end-ellipsis" className="px-4 py-2 text-gray-500">...</span>);
      }
      pageNumbers.push(
        <button key={totalPages} onClick={() => handlePageChange(totalPages)} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">
          {totalPages}
        </button>
      );
    }

    return pageNumbers;
  };

  if (loading && sales.length === 0) { // Sadece ilk yüklemede tam ekran göster
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
      </div>
    );
  }

  if (error && !loading) {
     return (
      <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md max-w-lg mx-auto">
        <div className="flex items-center">
          <AlertCircle className="w-6 h-6 mr-3" />
          <div>
            <h4 className="font-bold">Bir Hata Oluştu</h4>
            <p className="text-sm">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchSales}
          className="mt-4 flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">ÜCRETLİ MALZEME SATIŞLARIM</h2>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors disabled:opacity-50"
          disabled={!sales || sales.length === 0}
        >
          <Download size={18} />
          Excel'e Aktar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Şube adı veya ürün adı ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
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
                className="w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-1/2 p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={startDate}
                  onChange={(e) => handleDateRangeChange(e.target.value, endDate)}
                  placeholder="Başlangıç Tarihi"
                />
                <input
                  type="date"
                  className="w-1/2 p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={endDate}
                  min={startDate} // Bitiş tarihi başlangıçtan önce olamaz
                  onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
                  placeholder="Bitiş Tarihi"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {loading && (
        <div className="flex justify-center items-center py-4">
            <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
            <span className="ml-2 text-gray-500">Veriler güncelleniyor...</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Şube
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ürünler
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
                  Detay
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Filtrelere uygun satış kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                currentItems.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {format(new Date(sale.sale_date), 'dd.MM.yyyy', { locale: tr })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.branch?.sube_adi || '-'}
                    </td>
                    {/* YENİ SÜTUN: Ürünler ve Miktarları */}
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {sale.items && sale.items.length > 0 ? (
                        <ul className="list-none p-0 m-0 space-y-1">
                          {sale.items.map(item => (
                            <li key={item.id} className="text-xs">
                              <span className="font-medium text-gray-900">{item.product.name}</span>
                              <span className="text-gray-500"> ({item.quantity} adet)</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
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

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm text-gray-500">
          Toplam {filteredSales.length} kayıt bulundu.
        </div>
        {totalPages > 1 && (
          <div className="space-x-1 flex items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            {renderPageNumbers()}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
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
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Şube</p>
                  <p className="text-lg font-semibold">{selectedVisit.branch?.sube_adi || 'Genel Merkez'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Tarih</p>
                  <p className="text-lg font-semibold">{format(new Date(selectedVisit.visit_date), 'dd MMMM yyyy, HH:mm', { locale: tr })}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Operatör</p>
                  <p className="text-lg font-semibold">{selectedVisit.operator?.name || 'Atanmadı'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Ziyaret Türü</p>
                  <p className="text-lg font-semibold">{selectedVisit.visit_type || 'Belirtilmemiş'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Rapor No</p>
                  <p className="text-lg font-semibold font-mono">{selectedVisit.report_number || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Durum</p>
                  <p className="text-lg font-semibold capitalize">
                    {getStatusText(selectedVisit.status)}
                  </p>
                </div>
              </div>

              {selectedVisit.notes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wider">Notlar</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedVisit.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sale Details Modal */}
      {showDetailsModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Satış Detayları</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSale(null);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
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
                    <p className="font-medium">{format(new Date(selectedSale.invoice_date), 'dd.MM.yyyy', { locale: tr })}</p>
                  </div>
                )}
                {selectedSale.payment_date && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Ödeme Tarihi</h4>
                    <p className="font-medium">{format(new Date(selectedSale.payment_date), 'dd.MM.yyyy', { locale: tr })}</p>
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
                <div className="overflow-x-auto rounded-lg border">
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
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedSale.notes}</p>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedSale(null);
                  }}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
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

export default CustomerPaidMaterials
