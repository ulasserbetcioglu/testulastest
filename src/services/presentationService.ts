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

// Örnek Şablon Verileri
const MOCK_TEMPLATES: Template[] = [
  {
    id: 'temp-1',
    name: 'Temel Haşere Mücadelesi Eğitimi',
    description: 'İşletmeler için genel haşere farkındalık ve mücadele eğitimi.',
    standard: 'GENERAL',
    slides: [
      {
        id: uuidv4(),
        type: 'title',
        content: {
          title: 'Temel Haşere Mücadelesi',
          subtitle: 'İşletmelerde Zararlı Yönetimi ve Önemi'
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'Neden Haşere Mücadelesi?',
          bullets: [
            'Hastalık taşıma riski ve halk sağlığı',
            'Gıda güvenliği ve ürün kayıpları',
            'Marka imajı ve müşteri güveni',
            'Yasal yükümlülükler ve denetimler',
            'Yapısal hasarların önlenmesi'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'two-column',
        content: {
          title: 'En Sık Görülen Zararlılar',
          leftTitle: 'Yürüyen Haşereler',
          leftContent: [
            'Hamam Böcekleri (Alman, Amerikan)',
            'Karıncalar',
            'Gümüşçün',
            'Örümcekler'
          ],
          rightTitle: 'Kemirgenler & Uçanlar',
          rightContent: [
            'Fare ve Sıçanlar',
            'Karasinekler',
            'Sivrisinekler',
            'Güveler'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'Önleyici Tedbirler',
          bullets: [
            'Giriş noktalarının yalıtımı (kapı altları, pencereler)',
            'Gıda artıklarının temizlenmesi',
            'Çöplerin kapalı tutulması',
            'Su kaynaklarının ve sızıntıların giderilmesi',
            'Düzenli profesyonel kontrol'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'thank-you',
        content: {
          title: 'Teşekkür Ederiz',
          subtitle: 'Sorularınız için bizimle iletişime geçebilirsiniz.'
        }
      }
    ]
  },
  {
    id: 'temp-2',
    name: 'BRC & Gıda Güvenliği Standartları',
    description: 'BRC denetimleri için personel farkındalık eğitimi.',
    standard: 'BRC',
    slides: [
      {
        id: uuidv4(),
        type: 'title',
        content: {
          title: 'BRC Gıda Güvenliği ve Zararlı Yönetimi',
          subtitle: 'Denetim Öncesi Personel Eğitimi'
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'BRC Standardı Nedir?',
          bullets: [
            'Global gıda güvenliği standardıdır.',
            'Zararlı kontrolü kritik bir maddedir.',
            'Sadece ilaçlama değil, entegre mücadele ister.',
            'Kayıt ve dökümantasyon zorunludur.',
            'Personel bildirim sistemi aktif olmalıdır.'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'two-column',
        content: {
          title: 'Personel Sorumlulukları',
          leftTitle: 'Gözlem',
          leftContent: [
            'Haşere aktivitesi görülürse anında bildirin.',
            'Ekipmanlara (istasyonlara) dokunmayın.',
            'Yalıtım eksikliklerini raporlayın.'
          ],
          rightTitle: 'Hijyen',
          rightContent: [
            'Dolap içlerinde yiyecek bırakmayın.',
            'Dökülen ürünleri hemen temizleyin.',
            'Kapıları sürekli kapalı tutun.'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'thank-you',
        content: {
          title: 'Eğitim Tamamlandı',
          subtitle: 'Başarılı bir denetim dileriz.'
        }
      }
    ]
  },
  {
    id: 'temp-3',
    name: 'IPM (Entegre Zararlı Yönetimi)',
    description: 'Kimyasal olmayan yöntemleri de içeren bütüncül yaklaşım.',
    standard: 'IPM',
    slides: [
      {
        id: uuidv4(),
        type: 'title',
        content: {
          title: 'Entegre Zararlı Yönetimi (IPM)',
          subtitle: 'Sürdürülebilir ve Etkili Mücadele'
        }
      },
      {
        id: uuidv4(),
        type: 'content',
        content: {
          title: 'IPM Nedir?',
          bullets: [
            'Sadece ilaçlama değildir.',
            'Gözlem, yalıtım ve hijyen önceliklidir.',
            'Kimyasal mücadele son çaredir.',
            'Hedef odaklı uygulama yapılır.',
            'Çevreye ve insan sağlığına duyarlıdır.'
          ]
        }
      },
      {
        id: uuidv4(),
        type: 'image',
        content: {
          title: 'IPM Piramidi',
          imageUrl: 'https://placehold.co/800x400/e2e8f0/1e293b?text=IPM+Piramidi+Gorseli', // Buraya gerçek bir url koyabilirsiniz
          caption: 'Kültürel, Fiziksel, Biyolojik ve Kimyasal Mücadele Basamakları'
        }
      },
      {
        id: uuidv4(),
        type: 'thank-you',
        content: {
          title: 'Teşekkürler',
          subtitle: 'Doğru yöntem, kesin çözüm.'
        }
      }
    ]
  }
];

export const fetchTemplates = async (): Promise<Template[]> => {
  // Simüle edilmiş API isteği (Gerçekte veritabanından çekilebilir)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_TEMPLATES);
    }, 300); // Hafif bir gecikme ekleyerek gerçekçilik katalım
  });
};