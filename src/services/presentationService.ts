import { v4 as uuidv4 } from 'uuid';

export interface SlideContent {
  title?: string;
  subtitle?: string;
  bullets?: string[];
  imageUrl?: string;
  leftTitle?: string;
  leftContent?: string[];
  rightTitle?: string;
  rightContent?: string[];
  caption?: string;
}

export interface Slide {
  id: string;
  type: 'title' | 'content' | 'two-column' | 'image' | 'thank-you';
  content: SlideContent;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  standard: string;
  slides: Slide[];
}

const MOCK_TEMPLATES: Template[] = [
  // --- 1. AIB STANDARD (AIBPage.tsx'den) ---
  {
    id: 'temp-aib',
    name: 'AIB Zararlı Mücadelesi Eğitimi',
    description: 'AIB standardına uygun operasyonel zararlı mücadele yöntemleri ve gereksinimleri.',
    standard: 'AIB',
    slides: [
      {
        id: uuidv4(),
        type: 'title',
        content: {
          title: 'AIB Zararlı Mücadelesi',
          subtitle: 'Gıda Güvenliği ve Kalite Yönetimi'
        }
      },
      {
        id: uuidv4(),
        type: 'two-column',
        content: {
          title: 'Temel Kategoriler',
          leftTitle: 'Operasyonel Yöntemler',
          leftContent: [
            'Entegre zararlı yönetimi (IPM)',
            'Risk değerlendirme sistemleri',
            'Monitoring ve kayıt tutma',
            'Düzeltici eylem prosedürleri'
          ],
          rightTitle: 'Yapısal Gereksinimler',
          rightContent: [
            'Bina tasarımı ve yapısı',
            'Giriş noktalarının kontrolü',
            'Havalandırma sistemleri',
            'Drenaj ve su yönetimi'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'AIB Puanlama Kriterleri',
          bullets: [
            'Kategori 1: Operasyonel Yöntemler (Maks 200 Puan)',
            'Kategori 2: Bakım için Tasarım (Maks 200 Puan)',
            'Kategori 3: Temizlik Uygulamaları (Maks 200 Puan)',
            'Kategori 4: Entegre Zararlı Yönetimi (Maks 200 Puan)'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'two-column',
        content: {
          title: 'Dokümantasyon ve Personel',
          leftTitle: 'Dokümantasyon',
          leftContent: [
            'Zararlı mücadele politikaları',
            'Prosedür dokümanları',
            'Eğitim kayıtları',
            'Audit raporları'
          ],
          rightTitle: 'Personel Yetkinliği',
          rightContent: [
            'Zararlı mücadele eğitimleri',
            'Yetkinlik değerlendirmesi',
            'Sürekli eğitim programları',
            'Sertifikasyon takibi'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'AIB Audit Süreci',
          bullets: [
            '1. Ön Değerlendirme ve Gap Analizi',
            '2. Sistem Geliştirme (IPM)',
            '3. Uygulama ve Personel Eğitimi',
            '4. İç Audit ve İyileştirmeler',
            '5. AIB Audit Desteği ve Danışmanlık'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'thank-you',
        content: {
          title: 'Teşekkürler',
          subtitle: 'AIB Standartlarında Başarılar Dileriz.'
        }
      }
    ]
  },

  // --- 2. BRC STANDARD (BRCPage.tsx'den) ---
  {
    id: 'temp-brc',
    name: 'BRC Gıda Güvenliği ve Zararlı Yönetimi',
    description: 'BRC standardına uygun kapsamlı zararlı mücadele ve monitoring sistemi.',
    standard: 'BRC',
    slides: [
      {
        id: uuidv4(),
        type: 'title',
        content: {
          title: 'BRC Standardı',
          subtitle: 'Zararlı Mücadele Gereksinimleri'
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'BRC Gereksinimleri',
          bullets: [
            'Risk değerlendirme ve haritalama',
            'Yazılı zararlı mücadele prosedürleri',
            'Düzenli monitoring ve kayıt tutma',
            'Eğitimli personel ve yetkinlik kanıtları'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'two-column',
        content: {
          title: 'BRC Standart Maddeleri',
          leftTitle: '4.11 - Zararlı Mücadele',
          leftContent: [
            'Risk değerlendirme yapılması',
            'Yazılı prosedürlerin oluşturulması',
            'Düzenli monitoring yapılması',
            'Kayıtların tutulması'
          ],
          rightTitle: '4.11.2 - Monitoring Sistemi',
          rightContent: [
            'Tuzak yerleşim planı',
            'Düzenli kontrol programı',
            'Trend analizi yapılması',
            'Düzeltici eylem planları'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'Audit Hazırlık Süreci',
          bullets: [
            'Ön Değerlendirme: Gap analizi',
            'Sistem Kurulumu: BRC uyumlu sistem ve dokümantasyon',
            'Uygulama ve Test: Sistemin sahada uygulanması',
            'Audit Hazırlığı: Final kontroller',
            'Audit Desteği: Teknik destek ve danışmanlık'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'thank-you',
        content: {
          title: 'Eğitim Tamamlandı',
          subtitle: 'BRC Denetimlerinde Başarılar.'
        }
      }
    ]
  },

  // --- 3. HACCP STANDARD (HACCPPage.tsx'den) ---
  {
    id: 'temp-haccp',
    name: 'HACCP Zararlı Mücadelesi',
    description: 'HACCP (Tehlike Analizi ve Kritik Kontrol Noktaları) sistemine entegre mücadele.',
    standard: 'HACCP',
    slides: [
      {
        id: uuidv4(),
        type: 'title',
        content: {
          title: 'HACCP Zararlı Mücadelesi',
          subtitle: 'Kritik Kontrol Noktalarında Sistematik Yaklaşım'
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'HACCP\'nin 7 İlkesi',
          bullets: [
            '1. Tehlike Analizi',
            '2. Kritik Kontrol Noktaları (CCP)',
            '3. Kritik Limitlerin Belirlenmesi',
            '4. Monitoring Sistemi',
            '5. Düzeltici Eylemler',
            '6. Doğrulama',
            '7. Kayıt Tutma ve Dokümantasyon'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'two-column',
        content: {
          title: 'Örnek Kritik Kontrol Noktaları',
          leftTitle: 'Süreç & Tehlike',
          leftContent: [
            'İlaç Hazırlama: Yanlış konsantrasyon riski',
            'İlaç Uygulama: Gıda kontaminasyonu riski',
            'Ekipman Temizliği: Çapraz kontaminasyon'
          ],
          rightTitle: 'Kontrol & Limit',
          rightContent: [
            'CCP: İlaç karışım noktası / Limit: Etiket dozajı',
            'CCP: Uygulama alanı / Limit: Gıda yokluğu',
            'CCP: Temizlik süreci / Limit: Temizlik protokolü'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'HACCP Dokümantasyon Sistemi',
          bullets: [
            'HACCP Planı ve prosedürleri',
            'Monitoring ve kontrol kayıtları',
            'Sapma durumlarında düzeltici eylemler',
            'Personel eğitimi ve yetkinlik belgeleri'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'thank-you',
        content: {
          title: 'Teşekkürler',
          subtitle: 'Güvenilir Gıda, Güvenli Gelecek.'
        }
      }
    ]
  },

  // --- 4. ISO 22000 STANDARD (ISO22000Page.tsx'den) ---
  {
    id: 'temp-iso',
    name: 'ISO 22000 Gıda Güvenliği Yönetimi',
    description: 'ISO 22000 standardına uygun gıda güvenliği ve zararlı mücadele sistemi.',
    standard: 'ISO22000',
    slides: [
      {
        id: uuidv4(),
        type: 'title',
        content: {
          title: 'ISO 22000 Zararlı Mücadelesi',
          subtitle: 'Gıda Güvenliği Yönetim Sistemi Entegrasyonu'
        }
      },
      {
        id: uuidv4(),
        type: 'two-column',
        content: {
          title: 'Temel Gereksinimler',
          leftTitle: 'Yönetim Sistemi',
          leftContent: [
            'Gıda güvenliği politikası',
            'Risk değerlendirme sistemleri',
            'Operasyonel ön koşul programları',
            'HACCP ilkelerinin uygulanması'
          ],
          rightTitle: 'Zararlı Mücadele',
          rightContent: [
            'Entegre zararlı yönetimi (IPM)',
            'Risk analizi ve haritalama',
            'Monitoring ve kayıt sistemleri',
            'Performans değerlendirmesi'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'ISO 22000 Standart Yapısı',
          bullets: [
            '4. Organizasyonun Bağlamı: İç/dış faktörler ve kapsam',
            '5. Liderlik: Politika, roller ve sorumluluklar',
            '6. Planlama: Risk ve fırsatların değerlendirilmesi',
            '7. Destek: Kaynaklar ve yetkinlik',
            '8. Operasyon: Planlama ve kontrol (HACCP)',
            '9. Performans Değerlendirmesi: İzleme ve audit',
            '10. İyileştirme: Düzeltici eylemler'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'Zararlı Mücadelesi Entegrasyonu',
          bullets: [
            'Operasyonel Ön Koşul Programları (OGP) olarak entegrasyon',
            'Tehlike analizi ve CCP belirleme sürecine dahil edilme',
            'Performans izleme: KPI tanımlaması ve trend analizi',
            'Sürekli iyileştirme fırsatlarının belirlenmesi'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'thank-you',
        content: {
          title: 'Eğitim Sonu',
          subtitle: 'ISO 22000 Standartlarında Başarılar.'
        }
      }
    ]
  },

  // --- 5. IPM (PestControlPage.tsx & IPMPage.tsx'den) ---
  {
    id: 'temp-ipm',
    name: 'Entegre Zararlı Yönetimi (IPM)',
    description: 'Çevre dostu, sürdürülebilir ve etkili zararlı kontrolü stratejileri.',
    standard: 'IPM',
    slides: [
      {
        id: uuidv4(),
        type: 'title',
        content: {
          title: 'Entegre Zararlı Yönetimi (IPM)',
          subtitle: 'Sürdürülebilir ve Bilimsel Mücadele'
        }
      },
      {
        id: uuidv4(),
        type: 'two-column',
        content: {
          title: 'IPM Nedir ve Avantajları',
          leftTitle: 'IPM Nedir?',
          leftContent: [
            'Sadece kimyasal değil, çoklu yöntem kullanımı',
            'Zararlı biyolojisine dayalı stratejiler',
            'Önleme ve yalıtım odaklı yaklaşım',
            'Sürekli izleme ve değerlendirme'
          ],
          rightTitle: 'Avantajları',
          rightContent: [
            'Çevre Dostu: Minimum kimyasal kullanımı',
            'Hedef Odaklı: Sadece hedef zararlıya müdahale',
            'Uzun Vadeli: Kalıcı ve sürdürülebilir koruma',
            'Maliyet Etkin: Gereksiz uygulamalardan kaçınma'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'IPM Uygulama Süreci',
          bullets: [
            '1. İnceleme ve Tanı: Tür tespiti ve risk analizi',
            '2. Strateji Geliştirme: Tesise özel planlama',
            '3. Önleyici Tedbirler: Yalıtım ve hijyen',
            '4. Monitoring Sistemi: İzleme istasyonları kurulumu',
            '5. Müdahale Programı: Hedefli uygulamalar',
            '6. Değerlendirme: Etkinlik kontrolü ve raporlama'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'image',
        content: {
          title: 'IPM Piramidi',
          // Gerçek proje için uygun bir görsel URL'si veya placeholder
          imageUrl: 'https://images.pexels.com/photos/4491461/pexels-photo-4491461.jpeg?auto=compress&cs=tinysrgb&w=800', 
          caption: 'Kültürel, Fiziksel, Biyolojik ve Kimyasal Mücadele Basamakları'
        }
      },
      {
        id: uuidv4(),
        type: 'thank-you',
        content: {
          title: 'Teşekkür Ederiz',
          subtitle: 'Doğayla Uyumlu Çözümler.'
        }
      }
    ]
  },

  // --- 6. GENEL HAŞERE MÜCADELESİ (PestControlPage.tsx'den) ---
  {
    id: 'temp-general',
    name: 'Endüstriyel Haşere Mücadelesi',
    description: 'Fabrika, depo ve gıda tesislerinde genel haşere kontrolü.',
    standard: 'GENERAL',
    slides: [
      {
        id: uuidv4(),
        type: 'title',
        content: {
          title: 'Endüstriyel Haşere Mücadelesi',
          subtitle: 'Tesis Koruma ve Hijyen Standartları'
        }
      },
      {
        id: uuidv4(),
        type: 'two-column',
        content: {
          title: 'Hizmet Verilen Tesisler',
          leftTitle: 'Üretim & Gıda',
          leftContent: [
            'Fabrika ve Üretim Tesisleri',
            'Gıda İşleme Tesisleri (HACCP Uyumlu)',
            'Hammadde Depoları'
          ],
          rightTitle: 'Lojistik & Sağlık',
          rightContent: [
            'Depo ve Lojistik Merkezleri',
            'Hastane ve Sağlık Kuruluşları',
            'Oteller ve Turizm Tesisleri'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'Mücadele Edilen Zararlılar',
          bullets: [
            'Karıncalar: Jel yem ve koloni imhası',
            'Hamamböcekleri: Jel, tuzak ve yuva tespiti',
            'Sinekler: UV tuzaklar ve larvasit uygulaması',
            'Depo Böcekleri: Fumigasyon ve feromon tuzaklar',
            'Kemirgenler: İstasyon kurulumu ve yalıtım',
            'Güveler: Feromon takibi ve ortam kontrolü'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'Sağlanan Faydalar',
          bullets: [
            'Üretim kalitesinin ve marka itibarının korunması',
            'Gıda güvenliği ve yasal mevzuata uyum',
            'Müşteri şikayetlerinin önlenmesi',
            'Ekonomik kayıpların önüne geçilmesi',
            'Çalışan sağlığının ve iş güvenliğinin sağlanması'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'thank-you',
        content: {
          title: 'Eğitim Sonu',
          subtitle: 'Profesyonel Çözüm Ortağınız.'
        }
      }
    ]
  }
];

export const fetchTemplates = async (): Promise<Template[]> => {
  return new Promise((resolve) => {
    // Gerçek API isteği simülasyonu
    setTimeout(() => {
      resolve(MOCK_TEMPLATES);
    }, 300);
  });
};