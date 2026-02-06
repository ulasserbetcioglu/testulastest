import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { sendEmail, getRecipientEmails } from '../lib/emailClient';
import { toast } from 'sonner';
import {
  Loader2,
  CalendarPlus,
  User,
  Building2,
  Calendar,
  Clock,
  ClipboardList,
  Bug,
  FileText,
  Mail,
  ArrowLeft,
  Check,
  Search,
  X,
  ChevronDown
} from 'lucide-react';

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
  { id: 'ilk', label: 'Ilk' },
  { id: 'ucretli', label: 'Ucretli' },
  { id: 'acil', label: 'Acil Cagri' },
  { id: 'teknik', label: 'Teknik Inceleme' },
  { id: 'periyodik', label: 'Periyodik' },
  { id: 'isyeri', label: 'Isyeri' },
  { id: 'gozlem', label: 'Gozlem' },
  { id: 'son', label: 'Son' }
];

const pestTypes = [
  { id: 'kus', label: 'Kus' },
  { id: 'hasere', label: 'Hasere' },
  { id: 'ari', label: 'Ari' },
  { id: 'kemirgen', label: 'Kemirgen' },
  { id: 'yumusakca', label: 'Yumusakca' },
  { id: 'kedi_kopek', label: 'Kedi/Kopek' },
  { id: 'sinek', label: 'Sinek' },
  { id: 'surungen', label: 'Surungen' },
  { id: 'ambar', label: 'Ambar Zararlisi' }
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
        if (!user) throw new Error('Kullanici oturumu bulunamadi. Lutfen tekrar giris yapin.');

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
          throw new Error("Operator bilgisi bulunamadi.");
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
      toast.error('Operator bilgisi yuklenemedi. Sayfayi yenileyip tekrar deneyin.');
      return;
    }

    let finalCustomerId = formData.customerId;
    let finalBranchId = formData.branchId;

    if (isOneTimeCustomer) {
      if (!manualCustomerName.trim()) {
        toast.error('Lutfen tek seferlik musteri adini girin.');
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
        toast.error('Lutfen bir musteri secin.');
        return;
      }
    }

    if (!formData.visitDate || !formData.visitTime) {
      toast.error('Tarih ve saat alanlari zorunludur.');
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
            const subject = `Ziyaret Planlandi - ${customerName} ${branchName} - ${visitDate}`;
            const html = `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2 style="color:#2563eb;border-bottom:2px solid #2563eb;padding-bottom:10px;">Ziyaret Planlandi</h2>
                <p><strong>Musteri:</strong> ${customerName}</p>
                ${branchName ? `<p><strong>Sube:</strong> ${branchName}</p>` : ''}
                <p><strong>Tarih:</strong> ${visitDate}</p>
                <p><strong>Saat:</strong> ${formData.visitTime || ''}</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
                <p style="color:#6b7280;font-size:12px;">Bu e-posta Ilaclamatik sistemi tarafindan otomatik olarak gonderilmistir.</p>
              </div>
            `;
            for (const email of recipientEmails) {
              await sendEmail(email, subject, html);
            }
            toast.success('Ziyaret planlandi ve bildirim e-postasi gonderildi.');
          }
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          toast.error('Ziyaret olusturuldu ancak e-posta gonderimi basarisiz oldu.');
        }
      } else {
        toast.success('Yeni ziyaret basariyla olusturuldu!');
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
  const selectedBranchName = branches.find(b => b.id === formData.branchId)?.sube_adi || '';

  const selectCustomer = (id: string) => {
    setFormData(prev => ({ ...prev, customerId: id, branchId: '' }));
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-sm text-gray-500">Yukleniyor...</span>
        </div>
      </div>
    );
  }

  const canSubmit = operatorId && (isOneTimeCustomer ? manualCustomerName.trim() : formData.customerId);

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => navigate('/operator/ziyaretler')}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 -ml-1 p-1 rounded-lg active:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm hidden sm:inline">Geri</span>
          </button>
          <div className="flex items-center gap-2">
            <CalendarPlus size={20} className="text-emerald-600" />
            <h1 className="text-lg font-semibold text-gray-900">Yeni Ziyaret</h1>
          </div>
          <div className="w-10" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
            <X size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tek Seferlik Toggle */}
        <div
          className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-200 cursor-pointer active:bg-gray-50 transition-colors"
          onClick={() => {
            setIsOneTimeCustomer(!isOneTimeCustomer);
            setFormData(prev => ({ ...prev, customerId: '', branchId: '' }));
            setManualCustomerName('');
            setManualBranchName('');
          }}
        >
          <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 flex-shrink-0 ${isOneTimeCustomer ? 'bg-emerald-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${isOneTimeCustomer ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm font-medium text-gray-700">Tek Seferlik Musteri</span>
        </div>

        {/* Musteri & Sube */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <User size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">Musteri Bilgileri</span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {isOneTimeCustomer ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Musteri Adi</label>
                  <input
                    type="text"
                    value={manualCustomerName}
                    onChange={(e) => setManualCustomerName(e.target.value)}
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    placeholder="Musteri adini girin..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Sube Adi (Opsiyonel)</label>
                  <input
                    type="text"
                    value={manualBranchName}
                    onChange={(e) => setManualBranchName(e.target.value)}
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    placeholder="Sube adini girin..."
                  />
                </div>
              </>
            ) : (
              <>
                {/* Customer searchable dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Musteri</label>
                  <div
                    className={`flex items-center border rounded-xl px-3.5 py-3 cursor-pointer transition-all ${
                      showCustomerDropdown ? 'border-emerald-500 ring-2 ring-emerald-500 bg-white' : 'border-gray-200 bg-gray-50'
                    }`}
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  >
                    {formData.customerId ? (
                      <span className="text-sm text-gray-900 flex-1">{selectedCustomerName}</span>
                    ) : (
                      <span className="text-sm text-gray-400 flex-1">Musteri secin...</span>
                    )}
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${showCustomerDropdown ? 'rotate-180' : ''}`} />
                  </div>

                  {showCustomerDropdown && (
                    <div className="absolute z-20 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-hidden">
                      <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder="Ara..."
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-56">
                        {filteredCustomers.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-gray-400">Sonuc bulunamadi</div>
                        ) : (
                          filteredCustomers.map(customer => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectCustomer(customer.id);
                              }}
                              className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between ${
                                formData.customerId === customer.id
                                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                                  : 'hover:bg-gray-50 text-gray-700 active:bg-gray-100'
                              }`}
                            >
                              <span>{customer.kisa_isim}</span>
                              {formData.customerId === customer.id && <Check size={14} className="text-emerald-600" />}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Branch select */}
                {formData.customerId && hasBranches && branches.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={12} />
                        <span>Sube</span>
                      </div>
                    </label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all appearance-none"
                      required
                    >
                      <option value="">Sube seciniz...</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.sube_adi}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tarih & Saat */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">Tarih & Saat</span>
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Tarih</label>
              <input
                type="date"
                value={formData.visitDate}
                onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Saat</label>
              <input
                type="time"
                value={formData.visitTime}
                onChange={(e) => setFormData({ ...formData, visitTime: e.target.value })}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                required
              />
            </div>
          </div>
        </div>

        {/* Ziyaret Turu */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-500">
              <ClipboardList size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">Ziyaret Turu</span>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {visitTypes.map(type => {
                const isSelected = formData.visitType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, visitType: type.id })}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hedef Zarlilar */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-500">
              <Bug size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">Hedef Zarlilar</span>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pestTypes.map(type => {
                const isSelected = formData.pestTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      const newPestTypes = isSelected
                        ? formData.pestTypes.filter(t => t !== type.id)
                        : [...formData.pestTypes, type.id];
                      setFormData({ ...formData, pestTypes: newPestTypes });
                    }}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border flex items-center gap-2 ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                  >
                    {isSelected && <Check size={14} />}
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Notlar */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-500">
              <FileText size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">Notlar</span>
            </div>
          </div>
          <div className="p-4">
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
              placeholder="Ziyarete ozel notlarinizi yazin..."
            />
            <p className="text-xs text-gray-400 mt-1.5">Sadece operator gorur</p>
          </div>
        </div>

        {/* E-posta Bildirimi */}
        <div
          className={`flex items-center gap-3 bg-white rounded-xl p-4 border cursor-pointer active:bg-gray-50 transition-all ${
            sendEmailNotification ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-200'
          }`}
          onClick={() => setSendEmailNotification(!sendEmailNotification)}
        >
          <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 flex-shrink-0 ${sendEmailNotification ? 'bg-emerald-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${sendEmailNotification ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Mail size={16} className={sendEmailNotification ? 'text-emerald-600' : 'text-gray-400'} />
            <span className={`text-sm font-medium ${sendEmailNotification ? 'text-emerald-700' : 'text-gray-600'}`}>
              Musteriye e-posta bildirimi gonder
            </span>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="sticky bottom-0 bg-gray-50 pt-2 pb-4 -mx-4 px-4 space-y-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <CalendarPlus size={18} />
                <span>Ziyareti Planla</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/operator/ziyaretler')}
            className="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-xl transition-colors"
          >
            Iptal
          </button>
        </div>
      </form>

      {/* Backdrop for dropdown */}
      {showCustomerDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setShowCustomerDropdown(false)} />
      )}
    </div>
  );
};

export default VisitForm;
