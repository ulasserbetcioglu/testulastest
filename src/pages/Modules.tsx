import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// DÜZELTME: ShieldCheck ikonu eklendi
import { Building, Home, Bug, Droplets, Wind, Bird, Eye, Shield, Users, Award, Clock, CheckCircle, Target, Zap, ArrowRight, Globe, Star, FileText, Calendar, BarChart3, Layers, FileSignature, ClipboardList, Wand2, Mail, Phone, Presentation, AlignCenterVertical as Certificate, DollarSign, User, Lock, AlertTriangle, ClipboardList as ClipboardListIcon, Map, FileCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../components/Auth/AuthProvider';

const ModulesPage = () => {
  const { user, checkModuleAccess, refreshModuleAccess } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  // Refresh module access when the page loads
  useEffect(() => {
    if (user) {
      refreshModuleAccess();
    }
  }, [user, refreshModuleAccess]);

  const modules = [
    // YENİ MODÜL EKLENDİ
    {
      id: 'service-plan-report',
      title: 'Hizmet Planı Rapor Modülü',
      description: 'Müşterilerinize sunacağınız hizmetin kapsamını, standartları ve taahhütleri profesyonel bir şekilde özetleyen bir rapor hazırlayın.',
      icon: ShieldCheck,
      color: 'bg-emerald-600',
      features: [
        'Dinamik hizmet kapsamı',
        'Mevsimsel ziyaret sıklığı',
        'Taahhüt edilen standartlar',
        'Kalite belgeleri listesi',
        'PDF ve JPEG olarak dışa aktarma',
        'Profesyonel ve modern tasarım'
      ],
      process: [
        'Müşteri bilgilerini girin',
        'Hizmet detaylarını seçin',
        'Raporu oluşturun ve indirin',
        'Müşterinize sunun'
      ],
      link: '/moduller/hizmet-plani',
      path: '/moduller/hizmet-plani'
    },
    {
      id: 'risk-assessment',
      title: 'Risk Değerlendirme Modülü',
      description: 'Zararlı mücadelesi için profesyonel risk değerlendirme raporu oluşturun. Müşterilerinize sunabileceğiniz detaylı risk analizi ve öneriler.',
      icon: Shield,
      color: 'bg-blue-600',
      features: [
        'Kapsamlı risk değerlendirmesi',
        'Özelleştirilebilir raporlar',
        'Firma logosu ekleme',
        'JPEG formatında indirme',
        'Yazdırılabilir format',
        'Profesyonel görünüm'
      ],
      process: [
        'Detaylı risk analizi',
        'IPM stratejisi geliştirme',
        'Sistematik uygulama',
        'Sürekli monitoring ve iyileştirme'
      ],
      link: '/moduller/risk-degerlendirme',
      path: '/moduller/risk-degerlendirme'
    },
    {
      id: 'hazard-risk-assessment',
      title: 'Tehlike ve Risk Değerlendirme Modülü',
      description: 'Zararlı mücadelesi için tehlike belirleme ve risk değerlendirme raporu oluşturun. Detaylı risk matrisi ve önlem planları ile kapsamlı değerlendirme.',
      icon: AlertTriangle,
      color: 'bg-orange-600',
      features: [
        'Tehlike belirleme',
        'Risk matrisi',
        'Önlem planları',
        'Sorumluluk ataması',
        'PDF ve JPEG formatında indirme',
        'Profesyonel görünüm'
      ],
      process: [
        'Tehlike tanımlama',
        'Risk skorlama',
        'Önlem belirleme',
        'Takip ve değerlendirme'
      ],
      link: '/moduller/tehlike-risk-degerlendirme',
      path: '/moduller/tehlike-risk-degerlendirme'
    },
    {
      id: 'risk-action-plan',
      title: 'Risk Eylem Planı Modülü',
      description: 'Risk değerlendirmesi sonuçlarına göre kapsamlı eylem ve aksiyon planı oluşturun. Sorumlular, hedef tarihler ve durum takibi ile etkili risk yönetimi.',
      icon: ClipboardListIcon,
      color: 'bg-blue-600',
      features: [
        'Risk seviyesi belirleme',
        'Eylem planı oluşturma',
        'Sorumluluk atama',
        'Hedef tarih belirleme',
        'Durum takibi',
        'PDF ve JPEG formatında indirme'
      ],
      process: [
        'Risk tanımlama',
        'Eylem belirleme',
        'Sorumluluk atama',
        'İlerleme takibi'
      ],
      link: '/moduller/risk-aksiyon-plani',
      path: '/moduller/risk-aksiyon-plani'
    },
    {
      id: 'risk-area-identification',
      title: 'Riskli Alan Belirleme Modülü',
      description: 'Kroki üzerinde riskli alanları işaretleyin ve detaylı risk raporları oluşturun. Risk nedenleri, sonuçları ve önerilen aksiyonlar ile kapsamlı analiz.',
      icon: Map,
      color: 'bg-red-600',
      features: [
        'Kroki yükleme',
        'Riskli alan işaretleme',
        'Risk seviyesi belirleme',
        'Detaylı risk analizi',
        'PDF ve JPEG formatında indirme',
        'Profesyonel rapor'
      ],
      process: [
        'Kroki yükleme',
        'Riskli alanları işaretleme',
        'Risk detaylarını girme',
        'Rapor oluşturma'
      ],
      link: '/moduller/riskli-alan-belirleme',
      path: '/moduller/riskli-alan-belirleme'
    },
    {
      id: 'inspection-report',
      title: 'Denetim Raporu Modülü',
      description: 'Periyodik denetimler için profesyonel raporlar oluşturun. Tespit edilen sorunlar ve önerilen çözümlerle kapsamlı denetim raporları.',
      icon: ClipboardList,
      color: 'bg-green-600',
      features: [
        'Denetim bulguları',
        'Fotoğraf ekleme',
        'Düzeltici eylem önerileri',
        'Takip sistemi',
        'JPEG formatında indirme',
        'Müşteri bilgileri'
      ],
      link: '/moduller/denetim-raporu',
      path: '/moduller/denetim-raporu'
    },
    {
      id: 'compliance-check',
      title: 'Uygunluk Kontrol Modülü',
      description: 'Tesislerinizin zararlı mücadele standartlarına uygunluğunu kontrol edin. BRC, IFS, HACCP ve diğer standartlar için uygunluk raporları.',
      icon: FileCheck,
      color: 'bg-orange-600',
      features: [
        'Standart uygunluk kontrolleri',
        'Gap analizi',
        'Düzeltici eylem planları',
        'Audit hazırlık raporları',
        'Standart bazlı değerlendirme',
        'Uygunluk sertifikası'
      ],
      link: '/moduller/uygunluk-kontrol',
      path: '/moduller/uygunluk-kontrol'
    },
    {
      id: 'contract',
      title: 'Hizmet Sözleşmesi Modülü',
      description: 'Müşterileriniz için profesyonel hizmet sözleşmeleri oluşturun. Özelleştirilebilir şablonlar ve kolay dışa aktarma seçenekleri.',
      icon: FileSignature,
      color: 'bg-indigo-600',
      features: [
        'Özelleştirilebilir sözleşme şablonu',
        'Firma logosu ekleme',
        'JPEG formatında indirme',
        'PDF formatında indirme',
        'Profesyonel görünüm',
        'Yasal uyumluluk'
      ],
      link: '/moduller/sozlesme',
      path: '/moduller/sozlesme'
    },
    {
      id: 'layout-designer',
      title: 'Ekipman Krokisi Modülü',
      description: 'Zararlı mücadele ekipmanlarının yerleşimini planlamak için sürükle-bırak arayüzü. Profesyonel krokiler oluşturun, kaydedin ve dışa aktarın.',
      icon: Layers,
      color: 'bg-purple-600',
      features: [
        'Sürükle-bırak arayüzü',
        'Çeşitli ekipman türleri',
        'Özelleştirilebilir etiketler',
        'Görsel dışa aktarma',
        'Kroki kaydetme ve yükleme',
        'Müşteri bilgileri'
      ],
      link: '/moduller/ekipman-krokisi',
      path: '/moduller/ekipman-krokisi'
    },
    {
      id: 'trend-analysis',
      title: 'Trend Analiz Modülü',
      description: 'Zararlı mücadele ekipmanlarının aktivite verilerini takip edin ve trend analizleri oluşturun. Ziyaret tarihlerine göre ekipman aktivitelerini görselleştirin.',
      icon: BarChart3,
      color: 'bg-teal-600',
      features: [
        'Ziyaret takibi',
        'Ekipman aktivite kaydı',
        'Görsel grafikler',
        'Trend analizi',
        'PDF rapor çıktısı',
        'Veri karşılaştırma'
      ],
      link: '/moduller/trend-analiz',
      path: '/moduller/trend-analiz'
    },
    {
      id: 'visit-calendar',
      title: 'Ziyaret Takvimi Modülü',
      description: 'Müşterileriniz için yıllık ilaçlama ziyaret takvimi oluşturun ve takip edin. Ziyaretleri planlayın, düzenleyin ve raporlayın.',
      icon: Calendar,
      color: 'bg-blue-600',
      features: [
        'Yıllık takvim görünümü',
        'Ziyaret planlama',
        'Teknisyen atama',
        'Durum takibi',
        'PDF çıktı alma',
        'Müşteri bazlı filtreleme'
      ],
      link: '/moduller/ziyaret-takvimi',
      path: '/moduller/ziyaret-takvimi'
    },
    {
      id: 'auto-trend-analysis',
      title: 'Otomatik Trend Analiz Modülü',
      description: 'Ekipman sayıları ve ziyaret tarihlerini girerek otomatik olarak trend analiz raporu oluşturun. Sistem rastgele veriler üreterek gerçekçi bir rapor hazırlar.',
      icon: Wand2,
      color: 'bg-purple-600',
      features: [
        'Otomatik veri üretimi',
        'Özelleştirilebilir ekipman türleri',
        'Çoklu ziyaret tarihi',
        'Görsel grafikler',
        'PDF ve JPEG çıktı',
        'Hızlı rapor oluşturma'
      ],
      link: '/moduller/otomatik-trend-analiz',
      path: '/moduller/otomatik-trend-analiz'
    },
    {
      id: 'training-presentation',
      title: 'Eğitim Sunumu Modülü',
      description: 'Zararlı mücadelesi konusunda profesyonel eğitim sunumları hazırlayın. BRC, AIB, HACCP ve ISO 22000 gibi standartlar için hazır şablonlar.',
      icon: Presentation,
      color: 'bg-amber-600',
      features: [
        'Hazır sunum şablonları',
        'Standart bazlı içerikler',
        'Firma logosu ekleme',
        'Tam ekran sunum modu',
        'PDF formatında indirme',
        'Sunum kaydetme'
      ],
      link: '/moduller/egitim-sunumu',
      path: '/moduller/egitim-sunumu'
    },
    {
      id: 'training-certificate',
      title: 'Eğitim Sertifikası Modülü',
      description: 'Eğitim katılımcıları için profesyonel sertifikalar oluşturun. Otomatik numaralandırma, logo ekleme ve toplu sertifika oluşturma özellikleri.',
      icon: Certificate,
      color: 'bg-green-600',
      features: [
        'Otomatik numaralandırma',
        'Firma logosu ekleme',
        'Toplu sertifika oluşturma',
        'JPEG formatında indirme',
        'Sertifika kaydetme',
        'Profesyonel tasarım'
      ],
      link: '/moduller/egitim-sertifikasi',
      path: '/moduller/egitim-sertifikasi'
    },
    {
      id: 'quote-generator',
      title: 'Fiyat Teklifi Modülü',
      description: 'Müşterileriniz için profesyonel fiyat teklifleri oluşturun. Özelleştirilebilir şablonlar, farklı KDV oranları ve logo ekleme özellikleri.',
      icon: DollarSign,
      color: 'bg-blue-600',
      features: [
        'Özelleştirilebilir teklif şablonu',
        'Farklı KDV oranları',
        'Firma logosu ekleme',
        'PDF formatında indirme',
        'Hazır hizmet şablonları',
        'Profesyonel görünüm'
      ],
      link: '/moduller/fiyat-teklifi',
      path: '/moduller/fiyat-teklifi'
    }
  ];

  const filteredModules = activeTab === 'all' 
    ? modules 
    : modules.filter(module => {
        if (activeTab === 'accessible' && user) {
          return checkModuleAccess(module.path) || user.role === 'admin';
        }
        if (activeTab === 'inaccessible' && user) {
          return !checkModuleAccess(module.path) && user.role !== 'admin';
        }
        return true;
      });

  return (
    <div className="pt-8">
      {/* Page Header */}
      <section className="bg-gradient-to-br from-green-50 to-green-100 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-6">
            <FileText className="h-12 w-12 text-green-600 mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
              İlaçlamatik Modüller
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Zararlı mücadelesi için profesyonel araçlar ve modüller. 
            İş süreçlerinizi kolaylaştıracak ve müşterilerinize sunabileceğiniz 
            kaliteli raporlar oluşturun.
          </p>
        </div>
      </section>

      {/* User Status */}
      <section className="py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          {user ? (
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Hoş geldiniz, {user.firstName || user.email.split('@')[0]}
                  </p>
                  <p className="text-sm text-gray-500">
                    {user.role === 'admin' ? 'Admin' : 'Kullanıcı'} hesabı
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <Link
                  to="/auth/profile"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Profil Bilgilerim
                </Link>
                {user.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Yönetim Paneli
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center mb-4 md:mb-0">
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          {filteredModules.length === 0 ? (
            <div className="text-center py-16">
              <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Erişilebilir Modül Bulunamadı</h3>
              <p className="text-gray-500 mb-6">Henüz erişim yetkiniz olan modül bulunmuyor.</p>
              <Link
                to="/auth/profile"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block"
              >
                Profil Sayfasına Git
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredModules.map((module) => {
                // All users have access to all modules now
                const hasAccess = true;
                
                return (
                  <div 
                    key={module.id} 
                    className="bg-white border border-gray-200 rounded-xl p-8 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-center mb-6">
                      <div className={`w-16 h-16 ${module.color} rounded-lg flex items-center justify-center mr-4 text-white`}>
                        <module.icon className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800">{module.title}</h3>
                    </div>
                    
                    <p className="text-gray-600 mb-6 leading-relaxed">{module.description}</p>
                    
                    <div className="grid md:grid-cols-2 gap-2 mb-6">
                      {module.features.slice(0, 6).map((feature, index) => (
                        <div key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2.5 mr-3"></div>
                          <span className="text-gray-600">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {hasAccess ? (
                      <Link 
                        to={module.link}
                        className={`${module.color} text-white px-6 py-3 rounded-lg hover:opacity-90 transition-colors flex items-center justify-center space-x-2`}
                      >
                        <span>Modülü Kullan</span>
                        <ArrowRight className="h-5 w-5" />
                      </Link>
                    ) : (
                      <div className="flex flex-col space-y-2">
                        <button
                          disabled
                          className="bg-gray-300 text-gray-600 px-6 py-3 rounded-lg cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          <Lock className="h-5 w-5" />
                          <span>Erişim Yok</span>
                        </button>
                        {user && (
                          <p className="text-xs text-gray-500 text-center">
                            Bu modüle erişim için yönetici ile iletişime geçin
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Modül Özellikleri</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Profesyonel modüllerimizle iş süreçlerinizi kolaylaştırın ve müşterilerinize 
              daha kaliteli hizmet sunun.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Profesyonel Raporlar</h3>
              <p className="text-gray-600">
                Müşterilerinize sunabileceğiniz profesyonel görünümlü, markalı raporlar oluşturun.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Hızlı ve Kolay</h3>
              <p className="text-gray-600">
                Kullanımı kolay arayüz ile dakikalar içinde profesyonel raporlar oluşturun.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Özelleştirilebilir</h3>
              <p className="text-gray-600">
                Firmanızın logosu ve bilgileriyle özelleştirilmiş raporlar oluşturun.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Özel Modül İhtiyaçlarınız mı Var?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            İşletmenizin özel ihtiyaçlarına göre modüller geliştirmek için bizimle iletişime geçin.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/iletisim" 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-lg flex items-center justify-center space-x-2"
            >
              <Mail className="h-5 w-5" />
              <span>İletişime Geçin</span>
            </Link>
            <a 
              href="tel:02242338387" 
              className="border-2 border-white text-white px-8 py-3 rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <Phone className="h-5 w-5" />
              <span>Hemen Arayın</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ModulesPage;
