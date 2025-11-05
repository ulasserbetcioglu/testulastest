import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Plus, Trash2, Eye, X, Save, Search, Filter } from 'lucide-react';
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
  created_by: string;
  customer: {
    kisa_isim: string;
  };
  branch?: {
    sube_adi: string;
  };
  creator?: {
    email: string;
  };
}

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
}

interface CompanyData {
  company_name: string;
  logo_url: string;
}

interface CertificateFormData {
  customerId: string;
  branchId: string;
  participantName: string;
  trainingDate: string;
  trainingTitle: string;
  instructorName: string;
  instructorTitle: string;
}

interface BulkCertificateFormData {
  customerId: string;
  branchId: string;
  participantNames: string;
  trainingDate: string;
  trainingTitle: string;
  instructorName: string;
  instructorTitle: string;
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

const Certificates: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [assignedCustomers, setAssignedCustomers] = useState<string[] | null>(null);
  const [assignedBranches, setAssignedBranches] = useState<string[] | null>(null);
  const [success, setSuccess] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  
  const [formData, setFormData] = useState<CertificateFormData>({
    customerId: '',
    branchId: '',
    participantName: '',
    trainingDate: new Date().toISOString().split('T')[0],
    trainingTitle: '',
    instructorName: '',
    instructorTitle: ''
  });
  
