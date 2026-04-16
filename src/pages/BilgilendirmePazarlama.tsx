import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Mail, Send, Loader2 as Loader, MessageSquare, Users, Eye, Image, CheckCircle } from 'lucide-react';

// --- Types ---
interface Customer {
  id: string;
  kisa_isim: string;
  email: string;
}

interface Service {
  id: number;
  name: string;
  description: string;
  image_url: string;
  price: number | null;
}

interface CompanySettings {
  company_name: string;
  logo_url: string;
  phone: string;
  email: string;
  address: string;
  website: string;
}

interface EmailTemplate {
  id: string; // Changed to string to support hardcoded templates if needed, or uuid
  name: string;
  subject: string;
  content: string; // HTML content with placeholders
}

// --- Default Templates ---
const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'info_generic',
    name: 'Genel Hizmet Bilgilendirmesi',
    subject: 'İşletmeniz İçin Profesyonel Çözüm Ortaklığı',
    content: `<p>Sayın {{CUSTOMER_NAME}},</p>
<p><b>{{COMPANY_NAME}}</b> olarak, sadece haşere kontrolü değil, işletmenizin sağlığı ve güvenliği için kapsamlı çözümler sunuyoruz.</p>
<p>Haşere ve kemirgen sorunları, hem çalışanlarınızın sağlığını hem de işletmenizin itibarını riske atabilir. Profesyonel ve sertifikalı ekibimizle, aşağıdaki hizmet alanlarında yanınızdayız:</p>

{{SERVICES_CONTENT}}

<p>Yasal mevzuatlara uygun, Sağlık Bakanlığı onaylı ürünlerimiz ve uzman kadromuzla hizmetinizdeyiz. Detaylı bilgi ve keşif için bizimle iletişime geçebilirsiniz.</p>
<p>Sağlıklı günler dileriz.</p>`
  },
  {
    id: 'seasonal_summer',
    name: 'Yaz Dönemi - Haşere Aktivitesi',
    subject: 'Sıcaklar Başladı: Haşere Aktivitesine Dikkat!',
    content: `<p>Değerli İş Ortağımız {{CUSTOMER_NAME}},</p>
<p>Artan hava sıcaklıkları ile birlikte haşere popülasyonunda ciddi artışlar gözlemlenmektedir. Özellikle gıda işletmeleri ve depolama alanları için bu dönem kritik önem taşımaktadır.</p>
<p>Erken önlem almak, ileride oluşabilecek büyük istilaların önüne geçmenin en etkili yoludur. İşletmenizi korumak adına önerdiğimiz hizmetlerimiz:</p>

{{SERVICES_CONTENT}}

<p>Periyodik kontroller ve koruyucu uygulamalarımız hakkında bilgi almak için lütfen bize ulaşın.</p>
<p>Saygılarımızla,</p>`
  },
  {
    id: 'seasonal_winter',
    name: 'Kış Dönemi - Kemirgen Uyarısı',
    subject: 'Kış Yaklaşırken: Kemirgenlere Karşı Önlem',
    content: `<p>Sayın {{CUSTOMER_NAME}},</p>
<p>Havaların soğumasıyla birlikte, kemirgenler (fare ve sıçanlar) sıcak barınak arayışı içine girmektedir. Bu dönemde işletmelerin kapalı alanları, onlar için ideal bir sığınak haline gelir.</p>
<p>Kemirgenler sadece gıda güvenliğini tehdit etmekle kalmaz, elektrik tesisatlarına verdikleri zararlarla yangın riski de oluşturabilirler.</p>

{{SERVICES_CONTENT}}

<p>Kış girmeden gerekli izolasyon ve koruma önlemlerini almak için profesyonel destek almanızı öneririz.</p>
<p>{{COMPANY_NAME}}</p>`
  },
  {
    id: 'compliance_health',
    name: 'Yasal Zorunluluk ve Gıda Güvenliği',
    subject: 'Gıda Güvenliği ve Denetimlere Hazırlık',
    content: `<p>Sayın Yetkili,</p>
<p>Gıda güvenliği standartları ve yasal yükümlülükler gereği, haşere kontrolü işletmenizin sürdürülebilirliği için hayati önem taşır.</p>
<p>Düzenli kontroller ve belgelendirilmiş hizmetlerimizle, denetimlere her zaman hazır olmanızı sağlıyoruz.</p>

{{SERVICES_CONTENT}}

<p>İşletmenizin marka değerini korumak ve yasal süreçlerde sorun yaşamamak için profesyonel çözüm ortağınız olmaya hazırız.</p>
<p>İyi çalışmalar dileriz.</p>`
  },
  {
    id: 'campaign_spring',
    name: 'Bahar Kampanyası - %20 İndirim',
    subject: 'Bahar Temizliğinde %20 İndirim Fırsatı!',
    content: `<p>Merhaba {{CUSTOMER_NAME}},</p>
<p>Baharın gelişiyle birlikte doğa uyanırken, istenmeyen misafirler de hareketlenmeye başlar.</p>
<p>Bu dönemde yapacağınız ilaçlama hizmetlerinde size özel <b>%20 indirim</b> tanımladık!</p>

{{SERVICES_CONTENT}}

<p>Kampanyamızdan yararlanmak ve randevu oluşturmak için hemen bizi arayın.</p>
<p>Fırsatı kaçırmayın!</p>`
  },
  {
    id: 'feedback_request',
    name: 'Hizmet Sonrası Değerlendirme',
    subject: 'Hizmetimizden Memnun Kaldınız mı?',
    content: `<p>Sayın Yetkili,</p>
<p>Geçtiğimiz günlerde gerçekleştirdiğimiz uygulama sonrasında durumunuzu merak ediyoruz. Sorununuz çözüldü mü?</p>
<p>Hizmet kalitemizi artırmak için görüşlerinize çok önem veriyoruz.</p>

<p>Memnuniyetiniz bizim için en büyük önceliktir. Herhangi bir sorunuz veya tekrar eden bir durum varsa lütfen bize bildirin.</p>
<p>Teşekkür ederiz.</p>`
  },
  {
    id: 'feedback_survey',
    name: 'Müşteri Memnuniyet Anketi',
    subject: 'Hizmet Kalitemizi Değerlendirmenizi Rica Ederiz',
    content: `<p>Sayın Yetkili,</p>
<p>Sizlere sunduğumuz hizmet kalitesini artırmak ve beklentilerinizi daha iyi karşılayabilmek adına görüşleriniz bizim için çok değerlidir.</p>
<p>Aşağıdaki linke tıklayarak kısa anketimizi doldurabilirseniz çok memnun oluruz.</p>

<p><a href="{{SURVEY_LINK}}" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Anketi Başlat</a></p>

<p>Değerli vaktiniz ve geri bildirimleriniz için teşekkür ederiz.</p>`
  },
  {
    id: 'alert_cockroach',
    name: 'Hamam Böceği Uyarısı',
    subject: 'Hamam Böcekleri Hızla Çoğalıyor!',
    content: `<p>Sayın {{CUSTOMER_NAME}},</p>
<p>Hamam böcekleri, bir çifti bir yılda binlerce yavruya ulaşabilen, son derece dayanıklı canlılardır. Evde veya iş yerinde görülen tek bir böcek, aslında koloninin sadece görünen yüzüdür.</p>
<p>Jel ve sıvı uygulama yöntemlerimizle, yuvaları hedef alarak kalıcı çözüm sunuyoruz.</p>

{{SERVICES_CONTENT}}

<p>Sağlığınızı riske atmayın, profesyonel destek için yanınızdayız.</p>`
  },
  {
    id: 'alert_ant',
    name: 'Karınca İstilası Çözümü',
    subject: 'Karıncalarla Başınız Dertte mi?',
    content: `<p>Merhaba,</p>
<p>Karıncalar sosyal canlılardır ve koloniler halinde yaşarlar. Bireysel mücadele yöntemleri (spreyler vb.) genellikle yetersiz kalır ve sorunu sadece öteler.</p>
<p>Özel formülasyonlu yemlerimizle kraliçe karıncayı hedef alarak sorunu kökten çözüyoruz.</p>

{{SERVICES_CONTENT}}

<p>Detaylı bilgi için bize ulaşabilirsiniz.</p>`
  },
  {
    id: 'service_disinfection',
    name: 'Dezenfeksiyon Hizmeti',
    subject: 'Virüs ve Bakterilere Karşı Tam Koruma',
    content: `<p>Sayın {{CUSTOMER_NAME}},</p>
<p>Görünmeyen tehlikelere karşı önlem almak artık bir lüks değil, zorunluluktur.</p>
<p>Ortam dezenfeksiyon hizmetimizle; iş yerinizi, ofisinizi ve yaşam alanlarınızı virüs, bakteri ve mantarlardan arındırıyoruz.</p>

{{SERVICES_CONTENT}}

<p>Kullandığımız ürünler insan sağlığına zarar vermez ve leke bırakmaz. Güvenli bir ortam için bizi arayın.</p>`
  },
  {
    id: 'reminder_periodic',
    name: 'Periyodik Kontrol Hatırlatması',
    subject: 'İlaçlama Zamanınız Geldi mi?',
    content: `<p>Sayın İş Ortağımız,</p>
<p>Haşere kontrolünde başarının sırrı sürekliliktir. Düzenli periyodik uygulamalar, sorun oluşmadan önlemeyi sağlar.</p>
<p>İşletmenizin koruma kalkanını zayıflatmamak için periyodik bakım zamanınızı hatırlatmak isteriz.</p>

{{SERVICES_CONTENT}}

<p>Randevu planlaması için müşteri temsilcimizle görüşebilirsiniz.</p>`
  },
  // --- Yeni Eklenen Örnekler (Sektörel ve Durumsal) ---
  {
    id: 'sector_restaurant',
    name: 'Restoran ve Kafeler İçin',
    subject: 'Müşterileriniz Lezzetinize, Böcekler Uzaklara!',
    content: `<p>Sayın İşletme Sahibi,</p>
<p>Gıda sektöründe hijyen, lezzet kadar önemlidir. Müşterileriniz masada davetsiz misafirler görmek istemez.</p>
<p>Restoran ve kafelere özel, kokusuz ve gıda güvenliğine uygun ilaçlama çözümlerimizle hizmetinizdeyiz.</p>

{{SERVICES_CONTENT}}

<p>Denetimlere her an hazır olmak ve müşteri memnuniyetini korumak için bizi arayın.</p>`
  },
  {
    id: 'sector_housing',
    name: 'Site ve Apartman Yönetimi',
    subject: 'Ortak Alanlarda Tam Hijyen',
    content: `<p>Sayın Yönetici,</p>
<p>Apartman boşlukları, kazan daireleri ve sığınaklar haşerelerin ana üreme merkezleridir. Buralardan dairelere yayılımı engellemek sizin elinizde.</p>
<p>Toplu yaşam alanlarına özel ekonomik paketlerimizle tanışın.</p>

{{SERVICES_CONTENT}}

<p>Tüm site sakinlerinin huzuru için profesyonel destek alın.</p>`
  },
  {
    id: 'sector_school',
    name: 'Okul ve Kreşler',
    subject: 'Çocuklarımız Güvende mi?',
    content: `<p>Sayın Okul Yönetimi,</p>
<p>Çocuklarımızın sağlığı her şeyden önemlidir. Okul, kreş ve eğitim kurumlarında kullandığımız ürünler, Sağlık Bakanlığı onaylı ve çocuk sağlığına zararsızdır.</p>
<p>Eğitim alanlarını, kantin ve tuvaletleri güvenle ilaçlıyoruz.</p>

{{SERVICES_CONTENT}}

<p>Hijyenik bir eğitim ortamı için yanınızdayız.</p>`
  },
  {
    id: 'pest_bedbug',
    name: 'Tahtakurusu Sorunu',
    subject: 'Uykularınız Kaçmasın: Tahtakurusu Çözümü',
    content: `<p>Merhaba {{CUSTOMER_NAME}},</p>
<p>Sabahları vücudunuzda kaşıntılı kızarıklıklarla mı uyanıyorsunuz? Suçlu, yatağınıza gizlenen tahtakuruları olabilir.</p>
<p>Tahtakurusu mücadelesi uzmanlık gerektirir. Sıradan ilaçlar onları sadece dağıtır.</p>

{{SERVICES_CONTENT}}

<p>Gelişmiş buharlı ve kimyasal uygulamalarımızla yatak odanızı geri kazanın.</p>`
  },
  {
    id: 'pest_flea',
    name: 'Pire İlaçlama',
    subject: 'Evcil Dostlarınız ve Sizin İçin Pire Koruması',
    content: `<p>Sevgili Hayvansever Dostumuz,</p>
<p>Pireler sadece evcil hayvanlarınızı değil, sizi de ısırabilir ve hızla tüm eve yayılabilir.</p>
<p>Evinizdeki pire sorununu, dostlarımıza zarar vermeden çözüyoruz.</p>

{{SERVICES_CONTENT}}

<p>Hem minik dostunuzun hem de sizin konforunuz için bizi arayın.</p>`
  },
  {
    id: 'pest_mosquito',
    name: 'Sivrisinek Mücadelesi',
    subject: 'Bahçenizin Keyfini Sivrisineksiz Çıkarın',
    content: `<p>Merhaba,</p>
<p>Yaz akşamlarında bahçenizde veya balkonunuzda oturmak işkenceye dönüşmesin. Sivrisineklerle mücadelede larvasit ve uçkun mücadelesi bir arada.</p>

{{SERVICES_CONTENT}}

<p>Siz keyfinize bakın, sivrisinekleri bize bırakın.</p>`
  },
  {
    id: 'pest_silverfish',
    name: 'Gümüşçün Böceği',
    subject: 'Banyonuzdaki Gümüş Renkli Böcekler',
    content: `<p>Merhaba,</p>
<p>Nemli alanları seven gümüşçünler (gümüş böceği), banyo ve mutfaklarda sıkça görülür. Kağıt, kitap ve duvar kağıtlarına zarar verebilirler.</p>
<p>Nemi seven bu canlılardan kurtulmak için özel uygulamalarımız var.</p>

{{SERVICES_CONTENT}}

<p>Detaylı bilgi için bize ulaşın.</p>`
  },
  {
    id: 'situation_movein',
    name: 'Taşınma Öncesi İlaçlama',
    subject: 'Yeni Evinize Temiz Bir Başlangıç Yapın',
    content: `<p>Yeni Ev Sahibimiz,</p>
<p>Taşınma heyecanınızı gölgeleyecek sürprizlerle karşılaşmayın. Eşyalarınızı yerleştirmeden önce boş ev ilaçlaması yaptırarak, olası haşere risklerini sıfırlayın.</p>
<p>Köşe bucak detaylı bir uygulama için en uygun zaman şimdi.</p>

{{SERVICES_CONTENT}}

<p>Huzurlu bir başlangıç için randevunuzu hemen oluşturun.</p>`
  },
  {
    id: 'situation_renovation',
    name: 'Tadilat Sonrası',
    subject: 'Tadilat Bitti, Sıra Böceklerde mi?',
    content: `<p>Merhaba,</p>
<p>Tadilat sırasında açılan duvarlar, değişen tesisatlar haşereleri harekete geçirebilir veya yenilerini çekebilir.</p>
<p>İnşaat temizliği sonrası detaylı bir jel ve sıvı ilaçlama ile önleminizi alın.</p>

{{SERVICES_CONTENT}}

<p>Tertemiz evinizin keyfini güvenle sürün.</p>`
  },
  {
    id: 'situation_summer_house',
    name: 'Yazlık Açılışı',
    subject: 'Yazlığınız Sizi Bekliyor (Böcekler Değil!)',
    content: `<p>Merhaba,</p>
<p>Bütün kış kapalı kalan yazlığınızda örümcekler, akrepler veya karıncalar yuva yapmış olabilir.</p>
<p>Tatiiliniz kabusa dönüşmesin. Gitmeden önce veya gittiğiniz ilk gün profesyonel ilaçlama hizmetimizden yararlanın.</p>

{{SERVICES_CONTENT}}

<p>Keyifli bir yaz tatili için hizmetinizdeyiz.</p>`
  }
];

