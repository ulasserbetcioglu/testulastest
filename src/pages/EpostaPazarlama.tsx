// src/pages/EpostaPazarlama.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase'; // Supabase client yolunu kendi projenize göre ayarlayın
import { toast } from 'sonner';
import { Mail, Users, Send, Loader2 as Loader, ServerCrash, MessageSquare, Edit2 } from 'lucide-react';

// Arayüz (Interface) tanımları
interface Customer {
  id: string;
  kisa_isim: string;
  email: string;
}

interface CompanySettings {
    company_name: string;
    logo_url: string;
    phone: string;
    email: string;
    address: string;
    website: string;
    contact_person_name?: string;
    contact_person_title?: string;
    mobile_phone?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: (customerName: string) => string;
  body: (customerName: string, companyName: string) => string;
}

// --- TÜM E-POSTA ŞABLONLARI (EKSİKSİZ) ---
const emailTemplates: EmailTemplate[] = [
  {
    id: 'tanitim',
    name: 'Genel Hizmet Tanıtımı',
    subject: (customerName) => `${customerName} İçin Profesyonel Zararlı Kontrol Çözümleri`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p><b>${companyName}</b> olarak, işletmenizin hijyen standartlarını korumanın ve marka itibarınızı güvence altına almanın ne kadar kritik olduğunun farkındayız.</p>
      <p>Göz ardı edilen küçük bir zararlı problemi, kısa sürede işletmeniz için ciddi sağlık ve maddi risklere dönüşebilir. Bu nedenle, size özel olarak hazırladığımız profesyonel zararlı kontrol (pest control) hizmetlerimizle tanışmanızı istedik.</p>
      <h3>Sunduğumuz Başlıca Hizmetler:</h3>
      <ul style="list-style-type: none; padding: 0; margin: 0;">
        <li style="margin-bottom: 5px;">* Kemirgen Mücadelesi</li>
        <li style="margin-bottom: 5px;">* Yürüyen Haşere Mücadelesi (Hamam Böceği, Karınca vb.)</li>
        <li style="margin-bottom: 5px;">* Uçkun Haşere Mücadelesi (Sinek, Sivrisinek vb.)</li>
        <li style="margin-bottom: 5px;">* Ambar Zararlıları Mücadelesi</li>
        <li style="margin-bottom: 5px;">* Kuş Kontrolü ve Mücadelesi</li>
        <li style="margin-bottom: 5px;">* Sürüngen Mücadelesi</li>
        <li style="margin-bottom: 5px;">* Su Deposu Dezenfeksiyonu ve Temizliği</li>
        <li style="margin-bottom: 5px;">* Sebil Temizliği ve Dezenfeksiyonu</li>
        <li style="margin-bottom: 5px;">* Fumigasyon</li>
        <li style="margin-bottom: 5px;">* Dezenfeksiyon</li>
      </ul>
      <h3>Neden Profesyonel Destek Almalısınız?</h3>
      <ul>
        <li><b>Sağlık ve Güvenlik:</b> WHO onaylı, çevreye duyarlı ürünlerle hem çalışanlarınızın hem de müşterilerinizin sağlığını koruruz.</li>
        <li><b>Kalıcı Çözümler:</b> Sorunu sadece geçici olarak değil, kökünden çözmeyi hedefleriz.</li>
        <li><b>Detaylı Raporlama:</b> Her ziyaret sonrası, denetimlerde kullanabileceğiniz dijital servis raporları sunarız.</li>
      </ul>
      <p>İşletmenizin mevcut risk durumunu analiz etmek için <b>ücretsiz bir keşif</b> talebinde bulunabilirsiniz. Size en uygun çözümleri sunmaktan memnuniyet duyarız.</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="mailto:bilgi@ilaclamatik.com?subject=Randevu%20Talebi" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Randevu Oluşturmak İçin Tıklayın</a>
      </div>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'kemirgen',
    name: 'Kemirgen Mücadelesi Bilgilendirmesi',
    subject: (companyName) => `Kemirgen Riskine Karşı ${companyName} İçin Önleyici Çözümler`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p>Özellikle mevsim geçişlerinde artış gösteren kemirgen aktivitesi, işletmenizin yapısal bütünlüğüne, elektrik tesisatına ve depolanan ürünlere ciddi zararlar verebilir.</p>
      <p><b>${companyName}</b> olarak, kemirgenlerin giriş noktalarını tespit ediyor, kritik kontrol noktalarına kurduğumuz monitör istasyonları ile popülasyonu kontrol altında tutuyor ve size düzenli raporlar sunuyoruz. İşletmenizi bu görünmez tehlikeye karşı koruma altına alalım.</p>
      <p>Detaylı bilgi ve ücretsiz risk analizi için bizimle iletişime geçebilirsiniz.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'yuruyen',
    name: 'Yürüyen Haşere (Hamam Böceği vb.)',
    subject: (companyName) => `Hijyen Standartlarınızı Yükseltin: ${companyName} İçin Yürüyen Haşere Kontrolü`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p>Hamam böceği gibi yürüyen haşereler, gıda güvenliğini tehdit eden en önemli risklerden biridir ve müşteri memnuniyetini doğrudan etkiler.</p>
      <p>Uyguladığımız jel ve kalıcı etkiye sahip insektisitler ile bu sorunu yaşam alanlarınızdan ve üretim sahalarınızdan tamamen uzaklaştırıyoruz. Hijyen standartlarınızı en üst seviyede tutmak için yanınızdayız.</p>
      <p>Keşif ve uygulama detayları için bize ulaşın.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'uckun',
    name: 'Uçkun Mücadelesi (Sinek, vb.)',
    subject: (companyName) => `Konforlu ve Hijyenik Alanlar İçin ${companyName} Uçkun Mücadelesi`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p>Özellikle gıda işletmeleri ve müşteri ağırlayan mekanlar için sinek ve benzeri uçkun zararlılar büyük bir sorundur. </p>
      <p><b>${companyName}</b> olarak, EFC (Elektrikli Sinek Tutucu) cihazlarının doğru konumlandırılması, periyodik bakımları ve koruyucu dış alan uygulamaları ile işletmenizi uçkun zararlılardan arındırıyoruz. Müşterilerinize ve çalışanlarınıza konforlu bir ortam sunun.</p>
      <p>Size özel çözümlerimiz hakkında bilgi almak için bizimle iletişime geçebilirsiniz.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'denetim',
    name: 'BRC/AIB/HACCP Denetim Desteği',
    subject: (companyName) => `Denetimlere Hazır Olun: ${companyName} İçin Gıda Güvenliği Standartları`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p>BRC, AIB, HACCP gibi uluslararası gıda güvenliği denetimlerinde, zararlı kontrolü en kritik maddelerden biridir. Eksik veya yanlış bir uygulama, sertifikasyon sürecinizi riske atabilir.</p>
      <p><b>${companyName}</b> olarak, bu standartların gerektirdiği tüm dokümantasyon, raporlama ve uygulama prosedürlerine hakimiz. Sizi denetimlere eksiksiz hazırlıyor, trend analizleri ve detaylı raporlarla denetim sürecini sorunsuz atlatmanızı sağlıyoruz.</p>
      <p>Denetim öncesi hazırlık ve danışmanlık hizmetlerimiz için bize ulaşın.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'periyodik_kontrol',
    name: 'Periyodik Zararlı Kontrolü',
    subject: (companyName) => `${companyName} İçin Düzenli Periyodik Zararlı Kontrol Programı`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p>Zararlı kontrolünde en etkili yöntem, problemin oluşmadan önce alınan önleyici tedbirlerdir. Düzenli periyodik kontroller, hem maliyetleri minimize eder hem de işletmenizin sürekli güvende olmasını sağlar.</p>
      <p><b>${companyName}</b> için önerdiğimiz aylık/2 aylık periyodik kontrol programında:</p>
      <ul>
        <li><b>Sistematik İnceleme:</b> Tüm risk bölgelerinin düzenli kontrolü ve değerlendirmesi</li>
        <li><b>Erken Uyarı Sistemi:</b> Potensiyel risklerin tespit edilmesi ve önlenmesi</li>
        <li><b>Monitör İstasyon Takibi:</b> Kemirgen ve yürüyen haşere aktivitesinin sürekli izlenmesi</li>
        <li><b>Koruyucu Uygulamalar:</b> Mevsimsel risklere karşı proaktif tedbirler</li>
        <li><b>Dijital Raporlama:</b> Her ziyaret sonrası detaylı durum raporu ve trend analizi</li>
      </ul>
      <p>Periyodik kontrol programının avantajları ve maliyet bilgileri için bizimle görüşün. Sürekli koruma altında olmanın rahatlığını yaşayın.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'kus_mucadelesi',
    name: 'Kuş Mücadelesi ve Kontrolü',
    subject: (companyName) => `${companyName} İçin Profesyonel Kuş Zararlı Kontrolü`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p>Kuşlar, özellikle endüstriyel tesisler, gıda fabrikaları ve açık alanlar için ciddi hijyen ve güvenlik riskleri oluşturur. Bıraktıkları dışkılar, yuva artıkları ve taşıdıkları parazitler hem sağlık hem de yapısal hasarlara neden olabilir.</p>
      <p><b>${companyName}</b> için sunduğumuz çözümler:</p>
      <ul>
        <li><b>Fiziksel Engelleme:</b> Kuş telleri, filelar ve panel sistemleri ile güvenli uzaklaştırma</li>
        <li><b>Ses ve Görsel Caydırıcılar:</b> Ultrasonik cihazlar ve reflektör sistemleri</li>
        <li><b>Yuvalama Alanı Kontrolü:</b> Potensiyel barınma yerlerinin kapatılması</li>
        <li><b>Hijyen Sağlama:</b> Kuş artıklarının güvenli temizliği ve dezenfeksiyonu</li>
        <li><b>Uzun Dönemli Koruma:</b> Mevsimsel göçler öncesi önleyici uygulamalar</li>
      </ul>
      <p>İşletmenizi kuş zararlılarından koruyarak, hem hijyen standartlarınızı yükseltir hem de yapısal hasarları önlemiş olursunuz.</p>
      <p>Keşif ve çözüm önerilerimiz için bizimle iletişime geçin.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'ambar_zararlisi',
    name: 'Ambar Zararlıları Kontrolü',
    subject: (companyName) => `Depolama Güvenliği: ${companyName} İçin Ambar Zararlıları Kontrolü`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p>Tahıl, bakliyat, kuru gıda ve diğer depolanan ürünlerde ortaya çıkan ambar zararlıları (Un kurdu, pirinç biti, fasulye böceği gibi), ciddi ekonomik kayıplara ve kalite sorunlarına neden olur.</p>
      <p><b>${companyName}</b> depolarınızı bu görünmez tehlikeye karşı korumak için:</p>
      <ul>
        <li><b>Giriş Kontrolü:</b> Ham maddelerin depoya girişinde zararlı taraması</li>
        <li><b>Atmosfer Kontrolü:</b> Sıcaklık ve nem optimasyonu ile zararlı gelişiminin önlenmesi</li>
        <li><b>Feromon Tuzakları:</b> Erişkin böceklerin yakalanması ve popülasyon takibi</li>
        <li><b>Fumigasyon Uygulamaları:</b> Gerekli durumlarda kapalı alan gazlama işlemleri</li>
        <li><b>Entegre Depo Yönetimi:</b> FIFO (First In First Out) sistemlerinin pest control ile koordinasyonu</li>
      </ul>
      <p>Depolama kapasitenizdeki değerli ürünlerinizi ambar zararlılarından koruyarak, fire oranlarını minimize edin ve kalite standartlarınızı koruyun.</p>
      <p>Depo keşfi ve risk analizi için bizimle görüşün.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'otomotiv_sektoru',
    name: 'Otomotiv Sektörü Özel Çözümleri',
    subject: (companyName) => `${companyName} Otomotiv Tesisleri İçin Özelleştirilmiş Zararlı Kontrol`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p>Otomotiv sektöründe üretim hatlarının kesintisiz çalışması ve kalite standartlarının korunması kritiktir. Zararlılar, elektrik panolarına zarar vererek üretim durmasına, kablo izolasyonlarını kemirerek arızalara ve hatta yangın riskine neden olabilir.</p>
      <p><b>${companyName}</b> otomotiv tesisleriniz için sunduğumuz özel çözümler:</p>
      <ul>
        <li><b>Üretim Hattı Koruması:</b> Makine çevrelerinde özel kemirgen önleyici uygulamalar</li>
        <li><b>Elektrik Pano Güvenliği:</b> Kemirgenlerin pano içlerine girişinin önlenmesi</li>
        <li><b>Depo ve Sevkiyat Alanları:</b> Yedek parça ve mamul depolarının zararlı kontrolü</li>
        <li><b>Temiz Oda Standartları:</b> Boyahane ve kalite kontrol alanlarının steril tutulması</li>
        <li><b>7/24 Acil Müdahale:</b> Vardiyalı çalışma sistemine uyumlu hizmet programı</li>
        <li><b>ISO 14001 Uyumlu:</b> Çevre yönetim sistemlerinize entegre uygulamalar</li>
      </ul>
      <p>Üretim verimliliğinizi artırın, kalite kayıplarını önleyin ve iş güvenliğinizi maksimuma çıkarın.</p>
      <p>Tesis keşfi ve özel çözüm önerileri için bizimle görüşün.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'tekstil_sektoru',
    name: 'Tekstil Sektörü Özel Çözümleri',
    subject: (companyName) => `${companyName} Tekstil Üretimi İçin Özelleştirilmiş Pest Control`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p>Tekstil üretiminde kullanılan doğal lifler (pamuk, yün, ipek), güve ve diğer tekstil zararlıları için ideal beslenme kaynaklarıdır. Bu zararlılar, ham maddelerinizde ve mamul kumaşlarınızda telafisi olmayan hasarlara neden olabilir.</p>
      <p><b>${companyName}</b> tekstil tesisleriniz için sunduğumuz çözümler:</p>
      <ul>
        <li><b>Lif Depoları Koruması:</b> Pamuk, yün ve doğal lif depolarının güve kontrolü</li>
        <li><b>Üretim Sahası Temizliği:</b> Dokuma ve örgü makinelerinin çevresinde zararlı önleme</li>
        <li><b>Kumaş Depo Yönetimi:</b> Mamul ve yarı mamul kumaşların zararlı kontrolü</li>
        <li><b>Feromon Tuzak Sistemleri:</b> Tekstil güvesi ve kelebeği için özel tuzaklar</li>
        <li><b>Kimyasal Kalıntı Kontrolü:</b> OEKO-TEX standartlarına uygun, kalıntı bırakmayan ürünler</li>
        <li><b>İhracat Sertifikasyonu:</b> Uluslararası tekstil standartlarına uygun raporlama</li>
      </ul>
      <p>Kaliteli üretiminizi koruyun, fire oranlarınızı düşürün ve ihracat standartlarınızı yakalayın.</p>
      <p>Tekstil tesisleriniz için özel keşif talebinizi iletin.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'gida_firmalari',
    name: 'Gıda Firmaları Özel Çözümleri',
    subject: (companyName) => `${companyName} Gıda Güvenliği İçin Kapsamlı Zararlı Kontrol Sistemi`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p>Gıda sektöründe zararlı kontrolü, sadece hijyen meselesi değil, aynı zamanda hukuki bir zorunluluktur. Türk Gıda Kodeksi ve uluslararası standartlar, etkili bir pest control sistemini şart koşar.</p>
      <p><b>${companyName}</b> gıda üretim tesisleriniz için sunduğumuz bütünsel çözümler:</p>
      <ul>
        <li><b>Ham Madde Kabul:</b> Girişte zararlı taraması ve karantina protokolleri</li>
        <li><b>Üretim Alanı Koruması:</b> HACCP kritik kontrol noktalarında özel uygulamalar</li>
        <li><b>Paketleme ve Sevkiyat:</b> Son ürün kontaminasyon riskinin minimize edilmesi</li>
        <li><b>Temizlik ve Dezenfeksiyon:</b> Pest control ile entegre hijyen programları</li>
        <li><b>Personel Eğitimi:</b> Çalışanlarınız için zararlı farkındalık eğitimleri</li>
        <li><b>Denetim Hazırlığı:</b> BRC, IFS, FSSC 22000 denetimlerine uygun dokümantasyon</li>
        <li><b>Trend Analizi:</b> Aylık zararlı aktivite raporları ve iyileştirme önerileri</li>
      </ul>
      <p>Gıda güvenliği standartlarınızı en üst seviyede tutarak, hem tüketici sağlığını koruyun hem de marka değerinizi artırın.</p>
      <p>Gıda tesisleriniz için uzman keşif ve danışmanlık hizmeti talebi için bize ulaşın.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'soguk_hava_depolari',
    name: 'Soğuk Hava Depoları',
    subject: (companyName) => `${companyName} Soğuk Hava Depoları İçin Özel Zararlı Kontrol Sistemi`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p>Soğuk hava depolarında sıcaklık değişimleri, yüksek nem oranları ve gıda yoğunluğu, zararlılar için ideal çoğalma ortamları yaratır. Özellikle yükleme-boşaltma sırasında dış ortamdan gelen zararlılar, depolanan ürünlere büyük zararlar verebilir.</p>
      <p><b>${companyName}</b> soğuk depo tesisleriniz için sunduğumuz özelleştirilmiş çözümler:</p>
      <ul>
        <li><b>Sıcaklık Adaptasyon:</b> Düşük sıcaklıklarda etkili özel formülasyonlu ürünler</li>
        <li><b>Hava Perdesi Entegrasyonu:</b> Kapı geçişlerinde zararlı giriş önleme sistemleri</li>
        <li><b>Nem Kontrolü:</b> Yoğuşma bölgelerinde özel anti-mikrobiyel uygulamalar</li>
        <li><b>Yükleme Rampası Koruması:</b> Dış ortam bağlantı noktalarının güvenliği</li>
        <li><b>Soğuk Dayanıklı Tuzaklar:</b> Düşük sıcaklıklarda çalışan monitör sistemleri</li>
        <li><b>Depo İçi Zonlama:</b> Farklı sıcaklık bölgelerine özel koruma programları</li>
        <li><b>24/7 İzleme:</b> Kritik sıcaklık değişimlerinde acil müdahale sistemi</li>
      </ul>
      <p>Soğuk zincir bütünlüğünüzü koruyarak, ürün kalitesini maksimum seviyede tutun ve fire kayıplarını minimize edin.</p>
      <p>Soğuk depo keşfi ve özel sistem tasarımı için bizimle görüşün.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'lojistik_sektoru',
    name: 'Lojistik ve Kargo Sektörü',
    subject: (companyName) => `${companyName} Lojistik Operasyonları İçin Hızlı ve Etkili Pest Control`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p>Lojistik merkezleri ve kargo depolarında sürekli gelen-giden ürün trafiği, zararlıların bir tesisten diğerine taşınma riskini artırır. Bu durum hem sizin tesislerinizi tehdit eder hem de müşterilerinizin güvenini sarsar.</p>
      <p><b>${companyName}</b> lojistik operasyonlarınız için sunduğumuz çözümler:</p>
      <ul>
        <li><b>Giriş-Çıkış Kontrolü:</b> Yükleme rampaları ve dock kapılarında zararlı tarama</li>
        <li><b>Transit Koruma:</b> Geçiş alanlarında hızlı etkili koruyucu uygulamalar</li>
        <li><b>Kargo Sortlama:</b> Paket ve palet sortlama alanlarının zararlı kontrolü</li>
        <li><b>Araç İçi Koruma:</b> Kargo araçlarının iç dezenfeksiyonu ve zararlı kontrolü</li>
        <li><b>Hızlı Müdahale:</b> 4 saat içinde acil müdahale garantisi</li>
        <li><b>Müşteri Güvencesi:</b> Teslimat öncesi zararlı kontaminasyon sertifikası</li>
        <li><b>Çoklu Lokasyon:</b> Şube ve hub'larınızın tamamına koordineli hizmet</li>
      </ul>
      <p>Müşteri memnuniyetinizi artırın, iade oranlarını düşürün ve marka güvenilirliğinizi pekiştirin.</p>
      <p>Lojistik tesisleriniz için acil keşif ve sistem kurulum talebi için bize ulaşın.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'google_review',
    name: 'Google Yorum Talebi',
    subject: (customerName) => `Değerli Müşterimiz ${customerName}, Memnuniyetiniz Bizim İçin Önemli!`,
    body: (customerName, companyName) => `
      <p>Sayın ${customerName},</p>
      <p><b>${companyName}</b> olarak sizlere en iyi hizmeti sunmak için sürekli çalışıyoruz. Hizmetlerimizden memnun kaldığınızı umuyoruz.</p>
      <p>Deneyimleriniz bizim için çok değerli. İşletmemizin Google üzerindeki görünürlüğünü artırmak ve diğer potansiyel müşterilere ulaşmak adına, sizden kısa bir ricamız var:</p>
      <p>Lütfen aşağıdaki bağlantıya tıklayarak aldığınız hizmeti <b>değerlendirir</b> misiniz?</p>
      <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
        <a href="https://g.page/r/CT6-LeWlr9JjEBM/review" target="_blank" style="background-color: #4285F4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
          ★★★★★ Bize Google'da Değerlendirin!
        </a>
      </div>
      <p>Değerli zaman ayırıp yorum yaptığınız için şimdiden teşekkür ederiz. Sizin geri bildirimlerinizle daha da güçleniyoruz!</p>
      <p>Saygılarımızla,</p>
    `,
  },
];

