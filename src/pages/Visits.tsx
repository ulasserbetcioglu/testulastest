import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, AlertCircle, Eye, X, Search, Edit, Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CorrectiveActionModal from '../components/CorrectiveActions/CorrectiveActionModal';
import VisitDetailsModal from '../components/VisitDetailsModal';
import { toast } from 'sonner';
import { format } from 'date-fns';

// --- ARAYÜZLER (INTERFACES) ---
interface Visit {
  id: string;
  customer: { kisa_isim: string; };
  branch?: { sube_adi: string; };
  visit_date: string;
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

// --- ZİYARET DÜZENLEME MODALI ---
const EditVisitModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  visit: Visit | null;
  onSave: () => void;
}> = ({ isOpen, onClose, visit, onSave }) => {
  const [formData, setFormData] = useState({ visitDate: '', visitTime: '', visitType: '', pestTypes: [] as string[], notes: '' });
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
    if (visit) {
      const visitDate = new Date(visit.visit_date);
      setFormData({
        visitDate: format(visitDate, 'yyyy-MM-dd'),
        visitTime: format(visitDate, 'HH:mm'),
        visitType: Array.isArray(visit.visit_type) ? visit.visit_type[0] || '' : visit.visit_type || '',
        pestTypes: visit.pest_types || [],
        notes: visit.notes || ''
      });
    }
  }, [visit]);

  const handlePestTypeChange = (pestId: string) => {
    setFormData(prev => ({ ...prev, pestTypes: prev.pestTypes.includes(pestId) ? prev.pestTypes.filter(id => id !== pestId) : [...prev.pestTypes, pestId] }));
  };

  const handleSave = async () => {
    if (!visit) return;
    setSaving(true);
    try {
      const visitDateTime = new Date(`${formData.visitDate}T${formData.visitTime}:00`).toISOString();
      const { error } = await supabase.from('visits').update({ visit_date: visitDateTime, visit_type: formData.visitType, pest_types: formData.pestTypes, notes: formData.notes }).eq('id', visit.id);
      if (error) throw error;
      toast.success("Ziyaret başarıyla güncellendi.");
      onSave();
      onClose();
    } catch (error: any) {
      toast.error("Ziyaret güncellenirken bir hata oluştu: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-4 border-b flex justify-between items-center"><h2 className="text-xl font-bold">Ziyareti Düzenle</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X size={20} /></button></div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Yeni Tarih</label><input type="date" value={formData.visitDate} onChange={e => setFormData({...formData, visitDate: e.target.value})} className="w-full p-2 border rounded-md" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Yeni Saat</label><input type="time" value={formData.visitTime} onChange={e => setFormData({...formData, visitTime: e.target.value})} className="w-full p-2 border rounded-md" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Ziyaret Türü</label><select value={formData.visitType} onChange={e => setFormData({...formData, visitType: e.target.value})} className="w-full p-2 border rounded-md"><option value="">Tür Seçin...</option>{visitTypes.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Hedef Zararlılar</label><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{pestTypes.map(type => (<label key={type.id} className="flex items-center space-x-2 text-sm"><input type="checkbox" value={type.id} checked={formData.pestTypes.includes(type.id)} onChange={() => handlePestTypeChange(type.id)} className="form-checkbox text-blue-600"/><span>{type.label}</span></label>))}</div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label><textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={4} className="w-full p-2 border rounded-md"></textarea></div>
        </div>
        <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t"><button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">İptal</button><button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Kaydet</button></div>
      </div>
    </div>
  );
};


// --- ANA BİLEŞEN ---
const Visits: React.FC = () => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
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
  const [totalVisits, setTotalVisits] = useState(0);
  const visitsPerPage = 10;

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      if (!operatorId) return;

      const from = (currentPage - 1) * visitsPerPage;
      const to = from + visitsPerPage - 1;

      let query = supabase
        .from('visits')
        .select(`id, visit_date, status, visit_type, notes, report_number, customer:customer_id (kisa_isim), branch:branch_id (sube_adi), operator:operator_id (name, phone)`, { count: 'exact' })
        .eq('operator_id', operatorId);

      if (searchTerm) {
        query = query.or(`customer.kisa_isim.ilike.%${searchTerm}%,branch.sube_adi.ilike.%${searchTerm}%,report_number.ilike.%${searchTerm}%`);
      }

      // GÜNCELLEME: Custom sıralama için CASE kullan
      // planned ziyaretler önce (0), diğerleri sonra (1)
      let baseQuery = supabase
        .from('visits')
        .select(`id, visit_date, status, visit_type, notes, report_number, customer:customer_id (kisa_isim), branch:branch_id (sube_adi), operator:operator_id (name, phone)`, { count: 'exact' })
        .eq('operator_id', operatorId);

      if (searchTerm) {
        baseQuery = baseQuery.or(`customer.kisa_isim.ilike.%${searchTerm}%,branch.sube_adi.ilike.%${searchTerm}%,report_number.ilike.%${searchTerm}%`);
      }

      // İlk önce tüm veriyi çek, sonra sırala ve sayfalara böl
      const { data: allVisitsData, error: allError, count } = await baseQuery;
      
      if (allError) throw allError;

      // Client-side'da tam sıralama yap
      let sortedVisits = (allVisitsData || []).sort((a, b) => {
        // Önce planned ziyaretler (eskiden yeniye)
        if (a.status === 'planned' && b.status !== 'planned') return -1;
        if (a.status !== 'planned' && b.status === 'planned') return 1;
        
        // Planned ziyaretler kendi arasında eskiden yeniye
        if (a.status === 'planned' && b.status === 'planned') {
          return new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime();
        }
        
        // Diğer ziyaretler kendi arasında yeniden eskiye
        if (a.status !== 'planned' && b.status !== 'planned') {
          return new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime();
        }
        
        return 0;
      });

      // Sayfalama uygula
      const visitsData = sortedVisits.slice(from, to + 1);
      
      // DÜZELTME: Ücretli malzemeleri çek ve ziyaretlerle eşleştir
      const visitIds = (visitsData || []).map(v => v.id);
      let paidMaterialsByVisit = {};

      if (visitIds.length > 0) {
        const { data: materialsData, error: materialsError } = await supabase
          .from('paid_material_sales')
          .select('visit_id, items:paid_material_sale_items(product:product_id(name), quantity)')
          .in('visit_id', visitIds);
        
        if (materialsError) throw materialsError;

        paidMaterialsByVisit = (materialsData || []).reduce((acc, sale) => {
          acc[sale.visit_id] = sale.items || [];
          return acc;
        }, {});
      }

      let enhancedVisits = visitsData.map(visit => ({
        ...visit,
        paid_materials: paidMaterialsByVisit[visit.id] || [],
      }));
      
      setVisits(enhancedVisits);
      setTotalVisits(count || 0);

    } catch (err: any) {
      setError(err.message);
      toast.error("Ziyaretler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [operatorId, currentPage, searchTerm]);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Kullanıcı bulunamadı');
        const { data: operatorData, error: operatorError } = await supabase.from('operators').select('id').eq('auth_id', user.id).single();
        if (operatorError && operatorError.code !== 'PGRST116') throw operatorError;
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
  }, []);

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

  // GÜNCELLEME: Durum badge'i için renk belirleme fonksiyonu
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

  const totalPages = Math.ceil(totalVisits / visitsPerPage);

  if (loading && visits.length === 0) return <div className="p-4 text-center"><Loader2 className="animate-spin"/></div>;
  if (error) return <div className="p-4 text-center text-red-500">Hata: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-2">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Kontrol Listesi</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/operator/ziyaretler/yeni')} className="w-10 h-10 bg-red-600 text-white rounded-lg flex items-center justify-center hover:bg-red-700" title="Yeni Ziyaret"><Plus size={20} /></button>
          <button onClick={() => setShowActionModal(true)} className="w-10 h-10 bg-orange-500 text-white rounded-lg flex items-center justify-center hover:bg-orange-600" title="Düzeltici Önleyici Faaliyet Ekle"><AlertCircle size={20} /></button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm mb-4">
        <div className="relative">
          <input type="text" placeholder="Müşteri, şube veya rapor no ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border-0 focus:ring-0"/>
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          {searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"><X size={18} /></button>)}
        </div>
      </div>

      <div className="space-y-2">
        {loading && <div className="text-center p-4"><Loader2 className="animate-spin"/></div>}
        {!loading && visits.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-4 text-center text-gray-500">
            {searchTerm ? 'Arama kriterine uygun ziyaret bulunamadı' : 'Ziyaret bulunamadı'}
          </div>
        ) : (
          visits.map((visit) => (
            <div key={visit.id} className="bg-white rounded-lg shadow-sm">
              <div className="p-3 border-b border-gray-100">
                <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-gray-500">{new Date(visit.visit_date).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="flex gap-2">
                      {/* GÜNCELLEME: Durum badge'i eklendi */}
                      <span className={`font-semibold px-2 py-1 rounded-full text-xs ${getStatusBadge(visit.status)}`}>
                          {getStatusText(visit.status)}
                      </span>
                      <span className="font-semibold px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                          {getVisitTypeText(visit.visit_type)}
                      </span>
                    </div>
                </div>
                <div className="font-bold text-sm">{visit.customer.kisa_isim}</div>
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
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center p-4 mt-4">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50 flex items-center gap-2"><ChevronLeft size={16}/> Önceki</button>
            <span className="text-sm font-medium">Sayfa {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 text-sm bg-gray-200 rounded-lg disabled:opacity-50 flex items-center gap-2">Sonraki <ChevronRight size={16}/></button>
        </div>
      )}

      <CorrectiveActionModal isOpen={showActionModal} onClose={() => { setShowActionModal(false); setSelectedVisitId(null); }} visitId={selectedVisitId || undefined} onSave={fetchVisits} />
      {showVisitDetails && selectedVisit && (<VisitDetailsModal visit={selectedVisit as any} onClose={() => { setShowVisitDetails(false); setSelectedVisit(null); }} />)}
      <EditVisitModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} visit={editingVisit} onSave={fetchVisits} />
    </div>
  );
};

export default Visits;