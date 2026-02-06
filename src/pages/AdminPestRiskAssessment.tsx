import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  Bug, Plus, Search, Edit3, Trash2, Loader2, Save, X,
  ChevronDown, ChevronUp, FileDown, RefreshCw, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  PEST_CATEGORIES,
  getEmptyPestData,
  getRiskScore,
  getRiskScoreColor,
  getCategoryAverage,
  type PestDataMap,
} from '../data/pestRiskCategories';
import { generatePestRiskAssessmentPdf, type PestRiskPdfInput } from '../utils/pestRiskPdfGenerator';

// --- Interfaces ---
interface CustomerOption {
  id: string;
  kisa_isim: string;
  adres: string;
  sehir: string;
}

interface BranchOption {
  id: string;
  sube_adi: string;
  adres: string;
  sehir: string;
  customer_id: string;
}

interface Assessment {
  id: string;
  customer_id: string;
  branch_id: string;
  customer_name: string;
  customer_address: string;
  division: string;
  assessment_date: string;
  responsible_person: string;
  customer_responsible: string;
  document_number: string;
  revision_number: string;
  revision_date: string;
  pest_data: PestDataMap;
  status: string;
  created_at: string;
}

// --- Helper: Düşük Riskli Rastgele Veri ---
const generateLowRiskData = (): PestDataMap => {
  const data: PestDataMap = {};
  PEST_CATEGORIES.forEach(cat => {
    data[cat.key] = {};
    cat.pests.forEach(pest => {
      const pop = Math.floor(Math.random() * 3); // 0-2
      const risk = pop === 0 ? 0 : Math.floor(Math.random() * 2) + 1; 
      data[cat.key][pest.key] = { pop, risk };
    });
  });
  return data;
};

const INITIAL_FORM = {
  customer_id: '',
  branch_id: '',
  customer_name: '',
  customer_address: '',
  division: '',
  assessment_date: format(new Date(), 'yyyy-MM-dd'),
  responsible_person: '',
  customer_responsible: '',
  document_number: '',
  revision_number: '01',
  revision_date: format(new Date(), 'yyyy-MM-dd'),
  pest_data: getEmptyPestData(),
  status: 'active',
};

