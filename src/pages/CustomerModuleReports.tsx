import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Calendar, Filter, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/Auth/AuthProvider';
import { toast } from 'sonner';

interface ModuleReport {
  id: string;
  type: 'risk_assessment' | 'proposal' | 'uv_lamp';
  title: string;
  date: string;
  report_url: string | null;
  customer_name?: string;
  branch_name?: string;
  status: string;
}

const CustomerModuleReports: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ModuleReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<ModuleReport | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    if (user?.customer_id) {
      fetchReports();
    }
  }, [user?.customer_id, selectedType]);

  const fetchReports = async () => {
    if (!user?.customer_id) return;

    setLoading(true);
    try {
      const allReports: ModuleReport[] = [];

      // Fetch Risk Assessments
      const { data: riskData, error: riskError } = await supabase
        .from('risk_assessments')
        .select('id, assessment_date, report_url, client_company, status')
        .eq('customer_id', user.customer_id)
        .order('assessment_date', { ascending: false });

      if (!riskError && riskData) {
        riskData.forEach(item => {
          allReports.push({
            id: item.id,
            type: 'risk_assessment',
            title: 'Risk Değerlendirme Raporu',
            date: item.assessment_date,
            report_url: item.report_url,
            customer_name: item.client_company,
            status: item.status || 'active'
          });
        });
      }

      // Fetch Proposals
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .select('id, proposal_date, report_url, company_name, status')
        .eq('customer_id', user.customer_id)
        .order('proposal_date', { ascending: false });

      if (!proposalError && proposalData) {
        proposalData.forEach(item => {
          allReports.push({
            id: item.id,
            type: 'proposal',
            title: 'Teklif ve Hizmet Raporu',
            date: item.proposal_date,
            report_url: item.report_url,
            customer_name: item.company_name,
            status: item.status || 'draft'
          });
        });
      }

      // Fetch UV Lamp Reports
      const { data: uvData, error: uvError } = await supabase
        .from('uv_lamp_reports')
        .select('id, report_date, report_url, customer_name, location, status')
        .eq('customer_id', user.customer_id)
        .order('report_date', { ascending: false });

      if (!uvError && uvData) {
        uvData.forEach(item => {
          allReports.push({
            id: item.id,
            type: 'uv_lamp',
            title: 'UV Lamba Raporu',
            date: item.report_date,
            report_url: item.report_url,
            customer_name: item.customer_name,
            branch_name: item.location,
            status: item.status || 'active'
          });
        });
      }

      // Filter and sort
      const filteredReports = selectedType === 'all'
        ? allReports
        : allReports.filter(r => r.type === selectedType);

      filteredReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setReports(filteredReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Raporlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'risk_assessment':
        return 'Risk Değerlendirme';
      case 'proposal':
        return 'Teklif Raporu';
      case 'uv_lamp':
        return 'UV Lamba';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'risk_assessment':
        return 'bg-blue-100 text-blue-800';
      case 'proposal':
        return 'bg-green-100 text-green-800';
      case 'uv_lamp':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewReport = (report: ModuleReport) => {
    if (!report.report_url) {
      toast.warning('Bu rapor için görsel mevcut değil');
      return;
    }
    setSelectedReport(report);
    setShowImageModal(true);
  };

  const handleDownloadReport = (report: ModuleReport) => {
    if (!report.report_url) {
      toast.warning('Bu rapor için görsel mevcut değil');
      return;
    }

    const link = document.createElement('a');
    link.href = report.report_url;
    link.download = `${getTypeLabel(report.type)}_${report.date}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Rapor indiriliyor...');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Raporlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Modül Raporları</h1>
        <p className="text-gray-600">Firmanız için oluşturulan tüm modül raporlarını görüntüleyin ve indirin</p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtrele:</span>
          <button
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tümü ({reports.length})
          </button>
          <button
            onClick={() => setSelectedType('risk_assessment')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedType === 'risk_assessment'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Risk Değerlendirme
          </button>
          <button
            onClick={() => setSelectedType('proposal')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedType === 'proposal'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Teklif Raporları
          </button>
          <button
            onClick={() => setSelectedType('uv_lamp')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedType === 'uv_lamp'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            UV Lamba Raporları
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Rapor Bulunamadı</h3>
          <p className="text-gray-600">
            {selectedType === 'all'
              ? 'Henüz size ait rapor oluşturulmamış.'
              : `${getTypeLabel(selectedType)} kategorisinde rapor bulunamadı.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map(report => (
            <div
              key={`${report.type}-${report.id}`}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(report.type)}`}>
                        {getTypeLabel(report.type)}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{report.title}</h3>
                    {report.customer_name && (
                      <p className="text-sm text-gray-600">{report.customer_name}</p>
                    )}
                    {report.branch_name && (
                      <p className="text-sm text-gray-500">{report.branch_name}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(report.date)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewReport(report)}
                    disabled={!report.report_url}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    Görüntüle
                  </button>
                  <button
                    onClick={() => handleDownloadReport(report)}
                    disabled={!report.report_url}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedReport.title}</h3>
                <p className="text-sm text-gray-600">{formatDate(selectedReport.date)}</p>
              </div>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {selectedReport.report_url ? (
                <img
                  src={selectedReport.report_url}
                  alt={selectedReport.title}
                  className="w-full h-auto"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Görsel mevcut değil</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button
                onClick={() => handleDownloadReport(selectedReport)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                İndir
              </button>
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerModuleReports;
