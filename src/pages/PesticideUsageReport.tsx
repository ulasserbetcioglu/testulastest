// src/pages/PesticideUsageReport.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Download, Calendar, Bug, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { localAuth } from '../lib/localAuth';
import { toast } from 'sonner';

// 

// Rapor verisinin arayüzü
interface PesticideUsage {
  id: string;
  created_at: string;
  product_name: string;
  active_ingredient: string | null;
  quantity: number;
  unit: string | null;
  dosage: string | null;
  customer_name: string;
  branch_name: string | null;
  operator_name: string;
  visit_date: string;
}

interface CompanySettings {
  company_name: string;
  logo_url: string;
  website: string;
}

const PesticideUsageReport: React.FC = () => {
  const [reportData, setReportData] = useState<PesticideUsage[]>([]);
  const [isProfileLoading, setIsProfileLoading] = useState(true); 
  const [isReportLoading, setIsReportLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'customer' | 'branch' | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Varsayılan tarih aralığı: Son 3 ay (Veri görebilmek için genişletildi)
  const [startDate, setStartDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [companySettings, setCompanySettings] = useState<CompanySettings>({ company_name: 'İlaçlamatik', logo_url: '', website: 'www.ilaclamatik.com' });
  const reportRef = useRef<HTMLDivElement>(null);

  // 1. Profil ve Ayarları Getir
  useEffect(() => {
    const fetchInitData = async () => {
      setIsProfileLoading(true);
      try {
        // Profil Tespiti
        const localSession = localAuth.getSession();
        
        if (localSession?.type === 'customer' && localSession.id) {
          setUserRole('customer');
          setProfileId(localSession.id);
        } else if (localSession?.type === 'branch' && localSession.id) {
          setUserRole('branch');
          setProfileId(localSession.id);
        } else {
          setError('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
        }

        // Şirket Ayarları
        const { data } = await supabase.from('company_settings').select('company_name, logo_url, website').single();
        if (data) {
          setCompanySettings({
            company_name: data.company_name || 'İlaçlamatik',
            logo_url: data.logo_url || '',
            website: data.website || ''
          });
        }
      } catch (err: any) {
        console.error("Başlangıç verisi hatası:", err);
      } finally {
        setIsProfileLoading(false);
      }
    };

    fetchInitData();
  }, []);

  // 2. Rapor Verisini Çek
  const fetchReportData = useCallback(async () => {
    if (isProfileLoading || !profileId || !userRole) return;
    if (!startDate || !endDate) {
      toast.error("Lütfen tarih aralığı seçin.");
      return;
    }

    setIsReportLoading(true); 
    setError(null);
    setReportData([]); 

    try {
      console.log("1. Rapor sorgusu başlıyor...", { userRole, profileId, startDate, endDate });

      // ADIM 1: İlgili Ziyaretleri Bul
      let visitQuery = supabase
        .from('visits')
        .select('id') 
        .gte('visit_date', startDate) 
        .lte('visit_date', new Date(endDate + 'T23:59:59').toISOString())
        .eq('status', 'completed'); // Sadece tamamlanmış ziyaretler

      if (userRole === 'customer') {
        // Müşteriye ait şubeleri bul
        const { data: branches } = await supabase.from('branches').select('id').eq('customer_id', profileId);
        const branchIds = branches?.map(b => b.id) || [];
        
        // Hem müşteri ID'si hem de şube ID'leri ile eşleşen ziyaretler (Supabase OR syntax)
        if (branchIds.length > 0) {
           visitQuery = visitQuery.or(`customer_id.eq.${profileId},branch_id.in.(${branchIds.join(',')})`);
        } else {
           visitQuery = visitQuery.eq('customer_id', profileId);
        }
      } else {
        visitQuery = visitQuery.eq('branch_id', profileId);
      }

      const { data: visitsData, error: visitsError } = await visitQuery;

      if (visitsError) throw visitsError;
      
      console.log(`2. Bulunan Ziyaret Sayısı: ${visitsData?.length || 0}`);

      if (!visitsData || visitsData.length === 0) {
        toast.info("Seçilen tarih aralığında tamamlanmış ziyaret bulunamadı.");
        setReportData([]); 
        return; 
      }

      const visitIds = visitsData.map(v => v.id);

      // ADIM 2: Kullanılan Ürünleri Bul
      // NOT: Veritabanı ilişkileri (Foreign Keys) doğru kurulmuş olmalı.
      const { data: usageData, error: usageError } = await supabase
        .from('biocidal_products_usage')
        .select(`
          id, created_at, quantity, unit, dosage,
          product:biocidal_products (name, active_ingredient),
          operator:operators (name),
          customer:customers (kisa_isim),
          branch:branches (sube_adi),
          visit:visits (visit_date)
        `)
        .in('visit_id', visitIds)
        .order('created_at', { ascending: false });

      if (usageError) {
        console.error("Biyosidal veri hatası:", usageError);
        throw usageError;
      }

      console.log(`3. Bulunan Kullanım Kaydı: ${usageData?.length || 0}`, usageData);

      if (!usageData || usageData.length === 0) {
        // Veri yoksa uyar ama hata fırlatma
        console.warn("Ziyaret var ancak 'biocidal_products_usage' tablosunda kayıt yok.");
      }

      const formattedData = (usageData || []).map(item => ({
        id: item.id,
        created_at: item.created_at,
        // Eğer ilişki null dönerse 'Silinmiş Ürün' yazsın
        product_name: item.product?.name || 'Belirtilmemiş Ürün', 
        active_ingredient: item.product?.active_ingredient || '-',
        quantity: item.quantity || 0,
        unit: item.unit || 'adet',
        dosage: item.dosage || '-',
        customer_name: item.customer?.kisa_isim || '-',
        branch_name: item.branch?.sube_adi || '-',
        operator_name: item.operator?.name || '-',
        visit_date: item.visit?.visit_date || item.created_at,
      }));

      setReportData(formattedData);

    } catch (err: any) {
      console.error('Rapor hatası:', err);
      setError("Veriler çekilirken bir hata oluştu. Lütfen konsolu kontrol edin.");
      toast.error("Veri hatası: " + err.message);
    } finally {
      setIsReportLoading(false); 
    }
  }, [profileId, userRole, startDate, endDate, isProfileLoading]);

  // Sayfa açılınca veya filtre değişince otomatik çekme
  // useEffect(() => {
  //   if (!isProfileLoading && profileId) {
  //     fetchReportData();
  //   }
  // }, [isProfileLoading, profileId]); 
  // NOT: Otomatik çekmeyi kapattım, butona basınca çeksin, performans için daha iyi.

  const exportToExcel = () => {
    const dataToExport = reportData.map(item => ({
      'Tarih': format(new Date(item.visit_date), 'dd/MM/yyyy'),
      'Şube': item.branch_name,
      'Ürün': item.product_name,
      'Aktif Madde': item.active_ingredient,
      'Miktar': `${item.quantity} ${item.unit}`,
      'Doz': item.dosage,
      'Uygulayan': item.operator_name,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rapor');
    XLSX.writeFile(wb, `Pestisit_Rapor_${startDate}.xlsx`);
  };

  const chartData = useMemo(() => {
    if (reportData.length === 0) return [];
    
    // Ürün bazlı toplam kullanım miktarları
    const productMap = new Map<string, number>();
    
    reportData.forEach(item => {
      const current = productMap.get(item.product_name) || 0;
      productMap.set(item.product_name, current + item.quantity);
    });

    return Array.from(productMap.entries()).map(([name, total]) => ({
      name,
      total
    }));
  }, [reportData]);

  const exportToJPEG = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#fff' });
      const link = document.createElement('a');
      link.download = `Rapor-${startDate}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
          <Bug className="text-green-600" /> Biyosidal Ürün Kullanım Raporu
        </h2>
        <div className="flex gap-2">
          <button onClick={exportToJPEG} disabled={reportData.length === 0} className="btn-secondary flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50">
            <ImageIcon size={18} /> JPEG
          </button>
          <button onClick={exportToExcel} disabled={reportData.length === 0} className="btn-primary flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50">
            <Download size={18} /> Excel
          </button>
        </div>
      </div>

      {/* --- Filtreler --- */}
      <div className="bg-white p-4 rounded-lg shadow-sm border grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <button 
          onClick={fetchReportData} 
          disabled={isReportLoading || isProfileLoading}
          className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex justify-center items-center gap-2 disabled:bg-gray-400"
        >
          {isReportLoading ? <Loader2 className="animate-spin" /> : <Calendar size={18} />}
          Raporu Getir
        </button>
      </div>

      {/* --- Uyarı / Hata Alanı --- */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
          <p className="font-bold">Hata</p>
          <p>{error}</p>
        </div>
      )}

      {/* --- Rapor İçeriği --- */}
      <div ref={reportRef} className="bg-white rounded-lg shadow-lg overflow-hidden min-h-[400px]">
        
        {/* Rapor Header (Logo vs) */}
        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {companySettings.logo_url && (
              <img src={companySettings.logo_url} alt="Logo" className="h-12 object-contain" crossOrigin="anonymous" />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-800">{companySettings.company_name}</h1>
              <p className="text-xs text-gray-500">Kullanım Detay Raporu</p>
            </div>
          </div>
          <div className="text-right">
             <div className="text-sm text-gray-500">Dönem</div>
             <div className="font-semibold">{format(new Date(startDate), 'dd.MM.yyyy')} - {format(new Date(endDate), 'dd.MM.yyyy')}</div>
          </div>
        </div>

        {/* --- Veri Tablosu veya Boş Durum --- */}
        {isReportLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-2 text-blue-500" />
            <p>Veriler işleniyor...</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <AlertTriangle className="w-12 h-12 mb-2 opacity-50" />
            <p>Bu tarih aralığında kayıtlı pestisit kullanımı bulunamadı.</p>
            <p className="text-sm mt-1">Lütfen tarihi genişletmeyi veya 'biocidal_products_usage' tablosunu kontrol etmeyi deneyin.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Tarih</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Şube</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Ürün</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Aktif Madde</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Miktar</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Uygulayan</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{format(new Date(row.visit_date), 'dd.MM.yyyy')}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.branch_name}</td>
                      <td className="px-6 py-4 text-sm text-blue-600 font-medium">{row.product_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{row.active_ingredient}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 font-bold">{row.quantity} <span className="text-xs font-normal text-gray-500">{row.unit}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.operator_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* --- Grafikler --- */}
            <div className="p-6 border-t bg-gray-50">
              <h3 className="font-bold text-gray-700 mb-4">Ürün Bazlı Tüketim Özeti</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} name="Miktar" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PesticideUsageReport;