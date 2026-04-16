import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
    Search, Download, DollarSign, ChevronLeft, ChevronRight, 
    TrendingUp, TrendingDown, LayoutDashboard
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

// --- ARAYÜZLER (INTERFACES) ---
interface ParasutInvoice {
  id: string;
  date: string;
  description: string;
  total: number;
  contact_name: string;
}

interface ParasutPayment {
  id: string;
  date: string;
  description: string;
  total: number;
  direction: 'inbound' | 'outbound';
  contact_name: string;
}

interface ParasutRevenueSummary {
  sales: ParasutInvoice[];
  purchases: ParasutInvoice[];
  payments: ParasutPayment[];
}

interface RevenueData {
  totalSales: number;
  totalPurchases: number;
  totalCollections: number;
  totalPayments: number;
  netProfit: number;
  summary: ParasutRevenueSummary;
}

// --- YARDIMCI BİLEŞENLER ---
const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; bgColor?: string; textColor?: string; }> = ({ title, value, icon, bgColor = 'bg-green-100', textColor = 'text-green-600' }) => (
  <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
    <div className="flex items-center justify-between mb-2">
      <div className={`p-2.5 ${bgColor} ${textColor} rounded-xl`}>{icon}</div>
    </div>
    <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
    <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

const SkeletonLoader: React.FC = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>)}
        </div>
        <div className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
    </div>
);