  const [bulkFormData, setBulkFormData] = useState<BulkCertificateFormData>({
    customerId: '',
    branchId: '',
    participantNames: '',
    trainingDate: new Date().toISOString().split('T')[0],
    trainingTitle: '',
    instructorName: '',
    instructorTitle: ''
  });
  
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUserRole();
    fetchCompanyData();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchCustomers();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (formData.customerId) {
      fetchBranches(formData.customerId);
    } else {
      setFilteredBranches([]);
    }
  }, [formData.customerId]);

  useEffect(() => {
    if (bulkFormData.customerId) {
      fetchBranches(bulkFormData.customerId);
    }
  }, [bulkFormData.customerId]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setIsAdmin(user.email === 'admin@ilaclamatik.com');
      
      // Check if user is a customer
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();
        
      if (customerData) {
        setUserRole('customer');
        setEntityId(customerData.id);
        fetchCertificates();
        return;
      }
      
      // Check if user is a branch
      const { data: branchData } = await supabase
        .from('branches')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();
        
      if (branchData) {
        setUserRole('branch');
        setEntityId(branchData.id);
        fetchCertificates();
        return;
      }
      
      // Check if user is an operator
      const { data: operatorData } = await supabase
        .from('operators')
        .select('id, assigned_customers, assigned_branches')
        .eq('auth_id', user.id)
        .maybeSingle();
        
      if (operatorData) {
        setUserRole('operator');
        setAssignedCustomers(operatorData.assigned_customers);
        setAssignedBranches(operatorData.assigned_branches);
        fetchCertificates();
        return;
      }
      
      // If admin or other role
      fetchCertificates();
    } catch (err: any) {
      console.error('Error checking user role:', err);
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
      
      let query = supabase
        .from('certificates')
        .select(`
          *,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi)
        `)
        .order('created_at', { ascending: false });
        
      // Filter by user role and entity
      if (userRole === 'customer' && entityId) {
        query = query.eq('customer_id', entityId);
      } else if (userRole === 'branch' && entityId) {
        query = query.eq('branch_id', entityId);
      } else if (userRole === 'operator') {
        // For operators, filter by assigned customers and branches
        if (assignedCustomers && assignedCustomers.length > 0) {
          query = query.in('customer_id', assignedCustomers);
        }
        
        if (assignedBranches && assignedBranches.length > 0) {
          query = query.or(`branch_id.in.(${assignedBranches.join(',')}),branch_id.is.null`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setCertificates(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, kisa_isim')
        .order('kisa_isim');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchBranches = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, sube_adi, customer_id')
        .eq('customer_id', customerId)
        .order('sube_adi');

      if (error) throw error;
      setFilteredBranches(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPreview(true);
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if participant names are provided
    if (!bulkFormData.participantNames.trim()) {
      toast.error('Lütfen en az bir katılımcı adı girin');
      return;
    }
    
    setShowBulkModal(false);
    handleSaveBulkCertificates();
  };

  const handleSaveCertificate = async () => {
    try {
      setLoading(true);
      
      // Generate certificate number
      const certificateNumber = 'CERT-' + Date.now().toString().slice(-6);
      
      // Insert certificate record
      const { data, error } = await supabase
        .from('certificates')
        .insert({
          certificate_number: certificateNumber,
          participant_name: formData.participantName,
          training_date: formData.trainingDate,
          training_title: formData.trainingTitle,
          instructor_name: formData.instructorName,
          instructor_title: formData.instructorTitle,
          customer_id: formData.customerId,
          branch_id: formData.branchId || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Export PDF and save it to storage
      await handleExportPDF();
      
      toast.success('Sertifika başarıyla kaydedildi');
      setShowPreview(false);
      setShowAddModal(false);
      resetForm();
      fetchCertificates();
    } catch (err: any) {
      setError(err.message);
      toast.error('Sertifika kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBulkCertificates = async () => {
    try {
      setLoading(true);
      
      // Split participant names by newline
      const participantNames = bulkFormData.participantNames
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      if (participantNames.length === 0) {
        throw new Error('Lütfen en az bir katılımcı adı girin');
      }
      
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create certificates for each participant
      const certificatesToInsert = participantNames.map(name => ({
        certificate_number: 'CERT-' + Date.now().toString().slice(-6) + '-' + Math.random().toString(36).substring(2, 5),
        participant_name: name,
        training_date: bulkFormData.trainingDate,
        training_title: bulkFormData.trainingTitle,
        instructor_name: bulkFormData.instructorName,
        instructor_title: bulkFormData.instructorTitle,
        customer_id: bulkFormData.customerId,
        branch_id: bulkFormData.branchId || null,
        created_by: user?.id
      }));
      
      // Insert all certificates
      const { error } = await supabase
        .from('certificates')
        .insert(certificatesToInsert);
      
      if (error) throw error;
      
      toast.success(`${participantNames.length} sertifika başarıyla oluşturuldu`);
      resetBulkForm();
      fetchCertificates();
    } catch (err: any) {
      setError(err.message);
      toast.error('Sertifikalar oluşturulurken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async (cert?: Certificate) => {
    if (!certificateRef.current) return;
    
    try {
      const certificate = cert || {
        participant_name: formData.participantName,
        customer: { kisa_isim: customers.find(c => c.id === formData.customerId)?.kisa_isim || '' },
        training_date: formData.trainingDate,
        training_title: formData.trainingTitle,
        instructor_name: formData.instructorName,
        instructor_title: formData.instructorTitle,
        certificate_number: 'CERT-' + Date.now().toString().slice(-6)
      };
      
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

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('Sadece admin kullanıcısı sertifika silebilir');
      return;
    }
    
    if (!confirm('Bu sertifikayı silmek istediğinizden emin misiniz?')) return;
    
    try {
      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success('Sertifika başarıyla silindi');
      fetchCertificates();
    } catch (err: any) {
      setError(err.message);
      toast.error('Sertifika silinirken bir hata oluştu');
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      branchId: '',
      participantName: '',
      trainingDate: new Date().toISOString().split('T')[0],
      trainingTitle: '',
      instructorName: '',
      instructorTitle: ''
    });
    setSuccess(false);
    setError(null);
  };

  const resetBulkForm = () => {
    setBulkFormData({
      customerId: '',
      branchId: '',
      participantNames: '',
      trainingDate: new Date().toISOString().split('T')[0],
      trainingTitle: '',
      instructorName: '',
      instructorTitle: ''
    });
  };

  // Filter certificates based on search and filters
  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = 
      cert.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.training_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.customer.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cert.branch?.sube_adi || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCustomer = !selectedCustomer || cert.customer_id === selectedCustomer;
    const matchesBranch = !selectedBranch || cert.branch_id === selectedBranch;
    
    const certDate = new Date(cert.training_date);
    const matchesStartDate = !startDate || certDate >= new Date(startDate);
    const matchesEndDate = !endDate || certDate <= new Date(endDate);
    
    return matchesSearch && matchesCustomer && matchesBranch && matchesStartDate && matchesEndDate;
  });

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">SERTİFİKALAR</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Toplu Sertifika
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Yeni Sertifika
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Katılımcı, eğitim veya müşteri ara..."
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
            {isAdmin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Müşteri
                  </label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Tüm Müşteriler</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.kisa_isim}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şube
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={!selectedCustomer}
                  >
                    <option value="">Tüm Şubeler</option>
                    {filteredBranches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.sube_adi}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
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
                  Müşteri/Şube
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {certificate.customer.kisa_isim}
                      </div>
                      {certificate.branch && (
                        <div className="text-sm text-gray-500">
                          {certificate.branch.sube_adi}
                        </div>
                      )}
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
                          onClick={() => handleExportPDF(certificate)}
                          className="text-green-600 hover:text-green-900"
                          title="İndir"
                        >
                          <Download size={16} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(certificate.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Certificate Modal - Only for Admin */}
      {isAdmin && showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Yeni Sertifika Oluştur
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Müşteri
                </label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="">Müşteri Seçin</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.kisa_isim}
                    </option>
                  ))}
                </select>
              </div>

              {formData.customerId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Şube (Opsiyonel)
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                  >
                    <option value="">Şube Seçin (Opsiyonel)</option>
                    {filteredBranches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.sube_adi}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Katılımcı Adı
                </label>
                <input
                  type="text"
                  required
                  value={formData.participantName}
                  onChange={(e) => setFormData({ ...formData, participantName: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Eğitim Tarihi
                </label>
                <input
                  type="date"
                  required
                  value={formData.trainingDate}
                  onChange={(e) => setFormData({ ...formData, trainingDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Eğitim Konusu
                </label>
                <input
                  type="text"
                  required
                  value={formData.trainingTitle}
                  onChange={(e) => setFormData({...formData, trainingTitle: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Eğitmen Adı
                </label>
                <input
                  type="text"
                  required
                  value={formData.instructorName}
                  onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Eğitmen Ünvanı
                </label>
                <input
                  type="text"
                  required
                  value={formData.instructorTitle}
                  onChange={(e) => setFormData({ ...formData, instructorTitle: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Önizle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Certificate Modal - Only for Admin */}
      {isAdmin && showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Toplu Sertifika Oluştur
              </h2>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Müşteri
                </label>
                <select
                  required
                  value={bulkFormData.customerId}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, customerId: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="">Müşteri Seçin</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.kisa_isim}
                    </option>
                  ))}
                </select>
              </div>

              {bulkFormData.customerId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Şube (Opsiyonel)
                  </label>
                  <select
                    value={bulkFormData.branchId}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, branchId: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                  >
                    <option value="">Şube Seçin (Opsiyonel)</option>
                    {filteredBranches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.sube_adi}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Katılımcı Adları (Her satıra bir isim)
                </label>
                <textarea
                  required
                  value={bulkFormData.participantNames}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, participantNames: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                  rows={5}
                  placeholder="Ahmet Yılmaz&#10;Mehmet Kaya&#10;Ayşe Demir"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Eğitim Tarihi
                </label>
                <input
                  type="date"
                  required
                  value={bulkFormData.trainingDate}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, trainingDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Eğitim Konusu
                </label>
                <input
                  type="text"
                  required
                  value={bulkFormData.trainingTitle}
                  onChange={(e) => setBulkFormData({...bulkFormData, trainingTitle: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Eğitmen Adı
                </label>
                <input
                  type="text"
                  required
                  value={bulkFormData.instructorName}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, instructorName: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Eğitmen Ünvanı
                </label>
                <input
                  type="text"
                  required
                  value={bulkFormData.instructorTitle}
                  onChange={(e) => setBulkFormData({ ...bulkFormData, instructorTitle: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Sertifikaları Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Preview Modal - Only for Admin */}
      {isAdmin && showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center overflow-hidden">
          <div className="bg-white rounded-lg w-full h-full max-h-screen flex flex-col" style={{ maxWidth: '1400px', margin: '2rem' }}>
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Sertifika Önizleme
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveCertificate}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Kaydet
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF İndir
                </button>
                <button
                  onClick={() => setShowPreview(false)}
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
                      participantName: formData.participantName,
                      customerName: customers.find(c => c.id === formData.customerId)?.kisa_isim || '',
                      trainingDate: formData.trainingDate,
                      trainingTitle: formData.trainingTitle,
                      companyName: companyData?.company_name || 'İlaçlamatik',
                      instructorName: formData.instructorName,
                      instructorTitle: formData.instructorTitle,
                      certificateNumber: 'CERT-' + Date.now().toString().slice(-6),
                      companyLogo: companyData?.logo_url
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  onClick={() => handleExportPDF(selectedCertificate)}
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

export default Certificates;