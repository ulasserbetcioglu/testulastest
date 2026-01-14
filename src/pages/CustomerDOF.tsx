import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { Search, Filter, Download, AlertCircle, CheckCircle, Clock, X, Image as ImageIcon, ExternalLink, Building2, FileImage } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

// --- ARAYÜZLER ---
interface CorrectiveAction {
  id: string;
  visit_id: string | null;
  branch: {
    id: string; // Filtreleme için ID lazım
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

interface CompanySettings {
  company_name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

interface Branch {
  id: string;
  sube_adi: string;
}

const CustomerDOF: React.FC = () => {
  // State Tanımları
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]); // Şube Listesi
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null); // Şirket Bilgileri
  
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtreler
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(''); // Şube Filtresi
  
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);

  // Rapor Referansı
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitData();
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchActions();
      fetchBranches();
    }
  }, [customerId]);

  // --- VERİ ÇEKME İŞLEMLERİ ---
  const fetchInitData = async () => {
    try {
      // 1. Müşteri ID'sini al
      const id = await localAuth.getCurrentCustomerId();
      if (!id) throw new Error('Müşteri kaydı bulunamadı');
      setCustomerId(id);

      // 2. Şirket Ayarlarını (Logo vs.) al
      const { data: settings } = await supabase.from('company_settings').select('*').single();
      if (settings) setCompanySettings(settings);

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    if (!customerId) return;
    const { data } = await supabase
      .from('branches')
      .select('id, sube_adi')
      .eq('customer_id', customerId)
      .order('sube_adi');
    setBranches(data || []);
  };

  const fetchActions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
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
          branch:branch_id (id, sube_adi)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActions(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- YARDIMCI FONKSİYONLAR ---
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center w-fit"><Clock className="w-3 h-3 mr-1" /> Açık</span>;
      case 'in_progress': return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center w-fit"><Clock className="w-3 h-3 mr-1" /> İşlemde</span>;
      case 'completed': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center w-fit"><CheckCircle className="w-3 h-3 mr-1" /> Tamamlandı</span>;
      case 'verified': return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center w-fit"><CheckCircle className="w-3 h-3 mr-1" /> Doğrulandı</span>;
      default: return null;
    }
  };

  const getNonComplianceTypeBadge = (type: string) => {
    const types: Record<string, string> = {
      'kritik': 'Kritik', 'major': 'Majör', 'minor': 'Minör',
      'kemirgen': 'Kemirgen', 'yuruyen': 'Yürüyen', 'uckun': 'Uçkun',
      'ambar': 'Ambar', 'surungen': 'Sürüngen',
      'yapisal': 'Yapısal', 'hijyen': 'Hijyen', 'depolama': 'Depolama'
    };
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{types[type] || type}</span>;
  };

  // --- FİLTRELEME MANTIĞI ---
  const filteredActions = actions.filter(action => {
    const matchesSearch = 
      action.non_compliance_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.branch?.sube_adi || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !selectedStatus || action.status === selectedStatus;
    const matchesBranch = !selectedBranchId || action.branch?.id === selectedBranchId;
    
    return matchesSearch && matchesStatus && matchesBranch;
  });

  // --- RAPORLAMA (EXCEL & JPEG) ---
  const exportToExcel = () => {
    const data = filteredActions.map(action => ({
      'Şube': action.branch?.sube_adi || '-',
      'Tip': action.non_compliance_type,
      'Tanım': action.non_compliance_description,
      'Kök Neden': action.root_cause_analysis,
      'Düzeltici Faaliyet': action.corrective_action,
      'Önleyici Faaliyet': action.preventive_action,
      'Sorumlu': action.responsible,
      'Termin': new Date(action.due_date).toLocaleDateString('tr-TR'),
      'Durum': action.status,
      'Tarih': new Date(action.created_at).toLocaleDateString('tr-TR'),
      'Fotoğraf': action.photo_url ? 'Var' : 'Yok'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DÖF Listesi');
    XLSX.writeFile(wb, 'dof_raporu.xlsx');
  };

  const exportToJPEG = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      // Geçici olarak rapor div'ini görünür yap (ama ekran dışına taşırarak)
      reportRef.current.style.display = 'block'; 
      
      const canvas = await html2canvas(reportRef.current, { 
        scale: 2, 
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      
      const link = document.createElement('a');
      link.download = `DOF_Raporu_${format(new Date(), 'dd-MM-yyyy')}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
      
      // Tekrar gizle
      reportRef.current.style.display = 'none';
      toast.success('Rapor görseli indirildi');
    } catch (e) { 
      console.error(e); 
      toast.error('Görsel oluşturulurken hata oluştu');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-lg">Hata: {error}</div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Düzeltici Önleyici Faaliyetler (DÖF)</h1>
        <div className="flex gap-2">
          <button
            onClick={exportToJPEG}
            disabled={downloading || filteredActions.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {downloading ? <span className="animate-spin">⏳</span> : <FileImage size={20} />}
            JPEG Rapor
          </button>
          <button
            onClick={exportToExcel}
            disabled={filteredActions.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Download size={20} /> Excel
          </button>
        </div>
      </div>

      {/* FILTRE PANELİ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Şube Seçimi */}
          <div className="md:col-span-1">
             <label className="block text-xs font-semibold text-gray-500 mb-1">Şube</label>
             <div className="relative">
               <Building2 className="absolute left-3 top-2.5 text-gray-400" size={16} />
               <select
                 value={selectedBranchId}
                 onChange={(e) => setSelectedBranchId(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
               >
                 <option value="">Tüm Şubeler</option>
                 {branches.map(branch => (
                   <option key={branch.id} value={branch.id}>{branch.sube_adi}</option>
                 ))}
               </select>
             </div>
          </div>

          <div className="md:col-span-2 relative">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Arama</label>
            <input
              type="text"
              placeholder="İçerik, sorumlu veya durum ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <Search className="absolute left-3 top-[34px] text-gray-400" size={16} />
          </div>

          <div className="md:col-span-1 flex items-end">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" /> Detaylı Filtre
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Durum</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Tümü</option>
                <option value="open">Açık</option>
                <option value="in_progress">İşlemde</option>
                <option value="completed">Tamamlandı</option>
                <option value="verified">Doğrulandı</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* LİSTE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Şube</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uygunsuzluk</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Termin</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fotoğraf</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Detay</th>
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
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {action.branch?.sube_adi || 'Merkez'}
                    </td>
                    <td className="px-6 py-4">
                      {getNonComplianceTypeBadge(action.non_compliance_type)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 line-clamp-1" title={action.non_compliance_description}>
                        {action.non_compliance_description}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                      {new Date(action.due_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {action.photo_url ? <ImageIcon size={18} className="text-blue-500 mx-auto" /> : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(action.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedAction(action)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        İncele
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAY MODALI */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-800">DÖF Detayı</h2>
              <button onClick={() => setSelectedAction(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* FOTOĞRAF ALANI */}
              {selectedAction.photo_url && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <ImageIcon size={18} className="text-blue-600" /> Kanıt Fotoğrafı
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

              {/* Detay Kartları */}
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <h3 className="text-xs font-bold text-red-800 uppercase mb-1">Uygunsuzluk Tanımı</h3>
                <p className="text-sm text-gray-800">{selectedAction.non_compliance_description}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="text-xs font-bold text-blue-800 uppercase mb-1">Düzeltici Faaliyet</h3>
                <p className="text-sm text-gray-800">{selectedAction.corrective_action}</p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <h3 className="text-xs font-bold text-green-800 uppercase mb-1">Önleyici Faaliyet</h3>
                <p className="text-sm text-gray-800">{selectedAction.preventive_action}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                <div>
                  <span className="block text-xs text-gray-500 font-bold uppercase">Sorumlu</span>
                  <span className="text-gray-900">{selectedAction.responsible}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-bold uppercase">Termin Tarihi</span>
                  <span className="text-gray-900">{new Date(selectedAction.due_date).toLocaleDateString('tr-TR')}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-bold uppercase">Standart</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">{selectedAction.related_standard.toUpperCase()}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500 font-bold uppercase">Durum</span>
                  {getStatusBadge(selectedAction.status)}
                </div>
              </div>
            </div>

            <div className="p-5 border-t bg-gray-50 flex justify-end sticky bottom-0">
              <button
                onClick={() => setSelectedAction(null)}
                className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm shadow-sm"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- GİZLİ RAPOR ŞABLONU (JPEG İÇİN) --- */}
      <div 
        ref={reportRef} 
        style={{ 
          position: 'absolute', 
          top: '-9999px', 
          left: '-9999px',
          width: '1000px', // A4 Genişliğine yakın sabit boyut
          padding: '40px',
          backgroundColor: 'white'
        }}
      >
        {/* Rapor Header */}
        <div className="flex justify-between items-center border-b-4 border-green-600 pb-6 mb-6">
          <div className="flex items-center gap-4">
            {companySettings?.logo_url && (
              <img src={companySettings.logo_url} alt="Logo" className="h-20 object-contain" crossOrigin="anonymous" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{companySettings?.company_name || 'İLAÇLAMA FİRMASI'}</h1>
              <p className="text-sm text-gray-500">Profesyonel Pest Kontrol Hizmetleri</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-green-800 uppercase">DÖF LİSTE RAPORU</h2>
            <div className="mt-2 text-sm text-gray-600">
              Rapor Tarihi: <b>{format(new Date(), 'dd.MM.yyyy')}</b>
            </div>
            {selectedBranchId && (
              <div className="mt-1 text-sm bg-blue-50 text-blue-800 px-2 py-1 rounded inline-block">
                Şube: {branches.find(b => b.id === selectedBranchId)?.sube_adi}
              </div>
            )}
          </div>
        </div>

        {/* Tablo */}
        <div className="mb-8">
          <table className="w-full text-sm border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left w-24">Tarih</th>
                <th className="border p-2 text-left w-32">Şube</th>
                <th className="border p-2 text-left w-24">Tip</th>
                <th className="border p-2 text-left">Uygunsuzluk Tanımı</th>
                <th className="border p-2 text-left w-32">Sorumlu</th>
                <th className="border p-2 text-center w-24">Termin</th>
                <th className="border p-2 text-center w-24">Durum</th>
              </tr>
            </thead>
            <tbody>
              {filteredActions.map((action, idx) => (
                <tr key={action.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border p-2">{format(new Date(action.created_at), 'dd.MM.yyyy')}</td>
                  <td className="border p-2 font-medium">{action.branch?.sube_adi || 'Merkez'}</td>
                  <td className="border p-2 text-xs">{action.non_compliance_type}</td>
                  <td className="border p-2 text-xs">{action.non_compliance_description}</td>
                  <td className="border p-2">{action.responsible}</td>
                  <td className="border p-2 text-center">{format(new Date(action.due_date), 'dd.MM.yyyy')}</td>
                  <td className="border p-2 text-center">
                    {action.status === 'open' ? 'Açık' : 
                     action.status === 'in_progress' ? 'Devam' : 
                     action.status === 'completed' ? 'Tamam' : 'Onay'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-gray-500 flex justify-between">
          <span>{companySettings?.address}</span>
          <span>{companySettings?.phone} | {companySettings?.email} | {companySettings?.website}</span>
        </div>
      </div>

    </div>
  );
};

export default CustomerDOF;