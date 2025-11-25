import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, FileText, Download, Upload, X, CheckCircle, Clock, Calendar, Eye, Edit, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import DataTable from '../components/DataTable';
import VisitDetailsModal from '../components/VisitDetailsModal';
import PaidMaterialsModal from '../components/PaidMaterialSales/PaidMaterialsModal';
import { toast } from 'sonner';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';

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

const AdminVisits: React.FC = () => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtreler
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedVisitType, setSelectedVisitType] = useState<string>('');
  const [showCheckedOnly, setShowCheckedOnly] = useState<string>('');
  const [pageSize, setPageSize] = useState(10);

  // Modallar
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showPaidMaterialsModal, setShowPaidMaterialsModal] = useState(false);
  const [selectedVisitMaterials, setSelectedVisitMaterials] = useState<Visit | null>(null);
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

  // DÜZELTME: Operatör ID kontrolünü kaldırdık, sadece veriyi çekiyoruz.
  useEffect(() => {
    fetchData();
  }, [startDate, endDate]); // selectedOperator buradan kaldırıldı, applyFilters halledecek

  useEffect(() => {
    applyFilters();
  }, [searchTerm, visits, selectedStatus, selectedVisitType, selectedCustomer, selectedBranch, selectedOperator, showCheckedOnly]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let allVisitsData: Visit[] = [];
      const fetchPageSize = 1000;
      let offset = 0;
      let hasMore = true;
      let totalCount = 0;

      // DÜZELTME: Döngü ve sorgu güvenliği artırıldı
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
          .range(offset, offset + fetchPageSize - 1);

        if (startDate) {
          visitsQuery = visitsQuery.gte('visit_date', `${startDate}T00:00:00.000Z`);
        }

        if (endDate) {
          visitsQuery = visitsQuery.lte('visit_date', `${endDate}T23:59:59.999Z`);
        }

        const { data, error, count } = await visitsQuery;

        if (error) throw error;

        if (count !== null) {
          totalCount = count;
        }

        if (data && data.length > 0) {
          allVisitsData = allVisitsData.concat(data as any); // Tip uyuşmazlığı için any kullanıldı
          offset += data.length;
          // Eğer çekilen veri sayfa boyutundan azsa, daha fazla veri yoktur
          if (data.length < fetchPageSize) {
             hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      // Diğer verileri çek (Filtreleme için)
      const [customersRes, branchesRes, operatorsRes] = await Promise.all([
        supabase.from('customers').select('id, kisa_isim').order('kisa_isim'),
        supabase.from('branches').select('id, sube_adi, customer_id').order('sube_adi'),
        supabase.from('operators').select('id, name, email, phone').order('name')
      ]);

      if (customersRes.error) throw customersRes.error;
      if (branchesRes.error) throw branchesRes.error;
      if (operatorsRes.error) throw operatorsRes.error;

      setCustomers(customersRes.data || []);
      setBranches(branchesRes.data || []);
      setOperators(operatorsRes.data || []);

      // Ücretli malzemeleri çek
      const visitIds = allVisitsData.map(visit => visit.id);
      let paidMaterialsByVisit: Record<string, any[]> = {};

      if (visitIds.length > 0) {
        const chunkSize = 100;
        const visitIdChunks = chunkArray(visitIds, chunkSize);
        let allMaterials: any[] = [];
        
        const materialPromises = visitIdChunks.map(chunk => 
          // DÜZELTME: Tablo ilişkisi 'paid_products' olarak güncellendi
          supabase
            .from('paid_material_sales')
            .select('visit_id, items:paid_material_sale_items(product:paid_products(name), quantity)')
            .in('visit_id', chunk)
        );

        const materialResults = await Promise.all(materialPromises);
        
        materialResults.forEach(res => {
          if (res.data) allMaterials = allMaterials.concat(res.data);
        });

        paidMaterialsByVisit = allMaterials.reduce((acc, sale) => {
          if (!acc[sale.visit_id]) acc[sale.visit_id] = [];
          acc[sale.visit_id].push(...(sale.items || []));
          return acc;
        }, {} as Record<string, any[]>);
      }
      
      const enhancedVisits = allVisitsData.map(visit => ({
        ...visit,
        paid_materials: paidMaterialsByVisit[visit.id] || []
      }));
      
      setVisits(enhancedVisits);
      setFilteredVisits(enhancedVisits);

    } catch (err: any) {
      console.error('Veri çekme hatası:', err);
      setError(err.message);
      toast.error("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...visits];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(visit => 
        (visit.customer?.kisa_isim || '').toLowerCase().includes(term) ||
        (visit.branch?.sube_adi || '').toLowerCase().includes(term) ||
        (visit.operator?.name || '').toLowerCase().includes(term) ||
        (visit.report_number || '').toLowerCase().includes(term)
      );
    }
    
    if (selectedStatus) filtered = filtered.filter(v => v.status === selectedStatus);
    if (selectedVisitType) filtered = filtered.filter(v => v.visit_type === selectedVisitType);
    if (selectedCustomer) filtered = filtered.filter(v => v.customer?.kisa_isim === customers.find(c => c.id === selectedCustomer)?.kisa_isim); // ID yerine isim eşleşmesi daha güvenli olabilir
    // Daha doğru filtreleme için ID kullanalım ama visit objesinde customer_id direkt yoksa join'den gelen veriyi kullanamayız.
    // Visit interface'ine customer_id eklemek en doğrusu olurdu ama şimdilik böyle bırakalım.
    
    if (selectedOperator) filtered = filtered.filter(v => v.operator_id === selectedOperator);
    
    if (showCheckedOnly === 'true') filtered = filtered.filter(v => v.is_checked);
    else if (showCheckedOnly === 'false') filtered = filtered.filter(v => !v.is_checked);
    
    setFilteredVisits(filtered);
  };

  // --- İşlem Fonksiyonları ---

  const handleViewDetails = (visit: Visit) => {
    setSelectedVisit(visit);
    setShowDetailsModal(true);
  };

  const handleShowPaidMaterials = (visit: Visit) => {
    setSelectedVisitMaterials(visit);
    setShowPaidMaterialsModal(true);
  };

  const handleCheckVisit = async (visitId: string, currentCheckedStatus: boolean) => {
    try {
      const { error } = await supabase.from('visits').update({ is_checked: !currentCheckedStatus }).eq('id', visitId);
      if (error) throw error;
      
      // Listeyi yerel olarak güncelle (Tekrar fetch etmeye gerek yok)
      const updatedVisits = visits.map(v => v.id === visitId ? { ...v, is_checked: !currentCheckedStatus } : v);
      setVisits(updatedVisits);
      toast.success('Durum güncellendi.');
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    }
  };

  const handleResetFilters = () => {
    setStartDate(''); setEndDate(''); setSelectedStatus(''); setSelectedVisitType('');
    setSelectedCustomer(''); setSelectedBranch(''); setSelectedOperator(''); setShowCheckedOnly('');
    setSearchTerm('');
    setFilteredVisits(visits);
  };

  const handleEditVisit = (visit: Visit) => {
    setEditingVisit(visit);
    const visitDate = new Date(visit.visit_date);
    setEditFormData({
      visitDate: format(visitDate, 'yyyy-MM-dd'),
      visitTime: format(visitDate, 'HH:mm'),
      status: visit.status,
      visitType: visit.visit_type || '',
      notes: visit.notes || '',
      reportNumber: visit.report_number || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingVisit) return;
    try {
      setLoading(true);
      const visitDateTime = `${editFormData.visitDate}T${editFormData.visitTime}:00`; // Saniye eklendi

      const { error } = await supabase.from('visits').update({
        visit_date: visitDateTime,
        status: editFormData.status,
        visit_type: editFormData.visitType,
        notes: editFormData.notes,
        report_number: editFormData.reportNumber
      }).eq('id', editingVisit.id);

      if (error) throw error;

      toast.success('Ziyaret güncellendi');
      setShowEditModal(false);
      fetchData(); // Verileri tazeleyelim
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVisit = async () => {
    if (!visitToDelete) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('visits').delete().eq('id', visitToDelete);
      if (error) throw error;
      
      setVisits(visits.filter(v => v.id !== visitToDelete));
      toast.success('Ziyaret silindi');
    } catch (err: any) {
      toast.error(`Hata: ${err.message}`);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setVisitToDelete(null);
    }
  };

  // --- Helperlar ---
  
  const getVisitTypeText = (type?: string) => {
    const types: Record<string, string> = { 'ilk': 'İlk', 'ucretli': 'Ücretli', 'acil': 'Acil', 'teknik': 'Teknik', 'periyodik': 'Periyodik', 'isyeri': 'İşyeri', 'gozlem': 'Gözlem', 'son': 'Son' };
    return type ? (types[type] || type) : 'Belirtilmemiş';
  };

  const exportToExcel = () => {
    const data = filteredVisits.map(visit => ({
      'Tarih': format(new Date(visit.visit_date), 'dd.MM.yyyy', { locale: tr }),
      'Müşteri': visit.customer?.kisa_isim || 'Belirtilmemiş',
      'Şube': visit.branch?.sube_adi || 'Belirtilmemiş',
      'Operatör': visit.operator?.name || 'Belirtilmemiş',
      'Durum': visit.status === 'completed' ? 'Tamamlandı' : visit.status === 'cancelled' ? 'İptal' : 'Planlandı',
      'Ziyaret Türü': getVisitTypeText(visit.visit_type),
      'Notlar': visit.notes || '',
      'Rapor No': visit.report_number || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ziyaretler');
    XLSX.writeFile(wb, 'ziyaretler.xlsx');
  };

  // --- Tablo Kolonları ---
  const columns = [
    {
      header: '',
      accessor: 'id' as keyof Visit,
      render: (value: string, row: Visit) => (
        <div className="flex justify-center"><input type="checkbox" checked={!!row.is_checked} onChange={() => handleCheckVisit(value, !!row.is_checked)} className="h-4 w-4 cursor-pointer" /></div>
      ),
    },
    {
      header: 'Tarih',
      accessor: 'visit_date' as keyof Visit,
      sortable: true,
      render: (value: string) => <div className="text-xs">{isValid(new Date(value)) ? format(new Date(value), 'dd.MM.yyyy HH:mm') : '-'}</div>
    },
    {
      header: 'Müşteri / Şube',
      accessor: 'customer' as keyof Visit,
      render: (_: any, row: Visit) => (
        <div className="text-xs">
          <div className="font-bold">{row.customer?.kisa_isim}</div>
          <div className="text-gray-500">{row.branch?.sube_adi}</div>
        </div>
      )
    },
    {
      header: 'Operatör',
      accessor: 'operator' as keyof Visit,
      render: (value: any) => <div className="text-xs">{value?.name || '-'}</div>
    },
    {
      header: 'Durum',
      accessor: 'status' as keyof Visit,
      render: (value: string) => {
        const colors: Record<string, string> = { 'completed': 'bg-green-100 text-green-800', 'planned': 'bg-yellow-100 text-yellow-800', 'cancelled': 'bg-red-100 text-red-800' };
        const labels: Record<string, string> = { 'completed': 'Tamamlandı', 'planned': 'Planlandı', 'cancelled': 'İptal' };
        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${colors[value] || 'bg-gray-100'}`}>{labels[value] || value}</span>;
      }
    },
    {
      header: 'Rapor No',
      accessor: 'report_number' as keyof Visit,
      render: (value: string) => <div className="text-xs font-mono">{value || '-'}</div>
    },
    {
      header: 'Malz.',
      accessor: 'paid_materials' as keyof Visit,
      render: (value: any[]) => (
        <div className="text-center">
           {value && value.length > 0 ? <CheckCircle size={14} className="text-green-600 inline" /> : <span className="text-gray-300">-</span>}
        </div>
      )
    }
  ];

  // --- Render ---
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ziyaret Yönetimi</h1>
          <button onClick={() => navigate('/ziyaretler/yeni')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus size={20} /> Yeni Ziyaret
          </button>
        </div>

        {/* Filtreler */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="text" placeholder="Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="p-2 border rounded text-sm" />
            <div className="flex gap-2">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded text-sm w-full" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded text-sm w-full" />
            </div>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="p-2 border rounded text-sm">
                <option value="">Tüm Durumlar</option>
                <option value="planned">Planlandı</option>
                <option value="completed">Tamamlandı</option>
            </select>
            <select value={selectedOperator} onChange={(e) => setSelectedOperator(e.target.value)} className="p-2 border rounded text-sm">
                <option value="">Tüm Operatörler</option>
                {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
        </div>

        {/* Tablo */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <DataTable
                columns={columns}
                data={filteredVisits}
                pagination
                itemsPerPage={pageSize}
                actions={(visit) => (
                    <div className="flex gap-1 justify-end">
                         <button onClick={() => handleViewDetails(visit)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Eye size={16}/></button>
                         <button onClick={() => handleEditVisit(visit)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Edit size={16}/></button>
                         <button onClick={() => { setVisitToDelete(visit.id); setShowDeleteConfirm(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash size={16}/></button>
                    </div>
                )}
            />
        </div>
      </div>

      {/* Modallar */}
      {showDetailsModal && selectedVisit && <VisitDetailsModal visit={selectedVisit} onClose={() => setShowDetailsModal(false)} />}
      {showPaidMaterialsModal && selectedVisitMaterials && <PaidMaterialsModal visitId={selectedVisitMaterials.id} materials={selectedVisitMaterials.paid_materials || []} branchName={selectedVisitMaterials.branch?.sube_adi || ''} onClose={() => setShowPaidMaterialsModal(false)} />}
      
      {/* Delete Confirm */}
      {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-96">
                  <h3 className="font-bold text-lg mb-2">Silme Onayı</h3>
                  <p className="text-gray-600 mb-4">Bu ziyareti silmek istediğinizden emin misiniz?</p>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border rounded">İptal</button>
                      <button onClick={handleDeleteVisit} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Sil</button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingVisit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                  <h3 className="font-bold text-lg mb-4">Ziyaret Düzenle</h3>
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <input type="date" value={editFormData.visitDate} onChange={(e) => setEditFormData({...editFormData, visitDate: e.target.value})} className="p-2 border rounded" />
                          <input type="time" value={editFormData.visitTime} onChange={(e) => setEditFormData({...editFormData, visitTime: e.target.value})} className="p-2 border rounded" />
                      </div>
                      <select value={editFormData.status} onChange={(e) => setEditFormData({...editFormData, status: e.target.value})} className="w-full p-2 border rounded">
                          <option value="planned">Planlandı</option>
                          <option value="completed">Tamamlandı</option>
                          <option value="cancelled">İptal</option>
                      </select>
                      <textarea value={editFormData.notes} onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})} className="w-full p-2 border rounded" rows={3} placeholder="Notlar..."></textarea>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded">İptal</button>
                      <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Kaydet</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminVisits;