import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
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
  // Değişiklikleri kıyaslamak için orijinal veriyi tutuyoruz
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
  
  // Select listeleri
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  
  // Tab yönetimi
  const [activeTab, setActiveTab] = useState<'basic' | 'permissions'>('basic');

  // Modal açıldığında verileri çek
  useEffect(() => {
    if (isOpen) {
      fetchOperator();
      fetchCustomersAndBranches();
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, operatorId]);

  // Seçili müşterilere göre şubeleri filtrele
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
      // Auth ID'yi güncelleme için saklamamız şart
      setOriginalData({ ...initialData, auth_id: data.auth_id }); 

    } catch (err: any) {
      console.error("Veri çekme hatası:", err);
      setError("Operatör bilgileri alınamadı.");
    }
  };

  const fetchCustomersAndBranches = async () => {
    try {
      const { data: customersData } = await supabase.from('customers').select('id, kisa_isim').order('kisa_isim');
      setCustomers(customersData || []);

      const { data: branchesData } = await supabase.from('branches').select('id, sube_adi, customer_id').order('sube_adi');
      setBranches(branchesData || []);
    } catch (err: any) {
      console.error("Liste hatası:", err);
    }
  };

  // --- SQL FONKSİYONUNU ÇAĞIRAN METOD ---
  const updateOperatorEmailRPC = async (authId: string, newEmail: string) => {
    // Adım 1'de oluşturduğumuz SQL fonksiyonunu çağırıyoruz
    const { error } = await supabase.rpc('update_operator_email_admin', {
      target_auth_id: authId,
      new_email: newEmail
    });

    if (error) {
      throw new Error(`E-posta güncelleme hatası: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Eğer e-posta değişmişse, önce güvenli RPC fonksiyonunu çalıştır
      if (originalData && formData.email !== originalData.email) {
        if (!originalData.auth_id) {
          throw new Error("Operatörün Auth ID'si bulunamadı, e-posta değiştirilemez.");
        }
        await updateOperatorEmailRPC(originalData.auth_id, formData.email);
        toast.success("E-posta adresi ve giriş bilgileri güncellendi.");
      }

      // 2. Diğer verileri hazırla (İsim, Telefon, Yetkiler vb.)
      const operatorData: any = {
        name: formData.adSoyad,
        phone: formData.telefon,
        // E-posta zaten RPC ile güncellendi ama tutarlılık için buraya da koyabiliriz (Update üstüne update sorun olmaz)
        email: formData.email, 
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

      // 3. Standart tablo güncellemesi
      const { error: updateError } = await supabase
        .from('operators')
        .update(operatorData)
        .eq('id', operatorId);

      if (updateError) throw updateError;

      setSuccess(true);
      toast.success("Operatör başarıyla güncellendi!");
      onSave();
      
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error("Güncelleme hatası:", err);
      setError(err.message || "Bir hata oluştu.");
      toast.error("İşlem başarısız oldu.");
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl transform transition-all">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-800">Operatör Düzenle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50 px-4 pt-2">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('basic')}
              className={`pb-2 px-1 font-medium text-sm transition-colors ${
                activeTab === 'basic'
                  ? 'border-b-2 border-green-600 text-green-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Temel Bilgiler
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`pb-2 px-1 font-medium text-sm transition-colors ${
                activeTab === 'permissions'
                  ? 'border-b-2 border-green-600 text-green-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Erişim İzinleri
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
              ✓ Operatör başarıyla güncellendi!
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <label className="block text-sm font-bold text-gray-800 mb-1">
                  E-Posta (Giriş Bilgisi)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
                  required
                />
                <p className="mt-2 text-xs text-yellow-700 flex items-start gap-1">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  Dikkat: E-postayı değiştirdiğinizde operatörün sisteme giriş yaparken kullandığı e-posta adresi de kalıcı olarak değişecektir.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giriş İzni
                  </label>
                  <select
                    value={formData.durum}
                    onChange={(e) => setFormData({ ...formData, durum: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all bg-white"
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
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="isSubOperator"
                  checked={formData.isSubOperator}
                  onChange={(e) => setFormData({ ...formData, isSubOperator: e.target.checked })}
                  className="mr-3 h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="isSubOperator" className="text-sm font-medium text-gray-800 select-none cursor-pointer">
                  Alt Taşeron Operatör (Kısıtlı Erişim)
                </label>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-4">
              {!formData.isSubOperator ? (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        Bu ayarlar sadece <b>Alt Taşeron Operatörler</b> içindir. 
                        <br/>Aktif etmek için "Temel Bilgiler" sekmesinden ilgili kutucuğu işaretleyin.
                      </p>
                    </div>
                  </div>
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
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[150px] text-sm"
                    >
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id} className="p-1">
                          {customer.kisa_isim}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Birden fazla seçim yapmak için <b>Ctrl</b> (veya Mac'te <b>Cmd</b>) tuşuna basılı tutun.
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
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[150px] text-sm disabled:bg-gray-100 disabled:text-gray-400"
                      disabled={formData.assignedCustomers.length === 0}
                    >
                      {filteredBranches.map(branch => (
                        <option key={branch.id} value={branch.id} className="p-1">
                          {branch.sube_adi}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Listelenen şubeler sadece yukarıda seçtiğiniz müşterilere aittir.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-200"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-sm focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
              disabled={loading}
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {loading ? 'İşleniyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOperatorModal;