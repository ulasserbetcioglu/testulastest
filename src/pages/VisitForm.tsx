// src/pages/VisitForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { sendEmail, getRecipientEmails } from '../lib/emailClient';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

// --- ARAYÜZLER (INTERFACES) ---
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
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [assignedCustomers, setAssignedCustomers] = useState<string[] | null>(null);
  const [assignedBranches, setAssignedBranches] = useState<string[] | null>(null);
  
  // YENİ EKLENEN STATE'LER
  const [isOneTimeCustomer, setIsOneTimeCustomer] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualBranchName, setManualBranchName] = useState('');

  // YENİ: Alfabetik navigasyon ve arama için state'ler
  const [customerSearch, setCustomerSearch] = useState('');
  const [showAlphabetNav, setShowAlphabetNav] = useState(false);

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
      
      // Yeni tek seferlik müşteri oluştur
      const { data: newCustomerData, error: newCustomerError } = await supabase
        .from('customers')
        .insert({ kisa_isim: manualCustomerName.trim(), is_one_time: true })
        .select('id')
        .single();

      if (newCustomerError) throw newCustomerError;
      finalCustomerId = newCustomerData.id;

      if (manualBranchName.trim()) {
        // Yeni tek seferlik şube oluştur
        const { data: newBranchData, error: newBranchError } = await supabase
          .from('branches')
          .insert({ sube_adi: manualBranchName.trim(), customer_id: finalCustomerId, is_one_time: true })
          .select('id')
          .single();
        
        if (newBranchError) throw newBranchError;
        finalBranchId = newBranchData.id;
      } else {
        finalBranchId = ''; // Manuel şube adı girilmediyse boş bırak
      }
    } else {
      if (!formData.customerId) {
        toast.error('Lütfen bir müşteri seçin.');
        return;
      }
    }

    // DÜZELTME: visitDate ve visitTime yerine formData.visitDate ve formData.visitTime kullanıldı
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
            for (const email of recipientEmails) {
              await sendEmail('visit', data[0].id, email);
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

  const alphabet = 'ABCÇDEFGHIİJKLMNOÖPRSŞTUÜVYZ'.split('');

  const jumpToLetter = (letter: string) => {
    const customerWithLetter = customers.find(customer => 
      customer.kisa_isim.toUpperCase().startsWith(letter)
    );
    if (customerWithLetter) {
      setFormData(prev => ({ ...prev, customerId: customerWithLetter.id, branchId: '' }));
    } else {
        toast.info(`'${letter}' harfi ile başlayan müşteri bulunamadı.`);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Yükleniyor...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Yeni Ziyaret Planla</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
        
        <div className="space-y-4">
          {/* YENİ: Tek Seferlik Müşteri Seçeneği */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isOneTimeCustomer"
              checked={isOneTimeCustomer}
              onChange={(e) => {
                setIsOneTimeCustomer(e.target.checked);
                setFormData(prev => ({ ...prev, customerId: '', branchId: '' })); // Seçimi sıfırla
                setManualCustomerName('');
                setManualBranchName('');
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isOneTimeCustomer" className="ml-2 block text-sm text-gray-700">
              Tek Seferlik Müşteri
            </label>
          </div>

          {isOneTimeCustomer ? (
            // YENİ: Manuel Müşteri ve Şube Girişi
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri Adı</label>
                <input
                  type="text"
                  value={manualCustomerName}
                  onChange={(e) => setManualCustomerName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
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
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="Tek seferlik şube adı"
                />
              </div>
            </>
          ) : (
            // Mevcut Müşteri ve Şube Seçimi
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Müşteri ara..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onFocus={() => setShowAlphabetNav(true)}
                    className="w-full p-2 border border-gray-300 rounded-lg mb-1"
                  />
                  <select
                    id="customer-select"
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value, branchId: '' })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    required
                    onClick={() => setShowAlphabetNav(true)}
                  >
                    <option value="">Müşteri Seçiniz</option>
                    {filteredCustomers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.kisa_isim}</option>
                    ))}
                  </select>
                  
                  {showAlphabetNav && (
                    <div className="mt-2 flex flex-wrap gap-1 bg-gray-100 p-2 rounded-lg">
                      {alphabet.map(letter => (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => jumpToLetter(letter)}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
                        >
                          {letter}
                        </button>
                      ))}
                      <button 
                        type="button" 
                        onClick={() => setShowAlphabetNav(false)}
                        className="ml-auto text-xs text-gray-500 hover:text-gray-700 p-1"
                      >
                        Kapat
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {formData.customerId && hasBranches && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şube</label>
                  <select value={formData.branchId} onChange={(e) => setFormData({ ...formData, branchId: e.target.value })} className="w-full p-2 border rounded-md" required>
                    <option value="">Şube Seçiniz</option>
                    {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.sube_adi}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
              <input type="date" value={formData.visitDate} onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })} className="w-full p-2 border rounded-md" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saat</label>
              <input type="time" value={formData.visitTime} onChange={(e) => setFormData({ ...formData, visitTime: e.target.value })} className="w-full p-2 border rounded-md" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ziyaret Türü</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {visitTypes.map(type => (
                <label key={type.id} className="flex items-center space-x-2">
                  <input type="radio" name="visitType" value={type.id} checked={formData.visitType === type.id} onChange={(e) => setFormData({ ...formData, visitType: e.target.value })} className="form-radio text-blue-600"/>
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hedef Zararlılar</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {pestTypes.map(type => (
                <label key={type.id} className="flex items-center space-x-2">
                  <input type="checkbox" value={type.id} checked={formData.pestTypes.includes(type.id)} onChange={(e) => {
                      const newPestTypes = e.target.checked ? [...formData.pestTypes, type.id] : formData.pestTypes.filter(t => t !== type.id);
                      setFormData({ ...formData, pestTypes: newPestTypes });
                    }} className="form-checkbox text-blue-600" />
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar (Sadece Operatör Görür)</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} className="w-full p-2 border rounded-md" placeholder="Notlar..."></textarea>
          </div>

          <div className="flex items-center">
            <input type="checkbox" id="sendEmail" checked={sendEmailNotification} onChange={(e) => setSendEmailNotification(e.target.checked)} className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded" />
            <label htmlFor="sendEmail" className="ml-2 block text-sm text-gray-700">Müşteriye e-posta bildirimi gönder</label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-8">
          <button type="button" onClick={() => navigate('/operator/ziyaretler')} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">İptal</button>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50" disabled={saving || !operatorId || (isOneTimeCustomer ? !manualCustomerName.trim() : !formData.customerId)}>
            {saving ? <><Loader2 className="animate-spin" />Kaydediliyor...</> : 'Ziyareti Planla'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VisitForm;
