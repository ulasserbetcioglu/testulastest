import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { Search, Filter, Calendar, Download, Eye, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- ARAYÜZLER (INTERFACES) ---
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
    product_id: string; // Admin kodundan eklendi
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

// --- DEBOUNCE HOOK ---
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// --- BİLEŞEN (COMPONENT) ---
const CustomerPaidMaterials: React.FC = () => {
  // --- STATE TANIMLAMALARI ---
  const [sales, setSales] = useState<PaidMaterialSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms gecikme
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0); // Toplam kayıt sayısı
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<PaidMaterialSale | null>(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);

  // --- VERİ ÇEKME ---

  useEffect(() => {
    fetchCustomerId();
  }, []);

  // Müşteri ID'si, filtreler veya sayfa değiştiğinde veriyi çek
  useEffect(() => {
    if (customerId) {
      fetchSales();
    }
  }, [customerId, debouncedSearchTerm, selectedMonth, startDate, endDate, currentPage]);

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

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

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
          items:paid_material_sale_items(
            id,
            product_id,
            product:product_id ( name ),
            quantity,
            unit_price,
            total_price
          )
        `, { count: 'exact' }) // Toplam kayıt sayısı için 'exact'
        .eq('customer_id', customerId)
        .order('sale_date', { ascending: false })
        .range(from, to);

      // --- FİLTRELER ---

      // Tarih Filtresi
      if (startDate && endDate) {
        query = query.gte('sale_date', startDate).lte('sale_date', endDate);
      } else {
        const [year, month] = selectedMonth.split('-').map(Number);
        const startOfMonth = new Date(year, month - 1, 1).toISOString();
        const endOfMonth = new Date(year, month, 1); // Bir sonraki ayın 1'i
        endOfMonth.setDate(endOfMonth.getDate() - 1); // Bir önceki gün (ayın son günü)
        endOfMonth.setHours(23, 59, 59, 999); // Günün sonu
        query = query.gte('sale_date', startOfMonth).lte('sale_date', endOfMonth.toISOString());
      }

      // Arama Filtresi (Şube adı VEYA Ürün adı)
      if (debouncedSearchTerm) {
        query = query.or(
          `branch:branch_id.sube_adi.ilike.%${debouncedSearchTerm}%,items.product:product_id.name.ilike.%${debouncedSearchTerm}%`
        );
      }
      
      // --- SORGULAMA ---
      const { data, error, count } = await query;

      if (error) throw error;
      
      setSales(data || []);
      setTotalCount(count || 0);

    } catch (err: any) {
      setError(err.message);
      console.error("Satışlar çekilirken hata:", err);
    } finally {
      setLoading(false);
    }
  }, [customerId, currentPage, itemsPerPage, selectedMonth, startDate, endDate, debouncedSearchTerm]);


  // --- YARDIMCI FONKSİYONLAR ---

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setCurrentPage(1); // Filtre değiştiğinde 1. sayfaya dön
  };

  const handleViewDetails = (sale: PaidMaterialSale) => {
    setSelectedSale(sale);
    setShowDetailsModal(true);
  };

  const handleViewVisit = async (visitId: string) => {
    // Zaten 'sale' objesi içinde 'visit' verisi geliyor, tekrar çekmeye gerek yok.
    const sale = sales.find(s => s.visit_id === visitId);
    if (sale && sale.visit) {
        // Ziyaretin şube adını da ekleyelim (satıştan alarak)
        setSelectedVisit({
            ...sale.visit,
            branch: sale.branch
        });
        setShowVisitModal(true);
    } else {
        console.error('Ziyaret detayı bulunamadı.');
    }
  };

  // --- EXCEL AKTARIMI ---
  const exportToExcel = () => {
    const data = sales.map(sale => {
      // Ürünleri "Ürün Adı (X adet), Ürün Adı 2 (Y adet)" formatına getir
      const itemsString = sale.items
        .map(item => `${item.product?.name || 'Bilinmeyen'} (${item.quantity} adet)`)
        .join('\n'); // Excel'de alt satıra geçmesi için \n

      return {
        'Tarih': format(new Date(sale.sale_date), 'dd.MM.yyyy', { locale: tr }),
        'Müşteri': sale.customer.kisa_isim,
        'Şube': sale.branch?.sube_adi || '-',
        'Ürünler': itemsString,
        'Tutar (₺)': sale.total_amount,
        'Durum': getStatusText(sale.status),
        'Fatura No': sale.invoice_number || '-',
        'Operatör': sale.visit?.operator?.name || '-'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);

    // Sütun genişliklerini ayarla
    ws['!cols'] = [
      { wch: 12 }, // Tarih
      { wch: 25 }, // Müşteri
      { wch: 25 }, // Şube
      { wch: 40 }, // Ürünler
      { wch: 15 }, // Tutar
      { wch: 15 }, // Durum
      { wch: 15 }, // Fatura No
      { wch: 20 }  // Operatör
    ];

    // Ürünler sütununda metni kaydır (wrap text)
    // Bu, `\n` karakterinin çalışması için gereklidir.
    Object.keys(ws).forEach(cellAddress => {
      if (cellAddress.startsWith('D') && cellAddress !== 'D1') { // D sütunu (Ürünler)
        if(ws[cellAddress].v) {
          ws[cellAddress].s = { alignment: { wrapText: true, vertical: "top" } };
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Satışlar');
    XLSX.writeFile(wb, `malzeme_satislar_${selectedMonth}.xlsx`);
  };

  // --- DURUM GÖSTERGELERİ ---
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Beklemede</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Onaylandı</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Reddedildi</span>;
      case 'invoiced':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Faturalandı</span>;
      case 'paid':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Ödendi</span>;
      default:
        return null;
    }
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
  };

  // --- SAYFALAMA ---
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const renderPageNumbers = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    // Önceki Butonu
    pageNumbers.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={18} />
      </button>
    );

    // Sayfa Numaraları
    if (startPage > 1) {
      pageNumbers.push(<button key={1} onClick={() => handlePageChange(1)} className="p-2 w-10 h-10 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">1</button>);
      if (startPage > 2) {
        pageNumbers.push(<span key="start-ellipsis" className="p-2 w-10 h-10 flex items-center justify-center text-gray-500">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`p-2 w-10 h-10 rounded-lg ${currentPage === i ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageNumbers.push(<span key="end-ellipsis" className="p-2 w-10 h-10 flex items-center justify-center text-gray-500">...</span>);
      }
      pageNumbers.push(<button key={totalPages} onClick={() => handlePageChange(totalPages)} className="p-2 w-10 h-10 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">{totalPages}</button>);
    }

    // Sonraki Butonu
    pageNumbers.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight size={18} />
      </button>
    );

    return pageNumbers;
  };

  // --- RENDER ---

  // Yükleme Durumu
  if (loading && sales.length === 0) { // Sadece ilk yüklemede tam ekran göster
    return (
        <div className="flex items-center justify-center h-64">
            <RefreshCw size={32} className="text-gray-500 animate-spin" />
            <span className="ml-3 text-lg text-gray-500">Yükleniyor...</span>
        </div>
    );
  }

  // Hata Durumu
  if (error) {
    return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
            <AlertTriangle size={32} className="text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800">Bir Hata Oluştu</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
                onClick={() => {
                    setError(null);
                    fetchCustomerId(); // Her şeyi yeniden başlat
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
            >
                <RefreshCw size={18} />
                Tekrar Dene
            </button>
        </div>
    );
  }

  // Ana İçerik
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <h2 className="text-2xl font-semibold text-gray-800">ÜCRETLİ MALZEME SATIŞLARIM</h2>
        <button
          onClick={exportToExcel}
          className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          disabled={!sales || sales.length === 0 || loading}
        >
          <Download size={18} />
          Excel
        </button>
      </div>

      {/* --- Filtreleme Alanı --- */}
      <div className="bg-white rounded-lg shadow p-4">
        {/* Arama ve Ay */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Şube veya Ürün Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <div className="flex-1 md:flex-none">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dönem
            </label>
            <input
              type="month"
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value)
                handleDateRangeChange('', '') // Tarih aralığını temizle
              }}
            />
          </div>
        </div>
        
        {/* Tarih Aralığı */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tarih Aralığı (Dönemi geçersiz kılar)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="date"
              className="w-full sm:w-1/2 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={startDate}
              onChange={(e) => handleDateRangeChange(e.target.value, endDate)}
              placeholder="Başlangıç Tarihi"
            />
            <input
              type="date"
              className="w-full sm:w-1/2 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={endDate}
              onChange={(e) => handleDateRangeChange(startDate, e.target.value)}
              placeholder="Bitiş Tarihi"
            />
          </div>
        </div>
      </div>

      {/* --- Satış Tablosu --- */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şube</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürünler</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ziyaret</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 relative">
              {loading && (
                  <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
                      <RefreshCw size={24} className="text-gray-500 animate-spin" />
                  </div>
              )}
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Filtrelerle eşleşen satış kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {format(new Date(sale.sale_date), 'dd.MM.yyyy', { locale: tr })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.branch?.sube_adi || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {sale.items.length === 0 ? (
                        <span className="text-xs text-gray-400">Ürün yok</span>
                      ) : (
                        <ul className="space-y-1 max-w-xs">
                          {sale.items.map(item => (
                            <li key={item.id} className="truncate" title={item.product?.name || 'Bilinmeyen'}>
                              <span className="font-medium text-gray-700">{item.product?.name || 'Bilinmeyen'}</span>
                              <span className="text-gray-500"> ({item.quantity} adet)</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-800">
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

      {/* --- Sayfalama Kontrolleri --- */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center pt-4">
          <div className="text-sm text-gray-500 mb-2 sm:mb-0">
            Toplam {totalCount} kayıt (Sayfa {currentPage} / {totalPages})
          </div>
          <div className="flex items-center space-x-2">
            {renderPageNumbers()}
          </div>
        </div>
      )}


      {/* --- Ziyaret Detay Modalı --- */}
      {showVisitModal && selectedVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Ziyaret Detayları</h2>
              <button
                onClick={() => setShowVisitModal(false)}
                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Şube</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedVisit.branch?.sube_adi || 'Genel Merkez'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Tarih</p>
                  <p className="text-lg font-semibold text-gray-900">{format(new Date(selectedVisit.visit_date), 'dd MMMM yyyy, HH:mm', { locale: tr })}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Operatör</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedVisit.operator?.name || 'Atanmadı'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Ziyaret Türü</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedVisit.visit_type || 'Belirtilmemiş'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Rapor No</p>
                  <p className="text-lg font-semibold text-gray-900 font-mono">{selectedVisit.report_number || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Durum</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {selectedVisit.status === 'completed' ? 'Tamamlandı' : selectedVisit.status === 'planned' ? 'Planlandı' : 'İptal Edildi'}
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

      {/* --- Satış Detay Modalı --- */}
      {showDetailsModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-2xl font-bold text-gray-800">Satış Detayları</h3>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Tarih</h4>
                  <p className="font-medium text-gray-900">{format(new Date(selectedSale.sale_date), 'dd MMMM yyyy', { locale: tr })}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Müşteri</h4>
                  <p className="font-medium text-gray-900">{selectedSale.customer.kisa_isim}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Şube</h4>
                  <p className="font-medium text-gray-900">{selectedSale.branch?.sube_adi || '-'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Durum</h4>
                  {getStatusBadge(selectedSale.status)}
                </div>
                {selectedSale.invoice_number && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Fatura No</h4>
                    <p className="font-medium text-gray-900">{selectedSale.invoice_number}</p>
                  </div>
                )}
                {selectedSale.invoice_date && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Fatura Tarihi</h4>
                    <p className="font-medium text-gray-900">{format(new Date(selectedSale.invoice_date), 'dd.MM.yyyy', { locale: tr })}</p>
                  </div>
                )}
                {selectedSale.payment_date && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Ödeme Tarihi</h4>
                    <p className="font-medium text-gray-900">{format(new Date(selectedSale.payment_date), 'dd.MM.yyyy', { locale: tr })}</p>
                  </div>
                )}
                {selectedSale.visit?.operator?.name && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Operatör</h4>
                    <p className="font-medium text-gray-900">{selectedSale.visit.operator.name}</p>
                  </div>
                )}
              </div>

              {/* Satış Kalemleri */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3 pb-2 border-b">Satış Kalemleri</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Birim Fiyat</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedSale.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product?.name || 'Bilinmeyen Ürün'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.unit_price.toLocaleString('tr-TR')} ₺</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">{item.total_price.toLocaleString('tr-TR')} ₺</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right uppercase">Genel Toplam:</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{selectedSale.total_amount.toLocaleString('tr-TR')} ₺</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notlar */}
              {selectedSale.notes && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-3 pb-2 border-b">Notlar</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedSale.notes}</p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2 border-t pt-6 sticky bottom-0 bg-white z-10">
                <button
                  onClick={() => setSelectedSale(null)}
                  className="bg-gray-200 text-gray-800 px-5 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
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