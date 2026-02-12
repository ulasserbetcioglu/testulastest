import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, AlertTriangle, CheckCircle, Shield, Bug, Rat, Bird, Skull, Calendar, User, Building, Home, Send, Image, Trash2, Printer, Warehouse, Zap, PenTool as Tool, Phone } from 'lucide-react';
import html2canvas from 'html2canvas';
// Yol ../../ olarak güncellendi
import { supabase } from '../../lib/supabase';

// Veri yapıları güncellendi
interface Company {
  id: string;
  name: string;
  logo_url?: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  musteri_id: string;
}

interface AssessmentData {
  assessorCompany: string;
  assessorName: string;
  clientCompany: string;
  clientName: string;
  customerId?: string; // Müşteri ID'si
  branchId?: string; // Şube ID'si
  assessmentDate: string;
  propertyType: string;
  rodentRisk: string;
  insectRisk: string;
  birdRisk: string;
  otherRisk: string;
  storagePestRisk: string;
  flyingPestRisk: string;
  equipmentRisk: string;
  logoUrl: string; // Sadece URL tutulacak
}

interface RiskLevel {
  value: string;
  label: string;
  color: string;
  description: string;
  recommendations: string[];
}

const RiskAssessmentPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [companies, setCompanies] = useState<Company[]>([]); // Şirketleri tutmak için state
  const [branches, setBranches] = useState<Branch[]>([]); // Şubeleri tutmak için state
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    assessorCompany: '',
    assessorName: '',
    clientCompany: '',
    clientName: '',
    customerId: '',
    branchId: '',
    assessmentDate: new Date().toISOString().split('T')[0],
    propertyType: 'commercial',
    rodentRisk: 'low',
    insectRisk: 'medium',
    birdRisk: 'low',
    otherRisk: 'none',
    storagePestRisk: 'low',
    flyingPestRisk: 'medium',
    equipmentRisk: 'low',
    logoUrl: '' // logoFile kaldırıldı
  });
  const [generating, setGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Sayfa yüklendiğinde şirketleri ve şubeleri Supabase'den çek
  useEffect(() => {
    const fetchCompanies = async () => {
      // DÜZELTME: Tablo adı 'companies' yerine 'customers' olarak değiştirildi.
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, logo_url');

      if (error) {
        console.error('Şirketler çekilirken hata oluştu:', error);
      } else if (data) {
        setCompanies(data);
      }
    };

    const fetchBranches = async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, sube_adi, musteri_id');

      if (error) {
        console.error('Şubeler çekilirken hata oluştu:', error);
      } else if (data) {
        setBranches(data);
      }
    };

    fetchCompanies();
    fetchBranches();
  }, []);


  const propertyTypes = [
    { value: 'commercial', label: 'Ticari Bina' },
    { value: 'industrial', label: 'Endüstriyel Tesis' },
    { value: 'residential', label: 'Konut' },
    { value: 'warehouse', label: 'Depo' },
    { value: 'restaurant', label: 'Restoran' },
    { value: 'hotel', label: 'Otel' },
    { value: 'hospital', label: 'Hastane' },
    { value: 'school', label: 'Okul' },
    { value: 'office', label: 'Ofis' }
  ];

  const riskLevels: Record<string, RiskLevel> = {
    none: {
      value: 'none',
      label: 'Risk Yok',
      color: 'bg-gray-100 text-gray-800',
      description: 'Herhangi bir risk tespit edilmemiştir.',
      recommendations: [
        'Düzenli kontroller yapılmalıdır',
        'Personel eğitimleri sürdürülmelidir',
        'Mevcut önleyici tedbirler korunmalıdır'
      ]
    },
    low: {
      value: 'low',
      label: 'Düşük Risk',
      color: 'bg-green-100 text-green-800',
      description: 'Minimal risk tespit edilmiştir. Basit önlemlerle kontrol altında tutulabilir.',
      recommendations: [
        'Temel hijyen uygulamaları sürdürülmelidir',
        'Giriş noktaları düzenli kontrol edilmelidir',
        'Çevre düzenlemesi yapılmalıdır',
        'Basit tuzak sistemleri kurulabilir'
      ]
    },
    medium: {
      value: 'medium',
      label: 'Orta Risk',
      color: 'bg-yellow-100 text-yellow-800',
      description: 'Belirgin risk tespit edilmiştir. Sistematik önlemler gereklidir.',
      recommendations: [
        'Kapsamlı bir zararlı mücadele programı uygulanmalıdır',
        'Giriş noktaları kapatılmalıdır',
        'Düzenli monitoring yapılmalıdır',
        'Personel eğitimleri artırılmalıdır',
        'Periyodik ilaçlama programı uygulanmalıdır'
      ]
    },
    high: {
      value: 'high',
      label: 'Yüksek Risk',
      color: 'bg-orange-100 text-orange-800',
      description: 'Ciddi risk tespit edilmiştir. Acil ve kapsamlı önlemler gereklidir.',
      recommendations: [
        'Acil müdahale planı uygulanmalıdır',
        'Yoğun ilaçlama programı başlatılmalıdır',
        'Yapısal iyileştirmeler yapılmalıdır',
        'Günlük monitoring sistemi kurulmalıdır',
        'Personel eğitimleri zorunlu tutulmalıdır',
        'Profesyonel zararlı mücadele firması ile anlaşılmalıdır'
      ]
    },
    critical: {
      value: 'critical',
      label: 'Kritik Risk',
      color: 'bg-red-100 text-red-800',
      description: 'Çok ciddi risk tespit edilmiştir. Acil durum müdahalesi gereklidir.',
      recommendations: [
        'Acil durum müdahalesi yapılmalıdır',
        'Operasyonlar geçici olarak durdurulabilir',
        'Kapsamlı sanitasyon uygulanmalıdır',
        'Yapısal sorunlar hemen giderilmelidir',
        'Sürekli monitoring ve kontrol sistemi kurulmalıdır',
        'Uzman ekip ile sürekli destek alınmalıdır',
        'Personel için özel eğitim programı uygulanmalıdır'
      ]
    }
  };

  // YENİ: Grafik çubuk renkleri için harita
  const riskGraphColorMap = {
    none: 'bg-gray-400',
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-600',
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAssessmentData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAssessorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const companyId = e.target.value;
    const selectedCompany = companies.find(c => c.id.toString() === companyId);
    if (selectedCompany) {
      setAssessmentData(prev => ({
        ...prev,
        assessorCompany: selectedCompany.name,
        logoUrl: selectedCompany.logo_url || ''
      }));
    }
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const companyId = e.target.value;
    const selectedCompany = companies.find(c => c.id.toString() === companyId);
    if (selectedCompany) {
      setAssessmentData(prev => ({
        ...prev,
        customerId: selectedCompany.id,
        clientCompany: selectedCompany.name,
        branchId: '' // Reset branch when customer changes
      }));
      // Filter branches for selected customer
      setFilteredBranches(branches.filter(b => b.musteri_id === selectedCompany.id));
    }
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branchId = e.target.value;
    setAssessmentData(prev => ({
      ...prev,
      branchId: branchId
    }));
  };

  const saveAssessment = async (reportUrl: string) => {
    try {
      const { error } = await supabase
        .from('risk_assessments')
        .insert([
          {
            customer_id: assessmentData.customerId || null,
            branch_id: assessmentData.branchId || null,
            assessor_company: assessmentData.assessorCompany,
            assessor_name: assessmentData.assessorName,
            client_company: assessmentData.clientCompany,
            client_name: assessmentData.clientName,
            assessment_date: assessmentData.assessmentDate,
            next_assessment_date: new Date(new Date(assessmentData.assessmentDate).setFullYear(new Date(assessmentData.assessmentDate).getFullYear() + 1)).toISOString().split('T')[0],
            property_type: assessmentData.propertyType,
            rodent_risk: assessmentData.rodentRisk,
            insect_risk: assessmentData.insectRisk,
            bird_risk: assessmentData.birdRisk,
            other_risk: assessmentData.otherRisk,
            storage_pest_risk: assessmentData.storagePestRisk,
            flying_pest_risk: assessmentData.flyingPestRisk,
            equipment_risk: assessmentData.equipmentRisk,
            status: 'active',
            report_url: reportUrl
          }
        ]);

      if (error) {
        throw new Error(`Değerlendirme kaydedilirken hata:\n\n${error.message}`);
      }
    } catch (error) {
      console.error('Değerlendirme kaydedilirken hata:', error);
      throw error;
    }
  };

  const generateJpeg = async () => {
    if (!acceptTerms || !acceptPrivacy) {
      alert('Lütfen gizlilik politikası ve kullanım şartlarını kabul edin.');
      return;
    }
    
    if (!reportRef.current) return;
    
    setGenerating(true);
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff'
      });
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `risk_assessment_${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          try {
            const { data, error } = await supabase.storage
              .from('documents')
              .upload(`risk_assessments/${file.name}`, file);
            
            if (error) {
              throw new Error(`Değerlendirme yüklenirken hata:\n\n${error.message}`);
            }
            
            const { data: urlData } = supabase.storage
              .from('documents')
              .getPublicUrl(`risk_assessments/${file.name}`);
            
            const reportUrl = urlData.publicUrl;
            
            await saveAssessment(reportUrl);
            
            setGeneratedImageUrl(reportUrl);
            setCurrentStep(3);
          } catch (error) {
            console.error('Rapor oluşturma sırasında hata:', error);
            alert('Rapor oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
          }
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Rapor oluşturulurken hata:', error);
      alert('Rapor oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = () => {
    if (generatedImageUrl) {
      const link = document.createElement('a');
      link.href = generatedImageUrl;
      link.download = `Risk_Degerlendirme_${assessmentData.clientCompany.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const printReport = () => {
    if (generatedImageUrl) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Risk Değerlendirme Raporu</title>
              <style>
                body { margin: 0; padding: 0; }
                img { width: 100%; height: auto; }
              </style>
            </head>
            <body>
              <img src="${generatedImageUrl}" alt="Risk Değerlendirme Raporu" />
              <script>
                window.onload = function() {
                  window.print();
                  window.setTimeout(function() { window.close(); }, 500);
                }
              <\/script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const getOverallRiskLevel = () => {
    const riskValues = {
      'none': 0, 'low': 1, 'medium': 2, 'high': 3, 'critical': 4
    };
    
    const risks = [
      riskValues[assessmentData.rodentRisk as keyof typeof riskValues],
      riskValues[assessmentData.insectRisk as keyof typeof riskValues],
      riskValues[assessmentData.birdRisk as keyof typeof riskValues],
      riskValues[assessmentData.otherRisk as keyof typeof riskValues],
      riskValues[assessmentData.storagePestRisk as keyof typeof riskValues],
      riskValues[assessmentData.flyingPestRisk as keyof typeof riskValues],
      riskValues[assessmentData.equipmentRisk as keyof typeof riskValues]
    ];
    
    const maxRisk = Math.max(...risks);
    const avgRisk = risks.reduce((a, b) => a + b, 0) / risks.length;
    
    if (maxRisk === 4) return 'critical';
    if (maxRisk === 3) return 'high';
    if (avgRisk >= 2) return 'medium';
    if (avgRisk >= 1) return 'low';
    return 'none';
  };

  const getPropertyTypeLabel = (value: string) => {
    const type = propertyTypes.find(t => t.value === value);
    return type ? type.label : value;
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      return (
        assessmentData.assessorCompany.trim() !== '' &&
        assessmentData.assessorName.trim() !== '' &&
        assessmentData.clientCompany.trim() !== '' &&
        assessmentData.clientName.trim() !== ''
      );
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      alert('Lütfen tüm gerekli alanları doldurun.');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const resetForm = () => {
    setAssessmentData({
      assessorCompany: '',
      assessorName: '',
      clientCompany: '',
      clientName: '',
      assessmentDate: new Date().toISOString().split('T')[0],
      propertyType: 'commercial',
      rodentRisk: 'low',
      insectRisk: 'medium',
      birdRisk: 'low',
      otherRisk: 'none',
      storagePestRisk: 'low',
      flyingPestRisk: 'medium',
      equipmentRisk: 'low',
      logoUrl: ''
    });
    setGeneratedImageUrl(null);
    setAcceptTerms(false);
    setAcceptPrivacy(false);
    setCurrentStep(1);
  };

  return (
    <div className="pt-8">
      <section className="bg-gradient-to-br from-blue-50 to-blue-100 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-6">
            <FileText className="h-12 w-12 text-blue-600 mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
              Risk Değerlendirme Modülü
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Zararlı mücadelesi için profesyonel risk değerlendirme raporu oluşturun. 
            Müşterilerinize sunabileceğiniz detaylı risk analizi ve öneriler.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto mb-12">
            <div className="flex items-center justify-between">
              {[
                { step: 1, title: 'Bilgi Girişi' },
                { step: 2, title: 'Risk Değerlendirme' },
                { step: 3, title: 'Rapor' }
              ].map(({ step, title }, index, arr) => (
                <div key={step} className="flex items-center w-full">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {step}
                    </div>
                    <span className={`mt-2 text-sm text-center ${currentStep >= step ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      {title}
                    </span>
                  </div>
                  {index < arr.length - 1 && (
                    <div className={`flex-grow h-1 mx-4 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {currentStep === 1 && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Değerlendirme Bilgileri</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Değerlendirmeyi Yapan</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Firma Adı *</label>
                        <select
                          name="assessorCompany"
                          onChange={handleAssessorChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Firma Seçin</option>
                          {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Değerlendirmeyi Yapan Kişi *</label>
                        <input type="text" name="assessorName" value={assessmentData.assessorName} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ad Soyad" />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Müşteri Bilgileri</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Müşteri Firma Adı *</label>
                         <select
                          name="clientCompany"
                          onChange={handleClientChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Müşteri Seçin</option>
                          {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                          ))}
                        </select>
                      </div>
                      {filteredBranches.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Şube (Opsiyonel)</label>
                          <select
                            name="branchId"
                            value={assessmentData.branchId || ''}
                            onChange={handleBranchChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Şube Seçin (Opsiyonel)</option>
                            {filteredBranches.map((branch) => (
                              <option key={branch.id} value={branch.id}>
                                {branch.sube_adi}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Müşteri Yetkilisi *</label>
                        <input type="text" name="clientName" value={assessmentData.clientName} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ad Soyad" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Değerlendirme Tarihi</label>
                        <input type="date" name="assessmentDate" value={assessmentData.assessmentDate} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tesis Türü</label>
                        <select name="propertyType" value={assessmentData.propertyType} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                          {propertyTypes.map((type) => (<option key={type.value} value={type.value}>{type.label}</option>))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button onClick={nextStep} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">İleri</button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Risk Değerlendirmesi</h2>
                
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center mb-4"><Rat className="h-6 w-6 text-orange-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Kemirgen Riski</h3></div>
                    <select name="rodentRisk" value={assessmentData.rodentRisk} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="none">Risk Yok</option><option value="low">Düşük Risk</option><option value="medium">Orta Risk</option><option value="high">Yüksek Risk</option><option value="critical">Kritik Risk</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-600">{riskLevels[assessmentData.rodentRisk].description}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-4"><Bug className="h-6 w-6 text-green-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Böcek Riski</h3></div>
                    <select name="insectRisk" value={assessmentData.insectRisk} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="none">Risk Yok</option><option value="low">Düşük Risk</option><option value="medium">Orta Risk</option><option value="high">Yüksek Risk</option><option value="critical">Kritik Risk</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-600">{riskLevels[assessmentData.insectRisk].description}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-4"><Bird className="h-6 w-6 text-blue-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Kuş Riski</h3></div>
                    <select name="birdRisk" value={assessmentData.birdRisk} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="none">Risk Yok</option><option value="low">Düşük Risk</option><option value="medium">Orta Risk</option><option value="high">Yüksek Risk</option><option value="critical">Kritik Risk</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-600">{riskLevels[assessmentData.birdRisk].description}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-4"><Warehouse className="h-6 w-6 text-amber-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Ambar Zararlıları Riski</h3></div>
                    <select name="storagePestRisk" value={assessmentData.storagePestRisk} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="none">Risk Yok</option><option value="low">Düşük Risk</option><option value="medium">Orta Risk</option><option value="high">Yüksek Risk</option><option value="critical">Kritik Risk</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-600">{riskLevels[assessmentData.storagePestRisk].description}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-4"><Zap className="h-6 w-6 text-indigo-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Uçkun Haşere Riski</h3></div>
                    <select name="flyingPestRisk" value={assessmentData.flyingPestRisk} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="none">Risk Yok</option><option value="low">Düşük Risk</option><option value="medium">Orta Risk</option><option value="high">Yüksek Risk</option><option value="critical">Kritik Risk</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-600">{riskLevels[assessmentData.flyingPestRisk].description}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-4"><Tool className="h-6 w-6 text-gray-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Yetersiz Ekipman Riski</h3></div>
                    <select name="equipmentRisk" value={assessmentData.equipmentRisk} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="none">Risk Yok</option><option value="low">Düşük Risk</option><option value="medium">Orta Risk</option><option value="high">Yüksek Risk</option><option value="critical">Kritik Risk</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-600">{riskLevels[assessmentData.equipmentRisk].description}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-4"><Skull className="h-6 w-6 text-purple-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Diğer Zararlı Riski</h3></div>
                    <select name="otherRisk" value={assessmentData.otherRisk} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="none">Risk Yok</option><option value="low">Düşük Risk</option><option value="medium">Orta Risk</option><option value="high">Yüksek Risk</option><option value="critical">Kritik Risk</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-600">{riskLevels[assessmentData.otherRisk].description}</p>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <div className="flex items-start"><input type="checkbox" id="accept-privacy" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} className="mt-1 mr-2" required /><label htmlFor="accept-privacy" className="text-sm text-gray-600">Gizlilik Politikası'nı okudum ve kabul ediyorum. *</label></div>
                  <div className="flex items-start"><input type="checkbox" id="accept-terms" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 mr-2" required /><label htmlFor="accept-terms" className="text-sm text-gray-600">Kullanım Şartları'nı okudum ve kabul ediyorum. *</label></div>
                </div>

                <div className="mt-8 flex justify-between">
                  <button onClick={prevStep} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Geri</button>
                  <button onClick={generateJpeg} disabled={generating || !acceptTerms || !acceptPrivacy} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2">
                    {generating ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Oluşturuluyor...</span></>) : (<><FileText className="h-5 w-5" /><span>Rapor Oluştur</span></>)}
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && generatedImageUrl && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="h-8 w-8 text-green-600" /></div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Rapor Başarıyla Oluşturuldu</h2>
                  <p className="text-gray-600">Risk değerlendirme raporunuz hazır. İndirmek veya yazdırmak için aşağıdaki butonları kullanabilirsiniz.</p>
                </div>
                
                <div className="mb-8"><img src={generatedImageUrl} alt="Risk Değerlendirme Raporu" className="w-full rounded-lg shadow-lg" /></div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={downloadImage} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"><Download className="h-5 w-5" /><span>JPEG İndir</span></button>
                  <button onClick={printReport} className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"><Printer className="h-5 w-5" /><span>Yazdır</span></button>
                  <button onClick={resetForm} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Yeni Rapor Oluştur</button>
                </div>
              </div>
            </div>
          )}

          <div className="hidden">
            <div ref={reportRef} className="bg-white w-[1200px] h-[1697px] relative" style={{ fontFamily: 'Arial, sans-serif' }}>
              <div className="bg-blue-600 text-white p-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Zararlı Mücadelesi Risk Değerlendirme Raporu</h1>
                    <p className="text-blue-100">Değerlendirme Tarihi: {new Date(assessmentData.assessmentDate).toLocaleDateString('tr-TR')}</p>
                  </div>
                  {assessmentData.logoUrl && (<div className="bg-white p-2 rounded-lg"><img src={assessmentData.logoUrl} alt="Firma Logosu" className="h-20 w-auto object-contain" crossOrigin="anonymous" /></div>)}
                </div>
              </div>
              
              <div className="p-8 grid grid-cols-2 gap-8 border-b">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Değerlendirmeyi Yapan</h2>
                  <div className="space-y-2">
                    <div className="flex items-center"><Building className="h-5 w-5 text-blue-600 mr-2" /><span className="font-medium">{assessmentData.assessorCompany}</span></div>
                    <div className="flex items-center"><User className="h-5 w-5 text-blue-600 mr-2" /><span>{assessmentData.assessorName}</span></div>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Müşteri Bilgileri</h2>
                  <div className="space-y-2">
                    <div className="flex items-center"><Building className="h-5 w-5 text-blue-600 mr-2" /><span className="font-medium">{assessmentData.clientCompany}</span></div>
                    <div className="flex items-center"><User className="h-5 w-5 text-blue-600 mr-2" /><span>{assessmentData.clientName}</span></div>
                    <div className="flex items-center"><Home className="h-5 w-5 text-blue-600 mr-2" /><span>{getPropertyTypeLabel(assessmentData.propertyType)}</span></div>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Risk Değerlendirmesi</h2>
                
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="bg-gray-50 rounded-lg p-6"><div className="flex items-center mb-4"><Rat className="h-6 w-6 text-orange-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Kemirgen Riski</h3><span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${riskLevels[assessmentData.rodentRisk].color}`}>{riskLevels[assessmentData.rodentRisk].label}</span></div><p className="text-gray-600 mb-4">{riskLevels[assessmentData.rodentRisk].description}</p><h4 className="font-medium text-gray-800 mb-2">Önerilen Çözümler:</h4><ul className="space-y-1">{riskLevels[assessmentData.rodentRisk].recommendations.map((rec, index) => (<li key={index} className="flex items-start"><div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2 mr-2"></div><span className="text-sm text-gray-600">{rec}</span></li>))}</ul></div>
                  <div className="bg-gray-50 rounded-lg p-6"><div className="flex items-center mb-4"><Bug className="h-6 w-6 text-green-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Böcek Riski</h3><span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${riskLevels[assessmentData.insectRisk].color}`}>{riskLevels[assessmentData.insectRisk].label}</span></div><p className="text-gray-600 mb-4">{riskLevels[assessmentData.insectRisk].description}</p><h4 className="font-medium text-gray-800 mb-2">Önerilen Çözümler:</h4><ul className="space-y-1">{riskLevels[assessmentData.insectRisk].recommendations.map((rec, index) => (<li key={index} className="flex items-start"><div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-2"></div><span className="text-sm text-gray-600">{rec}</span></li>))}</ul></div>
                  <div className="bg-gray-50 rounded-lg p-6"><div className="flex items-center mb-4"><Bird className="h-6 w-6 text-blue-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Kuş Riski</h3><span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${riskLevels[assessmentData.birdRisk].color}`}>{riskLevels[assessmentData.birdRisk].label}</span></div><p className="text-gray-600 mb-4">{riskLevels[assessmentData.birdRisk].description}</p><h4 className="font-medium text-gray-800 mb-2">Önerilen Çözümler:</h4><ul className="space-y-1">{riskLevels[assessmentData.birdRisk].recommendations.map((rec, index) => (<li key={index} className="flex items-start"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-2"></div><span className="text-sm text-gray-600">{rec}</span></li>))}</ul></div>
                  <div className="bg-gray-50 rounded-lg p-6"><div className="flex items-center mb-4"><Warehouse className="h-6 w-6 text-amber-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Ambar Zararlıları Riski</h3><span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${riskLevels[assessmentData.storagePestRisk].color}`}>{riskLevels[assessmentData.storagePestRisk].label}</span></div><p className="text-gray-600 mb-4">{riskLevels[assessmentData.storagePestRisk].description}</p><h4 className="font-medium text-gray-800 mb-2">Önerilen Çözümler:</h4><ul className="space-y-1">{riskLevels[assessmentData.storagePestRisk].recommendations.map((rec, index) => (<li key={index} className="flex items-start"><div className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 mr-2"></div><span className="text-sm text-gray-600">{rec}</span></li>))}</ul></div>
                  <div className="bg-gray-50 rounded-lg p-6"><div className="flex items-center mb-4"><Zap className="h-6 w-6 text-indigo-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Uçkun Haşere Riski</h3><span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${riskLevels[assessmentData.flyingPestRisk].color}`}>{riskLevels[assessmentData.flyingPestRisk].label}</span></div><p className="text-gray-600 mb-4">{riskLevels[assessmentData.flyingPestRisk].description}</p><h4 className="font-medium text-gray-800 mb-2">Önerilen Çözümler:</h4><ul className="space-y-1">{riskLevels[assessmentData.flyingPestRisk].recommendations.map((rec, index) => (<li key={index} className="flex items-start"><div className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-2 mr-2"></div><span className="text-sm text-gray-600">{rec}</span></li>))}</ul></div>
                  <div className="bg-gray-50 rounded-lg p-6"><div className="flex items-center mb-4"><Tool className="h-6 w-6 text-gray-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Yetersiz Ekipman Riski</h3><span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${riskLevels[assessmentData.equipmentRisk].color}`}>{riskLevels[assessmentData.equipmentRisk].label}</span></div><p className="text-gray-600 mb-4">{riskLevels[assessmentData.equipmentRisk].description}</p><h4 className="font-medium text-gray-800 mb-2">Önerilen Çözümler:</h4><ul className="space-y-1">{riskLevels[assessmentData.equipmentRisk].recommendations.map((rec, index) => (<li key={index} className="flex items-start"><div className="w-1.5 h-1.5 bg-gray-600 rounded-full mt-2 mr-2"></div><span className="text-sm text-gray-600">{rec}</span></li>))}</ul></div>
                  <div className="bg-gray-50 rounded-lg p-6"><div className="flex items-center mb-4"><Skull className="h-6 w-6 text-purple-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Diğer Zararlı Riski</h3><span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${riskLevels[assessmentData.otherRisk].color}`}>{riskLevels[assessmentData.otherRisk].label}</span></div><p className="text-gray-600 mb-4">{riskLevels[assessmentData.otherRisk].description}</p><h4 className="font-medium text-gray-800 mb-2">Önerilen Çözümler:</h4><ul className="space-y-1">{riskLevels[assessmentData.otherRisk].recommendations.map((rec, index) => (<li key={index} className="flex items-start"><div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 mr-2"></div><span className="text-sm text-gray-600">{rec}</span></li>))}</ul></div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center mb-4"><AlertTriangle className="h-6 w-6 text-blue-600 mr-2" /><h3 className="text-xl font-bold text-gray-800">Genel Risk Değerlendirmesi</h3><span className={`ml-auto px-4 py-1 rounded-full text-sm font-medium ${riskLevels[getOverallRiskLevel()].color}`}>{riskLevels[getOverallRiskLevel()].label}</span></div>
                  <p className="text-gray-700 mb-6">{assessmentData.clientCompany} firmasının {getPropertyTypeLabel(assessmentData.propertyType)} tesisinde yapılan zararlı mücadelesi risk değerlendirmesi sonucunda, genel risk seviyesi <strong className="mx-1">{riskLevels[getOverallRiskLevel()].label.toUpperCase()}</strong> olarak belirlenmiştir.</p>
                  <div><h4 className="font-semibold text-gray-800 mb-3">Genel Öneriler:</h4><ul className="space-y-2">{riskLevels[getOverallRiskLevel()].recommendations.map((rec, index) => (<li key={index} className="flex items-start"><CheckCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" /><span className="text-gray-700">{rec}</span></li>))}</ul></div>
                </div>
              </div>
              
              <div className="p-8 border-t">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Risk Grafiği</h2>
                <div className="flex items-end space-x-6 h-48 mb-4">
                  {[
                    // GÜNCELLENDİ: 'color' özelliği kaldırıldı
                    { label: 'Kemirgen', risk: assessmentData.rodentRisk, icon: Rat },
                    { label: 'Böcek', risk: assessmentData.insectRisk, icon: Bug },
                    { label: 'Kuş', risk: assessmentData.birdRisk, icon: Bird },
                    { label: 'Ambar', risk: assessmentData.storagePestRisk, icon: Warehouse },
                    { label: 'Uçkun', risk: assessmentData.flyingPestRisk, icon: Zap },
                    { label: 'Ekipman', risk: assessmentData.equipmentRisk, icon: Tool },
                    { label: 'Diğer', risk: assessmentData.otherRisk, icon: Skull }
                  ].map((item, index) => {
                    const riskValues = { 'none': 0, 'low': 25, 'medium': 50, 'high': 75, 'critical': 100 };
                    const height = riskValues[item.risk as keyof typeof riskValues];
                    // GÜNCELLENDİ: Renk dinamik olarak risk seviyesine göre alınıyor
                    const colorClass = riskGraphColorMap[item.risk as keyof typeof riskGraphColorMap];
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div 
                          className={`w-full ${colorClass}`} // Dinamik renk sınıfı kullanılıyor
                          style={{ height: `${height}%` }}
                        ></div>
                        <div className="mt-2 text-center">
                          <item.icon className="h-5 w-5 mx-auto mb-1" />
                          <span className="text-xs font-medium">{item.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-600 border-t pt-2"><span>Risk Yok</span><span>Düşük Risk</span><span>Orta Risk</span><span>Yüksek Risk</span><span>Kritik Risk</span></div>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 bg-gray-100 p-4 text-center text-sm text-gray-600">
                <p>Bu rapor {assessmentData.assessorCompany} tarafından {new Date(assessmentData.assessmentDate).toLocaleDateString('tr-TR')} tarihinde hazırlanmıştır.</p>
                <p>© {new Date().getFullYear()} Tüm hakları saklıdır.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Risk Değerlendirme Modülü Özellikleri</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Profesyonel risk değerlendirme raporlarını hızlı ve kolay bir şekilde oluşturun.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg"><div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4"><Shield className="h-6 w-6 text-blue-600" /></div><h3 className="text-xl font-semibold text-gray-800 mb-3">Kapsamlı Değerlendirme</h3><p className="text-gray-600">Kemirgen, böcek, kuş ve diğer zararlılar için ayrı ayrı risk değerlendirmesi yapın.</p></div>
            <div className="bg-white rounded-xl p-6 shadow-lg"><div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4"><CheckCircle className="h-6 w-6 text-blue-600" /></div><h3 className="text-xl font-semibold text-gray-800 mb-3">Özelleştirilebilir Raporlar</h3><p className="text-gray-600">Firma logonuzu ekleyerek profesyonel ve markalı raporlar oluşturun.</p></div>
            <div className="bg-white rounded-xl p-6 shadow-lg"><div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4"><Download className="h-6 w-6 text-blue-600" /></div><h3 className="text-xl font-semibold text-gray-800 mb-3">Kolay Paylaşım</h3><p className="text-gray-600">Raporlarınızı JPEG formatında indirin, yazdırın veya doğrudan müşterilerinizle paylaşın.</p></div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-blue-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Profesyonel Risk Değerlendirme Hizmeti</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">Daha kapsamlı risk değerlendirmesi için uzman ekibimizle çalışmak ister misiniz?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/iletisim" className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-lg flex items-center justify-center space-x-2"><Send className="h-5 w-5" /><span>İletişime Geçin</span></Link>
            <a href="tel:02242338387" className="border-2 border-white text-white px-8 py-3 rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-medium flex items-center justify-center space-x-2"><Phone className="h-5 w-5" /><span>Hemen Arayın</span></a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RiskAssessmentPage;
