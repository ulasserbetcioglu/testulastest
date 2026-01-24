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

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      loadBranches(selectedCustomerId);
    } else {
      setBranches([]);
      setSelectedBranchId('');
    }
  }, [selectedCustomerId]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, kisa_isim, firma_unvani')
        .order('kisa_isim', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
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

      if (error) throw error;
      setBranches(data || []);
      setSelectedBranchId('');
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Şubeler yüklenirken hata oluştu');
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
      <div className="flex items-center justify-center h-64">
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
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="inline w-4 h-4 mr-1" />
              Müşteri Seçin
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Müşteri Seçin --</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.kisa_isim} - {customer.firma_unvani}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="inline w-4 h-4 mr-1" />
              Şube Seçin (Opsiyonel)
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
              <p className="text-sm text-gray-500 mt-1">Şubeler yükleniyor...</p>
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
