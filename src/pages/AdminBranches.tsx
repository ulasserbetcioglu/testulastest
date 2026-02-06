import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Building, MapPin, Layout, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddBranchModal from '../components/Customers/AddBranchModal';
import EditBranchModal from '../components/Customers/EditBranchModal';

// --- TİP TANIMLARI ---
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
  
  // Modallar
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [preSelectedCustomer, setPreSelectedCustomer] = useState<string>('');
  
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchData();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const isAdminUser = user?.email === 'admin@ilaclamatik.com' || true; 
    setIsAdmin(isAdminUser);
    if (!isAdminUser) setError('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select(`*, customer:customer_id(kisa_isim), pricing:branch_pricing(*)`)
        .order('sube_adi', { ascending: true });

      if (branchesError) throw branchesError;
      setBranches(branchesData || []);

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
    if (!isAdmin) return toast.error('Yetkiniz yok.');
    if (!window.confirm('Bu şubeyi silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase.from('branches').delete().eq('id', branchId);
      if (error) throw error;
      toast.success('Şube silindi.');
      setBranches(prev => prev.filter(b => b.id !== branchId));
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    }
  };

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsEditModalOpen(true);
  };

  const handleAddBranch = (customerId: string = '') => {
    setPreSelectedCustomer(customerId);
    setIsAddModalOpen(true);
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

  if (loading) return <div className="p-12 text-center text-gray-400 text-sm">Yükleniyor...</div>;
  if (error) return <div className="p-12 text-center text-red-500">Hata: {error}</div>;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto min-h-screen">

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 tracking-tight">Şubeler</h1>
          <p className="text-gray-500 text-sm mt-1">Toplam {branches.length} kayıt</p>
        </div>
        <button
          onClick={() => handleAddBranch('')}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} /> Şube Ekle
        </button>
      </div>

      {/* ŞUBESİ OLMAYAN MÜŞTERİLER (Minimal Bar) */}
      {customersWithoutBranches.length > 0 && (
        <div className="mb-6 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-semibold text-gray-400 whitespace-nowrap uppercase tracking-wider">Hızlı Ekle:</span>
          {customersWithoutBranches.slice(0, 5).map(cust => (
            <button 
              key={cust.id}
              onClick={() => handleAddBranch(cust.id)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs rounded-full hover:border-gray-400 transition-colors whitespace-nowrap shadow-sm"
            >
              {cust.kisa_isim} <Plus size={12} className="text-gray-400" />
            </button>
          ))}
          {customersWithoutBranches.length > 5 && (
            <span className="text-xs text-gray-400 whitespace-nowrap">+{customersWithoutBranches.length - 5} diğer</span>
          )}
        </div>
      )}

      {/* ARAMA */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-transparent border-b border-gray-200 text-gray-700 text-sm focus:border-gray-400 outline-none transition-colors placeholder-gray-400"
        />
      </div>

      {/* TABLO */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Şube Adı</th>
              <th className="py-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Müşteri</th>
              <th className="py-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Konum & İletişim</th>
              <th className="py-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredBranches.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              filteredBranches.map(branch => (
                <tr key={branch.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-2 align-top">
                    <span className="text-sm font-medium text-gray-800 block">{branch.sube_adi}</span>
                    <span className="text-xs text-gray-400">{branch.sehir}</span>
                  </td>
                  
                  <td className="py-3 px-2 align-top">
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <Building size={14} className="text-gray-300" />
                      {branch.customer?.kisa_isim || '-'}
                    </span>
                  </td>

                  <td className="py-3 px-2 align-top hidden md:table-cell">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin size={12} className={branch.latitude ? "text-green-500" : "text-gray-300"} />
                        {branch.latitude ? 'Konum Kayıtlı' : 'Konum Yok'}
                      </div>
                      {branch.telefon && <div className="text-xs text-gray-400">{branch.telefon}</div>}
                    </div>
                  </td>

                  <td className="py-3 px-2 align-top text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => navigate(`/subeler/kroki-duzenle?branch_id=${branch.id}`)} 
                        className="text-gray-400 hover:text-purple-600 transition-colors"
                        title="Kroki"
                      >
                        <Layout size={18} strokeWidth={1.5} />
                      </button>
                      <button 
                        onClick={() => handleEdit(branch)} 
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 size={18} strokeWidth={1.5} />
                      </button>
                      <button 
                        onClick={() => handleDelete(branch.id)} 
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODALLAR */}
      <AddBranchModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        customerId={preSelectedCustomer}
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