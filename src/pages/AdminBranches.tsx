import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Building, Users, MapPin, Layout, AlertCircle, ArrowRight } from 'lucide-react';
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
  const [preSelectedCustomer, setPreSelectedCustomer] = useState<string>(''); // Şubesi olmayan müşteriden ekleme yaparken
  
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchData();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    // Admin kontrolü (Production'da rol bazlı yapılmalı)
    const isAdminUser = user?.email === 'admin@ilaclamatik.com' || true; // Test için true
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

  // Filtreleme
  const filteredBranches = useMemo(() => {
    return branches.filter(branch =>
      branch.sube_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (branch.customer?.kisa_isim || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (branch.adres || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (branch.sehir || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [branches, searchTerm]);

  // Şubesi Olmayan Müşteriler
  const customersWithoutBranches = useMemo(() => {
    const customersWithBranches = new Set(branches.map(b => b.customer_id));
    return customers.filter(customer => !customersWithBranches.has(customer.id));
  }, [customers, branches]);

  if (loading) return <div className="p-12 text-center"><div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 rounded-full border-t-transparent"></div></div>;
  if (error) return <div className="p-12 text-center text-red-500 bg-red-50 rounded-lg mx-4 mt-4">Hata: {error}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      
      {/* ÜST BAŞLIK & İSTATİSTİKLER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Building className="text-blue-600" size={32} />
            Şube Yönetimi
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Toplam <strong>{branches.length}</strong> şube ve <strong>{customers.length}</strong> müşteri kayıtlı.
          </p>
        </div>
        <button
          onClick={() => handleAddBranch('')}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all font-medium"
        >
          <Plus size={20} /> Yeni Şube Ekle
        </button>
      </div>

      {/* ŞUBESİ OLMAYAN MÜŞTERİLER UYARISI (Varsa Göster) */}
      {customersWithoutBranches.length > 0 && (
        <div className="mb-8 bg-orange-50 border border-orange-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg mt-1">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Eksik Şube Kayıtları</h3>
              <p className="text-xs text-gray-600 mt-1">
                <strong>{customersWithoutBranches.length}</strong> müşterinin henüz tanımlı bir şubesi yok.
              </p>
            </div>
          </div>
          
          {/* Hızlı Ekleme Listesi (İlk 3 tanesini göster) */}
          <div className="flex flex-wrap gap-2">
            {customersWithoutBranches.slice(0, 3).map(cust => (
              <button 
                key={cust.id}
                onClick={() => handleAddBranch(cust.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-orange-200 text-orange-700 text-xs font-medium rounded-lg hover:bg-orange-100 transition-colors"
              >
                <Plus size={14} /> {cust.kisa_isim}
              </button>
            ))}
            {customersWithoutBranches.length > 3 && (
              <span className="text-xs text-gray-400 self-center">+ {customersWithoutBranches.length - 3} diğer</span>
            )}
          </div>
        </div>
      )}

      {/* ARAMA & FİLTRE */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 sticky top-0 z-10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Şube adı, müşteri, şehir veya adres ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      {/* ŞUBE LİSTESİ (TAM GENİŞLİK) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                <th className="p-5 w-1/4">Şube & Müşteri</th>
                <th className="p-5 w-1/4">Lokasyon</th>
                <th className="p-5 w-1/4">İletişim</th>
                <th className="p-5 w-1/4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-400">
                    <Building size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Kriterlere uygun şube bulunamadı.</p>
                  </td>
                </tr>
              ) : (
                filteredBranches.map(branch => (
                  <tr key={branch.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
                          {branch.sube_adi.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{branch.sube_adi}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <Users size={12} />
                            {branch.customer?.kisa_isim || 'Müşterisiz'}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-5">
                      <div className="text-sm text-gray-700 max-w-xs truncate" title={branch.adres}>
                        {branch.adres}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                          {branch.sehir}
                        </span>
                        {branch.latitude && branch.longitude ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-xs font-medium cursor-help" title={`${branch.latitude}, ${branch.longitude}`}>
                            <MapPin size={10} /> Konum Var
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-medium">
                            <MapPin size={10} /> Konum Yok
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-5">
                      {branch.telefon && (
                        <div className="text-sm text-gray-600 mb-1">{branch.telefon}</div>
                      )}
                      {branch.email && (
                        <div className="text-xs text-gray-400">{branch.email}</div>
                      )}
                      {!branch.telefon && !branch.email && <span className="text-xs text-gray-300">-</span>}
                    </td>

                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => navigate(`/subeler/kroki-duzenle?branch_id=${branch.id}`)} 
                          className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                          title="Kroki Çiz"
                        >
                          <Layout size={18} />
                        </button>
                        <button 
                          onClick={() => handleEdit(branch)} 
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(branch.id)} 
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALLAR */}
      <AddBranchModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        customerId={preSelectedCustomer} // Şubesi olmayanı seçince otomatik dolar
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