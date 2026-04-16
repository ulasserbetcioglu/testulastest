// Dosya: src/pages/AdminEnvironmentalRiskAssessment.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  Leaf, Plus, Search, Edit3, Trash2, Loader2, Save, X,
  ChevronDown, ChevronUp, FileDown, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import {
  PEST_ENV_ROWS,
  getEmptyEnvData,
  calculateEnvScore,
  getEnvRiskColor,
  getEnvAverages,
  type EnvDataMap,
  type EnvRowData
} from '../data/environmentalRiskCategories';
import { generateEnvironmentalRiskAssessmentPdf, type EnvRiskPdfInput } from '../utils/environmentalRiskPdfGenerator';

interface EnvAssessment {
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
  risk_data: EnvDataMap;
  status: string;
}

// Otomatik Düşük Riskli Veri (Hepsi 1 veya 2)
const generateLowRiskData = (): EnvDataMap => {
  const data: EnvDataMap = {};
  PEST_ENV_ROWS.forEach(row => {
    // Çoğunlukla 1, nadiren 2 ver
    data[row.key] = {
      hygiene: Math.random() > 0.8 ? 2 : 1,
      insulation: Math.random() > 0.8 ? 2 : 1,
      storage: Math.random() > 0.8 ? 2 : 1,
      monitoring: 1, // Genelde tam puan
      population: 1 // Düşük popülasyon
    };
  });
  return data;
};

const INITIAL_FORM = {
  customer_id: '', branch_id: '', customer_name: '', customer_address: '', division: 'FABRİKA GENELİ',
  assessment_date: format(new Date(), 'yyyy-MM-dd'),
  responsible_person: '', customer_responsible: '',
  document_number: '', revision_number: '01', revision_date: format(new Date(), 'yyyy-MM-dd'),
  risk_data: getEmptyEnvData(), status: 'active',
};

