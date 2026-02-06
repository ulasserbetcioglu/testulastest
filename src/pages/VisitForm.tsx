import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { sendEmail, getRecipientEmails } from '../lib/emailClient';
import { toast } from 'sonner';
import { Loader2, Search, Check, ChevronDown, X } from 'lucide-react';

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
}

const visitTypes = [
  { id: 'ilk', label: 'İlk' },
  { id: 'ucretli', label: 'Ücretli' },
  { id: 'acil', label: 'Acil Çağrı' },
  { id: 'teknik', label: 'Teknik İnceleme' },
  { id: 'periyodik', label: 'Periyodik' },
  { id: 'isyeri', label: 'İşyeri' },
  { id: 'gozlem', label: 'Gözlem' },
  { id: 'son', label: 'Son' }
];

const pestTypes = [
  { id: 'kus', label: 'Kuş' },
  { id: 'hasere', label: 'Haşere' },
  { id: 'ari', label: 'Arı' },
  { id: 'kemirgen', label: 'Kemirgen' },
  { id: 'yumusakca', label: 'Yumuşakça' },
  { id: 'kedi_kopek', label: 'Kedi/Köpek' },
  { id: 'sinek', label: 'Sinek' },
  { id: 'surungen', label: 'Sürüngen' },
  { id: 'ambar', label: 'Ambar Zararlısı' }
];

