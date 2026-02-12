import React, { useState, useEffect } from 'react';
import { Search, Download, Upload, Edit2, Trash2, Plus, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Customer } from '../types';
import AddCustomerModal from '../components/Customers/AddCustomerModal';
import EditCustomerModal from '../components/Customers/EditCustomerModal';
import BulkPricingModal from '../components/Customers/BulkPricingModal';
import { supabase } from '../lib/supabase';
import { exportCustomersToExcel, importCustomersFromExcel, downloadExcelTemplate } from '../utils/excel';
import { toast } from 'sonner';

const Customers: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkPricingModalOpen, setIsBulkPricingModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showOneTimeCustomers, setShowOneTimeCustomers] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  useEffect(() => {
    checkAdminAccess();
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [showOneTimeCustomers, statusFilter]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAdmin(user?.email === 'admin@ilaclamatik.com');
  };

  const fetchCustomers = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session) {
        setError('Lütfen önce giriş yapın');
        return;
      }

      let query = supabase
        .from('customers')
        .select('*, auth_id, pricing:customer_pricing(*)')
        .order('created_at', { ascending: false });

      if (!showOneTimeCustomers) {
        query = query.eq('is_one_time', false);
      }

      if (statusFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data, error } = await query;

      if (error) {
        setError(error.message);
      } else {
        setCustomers(data || []);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (customerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ is_active: !currentStatus })
        .eq('id', customerId);
      if (error) throw error;
      toast.success(currentStatus ? 'Müşteri pasif yapıldı' : 'Müşteri aktif yapıldı');
      fetchCustomers();
    } catch (err: any) {
      toast.error('Durum güncellenirken hata: ' + err.message);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.cari_isim && customer.cari_isim.toLowerCase().includes(searchTerm.toLowerCase())) ||
    customer.musteri_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = () => {
    exportCustomersToExcel(customers);
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const importedCustomers = await importCustomersFromExcel(file);
      
      const { data, error: supabaseError } = await supabase
        .from('customers')
        .insert(importedCustomers)
        .select();

      if (supabaseError) throw supabaseError;

      fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!isAdmin) {
      // alert yerine daha modern bir bildirim kütüphanesi (örn: sonner, react-toastify) kullanmak daha iyi bir kullanıcı deneyimi sunar.
      // Şimdilik confirm kullanıyoruz.
      console.error('Sadece admin kullanıcısı müşteri silebilir.');
      return;
    }

    if (!window.confirm('Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;
      fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (customer: Customer) => {
    if (!isAdmin) {
      console.error('Sadece admin kullanıcısı müşteri düzenleyebilir.');
      return;
    }
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">MÜŞTERİLER</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadExcelTemplate()}
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-sm"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Şablon İndir</span>
            <span className="sm:hidden">Şablon</span>
          </button>

          <label className="px-3 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors cursor-pointer flex items-center gap-1.5 text-sm">
            <Upload size={16} />
            <span className="hidden sm:inline">Excel İçe Aktar</span>
            <span className="sm:hidden">İçe Aktar</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportExcel}
            />
          </label>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1.5 text-sm"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Dışa Aktar</span>
            <span className="sm:hidden">Aktar</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsBulkPricingModalOpen(true)}
              className="px-3 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors flex items-center gap-1.5 text-sm"
            >
              <DollarSign size={16} />
              <span className="hidden sm:inline">Toplu Fiyatlandırma</span>
              <span className="sm:hidden">Fiyat</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1.5 text-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Müşteri Ekle</span>
            <span className="sm:hidden">Ekle</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Müşteri No, İsim, Cari İsim, E-Posta"
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600">
              <Search size={20} />
            </button>
          </div>
        </div>
        <button className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
          Ara
        </button>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === 'active' ? 'bg-green-100 text-green-800' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Aktif
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === 'inactive' ? 'bg-red-100 text-red-800' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Pasif
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Tümü
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOneTimeCustomers}
              onChange={(e) => setShowOneTimeCustomers(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            Tek Seferlik Müşterileri Göster
          </label>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Müşteri No
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  İsim
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell">
                  Cari İsim
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider hidden lg:table-cell">
                  Telefon
                </th>
                {isAdmin && (
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider hidden lg:table-cell">
                    Fiyatlandırma
                  </th>
                )}
                {isAdmin && (
                  <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium uppercase tracking-wider hidden sm:table-cell">
                    Durum
                  </th>
                )}
                <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.musteri_no}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-900">
                    {customer.kisa_isim}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 hidden md:table-cell">
                    {customer.cari_isim || '-'}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                    {customer.telefon || '-'}
                  </td>
                  {isAdmin && (
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                      {customer.pricing ? (
                        <div>
                          {customer.pricing.monthly_price ? (
                            <span className="text-green-600 font-medium">
                              {customer.pricing.monthly_price} ₺/ay
                            </span>
                          ) : customer.pricing.per_visit_price ? (
                            <span className="text-blue-600 font-medium">
                              {customer.pricing.per_visit_price} ₺/ziyaret
                            </span>
                          ) : (
                            <span className="text-gray-400">Fiyat tanımlanmamış</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Fiyat tanımlanmamış</span>
                      )}
                    </td>
                  )}
                  {isAdmin && (
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-center hidden sm:table-cell">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(customer.id, customer.is_active !== false); }}
                        className="inline-flex items-center gap-1"
                        title={customer.is_active !== false ? 'Pasif yap' : 'Aktif yap'}
                      >
                        {customer.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <ToggleRight size={14} /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <ToggleLeft size={14} /> Pasif
                          </span>
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-right space-x-2">
                    <button 
                      onClick={() => navigate(`/musteriler/${customer.id}`)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Detay
                    </button>
                    <span className="text-gray-300">|</span>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 size={16} />
                        </button>
                        <span className="text-gray-300">|</span>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={fetchCustomers}
      />

      {selectedCustomer && (
        <EditCustomerModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedCustomer(null);
          }}
          onSave={fetchCustomers}
          customer={selectedCustomer}
        />
      )}

      <BulkPricingModal
        isOpen={isBulkPricingModalOpen}
        onClose={() => setIsBulkPricingModalOpen(false)}
        onSave={fetchCustomers}
        type="customer"
      />
    </div>
  );
};

export default Customers;
