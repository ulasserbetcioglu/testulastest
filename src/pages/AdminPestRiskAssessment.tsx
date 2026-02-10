import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  Bug, Plus, Search, Edit3, Trash2, Loader2, Save, X,
  ChevronDown, ChevronUp, FileDown, RefreshCw, Eye
} from 'lucide-react';
import { format } from 'date-fns';
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
      const pop = Math.floor(Math.random() * 2); // 0-1 (Daha düşük başlatıyoruz)
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
  division: 'Fabrika Geneli',
  assessment_date: format(new Date(), 'yyyy-MM-dd'),
  responsible_person: '',
  customer_responsible: '',
  document_number: '',
  revision_number: '01',
  revision_date: format(new Date(), 'yyyy-MM-dd'),
  pest_data: getEmptyPestData(),
  status: 'active',
};

// --- Preview Component ---
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
        
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8 text-sm">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase">Müşteri</p>
            <p className="font-medium text-gray-900 border-b border-gray-200 pb-1">{data.customer_name}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase">Bölüm / Alan</p>
            <p className="font-medium text-gray-900 border-b border-gray-200 pb-1">{data.division}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-500 text-xs font-semibold uppercase">Adres</p>
            <p className="font-medium text-gray-900 border-b border-gray-200 pb-1">{data.customer_address}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase">PestMentor Sorumlusu</p>
            <p className="font-medium text-gray-900 border-b border-gray-200 pb-1">{data.responsible_person || '-'}</p>
          </div>
          <div>
             <p className="text-gray-500 text-xs font-semibold uppercase">Müşteri Sorumlusu</p>
             <p className="font-medium text-gray-900 border-b border-gray-200 pb-1">{data.customer_responsible || '-'}</p>
          </div>
        </div>

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
  const [companySettings, setCompanySettings] = useState<any>(null);
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
        supabase.from('company_settings').select('*').maybeSingle(),
      ]);
      setAssessments(assessRes.data || []);
      setCustomers(custRes.data || []);
      setBranches(branchRes.data || []);
      setCompanySettings(settingsRes.data);
    } catch {
      toast.error('Veri yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => { setForm({ ...INITIAL_FORM, pest_data: getEmptyPestData() }); setEditingId(null); setExpandedCat(null); };
  
  const handleCustomerChange = (customerId: string) => { 
    const customer = customers.find(c => c.id === customerId); 
    setForm(prev => ({ 
      ...prev, 
      customer_id: customerId, 
      customer_name: customer?.kisa_isim || '', 
      customer_address: customer ? `${customer.adres || ''}, ${customer.sehir || ''}` : '', 
      branch_id: '', 
    })); 
  };
  
  const handlePestValueChange = (catKey: string, pestKey: string, field: 'pop' | 'risk', value: number) => { 
    setForm(prev => ({ 
      ...prev, 
      pest_data: { 
        ...prev.pest_data, 
        [catKey]: { 
          ...prev.pest_data[catKey], 
          [pestKey]: { 
            ...prev.pest_data[catKey]?.[pestKey], 
            [field]: value, 
          }, 
        }, 
      }, 
    })); 
  };
  
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
      companyLogo: companySettings?.logo_url,
      companyName: companySettings?.company_name
    };
    generatePestRiskAssessmentPdf(input);
  };
  
  const filtered = assessments.filter(a => a.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredBranches = branches.filter(b => b.customer_id === form.customer_id);

  if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="animate-spin text-green-600" /></div>;

  if (previewItem) {
    return <PestRiskPreview data={previewItem} onClose={() => setPreviewItem(null)} onPdfExport={() => handleExportPdf(previewItem)} />;
  }

  return (
    <div className="space-y-6">
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

       {showForm && (
         <div className="bg-white border rounded-xl shadow-sm overflow-hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
              <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center shrink-0">
                  <h2 className="font-bold text-green-900 flex gap-2 items-center"><Edit3 size={18}/> {editingId ? 'Düzenle' : 'Yeni'}</h2>
                  <button onClick={()=>{setShowForm(false); resetForm();}}><X size={18} className="text-green-600"/></button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto">
                  {/* Üst Bilgiler Formu */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Müşteri</label>
                          <select 
                              value={form.customer_id} 
                              onChange={e => handleCustomerChange(e.target.value)} 
                              className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none"
                          >
                              <option value="">Seçiniz</option>
                              {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Şube</label>
                          <select 
                              value={form.branch_id} 
                              onChange={e => setForm(p => ({ ...p, branch_id: e.target.value }))} 
                              className="w-full p-2 border rounded text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none"
                          >
                              <option value="">Seçiniz</option>
                              {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Bölüm / Alan</label>
                          <input 
                              type="text" 
                              value={form.division} 
                              onChange={e => setForm(p => ({ ...p, division: e.target.value }))} 
                              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Değerlendirme Tarihi</label>
                          <input 
                              type="date" 
                              value={form.assessment_date} 
                              onChange={e => setForm(p => ({ ...p, assessment_date: e.target.value }))} 
                              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Sorumlu (PestMentor)</label>
                          <input 
                              type="text" 
                              value={form.responsible_person} 
                              onChange={e => setForm(p => ({ ...p, responsible_person: e.target.value }))} 
                              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Müşteri Sorumlusu</label>
                          <input 
                              type="text" 
                              value={form.customer_responsible} 
                              onChange={e => setForm(p => ({ ...p, customer_responsible: e.target.value }))} 
                              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Doküman No</label>
                          <input 
                              type="text" 
                              value={form.document_number} 
                              onChange={e => setForm(p => ({ ...p, document_number: e.target.value }))} 
                              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                          />
                      </div>
                      <div className="flex gap-2">
                          <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Rev. No</label>
                              <input 
                                  type="text" 
                                  value={form.revision_number} 
                                  onChange={e => setForm(p => ({ ...p, revision_number: e.target.value }))} 
                                  className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                              />
                          </div>
                          <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Rev. Tarihi</label>
                              <input 
                                  type="date" 
                                  value={form.revision_date} 
                                  onChange={e => setForm(p => ({ ...p, revision_date: e.target.value }))} 
                                  className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                              />
                          </div>
                      </div>
                  </div>

                  {/* Risk Değerlendirme Tablosu - GÜNCELLENMİŞ SELECT OPTIONS */}
                  <div className="space-y-4">
                      <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2 border-b pb-2">
                          <Bug className="text-green-600" size={20}/>
                          Risk Değerlendirme Detayları
                      </h3>
                      
                      {PEST_CATEGORIES.map((cat) => {
                          const isExpanded = expandedCat === cat.key;
                          const avg = getCategoryAverage(form.pest_data?.[cat.key]);
                          const avgStyle = getRiskScoreColor(Math.round(avg.avgScore));

                          return (
                              <div key={cat.key} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                  {/* Kategori Başlığı */}
                                  <button 
                                      onClick={() => setExpandedCat(isExpanded ? null : cat.key)}
                                      className="w-full flex justify-between items-center bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors"
                                  >
                                      <div className="flex items-center gap-3">
                                          <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                              <ChevronDown size={18} className="text-gray-500"/>
                                          </span>
                                          <span className="font-bold text-gray-800">{cat.label}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <span className="text-xs text-gray-500">Ort. Skor: <strong style={{ color: avgStyle.text }}>{avg.avgScore.toFixed(1)}</strong></span>
                                          <span className="text-xs px-2 py-1 rounded font-bold" style={{ backgroundColor: avgStyle.bg, color: avgStyle.text }}>
                                              {avg.avgScore <= 8 ? 'DÜŞÜK' : avg.avgScore <= 15 ? 'ORTA' : 'YÜKSEK'}
                                          </span>
                                      </div>
                                  </button>

                                  {/* Kategori İçeriği (Tablo) */}
                                  {isExpanded && (
                                      <div className="p-4 bg-white animate-in slide-in-from-top-2">
                                          <table className="w-full text-sm">
                                              <thead>
                                                  <tr className="bg-gray-50 border-b">
                                                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Zararlı Türü</th>
                                                      <th className="text-center py-2 px-3 font-semibold text-gray-600 w-32">Popülasyon (0-5)</th>
                                                      <th className="text-center py-2 px-3 font-semibold text-gray-600 w-32">Risk (0-5)</th>
                                                      <th className="text-center py-2 px-3 font-semibold text-gray-600 w-24">Skor</th>
                                                      <th className="text-center py-2 px-3 font-semibold text-gray-600 w-24">Sonuç</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y">
                                                  {cat.pests.map((pest) => {
                                                      const d = form.pest_data?.[cat.key]?.[pest.key] || { pop: 0, risk: 0 };
                                                      const score = getRiskScore(d.pop, d.risk);
                                                      const scoreColor = getRiskScoreColor(score);

                                                      return (
                                                          <tr key={pest.key} className="hover:bg-gray-50">
                                                              <td className="py-2 px-3 text-gray-700">{pest.label}</td>
                                                              <td className="py-2 px-3 text-center">
                                                                  <select 
                                                                      value={d.pop}
                                                                      onChange={(e) => handlePestValueChange(cat.key, pest.key, 'pop', Number(e.target.value))}
                                                                      className="w-full p-1 border rounded text-center focus:ring-2 focus:ring-green-500 outline-none"
                                                                  >
                                                                      <option value="0">0 - Yok</option>
                                                                      <option value="1">1 - Çok Düşük</option>
                                                                      <option value="2">2 - Düşük</option>
                                                                      <option value="3">3 - Orta</option>
                                                                      <option value="4">4 - Yüksek</option>
                                                                      <option value="5">5 - Kritik</option>
                                                                  </select>
                                                              </td>
                                                              <td className="py-2 px-3 text-center">
                                                                  <select 
                                                                      value={d.risk}
                                                                      onChange={(e) => handlePestValueChange(cat.key, pest.key, 'risk', Number(e.target.value))}
                                                                      className="w-full p-1 border rounded text-center focus:ring-2 focus:ring-green-500 outline-none"
                                                                  >
                                                                      <option value="0">0 - Yok</option>
                                                                      <option value="1">1 - Çok Düşük</option>
                                                                      <option value="2">2 - Düşük</option>
                                                                      <option value="3">3 - Orta</option>
                                                                      <option value="4">4 - Yüksek</option>
                                                                      <option value="5">5 - Kritik</option>
                                                                  </select>
                                                              </td>
                                                              <td className="py-2 px-3 text-center font-bold text-gray-800">
                                                                  {score}
                                                              </td>
                                                              <td className="py-2 px-3 text-center">
                                                                  {score > 0 ? (
                                                                      <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: scoreColor.bg, color: scoreColor.text }}>
                                                                          {score <= 8 ? 'DÜŞÜK' : score <= 15 ? 'ORTA' : 'YÜKSEK'}
                                                                      </span>
                                                                  ) : (
                                                                      <span className="text-xs text-gray-400">-</span>
                                                                  )}
                                                              </td>
                                                          </tr>
                                                      );
                                                  })}
                                              </tbody>
                                          </table>
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-4 border-t border-green-100 flex justify-end gap-3 shrink-0">
                  <button onClick={()=>{setShowForm(false); resetForm();}} className="px-4 py-2 border rounded text-sm hover:bg-gray-100">İptal</button>
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