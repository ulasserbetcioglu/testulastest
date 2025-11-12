import React, { useState, useEffect, useCallback } from 'react';
// GÜNCELLEME: İkonlar aynı kaldı, sadece yerleri değişecek
import { Plus, ChevronLeft, ChevronRight, AlertCircle, Eye, X, Search, Edit, Save, Loader2, CalendarClock, CalendarCheck2, CalendarSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CorrectiveActionModal from '../components/CorrectiveActions/CorrectiveActionModal';
import VisitDetailsModal from '../components/VisitDetailsModal';
import { toast } from 'sonner';
// GÜNCELLEME: 'isAfter' importu eklendi (Gelecek ziyaretler için)
import { format, startOfToday, endOfToday, isBefore, isAfter } from 'date-fns';

// --- ARAYÜZLER (INTERFACES) ---
interface Visit {
  id: string;
  customer: { kisa_isim: string; } | null; // GÜNCELLEME: Müşteri null olabilir (Beyaz ekran hatası için)
  branch?: { sube_adi: string; };
  visit_date: string; // GÜNCELLEME: Null kontrolü fetch içinde yapılacak
  status: 'planned' | 'completed' | 'cancelled';
  visit_type?: string | string[];
  notes?: string;
  equipment_checks?: Record<string, any>;
  pest_types?: string[];
  operator?: { name: string; phone?: string; };
  report_number?: string;
  paid_materials?: any[];
  biocidal_products?: any[];
}

// --- ZİYARET DÜZENLEME MODALI (Değişiklik yok) ---
const EditVisitModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  visit: Visit | null;
  onSave: () => void;
}> = ({ isOpen, onClose, visit, onSave }) => {
  const [formData, setFormData] = useState({ visitDate: '', visitTime: '', visitType: '', pestTypes: [] as string[], notes: '' });
  const [saving, setSaving] = useState(false);

  // ... (Modal içeriği - Değişiklik yok) ...
  
  useEffect(() => {
    // GÜNCELLEME: visit_date null ise çökmemesi için kontrol
    if (visit && visit.visit_date) {
      const visitDate = new Date(visit.visit_date);
      setFormData({
        visitDate: format(visitDate, 'yyyy-MM-dd'),
        visitTime: format(visitDate, 'HH:mm'),
        visitType: Array.isArray(visit.visit_type) ? visit.visit_type[0] || '' : visit.visit_type || '',
        pestTypes: visit.pest_types || [],
        notes: visit.notes || ''
      });
    } else if (visit) {
       // visit_date null ise varsayılan değer ata
       setFormData({
            visitDate: format(new Date(), 'yyyy-MM-dd'),
            visitTime: format(new Date(), 'HH:mm'),
            visitType: Array.isArray(visit.visit_type) ? visit.visit_type[0] || '' : visit.visit_type || '',
            pestTypes: visit.pest_types || [],
            notes: visit.notes || ''
       });
    }
  }, [visit]);

  // ... (Modal fonksiyonları - Değişiklik yok) ...

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* ... (Modal JSX - Değişiklik yok) ... */}
    </div>
  );
};


