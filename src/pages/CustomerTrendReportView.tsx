import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Download, ArrowLeft, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

const CustomerTrendReportView: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trend_analysis_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) throw error;
      setReport(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Rapor yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    setDownloading(true);
    toast.info('PDF oluşturuluyor...');

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${report.report_name}.pdf`);

      toast.success('PDF başarıyla indirildi');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Rapor Bulunamadı</h2>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  const reportData = report.report_data;
  const chartViewMode = reportData.chartViewMode || 'total';
  const currentEquipmentData = chartViewMode === 'total'
    ? reportData.equipmentTypeData
    : reportData.equipmentTypeDataByVisit;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Geri
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
        >
          {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          PDF İndir
        </button>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="bg-white rounded-lg shadow-sm p-8">
        {/* Report Header */}
        <div className="text-center mb-8 pb-6 border-b">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Trend Analizi Raporu</h2>
          <p className="text-lg text-gray-600">{reportData.customerName}</p>
          {reportData.branchName && <p className="text-gray-500">{reportData.branchName}</p>}
          <p className="text-sm text-gray-500 mt-2">
            Tarih Aralığı: {format(parseISO(reportData.dateRange.from), 'dd MMM yyyy', { locale: tr })} -
            {format(parseISO(reportData.dateRange.to), 'dd MMM yyyy', { locale: tr })}
          </p>
        </div>

        <div className="space-y-8">
          {/* Visit Stats */}
          {reportData.visitStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Toplam Ziyaret</p>
                <p className="text-2xl font-bold text-blue-600">{reportData.visitStats.total_visits}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Tamamlanan</p>
                <p className="text-2xl font-bold text-green-600">{reportData.visitStats.completed_visits}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Bekleyen</p>
                <p className="text-2xl font-bold text-yellow-600">{reportData.visitStats.pending_visits}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">İptal</p>
                <p className="text-2xl font-bold text-red-600">{reportData.visitStats.cancelled_visits}</p>
              </div>
            </div>
          )}

          {/* Monthly Trends */}
          {reportData.monthlyTrends && reportData.monthlyTrends.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Aylık Trendler</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="visits" stroke="#0088FE" name="Ziyaretler" />
                  <Line type="monotone" dataKey="equipment_checks" stroke="#00C49F" name="Ekipman Kontrolleri" />
                  <Line type="monotone" dataKey="issues_found" stroke="#FF8042" name="Bulunan Sorunlar" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pest Type Stats */}
          {reportData.pestTypeStats && reportData.pestTypeStats.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Zararlı Türü Dağılımı</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.pestTypeStats}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {reportData.pestTypeStats.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Equipment Type Charts */}
          {currentEquipmentData && currentEquipmentData.map((typeData: any) => (
            <div key={typeData.type}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {typeData.type_label}
                {chartViewMode === 'per_visit' && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    Ziyaret Başına Ortalama
                  </span>
                )}
              </h3>
              {typeData.propertyKeys.map((propKey: string) => (
                <div key={propKey} className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">{typeData.propertyLabels[propKey]}</h4>
                  <ResponsiveContainer width="100%" height={Math.max(200, typeData.activities.length * 40)}>
                    <BarChart
                      data={typeData.activities}
                      layout="vertical"
                      margin={{ left: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="equipment_code" type="category" width={90} style={{ fontSize: '10px' }} />
                      <Tooltip />
                      <Bar dataKey={propKey} fill={COLORS[0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerTrendReportView;
