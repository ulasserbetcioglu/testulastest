import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Building, Users, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddBranchModal from '../components/Customers/AddBranchModal';
import EditBranchModal from '../components/Customers/EditBranchModal';

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  adres: string;
  sehir: string;
  telefon: string;
  email: string;
  latitude?: number;
  longitude?: number;
  customer_id: string;
  customer?: {
    kisa_isim: string;
  };
  pricing?: {
    monthly_price?: number;
    per_visit_price?: number;
  };
}

const AdminBranches: React.FC = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchData();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const isAdminUser = user?.email === 'admin@ilaclamatik.com';
    setIsAdmin(isAdminUser);
    if (!isAdminUser) {
      setError('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all branches with customer info and pricing
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select(`
          *,
          customer:customer_id(kisa_isim),
          pricing:branch_pricing(*)
        `)
        .order('sube_adi', { ascending: true });

      if (branchesError) throw branchesError;
      setBranches(branchesData || []);

      // Fetch all customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, kisa_isim')
        .order('kisa_isim');

      if (customersError) throw customersError;
      setCustomers(customersData || []);

    } catch (err: any) {
      setError(err.message);
      toast.error('Veriler yüklenirken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (branchId: string) => {
    if (!isAdmin) {
      toast.error('Sadece admin kullanıcısı şube silebilir.');
      return;
    }

    if (!window.confirm('Bu şubeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId);

      if (error) throw error;
      toast.success('Şube başarıyla silindi.');
      fetchData(); // Refresh data
    } catch (err: any) {
      toast.error('Şube silinirken hata oluştu: ' + err.message);
    }
  };

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsEditModalOpen(true);
  };

  const filteredBranches = useMemo(() => {
    return branches.filter(branch =>
      branch.sube_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (branch.customer?.kisa_isim || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (branch.adres || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (branch.sehir || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [branches, searchTerm]);

  const customersWithoutBranches = useMemo(() => {
    const customersWithBranches = new Set(branches.map(b => b.customer_id));
    return customers.filter(customer => !customersWithBranches.has(customer.id));
  }, [customers, branches]);

  if (loading) return <div className="p-4 text-center">Yükleniyor...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Hata: {error}</div>;
  if (!isAdmin) return <div className="p-4 text-center">Bu sayfaya erişim yetkiniz bulunmamaktadır.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Şubeler</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors"
        >
          <Plus size={20} /> Yeni Şube Ekle
        </button>
      </header>

      <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Şube adı, müşteri veya adres ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Şube Listesi */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg overflow-hidden">
          <h2 className="text-xl font-bold text-gray-800 p-4 border-b flex items-center gap-2">
            <Building size={20} /> Tüm Şubeler ({filteredBranches.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şube Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adres</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      Şube bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map(branch => (
                    <tr key={branch.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{branch.sube_adi}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{branch.customer?.kisa_isim || 'Bilinmiyor'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {branch.adres}, {branch.sehir}
                        {branch.latitude && branch.longitude && (
                          <div className="flex items-center text-xs text-gray-400 mt-1">
                            <MapPin size={12} className="mr-1" /> {branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(branch)} className="text-blue-600 hover:text-blue-900" title="Düzenle"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(branch.id)} className="text-red-600 hover:text-red-900" title="Sil"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Şubesi Olmayan Müşteriler */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <h2 className="text-xl font-bold text-gray-800 p-4 border-b flex items-center gap-2">
            <Users size={20} /> Şubesi Olmayan Müşteriler ({customersWithoutBranches.length})
          </h2>
          <div className="p-4">
            {customersWithoutBranches.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                Şubesi olmayan müşteri bulunmuyor.
              </div>
            ) : (
              <ul className="space-y-2">
                {customersWithoutBranches.map(customer => (
                  <li key={customer.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <span className="font-medium text-gray-800">{customer.kisa_isim}</span>
                    <button onClick={() => setIsAddModalOpen(true)} className="text-blue-600 hover:text-blue-800 text-sm">
                      Şube Ekle
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AddBranchModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        customerId={selectedBranch?.customer_id || ''} // Pass selected customer if available
        onSave={fetchData}
      />

      {selectedBranch && (
        <EditBranchModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedBranch(null);
          }}
          branch={selectedBranch}
          onSave={fetchData}
        />
      )}
    </div>
  );
};

export default AdminBranches;
