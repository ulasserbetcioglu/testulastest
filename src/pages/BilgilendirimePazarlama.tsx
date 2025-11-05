import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Mail, Send, Loader2 as Loader, MessageSquare, Users, Eye, Settings, Save, Plus, X, Image } from 'lucide-react';

// Arayüz tanımları
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

interface EmailTemplate {
  id?: number;
  name: string;
  subject: string;
  content: string;
  is_default: boolean;
}

interface FooterInfo {
  id?: number;
  name: string;
  title: string;
  website: string;
  phone: string;
  logo_url: string;
}

// Dinamik footer oluşturma
const generateSignatureHtml = (footer: FooterInfo): string => `
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eeeeee;">
    <tr>
      <td style="width: 80px; vertical-align: top;">
        <img src="${footer.logo_url}" alt="Logo" style="width: 70px; height: auto;">
      </td>
      <td style="vertical-align: top; padding-left: 15px; font-family: Arial, sans-serif;">
        <p style="margin: 0; font-weight: bold; color: #059669; font-size: 14px;">${footer.name}</p>
        <p style="margin: 4px 0; font-size: 12px; color: #555555;">${footer.title}</p>
        <p style="margin: 4px 0; font-size: 12px; color: #555555;">
          <a href="http://${footer.website}" style="color: #059669; text-decoration: none;">${footer.website}</a> | 
          <span style="color: #333333;">${footer.phone}</span>
        </p>
      </td>
    </tr>
  </table>
`;

