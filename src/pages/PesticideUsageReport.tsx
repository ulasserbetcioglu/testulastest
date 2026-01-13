// src/pages/PesticideUsageReport.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Loader2, Download, Calendar, Bug, Image as ImageIcon, 
  AlertTriangle, Droplets, Package, Filter, Building2 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { localAuth } from '../lib/localAuth';
import { toast } from 'sonner';

// --- Arayüzler ---
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

interface BranchOption {
  id: string;
  sube_adi: string;
}

const PesticideUsageReport: React.FC = () => {
  // --- State Yönetimi ---
  const [reportData, setReportData] = useState<PesticideUsage[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]); // Şube listesi
  const [selectedBranchId, setSelectedBranchId] = useState<string>(''); // Seçili şube filtresi

  const [isProfileLoading, setIsProfileLoading] = useState(true); 
  const [isReportLoading, setIsReportLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  
  const [userRole, setUserRole] = useState<'customer' | 'branch' | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Tarih Filtreleri (Varsayılan: Son 3 ay)
  const [startDate, setStartDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [companySettings, setCompanySettings] = useState<CompanySettings>({ company_name: 'İlaçlamatik', logo_url: '', website: '' });
  const reportRef = useRef<HTMLDivElement>(null);

  // 1. Profil, Şirket Ayarları ve Şube Listesini Getir
  useEffect(() => {
    const fetchInitData = async () => {
      setIsProfileLoading(true);
      try {
        const localSession = localAuth.getSession();
        
        if (localSession?.type === 'customer' && localSession.id) {
          setUserRole('customer');
          setProfileId(localSession.id);

          // Müşteriye ait şubeleri çek (Filtreleme için)
          const { data: branchData } = await supabase
            .from('branches')
            .select('id, sube_adi')
            .eq('customer_id', localSession.id)
            .order('sube_adi');
          setBranches(branchData || []);

        } else if (localSession?.type === 'branch' && localSession.id) {
          setUserRole('branch');
          setProfileId(localSession.id);
          // Şube kullanıcısı zaten sadece kendi şubesini görür, filtreye gerek yok (veya tek seçenek)
        } else {
          setError('Oturum bilgisi bulunamadı.');
        }

        // Şirket Bilgileri
        const { data } = await supabase.from('company_settings').select('company_name, logo_url, website').single();
        if (data) {
          setCompanySettings({
            company_name: data.company_name || 'İlaçlamatik',
            logo_url: data.logo_url || '',
            website: data.website || ''
          });
        }
      } catch (err: any) {
        console.error("Veri hatası:", err);
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
      // ADIM 1: Ziyaretleri Bul
      let visitQuery = supabase
        .from('visits')
        .select('id') 
        .gte('visit_date', startDate) 
        .lte('visit_date', new Date(endDate + 'T23:59:59').toISOString())
        .eq('status', 'completed');

      if (userRole === 'customer') {
        if (selectedBranchId) {
          // Eğer filtre seçiliyse sadece o şubenin ziyaretlerini getir
          visitQuery = visitQuery.eq('branch_id', selectedBranchId);
        } else {
          // Filtre yoksa müşterinin TÜM şubelerini getir
          visitQuery = visitQuery.eq('customer_id', profileId);
        }
      } else {
        // Şube kullanıcısı sadece kendi şubesini görür
        visitQuery = visitQuery.eq('branch_id', profileId);
      }

      const { data: visitsData, error: visitsError } = await visitQuery;
      if (visitsError) throw visitsError;
      
      if (!visitsData || visitsData.length === 0) {
        toast.info("Seçilen kriterlerde tamamlanmış ziyaret bulunamadı.");
        setReportData([]); 
        return; 
      }

      const visitIds = visitsData.map(v => v.id);

      // ADIM 2: Kullanım Verilerini Çek
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

      if (usageError) throw usageError;

      const formattedData = (usageData || []).map(item => ({
        id: item.id,
        created_at: item.created_at,
        product_name: item.product?.name || 'Belirtilmemiş Ürün', 
        active_ingredient: item.product?.active_ingredient || 'Belirtilmemiş', 
        quantity: Number(item.quantity) || 0,
        unit: item.unit ? item.unit.toLowerCase().trim() : 'adet',
        dosage: item.dosage || '-',
        customer_name: item.customer?.kisa_isim || '-',
        branch_name: item.branch?.sube_adi || '-',
        operator_name: item.operator?.name || '-',
        visit_date: item.visit?.visit_date || item.created_at,
      }));

      setReportData(formattedData);

    } catch (err: any) {
      console.error('Rapor hatası:', err);
      setError("Veriler çekilirken bir hata oluştu.");
      toast.error("Veri hatası: " + err.message);
    } finally {
      setIsReportLoading(false); 
    }
  }, [profileId, userRole, startDate, endDate, isProfileLoading, selectedBranchId]); // selectedBranchId değişince fonksiyon güncellenir

  // --- Veri Aggregation (Sıvı/Katı ve Aktif Maddeye Göre Gruplama) ---
  const aggregatedData = useMemo(() => {
    const summary: Record<string, { liquid: number, solid: number }> = {};

    reportData.forEach(item => {
      // Gruplama Anahtarı: Aktif Madde (Yoksa ürün adı)
      const ingredient = item.active_ingredient && item.active_ingredient !== 'Belirtilmemiş' 
        ? item.active_ingredient 
        : item.product_name;
      
      const unit = item.unit || '';
      let qty = item.quantity;

      if (!summary[ingredient]) {
        summary[ingredient] = { liquid: 0, solid: 0 };
      }

      // --- Birim Dönüşümleri ---
      // SIVI (Hedef: ml)
      if (['ml', 'mililitre', 'cc'].includes(unit)) {
        summary[ingredient].liquid += qty;
      } else if (['l', 'lt', 'litre'].includes(unit)) {
        summary[ingredient].liquid += qty * 1000;
      }
      // KATI (Hedef: gr)
      else if (['gr', 'gram', 'g'].includes(unit)) {
        summary[ingredient].solid += qty;
      } else if (['kg', 'kilogram'].includes(unit)) {
        summary[ingredient].solid += qty * 1000;
      }
    });

    // Grafik formatına çevir
    const chartDataLiquid = Object.entries(summary)
      .filter(([_, vals]) => vals.liquid > 0)
      .map(([name, vals]) => ({ name, value: Number(vals.liquid.toFixed(0)) })) // Tam sayı
      .sort((a, b) => b.value - a.value); // Çoktan aza sırala

    const chartDataSolid = Object.entries(summary)
      .filter(([_, vals]) => vals.solid > 0)
      .map(([name, vals]) => ({ name, value: Number(vals.solid.toFixed(0)) }))
      .sort((a, b) => b.value - a.value);

    return { chartDataLiquid, chartDataSolid, summary };
  }, [reportData]);

  // Excel Çıktısı
  const exportToExcel = () => {
    const dataToExport = reportData.map(item => ({
      'Tarih': format(new Date(item.visit_date), 'dd/MM/yyyy'),
      'Şube': item.branch_name,
      'Ürün Adı': item.product_name,
      'Aktif Madde': item.active_ingredient,
      'Miktar': item.quantity,
      'Birim': item.unit,
      'Doz': item.dosage,
      'Uygulayan': item.operator_name,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detaylı Liste');
    
    // Özet Sayfası da eklenebilir
    const summaryData = [
        { Tür: 'SIVI TÜKETİM (ml)', 'Aktif Madde': '', Miktar: '' },
        ...aggregatedData.chartDataLiquid.map(d => ({ Tür: 'Sıvı', 'Aktif Madde': d.name, Miktar: d.value })),
        { Tür: '', 'Aktif Madde': '', Miktar: '' },
        { Tür: 'KATI TÜKETİM (gr)', 'Aktif Madde': '', Miktar: '' },
        ...aggregatedData.chartDataSolid.map(d => ({ Tür: 'Katı', 'Aktif Madde': d.name, Miktar: d.value }))
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Özet Tablo');

    XLSX.writeFile(wb, `Pestisit_Kullanim_${startDate}_${endDate}.xlsx`);
  };

  // JPEG İndirme
  const exportToJPEG = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#fff', useCORS: true });
      const link = document.createElement('a');
      link.download = `Pestisit_Raporu_${startDate}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (e) { console.error(e); toast.error("Resim oluşturulamadı"); }
  };

  return (
    <div className="space-y-6">
      
      {/* --- Üst Başlık ve Aksiyonlar --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

      {/* --- Filtre Alanı --- */}
      <div className="bg-white p-4 rounded-lg shadow-sm border grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Şube Seçimi (Sadece Müşteri Rolü ve Şubeler varsa görünür) */}
        {userRole === 'customer' && branches.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
              <Building2 size={12}/> Şube Seçimi
            </label>
            <select 
              value={selectedBranchId} 
              onChange={e => setSelectedBranchId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tüm Şubeler</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.sube_adi}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Başlangıç Tarihi</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Bitiş Tarihi</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm" />
        </div>
        <button 
          onClick={fetchReportData} 
          disabled={isReportLoading || isProfileLoading}
          className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex justify-center items-center gap-2 disabled:bg-gray-400 text-sm font-medium h-[38px]"
        >
          {isReportLoading ? <Loader2 className="animate-spin" size={16} /> : <Filter size={16} />}
          Raporla
        </button>
      </div>

      {/* --- Hata Bildirimi --- */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
          <p className="font-bold">Hata</p>
          <p>{error}</p>
        </div>
      )}

      {/* --- RAPOR ÇIKTISI (Kağıt Görünümü) --- */}
      <div ref={reportRef} className="bg-white rounded-lg shadow-lg overflow-hidden min-h-[400px]">
        
        {/* Rapor Header */}
        <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-5">
            {companySettings.logo_url && (
              <img src={companySettings.logo_url} alt="Logo" className="h-16 object-contain" crossOrigin="anonymous" />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">{companySettings.company_name}</h1>
              <p className="text-sm text-gray-500">Pest Kontrol Hizmetleri</p>
            </div>
          </div>
          <div className="text-right">
             <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Rapor Dönemi</div>
             <div className="text-lg font-bold text-gray-800 bg-white px-3 py-1 rounded border shadow-sm">
               {format(new Date(startDate), 'dd.MM.yyyy')} - {format(new Date(endDate), 'dd.MM.yyyy')}
             </div>
             {selectedBranchId && (
                <div className="mt-2 text-sm text-blue-600 font-medium">
                  {branches.find(b => b.id === selectedBranchId)?.sube_adi}
                </div>
             )}
          </div>
        </div>

        {/* --- İçerik Alanı --- */}
        {isReportLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-2 text-blue-500" />
            <p>Veriler analiz ediliyor...</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <AlertTriangle className="w-12 h-12 mb-2 opacity-50" />
            <p>Kayıt bulunamadı.</p>
          </div>
        ) : (
          <div className="p-8 space-y-10">
            
            {/* 1. ÖZET KARTLARI (Sıvı vs Katı) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               
               {/* SIVI BÖLÜMÜ */}
               <div className="border border-blue-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
                     <h3 className="font-bold text-blue-800 flex items-center gap-2">
                        <Droplets size={18} /> Sıvı Kimyasallar
                     </h3>
                     <span className="text-xs font-semibold text-blue-600 bg-white px-2 py-1 rounded border border-blue-200">Birim: ml</span>
                  </div>
                  
                  {aggregatedData.chartDataLiquid.length > 0 ? (
                     <div className="p-4 bg-white">
                        {/* Grafik */}
                        <div className="h-48 mb-4">
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={aggregatedData.chartDataLiquid} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                                 <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                 <XAxis type="number" hide />
                                 <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 11, fill: '#475569'}} />
                                 <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value) => [`${value} ml`, 'Miktar']} />
                                 <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                        {/* Tablo */}
                        <table className="w-full text-sm">
                           <tbody>
                              {aggregatedData.chartDataLiquid.map((d, i) => (
                                 <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                    <td className="py-2 text-gray-600">{d.name}</td>
                                    <td className="py-2 text-right font-mono font-bold text-blue-700">{d.value.toLocaleString('tr-TR')} ml</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  ) : (
                     <div className="p-6 text-center text-gray-400 text-sm">Sıvı tüketim kaydı yok.</div>
                  )}
               </div>

               {/* KATI BÖLÜMÜ */}
               <div className="border border-green-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-green-50 px-4 py-3 border-b border-green-100 flex items-center justify-between">
                     <h3 className="font-bold text-green-800 flex items-center gap-2">
                        <Package size={18} /> Katı/Jel Kimyasallar
                     </h3>
                     <span className="text-xs font-semibold text-green-600 bg-white px-2 py-1 rounded border border-green-200">Birim: gr</span>
                  </div>
                  
                  {aggregatedData.chartDataSolid.length > 0 ? (
                     <div className="p-4 bg-white">
                        {/* Grafik */}
                        <div className="h-48 mb-4">
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={aggregatedData.chartDataSolid} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                                 <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                 <XAxis type="number" hide />
                                 <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 11, fill: '#475569'}} />
                                 <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value) => [`${value} gr`, 'Miktar']} />
                                 <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} />
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                        {/* Tablo */}
                        <table className="w-full text-sm">
                           <tbody>
                              {aggregatedData.chartDataSolid.map((d, i) => (
                                 <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                    <td className="py-2 text-gray-600">{d.name}</td>
                                    <td className="py-2 text-right font-mono font-bold text-green-700">{d.value.toLocaleString('tr-TR')} gr</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  ) : (
                     <div className="p-6 text-center text-gray-400 text-sm">Katı tüketim kaydı yok.</div>
                  )}
               </div>
            </div>

            {/* 2. DETAYLI LİSTE */}
            <div>
              <h3 className="font-bold text-gray-800 mb-4 pl-2 border-l-4 border-gray-800">Detaylı Uygulama Kayıtları</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Tarih</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Lokasyon / Şube</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Ürün & Aktif Madde</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Miktar</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Operatör</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{format(new Date(row.visit_date), 'dd.MM.yyyy')}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.branch_name}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{row.product_name}</div>
                          <div className="text-xs text-blue-600 font-medium">{row.active_ingredient}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                           <span className={`font-bold ${['gr','kg'].includes(row.unit || '') ? 'text-green-700' : 'text-blue-700'}`}>
                              {row.quantity}
                           </span> 
                           <span className="text-xs text-gray-500 ml-1 uppercase">{row.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.operator_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 pt-8 pb-4">
               {companySettings.company_name} &bull; {companySettings.website} &bull; Elektronik ortamda üretilmiştir.
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default PesticideUsageReport;