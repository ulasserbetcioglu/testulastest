import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Building, Users, Eye, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  id: string;
  kisa_isim: string;
  firma_unvani: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  adres: string;
}

const AdminActivityFileManagement: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState<string>('');
  const [authUser, setAuthUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndLoadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      loadBranches(selectedCustomerId);
    } else {
      setBranches([]);
      setSelectedBranchId('');
    }
  }, [selectedCustomerId]);

  const checkAuthAndLoadCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('Auth error:', authError);
        setError(`Kimlik doğrulama hatası: ${authError.message}`);
        toast.error('Kimlik doğrulama hatası');
        setLoading(false);
        return;
      }

      if (!user) {
        setError('Kullanıcı oturumu bulunamadı');
        toast.error('Lütfen giriş yapın');
        setLoading(false);
        return;
      }

      setAuthUser(user);
      console.log('Authenticated user:', user.email);

      const { data, error: customersError } = await supabase
        .from('customers')
        .select('id, kisa_isim, firma_unvani')
        .order('kisa_isim', { ascending: true });

      if (customersError) {
        console.error('Customers query error:', customersError);
        setError(`Müşteriler yüklenirken hata: ${customersError.message} (${customersError.code})`);
        toast.error(`Veritabanı hatası: ${customersError.message}`);
        setLoading(false);
        return;
      }

      console.log('Customers loaded:', data?.length || 0);
      setCustomers(data || []);

      if (!data || data.length === 0) {
        setError('Henüz hiç müşteri kaydı bulunmuyor');
      }
    } catch (error: any) {
      console.error('Unexpected error loading customers:', error);
      setError(`Beklenmeyen hata: ${error.message || 'Bilinmeyen hata'}`);
      toast.error('Müşteriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async (customerId: string) => {
    setLoadingBranches(true);
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, sube_adi, adres')
        .eq('customer_id', customerId)
        .order('sube_adi', { ascending: true });

      if (error) {
        console.error('Branches query error:', error);
        toast.error(`Şubeler yüklenirken hata: ${error.message}`);
        setBranches([]);
        setSelectedBranchId('');
        return;
      }

      console.log('Branches loaded for customer:', customerId, '- Count:', data?.length || 0);
      setBranches(data || []);
      setSelectedBranchId('');
    } catch (error: any) {
      console.error('Unexpected error loading branches:', error);
      toast.error('Şubeler yüklenirken beklenmeyen hata oluştu');
      setBranches([]);
      setSelectedBranchId('');
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleViewActivityFile = () => {
    if (!selectedCustomerId) {
      toast.error('Lütfen bir müşteri seçin');
      return;
    }

    const params = new URLSearchParams();
    params.append('customerId', selectedCustomerId);
    if (selectedBranchId) {
      params.append('branchId', selectedBranchId);
    }

    navigate(`/admin/faaliyet-dosyasi-goruntule?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Faaliyet Dosyası Yönetimi</h1>
        <p className="text-gray-600 mt-2">
          Müşteri ve şube seçerek ilgili faaliyet dosyasını görüntüleyin ve yönetin
        </p>
        {authUser && (
          <p className="text-sm text-gray-500 mt-1">
            Oturum: {authUser.email}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Hata</h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
              <button
                onClick={checkAuthAndLoadCustomers}
                className="mt-3 text-sm font-medium text-red-600 hover:text-red-500"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        {customers.length > 0 && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ {customers.length} müşteri yüklendi
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="inline w-4 h-4 mr-1" />
              Müşteri Seçin {customers.length > 0 && `(${customers.length})`}
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={customers.length === 0}
            >
              <option value="">-- Müşteri Seçin --</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.kisa_isim} - {customer.firma_unvani}
                </option>
              ))}
            </select>
            {customers.length === 0 && !error && (
              <p className="text-sm text-orange-600 mt-1">⚠ Henüz müşteri eklenmemiş</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="inline w-4 h-4 mr-1" />
              Şube Seçin (Opsiyonel) {branches.length > 0 && `(${branches.length})`}
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={!selectedCustomerId || loadingBranches}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- Tüm Şubeler --</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.sube_adi}
                </option>
              ))}
            </select>
            {loadingBranches && (
              <p className="text-sm text-blue-600 mt-1">⏳ Şubeler yükleniyor...</p>
            )}
            {selectedCustomerId && !loadingBranches && branches.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">Bu müşteriye ait şube bulunamadı</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleViewActivityFile}
            disabled={!selectedCustomerId}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Eye className="w-5 h-5" />
            <span>Faaliyet Dosyasını Görüntüle</span>
          </button>
        </div>

        {selectedCustomerId && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <FolderOpen className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900">Görüntülenecek İçerikler:</p>
                <ul className="mt-2 space-y-1 text-sm text-blue-800">
                  <li>• Genel (Sabit) Belgeler</li>
                  <li>• Müşteriye Özel Belgeler</li>
                  {selectedBranchId && (
                    <>
                      <li>• Şubeye Özel Belgeler</li>
                      <li>• Kroki ve Yerleşim Planları</li>
                      <li>• Ekipman Listesi</li>
                    </>
                  )}
                  <li>• Risk Değerlendirmeleri</li>
                  <li>• Trend Analiz Raporları</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Faaliyet Dosyası Nedir?</h2>
        <p className="text-gray-700 mb-4">
          Faaliyet dosyası, müşterilerinize ve şubelerine özel tüm belgeleri, raporları ve değerlendirmeleri tek bir çatı altında toplar.
          Bu sayede müşterileriniz, şubeleriniz ve sizin için tüm önemli evraklar düzenli ve kolay erişilebilir bir şekilde saklanır.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Sabit Evraklar</h3>
            <p className="text-sm text-gray-600">
              TSE HYB, ISO 9001, Kalite Belgeleri, Biyosidal Ürün Ruhsatları, Operatör Ruhsatları gibi
              tüm müşteriler için geçerli olan genel belgeler.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Değişken Evraklar</h3>
            <p className="text-sm text-gray-600">
              Müşteriye ve şubeye özel belgeler, kroki, risk değerlendirmeleri, trend analiz raporları
              ve ekipman listeleri gibi özelleştirilmiş içerikler.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminActivityFileManagement;
