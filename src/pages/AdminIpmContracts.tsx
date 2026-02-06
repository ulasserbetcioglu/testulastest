import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  Bug, Shield, Plus, Search, Edit3, Eye, Trash2, Loader2, Building,
  CheckCircle2, XCircle, Save, X, ChevronDown, ChevronUp, RefreshCw,
  FileText, Calendar, User, Phone, Mail, MapPin, Hash
} from 'lucide-react';
import IpmContractPreview from '../components/Ipm/IpmContractPreview';
import {
  DEFAULT_TARGET_PESTS,
  PEST_CATEGORY_LABELS,
  DEFAULT_SCOPE_AREAS,
  type IpmContract,
} from '../components/Ipm/IpmContractData';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

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

const ALL_SCOPE_AREAS = [
  'Isletme Geneli', 'Idari Ofisler', 'Uretim Alani', 'Depo Alanlari',
  'Dis Alan', 'Ic Alan', 'Mutfak & Yemekhane', 'Sosyal Alanlar', 'Otopark', 'Bahce & Peyzaj'
];

const AdminIpmContracts: React.FC = () => {
  const [contracts, setContracts] = useState<IpmContract[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [previewContract, setPreviewContract] = useState<IpmContract | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({
    customer_id: '',
    branch_id: '' as string | null,
    customer_name: '',
    customer_address: '',
    customer_city: '',
    responsible_person: '',
    contract_firm_name: 'SISTEM ILACLAMA SAN. VE TIC. LTD. STI.',
    contract_firm_phone: '444 7 320',
    contract_firm_email: 'info@sistemilaclama.com',
    contract_firm_contact: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    revision_number: 0,
    routine_frequency: 'ayda 4 kez',
    target_pests: { ...DEFAULT_TARGET_PESTS },
    scope_areas: ['Isletme Geneli'] as string[],
    custom_notes: '',
    status: 'active',
  });

  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contractsRes, customersRes, branchesRes, settingsRes] = await Promise.all([
        supabase.from('ipm_contracts').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('id, kisa_isim, adres, sehir').eq('is_active', true).order('kisa_isim'),
        supabase.from('branches').select('id, sube_adi, adres, sehir, customer_id').order('sube_adi'),
        supabase.from('company_settings').select('*').maybeSingle(),
      ]);
      setContracts(contractsRes.data || []);
      setCustomers(customersRes.data || []);
      setBranches(branchesRes.data || []);
      setCompanySettings(settingsRes.data);
    } catch (err) {
      toast.error('Veri yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setForm(prev => ({
      ...prev,
      customer_id: customerId,
      branch_id: null,
      customer_name: customer?.kisa_isim || '',
      customer_address: customer?.adres || '',
      customer_city: customer?.sehir || '',
    }));
  };

  const handleBranchChange = (branchId: string) => {
    if (!branchId) {
      const customer = customers.find(c => c.id === form.customer_id);
      setForm(prev => ({
        ...prev,
        branch_id: null,
        customer_name: customer?.kisa_isim || '',
        customer_address: customer?.adres || '',
        customer_city: customer?.sehir || '',
      }));
      return;
    }
    const branch = branches.find(b => b.id === branchId);
    const customer = customers.find(c => c.id === form.customer_id);
    setForm(prev => ({
      ...prev,
      branch_id: branchId,
      customer_name: `${customer?.kisa_isim || ''} - ${branch?.sube_adi || ''}`,
      customer_address: branch?.adres || customer?.adres || '',
      customer_city: branch?.sehir || customer?.sehir || '',
    }));
  };

  const togglePest = (key: string) => {
    setForm(prev => ({
      ...prev,
      target_pests: { ...prev.target_pests, [key]: !prev.target_pests[key] },
    }));
  };

  const toggleScope = (area: string) => {
    setForm(prev => ({
      ...prev,
      scope_areas: prev.scope_areas.includes(area)
        ? prev.scope_areas.filter(a => a !== area)
        : [...prev.scope_areas, area],
    }));
  };

  const resetForm = () => {
    setForm({
      customer_id: '',
      branch_id: null,
      customer_name: '',
      customer_address: '',
      customer_city: '',
      responsible_person: '',
      contract_firm_name: 'SISTEM ILACLAMA SAN. VE TIC. LTD. STI.',
      contract_firm_phone: '444 7 320',
      contract_firm_email: 'info@sistemilaclama.com',
      contract_firm_contact: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      revision_number: 0,
      routine_frequency: 'ayda 4 kez',
      target_pests: { ...DEFAULT_TARGET_PESTS },
      scope_areas: ['Isletme Geneli'],
      custom_notes: '',
      status: 'active',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (contract: IpmContract) => {
    setForm({
      customer_id: contract.customer_id,
      branch_id: contract.branch_id,
      customer_name: contract.customer_name,
      customer_address: contract.customer_address,
      customer_city: contract.customer_city,
      responsible_person: contract.responsible_person,
      contract_firm_name: contract.contract_firm_name,
      contract_firm_phone: contract.contract_firm_phone,
      contract_firm_email: contract.contract_firm_email,
      contract_firm_contact: contract.contract_firm_contact,
      start_date: contract.start_date,
      revision_number: contract.revision_number,
      routine_frequency: contract.routine_frequency,
      target_pests: contract.target_pests || { ...DEFAULT_TARGET_PESTS },
      scope_areas: contract.scope_areas || ['Isletme Geneli'],
      custom_notes: contract.custom_notes,
      status: contract.status,
    });
    setEditingId(contract.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customer_id) { toast.error('Musteri secin'); return; }
    setSaving(true);
    try {
      const payload = {
        customer_id: form.customer_id,
        branch_id: form.branch_id || null,
        customer_name: form.customer_name,
        customer_address: form.customer_address,
        customer_city: form.customer_city,
        responsible_person: form.responsible_person,
        contract_firm_name: form.contract_firm_name,
        contract_firm_phone: form.contract_firm_phone,
        contract_firm_email: form.contract_firm_email,
        contract_firm_contact: form.contract_firm_contact,
        start_date: form.start_date,
        revision_number: form.revision_number,
        routine_frequency: form.routine_frequency,
        target_pests: form.target_pests,
        scope_areas: form.scope_areas,
        custom_notes: form.custom_notes,
        status: form.status,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase.from('ipm_contracts').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('IPM sozlesmesi guncellendi');
      } else {
        const { error } = await supabase.from('ipm_contracts').insert(payload);
        if (error) throw error;
        toast.success('IPM sozlesmesi olusturuldu');
      }
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu IPM sozlesmesini silmek istediginize emin misiniz?')) return;
    try {
      const { error } = await supabase.from('ipm_contracts').delete().eq('id', id);
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
      const { data: allBranches } = await supabase.from('branches').select('id, sube_adi, adres, sehir, customer_id, customers!inner(kisa_isim, adres, sehir)').order('sube_adi');
      if (!allBranches || allBranches.length === 0) { toast.info('Sube bulunamadi'); return; }

      const existingBranchIds = contracts.filter(c => c.branch_id).map(c => c.branch_id);
      const newBranches = allBranches.filter(b => !existingBranchIds.includes(b.id));

      if (newBranches.length === 0) { toast.info('Tum subeler icin IPM sozlesmesi zaten mevcut'); setGenerating(false); return; }

      const inserts = newBranches.map((b: any) => ({
        customer_id: b.customer_id,
        branch_id: b.id,
        customer_name: `${(b.customers as any)?.kisa_isim || ''} - ${b.sube_adi}`,
        customer_address: b.adres || (b.customers as any)?.adres || '',
        customer_city: b.sehir || (b.customers as any)?.sehir || '',
        responsible_person: '',
        contract_firm_name: companySettings?.company_name || 'SISTEM ILACLAMA SAN. VE TIC. LTD. STI.',
        contract_firm_phone: companySettings?.phone || '444 7 320',
        contract_firm_email: companySettings?.email || 'info@sistemilaclama.com',
        contract_firm_contact: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        routine_frequency: 'ayda 4 kez',
        target_pests: { ...DEFAULT_TARGET_PESTS },
        scope_areas: ['Isletme Geneli'],
        status: 'active',
      }));

      const { error } = await supabase.from('ipm_contracts').insert(inserts);
      if (error) throw error;
      toast.success(`${inserts.length} yeni IPM sozlesmesi olusturuldu`);
      loadData();
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const filteredContracts = contracts.filter(c =>
    c.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customerBranches = form.customer_id
    ? branches.filter(b => b.customer_id === form.customer_id)
    : [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-green-600" size={32} />
    </div>
  );

  if (previewContract) return (
    <div className="max-w-4xl mx-auto p-4">
      <button onClick={() => setPreviewContract(null)} className="mb-4 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
        <X size={16}/> Listeye Don
      </button>
      <IpmContractPreview contract={previewContract} companySettings={companySettings} />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Bug className="text-green-600"/> IPM Sozlesmeleri
          </h1>
          <p className="text-sm text-gray-500 mt-1">{contracts.length} kayit</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAutoGenerate} disabled={generating} className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 disabled:opacity-50">
            {generating ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>} Otomatik Olustur
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            <Plus size={16}/> Yeni Ekle
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400"/>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Musteri / sube ara..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"/>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">{editingId ? 'IPM Sozlesmesi Duzenle' : 'Yeni IPM Sozlesmesi'}</h2>
            <button onClick={resetForm}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Musteri *</label>
              <select value={form.customer_id} onChange={e => handleCustomerChange(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                <option value="">Musteri secin...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sube (Opsiyonel)</label>
              <select value={form.branch_id || ''} onChange={e => handleBranchChange(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={!form.customer_id}>
                <option value="">Musteri geneli</option>
                {customerBranches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Isletme Adi</label>
              <input type="text" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} className="w-full p-2 border rounded-lg text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Adres</label>
              <input type="text" value={form.customer_address} onChange={e => setForm(p => ({ ...p, customer_address: e.target.value }))} className="w-full p-2 border rounded-lg text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sehir</label>
              <input type="text" value={form.customer_city} onChange={e => setForm(p => ({ ...p, customer_city: e.target.value }))} className="w-full p-2 border rounded-lg text-sm"/>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">IPM Sorumlusu</label>
              <input type="text" value={form.responsible_person} onChange={e => setForm(p => ({ ...p, responsible_person: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" placeholder="Adi Soyadi"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Baslangic Tarihi</label>
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="w-full p-2 border rounded-lg text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Rutin Periyot</label>
              <input type="text" value={form.routine_frequency} onChange={e => setForm(p => ({ ...p, routine_frequency: e.target.value }))} className="w-full p-2 border rounded-lg text-sm"/>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sozlesmeli Firma</label>
              <input type="text" value={form.contract_firm_name} onChange={e => setForm(p => ({ ...p, contract_firm_name: e.target.value }))} className="w-full p-2 border rounded-lg text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Telefon</label>
              <input type="text" value={form.contract_firm_phone} onChange={e => setForm(p => ({ ...p, contract_firm_phone: e.target.value }))} className="w-full p-2 border rounded-lg text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">E-posta</label>
              <input type="text" value={form.contract_firm_email} onChange={e => setForm(p => ({ ...p, contract_firm_email: e.target.value }))} className="w-full p-2 border rounded-lg text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Yetkili Kisi</label>
              <input type="text" value={form.contract_firm_contact} onChange={e => setForm(p => ({ ...p, contract_firm_contact: e.target.value }))} className="w-full p-2 border rounded-lg text-sm"/>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Hedef Zararlilar</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PEST_CATEGORY_LABELS).map(([key, label]) => (
                <button key={key} onClick={() => togglePest(key)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                  form.target_pests[key]
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-white text-gray-400 border-gray-200'
                }`}>
                  {form.target_pests[key] ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Uygulama Kapsami</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SCOPE_AREAS.map(area => (
                <button key={area} onClick={() => toggleScope(area)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                  form.scope_areas.includes(area)
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-400 border-gray-200'
                }`}>
                  {form.scope_areas.includes(area) && <CheckCircle2 size={12}/>}
                  {area}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ek Notlar</label>
            <textarea value={form.custom_notes} onChange={e => setForm(p => ({ ...p, custom_notes: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" rows={3} placeholder="Varsa ek notlar..."/>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Iptal</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
              {editingId ? 'Guncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3 font-semibold text-gray-600">Musteri / Sube</th>
                <th className="text-left p-3 font-semibold text-gray-600">Sorumlu</th>
                <th className="text-left p-3 font-semibold text-gray-600">Baslangic</th>
                <th className="text-center p-3 font-semibold text-gray-600">Durum</th>
                <th className="text-right p-3 font-semibold text-gray-600">Islemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Henuz IPM sozlesmesi bulunamadi</td></tr>
              ) : filteredContracts.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-3">
                    <div className="font-medium text-gray-800">{c.customer_name}</div>
                    <div className="text-xs text-gray-400">{c.customer_city}</div>
                  </td>
                  <td className="p-3 text-gray-600">{c.responsible_person || '-'}</td>
                  <td className="p-3 text-gray-600">
                    {c.start_date ? format(new Date(c.start_date), 'dd.MM.yyyy') : '-'}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.status === 'active' ? 'bg-green-100 text-green-700' :
                      c.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {c.status === 'active' ? 'Aktif' : c.status === 'draft' ? 'Taslak' : 'Arsiv'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setPreviewContract(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Onizle">
                        <Eye size={16}/>
                      </button>
                      <button onClick={() => handleEdit(c)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Duzenle">
                        <Edit3 size={16}/>
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Sil">
                        <Trash2 size={16}/>
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

export default AdminIpmContracts;