// --- Helper: Generate Signature ---
const generateSignatureHtml = (settings: CompanySettings | null): string => {
  if (!settings) return '';
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee;">
      <tr>
        <td style="width: 80px; vertical-align: top;">
          ${settings.logo_url ? `<img src="${settings.logo_url}" alt="Logo" style="width: 70px; height: auto;">` : ''}
        </td>
        <td style="vertical-align: top; padding-left: 15px; font-family: Arial, sans-serif;">
          <p style="margin: 0; font-weight: bold; color: #059669; font-size: 14px;">${settings.company_name}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #555555;">Email: <a href="mailto:${settings.email}" style="color: #059669; text-decoration: none;">${settings.email}</a></p>
          <p style="margin: 4px 0; font-size: 12px; color: #555555;">Web: <a href="https://${settings.website}" style="color: #059669; text-decoration: none;">${settings.website}</a></p>
          <p style="margin: 4px 0; font-size: 12px; color: #555555;">Tel: <span style="color: #333333;">${settings.phone}</span></p>
          ${settings.address ? `<p style="margin: 4px 0; font-size: 12px; color: #777;">${settings.address}</p>` : ''}
        </td>
      </tr>
    </table>
  `;
};

// --- Helper: Generate Services HTML ---
const generateServicesHtml = (services: Service[]): string => {
  if (services.length === 0) return '';

  return services.map(service => `
    <div style="margin-bottom: 25px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background-color: #fafafa;">
      <div style="display: flex;">
        ${service.image_url ? `
        <div style="width: 120px; min-width: 120px; background-color: #f3f4f6;">
          <img src="${service.image_url}" alt="${service.name}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
        </div>` : ''}
        <div style="padding: 15px; flex-grow: 1;">
          <h3 style="margin: 0 0 8px 0; color: #059669; font-size: 16px;">${service.name}</h3>
          <p style="margin: 0; color: #555555; line-height: 1.5; font-size: 14px;">${service.description || ''}</p>
          ${service.price ? `<p style="margin: 10px 0 0 0; font-weight: bold; color: #333; font-size: 14px;">Fiyat: ${service.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>` : ''}
        </div>
      </div>
    </div>
  `).join('');
};

const BilgilendirmePazarlama: React.FC = () => {
  // Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [templates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);

  // UI State
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Selection State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(DEFAULT_TEMPLATES[0]);
  const [manualEmails, setManualEmails] = useState<string>(''); // NEW: Manual emails state

  // Content State
  const [emailSubject, setEmailSubject] = useState(DEFAULT_TEMPLATES[0].subject);
  const [emailContent, setEmailContent] = useState(DEFAULT_TEMPLATES[0].content);

  // --- Initial Data Fetch ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [customerRes, serviceRes, settingsRes] = await Promise.all([
          supabase.from('customers').select('id, kisa_isim, email').not('email', 'is', null).order('kisa_isim'),
          supabase.from('services').select('*').order('name'),
          supabase.from('company_settings').select('*').single()
        ]);

        if (customerRes.error) throw customerRes.error;
        if (serviceRes.error) throw serviceRes.error;

        setCustomers(customerRes.data || []);
        setServices(serviceRes.data || []);
        if (settingsRes.data) setCompanySettings(settingsRes.data);

      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error('Veriler yüklenirken bir hata oluştu: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // --- Handlers ---
  const handleSelectAllCustomers = (checked: boolean) => {
    if (checked) {
      setSelectedCustomerIds(new Set(customers.map(c => c.id)));
    } else {
      setSelectedCustomerIds(new Set());
    }
  };

  const toggleCustomer = (id: string) => {
    const newSet = new Set(selectedCustomerIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCustomerIds(newSet);
  };

  const toggleService = (id: number) => {
    const newSet = new Set(selectedServiceIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedServiceIds(newSet);
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setEmailSubject(template.subject);
      setEmailContent(template.content);
    }
  };

  // --- Preview Generation ---
  const emailPreviewHtml = useMemo(() => {
    const placeholderCustomer = { kisa_isim: 'Sayın Müşteri', email: 'musteri@ornek.com' };
    const selectedServicesList = services.filter(s => selectedServiceIds.has(s.id));

    // 1. Generate Services HTML
    const servicesHtml = generateServicesHtml(selectedServicesList);

    // 2. Replace Placeholders in Content
    let processedBody = emailContent
      .replace(/{{CUSTOMER_NAME}}/g, placeholderCustomer.kisa_isim)
      .replace(/{{COMPANY_NAME}}/g, companySettings?.company_name || 'Firmamız')
      .replace(/{{CUSTOMER_NAME}}/g, placeholderCustomer.kisa_isim)
      .replace(/{{COMPANY_NAME}}/g, companySettings?.company_name || 'Firmamız')
      .replace(/{{SERVICES_CONTENT}}/g, servicesHtml || '<p style="color: #999; font-style: italic;">(Henüz hizmet seçilmedi)</p>')
      .replace(/{{SURVEY_LINK}}/g, '#');

    // 3. Append Signature
    const signature = generateSignatureHtml(companySettings);

    // 4. Wrap in Basic HTML Structure
    return `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
          ${processedBody}
          ${signature}
        </body>
      </html>
    `;
  }, [emailContent, selectedServiceIds, services, companySettings]);

  // --- Send Email ---
  // --- Send Email ---
  const handleSend = async () => {
    // Parse manual emails
    const manualEmailList = manualEmails
      .split(/[\n,]/) // Split by newline or comma
      .map(e => e.trim())
      .filter(e => e && e.includes('@')); // Basic validation

    if (selectedCustomerIds.size === 0 && manualEmailList.length === 0) return toast.warning('Lütfen en az bir müşteri seçin veya harici e-posta girin.');
    if (selectedServiceIds.size === 0) return toast.warning('Lütfen en az bir hizmet seçin.');

    setIsSending(true);
    let successCount = 0;
    let failedCount = 0;

    const selectedServicesList = services.filter(s => selectedServiceIds.has(s.id));
    const servicesHtml = generateServicesHtml(selectedServicesList);
    const signature = generateSignatureHtml(companySettings);

    try {
      // 1. Send to Selected Database Customers
      const targetCustomers = customers.filter(c => selectedCustomerIds.has(c.id));

      for (const customer of targetCustomers) {
        const surveyLink = `${window.location.origin}/anket?cid=${customer.id}`;

        const personalBody = emailContent
          .replace(/{{CUSTOMER_NAME}}/g, customer.kisa_isim)
          .replace(/{{COMPANY_NAME}}/g, companySettings?.company_name || 'Firmamız')
          .replace(/{{SERVICES_CONTENT}}/g, servicesHtml)
          .replace(/{{SURVEY_LINK}}/g, surveyLink);

        const fullHtml = `
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
              ${personalBody}
              ${signature}
            </body>
          </html>
        `;

        const { error } = await supabase.functions.invoke('send-schedule-email', {
          body: { to: customer.email, subject: emailSubject, html: fullHtml }
        });

        if (error) { console.error(`Failed to send to ${customer.email}:`, error); failedCount++; }
        else { successCount++; }
      }

      // 2. Send to Manual Emails
      const genericSurveyLink = `${window.location.origin}/anket`; // No CID for anonymous

      for (const email of manualEmailList) {
        const personalBody = emailContent
          .replace(/{{CUSTOMER_NAME}}/g, 'Sayın Yetkili') // Generic greeting
          .replace(/{{COMPANY_NAME}}/g, companySettings?.company_name || 'Firmamız')
          .replace(/{{SERVICES_CONTENT}}/g, servicesHtml)
          .replace(/{{SURVEY_LINK}}/g, genericSurveyLink);

        const fullHtml = `
          <!DOCTYPE html>
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
              ${personalBody}
              ${signature}
            </body>
          </html>
        `;

        const { error } = await supabase.functions.invoke('send-schedule-email', {
          body: { to: email, subject: emailSubject, html: fullHtml }
        });

        if (error) { console.error(`Failed to send to ${email}:`, error); failedCount++; }
        else { successCount++; }
      }

      if (successCount > 0) toast.success(`${successCount} e-posta başarıyla gönderildi.`);
      if (failedCount > 0) toast.error(`${failedCount} e-posta gönderilemedi.`);

    } catch (err: any) {
      toast.error('Gönderim sırasında kritik hata: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8 border-b pb-4">
          <Mail className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bilgilendirme ve Pazarlama</h1>
            <p className="text-gray-500 text-sm">Müşterilerinize hizmetlerinizi tanıtın ve toplu bilgilendirme yapın.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* LEFT COLUMN: Controls */}
          <div className="xl:col-span-5 space-y-6">

            {/* 1. Template & Content */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-blue-700">
                <MessageSquare className="w-5 h-5" /> 1. İçerik ve Şablon
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şablon Seçin</label>
                  <select
                    className="w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500"
                    value={selectedTemplate.id}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                  >
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konu Başlığı</label>
                  <input
                    type="text"
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta İçeriği <span className="text-xs text-gray-400 font-normal">(HTML destekler)</span>
                  </label>
                  <textarea
                    rows={8}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                  />
                  <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-2">
                    <span className="bg-gray-100 px-2 py-1 rounded">{'{{CUSTOMER_NAME}}'}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">{'{{COMPANY_NAME}}'}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">{'{{CUSTOMER_NAME}}'}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">{'{{COMPANY_NAME}}'}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded text-blue-600 font-medium">{'{{SERVICES_CONTENT}}'}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded text-green-600 font-medium">{'{{SURVEY_LINK}}'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Services Selection */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-blue-700">
                <Image className="w-5 h-5" /> 2. Tanıtılacak Hizmetler
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                {services.map(service => (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className={`
                      cursor-pointer rounded-lg border p-3 flex items-start gap-3 transition-all
                      ${selectedServiceIds.has(service.id) ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}
                    `}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 ${selectedServiceIds.has(service.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                      {selectedServiceIds.has(service.id) && <CheckCircle className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-900">{service.name}</h4>
                      {service.price && <p className="text-xs text-gray-500 mt-0.5">{service.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-right text-xs text-gray-500 mt-2">{selectedServiceIds.size} hizmet seçildi</p>
            </div>

            {/* 3. Customers Selection */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-blue-700">
                <Users className="w-5 h-5" /> 3. Alıcı Seçimi
              </h2>

              {/* Manual Email Entry */}
              <div className="mb-6 border-b pb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harici E-postalar <span className="text-xs text-gray-400 font-normal">(Virgül veya satır ile ayırın)</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono placeholder:text-gray-400"
                  placeholder="ornek@firma.com, diger@sirket.com"
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Bu kişilere "Sayın Yetkili" olarak hitap edilecektir.</p>
              </div>

              <div className="flex items-center justify-between mb-3 px-1">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCustomerIds.size === customers.length && customers.length > 0}
                    onChange={(e) => handleSelectAllCustomers(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  Tümünü Seç ({customers.length})
                </label>
                <span className="text-sm text-gray-600 font-medium bg-blue-100 px-2 py-0.5 rounded-full">
                  {selectedCustomerIds.size} Alıcı
                </span>
              </div>

              <div className="border rounded-lg max-h-60 overflow-y-auto divide-y">
                {customers.map(customer => (
                  <div key={customer.id} className="flex items-center p-3 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`cust-${customer.id}`}
                      checked={selectedCustomerIds.has(customer.id)}
                      onChange={() => toggleCustomer(customer.id)}
                      className="w-4 h-4 text-blue-600 rounded mr-3 cursor-pointer"
                    />
                    <label htmlFor={`cust-${customer.id}`} className="flex-grow cursor-pointer">
                      <div className="text-sm font-medium text-gray-900">{customer.kisa_isim}</div>
                      <div className="text-xs text-gray-500">{customer.email}</div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={isSending || (selectedCustomerIds.size === 0 && !manualEmails.trim()) || selectedServiceIds.size === 0}
              className={`
                w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg shadow-lg transform transition-transform active:scale-[0.99]
                ${isSending || (selectedCustomerIds.size === 0 && !manualEmails.trim()) || selectedServiceIds.size === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                }
              `}
            >
              {isSending ? <Loader className="animate-spin w-6 h-6" /> : <Send className="w-6 h-6" />}
              {isSending ? 'Gönderiliyor...' : 'E-postaları Gönder'}
            </button>

          </div>

          {/* RIGHT COLUMN: Preview */}
          <div className="xl:col-span-7">
            <div className="bg-white rounded-xl shadow-sm border p-6 h-full flex flex-col">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-700">
                <Eye className="w-5 h-5" /> Önizleme
              </h2>

              <div className="bg-gray-100 p-4 rounded-t-lg border-b flex flex-col gap-2">
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold text-gray-600 w-16">Kimden:</span>
                  <span className="text-gray-800">{companySettings?.company_name || '...'} &lt;{companySettings?.email || '...'} &gt;</span>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold text-gray-600 w-16">Konu:</span>
                  <span className="text-gray-900 font-medium">{emailSubject}</span>
                </div>
              </div>

              <div className="flex-grow border-x border-b rounded-b-lg bg-white overflow-hidden relative">
                <iframe
                  srcDoc={emailPreviewHtml}
                  className="w-full h-full absolute inset-0"
                  title="Email Preview"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BilgilendirmePazarlama;