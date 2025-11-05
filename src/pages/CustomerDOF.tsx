import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Download, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface CorrectiveAction {
  id: string;
  visit_id: string | null;
  branch: {
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
}

const CustomerDOF: React.FC = () => {
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedStandard, setSelectedStandard] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);

  useEffect(() => {
    fetchCustomerId();
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchActions();
    }
  }, [customerId]);

  const fetchCustomerId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (error) throw error;
      setCustomerId(data.id);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
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
          branch:branch_id (sube_adi)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Açık
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Devam Ediyor
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" />
            Tamamlandı
          </span>
        );
      case 'verified':
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" />
            Doğrulandı
          </span>
        );
      default:
        return null;
    }
  };

  const getNonComplianceTypeBadge = (type: string) => {
    switch (type) {
      case 'kritik':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
            Kritik
          </span>
        );
      case 'major':
        return (
          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
            Majör
          </span>
        );
      case 'minor':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
            Minör
          </span>
        );
      default:
        return null;
    }
  };

  const getStandardBadge = (standard: string) => {
    switch (standard) {
      case 'haccp':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
            HACCP
          </span>
        );
      case 'brc':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            BRC
          </span>
        );
      case 'aib':
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
            AIB
          </span>
        );
      case 'iso22000':
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
            ISO 22000
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
            Diğer
          </span>
        );
    }
  };

  const exportToExcel = () => {
    const data = filteredActions.map(action => ({
      'Şube': action.branch?.sube_adi || '-',
      'Uygunsuzluk Tipi': action.non_compliance_type === 'kritik' ? 'Kritik' : 
                         action.non_compliance_type === 'major' ? 'Majör' : 'Minör',
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
      'Oluşturma Tarihi': new Date(action.created_at).toLocaleDateString('tr-TR')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DÖF');
    XLSX.writeFile(wb, 'duzeltici_onleyici_faaliyetler.xlsx');
  };

  const filteredActions = actions.filter(action => {
    const matchesSearch = 
      action.non_compliance_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.branch?.sube_adi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.responsible.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !selectedStatus || action.status === selectedStatus;
    const matchesStandard = !selectedStandard || action.related_standard === selectedStandard;
    
    const actionDate = new Date(action.created_at);
    const matchesStartDate = !startDate || actionDate >= new Date(startDate);
    const matchesEndDate = !endDate || actionDate <= new Date(endDate);
    
    return matchesSearch && matchesStatus && matchesStandard && matchesStartDate && matchesEndDate;
  });

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">DÜZELTİCİ ÖNLEYİCİ FAALİYETLER</h1>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download size={20} />
            Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Filter className="w-5 h-5" />
            Filtrele
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durum
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Tüm Durumlar</option>
                <option value="open">Açık</option>
                <option value="in_progress">Devam Ediyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="verified">Doğrulandı</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Standart
              </label>
              <select
                value={selectedStandard}
                onChange={(e) => setSelectedStandard(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Tüm Standartlar</option>
                <option value="haccp">HACCP</option>
                <option value="brc">BRC</option>
                <option value="aib">AIB</option>
                <option value="iso22000">ISO 22000</option>
                <option value="other">Diğer</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Şube
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uygunsuzluk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sorumlu
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Termin
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Standart
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Düzeltici önleyici faaliyet bulunamadı
                  </td>
                </tr>
              ) : (
                filteredActions.map((action) => (
                  <tr key={action.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {action.branch?.sube_adi || 'Belirtilmemiş'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getNonComplianceTypeBadge(action.non_compliance_type)}
                        <span className="ml-2 text-sm text-gray-900 line-clamp-1">
                          {action.non_compliance_description}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {action.responsible}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {new Date(action.due_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStandardBadge(action.related_standard)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(action.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedAction(action)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Detay
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Detail Modal */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Düzeltici Önleyici Faaliyet Detayı</h2>
              <button
                onClick={() => setSelectedAction(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Şube</h3>
                  <p className="mt-1">{selectedAction.branch?.sube_adi || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Oluşturma Tarihi</h3>
                  <p className="mt-1">{new Date(selectedAction.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Uygunsuzluk Tipi</h3>
                  <div className="mt-1">{getNonComplianceTypeBadge(selectedAction.non_compliance_type)}</div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">İlgili Standart</h3>
                  <div className="mt-1">{getStandardBadge(selectedAction.related_standard)}</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Uygunsuzluk Tanımı</h3>
                <p className="mt-1 text-gray-700 bg-gray-50 p-2 rounded">
                  {selectedAction.non_compliance_description}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Kök Neden Analizi</h3>
                <p className="mt-1 text-gray-700 bg-gray-50 p-2 rounded">
                  {selectedAction.root_cause_analysis}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Düzeltici Faaliyet</h3>
                <p className="mt-1 text-gray-700 bg-gray-50 p-2 rounded">
                  {selectedAction.corrective_action}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Önleyici Faaliyet</h3>
                <p className="mt-1 text-gray-700 bg-gray-50 p-2 rounded">
                  {selectedAction.preventive_action}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Sorumlu</h3>
                  <p className="mt-1">{selectedAction.responsible}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Termin Tarihi</h3>
                  <p className="mt-1">{new Date(selectedAction.due_date).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Durum</h3>
                  <div className="mt-1">{getStatusBadge(selectedAction.status)}</div>
                </div>
                {selectedAction.completion_date && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Tamamlanma Tarihi</h3>
                    <p className="mt-1">{new Date(selectedAction.completion_date).toLocaleDateString('tr-TR')}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setSelectedAction(null)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
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

export default CustomerDOF;