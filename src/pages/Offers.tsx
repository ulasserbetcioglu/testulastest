import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MoreVertical, Plus, Search, Filter, CheckCircle, Clock, XCircle, Edit, Trash2, AlertTriangle, FileText, FileImage, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// --- PDF/JPEG OLUŞTURMA YARDIMCI FONKSİYONLARI ---
const generateOfferOutput = async (offer: any, companySettings: any, format: 'pdf' | 'jpeg') => {
    const html2canvas = (window as any).html2canvas;
    const jsPDF = (window as any).jspdf.jsPDF;

    if (!html2canvas || !jsPDF) {
        toast.error("Gerekli indirme kütüphaneleri yüklenemedi.");
        return;
    }

    const formatCurrency = (value: number) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

    const subTotal = offer.offer_items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
    const vatAmount = offer.offer_items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price * item.vat_rate / 100), 0);
    const grandTotal = subTotal + vatAmount;

    const itemsHTML = offer.offer_items.map((item: any, index: number) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          <strong>${item.description || ''}</strong>
          ${item.explanation ? `<br><small style="color: #555;">${item.explanation}</small>` : ''}
        </td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-center">${item.unit}</td>
        <td class="text-right">${formatCurrency(item.unit_price)}</td>
        <td class="text-center">%${item.vat_rate}</td>
        <td class="text-right">${formatCurrency(item.quantity * item.unit_price)}</td>
      </tr>
    `).join('');

    const customerDetailsHTML = `
      <p>
        <strong>${offer.customer.cari_isimi || offer.customer.kisa_isim}</strong><br>
        ${offer.customer.adres || ''} ${offer.customer.sehir || ''}<br>
        ${offer.branch?.sube_adi || ''}<br>
        ${offer.customer.email ? `E-posta: ${offer.customer.email}<br>` : ''}
      </p>
    `;

    const html = `
      <style>
        .offer-preview { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; width: 210mm; min-height: 297mm; padding: 15mm; background: white; }
        .offer-preview header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #047857; padding-bottom: 15px; }
        .offer-preview header h1 { font-size: 2.4em; color: #065f46; margin: 0; font-weight: 300; }
        .offer-preview .company-logo { max-width: 160px; max-height: 60px; }
        .offer-preview .info-section { display: flex; justify-content: space-between; margin-top: 25px; font-size: 0.9em; line-height: 1.6; }
        .offer-preview .info-section div { width: 48%; }
        .offer-preview .info-section h2 { font-size: 1.1em; color: #047857; border-bottom: 1px solid #d1fae5; padding-bottom: 5px; margin-bottom: 10px; font-weight: 600; }
        .offer-preview .details-section { background-color: #f0fdf4; border: 1px solid #d1fae5; padding: 12px; margin: 25px 0; display: flex; justify-content: space-around; font-weight: 500; border-radius: 8px; }
        .offer-preview table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.9em; }
        .offer-preview th, .offer-preview td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
        .offer-preview thead { background-color: #065f46; color: white; }
        .offer-preview .totals-section { display: flex; justify-content: flex-end; margin-top: 25px; }
        .offer-preview .totals-section table { width: 350px; font-size: 1em; }
        .offer-preview .totals-section td { border: none; padding: 5px 10px; }
        .offer-preview .totals-section .grand-total { font-weight: bold; font-size: 1.3em; color: #065f46; border-top: 2px solid #065f46; padding-top: 10px !important; }
        .offer-preview footer { margin-top: 35px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 0.8em; color: #6b7280;}
        .offer-preview .text-right { text-align: right; }
        .offer-preview .text-center { text-align: center; }
      </style>
      <div id="offer-to-capture-${offer.id}" class="offer-preview">
        <header>
          ${companySettings.logo_url ? `<img src="${companySettings.logo_url}" alt="Logo" class="company-logo">` : `<h2>${companySettings.company_name}</h2>`}
          <h1>TEKLİF</h1>
        </header>
        <section class="info-section">
            <div>
              <h2>Teklifi Hazırlayan</h2>
              <p><strong>${companySettings.company_name}</strong><br>${companySettings.address}<br>Tel: ${companySettings.phone}<br>Vergi: ${companySettings.tax_office} / ${companySettings.tax_number}</p>
            </div>
            <div>
              <h2>Müşteri</h2>
              ${customerDetailsHTML}
            </div>
        </section>
        <section class="details-section">
          <span>Teklif No: ${offer.teklif_no}</span>
          <span>Tarih: ${new Date(offer.offer_date).toLocaleDateString('tr-TR')}</span>
          <span>Geçerlilik: ${new Date(offer.validity_date).toLocaleDateString('tr-TR')}</span>
        </section>
        <section>
            <table>
              <thead><tr><th>#</th><th>Açıklama</th><th>Miktar</th><th>Birim</th><th>Birim Fiyat</th><th>KDV</th><th>Toplam</th></tr></thead>
              <tbody>${itemsHTML}</tbody>
            </table>
        </section>
        <section class="totals-section">
            <table>
              <tr><td>Ara Toplam</td><td class="text-right">${formatCurrency(subTotal)}</td></tr>
              <tr><td>Toplam KDV</td><td class="text-right">${formatCurrency(vatAmount)}</td></tr>
              <tr class="grand-total"><td>GENEL TOPLAM</td><td class="text-right">${formatCurrency(grandTotal)}</td></tr>
            </table>
        </section>
        ${offer.aciklama ? `<footer class="notes-section"><h2>Açıklamalar</h2><p>${offer.aciklama.replace(/\n/g, '<br>')}</p></footer>` : ''}
      </div>
    `;

    const temporaryContainer = document.createElement('div');
    temporaryContainer.style.position = 'absolute';
    temporaryContainer.style.left = '-9999px';
    temporaryContainer.innerHTML = html;
    document.body.appendChild(temporaryContainer);

    const captureElement = document.getElementById(`offer-to-capture-${offer.id}`);
    if (!captureElement) {
        toast.error("Önizleme elementi oluşturulamadı.");
        document.body.removeChild(temporaryContainer);
        return;
    }

    try {
        const canvas = await html2canvas(captureElement, { scale: 3, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (format === 'jpeg') {
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `${offer.teklif_no}.jpeg`;
            link.click();
        } else {
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            pdf.save(`${offer.teklif_no}.pdf`);
        }
        toast.success(`${format.toUpperCase()} başarıyla indirildi!`);
    } catch (error) {
        toast.error(`${format.toUpperCase()} oluşturulurken bir hata oluştu.`);
    } finally {
        document.body.removeChild(temporaryContainer);
    }
};

// --- ARAYÜZLER (INTERFACES) ---
interface Offer {
  id: string;
  teklif_no: string;
  customer: {
    id: string;
    kisa_isim: string;
    cari_isimi?: string;
    adres?: string;
    sehir?: string;
    email?: string;
  };
  branch?: {
    id: string;
    sube_adi: string;
  };
  offer_date: string;
  validity_date: string;
  status: 'draft' | 'pending' | 'accepted' | 'rejected' | 'invoiced';
  total_amount: number;
  offer_items: any[]; // İndirme için kalemleri tutar
  aciklama?: string;
}

interface CompanySettings {
  company_name: string;
  address: string;
  phone: string;
  email:string;
  tax_office: string;
  tax_number: string;
  logo_url?: string;
}

// --- BİLEŞENLER (COMPONENTS) ---

const StatusBadge: React.FC<{ status: Offer['status'] }> = ({ status }) => {
  const config = {
    accepted: { text: 'Kabul Edildi', icon: CheckCircle, color: 'green' },
    pending: { text: 'Beklemede', icon: Clock, color: 'yellow' },
    rejected: { text: 'Reddedildi', icon: XCircle, color: 'red' },
    invoiced: { text: 'Faturalandı', icon: AlertTriangle, color: 'blue' },
    draft: { text: 'Taslak', icon: Edit, color: 'gray' },
  }[status] || { text: status, icon: Clock, color: 'gray' };

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
      <Icon className={`w-4 h-4 mr-1.5 text-${config.color}-500`} />
      {config.text}
    </span>
  );
};

const OffersPage: React.FC = () => {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Offer | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null); // Açık menüyü takip etmek için state
  
  // Filtreleme için state'ler eklendi
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    // Gerekli scriptleri yükle
    const loadScript = (src: string, id: string) => new Promise((resolve, reject) => {
        if (document.getElementById(id)) return resolve(true);
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`Script load error for ${src}`));
        document.body.appendChild(script);
    });

    Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas-script')
    ]).catch(error => toast.error("Gerekli indirme kütüphaneleri yüklenemedi."));

    // Şirket ayarlarını bir kez yükle
    supabase.from('company_settings').select('*').single().then(({ data }) => {
        setCompanySettings(data);
    });

    // Dışarı tıklandığında menüyü kapat
    const handleClickOutside = () => {
        setOpenMenuId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
        document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchOffers = async () => {
        setLoading(true);

        let query = supabase
            .from('offers')
            .select(`*, customer:customer_id(*), branch:branch_id(*), offer_items(*)`)
            .order('created_at', { ascending: false });

        // Durum filtresi
        if (statusFilter) {
            query = query.eq('status', statusFilter);
        }

        // Arama filtresi (Düzeltilmiş Mantık)
        if (searchTerm.trim()) {
            const { data: customerIds } = await supabase
                .from('customers')
                .select('id')
                .ilike('kisa_isim', `%${searchTerm.trim()}%`);
            
            const matchingCustomerIds = customerIds ? customerIds.map(c => c.id) : [];

            const orFilterParts = [`teklif_no.ilike.%${searchTerm.trim()}%`];
            if (matchingCustomerIds.length > 0) {
                orFilterParts.push(`customer_id.in.(${matchingCustomerIds.join(',')})`);
            }
            query = query.or(orFilterParts.join(','));
        }

        const { data: offersData, error: offersError } = await query;

        if (offersError) {
            toast.error(`Teklifler yüklenirken hata: ${offersError.message}`);
        } else {
            setOffers(offersData as any || []);
        }
        setLoading(false);
    };

    fetchOffers();
  }, [searchTerm, statusFilter]); // Arama veya filtre değiştiğinde yeniden çalıştır

  const handleDownload = async (offer: Offer, format: 'pdf' | 'jpeg') => {
    setDownloading(offer.id);
    if (!companySettings) {
        toast.error("Şirket ayarları yüklenemedi.");
        setDownloading(null);
        return;
    }
    await generateOfferOutput(offer, companySettings, format);
    setDownloading(null);
  };

  const handleDelete = async (offerId: string) => {
    try {
        const { error } = await supabase.from('offers').delete().eq('id', offerId);
        if (error) throw error;
        setOffers(prev => prev.filter(o => o.id !== offerId));
        toast.success("Teklif başarıyla silindi.");
    } catch (err: any) {
        toast.error(`Silme işlemi başarısız: ${err.message}`);
    } finally {
        setShowDeleteConfirm(null);
    }
  };

  const handleMenuToggle = (e: React.MouseEvent, offerId: string) => {
    e.stopPropagation(); // Olayın dışarıya yayılmasını engelle
    setOpenMenuId(prevId => (prevId === offerId ? null : offerId));
  };


  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Teklifler</h1>
        <Link to="/teklifler/new" className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors">
          <Plus size={20} /> Yeni Teklif Oluştur
        </Link>
      </header>

      {/* Filtreleme ve Arama Çubuğu */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-md flex flex-col md:flex-row gap-4">
        <div className="flex-grow relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Teklif No veya Müşteri Adı ile Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 appearance-none"
          >
            <option value="">Tüm Durumlar</option>
            <option value="draft">Taslak</option>
            <option value="pending">Beklemede</option>
            <option value="accepted">Kabul Edildi</option>
            <option value="rejected">Reddedildi</option>
            <option value="invoiced">Faturalandı</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-10"><Loader2 className="animate-spin inline-block w-8 h-8 text-gray-400" /></div>
      ) : offers.length === 0 ? (
        <div className="text-center p-10 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-700">Henüz Teklif Yok</h3>
            <p className="text-gray-500 mt-2">İlk teklifinizi oluşturmak için yukarıdaki butonu kullanın.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map(offer => (
            <div key={offer.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300">
              <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-3">
                  <p className="font-semibold text-green-700">{offer.teklif_no}</p>
                  <p className="text-lg font-bold text-gray-800">{offer.customer?.kisa_isim}</p>
                  {offer.branch && <p className="text-sm text-gray-500">{offer.branch.sube_adi}</p>}
                </div>
                <div className="md:col-span-3 text-sm text-gray-600">
                  <p><strong>Tarih:</strong> {new Date(offer.offer_date).toLocaleDateString('tr-TR')}</p>
                  <p><strong>Geçerlilik:</strong> {new Date(offer.validity_date).toLocaleDateString('tr-TR')}</p>
                </div>
                <div className="md:col-span-2 text-center">
                  <StatusBadge status={offer.status} />
                </div>
                <div className="md:col-span-2 text-right">
                  <p className="text-xl font-extrabold text-gray-800">
                    {offer.total_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </p>
                </div>
                <div className="md:col-span-2 flex justify-end items-center gap-2">
                    {downloading === offer.id ? (
                        <Loader2 className="animate-spin w-5 h-5 text-gray-500" />
                    ) : (
                        <>
                          <button onClick={() => handleDownload(offer, 'pdf')} title="PDF İndir" className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"><FileText size={20} /></button>
                          <button onClick={() => handleDownload(offer, 'jpeg')} title="JPEG İndir" className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><FileImage size={20} /></button>
                        </>
                    )}
                    <div className="relative">
                        <button onClick={(e) => handleMenuToggle(e, offer.id)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><MoreVertical size={20} /></button>
                        {openMenuId === offer.id && (
                            <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-1 z-20 border">
                                <button onClick={() => navigate(`/teklifler/edit/${offer.id}`)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><Edit size={14} /> Düzenle</button>
                                <button onClick={() => { setShowDeleteConfirm(offer); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} /> Sil</button>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800">Teklifi Sil</h3>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-bold">{showDeleteConfirm.teklif_no}</span> numaralı teklifi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">İptal</button>
              <button onClick={() => handleDelete(showDeleteConfirm.id)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Evet, Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffersPage;
