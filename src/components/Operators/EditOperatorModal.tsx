// src/components/Operators/EditOperatorModal.tsx
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { supabase, supabaseAdmin } from '../../lib/supabase'; // supabaseAdmin import edildi
import { Operator as OperatorType } from '../../types';
import { toast } from 'sonner';

interface EditOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  operatorId: string;
}

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
}

const EditOperatorModal: React.FC<EditOperatorModalProps> = ({ isOpen, onClose, onSave, operatorId }) => {
  // Orijinal veriyi saklamak için (değişiklik kontrolü)
  const [originalData, setOriginalData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    adSoyad: '',
    telefon: '',
    email: '',
    durum: 'Açık',
    isSubOperator: false,
    assignedCustomers: [] as string[],
    assignedBranches: [] as string[],
    totalLeaveDays: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'permissions'>('basic');

  useEffect(() => {
    if (isOpen) {
      fetchOperator();
      fetchCustomersAndBranches();
    }
  }, [isOpen, operatorId]);

  useEffect(() => {
    if (formData.assignedCustomers.length > 0) {
      const filtered = branches.filter(branch => 
        formData.assignedCustomers.includes(branch.customer_id)
      );
      setFilteredBranches(filtered);
    } else {
      setFilteredBranches([]);
    }
  }, [formData.assignedCustomers, branches]);

  const fetchOperator = async () => {
    try {
      const { data, error } = await supabase
        .from('operators')
        .select('*, total_leave_days')
        .eq('id', operatorId)
        .single();

      if (error) throw error;

      // Verileri state'e yükle
      const initialData = {
        adSoyad: data.name,
        telefon: data.phone || '',
        email: data.email,
        durum: data.status,
        isSubOperator: data.assigned_customers !== null || data.assigned_branches !== null,
        assignedCustomers: data.assigned_customers || [],
        assignedBranches: data.assigned_branches || [],
        totalLeaveDays: data.total_leave_days || 0
      };

      setFormData(initialData);
      setOriginalData({ ...initialData, auth_id: data.auth_id }); // auth_id'yi de sakla

    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchCustomersAndBranches = async () => {
    try {
      const { data: customersData } = await supabase.from('customers').select('id, kisa_isim').order('kisa_isim');
      setCustomers(customersData || []);

      const { data: branchesData } = await supabase.from('branches').select('id, sube_adi, customer_id').order('sube_adi');
      setBranches(branchesData || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- E-POSTA GÜNCELLEME FONKSİYONU ---
  const updateOperatorEmail = async (authId: string, newEmail: string) => {
    if (!supabaseAdmin) {
      throw new Error("Admin yetkisi (Service Role Key) bulunamadı. .env dosyasını kontrol edin.");
    }

    // 1. Auth tablosunu güncelle (Giriş bilgisi)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      authId,
      { email: newEmail, email_confirm: true, user_metadata: { email: newEmail } }
    );

    if (authError) throw new Error(`Auth güncelleme hatası: ${authError.message}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. E-posta değişmiş mi kontrol et ve güncelle
      if (originalData && formData.email !== originalData.email) {
        if (!originalData.auth_id) {
          throw new Error("Bu operatörün Auth ID'si bulunamadı, e-posta değiştirilemez.");
        }
        await updateOperatorEmail(originalData.auth_id, formData.email);
        toast.success("E-posta adresi güncellendi.");
      }

      // 2. Diğer verileri hazırla
      const operatorData: any = {
        name: formData.adSoyad,
        phone: formData.telefon,
        email: formData.email, // Tablodaki e-postayı da güncelle
        status: formData.durum,
        total_leave_days: formData.totalLeaveDays
      };

      if (formData.isSubOperator) {
        operatorData.assigned_customers = formData.assignedCustomers.length > 0 ? formData.assignedCustomers : null;
        operatorData.assigned_branches = formData.assignedBranches.length > 0 ? formData.assignedBranches : null;
      } else {
        operatorData.assigned_customers = null;
        operatorData.assigned_branches = null;
      }

      // 3. Operators tablosunu güncelle
      const { error } = await supabase
        .from('operators')
        .update(operatorData)
        .eq('id', operatorId);

      if (error) throw error;

      setSuccess(true);
      toast.success("Operatör başarıyla güncellendi!");
      onSave();
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Güncelleme hatası:", err);
      setError(err.message);
      toast.error("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData({ ...formData, assignedCustomers: selectedOptions });
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData({ ...formData, assignedBranches: selectedOptions });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">Operatör Düzenle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'basic'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Temel Bilgiler
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'permissions'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Erişim İzinleri
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center gap-2">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              Operatör başarıyla güncellendi!
            </div>
          )}

          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad ve Soyad
                </label>
                <input
                  type="text"
                  value={formData.adSoyad}
                  onChange={(e) => setFormData({ ...formData, adSoyad: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.telefon}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Posta (Giriş Bilgisi)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 bg-yellow-50"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                  <AlertTriangle size={12} className="text-yellow-600"/>
                  Dikkat: Burayı değiştirdiğinizde operatörün sisteme giriş maili de değişecektir.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giriş İzni
                </label>
                <select
                  value={formData.durum}
                  onChange={(e) => setFormData({ ...formData, durum: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Açık">Açık</option>
                  <option value="Kapalı">Kapalı</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Toplam İzin Günü
                </label>
                <input
                  type="number"
                  value={formData.totalLeaveDays}
                  onChange={(e) => setFormData({ ...formData, totalLeaveDays: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  min="0"
                />
              </div>

              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="isSubOperator"
                  checked={formData.isSubOperator}
                  onChange={(e) => setFormData({ ...formData, isSubOperator: e.target.checked })}
                  className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="isSubOperator" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                  Alt Taşeron Operatör (Kısıtlı Erişim)
                </label>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-4">
              {!formData.isSubOperator ? (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <p className="text-yellow-700 text-sm">
                    Bu ayarları kullanabilmek için "Temel Bilgiler" sekmesinden "Alt Taşeron Operatör" seçeneğini aktif etmelisiniz.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Erişim İzni Olan Müşteriler
                    </label>
                    <select
                      multiple
                      value={formData.assignedCustomers}
                      onChange={handleCustomerChange}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[150px]"
                    >
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.kisa_isim}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Çoklu seçim için Ctrl (Mac için Cmd) tuşuna basılı tutun. Boş bırakılırsa tüm müşterilere erişebilir.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Erişim İzni Olan Şubeler
                    </label>
                    <select
                      multiple
                      value={formData.assignedBranches}
                      onChange={handleBranchChange}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[150px]"
                      disabled={formData.assignedCustomers.length === 0}
                    >
                      {filteredBranches.map(branch => (
                        <option key={branch.id} value={branch.id}>
                          {branch.sube_adi}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Önce müşteri seçmelisiniz. Boş bırakılırsa seçili müşterilerin tüm şubelerine erişebilir.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              disabled={loading}
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOperatorModal;