import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Search, Eye, FileDown, FileText, Calendar, X, Edit, Save, RefreshCw, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

// --- ARAYÜZLER ---
interface Contract {
  id: string;
  contract_number: string;
  company_name: string;
  contact_person: string;
  start_date: string;
  end_date: string;
  contract_amount: number;
  content: string; 
  created_at: string;
  status: string;
  // Yeni eklenen detay alanları
  pest_types?: string;
  service_frequency?: string;
  application_area?: string;
}

// Şirket Ayarları Arayüzü
interface CompanySettings {
    company_name: string;
    logo_url: string;
    address: string;
    email: string;
    phone: string;
    footer_text: string;
    website?: string;
}

const Sozlesmeler: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  
  // Modallar
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit Form State
  const [editFormData, setEditFormData] = useState<Contract | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // Verileri Çek
  useEffect(() => {
    fetchContracts();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
      const { data } = await supabase.from('company_settings').select('*').single();
      if(data) setSettings(data);
  };

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('service_contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error: any) {
      toast.error('Sözleşmeler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // PDF İndir
  const handleDownloadPdf = () => {
    if (!printRef.current || !(window as any).html2pdf) {
        toast.error("PDF oluşturucu hazır değil.");
        return;
    }
    const element = printRef.current;
    const options = {
        margin:       10, // Kenar boşluğu artırıldı
        filename:     `Sozlesme_${selectedContract?.contract_number}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    (window as any).html2pdf().set(options).from(element).save();
  };

  // Düzenle Butonuna Tıklayınca
  const handleEditClick = (contract: Contract) => {
    setEditFormData({
        ...contract,
        // Eğer veritabanında bu alanlar boşsa varsayılanları ata
        pest_types: contract.pest_types || 'Hamam böceği, Karınca, Kemirgenler',
        service_frequency: contract.service_frequency || 'AYDA 1 ZİYARET',
        application_area: contract.application_area || 'İŞLETME GENELİ'
    });
    setShowEditModal(true);
  };

  // HTML OLUŞTURUCU (Veritabanına Kaydedilecek Metin)
  // NOT: TeklifGoruntule.tsx'deki tam metin yapısı buraya taşındı.
  const generateContractHtml = (data: Contract, companySettings: CompanySettings | null) => {
      const startDateFormatted = data.start_date ? format(new Date(data.start_date), 'dd.MM.yyyy') : '...';
      const endDateFormatted = data.end_date ? format(new Date(data.end_date), 'dd.MM.yyyy') : '...';

      return `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 10pt; line-height: 1.4; color: #000; padding: 30px; position: relative;">
            
            <table style="width: 100%; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px;">
                <tr>
                    <td style="vertical-align: bottom;">
                         ${companySettings?.logo_url ? `<img src="${companySettings.logo_url}" style="height: 50px;" alt="Logo" />` : `<h2>${companySettings?.company_name}</h2>`}
                    </td>
                    <td style="text-align: right; vertical-align: bottom;">
                        <div style="font-weight: bold; font-size: 11pt;">HİZMET SÖZLEŞMESİ</div>
                        <div style="font-size: 10pt;">SÖZLEŞME NO: <strong>${data.contract_number}</strong></div>
                        <div style="font-size: 9pt;">TARİH: ${startDateFormatted}</div>
                    </td>
                </tr>
            </table>

            <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block; margin-bottom: 5px;">1. SÖZLEŞMENİN KONUSU</div>
                <p style="margin: 3px 0; text-align: justify;">İşbu sözleşme, bir tarafta <strong>${data.company_name.toUpperCase()}</strong> (Sözleşmede "İŞVEREN" olarak anılacaktır) ile diğer tarafta <strong>${companySettings?.company_name?.toUpperCase() || 'SİSTEM İLAÇLAMA LTD. ŞTİ.'}</strong> (Sözleşmede "PestMENTOR" olarak anılacaktır) arasında akdedilmiştir.</p>
                <p style="margin: 3px 0;">Sözleşmenin konusu; İŞVEREN'e ait tesislerde, 1.1. İnsan sağlığını, 1.2. Hammadde güvenliğini, 1.3. Ürün kalitesini olumsuz yönde etkileyebilecek zararlı popülasyonunun kontrol altına alınması amacıyla, PestMENTOR tarafından "Onaylanmış Alanlarda" sunulacak Entegre Zararlı Mücadelesi (IPM) hizmetlerinin; teknik, idari, mali ve hukuki şartlarını ve tarafların karşılıklı yükümlülüklerini tanımlar.</p>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block; margin-bottom: 5px;">2. TARAFLAR</div>
                <table style="width: 100%; border: none; font-size: 9pt;">
                    <tr><td style="width: 150px; font-weight: bold;">HİZMET ALAN FİRMA</td><td>: ${data.company_name.toUpperCase()}</td></tr>
                    <tr><td style="font-weight: bold;">YETKİLİ</td><td>: ${data.contact_person}</td></tr>
                </table>
                <br/>
                <table style="width: 100%; border: none; font-size: 9pt;">
                    <tr><td style="width: 150px; font-weight: bold;">HİZMET VEREN FİRMA</td><td>: ${companySettings?.company_name}</td></tr>
                    <tr><td style="font-weight: bold;">ADRES</td><td>: ${companySettings?.address}</td></tr>
                    <tr><td style="font-weight: bold;">TELEFON</td><td>: ${companySettings?.phone}</td></tr>
                </table>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block; margin-bottom: 5px;">3. YAPILACAK İŞİN TANIMI</div>
                <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9pt;">
                    <thead>
                        <tr style="background-color: #f0f0f0;">
                            <th style="border: 1px solid #000; padding: 5px;">HİZMET KATEGORİSİ</th>
                            <th style="border: 1px solid #000; padding: 5px;">ZARARLI TÜRÜ</th>
                            <th style="border: 1px solid #000; padding: 5px;">PERİYODİK ZİYARET SIKLIĞI</th>
                            <th style="border: 1px solid #000; padding: 5px;">UYGULAMA ALAN(LAR)I</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #000; padding: 6px;">GENEL HAŞERE MÜCADELESİ</td>
                            <td style="border: 1px solid #000; padding: 6px;">${data.pest_types}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${data.service_frequency}</td>
                            <td style="border: 1px solid #000; padding: 6px; text-align: center;">${data.application_area}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block; margin-bottom: 5px;">4. YETKİ VE SORUMLULUKLAR</div>
                <div style="margin-left: 10px; font-size: 9.5pt;">
                    <p style="margin-top: 5px;"><strong>4.1. PestMENTOR'un Yetki ve Sorumlulukları</strong></p>
                    <p>4.1.1. Hizmetin İcrası ve Gizlilik: PestMENTOR, IPM hizmetlerini İŞVEREN yetkilisinin gözetiminde icra edecektir.</p>
                    <p>4.1.2. Profesyonel Yetkinlik: Sağlık Bakanlığı onaylı ürünler kullanılacaktır.</p>
                    <p>4.1.3. Operasyonel Karar Yetkisi: Ürün türü, dozajı ve uygulama yöntemine karar verme yetkisi PestMENTOR'a aittir.</p>
                    <p>4.1.5. Raporlama: Hizmet sonrası raporlama yapılacaktır.</p>
                    <p style="margin-top: 5px;"><strong>4.2. İŞVEREN'in Yükümlülükleri</strong></p>
                    <p>4.2.1. Alan Hazırlığı: Çalışma alanları erişilebilir hale getirilmelidir.</p>
                    <p>4.2.3. Tek Yetkililik: İŞVEREN, üçüncü taraflardan hizmet alamaz.</p>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block; margin-bottom: 5px;">5. SÖZLEŞME SÜRESİ</div>
                <p>İşbu sözleşme, <strong>${startDateFormatted}</strong> tarihinde yürürlüğe girer ve <strong>${endDateFormatted}</strong> tarihine kadar geçerlidir.</p>
                <p>5.1. Otomatik Yenileme: Bitiş tarihinden 30 gün önce fesih ihbarı yapılmazsa sözleşme sona erer. Karşılıklı anlaşma ile yenilenebilir.</p>
            </div>

            <div style="margin-bottom: 20px;">
                <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block; margin-bottom: 5px;">9. MALİ HÜKÜMLER</div>
                <div style="border: 2px solid #000; padding: 10px; margin: 5px 0; text-align: center; font-weight: bold; font-size: 11pt;">
                    Hizmet Bedeli: ${data.contract_amount.toLocaleString('tr-TR')} TL + KDV / AY
                </div>
                <p>9.2. Ödemeler fatura tarihinden itibaren 30 gün içinde yapılacaktır.</p>
            </div>

            <div style="margin-top: 40px;">
                <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                    <tr>
                        <td style="width: 50%; text-align: center; vertical-align: top; padding: 10px; border: 1px solid #000;">
                            <strong>HİZMETİ VEREN</strong><br/>
                            <span style="font-size: 9pt;">${companySettings?.company_name}</span><br/><br/>
                            <div style="height: 60px;"></div>
                            <strong>İmza / Kaşe</strong>
                        </td>
                        <td style="width: 50%; text-align: center; vertical-align: top; padding: 10px; border: 1px solid #000;">
                            <strong>HİZMETİ ALAN</strong><br/>
                            <span style="font-size: 9pt;">${data.company_name.toUpperCase()}</span><br/><br/>
                            <div style="height: 60px;"></div>
                            <strong>İmza / Kaşe</strong>
                        </td>
                    </tr>
                </table>
            </div>

             <div style="position: absolute; bottom: 0; left: 0; right: 0; text-align: center; font-size: 8pt; color: #555; border-top: 1px solid #ccc; padding-top: 5px;">
                <strong>${companySettings?.company_name}</strong> | ${companySettings?.address}<br/>
                Tel: ${companySettings?.phone} | Web: ${companySettings?.website || ''} | E-posta: ${companySettings?.email}
            </div>
        </div>
      `;
  };

  // KAYDET VE GÜNCELLE
  const handleSaveChanges = async () => {
    if (!editFormData) return;
    setIsUpdating(true);

    try {
        // 1. Yeni HTML içeriğini oluştur
        const newHtmlContent = generateContractHtml(editFormData, settings);

        // 2. Veritabanını Güncelle
        const { error } = await supabase
            .from('service_contracts')
            .update({
                company_name: editFormData.company_name,
                contact_person: editFormData.contact_person,
                start_date: editFormData.start_date,
                end_date: editFormData.end_date,
                contract_amount: editFormData.contract_amount,
                pest_types: editFormData.pest_types,          // Yeni sütun
                service_frequency: editFormData.service_frequency, // Yeni sütun
                application_area: editFormData.application_area,   // Yeni sütun
                content: newHtmlContent // Oluşturulan HTML'i de güncelle
            })
            .eq('id', editFormData.id);

        if (error) throw error;

        // 3. UI'ı Güncelle (Yeniden fetch etmeden)
        setContracts(prev => prev.map(c => c.id === editFormData.id ? { ...editFormData, content: newHtmlContent } : c));
        
        toast.success("Sözleşme bilgileri ve dökümanı başarıyla güncellendi.");
        setShowEditModal(false);

    } catch (error: any) {
        toast.error("Güncelleme hatası: " + error.message);
    } finally {
        setIsUpdating(false);
    }
  };

  const filteredContracts = contracts.filter(c => 
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contract_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FileText className="text-blue-600" /> Hizmet Sözleşmeleri
        </h1>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Sözleşme No veya Firma Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Sözleşme No</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Firma Ünvanı</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Yetkili</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Başlangıç / Bitiş</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Tutar</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600"/></td></tr>
              ) : filteredContracts.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Kayıtlı sözleşme bulunamadı.</td></tr>
              ) : (
                filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-blue-600">{contract.contract_number}</td>
                    <td className="p-4 text-sm font-semibold text-gray-800">{contract.company_name}</td>
                    <td className="p-4 text-sm text-gray-600">{contract.contact_person}</td>
                    <td className="p-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-gray-400"/>
                        {format(new Date(contract.start_date), 'dd.MM.yyyy')} - {format(new Date(contract.end_date), 'dd.MM.yyyy')}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-800 text-right">
                      {contract.contract_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setSelectedContract(contract); setShowViewModal(true); }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Görüntüle"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleEditClick(contract)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- GÖRÜNTÜLEME MODALI --- */}
      {showViewModal && selectedContract && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-blue-600"/> Sözleşme Detayı: {selectedContract.contract_number}
              </h2>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
               <div className="bg-white shadow-lg p-10 max-w-[210mm] mx-auto min-h-[297mm]">
                  <div ref={printRef} dangerouslySetInnerHTML={{ __html: selectedContract.content }} />
               </div>
            </div>

            <div className="p-4 border-t bg-white flex justify-end gap-3">
              <button onClick={() => setShowViewModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-700">Kapat</button>
              <button onClick={() => handleDownloadPdf()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <FileDown size={18}/> PDF İndir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DÜZENLEME MODALI (YENİLENMİŞ) --- */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Edit className="text-orange-600"/> Sözleşme Düzenle & Yenile
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"><X size={24}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 flex gap-2">
                <RefreshCw className="shrink-0" size={18}/>
                <p>Burada yaptığınız değişiklikler "Kaydet" dediğinizde sözleşme belgesine (PDF içeriğine) otomatik olarak yansıtılacaktır.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firma Ünvanı</label>
                  <input type="text" value={editFormData.company_name} onChange={e => setEditFormData({...editFormData, company_name: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yetkili Kişi</label>
                  <input type="text" value={editFormData.contact_person} onChange={e => setEditFormData({...editFormData, contact_person: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sözleşme Tutarı (TL)</label>
                  <input type="number" value={editFormData.contract_amount} onChange={e => setEditFormData({...editFormData, contract_amount: parseFloat(e.target.value)})} className="w-full p-2 border rounded-lg font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
                  <input type="date" value={editFormData.start_date ? format(new Date(editFormData.start_date), 'yyyy-MM-dd') : ''} onChange={e => setEditFormData({...editFormData, start_date: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi (Vade)</label>
                  <input type="date" value={editFormData.end_date ? format(new Date(editFormData.end_date), 'yyyy-MM-dd') : ''} onChange={e => setEditFormData({...editFormData, end_date: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><CheckCircle size={16}/> Hizmet Kapsam Detayları</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Zararlı Türleri</label>
                        <input type="text" value={editFormData.pest_types} onChange={e => setEditFormData({...editFormData, pest_types: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Örn: Hamam böceği, Kemirgen" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hizmet Sıklığı (Sefer)</label>
                            <input type="text" value={editFormData.service_frequency} onChange={e => setEditFormData({...editFormData, service_frequency: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Örn: AYDA 1 ZİYARET" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Uygulama Alanı</label>
                            <input type="text" value={editFormData.application_area} onChange={e => setEditFormData({...editFormData, application_area: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Örn: İŞLETME GENELİ" />
                        </div>
                    </div>
                </div>
              </div>

            </div>

            <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border bg-white rounded-lg hover:bg-gray-50 text-gray-700">İptal</button>
              <button 
                onClick={handleSaveChanges} 
                disabled={isUpdating}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm font-medium disabled:opacity-70"
              >
                {isUpdating ? <Loader2 className="animate-spin size-4"/> : <RefreshCw size={18}/>}
                Kaydet ve Sözleşmeyi Güncelle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Sozlesmeler;