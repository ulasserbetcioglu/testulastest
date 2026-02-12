import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, FileText, Calendar, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface TrendReport {
  id: string;
  report_name: string;
  date_from: string;
  date_to: string;
  created_at: string;
  report_data: any;
}

const CustomerTrendReports: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<TrendReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string>('');

  useEffect(() => {
    // Get customer ID from local auth
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.customer_id) {
        setCustomerId(user.customer_id);
        fetchReports(user.customer_id);
      }
    }
  }, []);

  const fetchReports = async (custId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trend_analysis_reports')
        .select('*')
        .eq('customer_id', custId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Raporlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (reportId: string) => {
    navigate(`/customer/trend-report/${reportId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Trend Analiz Raporlarım</h1>
        <p className="text-gray-600 mt-1">Size özel hazırlanan trend analiz raporlarını görüntüleyin</p>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz rapor yok</h3>
          <p className="text-gray-600">Sistem yöneticisi tarafından hazırlanan raporlar burada görünecektir.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  Trend Analizi
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {report.report_name}
              </h3>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(parseISO(report.date_from), 'dd MMM yyyy', { locale: tr })} -
                    {format(parseISO(report.date_to), 'dd MMM yyyy', { locale: tr })}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Oluşturulma: {format(parseISO(report.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                </div>
              </div>

              <button
                onClick={() => handleViewReport(report.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Eye className="h-4 w-4" />
                Raporu Görüntüle
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerTrendReports;