const VisitForm: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasBranches, setHasBranches] = useState(true);
  const [sendEmailNotification, setSendEmailNotification] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [assignedCustomers, setAssignedCustomers] = useState<string[] | null>(null);
  const [assignedBranches, setAssignedBranches] = useState<string[] | null>(null);

  const [isOneTimeCustomer, setIsOneTimeCustomer] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualBranchName, setManualBranchName] = useState('');

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    branchId: '',
    visitDate: new Date().toISOString().split('T')[0],
    visitTime: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    visitType: '',
    pestTypes: [] as string[],
    notes: ''
  });

  const fetchCustomers = useCallback(async (isAdminFlag: boolean, assignedCustomerIds: string[] | null) => {
    try {
      let query = supabase.from('customers').select('id, kisa_isim').order('kisa_isim');
      if (!isAdminFlag && assignedCustomerIds && assignedCustomerIds.length > 0) {
        query = query.in('id', assignedCustomerIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const checkUserRoleAndFetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');

        const isAdminUser = user.email === 'admin@ilaclamatik.com';
        setIsAdmin(isAdminUser);

        const { data: operatorData, error: operatorError } = await supabase
          .from('operators')
          .select('id, assigned_customers, assigned_branches')
          .eq('auth_id', user.id)
          .single();

        if (operatorError && operatorError.code !== 'PGRST116') throw operatorError;

        if (operatorData) {
          setOperatorId(operatorData.id);
          setAssignedCustomers(operatorData.assigned_customers);
          setAssignedBranches(operatorData.assigned_branches);
          await fetchCustomers(isAdminUser, operatorData.assigned_customers);
        } else if (isAdminUser) {
          await fetchCustomers(isAdminUser, null);
        } else {
          throw new Error("Operatör bilgisi bulunamadı.");
        }
      } catch (err: any) {
        toast.error(err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    checkUserRoleAndFetchData();
  }, [fetchCustomers]);

  useEffect(() => {
    if (formData.customerId) {
      const fetchBranches = async (customerId: string) => {
        try {
          let query = supabase.from('branches').select('id, sube_adi').eq('customer_id', customerId).order('sube_adi');
          if (!isAdmin && assignedBranches && assignedBranches.length > 0) {
            query = query.in('id', assignedBranches);
          }
          const { data, error } = await query;
          if (error) throw error;
          setBranches(data || []);
          setHasBranches(data && data.length > 0);
          if (!data || data.length === 0) {
            setFormData(prev => ({ ...prev, branchId: '' }));
          }
        } catch (err: any) {
          setError(err.message);
        }
      };
      fetchBranches(formData.customerId);
    } else {
      setBranches([]);
      setHasBranches(true);
    }
  }, [formData.customerId, isAdmin, assignedBranches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId) {
      toast.error('Operatör bilgisi yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
      return;
    }

    let finalCustomerId = formData.customerId;
    let finalBranchId = formData.branchId;

    if (isOneTimeCustomer) {
      if (!manualCustomerName.trim()) {
        toast.error('Lütfen tek seferlik müşteri adını girin.');
        return;
      }

      const { data: newCustomerData, error: newCustomerError } = await supabase
        .from('customers')
        .insert({ kisa_isim: manualCustomerName.trim(), is_one_time: true })
        .select('id')
        .single();

      if (newCustomerError) throw newCustomerError;
      finalCustomerId = newCustomerData.id;

      if (manualBranchName.trim()) {
        const { data: newBranchData, error: newBranchError } = await supabase
          .from('branches')
          .insert({ sube_adi: manualBranchName.trim(), customer_id: finalCustomerId, is_one_time: true })
          .select('id')
          .single();

        if (newBranchError) throw newBranchError;
        finalBranchId = newBranchData.id;
      } else {
        finalBranchId = '';
      }
    } else {
      if (!formData.customerId) {
        toast.error('Lütfen bir müşteri seçin.');
        return;
      }
    }

    if (!formData.visitDate || !formData.visitTime) {
      toast.error('Tarih ve saat alanları zorunludur.');
      return;
    }

    setSaving(true);
    setError(null);
    let isSuccess = false;

    try {
      const visitDateTime = new Date(`${formData.visitDate}T${formData.visitTime}:00`).toISOString();

      const { data, error } = await supabase
        .from('visits')
        .insert([{
          customer_id: finalCustomerId,
          branch_id: finalBranchId || null,
          operator_id: operatorId,
          visit_date: visitDateTime,
          visit_type: formData.visitType,
          pest_types: formData.pestTypes,
          notes: formData.notes,
          status: 'planned'
        }])
        .select('id');

      if (error) throw error;

      if (sendEmailNotification && data && data.length > 0) {
        try {
          const recipientEmails = await getRecipientEmails(finalCustomerId, finalBranchId);
          if (recipientEmails.length > 0) {
            const selectedCustomer = customers.find(c => c.id === finalCustomerId);
            const customerName = isOneTimeCustomer ? manualCustomerName : (selectedCustomer?.kisa_isim || '');
            const selectedBranch = branches.find(b => b.id === finalBranchId);
            const branchName = isOneTimeCustomer ? manualBranchName : (selectedBranch?.sube_adi || '');
            const visitDate = formData.visitDate ? new Date(formData.visitDate).toLocaleDateString('tr-TR') : '';
            const subject = `Ziyaret Planlandı - ${customerName} ${branchName} - ${visitDate}`;
            const html = `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2 style="color:#2563eb;border-bottom:2px solid #2563eb;padding-bottom:10px;">Ziyaret Planlandı</h2>
                <p><strong>Müşteri:</strong> ${customerName}</p>
                ${branchName ? `<p><strong>Şube:</strong> ${branchName}</p>` : ''}
                <p><strong>Tarih:</strong> ${visitDate}</p>
                <p><strong>Saat:</strong> ${formData.visitTime || ''}</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
                <p style="color:#6b7280;font-size:12px;">Bu e-posta İlaçlamatik sistemi tarafından otomatik olarak gönderilmiştir.</p>
              </div>
            `;
            for (const email of recipientEmails) {
              await sendEmail(email, subject, html);
            }
            toast.success('Ziyaret planlandı ve bildirim e-postası gönderildi.');
          }
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          toast.error('Ziyaret oluşturuldu ancak e-posta gönderimi başarısız oldu.');
        }
      } else {
        toast.success('Yeni ziyaret başarıyla oluşturuldu!');
      }

      isSuccess = true;
    } catch (err: any) {
      setError(err.message);
      toast.error(`Hata: ${err.message}`);
      isSuccess = false;
    } finally {
      setSaving(false);
      if (isSuccess) {
        navigate('/operator/ziyaretler');
      }
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.kisa_isim.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomerName = customers.find(c => c.id === formData.customerId)?.kisa_isim || '';

  const selectCustomer = (id: string) => {
    setFormData(prev => ({ ...prev, customerId: id, branchId: '' }));
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline-block" /> Yükleniyor...</div>;

  const canSubmit = operatorId && (isOneTimeCustomer ? manualCustomerName.trim() : formData.customerId);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Yeni Ziyaret Planla</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
        )}

        {/* Tek Seferlik Musteri */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isOneTimeCustomer}
            onChange={(e) => {
              setIsOneTimeCustomer(e.target.checked);
              setFormData(prev => ({ ...prev, customerId: '', branchId: '' }));
              setManualCustomerName('');
              setManualBranchName('');
            }}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">Tek Seferlik Müşteri</span>
        </label>

        {isOneTimeCustomer ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri Adı</label>
              <input
                type="text"
                value={manualCustomerName}
                onChange={(e) => setManualCustomerName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Tek seferlik müşteri adı"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şube Adı (Opsiyonel)</label>
              <input
                type="text"
                value={manualBranchName}
                onChange={(e) => setManualBranchName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Tek seferlik şube adı"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Searchable customer dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
              <div
                className={`flex items-center border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  showCustomerDropdown ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'
                }`}
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
              >
                <span className={`flex-1 text-sm ${formData.customerId ? 'text-gray-900' : 'text-gray-400'}`}>
                  {formData.customerId ? selectedCustomerName : 'Müşteri Seçiniz'}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showCustomerDropdown ? 'rotate-180' : ''}`} />
              </div>

              {showCustomerDropdown && (
                <div className="absolute z-20 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                  <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Müşteri ara..."
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    {filteredCustomers.length === 0 ? (
                      <div className="px-3 py-4 text-center text-sm text-gray-400">Sonuç bulunamadı</div>
                    ) : (
                      filteredCustomers.map(customer => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); selectCustomer(customer.id); }}
                          className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${
                            formData.customerId === customer.id
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span>{customer.kisa_isim}</span>
                          {formData.customerId === customer.id && <Check size={14} className="text-blue-600" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {formData.customerId && hasBranches && branches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şube</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                >
                  <option value="">Şube Seçiniz</option>
                  {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.sube_adi}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Tarih & Saat */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
            <input
              type="date"
              value={formData.visitDate}
              onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Saat</label>
            <input
              type="time"
              value={formData.visitTime}
              onChange={(e) => setFormData({ ...formData, visitTime: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
          </div>
        </div>

        {/* Ziyaret Turu */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ziyaret Türü</label>
          <div className="grid grid-cols-4 gap-1.5">
            {visitTypes.map(type => {
              const selected = formData.visitType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, visitType: type.id })}
                  className={`py-2 px-1 rounded-md text-xs font-medium transition-colors border text-center ${
                    selected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hedef Zarlilar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hedef Zararlılar</label>
          <div className="flex flex-wrap gap-1.5">
            {pestTypes.map(type => {
              const selected = formData.pestTypes.includes(type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    const newPestTypes = selected
                      ? formData.pestTypes.filter(t => t !== type.id)
                      : [...formData.pestTypes, type.id];
                    setFormData({ ...formData, pestTypes: newPestTypes });
                  }}
                  className={`py-1.5 px-2.5 rounded-md text-xs font-medium transition-colors border ${
                    selected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notlar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notlar <span className="text-gray-400 font-normal text-xs">(Sadece Operatör Görür)</span></label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            placeholder="Notlar..."
          />
        </div>

        {/* E-posta */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sendEmailNotification}
            onChange={(e) => setSendEmailNotification(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">Müşteriye e-posta bildirimi gönder</span>
        </label>

        {/* Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate('/operator/ziyaretler')}
            className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="w-full sm:w-auto px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Kaydediliyor...</> : 'Ziyareti Planla'}
          </button>
        </div>
      </form>

      {showCustomerDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setShowCustomerDropdown(false)} />
      )}
    </div>
  );
};

export default VisitForm;