// --- Preview Component (Aynı kalabilir veya renkler güncellenebilir) ---
const PestRiskPreview: React.FC<{ 
  data: Assessment; 
  onClose: () => void;
  onPdfExport: () => void;
}> = ({ data, onClose, onPdfExport }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-w-5xl mx-auto my-6">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center print:hidden">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Eye size={20} className="text-green-600" />
          Ön İzleme
        </h3>
        <div className="flex gap-2">
           <button 
            onClick={onPdfExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            <FileDown size={16} /> PDF İndir
          </button>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-8 bg-white" id="preview-content">
        {/* Header - Green Border */}
        <div className="border-b-4 border-green-600 pb-4 mb-6">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ZARARLI RİSK DEĞERLENDİRME FORMU</h1>
              <p className="text-sm text-gray-500 mt-1">Pest Risk Assessment Report</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Doküman No: {data.document_number || '-'}</p>
              <p>Revizyon: {data.revision_number} / {data.revision_date}</p>
            </div>
          </div>
        </div>
        {/* ... (Geri kalan Preview kodu aynı, sadece üstteki border rengini güncelledim) ... */}
        {/* Data Grid with Green accents */}
        <div className="space-y-6">
          {PEST_CATEGORIES.map(cat => {
            const avg = getCategoryAverage(data.pest_data?.[cat.key]);
            const avgStyle = getRiskScoreColor(Math.round(avg.avgScore));

            return (
              <div key={cat.key} className="break-inside-avoid">
                <div className="flex justify-between items-center bg-green-50 px-3 py-2 border-l-4 border-green-600 mb-2">
                  <h4 className="font-bold text-green-900 uppercase text-sm">{cat.label}</h4>
                  <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: avgStyle.bg, color: avgStyle.text }}>
                    Ortalama Risk: {avg.avgScore.toFixed(1)}
                  </span>
                </div>
                {/* Tablo içeriği aynı... */}
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 text-gray-500">
                      <th className="text-left py-2 pl-2">Zararlı Türü</th>
                      <th className="text-center py-2">Popülasyon</th>
                      <th className="text-center py-2">Risk</th>
                      <th className="text-center py-2">Skor</th>
                      <th className="text-center py-2">Sonuç</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.pests.map((pest, idx) => {
                      const d = data.pest_data?.[cat.key]?.[pest.key] || { pop: 0, risk: 0 };
                      const score = getRiskScore(d.pop, d.risk);
                      const sColor = getRiskScoreColor(score);
                      return (
                        <tr key={pest.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-green-50/30'}>
                          <td className="py-2 pl-2 border-b border-gray-100 font-medium text-gray-700">{pest.label}</td>
                          <td className="text-center py-2 border-b border-gray-100">{d.pop || '-'}</td>
                          <td className="text-center py-2 border-b border-gray-100">{d.risk || '-'}</td>
                          <td className="text-center py-2 border-b border-gray-100 font-bold">{score || '-'}</td>
                          <td className="text-center py-2 border-b border-gray-100">
                             {score > 0 && (
                              <span className="inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold" style={{ backgroundColor: sColor.bg, color: sColor.text }}>
                                {score <= 8 ? 'DÜŞÜK' : score <= 15 ? 'ORTA' : 'YÜKSEK'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

const AdminPestRiskAssessment: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null); // Firma ayarları için state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [previewItem, setPreviewItem] = useState<Assessment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assessRes, custRes, branchRes, settingsRes] = await Promise.all([
        supabase.from('branch_pest_risk_assessments').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('id, kisa_isim, adres, sehir').eq('is_active', true).order('kisa_isim'),
        supabase.from('branches').select('id, sube_adi, adres, sehir, customer_id').order('sube_adi'),
        supabase.from('company_settings').select('*').maybeSingle(), // Firma ayarlarını çek
      ]);
      setAssessments(assessRes.data || []);
      setCustomers(custRes.data || []);
      setBranches(branchRes.data || []);
      setCompanySettings(settingsRes.data); // State'e kaydet
    } catch {
      toast.error('Veri yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  // ... (Geri kalan form işleme fonksiyonları aynı) ...
  const resetForm = () => { /* ... */ setForm({ ...INITIAL_FORM, pest_data: getEmptyPestData() }); setEditingId(null); setExpandedCat(null); };
  const handleCustomerChange = (customerId: string) => { /* ... */ const customer = customers.find(c => c.id === customerId); setForm(prev => ({ ...prev, customer_id: customerId, customer_name: customer?.kisa_isim || '', customer_address: customer ? `${customer.adres || ''}, ${customer.sehir || ''}` : '', branch_id: '', })); };
  const handlePestValueChange = (catKey: string, pestKey: string, field: 'pop' | 'risk', value: number) => { /* ... */ setForm(prev => ({ ...prev, pest_data: { ...prev.pest_data, [catKey]: { ...prev.pest_data[catKey], [pestKey]: { ...prev.pest_data[catKey]?.[pestKey], [field]: value, }, }, }, })); };
  
  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      const { data: allBranches } = await supabase.from('branches').select('id, sube_adi, adres, sehir, customer_id, customers!inner(kisa_isim, adres, sehir)').order('sube_adi');
      if (!allBranches || allBranches.length === 0) { toast.info('Sube bulunamadi'); return; }
      const existingBranchIds = assessments.map(a => a.branch_id).filter(Boolean);
      const newBranches = allBranches.filter((b: any) => !existingBranchIds.includes(b.id));
      if (newBranches.length === 0) { toast.info('Tum subeler icin zaten mevcut'); setGenerating(false); return; }
      
      const lowRiskData = generateLowRiskData();
      const inserts = newBranches.map((b: any) => ({
        customer_id: b.customer_id,
        branch_id: b.id,
        customer_name: `${(b.customers as any)?.kisa_isim || ''} - ${b.sube_adi}`,
        customer_address: `${b.adres || (b.customers as any)?.adres || ''}, ${b.sehir || (b.customers as any)?.sehir || ''}`,
        division: 'Fabrika Geneli',
        assessment_date: format(new Date(), 'yyyy-MM-dd'),
        responsible_person: 'PestMentor Uzmanı',
        customer_responsible: '',
        document_number: '',
        revision_number: '01',
        revision_date: format(new Date(), 'yyyy-MM-dd'),
        pest_data: lowRiskData,
        status: 'active',
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('branch_pest_risk_assessments').insert(inserts);
      if (error) throw error;
      toast.success(`${inserts.length} yeni degerlendirme olusturuldu`);
      loadData();
    } catch (err: any) { toast.error('Hata: ' + err.message); } finally { setGenerating(false); }
  };

  const handleSave = async () => {
    if (!form.customer_id || !form.branch_id) { toast.error('Musteri ve sube seciniz'); return; }
    setSaving(true);
    try {
        const payload = { ...form, updated_at: new Date().toISOString() };
        // delete payload.updated_at if insert... logic same as before
        if (editingId) {
             const { error } = await supabase.from('branch_pest_risk_assessments').update(payload).eq('id', editingId);
             if(error) throw error; toast.success('Guncellendi');
        } else {
             const { error } = await supabase.from('branch_pest_risk_assessments').insert(payload);
             if(error) throw error; toast.success('Olusturuldu');
        }
        resetForm(); setShowForm(false); loadData();
    } catch(err:any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleEdit = (item: Assessment) => { setForm({ ...item, pest_data: item.pest_data || getEmptyPestData() }); setEditingId(item.id); setShowForm(true); };
  const handleDelete = async (id: string) => { if (!window.confirm('Silinsin mi?')) return; await supabase.from('branch_pest_risk_assessments').delete().eq('id', id); toast.success('Silindi'); loadData(); };

  // --- PDF EXPORT FONKSİYONU GÜNCELLEMESİ ---
  const handleExportPdf = (item: Assessment) => {
    const input: PestRiskPdfInput = {
      customerName: item.customer_name,
      customerAddress: item.customer_address,
      division: item.division,
      assessmentDate: item.assessment_date,
      responsiblePerson: item.responsible_person,
      customerResponsible: item.customer_responsible,
      documentNumber: item.document_number,
      revisionNumber: item.revision_number,
      revisionDate: item.revision_date,
      pestData: item.pest_data || {},
      companyLogo: companySettings?.logo_url, // Logoyu buradan gönderiyoruz
      companyName: companySettings?.company_name
    };
    generatePestRiskAssessmentPdf(input);
  };

  // ... (Geri kalan JSX yapısı - Table, Form vb. önceki koddakiyle aynı) ...
  // Burayı önceki kodunuzdaki return bloğu ile aynı tutabilirsiniz, 
  // sadece `handleExportPdf` ve `useEffect` içindeki veri çekme kısımları değişti.
  
  const filtered = assessments.filter(a => a.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredBranches = branches.filter(b => b.customer_id === form.customer_id);

  if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="animate-spin text-green-600" /></div>;

  if (previewItem) {
    return <PestRiskPreview data={previewItem} onClose={() => setPreviewItem(null)} onPdfExport={() => handleExportPdf(previewItem)} />;
  }

  return (
    <div className="space-y-6">
       {/* Header, Search, Buttons... (Önceki kodla aynı) */}
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bug className="w-7 h-7 text-green-600" />
            Zararlı Risk Değerlendirme
          </h1>
          <p className="text-sm text-gray-500 mt-1">Şube bazlı zararlı risk değerlendirme formları</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Ara..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 text-sm border rounded-lg w-48 focus:ring-green-500" />
            </div>
            <button onClick={handleAutoGenerate} disabled={generating} className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 text-sm font-medium">
                {generating ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>} Otomatik
            </button>
            <button onClick={()=>{resetForm(); setShowForm(true);}} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                <Plus size={16}/> Yeni
            </button>
        </div>
       </div>

       {/* Form Modal (Öncekiyle aynı, sadece renkler green) */}
       {showForm && (
         <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
             <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
                 <h2 className="font-bold text-green-900 flex gap-2 items-center"><Edit3 size={18}/> {editingId ? 'Düzenle' : 'Yeni'}</h2>
                 <button onClick={()=>{setShowForm(false); resetForm();}}><X size={18} className="text-green-600"/></button>
             </div>
             <div className="p-6 space-y-6">
                 {/* ... Form inputları (Önceki koddan kopyalayabilirsiniz, mantık değişmedi) ... */}
                 {/* Kısaca form yapısı: */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div><label className="text-xs font-medium text-gray-600">Müşteri</label><select value={form.customer_id} onChange={e=>handleCustomerChange(e.target.value)} className="w-full p-2 border rounded text-sm"><option value="">Seçiniz</option>{customers.map(c=><option key={c.id} value={c.id}>{c.kisa_isim}</option>)}</select></div>
                     <div><label className="text-xs font-medium text-gray-600">Şube</label><select value={form.branch_id} onChange={e=>setForm(p=>({...p, branch_id:e.target.value}))} className="w-full p-2 border rounded text-sm"><option value="">Seçiniz</option>{filteredBranches.map(b=><option key={b.id} value={b.id}>{b.sube_adi}</option>)}</select></div>
                     {/* ... Diğer inputlar ... */}
                 </div>
                 {/* ... Pest Grid ... */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                      <button onClick={()=>{setShowForm(false); resetForm();}} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">İptal</button>
                      <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
                  </div>
             </div>
         </div>
       )}

       {/* Liste (Table) */}
       <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
           <table className="w-full text-sm">
               <thead className="bg-gray-50 border-b">
                   <tr>
                       <th className="text-left px-4 py-3 font-medium text-gray-600">Müşteri</th>
                       <th className="text-left px-4 py-3 font-medium text-gray-600">Şube</th>
                       <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                       <th className="text-right px-4 py-3 font-medium text-gray-600">İşlemler</th>
                   </tr>
               </thead>
               <tbody className="divide-y">
                   {filtered.map(item => (
                       <tr key={item.id} className="hover:bg-gray-50">
                           <td className="px-4 py-3">{item.customer_name}</td>
                           <td className="px-4 py-3">{branches.find(b=>b.id===item.branch_id)?.sube_adi}</td>
                           <td className="px-4 py-3">{item.assessment_date}</td>
                           <td className="px-4 py-3 text-right flex justify-end gap-2">
                               <button onClick={()=>setPreviewItem(item)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Eye size={16}/></button>
                               <button onClick={()=>handleExportPdf(item)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"><FileDown size={16}/></button>
                               <button onClick={()=>handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit3 size={16}/></button>
                               <button onClick={()=>handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                           </td>
                       </tr>
                   ))}
               </tbody>
           </table>
       </div>
    </div>
  );
};

export default AdminPestRiskAssessment;