import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Search, Eye, FileDown, FileText, Calendar, X, Edit, Save, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

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
}

// Düzenleme Formu İçin Arayüz
interface EditFormState {
  id: string;
  company_name: string;
  contact_person: string;
  start_date: string;
  end_date: string;
  contract_amount: number;
  // Detaylar (HTML'den parse edilip formda gösterilecek)
  pest_types: string;
  service_frequency: string;
  application_area: string;
}

const Sozlesmeler: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form State
  const [editFormData, setEditFormData] = useState<EditFormState>({
    id: '',
    company_name: '',
    contact_person: '',
    start_date: '',
    end_date: '',
    contract_amount: 0,
    pest_types: '',
    service_frequency: '',
    application_area: ''
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContracts();
  }, []);

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

  const handleDownloadPdf = () => {
    if (!printRef.current || !(window as any).html2pdf) {
        toast.error("PDF oluşturucu hazır değil.");
        return;
    }
    const element = printRef.current;
    const options = {
        margin:       5,
        filename:     `Sozlesme_${selectedContract?.contract_number}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    (window as any).html2pdf().set(options).from(element).save();
  };

  // Düzenleme Modalı Açıldığında Verileri Yükle
  const handleEditClick = (contract: Contract) => {
    // Varsayılan değerler veya mevcut veriden tahmin yürütme
    // Not: HTML içeriğinden regex ile veri çekmek zor olduğu için varsayılanları koyuyoruz, kullanıcı güncelleyip "Yeniden Oluştur" demeli.
    setEditFormData({
      id: contract.id,
      company_name: contract.company_name,
      contact_person: contract.contact_person,
      contract_amount: contract.contract_amount,
      start_date: contract.start_date,
      end_date: contract.end_date,
      pest_types: 'Hamam böceği, Karınca, Kemirgenler',
      service_frequency: 'AYDA 1 ZİYARET',
      application_area: 'İŞLETME GENELİ'
    });
    setShowEditModal(true);
  };

  // HTML İçeriğini Yeniden Oluştur (Form Verilerine Göre)
  const regenerateContent = async () => {
    try {
        const { data: settings } = await supabase.from('company_settings').select('*').single();
        const selectedOriginal = contracts.find(c => c.id === editFormData.id);
        
        if (!selectedOriginal) return;

        const startDateFormatted = format(new Date(editFormData.start_date), 'dd.MM.yyyy');
        const endDateFormatted = format(new Date(editFormData.end_date), 'dd.MM.yyyy');

        const newContent = `
            <div style="font-family: 'Times New Roman', Times, serif; font-size: 10pt; line-height: 1.4; color: #000; padding: 30px; position: relative; min-height: 297mm;">
                <table style="width: 100%; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px;">
                    <tr>
                        <td style="vertical-align: bottom;">
                             ${settings?.logo_url ? `<img src="${settings.logo_url}" style="height: 50px;" alt="Logo" />` : `<h2>${settings?.company_name}</h2>`}
                        </td>
                        <td style="text-align: right; vertical-align: bottom;">
                            <div style="font-weight: bold; font-size: 11pt;">HİZMET SÖZLEŞMESİ</div>
                            <div style="font-size: 10pt;">SÖZLEŞME NO: <strong>${selectedOriginal.contract_number}</strong></div>
                            <div style="font-size: 9pt;">TARİH: ${startDateFormatted}</div>
                        </td>
                    </tr>
                </table>

                <div style="margin-bottom: 12px;">
                    <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block; margin-bottom: 4px;">1. SÖZLEŞMENİN KONUSU</div>
                    <p style="margin: 3px 0;">İşbu sözleşme, bir tarafta <strong>${editFormData.company_name.toUpperCase()}</strong> (İŞVEREN) ile diğer tarafta <strong>${settings?.company_name?.toUpperCase() || 'SİSTEM İLAÇLAMA LTD. ŞTİ.'}</strong> (PestMENTOR) arasında akdedilmiştir.</p>
                </div>

                <div style="margin-bottom: 12px;">
                    <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block; margin-bottom: 4px;">2. HİZMET KAPSAMI</div>
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
                                <td style="border: 1px solid #000; padding: 6px;">${editFormData.pest_types}</td>
                                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${editFormData.service_frequency}</td>
                                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${editFormData.application_area}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style="margin-bottom: 12px;">
                    <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block; margin-bottom: 4px;">3. SÖZLEŞME SÜRESİ</div>
                    <p style="margin: 2px 0;">İşbu sözleşme, <strong>${startDateFormatted}</strong> tarihinde yürürlüğe girer ve <strong>${endDateFormatted}</strong> tarihine kadar geçerlidir.</p>
                </div>

                <div style="margin-bottom: 20px;">
                    <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block; margin-bottom: 4px;">4. MALİ HÜKÜMLER</div>
                    <div style="border: 2px solid #000; padding: 8px; margin: 5px 0; text-align: center; font-weight: bold; font-size: 11pt;">
                        Hizmet Bedeli: ${editFormData.contract_amount.toLocaleString('tr-TR')} TL + KDV
                    </div>
                </div>

                <div style="margin-top: 40px;">
                    <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
                        <tr>
                            <td style="width: 50%; text-align: center; vertical-align: top; padding: 10px; border: 1px solid #000;">
                                <strong>HİZMETİ VEREN</strong><br/>
                                <span style="font-size: 9pt;">${settings?.company_name}</span><br/><br/>
                                <div style="height: 60px;"></div>
                                <strong>İmza / Kaşe</strong>
                            </td>
                            <td style="width: 50%; text-align: center; vertical-align: top; padding: 10px; border: 1px solid #000;">
                                <strong>HİZMETİ ALAN</strong><br/>
                                <span style="font-size: 9pt;">${editFormData.company_name.toUpperCase()}</span><br/>
                                <span style="font-size: 8pt;">${editFormData.contact_person}</span><br/><br/>
                                <div style="height: 60px;"></div>
                                <strong>İmza / Kaşe</strong>
                            </td>
                        </tr>
                    </table>
                </div>

                 <div style="position: absolute; bottom: 0; left: 0; right: 0; text-align: center; font-size: 8pt; color: #555; border-top: 1px solid #ccc; padding-top: 5px;">
                    <strong>${settings?.company_name}</strong> | ${settings?.address}<br/>
                    Tel: ${settings?.phone} | Web: ${settings?.website || ''} | E-posta: ${settings?.email}
                </div>
            </div>
        `;

        // Veritabanını Güncelle
        const { error } = await supabase
            .from('service_contracts')
            .update({
                company_name: editFormData.company_name,
                contact_person: editFormData.contact_person,
                start_date: editFormData.start_date,
                end_date: editFormData.end_date,
                contract_amount: editFormData.contract_amount,
                content: newContent
            })
            .eq('id', editFormData.id);

        if (error) throw error;
        toast.success("Sözleşme içeriği başarıyla yenilendi ve güncellendi.");
        setShowEditModal(false);
        fetchContracts(); // Listeyi yenile

    } catch (error: any) {
        toast.error("Hata: " + error.message);
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

      {/* --- DÜZENLEME MODALI --- */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Edit className="text-orange-600"/> Sözleşme Düzenle & Yenile
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"><X size={24}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p><strong>Bilgi:</strong> Aşağıdaki bilgileri değiştirdikten sonra "Kaydet ve Sözleşmeyi Yenile" butonuna bastığınızda, sözleşme metni yeni verilerle baştan oluşturulacaktır.</p>
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
                <h3 className="font-bold text-gray-700 mb-3">Hizmet Detayları</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Zararlı Türleri</label>
                        <input type="text" value={editFormData.pest_types} onChange={e => setEditFormData({...editFormData, pest_types: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Örn: Hamam böceği, Kemirgen" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hizmet Sıklığı</label>
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
                onClick={regenerateContent} 
                disabled={isUpdating}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm font-medium disabled:opacity-70"
              >
                {isUpdating ? <Loader2 className="animate-spin size-4"/> : <RefreshCw size={18}/>}
                Kaydet ve Sözleşmeyi Yenile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Sozlesmeler;