import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Mail, Users, Send, Loader2 as Loader, MessageSquare, Check } from 'lucide-react';

// Arayüz (Interface) tanımları
interface Customer {
  id: string;
  kisa_isim: string;
  email: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

// Standart imza
const signatureHtml = `
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eeeeee;">
    <tr>
      <td style="width: 80px; vertical-align: top;">
        <img src="https://i.imgur.com/PajSpus.png" alt="İlaçlamatik Logo" style="width: 70px; height: auto;">
      </td>
      <td style="vertical-align: top; padding-left: 15px; font-family: Arial, sans-serif;">
        <p style="margin: 0; font-weight: bold; color: #059669; font-size: 14px;">Sistem İlaçlama Sanayi ve Ticaret Limited Şirketi - PestMentor</p>
        <p style="margin: 4px 0; font-size: 12px; color: #555555;">Leave Pest to us...</p>
        <p style="margin: 4px 0; font-size: 12px; color: #555555;">
          <a href="http://www.ilaclamatik.com.tr" style="color: #059669; text-decoration: none;">www.ilaclamatik.com - www.pestmentor.com.tr</a> | 
          <span style="color: #333333;">+90 555 123 4567</span>
        </p>
      </td>
    </tr>
  </table>
`;


// Örnek Pazarlama Şablonları
const marketingTemplates: Template[] = [
  {
    id: 'seasonal_offer',
    name: 'Mevsimsel Bakım Kampanyası',
    subject: '☀️ Yaz Fırsatlarını Kaçırmayın: Haşerelere Karşı %20 İndirim!',
    body: `
      <p>Merhaba [Müşteri Adı],</p>
      <p>Yaz ayları geldiğinde artan haşere sorunlarına karşı hazırlıklı olun! Bu ay sonuna kadar tüm dış mekan ve bahçe ilaçlama hizmetlerimizde net %20 indirim fırsatından yararlanın.</p>
      <p>Evinizin ve iş yerinizin keyfini haşereler olmadan çıkarın. Detaylı bilgi ve randevu için bize ulaşabilirsiniz.</p>
      <p>Sağlıklı günler dileriz,</p>
    `,
  },
  {
    id: 'new_service',
    name: 'Yeni Hizmet Duyurusu',
    subject: 'Yeni Hizmetimiz: Profesyonel Kemirgen Kontrol Çözümleri',
    body: `
      <p>Değerli Müşterimiz [Müşteri Adı],</p>
      <p>Sizden gelen talepler doğrultusunda hizmet yelpazemizi genişlettik! Artık ev ve iş yerleriniz için en modern ekipmanlarla profesyonel <strong>kemirgen kontrolü ve önleme</strong> hizmeti de sunuyoruz.</p>
      <p>Çatı, depo ve bodrum gibi alanlarda kesin çözümler için uzman ekibimizle tanışın. Bilgi almak için bu e-postayı yanıtlamanız yeterlidir.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'customer_appreciation',
    name: 'Müşteri Teşekkür ve Geri Bildirim',
    subject: 'Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz!',
    body: `
      <p>Merhaba [Müşteri Adı],</p>
      <p>İlaçlamatik olarak sizlere hizmet vermekten mutluluk duyuyoruz. Bizi tercih ettiğiniz için teşekkür ederiz.</p>
      <p>Hizmet kalitemizi artırmak için değerli görüşleriniz bizim için çok önemli. Vakit ayırıp hizmetimizi değerlendirebilirseniz çok seviniriz.</p>
      <p>Sağlıklı ve huzurlu günler dileriz,</p>
    `,
  },
  {
    id: 'spring_ants',
    name: 'İlkbahar Karınca ve Sinek Uyarısı',
    subject: '🐜 İlkbahar Geldi, Karıncalar ve Sinekler Kapıda!',
    body: `
      <p>Merhaba [Müşteri Adı],</p>
      <p>Havaların ısınmasıyla birlikte karınca ve sinek popülasyonunda artış gözlemlenmektedir. Mutfak ve yaşam alanlarınızı bu davetsiz misafirlere karşı korumak için profesyonel "İlkbahar Kalkanı" hizmetimizden yararlanın.</p>
      <p>Önlem almak, büyük sorunları engeller. Randevu ve bilgi için bize ulaşın.</p>
      <p>Sağlıklı günler dileriz,</p>
    `,
  },
  {
    id: 'autumn_rodents',
    name: 'Sonbahar Kemirgen Önlemi',
    subject: '🐭 Havalar Soğuyor, Kemirgenlere Karşı Evinizi Koruyun!',
    body: `
      <p>Değerli Müşterimiz [Müşteri Adı],</p>
      <p>Sonbaharın gelmesiyle birlikte kemirgenler (fare ve sıçanlar), sığınacak sıcak yerler aramaya başlar. İşletmenizi ve evinizi olası bir istilaya karşı korumak için en doğru zaman!</p>
      <p>Giriş noktalarını tespit ediyor ve en etkili önlemleri alıyoruz. Ücretsiz keşif için bizimle iletişime geçin.</p>
      <p>Saygılarımızla,</p>
    `,
  },
  {
    id: 'annual_reminder',
    name: 'Yıl Boyu Koruma Hatırlatması',
    subject: 'Yıl Boyu Huzur İçin Haşere Kontrolünü İhmal Etmeyin',
    body: `
      <p>Merhaba [Müşteri Adı],</p>
      <p>Haşere ve kemirgen kontrolü, sadece sorun ortaya çıktığında değil, düzenli olarak yapıldığında en etkilidir. Yıllık bakım anlaşmamız ile mülkünüzü tüm yıl boyunca koruma altına alabilirsiniz.</p>
      <p>Yıllık anlaşmalara özel indirimlerimiz hakkında bilgi almak için bize ulaşın.</p>
      <p>Sağlıklı günler dileriz,</p>
    `,
  },
];

const PazarlamaEposta: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  // ✅ YENİ: Ek alıcı e-postası için state
  const [additionalEmail, setAdditionalEmail] = useState('');

  // Müşteri listesini ilk yüklemede çek
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, kisa_isim, email')
          .not('email', 'is', null) // E-postası olan müşterileri getir
          .order('kisa_isim');
        if (error) throw error;
        setCustomers(data || []);
      } catch (error: any) {
        toast.error('Müşteriler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  // Şablon seçildiğinde içeriği doldur
  const handleTemplateChange = (templateId: string) => {
    const template = marketingTemplates.find(t => t.id === templateId);
    if (template) {
      setEmailSubject(template.subject);
      setEmailBody(template.body + signatureHtml);
    }
  };
  
  // Müşteri seçimi
  const handleCustomerSelect = (customerId: string) => {
      setSelectedCustomers(prev => 
          prev.includes(customerId) 
              ? prev.filter(id => id !== customerId) 
              : [...prev, customerId]
      );
  };

  const handleSelectAll = () => {
      if(selectedCustomers.length === customers.length) {
          setSelectedCustomers([]);
      } else {
          setSelectedCustomers(customers.map(c => c.id));
      }
  };

  // E-posta gönderme fonksiyonu
  const handleSendEmail = async () => {
    const recipients = customers.filter(c => selectedCustomers.includes(c.id));
    const finalRecipients = [...recipients];

    // ✅ YENİ: Ek e-posta adresini kontrol et ve alıcı listesine ekle
    if (additionalEmail.trim() !== '') {
        if (/^\S+@\S+\.\S+$/.test(additionalEmail.trim())) {
            finalRecipients.push({
                id: 'additional',
                kisa_isim: 'Ek Alıcı',
                email: additionalEmail.trim()
            });
        } else {
            toast.error('Lütfen geçerli bir ek e-posta adresi girin.');
            return;
        }
    }

    if (finalRecipients.length === 0) {
      toast.error('Lütfen en az bir alıcı seçin veya ekleyin.');
      return;
    }
    if (!emailSubject || !emailBody) {
      toast.error('E-posta konusu ve içeriği boş olamaz.');
      return;
    }

    toast.info(`${finalRecipients.length} alıcıya e-posta gönderim işlemi başlatıldı...`);

    setIsSending(true);
    
    const sendPromises = finalRecipients.map(recipient => {
      const personalizedBody = emailBody.replace(/\[Müşteri Adı\]/g, recipient.kisa_isim);
      
      return supabase.functions.invoke('send-schedule-email', {
        body: {
          to: recipient.email,
          subject: emailSubject,
          html: personalizedBody,
        },
      });
    });

    try {
      const results = await Promise.allSettled(sendPromises);
      
      const successfulSends = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
      const failedSends = results.length - successfulSends;

      if (successfulSends > 0) {
        toast.success(`${successfulSends} e-posta başarıyla gönderildi.`);
      }
      if (failedSends > 0) {
        toast.error(`${failedSends} e-posta gönderilemedi. Detaylar için konsolu kontrol edin.`);
        results.forEach(result => {
            if(result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error)) {
                console.error("Gönderim Hatası:", result);
            }
        });
      }
      
      setSelectedCustomers([]);
      setAdditionalEmail('');
    } catch (error: any) {
      toast.error('E-postalar gönderilirken genel bir hata oluştu: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };
  
  // ✅ YENİ: Toplam alıcı sayısını hesapla
  const totalRecipientCount = selectedCustomers.length + (additionalEmail.trim() !== '' ? 1 : 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Mail className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-800">E-posta Pazarlama Modülü</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kontrol Paneli */}
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
          
          {/* Alıcı Seçimi */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">1. Alıcıları Seçin</label>
            <div className="border rounded-lg max-h-60 overflow-y-auto">
                <div className="p-2 border-b sticky top-0 bg-gray-50">
                    <label className="flex items-center space-x-3 px-2">
                        <input 
                            type="checkbox" 
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            onChange={handleSelectAll}
                            checked={customers.length > 0 && selectedCustomers.length === customers.length}
                        />
                        <span className="text-sm font-medium text-gray-700">Tümünü Seç ({selectedCustomers.length} / {customers.length})</span>
                    </label>
                </div>
                {customers.map(customer => (
                    <div key={customer.id} className="border-b last:border-b-0">
                        <label className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                checked={selectedCustomers.includes(customer.id)}
                                onChange={() => handleCustomerSelect(customer.id)}
                            />
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{customer.kisa_isim}</p>
                                <p className="text-xs text-gray-500">{customer.email}</p>
                            </div>
                        </label>
                    </div>
                ))}
            </div>
            {/* ✅ YENİ: Ek alıcı input alanı */}
            <div className="mt-4">
                <label htmlFor="additional-email" className="block text-sm font-medium text-gray-600 mb-1">Ek Alıcı E-postası (Opsiyonel)</label>
                <input
                    type="email"
                    id="additional-email"
                    value={additionalEmail}
                    onChange={e => setAdditionalEmail(e.target.value)}
                    placeholder="ornek@adres.com"
                    className="w-full p-2 border rounded-lg"
                />
            </div>
          </div>

          {/* Şablon Seçimi */}
          <div>
            <label htmlFor="template-select" className="block text-lg font-semibold text-gray-700 mb-2">2. Bir Şablon Seçin</label>
            <select
              id="template-select"
              onChange={e => handleTemplateChange(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white"
            >
              <option value="">Hazır şablon seç...</option>
              {marketingTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* E-posta İçeriği */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">3. E-postayı Düzenleyin ve Gönderin</label>
            <div className="space-y-4">
                <div>
                    <label htmlFor="email-subject" className="block text-sm font-medium text-gray-600 mb-1">E-posta Konusu</label>
                    <input 
                        type="text" 
                        id="email-subject"
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                    />
                </div>
                <div>
                    <label htmlFor="email-body" className="block text-sm font-medium text-gray-600 mb-1">E-posta İçeriği (HTML)</label>
                    <textarea 
                        id="email-body"
                        value={emailBody}
                        onChange={e => setEmailBody(e.target.value)}
                        rows={10}
                        className="w-full p-2 border rounded-lg font-mono text-sm"
                    />
                </div>
            </div>
          </div>
          
          <button onClick={handleSendEmail} disabled={isSending || totalRecipientCount === 0} className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-lg">
            {isSending ? <Loader className="animate-spin" /> : <Send />}
            {isSending ? 'Gönderiliyor...' : `${totalRecipientCount} Alıcıya Gönder`}
          </button>
        </div>

        {/* E-posta Önizleme */}
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold mb-4">E-posta Önizlemesi</h3>
            <div className="border rounded-lg h-[80vh] overflow-hidden">
                <iframe
                    srcDoc={emailBody.replace(/\[Müşteri Adı\]/g, selectedCustomers.length > 0 ? (customers.find(c=>c.id === selectedCustomers[0])?.kisa_isim || 'Örnek Müşteri') : 'Değerli Müşterimiz')}
                    title="E-posta Önizlemesi"
                    className="w-full h-full border-0"
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default PazarlamaEposta;
