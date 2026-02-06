import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { AlertCircle, Search, Filter, Download, CheckCircle, Clock, X, Image as ImageIcon, ExternalLink } from 'lucide-react';
import CorrectiveActionModal from '../components/CorrectiveActions/CorrectiveActionModal';
import * as XLSX from 'xlsx';

interface CorrectiveAction {
  id: string;
  visit_id: string | null;
  customer: {
    kisa_isim: string;
  };
  branch?: {
    sube_adi: string;
  } | null;
  non_compliance_type: string;
  non_compliance_description: string;
  root_cause_analysis: string;
  corrective_action: string;
  preventive_action: string;
  responsible: string;
  due_date: string;
  completion_date?: string;
  related_standard: string;
  status: 'open' | 'in_progress' | 'completed' | 'verified';
  created_at: string;
  photo_url: string | null; // Yeni eklenen alan
}

const CorrectiveActions: React.FC = () => {
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedStandard, setSelectedStandard] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    try {
      setLoading(true);
      
      let operatorId: string | null = null;
      let userId: string | null = null;

      const localSession = localAuth.getSession();
      if (localSession && localSession.type === 'operator') {
        operatorId = localSession.id;
        userId = localSession.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Kullanıcı bulunamadı');
        userId = user.id;

        const { data: opData } = await supabase
          .from('operators')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();
        operatorId = opData?.id || null;
      }

      let query = supabase
        .from('corrective_actions')
        .select(`
          id,
          visit_id,
          non_compliance_type,
          non_compliance_description,
          root_cause_analysis,
          corrective_action,
          preventive_action,
          responsible,
          due_date,
          completion_date,
          related_standard,
          status,
          created_at,
          photo_url,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi)
        `)
        .order('created_at', { ascending: false });

      if (operatorId) {
        const { data: visitsData } = await supabase
          .from('visits')
          .select('id')
          .eq('operator_id', operatorId);

        const visitIds = visitsData?.map(v => v.id) || [];

        query = query.or(`created_by.eq.${userId},visit_id.in.(${visitIds.length > 0 ? visitIds.join(',') : 'null'})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActions(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'open' | 'in_progress' | 'completed' | 'verified') => {
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === 'completed') {
        updates.completion_date = new Date().toISOString().split('T')[0];
      }
      
      const { error } = await supabase
        .from('corrective_actions')
        .update(updates)
        .eq('id', id);
        
      if (error) throw error;
      
      fetchActions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center w-fit"><Clock className="w-3 h-3 mr-1" /> Açık</span>;
      case 'in_progress':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center w-fit"><Clock className="w-3 h-3 mr-1" /> Devam Ediyor</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center w-fit"><CheckCircle className="w-3 h-3 mr-1" /> Tamamlandı</span>;
      case 'verified':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center w-fit"><CheckCircle className="w-3 h-3 mr-1" /> Doğrulandı</span>;
      default:
        return null;
    }
  };

  const getNonComplianceTypeBadge = (type: string) => {
    const types: Record<string, { label: string, color: string }> = {
      'kritik': { label: 'Kritik', color: 'bg-red-100 text-red-800' },
      'major': { label: 'Majör', color: 'bg-orange-100 text-orange-800' },
      'minor': { label: 'Minör', color: 'bg-yellow-100 text-yellow-800' },
      'kemirgen': { label: 'Kemirgen', color: 'bg-gray-100 text-gray-800' },
      'yuruyen': { label: 'Yürüyen Haşere', color: 'bg-amber-100 text-amber-800' },
      'uckun': { label: 'Uçkun Haşere', color: 'bg-sky-100 text-sky-800' },
      'ambar': { label: 'Ambar Zararlısı', color: 'bg-brown-100 text-brown-800' }, // Custom color class might need Tailwind config
      'surungen': { label: 'Sürüngen', color: 'bg-emerald-100 text-emerald-800' },
      'yapisal': { label: 'Yapısal', color: 'bg-slate-100 text-slate-800' },
      'hijyen': { label: 'Hijyen', color: 'bg-teal-100 text-teal-800' },
      'depolama': { label: 'Depolama', color: 'bg-indigo-100 text-indigo-800' },
      'dis_alan': { label: 'Dış Alan', color: 'bg-lime-100 text-lime-800' },
    };

    const info = types[type] || { label: type, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${info.color}`}>
        {info.label}
      </span>
    );
  };

  const exportToExcel = () => {
    const data = filteredActions.map(action => ({
      'Müşteri': action.customer.kisa_isim,
      'Şube': action.branch?.sube_adi || '-',
      'Uygunsuzluk Tipi': action.non_compliance_type,
      'Uygunsuzluk Tanımı': action.non_compliance_description,
      'Kök Neden Analizi': action.root_cause_analysis,
      'Düzeltici Faaliyet': action.corrective_action,
      'Önleyici Faaliyet': action.preventive_action,
      'Sorumlu': action.responsible,
      'Termin Tarihi': new Date(action.due_date).toLocaleDateString('tr-TR'),
      'Tamamlanma Tarihi': action.completion_date ? new Date(action.completion_date).toLocaleDateString('tr-TR') : '-',
      'İlgili Standart': action.related_standard.toUpperCase(),
      'Durum': action.status === 'open' ? 'Açık' : 
               action.status === 'in_progress' ? 'Devam Ediyor' : 
               action.status === 'completed' ? 'Tamamlandı' : 'Doğrulandı',
      'Oluşturma Tarihi': new Date(action.created_at).toLocaleDateString('tr-TR'),
      'Fotoğraf': action.photo_url ? 'Var' : 'Yok'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DÖF');
    XLSX.writeFile(wb, 'duzeltici_onleyici_faaliyetler.xlsx');
  };

  const filteredActions = actions.filter(action => {
    const matchesSearch = 
      action.non_compliance_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.customer.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.branch?.sube_adi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.responsible.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !selectedStatus || action.status === selectedStatus;
    const matchesStandard = !selectedStandard || action.related_standard === selectedStandard;
    
    const actionDate = new Date(action.created_at);
    const matchesStartDate = !startDate || actionDate >= new Date(startDate);
    const matchesEndDate = !endDate || actionDate <= new Date(endDate);
    
    return matchesSearch && matchesStatus && matchesStandard && matchesStartDate && matchesEndDate;
  });

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-lg">Hata: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">DÜZELTİCİ ÖNLEYİCİ FAALİYETLER</h1>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Download size={20} />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={() => setShowActionModal(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-sm"
          >
            <AlertCircle size={20} />
            Yeni DÖF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Müşteri, şube veya içerik ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
          >
            <Filter className="w-5 h-5" />
            Filtrele
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Durum</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Tümü</option>
                <option value="open">Açık</option>
                <option value="in_progress">Devam Ediyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="verified">Doğrulandı</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Standart</label>
              <select
                value={selectedStandard}
                onChange={(e) => setSelectedStandard(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Tümü</option>
                <option value="haccp">HACCP</option>
                <option value="brc">BRC</option>
                <option value="aib">AIB</option>
                <option value="iso22000">ISO 22000</option>
                <option value="other">Diğer</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Başlangıç Tarihi</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Bitiş Tarihi</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri/Şube</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uygunsuzluk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sorumlu</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Termin</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fotoğraf</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="w-12 h-12 text-gray-300 mb-2" />
                      <p>Kayıt bulunamadı</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredActions.map((action) => (
                  <tr key={action.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{action.customer.kisa_isim}</div>
                      {action.branch && <div className="text-xs text-gray-500">{action.branch.sube_adi}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {getNonComplianceTypeBadge(action.non_compliance_type)}
                        <span className="text-sm text-gray-600 line-clamp-1" title={action.non_compliance_description}>
                          {action.non_compliance_description}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {action.responsible}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">
                      {new Date(action.due_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {action.photo_url ? (
                        <ImageIcon size={18} className="text-blue-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(action.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedAction(action)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs"
                        >
                          Detay
                        </button>
                        {action.status === 'open' && (
                          <button onClick={() => handleUpdateStatus(action.id, 'in_progress')} className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs">Başlat</button>
                        )}
                        {action.status === 'in_progress' && (
                          <button onClick={() => handleUpdateStatus(action.id, 'completed')} className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs">Tamamla</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredActions.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>Kayıt bulunamadı</p>
            </div>
          ) : (
            filteredActions.map((action) => (
              <div key={`mobile-${action.id}`} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{action.customer.kisa_isim}</div>
                    {action.branch && <div className="text-xs text-gray-500">{action.branch.sube_adi}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {action.photo_url && <ImageIcon size={16} className="text-blue-500" />}
                    {getStatusBadge(action.status)}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {getNonComplianceTypeBadge(action.non_compliance_type)}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{action.non_compliance_description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>Sorumlu: {action.responsible}</span>
                  <span>Termin: {new Date(action.due_date).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedAction(action)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm text-center"
                  >
                    Detay
                  </button>
                  {action.status === 'open' && (
                    <button onClick={() => handleUpdateStatus(action.id, 'in_progress')} className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm text-center">Başlat</button>
                  )}
                  {action.status === 'in_progress' && (
                    <button onClick={() => handleUpdateStatus(action.id, 'completed')} className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm text-center">Tamamla</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <CorrectiveActionModal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        onSave={fetchActions}
      />

      {/* DETAY MODALI */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-800">DÖF Detayı</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500">{new Date(selectedAction.created_at).toLocaleDateString('tr-TR')}</span>
                  {getStatusBadge(selectedAction.status)}
                </div>
              </div>
              <button onClick={() => setSelectedAction(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Lokasyon Bilgisi */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Müşteri</h3>
                  <p className="font-medium text-gray-900">{selectedAction.customer.kisa_isim}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Şube</h3>
                  <p className="font-medium text-gray-900">{selectedAction.branch?.sube_adi || '-'}</p>
                </div>
              </div>

              {/* FOTOĞRAF ALANI (YENİ) */}
              {selectedAction.photo_url && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <ImageIcon size={18} className="text-blue-600" />
                    Kanıt Fotoğrafı
                  </h3>
                  <div className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <img 
                      src={selectedAction.photo_url} 
                      alt="DÖF Kanıt" 
                      className="w-full h-64 object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    <a 
                      href={selectedAction.photo_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute top-3 right-3 bg-white/90 p-2 rounded-full shadow-lg hover:bg-blue-600 hover:text-white transition-colors"
                      title="Tam boy görüntüle"
                    >
                      <ExternalLink size={18} />
                    </a>
                  </div>
                </div>
              )}

              {/* Detaylar */}
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-red-100 bg-red-50/50">
                  <h3 className="text-sm font-bold text-red-800 mb-1">Uygunsuzluk Tanımı ({selectedAction.non_compliance_type})</h3>
                  <p className="text-sm text-gray-800 leading-relaxed">{selectedAction.non_compliance_description}</p>
                </div>

                <div className="p-4 rounded-lg border border-orange-100 bg-orange-50/50">
                  <h3 className="text-sm font-bold text-orange-800 mb-1">Kök Neden Analizi</h3>
                  <p className="text-sm text-gray-800 leading-relaxed">{selectedAction.root_cause_analysis}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-blue-100 bg-blue-50/50">
                    <h3 className="text-sm font-bold text-blue-800 mb-1">Düzeltici Faaliyet</h3>
                    <p className="text-sm text-gray-800">{selectedAction.corrective_action}</p>
                  </div>
                  <div className="p-4 rounded-lg border border-green-100 bg-green-50/50">
                    <h3 className="text-sm font-bold text-green-800 mb-1">Önleyici Faaliyet</h3>
                    <p className="text-sm text-gray-800">{selectedAction.preventive_action}</p>
                  </div>
                </div>
              </div>

              {/* Alt Bilgiler */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-4">
                <div>
                  <span className="block text-xs text-gray-500 font-semibold uppercase">Sorumlu</span>
                  <span className="text-gray-900">{selectedAction.responsible}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-semibold uppercase">Termin</span>
                  <span className="text-gray-900">{new Date(selectedAction.due_date).toLocaleDateString('tr-TR')}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-semibold uppercase">Standart</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">{selectedAction.related_standard.toUpperCase()}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-semibold uppercase">Tamamlanma</span>
                  <span className="text-gray-900">{selectedAction.completion_date ? new Date(selectedAction.completion_date).toLocaleDateString('tr-TR') : '-'}</span>
                </div>
              </div>

            </div>

            <div className="p-5 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={() => setSelectedAction(null)}
                className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm shadow-sm"
              >
                Kapat
              </button>
              {selectedAction.status !== 'verified' && (
                <button
                  onClick={() => {
                    const nextStatus = selectedAction.status === 'open' ? 'in_progress' : 
                                     selectedAction.status === 'in_progress' ? 'completed' : 'verified';
                    handleUpdateStatus(selectedAction.id, nextStatus);
                    setSelectedAction(null);
                  }}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-md"
                >
                  Sonraki Aşamaya Geç
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrectiveActions;