import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { Download, Search, Filter, Eye, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface Certificate {
  id: string;
  certificate_number: string;
  participant_name: string;
  training_date: string;
  training_title: string;
  instructor_name: string;
  instructor_title: string;
  customer_id: string;
  branch_id?: string;
  created_at: string;
  customer: {
    kisa_isim: string;
  };
  branch?: {
    sube_adi: string;
  };
}

interface CompanyData {
  company_name: string;
  logo_url: string;
}

const TrainingCertificateTemplate: React.FC<{
  data: {
    participantName: string;
    customerName: string;
    trainingDate: string;
    trainingTitle: string;
    companyName: string;
    instructorName: string;
    instructorTitle: string;
    certificateNumber: string;
    companyLogo?: string;
  };
}> = ({ data }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="w-[210mm] h-[297mm] bg-white border border-gray-200 relative overflow-hidden">
      {/* Certificate Border */}
      <div className="absolute inset-5 border-8 border-double border-green-700 rounded-lg"></div>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 bg-repeat" style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
      }}></div>
      
      {/* Header */}
      <div className="pt-16 px-16 text-center">
        {data.companyLogo ? (
          <img 
            src={data.companyLogo} 
            alt="Company Logo" 
            className="h-20 mx-auto mb-24"
          />
        ) : (
          <div className="text-3xl font-bold text-green-700 mb-4">{data.companyName}</div>
        )}
        <h1 className="text-4xl font-bold text-green-800 mb-2">EĞİTİM SERTİFİKASI</h1>
      </div>
      
      {/* Certificate Content */}
      <div className="px-16 text-center">
        <p className="text-lg mb-8">Bu belge</p>
        <h2 className="text-3xl font-bold text-green-800 mb-8 font-serif">{data.participantName}</h2>
        <p className="text-lg mb-8">
          adlı katılımcının, {formatDate(data.trainingDate)} tarihinde<br />
          <span className="font-semibold">{data.customerName}</span> firmasında gerçekleştirilen<br />
          <span className="font-semibold">"{data.trainingTitle}"</span><br />
          konulu eğitimi başarıyla tamamladığını belgelemektedir.
        </p>
        
        {/* Certificate Number */}
        <div className="absolute bottom-32 left-16 text-sm text-gray-600">
          Sertifika No: {data.certificateNumber}
        </div>
        
        {/* Date and Signature */}
        <div className="absolute bottom-32 right-16 text-center">
          <div className="w-48 border-b border-gray-400 pb-1 mb-2"></div>
          <div className="font-semibold">{data.instructorName}</div>
          <div className="text-sm text-gray-600">{data.instructorTitle}</div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-16 left-0 right-0 text-center text-sm text-gray-500">
        <p>{data.companyName} © tarafından ilaclamatik.com Zararlı Mücadelesi CRM Yazılımı ile üretilmiştir.{new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

const CustomerCertificates: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCustomerId();
    fetchCompanyData();
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchCertificates();
    }
  }, [customerId]);

  const fetchCustomerId = async () => {
    try {
      const id = await localAuth.getCurrentCustomerId();
      if (!id) throw new Error('Müşteri kaydı bulunamadı');
      setCustomerId(id);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchCompanyData = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, logo_url')
        .eq('id', 1)
        .single();

      if (error) throw error;
      setCompanyData(data);
    } catch (err: any) {
      console.error('Error fetching company data:', err);
    }
  };

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      
      if (!customerId) {
        throw new Error('Müşteri ID bulunamadı');
      }
      
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async (cert?: Certificate) => {
    if (!certificateRef.current || !selectedCertificate) return;
    
    try {
      const certificate = cert || selectedCertificate;
      
      const element = certificateRef.current;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Use html2canvas to capture the certificate
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      
      // Save PDF
      pdf.save(`Sertifika_${certificate.participant_name.replace(/\s+/g, '_')}.pdf`);
      
      toast.success('Sertifika PDF olarak indirildi');
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      toast.error('PDF oluşturulurken bir hata oluştu');
    }
  };

  // Filter certificates based on search and filters
  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = 
      cert.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.training_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cert.branch?.sube_adi || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const certDate = new Date(cert.training_date);
    const matchesStartDate = !startDate || certDate >= new Date(startDate);
    const matchesEndDate = !endDate || certDate <= new Date(endDate);
    
    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">SERTİFİKALARIM</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Katılımcı veya eğitim ara..."
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
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Sertifika No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Katılımcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Şube
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Eğitim
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-red-500">
                    Hata: {error}
                  </td>
                </tr>
              ) : filteredCertificates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Sertifika bulunamadı
                  </td>
                </tr>
              ) : (
                filteredCertificates.map((certificate) => (
                  <tr key={certificate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {certificate.certificate_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {certificate.participant_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {certificate.branch?.sube_adi || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2">
                        {certificate.training_title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(certificate.training_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCertificate(certificate);
                            setShowViewModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Görüntüle"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCertificate(certificate);
                            setShowViewModal(true);
                            setTimeout(() => handleExportPDF(certificate), 500);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="İndir"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Certificate Modal */}
      {showViewModal && selectedCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center overflow-hidden">
          <div className="bg-white rounded-lg w-full h-full max-h-screen flex flex-col" style={{ maxWidth: '1400px', margin: '2rem' }}>
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Sertifika Görüntüleme
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExportPDF()}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF İndir
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedCertificate(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="min-w-[297mm] flex justify-center">
                <div ref={certificateRef} className="shadow-lg">
                  <TrainingCertificateTemplate
                    data={{
                      participantName: selectedCertificate.participant_name,
                      customerName: selectedCertificate.customer.kisa_isim,
                      trainingDate: selectedCertificate.training_date,
                      trainingTitle: selectedCertificate.training_title,
                      companyName: companyData?.company_name || 'İlaçlamatik',
                      instructorName: selectedCertificate.instructor_name,
                      instructorTitle: selectedCertificate.instructor_title,
                      certificateNumber: selectedCertificate.certificate_number,
                      companyLogo: companyData?.logo_url
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerCertificates;