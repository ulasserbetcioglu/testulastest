import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  Bug, Plus, Search, Edit3, Eye, Trash2, Loader2, Save, X,
  RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CalendarDays, Check
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DEFAULT_PEST_ROWS,
  LEVEL_LABELS,
  LEVEL_COLORS,
  type PestActivityReport,
  type PestRow,
  type PestLimitRow,
} from '../components/PestActivity/PestActivityData';
import PestActivityPreview from '../components/PestActivity/PestActivityPreview';

interface CustomerOption { id: string; kisa_isim: string; adres: string; sehir: string; }
interface BranchOption { id: string; sube_adi: string; adres: string; sehir: string; customer_id: string; }

const INITIAL_FORM = {
  customer_id: '',
  branch_id: '' as string | null,
  customer_name: '',
  responsible_company: '',
  document_number: '',
  revision_number: 0,
  revision_date: format(new Date(), 'yyyy-MM-dd'),
  pest_rows: [...DEFAULT_PEST_ROWS] as PestRow[],
  status: 'active',
};

const AdminPestActivityLimits: React.FC = () => {
  const [reports, setReports] = useState<PestActivityReport[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [previewReport, setPreviewReport] = useState<PestActivityReport | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [expandedPest, setExpandedPest] = useState<number | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsRes, customersRes, branchesRes, settingsRes] = await Promise.all([
        supabase.from('pest_activity_limits').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('id, kisa_isim, adres, sehir').eq('is_active', true).order('kisa_isim'),
        supabase.from('branches').select('id, sube_adi, adres, sehir, customer_id').order('sube_adi'),
        supabase.from('company_settings').select('*').maybeSingle(),
      ]);
      setReports(reportsRes.data || []);
      setCustomers(customersRes.data || []);
      setBranches(branchesRes.data || []);
      setCompanySettings(settingsRes.data);
    } catch {
      toast.error('Veri yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ ...INITIAL_FORM, pest_rows: DEFAULT_PEST_ROWS.map(r => ({ ...r, limits: [...r.limits] })) });
    setEditingId(null);
    setExpandedPest(null);
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setForm(prev => ({
      ...prev,
      customer_id: customerId,
      branch_id: null,
      customer_name: customer?.kisa_isim || '',
      responsible_company: companySettings?.company_name || '',
    }));
  };

  const handleBranchChange = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    const customer = customers.find(c => c.id === form.customer_id);
    setForm(prev => ({
      ...prev,
      branch_id: branchId || null,
      customer_name: branchId && branch
        ? `${customer?.kisa_isim || ''} - ${branch.sube_adi}`
        : customer?.kisa_isim || '',
    }));
  };

  const handleSave = async () => {
    if (!form.customer_id) { toast.error('Musteri seciniz'); return; }
    setSaving(true);
    try {
      const payload = {
        customer_id: form.customer_id,
        branch_id: form.branch_id || null,
        customer_name: form.customer_name,
        responsible_company: form.responsible_company,
        document_number: form.document_number,
        revision_number: form.revision_number,
        revision_date: form.revision_date || null,
        pest_rows: form.pest_rows,
        status: form.status,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase.from('pest_activity_limits').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Guncellendi');
      } else {
        const { error } = await supabase.from('pest_activity_limits').insert(payload);
        if (error) throw error;
        toast.success('Olusturuldu');
      }
      resetForm();
      setShowForm(false);
      loadData();
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (report: PestActivityReport) => {
    setForm({
      customer_id: report.customer_id,
      branch_id: report.branch_id,
      customer_name: report.customer_name,
      responsible_company: report.responsible_company,
      document_number: report.document_number,
      revision_number: report.revision_number,
      revision_date: report.revision_date || format(new Date(), 'yyyy-MM-dd'),
      pest_rows: report.pest_rows || [...DEFAULT_PEST_ROWS],
      status: report.status,
    });
    setEditingId(report.id);
    setShowForm(true);
    setExpandedPest(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu raporu silmek istediginize emin misiniz?')) return;
    try {
      const { error } = await supabase.from('pest_activity_limits').delete().eq('id', id);
      if (error) throw error;
      toast.success('Silindi');
      loadData();
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    }
  };

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      const { data: allBranches } = await supabase
        .from('branches')
        .select('id, sube_adi, adres, sehir, customer_id, customers!inner(kisa_isim, adres, sehir)')
        .order('sube_adi');
      if (!allBranches || allBranches.length === 0) { toast.info('Sube bulunamadi'); return; }

      const existingBranchIds = reports.filter(r => r.branch_id).map(r => r.branch_id);
      const newBranches = allBranches.filter(b => !existingBranchIds.includes(b.id));

      if (newBranches.length === 0) {
        toast.info('Tum subeler icin rapor zaten mevcut');
        setGenerating(false);
        return;
      }

      const inserts = newBranches.map((b: any) => ({
        customer_id: b.customer_id,
        branch_id: b.id,
        customer_name: `${(b.customers as any)?.kisa_isim || ''} - ${b.sube_adi}`,
        responsible_company: companySettings?.company_name || '',
        document_number: '',
        revision_number: 0,
        revision_date: format(new Date(), 'yyyy-MM-dd'),
        pest_rows: DEFAULT_PEST_ROWS,
        status: 'active',
      }));

      const { error } = await supabase.from('pest_activity_limits').insert(inserts);
      if (error) throw error;
      toast.success(`${inserts.length} yeni rapor olusturuldu`);
      loadData();
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const updatePestRow = (idx: number, field: keyof PestRow, value: any) => {
    setForm(prev => {
      const rows = [...prev.pest_rows];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...prev, pest_rows: rows };
    });
  };

  const updateLimit = (pestIdx: number, limitIdx: number, field: keyof PestLimitRow, value: any) => {
    setForm(prev => {
      const rows = [...prev.pest_rows];
      const limits = [...rows[pestIdx].limits];
      limits[limitIdx] = { ...limits[limitIdx], [field]: value };
      rows[pestIdx] = { ...rows[pestIdx], limits };
      return { ...prev, pest_rows: rows };
    });
  };

  const addLimit = (pestIdx: number) => {
    setForm(prev => {
      const rows = [...prev.pest_rows];
      const limits = [...rows[pestIdx].limits, { description: '', level: 'kabul' as const }];
      rows[pestIdx] = { ...rows[pestIdx], limits };
      return { ...prev, pest_rows: rows };
    });
  };

  const removeLimit = (pestIdx: number, limitIdx: number) => {
    setForm(prev => {
      const rows = [...prev.pest_rows];
      const limits = rows[pestIdx].limits.filter((_, i) => i !== limitIdx);
      rows[pestIdx] = { ...rows[pestIdx], limits };
      return { ...prev, pest_rows: rows };
    });
  };

  const addPestRow = () => {
    setForm(prev => ({
      ...prev,
      pest_rows: [...prev.pest_rows, {
        pest_name: '',
        responsible: prev.responsible_company || '',
        limits: [{ description: '', level: 'kabul' as const }],
        action_text: '',
      }],
    }));
    setExpandedPest(form.pest_rows.length);
  };

  const removePestRow = (idx: number) => {
    setForm(prev => ({
      ...prev,
      pest_rows: prev.pest_rows.filter((_, i) => i !== idx),
    }));
    setExpandedPest(null);
  };

  const handleDateSave = async (id: string) => {
    try {
      const { error } = await supabase.from('pest_activity_limits').update({
        revision_date: editingDateValue || null,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
      toast.success('Tarih guncellendi');
      setEditingDateId(null);
      loadData();
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    }
  };

  const filteredReports = reports.filter(r =>
    r.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customerBranches = form.customer_id
    ? branches.filter(b => b.customer_id === form.customer_id)
    : [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-green-600" size={32} />
    </div>
  );

  if (previewReport) return (
    <div className="max-w-5xl mx-auto p-4">
      <button onClick={() => setPreviewReport(null)} className="mb-4 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
        <X size={16} /> Listeye Don
      </button>
      <PestActivityPreview report={previewReport} companySettings={companySettings} />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="text-amber-600" /> Zararli Aktivitesi Kritik Limitleri
          </h1>
          <p className="text-sm text-gray-500 mt-1">{reports.length} kayit</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAutoGenerate} disabled={generating} className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 disabled:opacity-50">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Otomatik Olustur
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            <Plus size={16} /> Yeni Ekle
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Musteri / sube ara..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {editingId ? 'Raporu Duzenle' : 'Yeni Rapor Olustur'}
            </h2>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Musteri</label>
              <select value={form.customer_id} onChange={e => handleCustomerChange(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                <option value="">Musteri Seciniz</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sube (Opsiyonel)</label>
              <select value={form.branch_id || ''} onChange={e => handleBranchChange(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={!form.customer_id}>
                <option value="">Musteri Geneli</option>
                {customerBranches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sorumlu Firma</label>
              <input type="text" value={form.responsible_company} onChange={e => setForm(p => ({ ...p, responsible_company: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dokuman No</label>
              <input type="text" value={form.document_number} onChange={e => setForm(p => ({ ...p, document_number: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Revizyon No</label>
              <input type="number" value={form.revision_number} onChange={e => setForm(p => ({ ...p, revision_number: parseInt(e.target.value) || 0 }))} className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dokuman Tarihi</label>
              <input type="date" value={form.revision_date} onChange={e => setForm(p => ({ ...p, revision_date: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Durum</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full p-2 border rounded-lg text-sm">
                <option value="active">Aktif</option>
                <option value="draft">Taslak</option>
                <option value="archived">Arsiv</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Zararli Turleri & Kritik Limitler</h3>
              <button onClick={addPestRow} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium">
                <Plus size={14} /> Zararli Ekle
              </button>
            </div>

            <div className="space-y-2">
              {form.pest_rows.map((pest, pIdx) => (
                <div key={pIdx} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setExpandedPest(expandedPest === pIdx ? null : pIdx)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">{pIdx + 1}</span>
                      <span className="font-medium text-sm text-gray-800">{pest.pest_name || '(Isimsiz)'}</span>
                      <span className="text-xs text-gray-400">{pest.limits.length} limit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); removePestRow(pIdx); }} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={14} />
                      </button>
                      {expandedPest === pIdx ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {expandedPest === pIdx && (
                    <div className="p-4 space-y-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Zararli Adi</label>
                          <input type="text" value={pest.pest_name} onChange={e => updatePestRow(pIdx, 'pest_name', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Sorumlu</label>
                          <input type="text" value={pest.responsible} onChange={e => updatePestRow(pIdx, 'responsible', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-medium text-gray-600">Aktivite Kritik Limitleri</label>
                          <button onClick={() => addLimit(pIdx)} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                            <Plus size={12} /> Limit Ekle
                          </button>
                        </div>
                        <div className="space-y-2">
                          {pest.limits.map((limit, lIdx) => (
                            <div key={lIdx} className="flex gap-2 items-start">
                              <select
                                value={limit.level}
                                onChange={e => updateLimit(pIdx, lIdx, 'level', e.target.value)}
                                className={`shrink-0 w-32 p-2 border rounded-lg text-xs font-medium ${LEVEL_COLORS[limit.level]?.bg || ''} ${LEVEL_COLORS[limit.level]?.text || ''} ${LEVEL_COLORS[limit.level]?.border || ''}`}
                              >
                                <option value="kabul">KABUL EDILEBILIR</option>
                                <option value="aktivite">AKTIVITE</option>
                                <option value="istila">ISTILA</option>
                              </select>
                              <input
                                type="text"
                                value={limit.description}
                                onChange={e => updateLimit(pIdx, lIdx, 'description', e.target.value)}
                                className="flex-1 p-2 border rounded-lg text-sm"
                                placeholder="Limit aciklamasi..."
                              />
                              <button onClick={() => removeLimit(pIdx, lIdx)} className="shrink-0 text-red-400 hover:text-red-600 p-2">
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Aktivite Limitlerine Gore Alinacak Aksiyon</label>
                        <textarea
                          value={pest.action_text}
                          onChange={e => updatePestRow(pIdx, 'action_text', e.target.value)}
                          rows={4}
                          className="w-full p-2 border rounded-lg text-sm"
                          placeholder="KABUL EDILEBILIR: ... AKTIVITE: ... ISTILA: ..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
              Iptal
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {editingId ? 'Guncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Musteri / Sube</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sorumlu Firma</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Tarih</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Zararli</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Durum</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Islemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReports.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Kayit bulunamadi</td></tr>
              ) : filteredReports.map(report => (
                <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{report.customer_name}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{report.responsible_company || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {editingDateId === report.id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <input
                          type="date"
                          value={editingDateValue}
                          onChange={e => setEditingDateValue(e.target.value)}
                          className="p-1 border rounded text-xs w-32"
                          autoFocus
                        />
                        <button onClick={() => handleDateSave(report.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Kaydet">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingDateId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Iptal">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingDateId(report.id);
                          setEditingDateValue(report.revision_date || format(new Date(report.created_at), 'yyyy-MM-dd'));
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Tarihi degistir"
                      >
                        <CalendarDays size={13} className="text-gray-400" />
                        {report.revision_date
                          ? format(new Date(report.revision_date), 'dd.MM.yyyy')
                          : format(new Date(report.created_at), 'dd.MM.yyyy')}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      {(report.pest_rows || []).length}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.status === 'active' ? 'bg-green-50 text-green-700' :
                      report.status === 'draft' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {report.status === 'active' ? 'Aktif' : report.status === 'draft' ? 'Taslak' : 'Arsiv'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setPreviewReport(report)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Onizle">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => handleEdit(report)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="Duzenle">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(report.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Sil">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPestActivityLimits;
