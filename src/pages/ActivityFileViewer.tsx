import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Award,
  Layers,
  TrendingUp,
  Package,
  Image as ImageIcon,
  Shield,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import FloorPlanPreview from '../components/Branches/FloorPlanPreview';

interface Document {
  id: string;
  title: string;
  document_type: string;
  file_url: string;
  created_at: string;
  description?: string;
}

interface FloorPlan {
  id: string;
  title: string;
  background_url: string;
  created_at: string;
}

interface RiskAssessment {
  id: string;
  created_at: string;
  updated_at: string;
}

interface TrendReport {
  id: string;
  report_date: string;
  created_at: string;
}

interface Equipment {
  id: string;
  equipment_name: string;
  equipment_type: string;
  quantity: number;
  location: string;
}

interface CategorySection {
  title: string;
  icon: React.ReactNode;
  documents: Document[];
  floorPlans?: FloorPlan[];
  riskAssessments?: RiskAssessment[];
  trendReports?: TrendReport[];
  equipment?: Equipment[];
}

const ActivityFileViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategorySection[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [customerName, setCustomerName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);

  const adminCustomerId = searchParams.get('customerId');
  const adminBranchId = searchParams.get('branchId');

  useEffect(() => {
    loadActivityFile();
  }, [adminCustomerId, adminBranchId]);

  const loadActivityFile = async () => {
    setLoading(true);
    try {
      let customerId: string | null = adminCustomerId;
      let branchId: string | null = adminBranchId;

      if (!customerId && !branchId) {
        const localSession = localAuth.getSession();
        if (localSession) {
          if (localSession.type === 'customer') {
            customerId = localSession.id;
            setCustomerName(localSession.name);
          } else if (localSession.type === 'branch') {
            branchId = localSession.id;
            setBranchName(localSession.name);

            const { data: branchData } = await supabase
              .from('branches')
              .select('customer_id, customers(kisa_isim)')
              .eq('id', branchId)
              .single();

            if (branchData) {
              customerId = branchData.customer_id;
              if (branchData.customers) {
                setCustomerName((branchData.customers as any).kisa_isim);
              }
            }
          }
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: customerData } = await supabase
              .from('customers')
              .select('id, kisa_isim')
              .eq('auth_id', user.id)
              .maybeSingle();

            if (customerData) {
              customerId = customerData.id;
              setCustomerName(customerData.kisa_isim);
            } else {
              const { data: branchData } = await supabase
                .from('branches')
                .select('id, sube_adi, customer_id, customers(kisa_isim)')
                .eq('auth_id', user.id)
                .maybeSingle();

              if (branchData) {
                branchId = branchData.id;
                setBranchName(branchData.sube_adi);
                customerId = branchData.customer_id;
                if (branchData.customers) {
                  setCustomerName((branchData.customers as any).kisa_isim);
                }
              }
            }
          }
        }
      } else {
        if (customerId) {
          const { data } = await supabase
            .from('customers')
            .select('kisa_isim')
            .eq('id', customerId)
            .single();
          if (data) setCustomerName(data.kisa_isim);
        }
        if (branchId) {
          const { data } = await supabase
            .from('branches')
            .select('sube_adi, customer_id, customers(kisa_isim)')
            .eq('id', branchId)
            .single();
          if (data) {
            setBranchName(data.sube_adi);
            if (!customerId) {
              customerId = data.customer_id;
              if (data.customers) {
                setCustomerName((data.customers as any).kisa_isim);
              }
            }
          }
        }
      }

      const categoriesData: CategorySection[] = [];

      const { data: publicDocs } = await supabase
        .from('documents')
        .select('*')
        .eq('entity_type', 'public')
        .order('created_at', { ascending: false });

      if (publicDocs && publicDocs.length > 0) {
        const groupedByType: { [key: string]: Document[] } = {};
        publicDocs.forEach(doc => {
          const type = doc.document_type || 'other';
          if (!groupedByType[type]) groupedByType[type] = [];
          groupedByType[type].push(doc);
        });

        Object.entries(groupedByType).forEach(([type, docs]) => {
          categoriesData.push({
            title: getDocumentTypeLabel(type),
            icon: <FileCheck className="w-5 h-5" />,
            documents: docs
          });
        });
      }

      if (customerId) {
        const { data: customerDocs } = await supabase
          .from('documents')
          .select('*')
          .eq('entity_type', 'customer')
          .eq('entity_id', customerId)
          .order('created_at', { ascending: false });

        if (customerDocs && customerDocs.length > 0) {
          categoriesData.push({
            title: 'Müşteriye Özel Belgeler',
            icon: <FileText className="w-5 h-5" />,
            documents: customerDocs
          });
        }

        const { data: riskAssessments } = await supabase
          .from('risk_assessments')
          .select('id, created_at, updated_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (riskAssessments && riskAssessments.length > 0) {
          categoriesData.push({
            title: 'Risk Değerlendirmeleri',
            icon: <Shield className="w-5 h-5" />,
            documents: [],
            riskAssessments
          });
        }

        const { data: trendReports } = await supabase
          .from('trend_analysis_reports')
          .select('id, report_date, created_at')
          .eq('customer_id', customerId)
          .order('report_date', { ascending: false });

        if (trendReports && trendReports.length > 0) {
          categoriesData.push({
            title: 'Trend Analiz Raporları',
            icon: <TrendingUp className="w-5 h-5" />,
            documents: [],
            trendReports
          });
        }
      }

      if (branchId) {
        setCurrentBranchId(branchId);

        const { data: branchDocs } = await supabase
          .from('documents')
          .select('*')
          .eq('entity_type', 'branch')
          .eq('entity_id', branchId)
          .order('created_at', { ascending: false });

        if (branchDocs && branchDocs.length > 0) {
          categoriesData.push({
            title: 'Şubeye Özel Belgeler',
            icon: <FileText className="w-5 h-5" />,
            documents: branchDocs
          });
        }

        const { data: floorPlans } = await supabase
          .from('branch_floor_plans')
          .select('id, title, background_url, created_at')
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false });

        if (floorPlans && floorPlans.length > 0) {
          categoriesData.push({
            title: 'Kroki ve Yerleşim Planları',
            icon: <ImageIcon className="w-5 h-5" />,
            documents: [],
            floorPlans
          });
        }

        const { data: equipment } = await supabase
          .from('branch_equipment')
          .select('id, equipment_name, equipment_type, quantity, location')
          .eq('branch_id', branchId)
          .order('equipment_name', { ascending: true });

        if (equipment && equipment.length > 0) {
          categoriesData.push({
            title: 'Ekipman Listesi',
            icon: <Package className="w-5 h-5" />,
            documents: [],
            equipment
          });
        }
      }

      setCategories(categoriesData);
      setExpandedCategories(new Set(categoriesData.map(c => c.title)));
    } catch (error) {
      console.error('Error loading activity file:', error);
      toast.error('Faaliyet dosyası yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      quality: 'Kalite Belgeleri',
      license: 'Lisanslar ve İzinler',
      biocidal: 'Biyosidal Ürün Ruhsatları',
      operator_cert: 'Operatör Sertifikaları',
      tse: 'TSE Belgeleri',
      other: 'Diğer Belgeler'
    };
    return labels[type] || 'Genel Belgeler';
  };

  const toggleCategory = (title: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const handleDownloadDocument = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Belge indiriliyor...');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Belge indirilirken hata oluştu');
    }
  };

  const handleViewDocument = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Faaliyet dosyası yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Faaliyet Dosyası</h1>
        {customerName && (
          <p className="text-gray-600 mt-2">
            {customerName} {branchName && `- ${branchName}`}
          </p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Tüm belgeler, raporlar ve değerlendirmeler tek bir yerde
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Henüz hiç belge veya rapor bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const isExpanded = expandedCategories.has(category.title);
            const totalItems =
              category.documents.length +
              (category.floorPlans?.length || 0) +
              (category.riskAssessments?.length || 0) +
              (category.trendReports?.length || 0) +
              (category.equipment?.length || 0);

            return (
              <div key={category.title} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.title)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-600">{category.icon}</div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{category.title}</h3>
                      <p className="text-sm text-gray-500">{totalItems} öğe</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4">
                    {category.documents.length > 0 && (
                      <div className="space-y-2">
                        {category.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                                {doc.description && (
                                  <p className="text-sm text-gray-500 truncate">{doc.description}</p>
                                )}
                                <p className="text-xs text-gray-400">
                                  {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <button
                                onClick={() => handleViewDocument(doc.file_url)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Görüntüle"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadDocument(doc.file_url, doc.title)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="İndir"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {category.floorPlans && category.floorPlans.length > 0 && currentBranchId && (
                      <div className="space-y-4 mt-4">
                        <h4 className="font-medium text-gray-700 mb-2">Kroki ve Planlar</h4>
                        {category.floorPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-all"
                          >
                            <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <ImageIcon className="w-5 h-5 text-blue-600" />
                                <div>
                                  <p className="font-medium text-gray-900">{plan.title}</p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(plan.created_at).toLocaleDateString('tr-TR')}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="p-4 bg-gray-50">
                              <FloorPlanPreview planId={plan.id} branchId={currentBranchId} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {category.riskAssessments && category.riskAssessments.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <h4 className="font-medium text-gray-700 mb-2">Risk Değerlendirmeleri</h4>
                        {category.riskAssessments.map((assessment) => (
                          <div
                            key={assessment.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <Shield className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900">Risk Değerlendirmesi</p>
                                <p className="text-xs text-gray-400">
                                  {new Date(assessment.created_at).toLocaleDateString('tr-TR')}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => navigate(`/modules`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Görüntüle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {category.trendReports && category.trendReports.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <h4 className="font-medium text-gray-700 mb-2">Trend Analiz Raporları</h4>
                        {category.trendReports.map((report) => (
                          <div
                            key={report.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <TrendingUp className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {new Date(report.report_date).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                                </p>
                                <p className="text-xs text-gray-400">
                                  Oluşturulma: {new Date(report.created_at).toLocaleDateString('tr-TR')}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => navigate(`/customer/trend-report/${report.id}`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Görüntüle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {category.equipment && category.equipment.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <h4 className="font-medium text-gray-700 mb-2">Ekipman Listesi</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ekipman Adı</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Adet</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lokasyon</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {category.equipment.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-900">{item.equipment_name}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{item.equipment_type}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{item.quantity}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{item.location}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityFileViewer;
