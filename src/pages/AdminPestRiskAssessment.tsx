import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  Bug, Plus, Search, Edit3, Eye, Trash2, Loader2, Save, X,
  ChevronDown, ChevronUp, FileDown, RefreshCw,
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

const AdminPestRiskAssessment: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assessRes, custRes, branchRes] = await Promise.all([
        supabase.from('branch_pest_risk_assessments').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('id, kisa_isim, adres, sehir').eq('is_active', true).order('kisa_isim'),
        supabase.from('branches').select('id, sube_adi, adres, sehir, customer_id').order('sube_adi'),
      ]);
      setAssessments(assessRes.data || []);
      setCustomers(custRes.data || []);
      setBranches(branchRes.data || []);
    } catch {
      toast.error('Veri yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ ...INITIAL_FORM, pest_data: getEmptyPestData() });
    setEditingId(null);
    setExpandedCat(null);
  };

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

  const filteredBranches = branches.filter(b => b.customer_id === form.customer_id);

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

  const handleSave = async () => {
    if (!form.customer_id || !form.branch_id) {
      toast.error('Musteri ve sube seciniz');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customer_id: form.customer_id,
        branch_id: form.branch_id,
        customer_name: form.customer_name,
        customer_address: form.customer_address,
        division: form.division,
        assessment_date: form.assessment_date,
        responsible_person: form.responsible_person,
        customer_responsible: form.customer_responsible,
        document_number: form.document_number,
        revision_number: form.revision_number,
        revision_date: form.revision_date,
        pest_data: form.pest_data,
        status: form.status,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase.from('branch_pest_risk_assessments').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Degerlendirme guncellendi');
      } else {
        const { error } = await supabase.from('branch_pest_risk_assessments').insert(payload);
        if (error) throw error;
        toast.success('Degerlendirme olusturuldu');
      }

      resetForm();
      setShowForm(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Kaydetme hatasi');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Assessment) => {
    setForm({
      customer_id: item.customer_id,
      branch_id: item.branch_id,
      customer_name: item.customer_name,
      customer_address: item.customer_address,
      division: item.division,
      assessment_date: item.assessment_date,
      responsible_person: item.responsible_person,
      customer_responsible: item.customer_responsible,
      document_number: item.document_number,
      revision_number: item.revision_number,
      revision_date: item.revision_date,
      pest_data: item.pest_data || getEmptyPestData(),
      status: item.status,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu degerlendirmeyi silmek istediginize emin misiniz?')) return;
    try {
      const { error } = await supabase.from('branch_pest_risk_assessments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Silindi');
      loadData();
    } catch {
      toast.error('Silme hatasi');
    }
  };

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
    };
    generatePestRiskAssessmentPdf(input);
  };

  const filtered = assessments.filter(a =>
    a.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.division?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bug className="w-7 h-7 text-amber-600" />
            Zararli Risk Degerlendirme
          </h1>
          <p className="text-sm text-gray-500 mt-1">Sube bazli zararli risk degerlendirme formlari</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ara..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent w-48"
            />
          </div>
          <button onClick={loadData} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> Yeni Degerlendirme
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center justify-between">
            <h2 className="font-bold text-amber-900 flex items-center gap-2">
              <Edit3 size={18} />
              {editingId ? 'Degerlendirme Duzenle' : 'Yeni Risk Degerlendirmesi'}
            </h2>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1 hover:bg-amber-100 rounded-full">
              <X size={18} className="text-amber-600" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Musteri</label>
                <select
                  value={form.customer_id}
                  onChange={e => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Musteri Seciniz</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.kisa_isim}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sube</label>
                <select
                  value={form.branch_id}
                  onChange={e => setForm(prev => ({ ...prev, branch_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Sube Seciniz</option>
                  {filteredBranches.map(b => (
                    <option key={b.id} value={b.id}>{b.sube_adi}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bolum / Division</label>
                <input
                  type="text"
                  value={form.division}
                  onChange={e => setForm(prev => ({ ...prev, division: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Fabrika Geneli"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Degerlendirme Tarihi</label>
                <input
                  type="date"
                  value={form.assessment_date}
                  onChange={e => setForm(prev => ({ ...prev, assessment_date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sorumlu Kisi</label>
                <input
                  type="text"
                  value={form.responsible_person}
                  onChange={e => setForm(prev => ({ ...prev, responsible_person: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Musteri Sorumlusu</label>
                <input
                  type="text"
                  value={form.customer_responsible}
                  onChange={e => setForm(prev => ({ ...prev, customer_responsible: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dokuman No</label>
                <input
                  type="text"
                  value={form.document_number}
                  onChange={e => setForm(prev => ({ ...prev, document_number: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Revizyon No</label>
                <input
                  type="text"
                  value={form.revision_number}
                  onChange={e => setForm(prev => ({ ...prev, revision_number: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Revizyon Tarihi</label>
                <input
                  type="date"
                  value={form.revision_date}
                  onChange={e => setForm(prev => ({ ...prev, revision_date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Bug size={16} className="text-amber-600" />
                Zararli Populasyon ve Risk Verileri
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Her zararli icin Populasyon Durumu (1-5) ve Risk Derecesi (1-5) giriniz. Risk Skoru otomatik hesaplanir.
              </p>

              <div className="space-y-2">
                {PEST_CATEGORIES.map(cat => {
                  const isExpanded = expandedCat === cat.key;
                  const avg = getCategoryAverage(form.pest_data[cat.key]);
                  const avgScoreStyle = getRiskScoreColor(Math.round(avg.avgScore));

                  return (
                    <div key={cat.key} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedCat(isExpanded ? null : cat.key)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-800">{cat.label}</span>
                          <span className="text-xs text-gray-500">({cat.labelEn})</span>
                          <span className="text-xs text-gray-400">{cat.pests.length} zararli</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {avg.avgScore > 0 && (
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded"
                              style={{ backgroundColor: avgScoreStyle.bg, color: avgScoreStyle.text }}
                            >
                              Ort: {avg.avgScore.toFixed(1)}
                            </span>
                          )}
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="p-4">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                                <th className="text-left pb-2 font-medium">Zararli Turu</th>
                                <th className="text-center pb-2 font-medium w-24">Populasyon (1-5)</th>
                                <th className="text-center pb-2 font-medium w-24">Risk Der. (1-5)</th>
                                <th className="text-center pb-2 font-medium w-20">Risk Skoru</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {cat.pests.map(pest => {
                                const d = form.pest_data[cat.key]?.[pest.key] || { pop: 0, risk: 0 };
                                const score = getRiskScore(d.pop, d.risk);
                                const sColor = getRiskScoreColor(score);
                                return (
                                  <tr key={pest.key} className="hover:bg-gray-50">
                                    <td className="py-2">
                                      <span className="font-medium text-gray-800">{pest.label}</span>
                                      <span className="text-xs text-gray-400 ml-2">({pest.labelEn})</span>
                                    </td>
                                    <td className="py-2 text-center">
                                      <select
                                        value={d.pop}
                                        onChange={e => handlePestValueChange(cat.key, pest.key, 'pop', Number(e.target.value))}
                                        className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-2 focus:ring-amber-500"
                                      >
                                        {[0, 1, 2, 3, 4, 5].map(v => (
                                          <option key={v} value={v}>{v === 0 ? '-' : v}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-2 text-center">
                                      <select
                                        value={d.risk}
                                        onChange={e => handlePestValueChange(cat.key, pest.key, 'risk', Number(e.target.value))}
                                        className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-2 focus:ring-amber-500"
                                      >
                                        {[0, 1, 2, 3, 4, 5].map(v => (
                                          <option key={v} value={v}>{v === 0 ? '-' : v}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-2 text-center">
                                      {score > 0 ? (
                                        <span
                                          className="inline-block text-xs font-bold px-2.5 py-1 rounded-full"
                                          style={{ backgroundColor: sColor.bg, color: sColor.text }}
                                        >
                                          {score}
                                        </span>
                                      ) : (
                                        <span className="text-gray-300">-</span>
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Iptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 shadow-sm"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingId ? 'Guncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Musteri</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Sube</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bolum</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Islemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    Henuz degerlendirme bulunmuyor.
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const branch = branches.find(b => b.id === item.branch_id);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.customer_name}</td>
                      <td className="px-4 py-3 text-gray-700">{branch?.sube_adi || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{item.division || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{item.assessment_date}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          item.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : item.status === 'draft'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.status === 'active' ? 'Aktif' : item.status === 'draft' ? 'Taslak' : 'Arsiv'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleExportPdf(item)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="PDF Indir"
                          >
                            <FileDown size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Duzenle"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPestRiskAssessment;
