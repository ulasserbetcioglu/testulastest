// src/pages/PesticideUsageReport.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Download, Calendar, Bug } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '../components/Auth/AuthProvider';

interface PesticideUsage {
  id: string;
  sale_date: string;
  product_name: string;
  quantity: number;
  unit: string;
  customer_name: string;
  branch_name: string | null;
  operator_name: string;
}

const PESTICIDE_KEYWORDS = ['biyosidal', 'pestisit', 'insektisit', 'rodentisit', 'ilaç'];

const PesticideUsageReport: React.FC = () => {
  const { user } = useAuth();
  
  const [reportData, setReportData] = useState<PesticideUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'customer' | 'branch' | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // 🔧 DÜZELTME: Kullanıcı profili bulma
  useEffect(() => {
    if (!user) {
      setLoading(true);
      return; 
    }

    const fetchUserProfile = async () => {
      try {
        // Önce Müşteri mi diye bak
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle(); // 🔧 single() yerine maybeSingle() kullan

        if (customerError && customerError.code !== 'PGRST116') {
          throw customerError;
        }

        if (customerData) {
          console.log('✅ Müşteri profili bulundu:', customerData.id);
          setUserRole('customer');
          setProfileId(customerData.id);
          setLoading(false); // 🔧 Profil bulununca loading'i kapat
          return;
        }

        // Değilse Şube mi diye bak
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle(); // 🔧 single() yerine maybeSingle() kullan

        if (branchError && branchError.code !== 'PGRST116') {
          throw branchError;
        }

        if (branchData) {
          console.log('✅ Şube profili bulundu:', branchData.id);
          setUserRole('branch');
          setProfileId(branchData.id);
          setLoading(false); // 🔧 Profil bulununca loading'i kapat
          return;
        }

        // Hiçbir profil bulunamadı
        console.error('❌ Profil bulunamadı');
        setError('Yetkili profil bulunamadı.');
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Profil çekme hatası:', err);
        setError('Profil yüklenirken hata: ' + err.message);
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  // 🔧 DÜZELTME: Rapor verisini çek
  const fetchReportData = useCallback(async () => {
    // Profil henüz yüklenmemişse bekle
    if (!profileId || !userRole) {
      console.log('⏳ Profil bekleniyor...');
      return;
    }

    if (!startDate || !endDate) {
      setError("Tarih aralığı seçmelisiniz.");
      setLoading(false);
      return;
    }

    console.log('📊 Rapor çekiliyor...', { profileId, userRole, startDate, endDate });
    setLoading(true);
    setError(null);

    try {
      // 1. Ziyaretleri bul
      let visitQuery = supabase.from('visits').select('id');

      if (userRole === 'customer') {
        const { data: branches, error: branchError } = await supabase
          .from('branches')
          .select('id')
          .eq('customer_id', profileId);
        
        if (branchError) throw branchError;
        
        const branchIds = branches ? branches.map(b => b.id) : [];
        
        // 🔧 DÜZELTME: Eğer şube yoksa sadece customer_id kontrolü yap
        if (branchIds.length > 0) {
          visitQuery = visitQuery.or(
            `customer_id.eq.${profileId},branch_id.in.(${branchIds.join(',')})`
          );
        } else {
          visitQuery = visitQuery.eq('customer_id', profileId);
        }
      } else {
        visitQuery = visitQuery.eq('branch_id', profileId);
      }

      const { data: visits, error: visitsError } = await visitQuery
        .eq('status', 'completed')
        .gte('visit_date', startDate)
        .lte('visit_date', new Date(endDate + 'T23:59:59').toISOString());

      if (visitsError) throw visitsError;
      
      console.log('📍 Ziyaretler bulundu:', visits?.length || 0);

      if (!visits || visits.length === 0) {
        setReportData([]);
        setLoading(false);
        return;
      }

      const visitIds = visits.map(v => v.id);

      // 2. Bu ziyaretlerde kullanılan ürünleri (satışları) bul
      // 🔧 DÜZELTME: Query düzeltildi
      const { data: sales, error: salesError } = await supabase
        .from('paid_material_sale_items')
        .select(`
          id,
          quantity,
          paid_material_sales!inner (
            sale_date,
            visit_id,
            visits!inner (
              customer:customers (kisa_isim),
              branch:branches (sube_adi),
              operator:operators (name)
            )
          ),
          products!inner (name, unit, type, category)
        `)
        .in('paid_material_sales.visit_id', visitIds);

      if (salesError) {
        console.error('❌ Satış verisi hatası:', salesError);
        throw salesError;
      }

      console.log('🛒 Satışlar bulundu:', sales?.length || 0);

      // 3. Veriyi filtrele ve düzelt
      const filteredData = sales
        .map((item: any) => {
          const productName = item.products?.name?.toLowerCase() || '';
          const productType = item.products?.type?.toLowerCase() || '';
          const productCategory = item.products?.category?.toLowerCase() || '';

          const isPesticide = PESTICIDE_KEYWORDS.some(keyword => 
            productName.includes(keyword) || 
            productType.includes(keyword) ||
            productCategory.includes(keyword)
          );

          if (!isPesticide || !item.products || !item.paid_material_sales) return null;

          const visit = item.paid_material_sales.visits;
          
          return {
            id: item.id,
            sale_date: item.paid_material_sales.sale_date,
            product_name: item.products.name,
            quantity: item.quantity,
            unit: item.products.unit || 'adet',
            customer_name: visit?.customer?.kisa_isim || 'N/A',
            branch_name: visit?.branch?.sube_adi || null,
            operator_name: visit?.operator?.name || 'N/A',
          };
        })
        .filter(Boolean) as PesticideUsage[];

      console.log('✅ Filtrelenmiş pestisit verileri:', filteredData.length);
      setReportData(filteredData);

    } catch (err: any) {
      console.error('❌ Rapor verisi alınırken hata:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [profileId, userRole, startDate, endDate]);

  // 🔧 DÜZELTME: Raporu otomatik çek
  useEffect(() => {
    if (profileId && userRole) {
      console.log('🚀 Rapor otomatik çekiliyor...');
      fetchReportData();
    }
  }, [profileId, userRole, startDate, endDate]); // fetchReportData değil, bağımlılıkları direkt kullan

  const exportToExcel = () => {
    const dataToExport = reportData.map(item => ({
      'Tarih': format(new Date(item.sale_date), 'dd/MM/yyyy'),
      'Müşteri': item.customer_name,
      'Şube': item.branch_name || '-',
      'Ürün Adı': item.product_name,
      'Miktar': item.quantity,
      'Birim': item.unit,
      'Uygulayan Operatör': item.operator_name,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pestisit Kullanım Raporu');
    XLSX.writeFile(wb, `Pestisit_Kullanim_Raporu_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold flex items-center gap-3">
          <Bug className="w-7 h-7 text-green-700" />
          Pestisit Kullanım Raporu
        </h2>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          disabled={loading || reportData.length === 0}
        >
          <Download size={20} />
          Excel Olarak Aktar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        <h3 className="font-medium">Filtreler</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="self-end">
            <button
              onClick={fetchReportData}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Calendar size={20} />}
              Raporu Getir
            </button>
          </div>
        </div>
      </div>

      {!loading && error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          Hata: {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          <span className="ml-3 text-gray-600">Rapor yükleniyor...</span>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasyon</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uygulayan</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Belirtilen tarihler arasında pestisit kullanımı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  reportData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {format(new Date(item.sale_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.branch_name || item.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {item.product_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.operator_name}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PesticideUsageReport;