// --- ANA BİLEŞEN ---
const AdminRevenue: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'purchases' | 'collections'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);

  const formatCurrency = (value: number) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const isAdminUser = user?.email === 'admin@ilaclamatik.com';
      setIsAdmin(isAdminUser);
      if (!isAdminUser) navigate('/');
    };
    checkAdminAccess();
  }, [navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth() + 1;
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDayDate = new Date(year, month, 0);
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

        // Helper for delay
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        // Helper function for v4 JSONAPI fetching
        const fetchRaw = async (resName: string, dateParam: string, inclusions: string = 'contact', retryCount = 0): Promise<any> => {
            const filter = `filter[${dateParam}][gteq]=${startDate}&filter[${dateParam}][lteq]=${endDate}`;
            
            const { data, error } = await supabase.functions.invoke('parasut-fetch-new', {
                body: {
                    path: `${resName}?${filter}&page[size]=25&include=${inclusions}`,
                    raw: true
                }
            });

            if (data?.error?.includes('Try again') && retryCount < 3) {
                const waitSec = parseInt(data.error.match(/\d+/)?.[0] || '2') + 1;
                await sleep(waitSec * 1000);
                return fetchRaw(resName, dateParam, inclusions, retryCount + 1);
            }

            if (error) throw error;
            if (!data.success) throw new Error(data.error || 'Paraşüt API hatası');
            return data.data;
        };

        // 1. Fetch Invoices (Parallel is fine for just 2)
        const [salesRes, purchasesRes] = await Promise.all([
            fetchRaw('sales_invoices', 'issue_date', 'contact'),
            fetchRaw('purchase_bills', 'issue_date', 'supplier')
        ]);

        // 2. Fetch Accounts
        const { data: accountsData, error: accountsError } = await supabase.functions.invoke('parasut-fetch-new', {
            body: { path: 'accounts', raw: true }
        });

        if (accountsError || !accountsData.success) throw new Error('Hesap listesi çekilemedi.');

        // 3. Fetch Transactions for each account (SEQUENTIAL to avoid rate limits)
        const accountIds = (accountsData.data.data || []).map((acc: any) => acc.id);
        const transactionsResults = [];
        for (const accId of accountIds) {
            const res = await fetchRaw(`accounts/${accId}/transactions`, 'date', 'debit_account,credit_account');
            transactionsResults.push(res);
            await sleep(500); // 500ms safety gap
        }

        const mapResults = (res: any) => {
            const contactsMap = new Map();
            if (res.included) {
                res.included.forEach((inc: any) => {
                    if (inc.type === 'contacts' || inc.type === 'accounts') contactsMap.set(inc.id, inc.attributes.name);
                });
            }
            return (res.data || []).map((item: any) => {
                const rels = item.relationships;
                const contactId = rels?.contact?.data?.id || 
                                 rels?.supplier?.data?.id || 
                                 (rels?.debit_account?.data?.type === 'contacts' ? rels?.debit_account?.data?.id : null) ||
                                 (rels?.credit_account?.data?.type === 'contacts' ? rels?.credit_account?.data?.id : null);

                return {
                    id: item.id,
                    date: item.attributes.issue_date || item.attributes.date,
                    description: item.attributes.description || item.attributes.invoice_no || '',
                    total: parseFloat(item.attributes.net_total || item.attributes.amount || item.attributes.amount_in_trl || '0'),
                    direction: item.attributes.direction,
                    contact_name: contactsMap.get(contactId) || 'Bilinmeyen'
                };
            });
        };

        const allTransactionsData: any[] = [];
        const allTransactionsIncluded: any[] = [];
        transactionsResults.forEach(res => {
            if (res.data) allTransactionsData.push(...res.data);
            if (res.included) allTransactionsIncluded.push(...res.included);
        });

        const summary: ParasutRevenueSummary = {
            sales: mapResults(salesRes),
            purchases: mapResults(purchasesRes),
            payments: mapResults({ data: allTransactionsData, included: allTransactionsIncluded })
        };

        const totalSales = summary.sales.reduce((sum, s) => sum + s.total, 0);
        const totalPurchases = summary.purchases.reduce((sum, p) => sum + p.total, 0);
        const totalCollections = summary.payments.filter(p => p.direction === 'inbound').reduce((sum, p) => sum + p.total, 0);
        const totalPayments = summary.payments.filter(p => p.direction === 'outbound').reduce((sum, p) => sum + p.total, 0);

        setRevenueData({
            totalSales,
            totalPurchases,
            totalCollections,
            totalPayments,
            netProfit: totalSales - totalPurchases,
            summary
        });
    } catch (err: any) {
      toast.error(`Veri çekme hatası: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = useMemo(() => revenueData?.summary.sales.filter(s => 
    s.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [], [searchTerm, revenueData]);

  const filteredPurchases = useMemo(() => revenueData?.summary.purchases.filter(p => 
    p.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [], [searchTerm, revenueData]);

  const filteredPayments = useMemo(() => revenueData?.summary.payments.filter(p => 
    p.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [], [searchTerm, revenueData]);

  const handleTabClick = (tab: any) => { setActiveTab(tab); setSearchTerm(''); };

  const handleExport = (data: any[], fileName: string) => {
    if (data.length === 0) {
        toast.info("Dışa aktarılacak veri bulunmuyor.");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rapor");
    XLSX.writeFile(workbook, `${fileName}_${format(selectedMonth, 'yyyy-MM')}.xlsx`);
    toast.success("Veriler başarıyla dışa aktarıldı!");
  };

  const tabs = [
    { id: 'overview', label: 'Genel Bakış', icon: <LayoutDashboard size={16}/> },
    { id: 'sales', label: 'Satış Faturaları', icon: <TrendingUp size={16}/> },
    { id: 'purchases', label: 'Alış Faturaları', icon: <TrendingDown size={16}/> },
    { id: 'collections', label: 'Tahsilat & Ödemeler', icon: <DollarSign size={16}/> }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen font-sans">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <DollarSign className="text-blue-600" size={32} />
                Gelir & Gider Yönetimi
            </h1>
            <p className="text-gray-500 text-sm mt-1">Paraşüt API v4 üzerinden canlı finansal veriler.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <button onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))} className="p-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"><ChevronLeft size={20} /></button>
            <span className="text-base font-bold text-gray-800 px-4 min-w-[160px] text-center">{format(selectedMonth, 'MMMM yyyy', { locale: tr })}</span>
            <button onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} className="p-2 rounded-xl hover:bg-gray-50 transition-colors text-gray-600"><ChevronRight size={20} /></button>
        </div>
      </header>

      {loading ? <SkeletonLoader /> : !revenueData ? <div className="text-center p-12 bg-white rounded-3xl shadow-sm border border-gray-100">Bu ay için Paraşüt verisi bulunamadı.</div> : (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <StatCard title="Faturalanan Satış" value={formatCurrency(revenueData.totalSales)} icon={<TrendingUp size={24} />} bgColor="bg-blue-50" textColor="text-blue-600" />
                <StatCard title="Faturalanan Alış" value={formatCurrency(revenueData.totalPurchases)} icon={<TrendingDown size={24} />} bgColor="bg-red-50" textColor="text-red-600" />
                <StatCard title="Net Profit (Fatura)" value={formatCurrency(revenueData.netProfit)} icon={<DollarSign size={24} />} bgColor={revenueData.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'} textColor={revenueData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'} />
                <StatCard title="Gerçekleşen Tahsilat" value={formatCurrency(revenueData.totalCollections)} icon={<TrendingUp size={24} />} bgColor="bg-emerald-50" textColor="text-emerald-600" />
                <StatCard title="Gerçekleşen Ödeme" value={formatCurrency(revenueData.totalPayments)} icon={<TrendingDown size={24} />} bgColor="bg-orange-50" textColor="text-orange-600" />
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <nav className="flex space-x-2 overflow-x-auto pb-1 custom-scrollbar">
                        {tabs.map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => handleTabClick(tab.id as any)} 
                                className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 h-[400px]">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-blue-600" />
                                    Fatura Bazlı Gelir/Gider Dağılımı
                                </h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { name: 'Ocak', gelir: 0, gider: 0 }, // Örnek olarak aylık veri çekilebilir
                                        { name: format(selectedMonth, 'MMMM', { locale: tr }), gelir: revenueData.totalSales, gider: revenueData.totalPurchases }
                                    ]} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" fontSize={12} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={(value) => `${value.toLocaleString()} ₺`} fontSize={12} width={80} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: number) => [formatCurrency(value), '']}
                                        />
                                        <Bar dataKey="gelir" fill="#3b82f6" name="Gelir" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="gider" fill="#ef4444" name="Gider" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="h-[400px] flex flex-col items-center">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">Tahsilat Durumu</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                                <Pie 
                                                data={[
                                                    { name: 'Tahsil Edilen', value: revenueData.totalCollections },
                                                    { name: 'Bekleyen Sales', value: Math.max(0, revenueData.totalSales - revenueData.totalCollections) },
                                                ]} 
                                                dataKey="value" 
                                                nameKey="name" 
                                                cx="50%" 
                                                cy="50%" 
                                                innerRadius={70} 
                                                outerRadius={100} 
                                                paddingAngle={5} 
                                                label={(entry) => entry.percent ? `${(entry.percent * 100).toFixed(0)}%` : ''}
                                            >
                                            <Cell fill="#10b981" />
                                            <Cell fill="#cbd5e1" />
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)}/>
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                    
                    {activeTab !== 'overview' && (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Kayıtlarda ara..." 
                                        value={searchTerm} 
                                        onChange={e => setSearchTerm(e.target.value)} 
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <button 
                                    onClick={() => handleExport(
                                        activeTab === 'sales' ? filteredSales : activeTab === 'purchases' ? filteredPurchases : filteredPayments,
                                        activeTab
                                    )} 
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-bold"
                                >
                                    <Download size={16} /> Excel'e Aktar
                                </button>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarih</th>
                                            <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">İsim / Açıklama</th>
                                            <th className="p-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Tutar</th>
                                            {activeTab === 'collections' && <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Tür</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-50">
                                        {(activeTab === 'sales' ? filteredSales : activeTab === 'purchases' ? filteredPurchases : filteredPayments).map((item: any) => (
                                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4 whitespace-nowrap text-sm text-gray-500">
                                                    {format(new Date(item.date), 'dd MMM yyyy', { locale: tr })}
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-sm font-bold text-gray-900">{item.contact_name || 'Bilinmeyen'}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                                </td>
                                                <td className={`p-4 whitespace-nowrap text-sm text-right font-bold ${activeTab === 'purchases' || (item.direction === 'outbound') ? 'text-red-600' : 'text-blue-600'}`}>
                                                    {formatCurrency(item.total)}
                                                </td>
                                                {activeTab === 'collections' && (
                                                    <td className="p-4 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${item.direction === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {item.direction === 'inbound' ? 'Tahsilat' : 'Ödeme'}
                                                        </span>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        {(activeTab === 'sales' ? filteredSales : activeTab === 'purchases' ? filteredPurchases : filteredPayments).length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-12 text-center text-gray-400 text-sm">Hiç kayıt bulunamadı.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminRevenue;
