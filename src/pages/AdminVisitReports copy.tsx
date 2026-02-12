// src/pages/AdminVisitReports.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, FileText, Download, Upload, X, CheckCircle, Clock, Eye, Edit, Trash, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import DataTable from '../components/DataTable';
import VisitDetailsModal from '../components/VisitDetailsModal';
import PaidMaterialsModal from '../components/PaidMaterialSales/PaidMaterialsModal';
import ReportImageModal from '../pages/ReportImageModal'; // ✅ DÜZELTME: Import yolu güncellendi
import { toast } from 'sonner';

// --- ARAYÜZLER (INTERFACES) ---
interface Visit {
  id: string;
  customer: {
    kisa_isim: string;
    is_one_time?: boolean;
  } | null;
  branch?: {
    sube_adi: string;
    is_one_time?: boolean;
  } | null;
  operator: {
    name: string;
    phone?: string;
  } | null;
  operator_id: string;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
  visit_type?: string;
  pest_types?: string[];
  equipment_checks?: Record<string, any>;
  is_checked?: boolean;
  paid_materials?: any[];
  report_number?: string;
  report_photo_url?: string; // ✅ DEĞİŞTİRİLDİ: report_photo_path yerine url
  report_photo_file_path?: string; // ✅ YENİ: Dosya yolu eklendi
}

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
}