// --- İMZA OLUŞTURMA FONKSİYONU ---
const generateSignatureHtml = (settings: CompanySettings | null): string => {
    if (!settings) return `<p style="margin-top:20px; padding-top:10px; border-top:1px solid #ddd;"><b>[Firma Bilgileri Yüklenemedi]</b></p>`;
    const contactName = 'ULAŞ ŞERBETCİOĞLU';
    const contactTitle = 'SATIŞ VE PAZARLAMA';
    const mobilePhone = '0533 665 2251';

    return `
        <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eeeeee;">
          <tr>
            <td style="width: 110px; vertical-align: top;">
              <img src="${settings.logo_url || ''}" alt="Logo" style="width: 100px; height: auto; border-radius: 4px;">
            </td>
            <td style="vertical-align: top; padding-left: 15px; font-family: Arial, sans-serif; font-size: 12px; color: #555555;">
              <p style="margin: 0; font-weight: bold; color: #333; font-size: 14px;">${contactName}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #555555;">${contactTitle}</p>
              <p style="margin: 8px 0 4px 0; font-weight: bold; color: #333; font-size: 13px;">${settings.company_name}</p>
              <p style="margin: 4px 0;">${settings.address || ''}</p>
              <p style="margin: 4px 0;">
                <span style="color: #333;">T:</span> ${settings.phone || ''} | 
                <span style="color: #333;">M:</span> ${mobilePhone}
              </p>
              <p style="margin: 4px 0;">
                <a href="mailto:${settings.email}" style="color: #007bff; text-decoration: none;">${settings.email}</a> |
                <a href="https://${settings.website}" target="_blank" style="color: #007bff; text-decoration: none;">${settings.website || ''}</a>
              </p>
            </td>
          </tr>
        </table>
    `;
};