const BilgilendirimePazarlama: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [emailSubject, setEmailSubject] = useState('Hizmetlerimiz Hakkında Bilgilendirme');
  const [emailContent, setEmailContent] = useState('');
  const [emailPreview, setEmailPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendToAll, setSendToAll] = useState(false);

  // Template yönetimi
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState<EmailTemplate>({
    name: '',
    subject: '',
    content: '',
    is_default: false
  });

  // Footer bilgileri
  const [footerInfo, setFooterInfo] = useState<FooterInfo>({
    name: 'İlaçlamatik Ekibi',
    title: 'Profesyonel Zararlı Kontrol Çözümleri',
    website: 'www.ilaclamatik.com.tr',
    phone: '+90 555 123 4567',
    logo_url: 'https://i.imgur.com/PajSpus.png'
  });

  // Varsayılan e-posta içeriği
  const defaultEmailContent = `Merhaba {{CUSTOMER_NAME}},

{{COMPANY_NAME}} olarak, sizlere sunduğumuz kaliteli hizmetler hakkında bilgi vermek istiyoruz.

Aşağıda seçtiğimiz hizmetlerimizle ilgili detaylı bilgileri bulabilirsiniz:

{{SERVICES_CONTENT}}

Hizmetlerimiz hakkında daha fazla bilgi almak veya randevu oluşturmak için bizimle iletişime geçebilirsiniz.

Teşekkür ederiz.`;

  // İlk yükleme
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [customerRes, serviceRes, settingsRes, templatesRes] = await Promise.all([
          supabase.from('customers').select('id, kisa_isim, email').not('email', 'is', null).order('kisa_isim'),
          supabase.from('services').select('*').order('name'),
          supabase.from('company_settings').select('*').limit(1).single(),
          supabase.from('email_templates').select('*').order('name')
        ]);

        if (customerRes.error) throw customerRes.error;
        if (serviceRes.error) throw serviceRes.error;
        
        setCustomers(customerRes.data || []);
        setServiceList(serviceRes.data || []);
        setTemplates(templatesRes.data || []);
        
        if (settingsRes.data) {
          setFooterInfo(settingsRes.data);
        }

        // Varsayılan içeriği ayarla
        const defaultTemplate = templatesRes.data?.find(t => t.is_default);
        if (defaultTemplate) {
          setEmailSubject(defaultTemplate.subject);
          setEmailContent(defaultTemplate.content);
        } else {
          setEmailContent(defaultEmailContent);
        }

      } catch (error: any) {
        console.error('Hata:', error);
        toast.error('Veriler yüklenirken bir hata oluştu.');
        setEmailContent(defaultEmailContent);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  // Hizmet içeriğini oluştur
  const generateServicesContent = (services: Service[]): string => {
    return services.map(service => `
      <div style="margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="display: flex; align-items: flex-start;">
          <div style="width: 150px; flex-shrink: 0;">
            <img src="${service.image_url || 'https://placehold.co/150x120/e2e8f0/334155?text=Hizmet'}" alt="${service.name}" style="width: 100%; height: 120px; object-fit: cover;">
          </div>
          <div style="padding: 20px; flex-grow: 1;">
            <h3 style="margin: 0 0 10px 0; color: #059669; font-size: 18px;">${service.name}</h3>
            <p style="margin: 0; color: #555555; line-height: 1.6;">${service.description}</p>
            ${service.price ? `<p style="margin: 10px 0 0 0; font-weight: bold; color: #333;">Başlangıç fiyatı: ${service.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  };

  // E-posta HTML'ini oluştur
  const generateEmailHtml = (customerName: string, content: string, services: Service[], signature: string): string => {
    const servicesContent = generateServicesContent(services);
    
    // Placeholder'ları değiştir
    let processedContent = content
      .replace(/{{CUSTOMER_NAME}}/g, customerName)
      .replace(/{{COMPANY_NAME}}/g, footerInfo.name)
      .replace(/{{SERVICES_CONTENT}}/g, servicesContent);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
            .container { max-width: 700px; margin: auto; border: 1px solid #eee; }
            .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
            .header h2 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .services-section { margin: 20px 0; }
            .cta-button { 
              display: inline-block; 
              background-color: #059669; 
              color: white !important; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 5px; 
              font-weight: bold; 
              margin: 20px 0;
            }
            .cta-section { text-align: center; margin: 30px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Hizmetlerimiz Hakkında</h2>
            </div>
            <div class="content">
              ${processedContent.replace(/\n/g, '<br>')}
              
              <div class="cta-section">
                <p><strong>Hizmetlerimiz hakkında daha fazla bilgi almak veya randevu oluşturmak için:</strong></p>
                <a href="tel:${footerInfo.phone}" class="cta-button">Hemen Ara: ${footerInfo.phone}</a>
                <br>
                <a href="http://${footerInfo.website}" class="cta-button">Web Sitemizi Ziyaret Edin</a>
              </div>
              
              ${signature}
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // Önizleme güncelle
  useEffect(() => {
    if (selectedServices.length === 0 || !emailContent) {
      setEmailPreview('');
      return;
    }

    const selectedServiceDetails = serviceList.filter(s => selectedServices.includes(s.id));
    const signature = generateSignatureHtml(footerInfo);
    const html = generateEmailHtml('Örnek Müşteri', emailContent, selectedServiceDetails, signature);
    setEmailPreview(html);
  }, [selectedServices, serviceList, emailContent, footerInfo]);

  // E-posta gönder
  const handleSendEmails = async () => {
    if ((!sendToAll && selectedCustomers.length === 0) || selectedServices.length === 0) {
      toast.error('Lütfen en az bir müşteri ve hizmet seçin.');
      return;
    }

    setIsSending(true);
    try {
      const recipientList = sendToAll ? customers : customers.filter(c => selectedCustomers.includes(c.id));
      const selectedServiceDetails = serviceList.filter(s => selectedServices.includes(s.id));
      const signature = generateSignatureHtml(footerInfo);

      let successCount = 0;
      let errorCount = 0;

      for (const customer of recipientList) {
        try {
          const html = generateEmailHtml(customer.kisa_isim, emailContent, selectedServiceDetails, signature);
          
          const { error } = await supabase.functions.invoke('send-schedule-email', {
            body: {
              to: customer.email,
              subject: emailSubject,
              html: html
            }
          });

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`${customer.email} için e-posta gönderilemedi:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} müşteriye başarıyla e-posta gönderildi!`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} müşteriye e-posta gönderilemedi.`);
      }

    } catch (error: any) {
      toast.error('E-posta gönderimi sırasında bir hata oluştu: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  // Template kaydet
  const handleSaveTemplate = async () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.content) {
      toast.error('Lütfen tüm template alanlarını doldurun.');
      return;
    }

    try {
      const { error } = await supabase.from('email_templates').insert(newTemplate);
      if (error) throw error;

      toast.success('Template başarıyla kaydedildi!');
      setShowTemplateModal(false);
      setNewTemplate({ name: '', subject: '', content: '', is_default: false });
      
      // Template listesini yenile
      const { data } = await supabase.from('email_templates').select('*').order('name');
      setTemplates(data || []);
    } catch (error: any) {
      toast.error('Template kaydedilirken hata oluştu: ' + error.message);
    }
  };

  // Template seç
  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === parseInt(templateId));
    if (template) {
      setEmailSubject(template.subject);
      setEmailContent(template.content);
      setSelectedTemplate(templateId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Mail className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Bilgilendirme E-posta Pazarlama</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Panel - Ayarlar */}
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
          
          {/* Template Seçimi */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">1. E-posta Template'i</label>
            <div className="space-y-3">
              <select
                value={selectedTemplate}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Özel template seç</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.is_default ? '(Varsayılan)' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <Plus size={16} />
                Yeni Template Oluştur
              </button>
            </div>
          </div>

          {/* E-posta Konusu */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">E-posta Konusu</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full p-2 border rounded-lg"
              placeholder="E-posta konusu"
            />
          </div>

          {/* Müşteri Seçimi */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">2. Alıcı Müşteriler</label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sendToAll"
                  checked={sendToAll}
                  onChange={(e) => setSendToAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="sendToAll" className="text-sm font-medium">
                  Tüm müşterilere gönder ({customers.length} müşteri)
                </label>
              </div>
              
              {!sendToAll && (
                <div className="border rounded-lg max-h-48 overflow-y-auto p-2">
                  <div className="text-xs text-gray-500 mb-2">
                    Seçili: {selectedCustomers.length} / {customers.length}
                  </div>
                  {customers.map(customer => (
                    <div key={customer.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCustomers(prev => [...prev, customer.id]);
                          } else {
                            setSelectedCustomers(prev => prev.filter(id => id !== customer.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="text-sm">{customer.kisa_isim}</span>
                      <span className="text-xs text-gray-500">({customer.email})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hizmet Seçimi */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">3. Tanıtılacak Hizmetler</label>
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              <div className="p-2 text-xs text-gray-500 border-b">
                Seçili: {selectedServices.length} / {serviceList.length}
              </div>
              {serviceList.map(service => (
                <div key={service.id} className={`border-b last:border-b-0 p-3 ${selectedServices.includes(service.id) ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(service.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedServices(prev => [...prev, service.id]);
                        } else {
                          setSelectedServices(prev => prev.filter(id => id !== service.id));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <img
                      src={service.image_url || 'https://placehold.co/48x48/e2e8f0/334155?text=?'}
                      alt={service.name}
                      className="w-12 h-12 object-cover rounded-md"
                    />
                    <div className="flex-grow">
                      <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                      <p className="text-xs text-gray-500">{service.description?.substring(0, 50)}...</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* E-posta İçeriği */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">4. E-posta İçeriği</label>
            <div className="space-y-2">
              <div className="text-xs text-gray-500">
                Kullanılabilir değişkenler: {{CUSTOMER_NAME}}, {{COMPANY_NAME}}, {{SERVICES_CONTENT}}
              </div>
              <textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                rows={8}
                className="w-full p-3 border rounded-lg text-sm"
                placeholder="E-posta içeriğini buraya yazın..."
              />
            </div>
          </div>

          {/* Gönder Butonu */}
          <div className="border-t pt-4">
            <button
              onClick={handleSendEmails}
              disabled={isSending || (!sendToAll && selectedCustomers.length === 0) || selectedServices.length === 0}
              className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isSending ? <Loader className="animate-spin" /> : <Send />}
              {isSending ? 'Gönderiliyor...' : `E-posta Gönder${sendToAll ? ` (${customers.length} müşteri)` : ` (${selectedCustomers.length} müşteri)`}`}
            </button>
          </div>
        </div>

        {/* Sağ Panel - Önizleme */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye size={20} />
            E-posta Önizlemesi
          </h3>
          <div className="border rounded-lg h-[80vh] overflow-hidden">
            {emailPreview ? (
              <iframe
                srcDoc={emailPreview}
                title="E-posta Önizlemesi"
                className="w-full h-full border-0"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50 text-gray-500">
                <p>Lütfen hizmet seçin ve içerik yazın.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Yeni Template Oluştur</h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Template Adı</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Örn: Kış Sezonu Kampanyası"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">E-posta Konusu</label>
                <input
                  type="text"
                  value={newTemplate.subject}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="E-posta konusu"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">İçerik</label>
                <textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                  rows={10}
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="E-posta içeriği ({{CUSTOMER_NAME}}, {{COMPANY_NAME}}, {{SERVICES_CONTENT}} değişkenlerini kullanabilirsiniz)"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="defaultTemplate"
                  checked={newTemplate.is_default}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, is_default: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="defaultTemplate" className="text-sm">
                  Varsayılan template olarak ayarla
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="flex-1 p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleSaveTemplate}
                className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save size={16} />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BilgilendirimePazarlama;