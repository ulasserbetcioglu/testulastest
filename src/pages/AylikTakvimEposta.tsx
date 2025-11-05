import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Mail, Calendar, Users, Eye, Send, Loader2 as Loader, Building } from 'lucide-react';
import { format, lastDayOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';

// Arayüz (Interface) tanımları
interface Customer {
  id: string;
  kisa_isim: string;
  email: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
}

interface SaleItem {
  quantity: number;
  product: {
    name: string;
  };
}

interface PaidMaterialSale {
    items: SaleItem[];
}

interface Visit {
  id: string; // Ziyaret ID'si eklendi
  visit_date: string;
  report_number: string | null;
  branch: { sube_adi: string } | null;
  operator: { name: string } | null;
  paid_material_sales: PaidMaterialSale[];
  report_photo_url?: string; // Rapor fotoğrafı URL'si eklendi
  report_photo_access_password?: string; // ✅ YENİ: Rapor fotoğrafı şifresi eklendi
}

const AylikTakvimEposta: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]); // ✅ DÜZELTME: branches state'i tanımlandı
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [visits, setVisits] = useState<Visit[]>([]);
  const [emailPreview, setEmailPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState<string>('');

  // Müşteri listesini ilk yüklemede çek
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const [customersRes, branchesRes] = await Promise.all([
            supabase.from('customers').select('id, kisa_isim, email').not('email', 'is', null).order('kisa_isim'),
            supabase.from('branches').select('id, sube_adi, customer_id')
        ]);
        
        if (customersRes.error) throw customersRes.error;
        if (branchesRes.error) throw branchesRes.error;

        setCustomers(customersRes.data || []);
        setBranches(branchesRes.data || []);
      } catch (error: any) {
        toast.error('Veriler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  // E-posta içeriğini oluşturan fonksiyon
  const generateEmailHtml = (customerName: string, monthName: string, year: number, scheduleVisits: Visit[]): string => {
    const visitRows = scheduleVisits
      .sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime())
      .map(visit => {
        const materialsHtml = (visit.paid_material_sales[0]?.items || [])
          .map(item => `<li style="font-size: 12px; color: #555;">- ${item.quantity} x ${item.product.name}</li>`)
          .join('');

        // ✅ DEĞİŞTİRİLDİ: Rapor fotoğrafı bağlantısı ve şifre bilgisi eklendi
        const reportPhotoLinkHtml = visit.report_photo_url ? 
          `<a href="${window.location.origin}/view-report-protected/${visit.id}" target="_blank" style="color: #059669; text-decoration: none;">Görüntüle</a>` : 
          '-';
        const reportPhotoPasswordHtml = visit.report_photo_access_password ? 
          `<br><span style="font-size: 10px; color: #888;">Şifre: <strong>${visit.report_photo_access_password}</strong></span>` : 
          '';

        return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #dddddd; vertical-align: top;">${format(new Date(visit.visit_date), "dd MMMM yyyy, EEEE", { locale: tr })}</td>
          <td style="padding: 10px; border-bottom: 1px solid #dddddd; vertical-align: top;">
            ${visit.branch?.sube_adi || 'Genel Merkez'}
            ${materialsHtml ? `<ul style="margin: 5px 0 0 0; padding-left: 15px;">${materialsHtml}</ul>` : ''}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #dddddd; vertical-align: top;">${visit.operator?.name || 'Atanmadı'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #dddddd; vertical-align: top;">${visit.report_number || '-'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #dddddd; vertical-align: top;">
            ${reportPhotoLinkHtml}
            ${reportPhotoPasswordHtml}
          </td>
        </tr>
      `}).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; }
          .header { background-color: #059669; color: white; padding: 10px; text-align: center; }
          .content { padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background-color: #f2f2f2; text-align: left; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Aylık Ziyaret Takvimi ve Raporu</h2>
          </div>
          <div class="content">
            <p>Merhaba ${customerName},</p>
            <p>${monthName} ${year} dönemi için ziyaret takviminiz ve malzeme kullanım raporunuz aşağıda bilgilerinize sunulmuştur.</p>
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Şube & Kullanılan Malzemeler</th>
                  <th>Sorumlu Operatör</th>
                  <th>Rapor No</th>
                  <th>Rapor Görüntüsü</th>
                </tr>
              </thead>
              <tbody>
                ${visitRows}
              </tbody>
            </table>
            <p>Sağlıklı günler dileriz.</p>
            <p><strong>Sistem İlaçlama Sanayi ve Ticaret Limited Şirketi / PestMentor. İlaclamatik.com Her Hakkı Saklıdır.</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Önizleme oluşturma
  const handleGeneratePreview = async () => {
    if (!selectedCustomer) {
      toast.error('Lütfen bir müşteri seçin.');
      return;
    }
    setIsPreviewing(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      
      // ✅ DÜZELTİLDİ: Tarih aralığını doğru şekilde hesapla
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Ayın son günü, gece 23:59:59
      
      console.log('Tarih Aralığı:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        startLocal: startDate.toLocaleDateString('tr-TR'),
        endLocal: endDate.toLocaleDateString('tr-TR')
      });

      let query = supabase
        .from('visits')
        .select(`
          id,
          visit_date,
          report_number,
          branch:branch_id(sube_adi),
          operator:operator_id(name),
          paid_material_sales(
            items:paid_material_sale_items(
              quantity,
              product:product_id(name)
            )
          )
        `)
        .eq('customer_id', selectedCustomer)
        .gte('visit_date', startDate.toISOString())
        .lte('visit_date', endDate.toISOString())
        .order('visit_date');

      // Şube filtresini sorguya ekle
      if (selectedBranch !== 'all') {
        query = query.eq('branch_id', selectedBranch);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('Çekilen ziyaretler:', data?.map(v => ({
        date: v.visit_date,
        formatted: format(new Date(v.visit_date), 'dd/MM/yyyy HH:mm')
      })));
      
      const fetchedVisits = data as Visit[] || [];

      // Rapor fotoğraflarını ve şifrelerini çek
      const visitIds = fetchedVisits.map(v => v.id);
      let reportPhotosMap = new Map<string, { url: string; password?: string }>();

      if (visitIds.length > 0) {
          const { data: documentsData, error: documentsError } = await supabase
              .from('documents')
              .select('entity_id, file_url, access_password') // ✅ DEĞİŞTİRİLDİ: access_password çekildi
              .eq('entity_type', 'visit')
              .eq('document_type', 'report_photo')
              .in('entity_id', visitIds);

          if (documentsError) {
              console.error("Rapor fotoğrafları çekilirken hata:", documentsError);
          } else {
              documentsData?.forEach(doc => {
                  if (doc.entity_id) {
                      reportPhotosMap.set(doc.entity_id, { url: doc.file_url, password: doc.access_password });
                  }
              });
          }
      }

      // Ziyaret verilerini rapor fotoğrafı URL'leri ve şifreleri ile zenginleştir
      const visitsWithPhotos = fetchedVisits.map(visit => ({
          ...visit,
          report_photo_url: reportPhotosMap.get(visit.id)?.url || undefined,
          report_photo_access_password: reportPhotosMap.get(visit.id)?.password || undefined, // ✅ YENİ: Şifre eklendi
      }));

      setVisits(visitsWithPhotos); // setSales yerine setVisits kullanıldı

      const customer = customers.find(c => c.id === selectedCustomer);
      const monthName = format(startDate, 'MMMM', { locale: tr });
      
      if (visitsWithPhotos && visitsWithPhotos.length > 0) {
        const html = generateEmailHtml(customer?.kisa_isim || '', monthName, year, visitsWithPhotos);
        setEmailPreview(html);
        toast.success(`E-posta önizlemesi başarıyla oluşturuldu. ${visitsWithPhotos.length} ziyaret bulundu.`);
      } else {
        setEmailPreview('');
        toast.info('Seçili kriterler için planlanmış ziyaret bulunamadı.');
      }
    } catch (error: any) {
      console.error('Önizleme hatası:', error);
      toast.error('Önizleme oluşturulurken bir hata oluştu: ' + error.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  // E-posta gönderme
  const handleSendEmail = async () => {
    if (!emailPreview) {
      toast.error('Lütfen önce bir önizleme oluşturun.');
      return;
    }
    if (!recipientEmail) {
      toast.error('Lütfen geçerli bir alıcı e-posta adresi girin.');
      return;
    }

    setIsSending(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthName = format(new Date(year, month - 1, 1), 'MMMM', { locale: tr });
      const subject = `${monthName} ${year} Aylık Ziyaret ve Malzeme Raporu`;

      const { error } = await supabase.functions.invoke('send-schedule-email', {
        body: {
          to: recipientEmail,
          subject,
          html: emailPreview,
        },
      });

      if (error) throw error;

      toast.success(`E-posta başarıyla ${recipientEmail} adresine gönderildi!`);
    } catch (error: any) {
      toast.error('E-posta gönderilirken bir hata oluştu: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };
  
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomer(customerId);
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomerEmail(customer?.email || '');
    setEmailPreview('');
    setSelectedBranch('all'); // Müşteri değiştiğinde şube filtresini sıfırla
  };

  // Seçili müşteriye ait şubeleri filtreleyen useMemo
  const filteredBranches = useMemo(() => {
    if (!selectedCustomer) return [];
    return branches.filter(b => b.customer_id === selectedCustomer);
  }, [selectedCustomer, branches]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Mail className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Aylık Rapor Gönder</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kontrol Paneli */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Users size={16}/> Müşteri Seçimi
            </label>
            <select
              value={selectedCustomer}
              onChange={e => handleCustomerChange(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white"
              disabled={loading}
            >
              <option value="" disabled>Müşteri Seçin...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
            </select>
          </div>
          
          {/* Şube seçim alanı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Building size={16}/> Şube Seçimi
            </label>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white disabled:bg-gray-100"
              disabled={!selectedCustomer}
            >
              <option value="all">Tüm Şubeler</option>
              {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Mail size={16}/> Gönderilecek Adres
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="gonderilecek@adres.com"
              disabled={!selectedCustomer}
              className="w-full p-2 border rounded-lg bg-white disabled:bg-gray-100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Calendar size={16}/> Dönem Seçimi
            </label>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
              className="w-full p-2 border rounded-lg" 
            />
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={handleGeneratePreview} 
              disabled={isPreviewing || !selectedCustomer} 
              className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isPreviewing ? <Loader className="animate-spin" /> : <Eye />}
              {isPreviewing ? 'Oluşturuluyor...' : 'Önizleme Oluştur'}
            </button>
            
            <button 
              onClick={handleSendEmail} 
              disabled={isSending || !emailPreview} 
              className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {isSending ? <Loader className="animate-spin" /> : <Send />}
              {isSending ? 'Gönderiliyor...' : 'E-postayı Gönder'}
            </button>
          </div>
        </div>

        {/* E-posta Önizleme */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold mb-4">E-posta Önizlemesi</h3>
            <div className="border rounded-lg h-[60vh] overflow-hidden">
                {emailPreview ? (
                    <iframe
                        srcDoc={emailPreview}
                        title="E-posta Önizlemesi"
                        className="w-full h-full border-0"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full bg-gray-50 text-gray-500">
                        <p>Lütfen bir müşteri ve dönem seçip önizleme oluşturun.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AylikTakvimEposta;
