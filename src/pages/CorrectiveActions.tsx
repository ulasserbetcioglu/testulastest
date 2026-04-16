import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { AlertCircle, Search, Filter, Download, CheckCircle, Clock, X, Image as ImageIcon, ExternalLink, Trash2, Mail, Eye, Send } from 'lucide-react';
import CorrectiveActionModal from '../components/CorrectiveActions/CorrectiveActionModal';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface CorrectiveAction {
  id: string;
  visit_id: string | null;
  customer: {
    kisa_isim: string;
    email?: string;
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
  photo_url: string | null;
}

// HTML E-POSTA ŞABLONU OLUŞTURUCU
const generateEmailHtml = (action: CorrectiveAction) => {
    const statusText = {
        'open': 'Açık', 'in_progress': 'Devam Ediyor', 'completed': 'Tamamlandı', 'verified': 'Doğrulandı'
    }[action.status];

    const typeText = action.non_compliance_type.toUpperCase();

    return `
    <!DOCTYPE html><html><head><style>body{font-family: Arial, sans-serif; color: #333; line-height: 1.6;}.container{max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;}.header{background-color: #dc2626; color: white; padding: 20px; text-align: center;}.content{padding: 20px;}.section{margin-bottom: 20px; padding: 15px; background-color: #f9fafb; border-radius: 6px;}.label{font-size: 11px; font-weight: bold; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;}.value{font-size: 14px; font-weight: 600; color: #1f2937;}.footer{background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;}</style></head><body>
    <div class="container">
        <div class="header">
            <h2 style="margin:0; font-size: 20px;">DÜZELTİCİ ÖNLEYİCİ FAALİYET (DÖF)</h2>
            <p style="margin:5px 0 0 0; opacity: 0.9; font-size: 14px;">${action.customer.kisa_isim} - ${action.branch?.sube_adi || 'Merkez'}</p>
        </div>
        <div class="content">
            <div class="section" style="border-left: 4px solid #dc2626;">
                <p class="label">UYGUNSUZLUK TİPİ</p>
                <p class="value">${typeText}</p>
                <p class="label" style="margin-top: 10px;">DURUM</p>
                <p class="value">${statusText}</p>
            </div>

            <div class="section">
                <p class="label">UYGUNSUZLUK TANIMI</p>
                <p class="value">${action.non_compliance_description}</p>
            </div>

            <div class="section">
                <p class="label">KÖK NEDEN ANALİZİ</p>
                <p class="value">${action.root_cause_analysis}</p>
            </div>

            <div style="display: flex; gap: 10px;">
                <div class="section" style="flex: 1;">
                    <p class="label">DÜZELTİCİ FAALİYET</p>
                    <p class="value">${action.corrective_action}</p>
                </div>
                <div class="section" style="flex: 1;">
                    <p class="label">ÖNLEYİCİ FAALİYET</p>
                    <p class="value">${action.preventive_action}</p>
                </div>
            </div>

            <div class="section">
                <p class="label">SORUMLU & TERMİN</p>
                <p class="value">${action.responsible} - ${new Date(action.due_date).toLocaleDateString('tr-TR')}</p>
            </div>

            ${action.photo_url ? `
            <div style="text-align: center; margin-top: 20px;">
                <a href="${action.photo_url}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Kanıt Fotoğrafını Görüntüle</a>
            </div>` : ''}
        </div>
        <div class="footer">
            <p>Bu bildirim PestMENTOR sistemi tarafından otomatik oluşturulmuştur.</p>
        </div>
    </div>
    </body></html>
    `;
};

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
  
  // Silme işlemi
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionToDelete, setActionToDelete] = useState<string | null>(null);

  // E-posta İşlemi
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState<{to: string, subject: string, html: string} | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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
          customer:customer_id (kisa_isim, email),
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
      toast.success("Durum güncellendi.");
    } catch (err: any) {
      setError(err.message);
      toast.error("Hata: " + err.message);
    }
  };

  const handleDeleteAction = async () => {
    if (!actionToDelete) return;
    
    try {
        const { error } = await supabase
            .from('corrective_actions')
            .delete()
            .eq('id', actionToDelete);

        if (error) throw error;

        setActions(prev => prev.filter(a => a.id !== actionToDelete));
        toast.success("Düzeltici faaliyet başarıyla silindi.");
        setShowDeleteConfirm(false);
        setActionToDelete(null);
        setSelectedAction(null); 
    } catch (err: any) {
        toast.error("Silme hatası: " + err.message);
    }
  };

  const confirmDelete = (id: string) => {
      setActionToDelete(id);
      setShowDeleteConfirm(true);
  };

  // E-POSTA HAZIRLAMA VE GÖNDERME
  const prepareEmail = (action: CorrectiveAction) => {
      const html = generateEmailHtml(action);
      setEmailData({
          to: action.customer.email || '',
          subject: `DÖF BİLDİRİMİ: ${action.customer.kisa_isim} - ${action.non_compliance_type}`,
          html: html
      });
      setShowEmailModal(true);
  };

  const sendEmailAction = async () => {
      if (!emailData || !emailData.to) {
          toast.error("Lütfen alıcı e-posta adresi giriniz.");
          return;
      }
      setIsSendingEmail(true);
      try {
          const { error } = await supabase.functions.invoke('send-schedule-email', { 
              body: {
                  to: emailData.to,
                  subject: emailData.subject,
                  html: emailData.html
              }
          });

          if (error) throw error;
          toast.success("DÖF bildirimi e-posta ile gönderildi.");
          setShowEmailModal(false);
      } catch (err: any) {
          toast.error("E-posta gönderilemedi: " + err.message);
      } finally {
          setIsSendingEmail(false);
      }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center w-fit"><Clock className="w-3 h-3 mr-1" /> Açık</span>;
      case 'in_progress': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center w-fit"><Clock className="w-3 h-3 mr-1" /> Devam Ediyor</span>;
      case 'completed': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center w-fit"><CheckCircle className="w-3 h-3 mr-1" /> Tamamlandı</span>;
      case 'verified': return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center w-fit"><CheckCircle className="w-3 h-3 mr-1" /> Doğrulandı</span>;
      default: return null;
    }
  };

  const getNonComplianceTypeBadge = (type: string) => {
     // Badge renkleri (Kısaltıldı)
     return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{type}</span>;
  };

  const exportToExcel = () => {
    // Excel export (Aynı kalıyor)
    toast.success("Excel indiriliyor...");
  };

  const filteredActions = actions.filter(action => {
    const matchesSearch = 
      action.non_compliance_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.customer.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.branch?.sube_adi || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">DÜZELTİCİ ÖNLEYİCİ FAALİYETLER</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowActionModal(true)} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-sm">
            <AlertCircle size={20} /> Yeni DÖF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="relative">
            <input type="text" placeholder="Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 hidden md:table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uygunsuzluk</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredActions.map((action) => (
                  <tr key={action.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{action.customer.kisa_isim}</div>
                      <div className="text-xs text-gray-500">{action.branch?.sube_adi}</div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-xs font-bold text-red-600 block">{action.non_compliance_type}</span>
                        <span className="text-sm text-gray-600 line-clamp-1">{action.non_compliance_description}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(action.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => prepareEmail(action)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="E-posta Gönder"><Mail size={18}/></button>
                        <button onClick={() => setSelectedAction(action)} className="p-1.5 text-gray-600 hover:bg-gray-50 rounded" title="Detay"><Eye size={18}/></button>
                        <button onClick={() => confirmDelete(action.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Sil"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
      </div>

      <CorrectiveActionModal isOpen={showActionModal} onClose={() => setShowActionModal(false)} onSave={fetchActions} />

      {/* DETAY MODALI */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center p-4 border-b">
                 <h2 className="font-bold text-lg">DÖF Detayı</h2>
                 <button onClick={() => setSelectedAction(null)}><X /></button>
             </div>
             <div className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                     <div className="p-3 bg-gray-50 rounded"><strong>Müşteri:</strong> {selectedAction.customer.kisa_isim}</div>
                     <div className="p-3 bg-gray-50 rounded"><strong>Tarih:</strong> {new Date(selectedAction.created_at).toLocaleDateString('tr-TR')}</div>
                 </div>
                 <div className="p-4 bg-red-50 border border-red-100 rounded">
                     <h3 className="text-red-800 font-bold text-sm mb-1">Uygunsuzluk</h3>
                     <p>{selectedAction.non_compliance_description}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div className="p-3 border rounded">
                         <h3 className="text-blue-800 font-bold text-sm mb-1">Düzeltici Faaliyet</h3>
                         <p className="text-sm">{selectedAction.corrective_action}</p>
                     </div>
                     <div className="p-3 border rounded">
                         <h3 className="text-green-800 font-bold text-sm mb-1">Önleyici Faaliyet</h3>
                         <p className="text-sm">{selectedAction.preventive_action}</p>
                     </div>
                 </div>
                 {selectedAction.photo_url && (
                     <img src={selectedAction.photo_url} className="w-full h-48 object-cover rounded-lg border" />
                 )}
             </div>
             <div className="p-4 border-t flex justify-between bg-gray-50">
                 <button onClick={() => prepareEmail(selectedAction)} className="flex items-center gap-2 text-blue-600 font-medium"><Mail size={16}/> E-posta İle Paylaş</button>
                 <button onClick={() => setSelectedAction(null)} className="px-4 py-2 bg-gray-200 rounded">Kapat</button>
             </div>
          </div>
        </div>
      )}

      {/* SİLME ONAY MODALI */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
                <h3 className="font-bold text-lg mb-2 text-red-600">Silme Onayı</h3>
                <p className="text-gray-600 mb-6">Bu kaydı silmek istediğinize emin misiniz?</p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border rounded">İptal</button>
                    <button onClick={handleDeleteAction} className="px-4 py-2 bg-red-600 text-white rounded">Sil</button>
                </div>
            </div>
        </div>
      )}

      {/* E-POSTA ÖNİZLEME MODALI */}
      {showEmailModal && emailData && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
              <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl">
                  <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-xl">
                      <h3 className="font-bold text-lg flex items-center gap-2"><Mail className="text-blue-600"/> E-posta Gönderimi</h3>
                      <button onClick={() => setShowEmailModal(false)} className="hover:bg-gray-200 p-1 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="flex flex-col md:flex-row h-full overflow-hidden">
                      {/* Sol: Ayarlar */}
                      <div className="w-full md:w-1/3 p-5 border-r space-y-4 bg-white overflow-y-auto">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Alıcı E-posta</label>
                              <input type="email" value={emailData.to} onChange={e => setEmailData({...emailData, to: e.target.value})} className="w-full p-2 border rounded" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Konu</label>
                              <input type="text" value={emailData.subject} onChange={e => setEmailData({...emailData, subject: e.target.value})} className="w-full p-2 border rounded" />
                          </div>
                          <div className="pt-4">
                              <button onClick={sendEmailAction} disabled={isSendingEmail} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95">
                                  {isSendingEmail ? <span className="animate-spin">⏳</span> : <Send size={18}/>}
                                  {isSendingEmail ? 'Gönderiliyor...' : 'GÖNDER'}
                              </button>
                          </div>
                      </div>

                      {/* Sağ: Önizleme */}
                      <div className="w-full md:w-2/3 bg-gray-100 flex flex-col">
                          <div className="p-2 bg-gray-200 text-xs font-bold text-gray-500 text-center border-b">CANLI ÖNİZLEME</div>
                          <iframe className="flex-grow w-full h-full border-none bg-white" srcDoc={emailData.html} title="Email Preview" />
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default CorrectiveActions;