import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, AlertCircle, Eye, X, Search, Edit, Loader2, CalendarClock, CalendarCheck2, CalendarSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalVisits, setTotalVisits] = useState(0);
  const visitsPerPage = 10;

  // --- VERİ ÇEKME ---
  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Eğer operatör ID yoksa ve Admin değilse işlem yapma
      if (!operatorId && !isAdmin) {
        setLoading(false);
        return;
      }

      const from = (currentPage - 1) * visitsPerPage;
      const to = from + visitsPerPage - 1;

      // 1. Ana Ziyaret Sorgusu
      let baseQuery = supabase
        .from('visits')
        .select(`
          id, visit_date, status, visit_type, notes, report_number, 
          customer:customer_id (kisa_isim), 
          branch:branch_id (sube_adi), 
          operator:operator_id (name, phone)
        `);

      if (operatorId) {
        baseQuery = baseQuery.eq('operator_id', operatorId);
      }

      if (searchTerm) {
        baseQuery = baseQuery.or(`customer.kisa_isim.ilike.%${searchTerm}%,branch.sube_adi.ilike.%${searchTerm}%,report_number.ilike.%${searchTerm}%`);
      }

      const { data: allVisitsData, error: allError } = await baseQuery;
      
      if (allError) throw allError;

      const safeVisitsData = allVisitsData || [];
      const allVisitIds = safeVisitsData.map(v => v.id);
      
      // 2. Ücretli Malzemeleri Çekme
      let paidMaterialsByVisit: { [key: string]: any[] } = {};

      if (allVisitIds.length > 0) {
        const { data: materialsData, error: materialsError } = await supabase
          .from('paid_material_sales')
          .select(`
            visit_id, 
            items:paid_material_sale_items(
              quantity,
              product:paid_products(name)
            )
          `)
          .in('visit_id', allVisitIds);
          
        if (!materialsError && materialsData) {
          paidMaterialsByVisit = (materialsData || []).reduce((acc, sale) => {
            acc[sale.visit_id] = (sale.items as any[]) || [];
            return acc;
          }, {} as { [key: string]: any[] });
        }
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

      // 4. Gruplama
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

      setOverdueVisits(overdue);
      setTodayVisits(todayScheduled);
      setFutureAndCancelledVisits(futureAndCancelled);
      setTotalVisits(completed.length);
      setCompletedVisits(completed.slice(from, to + 1));

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
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
  
  // DEĞİŞİKLİK: Düzenle butonu artık modal açmaz, detay sayfasına yönlendirir
  const handleEditVisit = (visit: Visit) => {
    navigate(`/operator/ziyaretler/${visit.id}/start`);
  };

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
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-gray-500 font-medium">
              {visit.visit_date && isValid(new Date(visit.visit_date)) 
                ? format(new Date(visit.visit_date), 'dd MMMM yyyy HH:mm', { locale: tr }) 
                : 'Tarih Yok'}
            </span>
            <div className="flex gap-2">
              <span className={`font-semibold px-2.5 py-0.5 rounded-full text-xs ${getStatusBadge(visit.status)}`}>
                  {getStatusText(visit.status)}
              </span>
              {visit.visit_type && (
                <span className="font-semibold px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                    {getVisitTypeText(visit.visit_type)}
                </span>
              )}
            </div>
        </div>
        <div className="font-bold text-base text-gray-900 mb-1">
          {visit.customer?.kisa_isim || 'Müşteri Bilgisi Yok'}
        </div>
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>{visit.branch?.sube_adi || 'Şube Belirtilmemiş'}</div>
          {visit.report_number && <div className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">#{visit.report_number}</div>}
        </div>
      </div>
      
      <div className="p-3 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
        <button onClick={() => handleCreateAction(visit.id)} className="px-3 py-1.5 rounded text-orange-600 hover:bg-orange-50 text-sm font-medium flex items-center transition-colors">
          <AlertCircle size={16} className="mr-1.5" /> DÖF
        </button>
        
        {visit.status === 'completed' ? (
          <div className="flex gap-2">
             <button 
                onClick={() => handleEditVisit(visit)} 
                className="px-3 py-1.5 rounded bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 text-sm font-medium flex items-center shadow-sm transition-colors"
             >
               <Edit size={16} className="mr-1.5" /> Düzenle
             </button>
             
             <button 
                onClick={() => handleViewVisit(visit)} 
                className="px-4 py-1.5 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium flex items-center shadow-sm transition-colors"
             >
               <Eye size={16} className="mr-1.5" /> İncele
             </button>
          </div>
        ) : (
          <>
            <button onClick={() => handleEditVisit(visit)} className="px-3 py-1.5 rounded text-blue-600 hover:bg-blue-50 text-sm font-medium flex items-center transition-colors">
              <Edit size={16} className="mr-1.5" /> Düzenle
            </button>
            <button onClick={() => handleStartVisit(visit.id)} className="px-4 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 text-sm font-medium flex items-center shadow-sm transition-colors">
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
    <div className="max-w-5xl mx-auto p-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ziyaret Listesi</h1>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={() => navigate('/operator/ziyaretler/yeni')} className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center shadow-sm transition-colors">
            <Plus size={18} className="mr-2" /> Yeni Ziyaret
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Müşteri, şube veya rapor no ile ara..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
              <X size={20} />
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

      <div className="space-y-8">
        
        {/* GRUP 1: Geçmiş Planlı */}
        {overdueVisits.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2 px-1">
              <CalendarClock size={20} />
              Geçmiş Planlı Ziyaretler ({overdueVisits.length})
            </h2>
            <div className="grid gap-4">
              {overdueVisits.map(renderVisitCard)}
            </div>
          </section>
        )}

        {/* GRUP 2: Bugün */}
        {todayVisits.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-blue-600 mb-3 flex items-center gap-2 px-1">
              <CalendarCheck2 size={20} />
              Bugünkü Ziyaretler ({todayVisits.length})
            </h2>
            <div className="grid gap-4">
              {todayVisits.map(renderVisitCard)}
            </div>
          </section>
        )}

        {/* GRUP 3: Diğer */}
        {futureAndCancelledVisits.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2 px-1">
              <AlertCircle size={20} />
              Diğer / Gelecek / İptal ({futureAndCancelledVisits.length})
            </h2>
            <div className="grid gap-4">
              {futureAndCancelledVisits.map(renderVisitCard)}
            </div>
          </section>
        )}

        {/* GRUP 4: Tamamlananlar */}
        {(completedVisits.length > 0 || totalPages > 1) && (
          <section>
            <h2 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2 px-1">
              <CalendarSearch size={20} />
              Tamamlanan Ziyaretler
            </h2>
            <div className="grid gap-4">
              {completedVisits.map(renderVisitCard)}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && overdueVisits.length === 0 && todayVisits.length === 0 && completedVisits.length === 0 && futureAndCancelledVisits.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Ziyaret Bulunamadı</h3>
            <p className="mt-1 text-gray-500">
              {searchTerm ? 'Arama kriterlerinize uygun kayıt yok.' : 'Listenizde gösterilecek ziyaret bulunmuyor.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-200">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1} 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ChevronLeft size={16} className="mr-1"/> Önceki
            </button>
            <span className="text-sm text-gray-600">Sayfa {currentPage} / {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages} 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Sonraki <ChevronRight size={16} className="ml-1"/>
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
    </div>
  );
};

export default Visits;