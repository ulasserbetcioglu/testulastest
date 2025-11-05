import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Mail, Calendar, Users, Eye, Send, Loader2 as Loader, Package } from 'lucide-react';
import { format, lastDayOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';

// Arayüz (Interface) tanımları
interface Customer {
  id: string;
  kisa_isim: string;
  email: string;
}

interface SaleItem {
  quantity: number;
  product: {
    name: string;
  };
}

interface Sale {
  sale_date: string;
  branch: { sube_adi: string } | null;
  items: SaleItem[];
}

const AylikMalzemeEposta: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [sales, setSales] = useState<Sale[]>([]);
  const [emailPreview, setEmailPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState<string>('');

  // Müşteri listesini ilk yüklemede çek
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, kisa_isim, email')
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

  // E-posta içeriğini oluşturan fonksiyon
  const generateEmailHtml = (customerName: string, monthName: string, year: number, salesData: Sale[]): string => {
    const saleRows = salesData
      .sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime())
      .flatMap(sale => 
        sale.items.map(item => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #dddddd;">${format(new Date(sale.sale_date), 'dd MMMM yyyy', { locale: tr })}</td>
            <td style="padding: 10px; border-bottom: 1px solid #dddddd;">${sale.branch?.sube_adi || 'Genel Merkez'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #dddddd;">${item.product.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #dddddd; text-align: center;">${item.quantity}</td>
          </tr>
        `)
      ).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; }
          .header { background-color: #4f46e5; color: white; padding: 10px; text-align: center; }
          .content { padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background-color: #f2f2f2; text-align: left; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Aylık Ücretli Malzeme Kullanım Raporu</h2>
          </div>
          <div class="content">
            <p>Merhaba ${customerName},</p>
            <p>${monthName} ${year} dönemi için ücretli malzeme kullanım raporunuz aşağıda bilgilerinize sunulmuştur.</p>
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Şube</th>
                  <th>Ürün Adı</th>
                  <th style="text-align: center;">Miktar</th>
                </tr>
              </thead>
              <tbody>
                ${saleRows}
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
      const startDate = new Date(year, month - 1, 1);
      const endDate = lastDayOfMonth(startDate);
      
      const { data, error } = await supabase
        .from('paid_material_sales')
        .select('sale_date, branch:branch_id(sube_adi), items:paid_material_sale_items(quantity, product:product_id(name))')
        .eq('customer_id', selectedCustomer)
        .gte('sale_date', startDate.toISOString())
        .lte('sale_date', endDate.toISOString())
        .order('sale_date');

      if (error) throw error;
      setSales(data || []);

      const customer = customers.find(c => c.id === selectedCustomer);
      const monthName = format(startDate, 'MMMM', { locale: tr });
      
      if (data && data.length > 0) {
        const html = generateEmailHtml(customer?.kisa_isim || '', monthName, year, data);
        setEmailPreview(html);
        toast.success('E-posta önizlemesi başarıyla oluşturuldu.');
      } else {
        setEmailPreview('');
        toast.info('Seçili dönem için ücretli malzeme kullanımı bulunamadı.');
      }
    } catch (error: any) {
      toast.error('Önizleme oluşturulurken bir hata oluştu: ' + error.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  // E-posta gönderme
  const handleSendEmail = async () => {
    if (!emailPreview || !selectedCustomer) {
      toast.error('Lütfen önce bir önizleme oluşturun.');
      return;
    }
    const customer = customers.find(c => c.id === selectedCustomer);
    if (!customer || !customer.email) {
      toast.error('Seçili müşterinin e-posta adresi bulunamadı.');
      return;
    }

    setIsSending(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthName = format(new Date(year, month - 1, 1), 'MMMM', { locale: tr });
      const subject = `${monthName} ${year} Aylık Ücretli Malzeme Kullanım Raporu`;

      // Bu fonksiyonun Supabase projenizde olması gerekir.
      const { error } = await supabase.functions.invoke('send-schedule-email', {
        body: {
          to: customer.email,
          subject,
          html: emailPreview,
        },
      });

      if (error) throw error;

      toast.success(`E-posta başarıyla ${customer.email} adresine gönderildi!`);
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
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Package className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-800">Aylık Malzeme Raporu Gönder</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kontrol Paneli */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Users size={16}/> Müşteri Seçimi</label>
            <select
              value={selectedCustomer}
              onChange={e => handleCustomerChange(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white"
              disabled={loading}
            >
              <option value="" disabled>Müşteri Seçin...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
            </select>
            {selectedCustomerEmail && (
              <div className="mt-2 p-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                <span className="font-semibold">Gönderilecek Adres:</span> {selectedCustomerEmail}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2"><Calendar size={16}/> Dönem Seçimi</label>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full p-2 border rounded-lg" />
          </div>
          <div className="space-y-3">
            <button onClick={handleGeneratePreview} disabled={isPreviewing || !selectedCustomer} className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
              {isPreviewing ? <Loader className="animate-spin" /> : <Eye />}
              {isPreviewing ? 'Oluşturuluyor...' : 'Önizleme Oluştur'}
            </button>
            <button onClick={handleSendEmail} disabled={isSending || !emailPreview} className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors">
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

export default AylikMalzemeEposta;
