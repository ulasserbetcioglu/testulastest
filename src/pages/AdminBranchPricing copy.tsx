import React, { useState, useEffect } from 'react';

import { supabase } from '../lib/supabase';

import { Search, Download, Upload, DollarSign, Filter } from 'lucide-react';

import BulkPricingModal from '../components/Customers/BulkPricingModal';

import * as XLSX from 'xlsx';

import { toast } from 'sonner';



interface Branch {

  id: string;

  sube_adi: string;

  customer: {

    id: string;

    kisa_isim: string;

  };

  pricing?: {

    id: string;

    monthly_price: number | null;

    per_visit_price: number | null;

  };

}



const AdminBranchPricing: React.FC = () => {

  const [branches, setBranches] = useState<Branch[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState<string>('');

  const [customers, setCustomers] = useState<{id: string, kisa_isim: string}[]>([]);

  const [isBulkPricingModalOpen, setIsBulkPricingModalOpen] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);



  useEffect(() => {

    checkAdminAccess();

    fetchData();

  }, []);



  const checkAdminAccess = async () => {

    const { data: { user } } = await supabase.auth.getUser();

    setIsAdmin(user?.email === 'admin@ilaclamatik.com');

    

    if (user?.email !== 'admin@ilaclamatik.com') {

      setError('Bu sayfaya erişim yetkiniz bulunmamaktadır.');

    }

  };



  const fetchData = async () => {

    try {

      setLoading(true);

      

      // Fetch customers

      const { data: customersData, error: customersError } = await supabase

        .from('customers')

        .select('id, kisa_isim')

        .order('kisa_isim');

        

      if (customersError) throw customersError;

      setCustomers(customersData || []);

      

      // Fetch branches with pricing

      const { data, error } = await supabase

        .from('branches')

        .select(`

          id,

          sube_adi,

          customer:customer_id (id, kisa_isim),

          pricing:branch_pricing (id, monthly_price, per_visit_price)

        `)

        .order('sube_adi');

        

      if (error) throw error;

      

      setBranches(data || []);

    } catch (err: any) {

      setError(err.message);

      console.error('Error fetching data:', err);

    } finally {

      setLoading(false);

    }

  };



  const exportToExcel = () => {

    const data = branches.map(branch => ({

      'Şube Adı': branch.sube_adi,

      'Müşteri': branch.customer?.kisa_isim || 'Bilinmiyor',

      'Aylık Fiyat': branch.pricing?.monthly_price || '',

      'Ziyaret Başı Fiyat': branch.pricing?.per_visit_price || '',

      'Fiyatlandırma Türü': branch.pricing?.monthly_price ? 'Aylık' : 

                           branch.pricing?.per_visit_price ? 'Ziyaret Başı' : 'Yok'

    }));



    const ws = XLSX.utils.json_to_sheet(data);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, 'Şube Fiyatlandırma');

    XLSX.writeFile(wb, 'sube_fiyatlandirma.xlsx');

  };



  const filteredBranches = branches.filter(branch => {

    const matchesSearch = 

      branch.sube_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||

      branch.customer?.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase());

    

    const matchesCustomer = !selectedCustomer || branch.customer?.id === selectedCustomer;

    

    return matchesSearch && matchesCustomer;

  });



  if (loading) return <div>Yükleniyor...</div>;

  if (error) return <div>Hata: {error}</div>;

  if (!isAdmin) return <div>Bu sayfaya erişim yetkiniz bulunmamaktadır.</div>;



  return (

    <div className="space-y-6">

      <div className="flex justify-between items-center">

        <h1 className="text-2xl font-bold text-gray-800">ŞUBE FİYATLANDIRMA</h1>

        <div className="flex gap-2">

          <button

            onClick={exportToExcel}

            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"

          >

            <Download size={20} />

            Excel

          </button>

          

          <button

            onClick={() => setIsBulkPricingModalOpen(true)}

            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-2"

          >

            <DollarSign size={20} />

            Toplu Fiyatlandırma

          </button>

        </div>

      </div>



      <div className="bg-white rounded-lg shadow p-4">

        <div className="flex flex-col md:flex-row gap-4">

          <div className="flex-1 relative">

            <input

              type="text"

              placeholder="Şube veya müşteri adı ara..."

              value={searchTerm}

              onChange={(e) => setSearchTerm(e.target.value)}

              className="w-full pl-10 pr-4 py-2 border rounded"

            />

            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />

          </div>

          

          <select

            value={selectedCustomer}

            onChange={(e) => setSelectedCustomer(e.target.value)}

            className="w-full md:w-64 p-2 border rounded"

          >

            <option value="">Tüm Müşteriler</option>

            {customers.map(customer => (

              <option key={customer.id} value={customer.id}>

                {customer.kisa_isim}

              </option>

            ))}

          </select>

        </div>

      </div>



      <div className="bg-white rounded-lg shadow overflow-hidden">

        <div className="overflow-x-auto">

          <table className="min-w-full divide-y divide-gray-200">

            <thead className="bg-gray-50">

              <tr>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                  Şube Adı

                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                  Müşteri

                </th>

                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">

                  Fiyatlandırma Türü

                </th>

                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">

                  Fiyat

                </th>

              </tr>

            </thead>

            <tbody className="bg-white divide-y divide-gray-200">

              {filteredBranches.length === 0 ? (

                <tr>

                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">

                    {searchTerm || selectedCustomer ? 'Arama kriterine uygun şube bulunamadı' : 'Henüz şube bulunmuyor'}

                  </td>

                </tr>

              ) : (

                filteredBranches.map((branch) => (

                  <tr key={branch.id} className="hover:bg-gray-50">

                    <td className="px-6 py-4 whitespace-nowrap">

                      <div className="text-sm font-medium text-gray-900">{branch.sube_adi}</div>

                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">

                      <div className="text-sm text-gray-500">{branch.customer?.kisa_isim || 'Bilinmiyor'}</div>

                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">

                      {branch.pricing?.monthly_price ? (

                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">

                          Aylık

                        </span>

                      ) : branch.pricing?.per_visit_price ? (

                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">

                          Ziyaret Başı

                        </span>

                      ) : (

                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">

                          Tanımlanmamış

                        </span>

                      )}

                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">

                      {branch.pricing?.monthly_price ? (

                        <span className="text-blue-600 font-medium">

                          {branch.pricing.monthly_price.toLocaleString('tr-TR')} ₺/ay

                        </span>

                      ) : branch.pricing?.per_visit_price ? (

                        <span className="text-green-600 font-medium">

                          {branch.pricing.per_visit_price.toLocaleString('tr-TR')} ₺/ziyaret

                        </span>

                      ) : (

                        <span className="text-gray-400">-</span>

                      )}

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>



      <BulkPricingModal

        isOpen={isBulkPricingModalOpen}

        onClose={() => setIsBulkPricingModalOpen(false)}

        onSave={fetchData}

        type="branch"

      />

    </div>

  );

};



export default AdminBranchPricing;