const EpostaPazarlama: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(emailTemplates[0].id);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [editableBody, setEditableBody] = useState('');
  // NEW: State variables for BCC and CC emails
  const [bccEmails, setBccEmails] = useState('');
  const [ccEmails, setCcEmails] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [customerRes, settingsRes] = await Promise.all([
            supabase.from('customers').select('id, kisa_isim, email').not('email', 'is', null).order('kisa_isim'),
            supabase.from('company_settings').select('company_name, logo_url, phone, email, address, website').maybeSingle()
        ]);
        
        if (customerRes.error) throw customerRes.error;
        setCustomers(customerRes.data || []);

        if (settingsRes.error && settingsRes.error.code !== 'PGRST116') {
            toast.error('Şirket ayarları yüklenirken bir hata oluştu.');
        } else if (settingsRes.data) {
            setCompanySettings(settingsRes.data);
        } else {
            toast.warn('Şirket ayarları bulunamadı. İmza varsayılan bilgilerle gösterilecek.');
        }

      } catch (error) {
        toast.error('Veriler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const recipient = useMemo(() => {
    if (isManualEntry) {
      return { kisa_isim: manualName, email: manualEmail };
    }
    return customers.find(c => c.id === selectedCustomerId);
  }, [isManualEntry, manualName, manualEmail, customers, selectedCustomerId]);

  const selectedTemplate = useMemo(() =>
    emailTemplates.find(t => t.id === selectedTemplateId)!,
    [selectedTemplateId]
  );

  useEffect(() => {
    if (recipient && selectedTemplate) {
        const body = selectedTemplate.body(recipient.kisa_isim, companySettings?.company_name || 'Firmamız');
        setEditableBody(body);
    } else {
        setEditableBody('');
    }
  }, [recipient, selectedTemplate, companySettings]);


  const emailHtmlPreview = useMemo(() => {
    if (!recipient || !recipient.kisa_isim) {
        return '<p style="color: #6b7280; text-align: center; padding-top: 2rem;">Lütfen bir müşteri seçin veya manuel olarak girin.</p>';
    }
    const signature = generateSignatureHtml(companySettings);
    return `${editableBody}${signature}`;
  }, [recipient, editableBody, companySettings]);

  // ✅ GÜNCELLEME: E-posta gönderme ve loglama fonksiyonu
  const handleSendEmail = async () => {
    if (!recipient || !recipient.email) {
      toast.error('Lütfen geçerli bir alıcı bilgisi girin.');
      return;
    }
    setIsSending(true);
    let emailStatus: 'success' | 'failed' = 'success';
    const subject = selectedTemplate.subject(recipient.kisa_isim);
    const body = emailHtmlPreview;

    // NEW: Parse BCC and CC emails
    const parsedBcc = bccEmails.split(',').map(e => e.trim()).filter(e => e);
    const parsedCc = ccEmails.split(',').map(e => e.trim()).filter(e => e);

    try {
      // Gerçek e-posta gönderme fonksiyonunu burada çağırın.
      const { error: emailError } = await supabase.functions.invoke('send-schedule-email', {
          body: { 
            to: recipient.email, 
            subject: subject, 
            html: body,
            bcc: parsedBcc, // NEW: Include BCC
            cc: parsedCc,   // NEW: Include CC
          },
      });

      if (emailError) throw emailError;

      toast.success(`E-posta başarıyla ${recipient.kisa_isim} firmasına gönderildi!`);

    } catch (error) {
      emailStatus = 'failed';
      toast.error('E-posta gönderilirken bir hata oluştu.');
      console.error("E-posta gönderme hatası:", error);
    } finally {
      // Gönderim başarılı da olsa başarısız da olsa logla
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
            recipient: recipient.email,
            subject: subject,
            body: body,
            status: emailStatus
        });
      if (logError) {
          toast.error('E-posta log kaydı oluşturulamadı.');
          console.error('Loglama Hatası:', logError);
      }
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">E-Posta Tanıtım Aracı</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kontrol Paneli */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md space-y-6">
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">1. Alıcı Bilgileri</label>
            <div className="flex items-center mb-4">
                <input type="checkbox" id="manual-entry-toggle" checked={isManualEntry} onChange={e => { setIsManualEntry(e.target.checked); setSelectedCustomerId(''); }} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                <label htmlFor="manual-entry-toggle" className="ml-2 block text-sm text-gray-900">Manuel Giriş Yap</label>
            </div>
            {isManualEntry ? (
                <div className="space-y-3">
                    <input type="text" placeholder="Firma veya Kişi Adı *" value={manualName} onChange={e => setManualName(e.target.value)} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"/>
                    <input type="email" placeholder="E-posta Adresi *" value={manualEmail} onChange={e => setManualEmail(e.target.value)} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"/>
                </div>
            ) : (
                <select id="customer-select" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500" disabled={loading}>
                    <option value="">-- Kayıtlı Müşteri Seçiniz --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
                </select>
            )}
            {/* NEW: BCC and CC input fields */}
            <div className="space-y-3 mt-3">
                <input type="text" placeholder="BCC E-postaları (virgülle ayırın)" value={bccEmails} onChange={e => setBccEmails(e.target.value)} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"/>
                <input type="text" placeholder="CC E-postaları (virgülle ayırın)" value={ccEmails} onChange={e => setCcEmails(e.target.value)} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>

          <div>
            <label htmlFor="template-select" className="block text-lg font-semibold text-gray-700 mb-2">2. Şablon Seçin</label>
            <select id="template-select" value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
              {emailTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="email-editor" className="block text-lg font-semibold text-gray-700 mb-2">3. E-postayı Düzenle</label>
            <textarea
                id="email-editor"
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
                rows={10}
                className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                placeholder="E-posta içeriğini buradan düzenleyebilirsiniz..."
                disabled={!recipient}
            />
          </div>

          <div className="border-t pt-6">
            <button
              onClick={handleSendEmail}
              disabled={isSending || !recipient || !recipient.email}
              className="w-full flex items-center justify-center gap-3 p-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-lg"
            >
              {isSending ? <Loader className="animate-spin" /> : <Send />}
              {isSending ? 'Gönderiliyor...' : 'E-postayı Gönder'}
            </button>
          </div>
        </div>

        {/* E-posta Önizlemesi */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold mb-1 text-gray-800">E-posta Önizlemesi</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded-md border">
                <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-700">Kime:</span> {recipient?.email || '...'}
                </p>
                {ccEmails && (
                    <p className="text-sm text-gray-500 mt-1">
                        <span className="font-semibold text-gray-700">CC:</span> {ccEmails}
                    </p>
                )}
                {bccEmails && (
                    <p className="text-sm text-gray-500 mt-1">
                        <span className="font-semibold text-gray-700">BCC:</span> {bccEmails}
                    </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                    <span className="font-semibold text-gray-700">Konu:</span> {selectedTemplate.subject(recipient?.kisa_isim || 'Değerli Müşterimiz')}
                </p>
            </div>
          <div className="border rounded-lg h-[60vh] overflow-y-auto p-4 bg-white">
            <div dangerouslySetInnerHTML={{ __html: emailHtmlPreview }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpostaPazarlama;
