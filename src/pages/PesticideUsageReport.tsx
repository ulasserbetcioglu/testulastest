// src/pages/PesticideUsageReport.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Download, Calendar, Bug } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '../components/Auth/AuthProvider'; // AuthProvider'dan 'user' alınır

// Rapor verisinin arayüzü
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

// Ürünleri filtrelemek için kullanılacak anahtar kelimeler
const PESTICIDE_KEYWORDS = ['biyosidal', 'pestisit', 'insektisit', 'rodentisit', 'ilaç'];

const PesticideUsageReport: React.FC = () => {
  const { user } = useAuth(); // AuthContext'ten 'user' alınır
  
  const [reportData, setReportData] = useState<PesticideUsage[]>([]);
  const [loading, setLoading] = useState(true); // Başlangıçta true
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'customer' | 'branch' | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Tarih filtreleri
  const [startDate, setStartDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // DÜZELTME: Kullanıcı profili bulma (Daha sağlam hata yönetimi ile)
  useEffect(() => {
    if (!user) {
      setLoading(true); // 'user' beklenirken yükleniyor ekranı göster
      return; 
    }

    const fetchUserProfile = async () => {
      try { // ✅ DÜZELTME 1: try...catch bloğu eklendi
        // Önce Müşteri mi diye bak
        let { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('auth_id', user.id)
          .single();

        // 'PGRST116' (No rows found) bir hata değildir, sadece kayıt yok demektir.
        if (customerError && customerError.code !== 'PGRST116') {
          throw customerError; // Gerçek bir veritabanı hatasıysa fırlat
        }

        if (customerData) {
          setUserRole('customer');
          setProfileId(customerData.id);
          return; // Profili bulduk, çık
        }

        // Müşteri değilse Şube mi diye bak
        let { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id')
          .eq('auth_id', user.id)
          .single();

        if (branchError && branchError.code !== 'PGRST116') {
          throw branchError; // Gerçek bir veritabanı hatasıysa fırlat
        }

        if (branchData) {
          setUserRole('branch');
          setProfileId(branchData.id);
          return; // Profili bulduk, çık
        }

        // Ne müşteri ne de şube ise (örn: admin panele girmiş olabilir)
        setError('Bu kullanıcı için yetkili Müşteri veya Şube profili bulunamadı.');
        setLoading(false); // Yüklemeyi durdur ve hata göster

      } catch (err: any) { // ✅ DÜZELTME 2: catch bloğu
        console.error("Profil alınırken hata oluştu:", err);
        setError(`Profil bilgisi alınamadı: ${err.message}`);
        setLoading(false); // Hata olursa, yüklemeyi durdur.
      }
    };

    fetchUserProfile();
  }, [user]); // Bağımlılık: user

  // Rapor verisini çek
  const fetchReportData = useCallback(async () => {
    // profileId veya userRole henüz ayarlanmadıysa bekle
    if (!profileId || !userRole) {
      // Eğer 'user' var ama 'profileId' henüz gelmediyse
      // ve bir hata da ayarlanmadıysa, yükleniyor durumunda kal.
      if (user && !error) {
        setLoading(true);
      }
      return;
    }

    if (!startDate || !endDate) {
      setError("Lütfen geçerli bir tarih aralığı seçin.");
      setLoading(false);
      return;
    }

    setLoading(true); // Veri çekme işlemi başlıyor
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
        
        visitQuery = visitQuery.or(
          `customer_id.eq.${profileId},branch_id.in.(${branchIds.join(',')})`
        );
      } else {
        visitQuery = visitQuery.eq('branch_id', profileId);
      }

      const { data: visits, error: visitsError } = await visitQuery
        .eq('status', 'completed')
        .gte('visit_date', startDate)
        .lte('visit_date', new Date(endDate + 'T23:59:59').toISOString());

      if (visitsError) throw visitsError;
      
      if (!visits || visits.length === 0) {
        setReportData([]);
        // setLoading(false) -> finally bloğu halledecek
        return;
      }

      const visitIds = visits.map(v => v.id);

      // 2. Bu ziyaretlerde kullanılan ürünleri (satışları) bul
      const { data: sales, error: salesError } = await supabase
        .from('paid_material_sale_items')
        .select(`
          id,
          quantity,
          sale:paid_material_sales (
            sale_date,
            visit:visits (
              customer:customers (kisa_isim),
              branch:branches (sube_adi),
              operator:operators (name)
            )
          ),
          product:product_id (name, unit, type, category)
        `)
        .in('sale:visit_id', visitIds)
        .order('sale_date', { referencedTable: 'paid_material_sales', ascending: false });

      if (salesError) throw salesError;

      // 3. Veriyi filtrele ve düzelt (Sadece Pestisit/Biyosidal olanlar)
      const filteredData = sales
        .map(item => {
          const productName = item.product?.name?.toLowerCase() || '';
          const productType = item.product?.type?.toLowerCase() || '';
          const productCategory = item.product?.category?.toLowerCase() || '';

          const isPesticide = PESTICIDE_KEYWORDS.some(keyword => 
            productName.includes(keyword) || 
            productType.includes(keyword) ||
            productCategory.includes(keyword)
          );

          if (!isPesticide || !item.product || !item.sale || !item.sale.visit) return null;

          return {
            id: item.id,
            sale_date: item.sale.sale_date,
            product_name: item.product.name,
            quantity: item.quantity,
            unit: item.product.unit || 'adet',
            customer_name: item.sale.visit.customer?.kisa_isim || 'N/A',
            branch_name: item.sale.visit.branch?.sube_adi || null,
            operator_name: item.sale.visit.operator?.name || 'N/A',
          };
        })
        .filter(Boolean) as PesticideUsage[];

      setReportData(filteredData);

    } catch (err: any) {
      console.error('Rapor verisi alınırken hata:', err);
      setError(err.message);
    } finally {
      // ✅ DÜZELTME 3: Hata da olsa, kayıt bulunamasa da, başarı da olsa
      // 'finally' bloğu çalışır ve yüklemeyi durdurur.
      setLoading(false); 
    }
  }, [profileId, userRole, startDate, endDate, user, error]); // 'error'u bağımlılığa ekledik

  // Raporu otomatik çekmek için
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

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

  // JSX (Görünüm)
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
              onClick={fetchReportData} // Manuel olarak da tetiklenebilir
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Calendar size={20} />}
              Raporu Getir
            </button>
          </div>
        </div>
      </div>

      {/* Hata mesajı */}
      {!loading && error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          Hata: {error}
        </div>
      )}

      {/* Yükleniyor durumu */}
      {loading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          <span className="ml-3 text-gray-600">Rapor yükleniyor...</span>
        </div>
      )}

      {/* Rapor Tablosu (Yüklenmiyorsa ve Hata yoksa) */}
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
