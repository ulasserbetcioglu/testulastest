import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Mail, Calendar, Users, Eye, Send, Loader2 as Loader, Building, FileText } from 'lucide-react';
import { format } from 'date-fns';
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
  id: string;
  visit_date: string;
  report_number: string | null;
  branch: { sube_adi: string } | null;
  operator: { name: string } | null;
  paid_material_sales: PaidMaterialSale[];
  report_photo_url?: string;
  report_photo_access_password?: string;
}

const AylikTakvimEposta: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  
  // Form State'leri
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  
  // Rapor Türü State'leri
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

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
  const generateEmailHtml = (customerName: string, periodTitle: string, scheduleVisits: Visit[]): string => {
    const visitRows = scheduleVisits
      .sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime())
      .map(visit => {
        const materialsHtml = (visit.paid_material_sales[0]?.items || [])
          .map(item => `<li style="font-size: 12px; color: #555;">- ${item.quantity} x ${item.product.name}</li>`)
          .join('');

        const reportPhotoLinkHtml = visit.report_photo_url ? 
          `<a href="${window.location.origin}/view-report-protected/${visit.id}" target="_blank" style="color: #059669; text-decoration: none; font-weight: bold;">Görüntüle</a>` : 
          '-';
        
        const reportPhotoPasswordHtml = visit.report_photo_access_password ? 
          `<br><span style="font-size: 10px; color: #888;">Şifre: <strong>${visit.report_photo_access_password}</strong></span>` : 
          '';

        return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #dddddd; vertical-align: top;">${format(new Date(visit.visit_date), "dd.MM.yyyy", { locale: tr })}</td>
          <td style="padding: 10px; border-bottom: 1px solid #dddddd; vertical-align: top;">
            <strong>${visit.branch?.sube_adi || 'Genel Merkez'}</strong>
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
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; margin: 0; padding: 0; }
          .container { max-width: 800px; margin: auto; border: 1px solid #eee; background-color: #ffffff; }
          .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { background-color: #f8f9fa; text-align: left; padding: 12px; border-bottom: 2px solid #dee2e6; color: #495057; }
          .footer { margin-top: 30px; font-size: 12px; color: #6c757d; border-top: 1px solid #eee; padding-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin:0;">Ziyaret ve Faaliyet Raporu</h2>
            <p style="margin:5px 0 0 0; opacity: 0.9;">${periodTitle}</p>
          </div>
          <div class="content">
            <p>Sayın <strong>${customerName}</strong> Yetkilisi,</p>
            <p>${periodTitle} dönemine ait gerçekleştirilen ziyaretler ve malzeme kullanım detayları aşağıda sunulmuştur.</p>
            <br/>
            <table>
              <thead>
                <tr>
                  <th style="width: 15%">Tarih</th>
                  <th style="width: 35%">Şube & Malzemeler</th>
                  <th style="width: 15%">Operatör</th>
                  <th style="width: 15%">Rapor No</th>
                  <th style="width: 20%">Rapor</th>
                </tr>
              </thead>
              <tbody>
                ${visitRows}
              </tbody>
            </table>
            
            <div class="footer">
              <p>Bu e-posta otomatik olarak oluşturulmuştur.</p>
              <p><strong>Sistem İlaçlama Sanayi ve Ticaret Limited Şirketi / PestMentor</strong><br/>www.ilaclamatik.com</p>
            </div>
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
      let startDate: Date;
      let endDate: Date;
      let periodTitle = '';

      // TARİH ARALIĞI HESAPLAMA
      if (reportType === 'monthly') {
        const [year, month] = selectedMonth.split('-').map(Number);
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
        periodTitle = `${format(startDate, 'MMMM yyyy', { locale: tr })} Ayı`;
      } else {
        startDate = new Date(selectedYear, 0, 1); // 1 Ocak
        endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999); // 31 Aralık
        periodTitle = `${selectedYear} Yılı Genel`;
      }
      
      console.log('Rapor Aralığı:', {
        start: startDate.toLocaleString('tr-TR'),
        end: endDate.toLocaleString('tr-TR'),
        type: reportType
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
      
      const fetchedVisits = data as Visit[] || [];

      // Rapor fotoğraflarını ve şifrelerini çek
      const visitIds = fetchedVisits.map(v => v.id);
      let reportPhotosMap = new Map<string, { url: string; password?: string }>();

      if (visitIds.length > 0) {
          const { data: documentsData, error: documentsError } = await supabase
              .from('documents')
              .select('entity_id, file_url, access_password')
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

      // Ziyaret verilerini zenginleştir
      const visitsWithPhotos = fetchedVisits.map(visit => ({
          ...visit,
          report_photo_url: reportPhotosMap.get(visit.id)?.url || undefined,
          report_photo_access_password: reportPhotosMap.get(visit.id)?.password || undefined,
      }));

      setVisits(visitsWithPhotos);

      const customer = customers.find(c => c.id === selectedCustomer);
      
      if (visitsWithPhotos && visitsWithPhotos.length > 0) {
        const html = generateEmailHtml(customer?.kisa_isim || '', periodTitle, visitsWithPhotos);
        setEmailPreview(html);
        toast.success(`E-posta önizlemesi hazır. ${visitsWithPhotos.length} kayıt listelendi.`);
      } else {
        setEmailPreview('');
        toast.info('Seçili kriterler için kayıt bulunamadı.');
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
    if (!emailPreview) return toast.error('Lütfen önce bir önizleme oluşturun.');
    if (!recipientEmail) return toast.error('Lütfen alıcı e-posta adresi girin.');

    setIsSending(true);
    try {
      let subject = '';
      if (reportType === 'monthly') {
        const [year, month] = selectedMonth.split('-').map(Number);
        const monthName = format(new Date(year, month - 1, 1), 'MMMM', { locale: tr });
        subject = `${monthName} ${year} Ziyaret Raporu - PestMentor`;
      } else {
        subject = `${selectedYear} Yılı Genel Faaliyet Raporu - PestMentor`;
      }

      const { error } = await supabase.functions.invoke('send-schedule-email', {
        body: {
          to: recipientEmail,
          subject,
          html: emailPreview,
        },
      });

      if (error) throw error;

      toast.success(`Rapor başarıyla gönderildi! (${recipientEmail})`);
    } catch (error: any) {
      toast.error('E-posta gönderim hatası: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };
  
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomer(customerId);
    const customer = customers.find(c => c.id === customerId);
    setRecipientEmail(customer?.email || '');
    setEmailPreview('');
    setSelectedBranch('all');
  };

  const filteredBranches = useMemo(() => {
    if (!selectedCustomer) return [];
    return branches.filter(b => b.customer_id === selectedCustomer);
  }, [selectedCustomer, branches]);

  // Yıl seçenekleri (Geçmiş 5 yıl + Gelecek 1 yıl)
  const yearOptions = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 5 + i).reverse();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Mail className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Rapor Gönder (Aylık/Yıllık)</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kontrol Paneli */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md space-y-6">
          
          {/* Müşteri Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Users size={16}/> Müşteri Seçimi
            </label>
            <select
              value={selectedCustomer}
              onChange={e => handleCustomerChange(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={loading}
            >
              <option value="" disabled>Müşteri Seçin...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
            </select>
          </div>
          
          {/* Şube Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Building size={16}/> Şube Seçimi
            </label>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={!selectedCustomer}
            >
              <option value="all">Tüm Şubeler</option>
              {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
            </select>
          </div>
          
          {/* Gönderilecek Adres */}
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
              className="w-full p-2 border rounded-lg bg-white disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          {/* Rapor Türü ve Dönem Seçimi */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Calendar size={16}/> Rapor Dönemi
            </label>
            
            {/* Radio Butonlar */}
            <div className="flex gap-4 mb-4">
                <label className="flex items-center cursor-pointer">
                    <input 
                        type="radio" 
                        name="reportType" 
                        value="monthly" 
                        checked={reportType === 'monthly'} 
                        onChange={() => setReportType('monthly')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Aylık Rapor</span>
                </label>
                <label className="flex items-center cursor-pointer">
                    <input 
                        type="radio" 
                        name="reportType" 
                        value="yearly" 
                        checked={reportType === 'yearly'} 
                        onChange={() => setReportType('yearly')}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Yıllık Rapor</span>
                </label>
            </div>

            {/* Tarih Seçiciler */}
            {reportType === 'monthly' ? (
                <input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(e.target.value)} 
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                />
            ) : (
                <select 
                    value={selectedYear} 
                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    {yearOptions.map(year => (
                        <option key={year} value={year}>{year} Yılı</option>
                    ))}
                </select>
            )}
          </div>
          
          {/* Butonlar */}
          <div className="space-y-3 pt-2">
            <button 
              onClick={handleGeneratePreview} 
              disabled={isPreviewing || !selectedCustomer} 
              className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors shadow-sm"
            >
              {isPreviewing ? <Loader className="animate-spin" /> : <Eye />}
              {isPreviewing ? 'Hazırlanıyor...' : 'Raporu Önizle'}
            </button>
            
            <button 
              onClick={handleSendEmail} 
              disabled={isSending || !emailPreview} 
              className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors shadow-sm"
            >
              {isSending ? <Loader className="animate-spin" /> : <Send />}
              {isSending ? 'Gönderiliyor...' : 'E-postayı Gönder'}
            </button>
          </div>
        </div>

        {/* E-posta Önizleme */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md flex flex-col h-[800px]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <FileText className="text-gray-500" />
                    Rapor Önizlemesi
                </h3>
                {emailPreview && (
                    <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        Hazır
                    </span>
                )}
            </div>
            
            <div className="border rounded-lg flex-grow overflow-hidden bg-gray-50">
                {emailPreview ? (
                    <iframe
                        srcDoc={emailPreview}
                        title="E-posta Önizlemesi"
                        className="w-full h-full border-0"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <FileText size={48} className="mb-2 opacity-20" />
                        <p>Lütfen sol taraftan kriterleri seçip "Raporu Önizle" butonuna basın.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AylikTakvimEposta;