const AdminEnvironmentalRiskAssessment: React.FC = () => {
  const [assessments, setAssessments] = useState<EnvAssessment[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ass, cust, br, set] = await Promise.all([
        supabase.from('branch_environmental_risk_assessments').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('id, kisa_isim, adres, sehir').eq('is_active', true),
        supabase.from('branches').select('id, sube_adi, adres, sehir, customer_id'),
        supabase.from('company_settings').select('*').maybeSingle(),
      ]);
      setAssessments(ass.data || []);
      setCustomers(cust.data || []);
      setBranches(br.data || []);
      setCompanySettings(set.data);
    } catch { toast.error('Veri yüklenemedi'); } finally { setLoading(false); }
  };

  const handleValueChange = (rowKey: string, field: keyof EnvRowData, value: number) => {
    setForm(prev => ({
      ...prev,
      risk_data: {
        ...prev.risk_data,
        [rowKey]: { ...prev.risk_data[rowKey], [field]: value }
      }
    }));
  };

  const handleSave = async () => {
    if (!form.customer_id || !form.branch_id) { toast.error('Seçim yapınız'); return; }
    try {
      const payload = { ...form, updated_at: new Date().toISOString() };
      if (editingId) await supabase.from('branch_environmental_risk_assessments').update(payload).eq('id', editingId);
      else await supabase.from('branch_environmental_risk_assessments').insert(payload);
      toast.success('Kaydedildi'); setShowForm(false); loadData();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleAutoGenerate = async () => {
    // Basitleştirilmiş otomatik oluşturma
    const { data: allBranches } = await supabase.from('branches').select('id, sube_adi, adres, sehir, customer_id, customers!inner(kisa_isim)').order('sube_adi');
    if (!allBranches) return;
    const existing = assessments.map(a => a.branch_id);
    const needed = allBranches.filter((b: any) => !existing.includes(b.id));
    if (needed.length === 0) { toast.info('Raporlar zaten tam.'); return; }

    const inserts = needed.map((b: any) => ({
      customer_id: b.customer_id, branch_id: b.id,
      customer_name: `${b.customers.kisa_isim} - ${b.sube_adi}`,
      customer_address: `${b.adres}, ${b.sehir}`,
      division: 'FABRİKA GENELİ',
      assessment_date: format(new Date(), 'yyyy-MM-dd'),
      responsible_person: 'PestMentor Uzmanı',
      risk_data: generateLowRiskData(),
      status: 'active'
    }));
    await supabase.from('branch_environmental_risk_assessments').insert(inserts);
    toast.success(`${inserts.length} rapor oluşturuldu.`);
    loadData();
  };

  const handleExport = (item: EnvAssessment) => {
    generateEnvironmentalRiskAssessmentPdf({
      ...item,
      riskData: item.risk_data,
      companyLogo: companySettings?.logo_url
    });
  };

  const filtered = assessments.filter(a => a.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex gap-2"><Leaf className="text-green-600" /> Çevre Risk Analizi </h1>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2 text-sm" placeholder="Ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={handleAutoGenerate} className="bg-green-50 text-green-700 px-4 py-2 rounded flex gap-2 items-center"><RefreshCw size={16}/> Otomatik</button>
          <button onClick={() => { setForm(INITIAL_FORM); setEditingId(null); setShowForm(true); }} className="bg-green-600 text-white px-4 py-2 rounded flex gap-2 items-center"><Plus size={16}/> Yeni</button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between mb-4">
            <h2 className="font-bold text-lg">Form Düzenle</h2>
            <button onClick={() => setShowForm(false)}><X /></button>
          </div>
          
          {/* Üst Bilgiler */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <select className="border p-2 rounded" value={form.customer_id} onChange={e => {
               const c = customers.find(x => x.id === e.target.value);
               setForm(p => ({ ...p, customer_id: c.id, customer_name: c.kisa_isim, customer_address: c.adres + ' ' + c.sehir }));
            }}><option value="">Müşteri Seç</option>{customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}</select>
            
            <select className="border p-2 rounded" value={form.branch_id} onChange={e => {
               const b = branches.find(x => x.id === e.target.value);
               setForm(p => ({ ...p, branch_id: b.id }));
            }}><option value="">Şube Seç</option>{branches.filter(b => b.customer_id === form.customer_id).map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}</select>

            <input className="border p-2 rounded" placeholder="Bölüm" value={form.division} onChange={e => setForm({...form, division: e.target.value})} />
            <input className="border p-2 rounded" type="date" value={form.assessment_date} onChange={e => setForm({...form, assessment_date: e.target.value})} />
            <input className="border p-2 rounded" placeholder="Sorumlu" value={form.responsible_person} onChange={e => setForm({...form, responsible_person: e.target.value})} />
          </div>

          {/* Matris Tablosu */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Zararlı Türü</th>
                  <th className="p-2 w-20">Hijyen (1-3)</th>
                  <th className="p-2 w-20">Yalıtım (1-3)</th>
                  <th className="p-2 w-20">Depolama (1-3)</th>
                  <th className="p-2 w-20">Gözlem (1-3)</th>
                  <th className="p-2 w-20 bg-gray-200">Çevre Top.</th>
                  <th className="p-2 w-20 text-red-700">Pop. (1-3)</th>
                  <th className="p-2 w-24">SKOR</th>
                </tr>
              </thead>
              <tbody>
                {PEST_ENV_ROWS.map(row => {
                  const d = form.risk_data[row.key] || { hygiene: 0, insulation: 0, storage: 0, monitoring: 0, population: 0 };
                  const envTotal = d.hygiene + d.insulation + d.storage + d.monitoring;
                  const score = calculateEnvScore(d);
                  const style = getEnvRiskColor(score);

                  return (
                    <tr key={row.key} className="border-t hover:bg-gray-50">
                      <td className="p-2 font-medium">{row.label}</td>
                      {[ 'hygiene', 'insulation', 'storage', 'monitoring', 'population' ].map((field: any, idx) => (
                        <td key={field} className={`p-2 text-center ${idx===4 ? 'border-l-2 border-red-100' : ''}`}>
                          <select 
                            value={d[field]} 
                            onChange={e => handleValueChange(row.key, field, Number(e.target.value))}
                            className="w-full text-center p-1 border rounded"
                          >
                            {[0,1,2,3].map(v => <option key={v} value={v}>{v===0?'-':v}</option>)}
                          </select>
                        </td>
                      ))}
                      {/* Hesaplananlar (Read only) */}
                      <td className="p-2 text-center font-bold text-gray-500 bg-gray-50">{envTotal}</td>
                      <td className="p-2 text-center font-bold border-l-2" style={{ backgroundColor: style.bg, color: style.text }}>
                        {score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button onClick={handleSave} className="bg-green-600 text-white px-6 py-2 rounded font-medium hover:bg-green-700">Kaydet</button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3">Müşteri / Şube</th>
              <th className="text-left p-3">Tarih</th>
              <th className="text-right p-3">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <div className="font-medium">{item.customer_name}</div>
                  <div className="text-xs text-gray-500">{branches.find(b => b.id === item.branch_id)?.sube_adi}</div>
                </td>
                <td className="p-3">{item.assessment_date}</td>
                <td className="p-3 text-right flex justify-end gap-2">
                  <button onClick={() => handleExport(item)} className="p-1.5 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"><FileDown size={16}/></button>
                  <button onClick={() => { setEditingId(item.id); setForm(item); setShowForm(true); }} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"><Edit3 size={16}/></button>
                  <button onClick={async () => { if(confirm('Sil?')) { await supabase.from('branch_environmental_risk_assessments').delete().eq('id', item.id); loadData(); } }} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminEnvironmentalRiskAssessment;