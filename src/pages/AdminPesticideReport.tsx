import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Download, Calendar, Bug, Image as ImageIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
}

const AdminPesticideReport: React.FC = () => {
  const [reportData, setReportData] = useState<PesticideUsage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [companySettings, setCompanySettings] = useState<CompanySettings>({ company_name: 'İlaçlamatik', logo_url: '', website: 'www.ilaclamatik.com' });
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCustomers();
    fetchBranches();
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, logo_url, website')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setCompanySettings({
          company_name: data.company_name || 'İlaçlamatik',
          logo_url: data.logo_url || '',
          website: data.website || 'www.ilaclamatik.com'
        });
      }
    } catch (err: any) {
      console.error('Şirket ayarları yüklenirken hata:', err);
    }
  };

  useEffect(() => {
    if (selectedCustomer) {
      const filtered = branches.filter(b => b.customer_id === selectedCustomer);
      setFilteredBranches(filtered);
      setSelectedBranch('');
    } else {
      setFilteredBranches([]);
      setSelectedBranch('');
    }
  }, [selectedCustomer, branches]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, kisa_isim')
        .order('kisa_isim');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      console.error('Müşteriler yüklenirken hata:', err);
    }
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, sube_adi, customer_id')
        .order('sube_adi');

      if (error) throw error;
      setBranches(data || []);
    } catch (err: any) {
      console.error('Şubeler yüklenirken hata:', err);
    }
  };

  const fetchReportData = useCallback(async () => {
    if (!selectedCustomer && !selectedBranch) {
      setError('Lütfen bir müşteri veya şube seçin.');
      return;
    }

    if (!startDate || !endDate) {
      setError('Lütfen geçerli bir tarih aralığı seçin.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReportData([]);

    try {
      let visitQuery = supabase
        .from('visits')
        .select('id')
        .gte('visit_date', startDate)
        .lte('visit_date', new Date(endDate + 'T23:59:59').toISOString())
        .eq('status', 'completed');

      if (selectedBranch) {
        visitQuery = visitQuery.eq('branch_id', selectedBranch);
      } else if (selectedCustomer) {
        const { data: branchesData, error: branchError } = await supabase
          .from('branches')
          .select('id')
          .eq('customer_id', selectedCustomer);

        if (branchError) throw branchError;

        const branchIds = branchesData.map(b => b.id);
        visitQuery = visitQuery.or(
          `customer_id.eq.${selectedCustomer},branch_id.in.(${branchIds.join(',') || 'null'})`
        );
      }

      const { data: visitsData, error: visitsError } = await visitQuery;
      if (visitsError) throw visitsError;

      if (!visitsData || visitsData.length === 0) {
        setReportData([]);
        return;
      }

      const visitIds = visitsData.map(v => v.id);

      const { data, error: queryError } = await supabase
        .from('biocidal_products_usage')
        .select(`
          id,
          created_at,
          quantity,
          unit,
          dosage,
          product:biocidal_products (name, active_ingredient),
          operator:operators (name),
          customer:customers (kisa_isim),
          branch:branches (sube_adi),
          visit:visits (visit_date)
        `)
        .in('visit_id', visitIds)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      if (!data || data.length === 0) {
        console.log('Admin Pestisit Raporu - Hiç veri bulunamadı');
        setReportData([]);
        return;
      }

      const formattedData = data.map(item => ({
        id: item.id,
        created_at: item.created_at,
        product_name: item.product?.name || 'Bilinmeyen Ürün',
        active_ingredient: item.product?.active_ingredient || null,
        quantity: item.quantity,
        unit: item.unit,
        dosage: item.dosage,
        customer_name: item.customer?.kisa_isim || 'N/A',
        branch_name: item.branch?.sube_adi || null,
        operator_name: item.operator?.name || 'N/A',
        visit_date: item.visit?.visit_date || item.created_at,
      }));

      console.log('Admin Pestisit Raporu - Ham Veri:', data);
      console.log('Admin Pestisit Raporu - Formatlanmış Veri:', formattedData);
      setReportData(formattedData);

    } catch (err: any) {
      console.error('Rapor verisi alınırken hata:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCustomer, selectedBranch, startDate, endDate]);

  const exportToExcel = () => {
    const dataToExport = reportData.map(item => ({
      'Tarih': format(new Date(item.visit_date), 'dd/MM/yyyy'),
      'Müşteri': item.customer_name,
      'Şube': item.branch_name || '-',
      'Ürün Adı': item.product_name,
      'Aktif Madde': item.active_ingredient || '-',
      'Doz': item.dosage || '-',
      'Miktar': item.quantity !== null && item.quantity !== undefined ? item.quantity : 0,
      'Birim': item.unit || 'adet',
      'Uygulayan Operatör': item.operator_name,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pestisit Kullanım Raporu');

    const customerName = customers.find(c => c.id === selectedCustomer)?.kisa_isim || 'Tum';
    const branchName = filteredBranches.find(b => b.id === selectedBranch)?.sube_adi || '';
    const fileName = `Pestisit_Raporu_${customerName}${branchName ? '_' + branchName : ''}_${startDate}_${endDate}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  // Grafik verilerini hazırla
  const chartData = useMemo(() => {
    if (reportData.length === 0) return { daily: [], monthly: [], yearly: [] };

    const dailyMap = new Map<string, number>();
    const monthlyMap = new Map<string, number>();
    const yearlyMap = new Map<string, number>();

    reportData.forEach(item => {
      try {
        if (!item.visit_date) return;

        const date = new Date(item.visit_date);
        if (isNaN(date.getTime())) return;

        const dayKey = format(date, 'dd/MM/yyyy');
        const monthKey = format(date, 'MM/yyyy');
        const yearKey = format(date, 'yyyy');
        const quantity = item.quantity || 0;

        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + quantity);
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + quantity);
        yearlyMap.set(yearKey, (yearlyMap.get(yearKey) || 0) + quantity);
      } catch (err) {
        console.error('Tarih parse hatası:', item.visit_date, err);
      }
    });

    return {
      daily: Array.from(dailyMap.entries())
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      monthly: Array.from(monthlyMap.entries())
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      yearly: Array.from(yearlyMap.entries())
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => a.date.localeCompare(b.date))
    };
  }, [reportData]);

  const exportToJPEG = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 0,
      });

      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');

      const customerName = customers.find(c => c.id === selectedCustomer)?.kisa_isim || 'Tum';
      const branchName = filteredBranches.find(b => b.id === selectedBranch)?.sube_adi || '';
      const fileName = `Pestisit_Raporu_${customerName}${branchName ? '_' + branchName : ''}_${startDate}_${endDate}.jpg`;

      link.download = fileName;
      link.href = imageData;
      link.click();
    } catch (err) {
      console.error('JPEG export hatası:', err);
      setError('JPEG olarak dışa aktarma başarısız oldu.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-semibold flex items-center gap-3">
          <Bug className="w-7 h-7 text-green-700" />
          Pestisit Kullanım Raporu (Admin)
        </h2>
        <div className="flex gap-2">
          <button
            onClick={exportToJPEG}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            disabled={isLoading || reportData.length === 0}
          >
            <ImageIcon size={20} />
            JPEG
          </button>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            disabled={isLoading || reportData.length === 0}
          >
            <Download size={20} />
            Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        <h3 className="font-medium">Filtreler</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
              Müşteri
            </label>
            <select
              id="customer"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="">Müşteri Seçin</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.kisa_isim}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">
              Şube
            </label>
            <select
              id="branch"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
              disabled={!selectedCustomer}
            >
              <option value="">Tüm Şubeler</option>
              {filteredBranches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.sube_adi}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
              Bitiş Tarihi
            </label>
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

      {!isLoading && error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          Hata: {error}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          <span className="ml-3 text-gray-600">Rapor yükleniyor...</span>
        </div>
      )}

      {!isLoading && !error && (
        <div ref={reportRef} className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Rapor Başlığı - Profesyonel Görünüm */}
          <div className="p-8 bg-gradient-to-r from-green-50 to-blue-50 border-b-4 border-green-600">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {companySettings.logo_url && (
                  <img
                    src={companySettings.logo_url}
                    alt={`${companySettings.company_name} Logo`}
                    className="h-16 w-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">{companySettings.company_name}</h1>
                  <p className="text-sm text-gray-600">Profesyonel Pest Kontrol Hizmetleri</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Rapor Tarihi</p>
                <p className="text-lg font-semibold text-gray-800">
                  {format(new Date(), 'dd/MM/yyyy', { locale: tr })}
                </p>
              </div>
            </div>

            <div className="border-t border-green-200 pt-4">
              <h2 className="text-2xl font-bold text-green-800 mb-3 flex items-center gap-2">
                <Bug className="w-6 h-6" />
                BİYOSİDAL ÜRÜN KULLANIM RAPORU
              </h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Müşteri:</span>
                  <span className="ml-2 text-gray-900">
                    {selectedCustomer && customers.find(c => c.id === selectedCustomer)?.kisa_isim}
                  </span>
                </div>
                {selectedBranch && (
                  <div>
                    <span className="font-semibold text-gray-700">Şube:</span>
                    <span className="ml-2 text-gray-900">
                      {filteredBranches.find(b => b.id === selectedBranch)?.sube_adi}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-gray-700">Rapor Dönemi:</span>
                  <span className="ml-2 text-gray-900">
                    {format(new Date(startDate), 'dd/MM/yyyy', { locale: tr })} - {format(new Date(endDate), 'dd/MM/yyyy', { locale: tr })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-green-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Lokasyon
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Biyosidal Ürün
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Aktif Madde
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Doz
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Miktar
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Uygulayan Operatör
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Belirtilen kriterlerde pestisit kullanımı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  reportData.map((item, index) => (
                    <tr key={item.id} className={`hover:bg-green-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                        {format(new Date(item.visit_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {item.branch_name || item.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {item.product_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.active_ingredient || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.dosage || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="font-bold text-green-700 text-base">
                          {item.quantity !== null && item.quantity !== undefined ? item.quantity : '0'}
                        </span>
                        {' '}
                        <span className="text-gray-600 font-medium">
                          {item.unit || 'adet'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.operator_name}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Kullanım Grafikleri */}
          {reportData.length > 0 && (
            <div className="p-6 bg-white border-t">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Biyosidal Ürün Kullanım İstatistikleri</h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Günlük Kullanım */}
                {chartData.daily.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Günlük Kullanım</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData.daily}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#16a34a" name="Toplam Miktar" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Aylık Kullanım */}
                {chartData.monthly.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Aylık Kullanım</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData.monthly}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#2563eb" name="Toplam Miktar" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Yıllık Kullanım */}
                {chartData.yearly.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">Yıllık Kullanım</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData.yearly}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#dc2626" name="Toplam Miktar" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {reportData.length > 0 && (
            <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-t-2 border-green-600">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Toplam Kayıt Sayısı</p>
                  <p className="text-2xl font-bold text-green-700">{reportData.length}</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>Bu rapor {companySettings.company_name} tarafından</p>
                  <p>elektronik ortamda oluşturulmuştur.</p>
                  <p className="mt-2 font-semibold">{companySettings.website}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPesticideReport;