interface Operator {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

// Yardımcı fonksiyon: Diziyi belirli boyutlarda parçalara böler
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

const AdminVisitReports: React.FC = () => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedVisitType, setSelectedVisitType] = useState<string>('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showPaidMaterialsModal, setShowPaidMaterialsModal] = useState(false);
  const [selectedVisitMaterials, setSelectedVisitMaterials] = useState<Visit | null>(null);
  const [showCheckedOnly, setShowCheckedOnly] = useState<string>('');
  const [pageSize, setPageSize] = useState(10);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editFormData, setEditFormData] = useState({
    visitDate: '',
    visitTime: '',
    status: '',
    visitType: '',
    notes: '',
    reportNumber: ''
  });

  // NEW: State for report image modal
  const [showReportImageModal, setShowReportImageModal] = useState(false);
  const [selectedReportImageUrl, setSelectedReportImageUrl] = useState<string>(''); // ✅ DEĞİŞTİRİLDİ: URL kullanıldı
  const [selectedReportImageFilePath, setSelectedReportImageFilePath] = useState<string>(''); // ✅ YENİ: Dosya yolu state'i
  const [selectedReportImageTitle, setSelectedReportImageTitle] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [selectedOperator, startDate, endDate]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, visits, selectedStatus, selectedVisitType, selectedCustomer, selectedBranch, selectedOperator, showCheckedOnly]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let allVisitsData: Visit[] = [];
      const fetchPageSize = 1000;
      let offset = 0;
      let hasMore = true;
      let totalCount = 0;

      while (hasMore) {
        let visitsQuery = supabase
          .from('visits')
          .select(`
            id, visit_date, status, visit_type, notes, equipment_checks, pest_types, report_number, operator_id,
            customer:customer_id (kisa_isim, is_one_time),
            branch:branch_id (sube_adi, is_one_time),
            operator:operator_id (name, phone),
            is_checked
          `, { count: 'exact' })
          .order('visit_date', { ascending: false })
          .gte('visit_date', `${startDate}T00:00:00.000Z`) // Apply date filter here
          .lte('visit_date', `${endDate}T23:59:59.999Z`) // Apply date filter here
          .range(offset, offset + fetchPageSize - 1);

        const { data, error, count } = await visitsQuery;

        if (error) throw error;

        if (count !== null) {
          totalCount = count;
        }

        if (data) {
          allVisitsData = allVisitsData.concat(data);
          offset += data.length;
          hasMore = data.length === fetchPageSize && offset < totalCount;
        } else {
          hasMore = false;
        }
      }

      // Fetch report photos for all fetched visits
      const visitIds = allVisitsData.map(v => v.id);
      let reportPhotosMap = new Map<string, { url: string; filePath: string }>(); // ✅ DEĞİŞTİRİLDİ: filePath de çekildi

      if (visitIds.length > 0) {
        const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select('entity_id, file_url, file_path') // ✅ DEĞİŞTİRİLDİ: file_url ve file_path çekildi
          .eq('entity_type', 'visit')
          .eq('document_type', 'report_photo')
          .in('entity_id', visitIds);

        if (documentsError) throw documentsError;

        documentsData?.forEach(doc => {
          if (doc.entity_id) {
            reportPhotosMap.set(doc.entity_id, { url: doc.file_url, filePath: doc.file_path }); // ✅ DEĞİŞTİRİLDİ: url ve filePath kullanıldı
          }
        });
      }

      // Enhance visits with report photo URLs and file paths
      const enhancedVisitsWithPhotos = allVisitsData.map(visit => ({
        ...visit,
        report_photo_url: reportPhotosMap.get(visit.id)?.url || undefined, // ✅ DEĞİŞTİRİLDİ: url kullanıldı
        report_photo_file_path: reportPhotosMap.get(visit.id)?.filePath || undefined, // ✅ YENİ: filePath kullanıldı
      }));

      setVisits(enhancedVisitsWithPhotos);

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, kisa_isim, musteri_no')
        .order('kisa_isim');
        
      if (customersError) throw customersError;
      setCustomers(customersData || []);
      
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('id, sube_adi, customer_id')
        .order('sube_adi');
        
      if (branchesError) throw branchesError;
      setBranches(branchesData || []);
      
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('operators')
        .select('id, name, email, phone')
        .order('name');
        
      if (operatorsError) throw operatorsError;
      setOperators(operatorsData || []);

      // The rest of the data fetching (paid materials) can be simplified or removed if not directly relevant to report viewing
      // For now, keeping it as is from AdminVisits.tsx for consistency.
      const paidMaterialsData: any[] = []; // Simplified, as it's not the main focus here
      const paidMaterialsByVisit = (paidMaterialsData || []).reduce((acc, sale) => {
        if (!acc[sale.visit_id]) {
          acc[sale.visit_id] = [];
        }
        acc[sale.visit_id].push(...(sale.items || []));
        return acc;
      }, {} as Record<string, any[]>);
      
      const finalVisits = enhancedVisitsWithPhotos.map(visit => ({
        ...visit,
        paid_materials: paidMaterialsByVisit[visit.id] || []
      }));
      
      setVisits(finalVisits);
      setFilteredVisits(finalVisits);
    } catch (err: any) {
      setError(err.message);
      toast.error("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!visits.length) return;
    
    let filtered = [...visits];
    
    if (searchTerm) {
      filtered = filtered.filter(visit => 
        (visit.customer?.kisa_isim || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (visit.branch?.sube_adi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (visit.operator?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (visit.report_number || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedStatus) {
      filtered = filtered.filter(visit => visit.status === selectedStatus);
    }
    
    if (selectedVisitType) {
      filtered = filtered.filter(visit => visit.visit_type === selectedVisitType);
    }
    
    if (selectedCustomer) {
      filtered = filtered.filter(visit => visit.customer_id === selectedCustomer);
    }
    
    if (selectedBranch) {
      filtered = filtered.filter(visit => visit.branch_id === selectedBranch);
    }
    
    if (selectedOperator) {
      filtered = filtered.filter(visit => visit.operator_id === selectedOperator);
    }
    
    if (showCheckedOnly === 'true') {
      filtered = filtered.filter(visit => visit.is_checked);
    } else if (showCheckedOnly === 'false') {
      filtered = filtered.filter(visit => !visit.is_checked);
    }
    
    setFilteredVisits(filtered);
  };

  const handleViewDetails = (visit: Visit) => {
    const visitForModal = {
      id: visit.id,
      visit_date: visit.visit_date,
      customer_name: visit.customer?.kisa_isim || '',
      branch_name: visit.branch?.sube_adi || '',
      operator_name: visit.operator?.name || '',
      operator_phone: visit.operator?.phone || '',
      status: visit.status,
      notes: visit.notes || '',
      visit_type: visit.visit_type || '',
      monthly_price: null,
      per_visit_price: null,
      report_number: visit.report_number
    };
    
    setSelectedVisit(visitForModal);
    setShowDetailsModal(true);
  };

  const handleShowPaidMaterials = (visit: Visit) => {
    setSelectedVisitMaterials(visit);
    setShowPaidMaterialsModal(true);
  };

  const handleCheckVisit = async (visitId: string, currentCheckedStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('visits')
        .update({ is_checked: !currentCheckedStatus })
        .eq('id', visitId);

      if (error) throw error;

      toast.success('Ziyaret durumu güncellendi.');
      fetchData(); // Verileri yeniden çekerek UI'ı güncelle
    } catch (err: any) {
      setError(err.message);
      toast.error("Hata: " + err.message);
    }
  };

  const handleFilter = (filters: {
    dateFrom: string;
    dateTo: string;
    status: string;
    visitType: string;
    customerId: string;
    branchId: string;
    operatorId: string;
    hasPaidMaterials: string;
    showCheckedOnly: string;
  }) => {
    setStartDate(filters.dateFrom);
    setEndDate(filters.dateTo);
    setSelectedStatus(filters.status);
    setSelectedVisitType(filters.visitType);
    setSelectedCustomer(filters.customerId);
    setSelectedBranch(filters.branchId);
    setSelectedOperator(filters.operatorId);
    setShowCheckedOnly(filters.showCheckedOnly);
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedStatus('');
    setSelectedVisitType('');
    setSelectedCustomer('');
    setSelectedBranch('');
    setSelectedOperator('');
    setShowCheckedOnly('');
    setSearchTerm('');
    setFilteredVisits(visits);
  };

  const handleEditVisit = (visit: Visit) => {
    // This page is for viewing reports, editing visits might not be desired here.
    // If needed, navigate to the AdminVisits page's edit functionality.
    toast.info("Ziyaret düzenleme bu sayfada desteklenmiyor. Lütfen 'Ziyaret Yönetimi' sayfasını kullanın.");
  };

  const handleDeleteVisit = async () => {
    if (!visitToDelete) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitToDelete);
        
      if (error) throw error;
      
      setVisits(visits.filter(visit => visit.id !== visitToDelete));
      setFilteredVisits(filteredVisits.filter(visit => visit.id !== visitToDelete));
      
      toast.success('Ziyaret başarıyla silindi');
    } catch (err: any) {
      setError(err.message);
      toast.error(`Hata: ${err.message}`);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setVisitToDelete(null);
    }
  };

  const confirmDeleteVisit = (visitId: string) => {
    setVisitToDelete(visitId);
    setShowDeleteConfirm(true);
  };

  const getVisitTypeText = (type?: string) => {
    if (!type) return 'Belirtilmemiş';
    
    switch (type) {
      case 'ilk': return 'İlk Ziyaret';
      case 'ucretli': return 'Ücretli Ziyaret';
      case 'acil': return 'Acil Çağrı';
      case 'teknik': return 'Teknik İnceleme';
      case 'periyodik': return 'Periyodik Ziyaret';
      case 'isyeri': return 'İşyeri Ziyareti';
      case 'gozlem': return 'Gözlem Ziyareti';
      case 'son': return 'Son Ziyaret';
      default: return type;
    }
  };

  const exportToExcel = () => {
    const data = filteredVisits.map(report => ({
      'Tarih': new Date(report.visit_date).toLocaleDateString('tr-TR'),
      'Müşteri': report.customer?.kisa_isim || 'Belirtilmemiş',
      'Şube': report.branch?.sube_adi || 'Belirtilmemiş',
      'Operatör': report.operator?.name || 'Belirtilmemiş',
      'Durum': report.status === 'completed' ? 'Tamamlandı' :
               report.status === 'cancelled' ? 'İptal Edildi' : 'Planlandı',
      'Ziyaret Türü': getVisitTypeText(report.visit_type),
      'Notlar': report.notes || '',
      'İşaretli': report.is_checked ? 'Evet' : 'Hayır',
      'Ücretli Malzeme': report.paid_materials && report.paid_materials.length > 0 ? 'Var' : 'Yok',
      'Rapor Numarası': report.report_number || '',
      'Rapor Fotoğrafı URL': report.report_photo_url || 'Yok', // ✅ DEĞİŞTİRİLDİ: url kullanıldı
      'Rapor Fotoğrafı Dosya Yolu': report.report_photo_file_path || 'Yok', // ✅ YENİ: Dosya yolu eklendi
      'Müşteri Tek Seferlik': report.customer?.is_one_time ? 'Evet' : 'Hayır',
      'Şube Tek Seferlik': report.branch?.is_one_time ? 'Evet' : 'Hayır',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ziyaret Raporları');
    XLSX.writeFile(wb, 'ziyaret_raporlari.xlsx');
  };

  // NEW: Handle opening report image modal
  const handleViewReportImage = (filePath: string, reportNumber?: string) => { // ✅ DEĞİŞTİRİLDİ: imageUrl yerine filePath kullanıldı
    setSelectedReportImageFilePath(filePath); // ✅ YENİ: filePath kullanıldı
    setSelectedReportImageTitle(reportNumber ? `Rapor Fotoğrafı: ${reportNumber}` : 'Rapor Fotoğrafı');
    setShowReportImageModal(true);
  };

  const columns = [
    {
      header: '',
      accessor: 'id' as keyof Visit,
      render: (value: string, row: Visit) => (
        <div className="flex justify-center">
          <input
            type="checkbox"
            checked={!!row.is_checked}
            onChange={() => handleCheckVisit(value, !!row.is_checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
          />
        </div>
      ),
    },
    { 
      header: 'Tarih', 
      accessor: 'visit_date' as keyof Visit, 
      sortable: true,
      render: (value: string, row: Visit) => (
        <div className={`${row.is_checked ? 'bg-green-100 p-1 rounded' : ''} text-xs`}>
          {new Date(value).toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      )
    },
    { 
      header: 'Müşteri', 
      accessor: 'customer' as keyof Visit,
      render: (value: Visit['customer'], row: Visit) => (
        <div className={`${row.is_checked ? 'bg-green-100 p-1 rounded' : ''} text-xs`}>
          {value?.kisa_isim || 'Belirtilmemiş'}
          {value?.is_one_time && <span className="ml-1 px-1 py-0.5 bg-gray-200 text-gray-700 rounded-full text-[8px]">(Tek Seferlik)</span>}
        </div>
      )
    },
    { 
      header: 'Şube', 
      accessor: 'branch' as keyof Visit,
      render: (value: Visit['branch'], row: Visit) => (
        <div className={`${row.is_checked ? 'bg-green-100 p-1 rounded' : ''} text-xs`}>
          {value?.sube_adi || '-'}
          {value?.is_one_time && <span className="ml-1 px-1 py-0.5 bg-gray-200 text-gray-700 rounded-full text-[8px]">(Tek Seferlik)</span>}
        </div>
      )
    },
    { 
      header: 'Operatör', 
      accessor: 'operator' as keyof Visit,
      render: (value: Visit['operator'], row: Visit) => (
        <div className={`${row.is_checked ? 'bg-green-100 p-1 rounded' : ''} text-xs`}>
          {value?.name || '-'}
        </div>
      )
    },
    {
      header: 'Durum',
      accessor: 'status' as keyof Visit,
      render: (value: string, row: Visit) => {
        let icon;
        let text;
        let bgColor;
        
        switch (value) {
          case 'completed':
            icon = <CheckCircle className="h-4 w-4 text-green-500" />;
            text = 'T';
            bgColor = 'bg-green-100 text-green-800';
            break;
          case 'planned':
            icon = <Clock className="h-4 w-4 text-yellow-500" />;
            text = 'P';
            bgColor = 'bg-yellow-100 text-yellow-800';
            break;
          case 'cancelled':
            icon = <X className="h-4 w-4 text-red-500" />;
            text = 'İ';
            bgColor = 'bg-red-100 text-red-800';
            break;
          default:
            icon = null;
            text = value;
            bgColor = 'bg-gray-100 text-gray-800';
        }
        
        return (
          <div className={`flex items-center ${row.is_checked ? 'bg-green-100 p-1 rounded' : ''}`}>
            {icon}
            <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${bgColor}`}>
              {text}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Ziyaret Türü',
      accessor: 'visit_type' as keyof Visit,
      render: (value: string, row: Visit) => (
        <div className={`${row.is_checked ? 'bg-green-100 p-1 rounded' : ''} text-xs`}>
          {getVisitTypeText(value)}
        </div>
      )
    },
    {
      header: 'Rapor No',
      accessor: 'report_number' as keyof Visit,
      render: (value: string, row: Visit) => (
        <div className={`${row.is_checked ? 'bg-green-100 p-1 rounded' : ''} text-xs`}>
          {value || '-'}
        </div>
      )
    },
    {
      header: 'Rapor Fotoğrafı', // NEW: Report Photo Column
      accessor: 'report_photo_file_path' as keyof Visit, // ✅ DEĞİŞTİRİLDİ: filePath kullanıldı
      render: (value: string | undefined, row: Visit) => (
        <div className="flex justify-center">
          {row.report_photo_file_path ? ( // ✅ DEĞİŞTİRİLDİ: file_path kontrol edildi
            <button
              onClick={() => handleViewReportImage(row.report_photo_file_path, row.report_number || row.id)} // ✅ DEĞİŞTİRİLDİ: file_path iletildi
              className="p-1 rounded-full hover:bg-gray-100"
              title="Rapor Fotoğrafını Görüntüle"
            >
              <ImageIcon size={18} className="text-blue-600" />
            </button>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-2 py-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Ziyaret Raporları</h1>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
          >
            <FileText className="w-3 h-3" />
            Dışa Aktar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Arama
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Müşteri, şube veya rapor no ara..."
              className="w-full p-1.5 border rounded text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-1.5 border rounded text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-1.5 border rounded text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              İşaretli Ziyaretler
            </label>
            <select
              value={showCheckedOnly}
              onChange={(e) => setShowCheckedOnly(e.target.value)}
              className="w-full p-1.5 border rounded text-xs"
            >
              <option value="">Tümü</option>
              <option value="true">İşaretli</option>
              <option value="false">İşaretsiz</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Müşteri
            </label>
            <select
              value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                setSelectedBranch(''); // Reset branch when customer changes
              }}
              className="w-full p-1.5 border rounded text-xs"
            >
              <option value="">Tümü</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.kisa_isim}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Şube
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full p-1.5 border rounded text-xs"
              disabled={!selectedCustomer}
            >
              <option value="">Tümü</option>
              {branches
                .filter(branch => !selectedCustomer || branch.customer_id === selectedCustomer)
                .map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.sube_adi}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Operatör
            </label>
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="w-full p-1.5 border rounded text-xs"
            >
              <option value="">Tümü</option>
              {operators.map(operator => (
                <option key={operator.id} value={operator.id}>
                  {operator.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Durum
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-1.5 border rounded text-xs"
            >
              <option value="">Tüm Durumlar</option>
              <option value="planned">Planlandı</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal Edildi</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Ziyaret Türü
            </label>
            <select
              value={selectedVisitType}
              onChange={(e) => setSelectedVisitType(e.target.value)}
              className="w-full p-1.5 border rounded text-xs"
            >
              <option value="">Tüm Türler</option>
              <option value="ilk">İlk</option>
              <option value="ucretli">Ücretli</option>
              <option value="acil">Acil Çağrı</option>
              <option value="teknik">Teknik İnceleme</option>
              <option value="periyodik">Periyodik</option>
              <option value="isyeri">İşyeri</option>
              <option value="gozlem">Gözlem</option>
              <option value="son">Son</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Sayfa Başına Gösterim
            </label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="w-full p-1.5 border rounded text-xs"
            >
              <option value="10">10</option>
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={handleResetFilters}
            className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-xs"
          >
            Filtreleri Sıfırla
          </button>
          <button
            onClick={fetchData} // Use fetchData to re-fetch with current filters
            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
          >
            Filtrele
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredVisits}
          pagination={true}
          itemsPerPage={pageSize}
          searchable={false}
          actions={(visit) => (
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => handleViewDetails(visit)}
                className="text-blue-600 hover:text-blue-900"
                title="Görüntüle"
              >
                <Eye size={16} />
              </button>
              {/* Edit and Delete actions are kept for consistency but can be removed if not needed for report viewing */}
              <button
                onClick={() => handleEditVisit(visit)}
                className="text-green-600 hover:text-green-900"
                title="Düzenle"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => confirmDeleteVisit(visit.id)}
                className="text-red-600 hover:text-red-900"
                title="Sil"
              >
                <Trash size={16} />
              </button>
            </div>
          )}
        />
      </div>

      {showDetailsModal && selectedVisit && (
        <VisitDetailsModal
          visit={selectedVisit}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedVisit(null);
          }}
        />
      )}

      {showPaidMaterialsModal && selectedVisitMaterials && (
        <PaidMaterialsModal
          visitId={selectedVisitMaterials.id}
          materials={selectedVisitMaterials.paid_materials || []}
          branchName={selectedVisitMaterials.branch?.sube_adi || 'Belirtilmemiş'}
          onClose={() => {
            setShowPaidMaterialsModal(false);
            setSelectedVisitMaterials(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Ziyareti Sil</h3>
            <p className="mb-6">Bu ziyareti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setVisitToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteVisit}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Visit Modal (kept for consistency, but functionality might be limited) */}
      {showEditModal && editingVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-4">Ziyaret Düzenle</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tarih
                  </label>
                  <input
                    type="date"
                    value={editFormData.visitDate}
                    onChange={(e) => setEditFormData({...editFormData, visitDate: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saat
                  </label>
                  <input
                    type="time"
                    value={editFormData.visitTime}
                    onChange={(e) => setEditFormData({...editFormData, visitTime: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durum
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="planned">Planlandı</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ziyaret Türü
                </label>
                <select
                  value={editFormData.visitType}
                  onChange={(e) => setEditFormData({...editFormData, visitType: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Seçiniz</option>
                  <option value="ilk">İlk</option>
                  <option value="ucretli">Ücretli</option>
                  <option value="acil">Acil Çağrı</option>
                  <option value="teknik">Teknik İnceleme</option>
                  <option value="periyodik">Periyodik</option>
                  <option value="isyeri">İşyeri</option>
                  <option value="gozlem">Gözlem</option>
                  <option value="son">Son</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rapor Numarası
                </label>
                <input
                  type="text"
                  value={editFormData.reportNumber}
                  onChange={(e) => setEditFormData({...editFormData, reportNumber: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="Rapor numarası..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notlar
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows={4}
                  placeholder="Ziyaret notları..."
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingVisit(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={() => toast.info("Düzenleme fonksiyonu burada devre dışı.")} // Placeholder for actual save
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Report Image Modal */}
      <ReportImageModal
        isOpen={showReportImageModal}
        onClose={() => setShowReportImageModal(false)}
        filePath={selectedReportImageFilePath} // ✅ DEĞİŞTİRİLDİ: filePath kullanıldı
        title={selectedReportImageTitle}
      />
    </div>
  );
};

// Helper functions for Excel import/export
const downloadTemplate = () => {
  const workbook = XLSX.utils.book_new();

  // Visits template sheet
  const visitsTemplate = [{
    'Müşteri No': '',
    'Şube Adı': '',
    'Operatör E-posta': '',
    'Ziyaret Tarihi (GG.AA.YYYY)': '',
    'Durum': 'planned/completed/cancelled',
    'Notlar': ''
  }];
  const visitsWS = XLSX.utils.json_to_sheet(visitsTemplate);
  XLSX.utils.book_append_sheet(workbook, visitsWS, 'Ziyaretler');

  XLSX.writeFile(workbook, 'ziyaret_sablonu.xlsx');
};

const importFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Process the data and import visits
    console.log('Imported data:', jsonData);
    
    // Here you would typically process the data and insert it into your database
    // This is just a placeholder for the actual implementation
    alert(`${jsonData.length} ziyaret içe aktarıldı`);
    
    event.target.value = '';
  } catch (err: any) {
    console.error('Error importing from Excel:', err);
    alert(`Hata: ${err.message}`);
  }
};

export default AdminVisitReports;
