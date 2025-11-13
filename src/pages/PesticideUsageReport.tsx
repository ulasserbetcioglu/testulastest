// src/pages/PesticideUsageReport.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Download, Calendar, Bug } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
// import { useAuth } from '../components/Auth/AuthProvider'; // <-- ARTIK KULLANILMIYOR
import { localAuth } from '../lib/localAuth'; // ✅ DÜZELTME: localAuth import edildi

// Rapor verisinin arayüzü
interface PesticideUsage {
  id: string;
  created_at: string;
  product_name: string;
  quantity: number;
  unit: string | null;
  dosage: string | null;
  customer_name: string;
  branch_name: string | null;
  operator_name: string;
  visit_date: string;
}

const PesticideUsageReport: React.FC = () => {
  // const { user } = useAuth(); // <-- ARTIK KULLANILMIYOR
  
  const [reportData, setReportData] = useState<PesticideUsage[]>([]);
  const [isProfileLoading, setIsProfileLoading] = useState(true); 
  const [isReportLoading, setIsReportLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'customer' | 'branch' | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // 1. Aşama: Kullanıcı profili bulma (localAuth kullanarak)
  useEffect(() => {
    const fetchUserProfile = () => {
      setIsProfileLoading(true);
      try {
        // ✅ DÜZELTME: Profil tespiti localAuth'tan yapılıyor
        const localSession = localAuth.getSession();
        
        if (localSession && localSession.type === 'customer') {
          setUserRole('customer');
          // 'CustomerLayout' 'localSession.name' kullanıyor.
          // 'PesticideUsageReport' ise ID'ye ihtiyaç duyar.
          // 'localAuth.ts' dosyanızın 'id' (profile_id) sakladığını varsayıyorum.
          if (!localSession.id) {
             setError("localAuth oturumunda profil ID bulunamadı. Lütfen localAuth.ts dosyanızı kontrol edin.");
             return;
          }
          setProfileId(localSession.id);

        } else if (localSession && localSession.type === 'branch') {
          setUserRole('branch');
          if (!localSession.id) {
             setError("localAuth oturumunda profil ID bulunamadı. Lütfen localAuth.ts dosyanızı kontrol edin.");
             return;
          }
          setProfileId(localSession.id);

        } else {
          // Eğer localSession yoksa veya tipi uymuyorsa
          setError('Geçerli bir Müşteri veya Şube oturumu bulunamadı.');
        }

      } catch (err: any) {
        console.error("Profil alınırken hata oluştu:", err);
        setError(`Profil bilgisi alınamadı: ${err.message}`);
      } finally {
        setIsProfileLoading(false); // Profil yüklemesi bitti
      }
    };

    fetchUserProfile();
  }, []); // Artık 'user' objesine bağlı değil, sadece sayfa yüklendiğinde çalışır

  // 2. Aşama: Rapor verisini çek
  const fetchReportData = useCallback(async () => {
    if (isProfileLoading || !profileId || !userRole) {
      return;
    }

    if (!startDate || !endDate) {
      setError("Lütfen geçerli bir tarih aralığı seçin.");
      return;
    }

    setIsReportLoading(true); 
    setError(null);
    setReportData([]); 

    try {
      // ADIM 1: Önce tarih aralığına ve role uyan ZİYARET ID'lerini bul.
      let visitQuery = supabase
        .from('visits')
        .select('id') 
        .gte('visit_date', startDate) 
        .lte('visit_date', new Date(endDate + 'T23:59:59').toISOString())
        .eq('status', 'completed');

      if (userRole === 'customer') {
        const { data: branches, error: branchError } = await supabase
            .from('branches')
            .select('id')
            .eq('customer_id', profileId);

        if (branchError) throw branchError;

        const branchIds = branches.map(b => b.id);
        visitQuery = visitQuery.or(
            `customer_id.eq.${profileId},branch_id.in.(${branchIds.join(',') || 'null'})`
        );

      } else { // userRole === 'branch'
        visitQuery = visitQuery.eq('branch_id', profileId);
      }

      const { data: visitsData, error: visitsError } = await visitQuery;
      if (visitsError) throw visitsError;

      if (!visitsData || visitsData.length === 0) {
        setReportData([]); 
        return; 
      }

      const visitIds = visitsData.map(v => v.id);

      // ADIM 2: 'biocidal_products_usage' tablosunu bu ZİYARET ID'leri ile sorgula.
      const { data, error: queryError } = await supabase
        .from('biocidal_products_usage')
        .select(`
          id,
          created_at,
          quantity,
          unit,
          dosage,
          product:biocidal_products (name),
          operator:operators (name),
          customer:customers (kisa_isim),
          branch:branches (sube_adi),
          visit:visits (visit_date)
        `)
        .in('visit_id', visitIds) 
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      const formattedData = data.map(item => ({
        id: item.id,
        created_at: item.created_at,
        product_name: item.product?.name || 'Bilinmeyen Ürün',
        quantity: item.quantity,
        unit: item.unit,
        dosage: item.dosage,
        customer_name: item.customer?.kisa_isim || 'N/A',
        branch_name: item.branch?.sube_adi || null,
        operator_name: item.operator?.name || 'N/A',
        visit_date: item.visit?.visit_date || item.created_at, 
      }));

      setReportData(formattedData);

    } catch (err: any) {
      console.error('Rapor verisi alınırken hata:', err);
      setError(err.message);
    } finally {
      setIsReportLoading(false); 
    }
  }, [profileId, userRole, startDate, endDate, isProfileLoading]);

  // Raporu otomatik çekmek için
  useEffect(() => {
    if (!isProfileLoading && profileId) {
      fetchReportData();
    }
  }, [isProfileLoading, profileId, fetchReportData, startDate, endDate]); 

  const exportToExcel = () => {
    const dataToExport = reportData.map(item => ({
      'Tarih': format(new Date(item.visit_date), 'dd/MM/yyyy'),
      'Müşteri': item.customer_name,
      'Şube': item.branch_name || '-',
      'Ürün Adı': item.product_name,
      'Doz': item.dosage || '-', 
      'Miktar': item.quantity,
      'Birim': item.unit || 'adet',
      'Uygulayan Operatör': item.operator_name,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pestisit Kullanım Raporu');
    XLSX.writeFile(wb, `Pestisit_Kullanim_Raporu_${startDate}_${endDate}.xlsx`);
  };

  const isLoading = isProfileLoading || isReportLoading;

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
          disabled={isLoading || reportData.length === 0}
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
              disabled={isLoading} 
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Calendar size={20} />}
              Raporu Getir
            </button>
          </div>
        </div>
      </div>

      {/* Hata mesajı */}
      {!isLoading && error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          Hata: {error}
        </div>
      )}

      {/* Yükleniyor durumu */}
      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          <span className="ml-3 text-gray-600">
            {isProfileLoading ? "Profil doğrulanıyor..." : "Rapor yükleniyor..."}
          </span>
        </div>
      )}

      {/* Rapor Tablosu */}
      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasyon</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doz</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uygulayan</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Belirtilen tarihler arasında pestisit kullanımı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  reportData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {format(new Date(item.visit_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.branch_name || item.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {item.product_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.dosage || '-'} 
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