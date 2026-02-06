import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, AlertCircle, Eye, X, Search, Edit, Save, Loader2, CalendarClock, CalendarCheck2, CalendarSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import CorrectiveActionModal from '../components/CorrectiveActions/CorrectiveActionModal';
import VisitDetailsModal from '../components/VisitDetailsModal';
import { toast } from 'sonner';
import { format, startOfToday, endOfToday, isBefore, isAfter, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- ARAYÜZLER (INTERFACES) ---
interface Visit {
  id: string;
  customer: { kisa_isim: string; } | null;
  branch?: { sube_adi: string; } | null;
  visit_date: string | null;
  status: 'planned' | 'completed' | 'cancelled';
  visit_type?: string | string[];
  notes?: string;
  equipment_checks?: Record<string, any>;
  pest_types?: string[];
  operator?: { name: string; phone?: string; } | null;
  report_number?: string;
  paid_materials?: any[];
  biocidal_products?: any[];
}

// --- ZİYARET DÜZENLEME MODALI ---
const EditVisitModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  visit: Visit | null;
  onSave: () => void;
}> = ({ isOpen, onClose, visit, onSave }) => {
  const [formData, setFormData] = useState({ 
    visitDate: '', 
    visitTime: '', 
    visitType: '', 
    pestTypes: [] as string[], 
    notes: '' 
  });
  const [saving, setSaving] = useState(false);

  const visitTypes = [
    { id: 'ilk', label: 'İlk' }, { id: 'ucretli', label: 'Ücretli' },
    { id: 'acil', label: 'Acil Çağrı' }, { id: 'teknik', label: 'Teknik İnceleme' },
    { id: 'periyodik', label: 'Periyodik' }, { id: 'isyeri', label: 'İşyeri' },
    { id: 'gozlem', label: 'Gözlem' }, { id: 'son', label: 'Son' }
  ];
  const pestTypes = [
    { id: 'kus', label: 'Kuş' }, { id: 'hasere', label: 'Haşere' },
    { id: 'ari', label: 'Arı' }, { id: 'kemirgen', label: 'Kemirgen' },
    { id: 'yumusakca', label: 'Yumuşakça' }, { id: 'kedi_kopek', label: 'Kedi/Köpek' },
    { id: 'sinek', label: 'Sinek' }, { id: 'surungen', label: 'Sürüngen' },
    { id: 'ambar', label: 'Ambar Zararlısı' }
  ];

  useEffect(() => {
    if (visit?.visit_date) {
      const dateObj = new Date(visit.visit_date);
      if (isValid(dateObj)) {
        setFormData({
          visitDate: format(dateObj, 'yyyy-MM-dd'),
          visitTime: format(dateObj, 'HH:mm'),
          visitType: Array.isArray(visit.visit_type) ? visit.visit_type[0] || '' : visit.visit_type || '',
          pestTypes: visit.pest_types || [],
          notes: visit.notes || ''
        });
      }
    } else {
      setFormData({
        visitDate: format(new Date(), 'yyyy-MM-dd'),
        visitTime: format(new Date(), 'HH:mm'),
        visitType: '',
        pestTypes: [],
        notes: ''
      });
    }
  }, [visit]);

  const handlePestTypeChange = (pestId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      pestTypes: prev.pestTypes.includes(pestId) 
        ? prev.pestTypes.filter(id => id !== pestId) 
        : [...prev.pestTypes, pestId] 
    }));
  };

  const handleSave = async () => {
    if (!visit) return;
    setSaving(true);
    try {
      const visitDateTime = new Date(`${formData.visitDate}T${formData.visitTime}:00`).toISOString();
      const { error } = await supabase
        .from('visits')
        .update({ 
          visit_date: visitDateTime, 
          visit_type: formData.visitType, 
          pest_types: formData.pestTypes, 
          notes: formData.notes 
        })
        .eq('id', visit.id);

      if (error) throw error;
      toast.success("Ziyaret başarıyla güncellendi.");
      onSave();
      onClose();
    } catch (error: any) {
      toast.error("Ziyaret güncellenirken hata: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-none flex flex-col">
        <div className="p-3 sm:p-4 border-b flex justify-between items-center shrink-0">
          <h2 className="text-lg sm:text-xl font-bold">Ziyareti Düzenle</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200"><X size={20} /></button>
        </div>
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Yeni Tarih</label>
              <input type="date" value={formData.visitDate} onChange={e => setFormData({...formData, visitDate: e.target.value})} className="w-full p-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Yeni Saat</label>
              <input type="time" value={formData.visitTime} onChange={e => setFormData({...formData, visitTime: e.target.value})} className="w-full p-2 border rounded-md text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Ziyaret Türü</label>
            <select value={formData.visitType} onChange={e => setFormData({...formData, visitType: e.target.value})} className="w-full p-2 border rounded-md text-sm">
              <option value="">Tür Seçin...</option>
              {visitTypes.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Hedef Zararlılar</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pestTypes.map(type => (
                <label key={type.id} className="flex items-center space-x-2 text-xs sm:text-sm">
                  <input type="checkbox" value={type.id} checked={formData.pestTypes.includes(type.id)} onChange={() => handlePestTypeChange(type.id)} className="form-checkbox text-blue-600"/>
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} className="w-full p-2 border rounded-md text-sm"></textarea>
          </div>
        </div>
        <div className="flex justify-end gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 border-t shrink-0">
          <button onClick={onClose} className="px-3 sm:px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-sm">İptal</button>
          <button onClick={handleSave} disabled={saving} className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1.5 disabled:opacity-50 text-sm">
            {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

// --- ANA BİLEŞEN ---
const Visits: React.FC = () => {
  const navigate = useNavigate();
  
  // State'ler
  const [overdueVisits, setOverdueVisits] = useState<Visit[]>([]);
  const [todayVisits, setTodayVisits] = useState<Visit[]>([]);
  const [futureAndCancelledVisits, setFutureAndCancelledVisits] = useState<Visit[]>([]);
  const [completedVisits, setCompletedVisits] = useState<Visit[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Modal State'leri
  const [showVisitDetails, setShowVisitDetails] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalVisits, setTotalVisits] = useState(0);
  const visitsPerPage = 10;

  // --- VERİ ÇEKME (DÜZELTİLMİŞ) ---
  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!operatorId && !isAdmin) {
        setLoading(false);
        return;
      }

      // --- DÜZELTME: Tüm verileri parçalar halinde çekme (Pagination Limitini Aşmak İçin) ---
      let allVisitsData: any[] = [];
      const fetchPageSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        let baseQuery = supabase
          .from('visits')
          .select(`
            id, visit_date, status, visit_type, notes, report_number, 
            customer:customer_id (kisa_isim), 
            branch:branch_id (sube_adi), 
            operator:operator_id (name, phone)
          `)
          .range(offset, offset + fetchPageSize - 1);

        if (operatorId) {
          baseQuery = baseQuery.eq('operator_id', operatorId);
        }

        if (searchTerm) {
          baseQuery = baseQuery.ilike('report_number', `%${searchTerm}%`);
        }

        const { data, error } = await baseQuery;

        if (error) throw error;

        if (data) {
          allVisitsData = [...allVisitsData, ...data];
          offset += fetchPageSize;
          if (data.length < fetchPageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      
      const safeVisitsData = allVisitsData || [];
      const allVisitIds = safeVisitsData.map(v => v.id);
      
      // 2. Ücretli Malzemeleri Çekme
      let paidMaterialsByVisit: { [key: string]: any[] } = {};

      if (allVisitIds.length > 0) {
        // Chunking for ID list to avoid URL too long error
        const chunkArray = (arr: string[], size: number) => {
            return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );
        };
        
        const chunks = chunkArray(allVisitIds, 200); // 200 ID per request
        let allMaterials: any[] = [];

        for (const chunk of chunks) {
            const { data: materialsData, error: materialsError } = await supabase
            .from('paid_material_sales')
            .select(`
                visit_id, 
                items:paid_material_sale_items(
                quantity,
                product:paid_products(name)
                )
            `)
            .in('visit_id', chunk);

            if (!materialsError && materialsData) {
                allMaterials = [...allMaterials, ...materialsData];
            }
        }

        paidMaterialsByVisit = allMaterials.reduce((acc, sale) => {
            acc[sale.visit_id] = (sale.items as any[]) || [];
            return acc;
        }, {} as { [key: string]: any[] });
      }

      // 3. Veriyi Zenginleştirme
      const allEnhancedVisits: Visit[] = safeVisitsData.map((visit: any) => ({
        ...visit,
        paid_materials: paidMaterialsByVisit[visit.id] || [],
        customer: visit.customer || { kisa_isim: 'Müşteri Silinmiş' },
        branch: visit.branch || { sube_adi: 'Şube Yok' },
        operator: visit.operator || { name: 'Atanmadı' },
        visit_date: visit.visit_date
      }));

      // 4. Gruplama Mantığı
      const today = startOfToday();
      const endToday = endOfToday();

      let overdue: Visit[] = [];
      let todayScheduled: Visit[] = [];
      let completed: Visit[] = [];
      let futureAndCancelled: Visit[] = [];

      for (const visit of allEnhancedVisits) {
        if (!visit.visit_date || !isValid(new Date(visit.visit_date))) {
          if (visit.status === 'completed') completed.push(visit);
          else futureAndCancelled.push(visit);
          continue;
        }
        
        const visitDate = new Date(visit.visit_date);
        
        if (visit.status === 'planned') {
          if (isBefore(visitDate, today)) {
            overdue.push(visit);
          } else if (visitDate >= today && visitDate <= endToday) {
            todayScheduled.push(visit);
          } else if (isAfter(visitDate, endToday)) {
            futureAndCancelled.push(visit);
          }
        } else if (visit.status === 'completed') {
          completed.push(visit);
        } else {
          futureAndCancelled.push(visit);
        }
      }

      // 5. Sıralama
      const sortByDate = (a: Visit, b: Visit, asc: boolean = true) => {
        if (!a.visit_date) return 1;
        if (!b.visit_date) return -1;
        const dateA = new Date(a.visit_date).getTime();
        const dateB = new Date(b.visit_date).getTime();
        return asc ? dateA - dateB : dateB - dateA;
      };

      overdue.sort((a, b) => sortByDate(a, b, true));
      todayScheduled.sort((a, b) => sortByDate(a, b, true));
      futureAndCancelled.sort((a, b) => sortByDate(a, b, true));
      completed.sort((a, b) => sortByDate(a, b, false));

      // State Güncelleme ve Sayfalama (Client-side)
      setOverdueVisits(overdue);
      setTodayVisits(todayScheduled);
      setFutureAndCancelledVisits(futureAndCancelled);
      setTotalVisits(completed.length);
      
      // Tamamlananları sayfala
      const from = (currentPage - 1) * visitsPerPage;
      const to = from + visitsPerPage;
      setCompletedVisits(completed.slice(from, to));

    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [operatorId, isAdmin, currentPage, searchTerm]);

  // --- ETKİLER (EFFECTS) ---

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const localSession = localAuth.getSession();
        if (localSession && localSession.type === 'operator') {
          setOperatorId(localSession.id);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!localSession) {
            navigate('/login');
          }
          return;
        }

        if (user.email === 'admin@ilaclamatik.com') {
            setIsAdmin(true);
            return;
        }

        const { data: operatorData, error } = await supabase.from('operators').select('id').eq('auth_id', user.id).single();

        if (error) {
          if (error.code === 'PGRST116') {
             toast.error("Operatör profili bulunamadı.");
             setError("Operatör profili bulunamadı.");
          } else {
             console.error("Operatör kontrol hatası:", error);
          }
          setLoading(false);
          return;
        }

        if (operatorData) {
          setOperatorId(operatorData.id);
        }
      } catch (err: any) {
        console.error("Auth Error:", err);
        setError(err.message);
        setLoading(false);
      }
    };
    checkUserRole();
  }, [navigate]);

  useEffect(() => {
    if (operatorId || isAdmin) {
      fetchVisits();
    }
  }, [operatorId, isAdmin, currentPage, fetchVisits]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // --- HANDLERS ---
  const handleStartVisit = (visitId: string) => navigate(`/operator/ziyaretler/${visitId}/start`);
  const handleEditVisit = (visit: Visit) => { setEditingVisit(visit); setShowEditModal(true); };
  const handleCreateAction = (visitId: string) => { setSelectedVisitId(visitId); setShowActionModal(true); };
  const handleViewVisit = (visit: Visit) => { setSelectedVisit(visit); setShowVisitDetails(true); };

  // --- HELPERS ---
  const getVisitTypeText = (type?: string | string[]) => {
    if (!type) return 'Belirtilmemiş';
    if (Array.isArray(type)) return type.map(t => getVisitTypeLabel(t)).join(', ');
    return getVisitTypeLabel(type);
  };

  const getVisitTypeLabel = (type: string) => {
    const labels: Record<string, string> = { 'ilk': 'İlk', 'ucretli': 'Ücretli', 'acil': 'Acil', 'teknik': 'Teknik', 'periyodik': 'Periyodik', 'isyeri': 'İşyeri', 'gozlem': 'Gözlem', 'son': 'Son' };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = { 'planned': 'bg-yellow-100 text-yellow-800', 'completed': 'bg-green-100 text-green-800', 'cancelled': 'bg-red-100 text-red-800' };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = { 'planned': 'Planlandı', 'completed': 'Tamamlandı', 'cancelled': 'İptal Edildi' };
    return texts[status] || status;
  };

  // --- RENDER ---
  const renderVisitCard = (visit: Visit) => (
    <div key={visit.id} className="bg-white rounded-lg shadow-sm transition-shadow hover:shadow-md">
      <div className="p-3 sm:p-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 text-xs mb-2">
            <span className="text-gray-500 font-medium">
              {visit.visit_date && isValid(new Date(visit.visit_date))
                ? format(new Date(visit.visit_date), 'dd MMMM yyyy HH:mm', { locale: tr })
                : 'Tarih Yok'}
            </span>
            <div className="flex gap-1.5 flex-wrap">
              <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${getStatusBadge(visit.status)}`}>
                  {getStatusText(visit.status)}
              </span>
              {visit.visit_type && (
                <span className="font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {getVisitTypeText(visit.visit_type)}
                </span>
              )}
            </div>
        </div>
        <div className="font-bold text-sm sm:text-base text-gray-900 mb-1 truncate">
          {visit.customer?.kisa_isim || 'Müşteri Bilgisi Yok'}
        </div>
        <div className="flex justify-between items-center text-xs sm:text-sm text-gray-600">
          <div className="truncate mr-2">{visit.branch?.sube_adi || 'Şube Belirtilmemiş'}</div>
          {visit.report_number && <div className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded shrink-0">#{visit.report_number}</div>}
        </div>
      </div>

      <div className="p-2 sm:p-3 flex justify-end gap-1.5 sm:gap-3 bg-gray-50 rounded-b-lg">
        <button onClick={() => handleCreateAction(visit.id)} className="px-2 sm:px-3 py-1.5 rounded text-orange-600 hover:bg-orange-50 text-xs sm:text-sm font-medium flex items-center transition-colors">
          <AlertCircle size={14} className="mr-1 sm:mr-1.5" /> DÖF
        </button>

        {visit.status === 'completed' ? (
          <button onClick={() => handleViewVisit(visit)} className="px-3 sm:px-4 py-1.5 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm font-medium flex items-center shadow-sm transition-colors">
            <Eye size={14} className="mr-1 sm:mr-1.5" /> İncele
          </button>
        ) : (
          <>
            <button onClick={() => handleEditVisit(visit)} className="px-2 sm:px-3 py-1.5 rounded text-blue-600 hover:bg-blue-50 text-xs sm:text-sm font-medium flex items-center transition-colors">
              <Edit size={14} className="mr-1 sm:mr-1.5" /> Düzenle
            </button>
            <button onClick={() => handleStartVisit(visit.id)} className="px-3 sm:px-4 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 text-xs sm:text-sm font-medium flex items-center shadow-sm transition-colors">
              Başla
            </button>
          </>
        )}
      </div>
    </div>
  );

  const totalPages = Math.ceil(totalVisits / visitsPerPage);

  if (loading && overdueVisits.length === 0 && todayVisits.length === 0 && completedVisits.length === 0 && futureAndCancelledVisits.length === 0) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }
  
  if (error) return (
    <div className="p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
        <AlertCircle className="text-red-600" size={24} />
      </div>
      <h3 className="text-lg font-medium text-gray-900">Bir hata oluştu</h3>
      <p className="mt-2 text-sm text-gray-500">{error}</p>
      <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Sayfayı Yenile</button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-3 sm:p-4 pb-20">
      <div className="flex justify-between items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ziyaret Listesi</h1>
        <button onClick={() => navigate('/operator/ziyaretler/yeni')} className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center shadow-sm transition-colors text-sm sm:text-base shrink-0">
          <Plus size={16} className="mr-1 sm:mr-2" /> Yeni Ziyaret
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Rapor numarası ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 sm:py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm sm:text-base"
          />
          <Search className="absolute left-3 top-3 sm:top-3.5 text-gray-400" size={18} />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 sm:top-3.5 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Loading State (Overlay) */}
      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="animate-spin text-blue-600" size={24} />
        </div>
      )}

      <div className="space-y-5 sm:space-y-8">

        {overdueVisits.length > 0 && (
          <section>
            <h2 className="text-sm sm:text-lg font-bold text-red-600 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 px-1">
              <CalendarClock size={18} className="shrink-0" />
              Geçmiş Planlı ({overdueVisits.length})
            </h2>
            <div className="grid gap-3 sm:gap-4">
              {overdueVisits.map(renderVisitCard)}
            </div>
          </section>
        )}

        {todayVisits.length > 0 && (
          <section>
            <h2 className="text-sm sm:text-lg font-bold text-blue-600 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 px-1">
              <CalendarCheck2 size={18} className="shrink-0" />
              Bugünkü Ziyaretler ({todayVisits.length})
            </h2>
            <div className="grid gap-3 sm:gap-4">
              {todayVisits.map(renderVisitCard)}
            </div>
          </section>
        )}

        {futureAndCancelledVisits.length > 0 && (
          <section>
            <h2 className="text-sm sm:text-lg font-bold text-gray-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 px-1">
              <AlertCircle size={18} className="shrink-0" />
              Diğer / Gelecek / İptal ({futureAndCancelledVisits.length})
            </h2>
            <div className="grid gap-3 sm:gap-4">
              {futureAndCancelledVisits.map(renderVisitCard)}
            </div>
          </section>
        )}

        {(completedVisits.length > 0 || totalPages > 1) && (
          <section>
            <h2 className="text-sm sm:text-lg font-bold text-green-700 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 px-1">
              <CalendarSearch size={18} className="shrink-0" />
              Tamamlanan Ziyaretler
            </h2>
            <div className="grid gap-3 sm:gap-4">
              {completedVisits.map(renderVisitCard)}
            </div>
          </section>
        )}

        {!loading && overdueVisits.length === 0 && todayVisits.length === 0 && completedVisits.length === 0 && futureAndCancelledVisits.length === 0 && (
          <div className="text-center py-10 sm:py-12">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-100 mb-4">
              <Search className="text-gray-400" size={28} />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Ziyaret Bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Arama kriterlerinize uygun kayıt yok.' : 'Listenizde gösterilecek ziyaret bulunmuyor.'}
            </p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 sm:mt-8 pt-4 border-t border-gray-200">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ChevronLeft size={14} className="mr-0.5 sm:mr-1"/> Önceki
            </button>
            <span className="text-xs sm:text-sm text-gray-600">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Sonraki <ChevronRight size={14} className="ml-0.5 sm:ml-1"/>
            </button>
        </div>
      )}

      {/* Modallar */}
      {showActionModal && (
        <CorrectiveActionModal 
          isOpen={showActionModal} 
          onClose={() => { setShowActionModal(false); setSelectedVisitId(null); }} 
          visitId={selectedVisitId || undefined} 
          onSave={fetchVisits} 
        />
      )}
      
      {showVisitDetails && selectedVisit && (
        <VisitDetailsModal 
          visit={selectedVisit as any} 
          onClose={() => { setShowVisitDetails(false); setSelectedVisit(null); }} 
        />
      )}
      
      {showEditModal && (
        <EditVisitModal 
          isOpen={showEditModal} 
          onClose={() => setShowEditModal(false)} 
          visit={editingVisit} 
          onSave={fetchVisits} 
        />
      )}
    </div>
  );
};

export default Visits;