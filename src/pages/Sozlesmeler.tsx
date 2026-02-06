import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Search, Eye, FileDown, FileText, Calendar, X, Edit, RefreshCw, Plus, Trash2, FileEdit, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { generateContractHtml } from '../utils/contractGenerator';

interface Contract {
  id: string;
  proposal_id?: string;
  contract_number: string;
  company_name: string;
  contact_person: string;
  start_date: string;
  end_date: string;
  contract_amount: number;
  content: string;
  created_at: string;
  status: string;
  pest_types?: string;
  application_area?: string;
}

interface CompanySettings {
  company_name: string;
  logo_url: string;
  address: string;
  email: string;
  phone: string;
  footer_text: string;
  website?: string;
}

interface EditableServiceItem {
  id?: string;
  service_name: string;
  service_description: string;
  visit_count: number;
  unit_price: number;
  unit_type: string;
  item_type: 'service' | 'product';
}

const Sozlesmeler: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editLoadingItems, setEditLoadingItems] = useState(false);

  const [editFormData, setEditFormData] = useState<Contract | null>(null);
  const [editServiceItems, setEditServiceItems] = useState<EditableServiceItem[]>([]);
  const [editMode, setEditMode] = useState<'form' | 'fulltext'>('form');
  const [fullTextHtml, setFullTextHtml] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const fullTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContracts();
    fetchSettings();

    const pdfScript = document.createElement('script');
    pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    pdfScript.async = true;
    document.body.appendChild(pdfScript);

    return () => {
      if (document.body.contains(pdfScript)) {
        document.body.removeChild(pdfScript);
      }
    };
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('company_settings').select('*').single();
    if (data) setSettings(data);
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

  const handleDownloadPdf = async () => {
    if (!printRef.current || !(window as any).html2pdf) {
      toast.error("PDF oluşturucu hazır değil.");
      return;
    }

    const logoUrl = settings?.logo_url || '';
    const compName = settings?.company_name || '';
    const contractNo = selectedContract?.contract_number || '';

    let headerImgData: string | null = null;
    try {
      const headerEl = document.createElement('div');
      headerEl.style.cssText = 'width: 680px; padding: 8px 0 6px 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a7d37; font-family: Arial, sans-serif; background: white; position: absolute; top: -9999px; left: -9999px;';
      headerEl.innerHTML = `
        <div>${logoUrl ? `<img src="${logoUrl}" crossorigin="anonymous" style="height: 28px; object-fit: contain;">` : `<span style="font-size: 13px; font-weight: 800; color: #1a7d37;">PestMENTOR</span>`}</div>
        <div style="font-size: 8px; color: #555; text-align: right;">
          <span style="font-weight: 600;">${compName}</span><br/>
          <span>S\u00f6zle\u015fme No: ${contractNo}</span>
        </div>
      `;
      document.body.appendChild(headerEl);
      const headerCanvas = await html2canvas(headerEl, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      headerImgData = headerCanvas.toDataURL('image/png');
      document.body.removeChild(headerEl);
    } catch (e) {
      console.warn('Header render failed:', e);
    }

    const options = {
      margin: [22, 10, 18, 10],
      filename: `Sozlesme_${contractNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css'] }
    };

    (window as any).html2pdf()
      .set(options)
      .from(printRef.current)
      .toPdf()
      .get('pdf')
      .then((pdf: any) => {
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          if (i > 1 && headerImgData) {
            pdf.addImage(headerImgData, 'PNG', 10, 3, 190, 12);
          }
          pdf.setFontSize(7);
          pdf.setTextColor(150);
          pdf.text(`Sayfa ${i} / ${totalPages}`, 105, 292, { align: 'center' });
        }
      })
      .save();
  };

  const handleEditClick = async (contract: Contract) => {
    setEditFormData({
      ...contract,
      application_area: contract.application_area || 'İŞLETME GENELİ'
    });
    setEditMode('form');
    setFullTextHtml(contract.content || '');
    setShowEditModal(true);
    setEditLoadingItems(true);

    try {
      if (contract.proposal_id) {
        const { data: items } = await supabase
          .from('proposal_items')
          .select('*')
          .eq('proposal_id', contract.proposal_id);

        if (items && items.length > 0) {
          setEditServiceItems(items.map((item: any) => ({
            id: item.id,
            service_name: item.service_name || '',
            service_description: item.service_description || '',
            visit_count: item.visit_count || 1,
            unit_price: item.unit_price || 0,
            unit_type: item.unit_type || 'aylik',
            item_type: item.item_type || 'service',
          })));
        } else {
          setEditServiceItems([{
            service_name: 'Genel Haşere Mücadelesi',
            service_description: '',
            visit_count: 1,
            unit_price: contract.contract_amount || 0,
            unit_type: 'aylik',
            item_type: 'service',
          }]);
        }
      } else {
        setEditServiceItems([{
          service_name: 'Genel Haşere Mücadelesi',
          service_description: '',
          visit_count: 1,
          unit_price: contract.contract_amount || 0,
          unit_type: 'aylik',
          item_type: 'service',
        }]);
      }
    } catch {
      setEditServiceItems([{
        service_name: 'Genel Haşere Mücadelesi',
        service_description: '',
        visit_count: 1,
        unit_price: contract.contract_amount || 0,
        unit_type: 'aylik',
        item_type: 'service',
      }]);
    } finally {
      setEditLoadingItems(false);
    }
  };

  const updateServiceItem = (index: number, field: keyof EditableServiceItem, value: any) => {
    setEditServiceItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addServiceItem = () => {
    setEditServiceItems(prev => [...prev, {
      service_name: '',
      service_description: '',
      visit_count: 1,
      unit_price: 0,
      unit_type: 'aylik',
      item_type: 'service',
    }]);
  };

  const removeServiceItem = (index: number) => {
    if (editServiceItems.length <= 1) return;
    setEditServiceItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveChanges = async () => {
    if (!editFormData) return;
    setIsUpdating(true);

    try {
      if (editMode === 'fulltext') {
        const currentHtml = fullTextRef.current?.innerHTML || fullTextHtml;

        const { error } = await supabase
          .from('service_contracts')
          .update({ content: currentHtml })
          .eq('id', editFormData.id);

        if (error) throw error;

        const updatedContract = { ...editFormData, content: currentHtml };
        setContracts(prev => prev.map(c => c.id === editFormData.id ? updatedContract : c));
        toast.success("Sözleşme metni başarıyla güncellendi.");
        setShowEditModal(false);
        return;
      }

      const startFormatted = editFormData.start_date ? format(new Date(editFormData.start_date), 'dd.MM.yyyy') : '';
      const endFormatted = editFormData.end_date ? format(new Date(editFormData.end_date), 'dd.MM.yyyy') : '';

      const pestsFromItems = editServiceItems
        .filter(i => i.item_type === 'service')
        .map(i => i.service_name)
        .join(', ');

      const newHtmlContent = generateContractHtml({
        proposal: {
          company_name: editFormData.company_name,
          contact_person: editFormData.contact_person,
          recipient_email: '',
          total_amount: editFormData.contract_amount,
          discount_amount: 0,
          application_area: editFormData.application_area || '',
          customer_notes: null,
          included_pests: pestsFromItems ? pestsFromItems.split(', ') : [],
          proposal_items: editServiceItems.map(item => ({
            service_name: item.service_name,
            service_description: item.service_description,
            visit_count: item.visit_count,
            unit_price: item.unit_price,
            unit_type: item.unit_type,
            item_type: item.item_type,
          })),
        },
        settings: settings ? {
          company_name: settings.company_name,
          logo_url: settings.logo_url,
          address: settings.address,
          email: settings.email,
          phone: settings.phone,
          website: settings.website,
        } : null,
        contractNumber: editFormData.contract_number,
        startDate: startFormatted,
        endDate: endFormatted,
      });

      const serviceTotal = editServiceItems
        .filter(i => i.item_type === 'service')
        .reduce((sum, i) => sum + i.unit_price, 0);

      const { error } = await supabase
        .from('service_contracts')
        .update({
          company_name: editFormData.company_name,
          contact_person: editFormData.contact_person,
          start_date: editFormData.start_date,
          end_date: editFormData.end_date,
          contract_amount: serviceTotal || editFormData.contract_amount,
          pest_types: pestsFromItems,
          application_area: editFormData.application_area,
          content: newHtmlContent,
        })
        .eq('id', editFormData.id);

      if (error) throw error;

      if (editFormData.proposal_id) {
        for (const item of editServiceItems) {
          if (item.id) {
            await supabase.from('proposal_items').update({
              service_name: item.service_name,
              service_description: item.service_description,
              visit_count: item.visit_count,
              unit_price: item.unit_price,
              unit_type: item.unit_type,
              item_type: item.item_type,
            }).eq('id', item.id);
          }
        }
      }

      const updatedContract = {
        ...editFormData,
        contract_amount: serviceTotal || editFormData.contract_amount,
        content: newHtmlContent,
        pest_types: pestsFromItems,
      };
      setContracts(prev => prev.map(c => c.id === editFormData.id ? updatedContract : c));

      toast.success("Sözleşme başarıyla güncellendi.");
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
                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></td></tr>
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
                        <Calendar size={14} className="text-gray-400" />
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

      {showViewModal && selectedContract && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-blue-600" /> Sözleşme Detayı: {selectedContract.contract_number}
              </h2>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
              <div className="bg-white shadow-lg p-10 max-w-[210mm] mx-auto min-h-[297mm]">
                <div ref={printRef} dangerouslySetInnerHTML={{ __html: selectedContract.content }} />
              </div>
            </div>

            <div className="p-4 border-t bg-white flex justify-end gap-3">
              <button onClick={() => setShowViewModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-700">Kapat</button>
              <button onClick={handleDownloadPdf} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <FileDown size={18} /> PDF İndir
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editFormData && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[95vh]">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Edit className="text-orange-600" /> Sözleşme Düzenle
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"><X size={24} /></button>
            </div>

            <div className="flex border-b bg-gray-50">
              <button
                onClick={() => setEditMode('form')}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  editMode === 'form'
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ListChecks size={16} /> Form ile Düzenle
              </button>
              <button
                onClick={() => {
                  if (editMode === 'form') {
                    setFullTextHtml(editFormData.content || '');
                  }
                  setEditMode('fulltext');
                }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  editMode === 'fulltext'
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FileEdit size={16} /> Tam Metin Düzenle
              </button>
            </div>

            {editMode === 'form' ? (
              <div className="p-6 overflow-y-auto space-y-5">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 flex gap-2">
                  <RefreshCw className="shrink-0" size={18} />
                  <p>Değişiklikler kaydedildiğinde sözleşme PDF içeriği otomatik olarak yeniden oluşturulacaktır.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Firma Ünvanı</label>
                    <input type="text" value={editFormData.company_name} onChange={e => setEditFormData({ ...editFormData, company_name: e.target.value })} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yetkili Kişi</label>
                    <input type="text" value={editFormData.contact_person} onChange={e => setEditFormData({ ...editFormData, contact_person: e.target.value })} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Uygulama Alanı</label>
                    <input type="text" value={editFormData.application_area || ''} onChange={e => setEditFormData({ ...editFormData, application_area: e.target.value })} className="w-full p-2 border rounded-lg" placeholder="İŞLETME GENELİ" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
                    <input type="date" value={editFormData.start_date ? format(new Date(editFormData.start_date), 'yyyy-MM-dd') : ''} onChange={e => setEditFormData({ ...editFormData, start_date: e.target.value })} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
                    <input type="date" value={editFormData.end_date ? format(new Date(editFormData.end_date), 'yyyy-MM-dd') : ''} onChange={e => setEditFormData({ ...editFormData, end_date: e.target.value })} className="w-full p-2 border rounded-lg" />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">Hizmet Kalemleri</h3>
                    <button onClick={addServiceItem} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm hover:bg-green-100">
                      <Plus size={14} /> Satır Ekle
                    </button>
                  </div>

                  {editLoadingItems ? (
                    <div className="flex justify-center py-6"><Loader2 className="animate-spin text-blue-500" /></div>
                  ) : (
                    <div className="space-y-3">
                      {editServiceItems.map((item, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-gray-50 relative">
                          {editServiceItems.length > 1 && (
                            <button onClick={() => removeServiceItem(index)} className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 size={14} />
                            </button>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Hizmet Adı</label>
                              <input type="text" value={item.service_name} onChange={e => updateServiceItem(index, 'service_name', e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Yürüyen Haşere Mücadelesi" />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Açıklama</label>
                              <input type="text" value={item.service_description} onChange={e => updateServiceItem(index, 'service_description', e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Hamam böceği, karınca vb." />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Birim Fiyat (TL)</label>
                              <input type="number" value={item.unit_price} onChange={e => updateServiceItem(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded text-sm font-semibold" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Ziyaret Sayısı / Ay</label>
                              <input type="number" value={item.visit_count} onChange={e => updateServiceItem(index, 'visit_count', parseInt(e.target.value) || 1)} className="w-full p-2 border rounded text-sm" min={1} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Birim Tipi</label>
                              <select value={item.unit_type} onChange={e => updateServiceItem(index, 'unit_type', e.target.value)} className="w-full p-2 border rounded text-sm">
                                <option value="aylik">Aylik</option>
                                <option value="seferlik">Tek Sefer</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Tur</label>
                              <select value={item.item_type} onChange={e => updateServiceItem(index, 'item_type', e.target.value as 'service' | 'product')} className="w-full p-2 border rounded text-sm">
                                <option value="service">Hizmet</option>
                                <option value="product">Urun</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-right">
                    <span className="text-sm text-gray-600 mr-2">Toplam Hizmet Bedeli:</span>
                    <span className="text-lg font-bold text-green-800">
                      {editServiceItems.filter(i => i.item_type === 'service').reduce((s, i) => s + i.unit_price, 0).toLocaleString('tr-TR')} TL+KDV/Sefer
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
                <div className="p-3 mb-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800 flex gap-2">
                  <FileEdit className="shrink-0 mt-0.5" size={16} />
                  <p>Sozlesme metnini dogrudan duzenleyebilirsiniz. Tum maddeler, tablolar ve metinler uzerinde degisiklik yapabilirsiniz.</p>
                </div>
                <div
                  className="bg-white shadow-lg mx-auto p-10 min-h-[600px] max-w-[210mm] border border-gray-200 rounded"
                  style={{ outline: 'none' }}
                >
                  <div
                    ref={fullTextRef}
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: fullTextHtml }}
                    className="focus:outline-none"
                    style={{ minHeight: '500px' }}
                  />
                </div>
              </div>
            )}

            <div className="p-5 border-t bg-gray-50 flex justify-between items-center">
              <div className="text-xs text-gray-400">
                {editMode === 'form' ? 'Form modu: Kaydetme sonrasi sozlesme yeniden olusturulur' : 'Metin modu: Degisiklikler dogrudan kaydedilir'}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border bg-white rounded-lg hover:bg-gray-50 text-gray-700">Iptal</button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isUpdating}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm font-medium disabled:opacity-70"
                >
                  {isUpdating ? <Loader2 className="animate-spin size-4" /> : <RefreshCw size={18} />}
                  Kaydet ve Guncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Sozlesmeler;