// --- ANA BİLEŞEN ---
const Visits: React.FC = () => {
  const navigate = useNavigate();
  // GÜNCELLEME: State'ler yeniden yapılandırıldı
  const [overdueVisits, setOverdueVisits] = useState<Visit[]>([]); // Geçmiş Planlı
  const [todayVisits, setTodayVisits] = useState<Visit[]>([]); // Bugün Planlı
  const [futureAndCancelledVisits, setFutureAndCancelledVisits] = useState<Visit[]>([]); // Gelecek Planlı ve İptaller (Sayfalanmaz)
  const [completedVisits, setCompletedVisits] = useState<Visit[]>([]); // Tamamlananlar (Sayfalanır)

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [showVisitDetails, setShowVisitDetails] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalVisits, setTotalVisits] = useState(0); // Artık "TAMAMLANAN" ziyaretlerin toplamını tutacak
  const visitsPerPage = 10;

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      if (!operatorId) return;

      const from = (currentPage - 1) * visitsPerPage;
      const to = from + visitsPerPage - 1;

      let baseQuery = supabase
        .from('visits')
        .select(`id, visit_date, status, visit_type, notes, report_number, customer:customer_id (kisa_isim), branch:branch_id (sube_adi), operator:operator_id (name, phone)`)
        .eq('operator_id', operatorId);

      if (searchTerm) {
        baseQuery = baseQuery.or(`customer.kisa_isim.ilike.%${searchTerm}%,branch.sube_adi.ilike.%${searchTerm}%,report_number.ilike.%${searchTerm}%`);
      }

      const { data: allVisitsData, error: allError } = await baseQuery;
      
      if (allError) throw allError;

      const allVisitIds = (allVisitsData || []).map(v => v.id);
      let paidMaterialsByVisit: { [key: string]: any[] } = {};

      if (allVisitIds.length > 0) {
        const { data: materialsData, error: materialsError } = await supabase
          .from('paid_material_sales')
          .select('visit_id, items:paid_material_sale_items(product:product_id(name), quantity)')
          .in('visit_id', allVisitIds);
          
        if (materialsError) throw materialsError;

        paidMaterialsByVisit = (materialsData || []).reduce((acc, sale) => {
          acc[sale.visit_id] = (sale.items as any[]) || [];
          return acc;
        }, {} as { [key: string]: any[] });
      }

      const allEnhancedVisits = (allVisitsData || []).map(visit => ({
        ...visit,
        paid_materials: paidMaterialsByVisit[visit.id] || [],
      }));

      // GÜNCELLEME: Ziyaretleri 4 gruba ayır
      const today = startOfToday();
      const endToday = endOfToday();

      let overdue: Visit[] = [];
      let todayScheduled: Visit[] = [];
      let completed: Visit[] = [];
      let futureAndCancelled: Visit[] = [];

      for (const visit of allEnhancedVisits) {
        // Beyaz ekran koruması: Tarih veya müşteri bilgisi bozuksa
        if (!visit.visit_date || !visit.customer) {
            if (visit.status === 'completed') completed.push(visit);
            else futureAndCancelled.push(visit); // Sorunlu kayıtları bu gruba at
            continue;
        }
        
        const visitDate = new Date(visit.visit_date);
        
        if (visit.status === 'planned') {
          if (isBefore(visitDate, today)) {
            overdue.push(visit);
          } else if (visitDate >= today && visitDate <= endToday) {
            todayScheduled.push(visit);
          } else if (isAfter(visitDate, endToday)) { // Gelecek planlı
            futureAndCancelled.push(visit);
          }
        } else if (visit.status === 'completed') {
          completed.push(visit);
        } else { // 'cancelled' vs.
          futureAndCancelled.push(visit);
        }
      }

      // GÜNCELLEME: Grupları sırala
      // Geçmiş: Eskiden yeniye
      overdue.sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());
      // Bugün: Eskiden yeniye
      todayScheduled.sort((a, b) => new Date(a.visit_date).getTime() - new Date(a.visit_date).getTime());
      
      // Diğer (Gelecek/İptal): Önce planlılar (eskiden yeniye), sonra iptaller (yeniden eskiye)
      futureAndCancelled.sort((a, b) => {
        if (a.status === 'planned' && b.status !== 'planned') return -1;
        if (a.status !== 'planned' && b.status === 'planned') return 1;
        if (a.status === 'planned' && b.status === 'planned') {
            return new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime();
        }
        return new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime();
      });
      
      // Tamamlanan: Yeniden eskiye (en son tamamlanan üstte)
      completed.sort((a, b) => {
         if (!a.visit_date) return 1; // null tarihleri sona at
         if (!b.visit_date) return -1;
         return new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime();
      });

      // GÜNCELLEME: State'leri ayarla
      setOverdueVisits(overdue);
      setTodayVisits(todayScheduled);
      setFutureAndCancelledVisits(futureAndCancelled); // Sayfalanmaz
      
      // "Tamamlanan" grubunu sayfalama
      setTotalVisits(completed.length);
      setCompletedVisits(completed.slice(from, to + 1)); // Sayfalanır

    } catch (err: any) {
      setError(err.message);
      toast.error("Ziyaretler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [operatorId, currentPage, searchTerm]); // fetchVisits bağımlılıkları

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/login'); // Kullanıcı yoksa login'e yönlendir
            return;
        }
        const { data: operatorData, error: operatorError } = await supabase.from('operators').select('id').eq('auth_id', user.id).single();
        
        if (operatorError && operatorError.code === 'PGRST116') { // Operatör bulunamadı
             toast.error("Operatör profili bulunamadı.");
             setError("Operatör profili bulunamadı.");
             setLoading(false);
             return;
        }
        if (operatorError) throw operatorError;

        if (operatorData) {
          setOperatorId(operatorData.id);
        } else {
          setLoading(false);
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    checkUserRole();
  }, [navigate]); // navigate bağımlılıklara eklendi

  useEffect(() => {
    if (operatorId) {
      fetchVisits();
    }
  }, [operatorId, currentPage, fetchVisits]);
  
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm]);

  const handleStartVisit = (visitId: string) => {
    navigate(`/operator/ziyaretler/${visitId}/start`);
  };
  
  const handleEditVisit = (visit: Visit) => {
    setEditingVisit(visit);
    setShowEditModal(true);
  };

  const handleCreateAction = (visitId: string) => {
    setSelectedVisitId(visitId);
    setShowActionModal(true);
  };

  const handleViewVisit = (visit: Visit) => {
    setSelectedVisit(visit);
    setShowVisitDetails(true);
  };

  // ... (getVisitTypeText, getVisitTypeLabel, getStatusBadge, getStatusText fonksiyonları değişiklik yok) ...
  const getVisitTypeText = (type?: string | string[]) => {
    if (!type) return 'Belirtilmemiş';
    if (Array.isArray(type)) {
      return type.length > 0 ? type.map(t => getVisitTypeLabel(t)).join(', ') : 'Belirtilmemiş';
    }
    return getVisitTypeLabel(type);
  };

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case 'ilk': return 'İlk';
      case 'ucretli': return 'Ücretli';
      case 'acil': return 'Acil';
      case 'teknik': return 'Teknik';
      case 'periyodik': return 'Periyodik';
      case 'isyeri': return 'İşyeri';
      case 'gozlem': return 'Gözlem';
      case 'son': return 'Son';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planned':
        return 'Planlandı';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return status;
    }
  };

  // GÜNCELLEME: Sayfalanan "completedVisits" listesi için toplam sayfa
  const totalPages = Math.ceil(totalVisits / visitsPerPage);

  // GÜNCELLEME: Ziyaret kartını render etmek için yardımcı fonksiyon
  const renderVisitCard = (visit: Visit) => (
    <div key={visit.id} className="bg-white rounded-lg shadow-sm">
      <div className="p-3 border-b border-gray-100">
        <div className="flex justify-between items-center text-xs mb-1">
            {/* GÜNCELLEME: visit_date null ise çökmeyi engelle (Beyaz ekran hatası) */}
            <span className="text-gray-500">{visit.visit_date ? new Date(visit.visit_date).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Tarih Yok'}</span>
            <div className="flex gap-2">
              <span className={`font-semibold px-2 py-1 rounded-full text-xs ${getStatusBadge(visit.status)}`}>
                  {getStatusText(visit.status)}
              </span>
              <span className="font-semibold px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                  {getVisitTypeText(visit.visit_type)}
              </span>
            </div>
        </div>
        {/* GÜNCELLEME: Müşteri null ise çökmeyi engelle (Beyaz ekran hatası) */}
        <div className="font-bold text-sm">{visit.customer ? visit.customer.kisa_isim : 'Müşteri Bilgisi Yok'}</div>
        <div className="flex justify-between items-center mt-1">
          <div className="text-xs text-gray-700">{visit.branch ? visit.branch.sube_adi : ''}</div>
          {visit.report_number && <div className="text-xs text-gray-600">Rapor: {visit.report_number}</div>}
        </div>
      </div>
      <div className="p-2 flex justify-end gap-2">
        <button onClick={() => handleCreateAction(visit.id)} className="px-3 py-1 rounded-lg text-white bg-orange-500 hover:bg-orange-600 text-xs flex items-center" title="DÖF Ekle"><AlertCircle size={14} className="mr-1" /> DÖF</button>
        {visit.status === 'completed' ? (
          <button onClick={() => handleViewVisit(visit)} className="px-3 py-1 rounded-lg text-white bg-gray-500 hover:bg-gray-600 flex items-center text-xs"><Eye size={14} className="mr-1" /> İncele</button>
        ) : (
          <>
            <button onClick={() => handleEditVisit(visit)} className="px-3 py-1 rounded-lg text-white bg-blue-500 hover:bg-blue-600 flex items-center text-xs"><Edit size={14} className="mr-1" /> Düzenle</button>
            <button onClick={() => handleStartVisit(visit.id)} className="px-3 py-1 rounded-lg text-white bg-green-500 hover:bg-green-600 text-xs">Başla</button>
          </>
        )}
      </div>
    </div>
  );

  // GÜNCELLEME: İlk yüklemede ve hiç ziyaret yokken gösterilecek içerik
  if (loading && overdueVisits.length === 0 && todayVisits.length === 0 && completedVisits.length === 0 && futureAndCancelledVisits.length === 0) {
    return <div className="p-4 text-center"><Loader2 className="animate-spin text-red-600" size={32} /></div>;
  }
  
  if (error) return <div className="p-4 text-center text-red-500">Hata: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-2">
      <div className="flex justify-between items-center mb-4">
        {/* ... (Başlık ve Butonlar - Değişiklik yok) ... */}
        <h1 className="text-xl font-bold">Kontrol Listesi</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/operator/ziyaretler/yeni')} className="w-10 h-10 bg-red-600 text-white rounded-lg flex items-center justify-center hover:bg-red-700" title="Yeni Ziyaret"><Plus size={20} /></button>
          <button onClick={() => setShowActionModal(true)} className="w-10 h-10 bg-orange-500 text-white rounded-lg flex items-center justify-center hover:bg-orange-600" title="Düzeltici Önleyici Faaliyet Ekle"><AlertCircle size={20} /></button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm mb-4">
        {/* ... (Arama Çubuğu - Değişiklik yok) ... */}
        <div className="relative">
          <input type="text" placeholder="Müşteri, şube veya rapor no ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border-0 focus:ring-0"/>
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          {searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"><X size={18} /></button>)}
        </div>
      </div>

      {/* GÜNCELLEME: Yüklenme göstergesi (sadece listeler boşken) */}
      {loading && overdueVisits.length === 0 && todayVisits.length === 0 && completedVisits.length === 0 && futureAndCancelledVisits.length === 0 && (
          <div className="text-center p-4"><Loader2 className="animate-spin text-red-600"/></div>
      )}

      {/* GÜNCELLEME: Yeni gruplanmış render mantığı */}
      <div className="space-y-4">
        
        {/* GRUP 1: Geçmiş Planlı Ziyaretler (Değişiklik yok) */}
        {overdueVisits.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
              <CalendarClock size={20} />
              Geçmiş Planlı Ziyaretler ({overdueVisits.length})
            </h2>
            <div className="space-y-2">
              {overdueVisits.map(renderVisitCard)}
            </div>
          </section>
        )}

        {/* GRUP 2: Bugünkü Ziyaretler (Değişiklik yok) */}
        {todayVisits.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-blue-600 mb-2 flex items-center gap-2">
              <CalendarCheck2 size={20} />
              Bugünkü Ziyaretler ({todayVisits.length})
            </h2>
            <div className="space-y-2">
              {todayVisits.map(renderVisitCard)}
            </div>
          </section>
        )}

        {/* GÜNCELLEME - YENİ GRUP 3: Diğer (Gelecek/İptal) (Sayfalanmaz) */}
        {futureAndCancelledVisits.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
              <AlertCircle size={20} />
              Diğer (Gelecek / İptal) ({futureAndCancelledVisits.length})
            </h2>
            <div className="space-y-2">
              {futureAndCancelledVisits.map(renderVisitCard)}
            </div>
          </section>
        )}

        {/* GÜNCELLEME - YENİ GRUP 4: Tamamlanan Ziyaretler (Sayfalamalı) */}
        {(completedVisits.length > 0 || totalPages > 1) && (
          <section>
            <h2 className="text-lg font-bold text-green-700 mb-2 flex items-center gap-2">
              <CalendarSearch size={20} />
              Tamamlanan Ziyaretler (Geçmiş)
            </h2>
            {completedVisits.length > 0 ? (
              <div className="space-y-2">
                {completedVisits.map(renderVisitCard)}
              </div>
            ) : (
              // Sayfalama varsa ama o sayfada sonuç yoksa
              !loading && <div className="bg-white rounded-lg shadow-sm p-4 text-center text-gray-500">Bu sayfada başka ziyaret yok.</div>
            )}
          </section>
        )}

        {/* GÜNCELLEME: Hiçbir sonuç bulunamadı durumu */}
        {!loading && overdueVisits.length === 0 && todayVisits.length === 0 && completedVisits.length === 0 && futureAndCancelledVisits.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 text-center text-gray-500">
            {searchTerm ? 'Arama kriterine uygun ziyaret bulunamadı' : 'Gösterilecek ziyaret bulunamadı'}
          </div>
        )}

      </div>

      {/* GÜNCELLEME: Sayfalama artık sadece "Tamamlanan Ziyaretler" için geçerli */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center p-4 mt-4">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50 flex items-center gap-2"><ChevronLeft size={16}/> Önceki</button>
            <span className="text-sm font-medium">Sayfa {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50 flex items-center gap-2">Sonraki <ChevronRight size={16}/></button>
        </div>
      )}

      {/* MODALLAR (Değişiklik yok) */}
      <CorrectiveActionModal isOpen={showActionModal} onClose={() => { setShowActionModal(false); setSelectedVisitId(null); }} visitId={selectedVisitId || undefined} onSave={fetchVisits} />
      {showVisitDetails && selectedVisit && (<VisitDetailsModal visit={selectedVisit as any} onClose={() => { setShowVisitDetails(false); setSelectedVisit(null); }} />)}
      <EditVisitModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} visit={editingVisit} onSave={fetchVisits} />
    </div>
  );
};

export default Visits;