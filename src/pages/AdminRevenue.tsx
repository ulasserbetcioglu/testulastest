import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
    Search, Download, DollarSign, Calendar, Building, User, ChevronLeft, ChevronRight, 
    TrendingUp, TrendingDown, Loader2, Bug, PlusCircle, Trash2, Edit, Save, XCircle, 
    MinusCircle, LayoutDashboard, Users, Building2, Wrench 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, getMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

// --- ARAYÜZLER (INTERFACES) ---
interface Pricing {
  id: string;
  name: string;
  type: 'Müşteri' | 'Şube';
  parentName?: string;
  monthly_price: number | null;
  per_visit_price: number | null;
}

interface OperatorRevenue {
  operator_id: string;
  operator_name: string;
  total_revenue: number;
  visit_count: number;
}

interface RevenueData {
  monthlyRevenue: number;
  perVisitRevenue: number;
  materialRevenue: number;
  totalRevenue: number;
  totalVisits: number;
  operatorRevenues: OperatorRevenue[];
  customerPricings: Pricing[];
  branchPricings: Pricing[];
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  month: number;
}

const allMonths = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

// --- YARDIMCI BİLEŞENLER ---
const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; bgColor?: string; textColor?: string; }> = ({ title, value, icon, bgColor = 'bg-green-100', textColor = 'text-green-600' }) => (
  <div className="bg-white p-5 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col justify-between">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div className={`p-2 ${bgColor} ${textColor} rounded-full`}>{icon}</div>
    </div>
    <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
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
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'branches' | 'operators' | 'expenses'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState<number | ''>('');
  const [newExpenseMonth, setNewExpenseMonth] = useState<number>(getMonth(new Date()));
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseName, setEditExpenseName] = useState('');
  const [editExpenseAmount, setEditExpenseAmount] = useState<number | ''>('');
  const [editExpenseMonth, setEditExpenseMonth] = useState<number>(0);

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
    setNewExpenseMonth(getMonth(selectedMonth));
  }, [isAdmin, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const start = `${format(startOfMonth(selectedMonth), 'yyyy-MM-dd')}T00:00:00.000Z`;
        const end = `${format(endOfMonth(selectedMonth), 'yyyy-MM-dd')}T23:59:59.999Z`;

      const [customerPricingRes, branchPricingRes, visitsRes, materialSalesRes] = await Promise.all([
        supabase.from('customer_pricing').select(`*, customer:customer_id(kisa_isim, musteri_no)`),
        supabase.from('branch_pricing').select(`*, branch:branch_id(sube_adi, customer:customer_id(kisa_isim))`),
        supabase.from('visits').select(`*, operator:operator_id(name)`).gte('visit_date', start).lte('visit_date', end).eq('status', 'completed'),
        supabase.from('paid_material_sales').select(`total_amount, visit:visit_id(operator_id)`).gte('sale_date', start).lte('sale_date', end)
      ]);

      if (customerPricingRes.error) throw customerPricingRes.error;
      if (branchPricingRes.error) throw branchPricingRes.error;
      if (visitsRes.error) throw visitsRes.error;
      if (materialSalesRes.error) throw materialSalesRes.error;

      const customerPricingData = customerPricingRes.data || [];
      const branchPricingData = branchPricingRes.data || [];
      const visitsData = visitsRes.data || [];
      const materialSalesData = materialSalesRes.data || [];

      let monthlyRevenue = 0;
      const pricedBranches = new Set<string>();

      customerPricingData.forEach(p => { monthlyRevenue += p.monthly_price || 0; });
      branchPricingData.forEach(p => {
        if (p.monthly_price) {
          monthlyRevenue += p.monthly_price;
          pricedBranches.add(p.branch_id);
        }
      });

      let perVisitRevenue = 0;
      const operatorRevenueMap = new Map<string, { name: string, revenue: number, visits: number }>();

      visitsData.forEach(visit => {
        const branchPrice = branchPricingData.find(p => p.branch_id === visit.branch_id);
        const customerPrice = customerPricingData.find(p => p.customer_id === visit.customer_id);
        let visitRevenue = 0;

        if (branchPrice?.per_visit_price) {
          visitRevenue = branchPrice.per_visit_price;
        } else if (!pricedBranches.has(visit.branch_id) && customerPrice?.per_visit_price) {
          visitRevenue = customerPrice.per_visit_price;
        }
        perVisitRevenue += visitRevenue;

        if (visit.operator_id) {
          const opData = operatorRevenueMap.get(visit.operator_id) || { name: visit.operator?.name || 'Bilinmeyen', revenue: 0, visits: 0 };
          opData.revenue += visitRevenue;
          opData.visits += 1;
          operatorRevenueMap.set(visit.operator_id, opData);
        }
      });
      
      let materialRevenue = 0;
      materialSalesData.forEach(sale => {
        materialRevenue += sale.total_amount || 0;
        if (sale.visit?.operator_id) {
            const opData = operatorRevenueMap.get(sale.visit.operator_id) || { name: 'Bilinmeyen', revenue: 0, visits: 0 };
            opData.revenue += sale.total_amount || 0;
            operatorRevenueMap.set(sale.visit.operator_id, opData);
        }
      });

      const operatorRevenues: OperatorRevenue[] = Array.from(operatorRevenueMap.entries()).map(([id, data]) => ({
        operator_id: id,
        operator_name: data.name,
        total_revenue: data.revenue,
        visit_count: data.visits
      })).sort((a,b) => b.total_revenue - a.total_revenue);

      setRevenueData({
        monthlyRevenue,
        perVisitRevenue,
        materialRevenue,
        totalRevenue: monthlyRevenue + perVisitRevenue + materialRevenue,
        totalVisits: visitsData.length,
        operatorRevenues,
        customerPricings: customerPricingData.map(p => ({ id: p.id, name: p.customer.kisa_isim, type: 'Müşteri', monthly_price: p.monthly_price, per_visit_price: p.per_visit_price })),
        branchPricings: branchPricingData.map(p => ({ id: p.id, name: p.branch.sube_adi, parentName: p.branch.customer.kisa_isim, type: 'Şube', monthly_price: p.monthly_price, per_visit_price: p.per_visit_price }))
      });
    } catch (err: any) {
      toast.error(`Veri çekme hatası: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const currentMonthIndex = useMemo(() => getMonth(selectedMonth), [selectedMonth]);
  const totalCurrentMonthExpenses = useMemo(() => expenses.filter(exp => exp.month === currentMonthIndex).reduce((sum, exp) => sum + exp.amount, 0), [expenses, currentMonthIndex]);
  const netProfit = useMemo(() => (revenueData?.totalRevenue || 0) - totalCurrentMonthExpenses, [revenueData, totalCurrentMonthExpenses]);
  
  const addExpense = useCallback(() => {
    if (newExpenseName.trim() === '' || newExpenseAmount === '' || newExpenseAmount <= 0) {
      toast.error('Lütfen geçerli bir gider adı ve pozitif bir miktar girin.');
      return;
    }
    setExpenses(prev => [...prev, { id: Date.now().toString(), name: newExpenseName.trim(), amount: Number(newExpenseAmount), month: newExpenseMonth }]);
    setNewExpenseName('');
    setNewExpenseAmount('');
    toast.success('Gider başarıyla eklendi.');
  }, [newExpenseName, newExpenseAmount, newExpenseMonth]);

  const removeExpense = useCallback((id: string) => { setExpenses(prev => prev.filter(exp => exp.id !== id)); toast.info('Gider silindi.'); }, []);
  const startEditingExpense = useCallback((expense: Expense) => { setEditingExpenseId(expense.id); setEditExpenseName(expense.name); setEditExpenseAmount(expense.amount); setEditExpenseMonth(expense.month); }, []);
  const saveEditedExpense = useCallback(() => {
    if (editingExpenseId === null || editExpenseName.trim() === '' || editExpenseAmount === '' || editExpenseAmount <= 0) {
      toast.error('Lütfen geçerli bir gider adı ve pozitif bir miktar girin.');
      return;
    }
    setExpenses(prev => prev.map(exp => exp.id === editingExpenseId ? { ...exp, name: editExpenseName.trim(), amount: Number(editExpenseAmount), month: editExpenseMonth } : exp));
    setEditingExpenseId(null);
  }, [editingExpenseId, editExpenseName, editExpenseAmount, editExpenseMonth]);
  const cancelEditingExpense = useCallback(() => { setEditingExpenseId(null); }, []);

  const filteredCustomers = useMemo(() => revenueData?.customerPricings.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) || [], [searchTerm, revenueData]);
  const filteredBranches = useMemo(() => revenueData?.branchPricings.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()) || (b.parentName && b.parentName.toLowerCase().includes(searchTerm.toLowerCase()))) || [], [searchTerm, revenueData]);
  const filteredOperators = useMemo(() => revenueData?.operatorRevenues.filter(op => op.operator_name.toLowerCase().includes(searchTerm.toLowerCase())) || [], [searchTerm, revenueData]);
  const filteredExpenses = useMemo(() => expenses.filter(exp => exp.month === currentMonthIndex), [expenses, currentMonthIndex]);

  const handleTabClick = (tab: 'overview' | 'customers' | 'branches' | 'operators' | 'expenses') => { setActiveTab(tab); setSearchTerm(''); };

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
    { id: 'expenses', label: 'Gider Yönetimi', icon: <MinusCircle size={16}/> },
    { id: 'operators', label: 'Operatör Gelirleri', icon: <Wrench size={16}/> },
    { id: 'customers', label: 'Müşteri Fiyatları', icon: <Users size={16}/> },
    { id: 'branches', label: 'Şube Fiyatları', icon: <Building2 size={16}/> }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen font-sans">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-4xl font-bold text-gray-800">Gelir & Gider Paneli</h1>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
            <button onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))} className="p-2 rounded-md hover:bg-gray-100"><ChevronLeft /></button>
            <span className="text-lg font-semibold text-gray-700 w-48 text-center">{format(selectedMonth, 'MMMM yyyy', { locale: tr })}</span>
            <button onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} className="p-2 rounded-md hover:bg-gray-100"><ChevronRight /></button>
        </div>
      </header>

      {loading ? <SkeletonLoader /> : !revenueData ? <div className="text-center p-10 bg-white rounded-lg shadow">Bu ay için veri bulunamadı.</div> : (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Toplam Gelir" value={formatCurrency(revenueData.totalRevenue)} icon={<TrendingUp size={24} />} />
                <StatCard title="Toplam Gider" value={formatCurrency(totalCurrentMonthExpenses)} icon={<TrendingDown size={24} />} bgColor="bg-red-100" textColor="text-red-600" />
                <StatCard title="Net Kâr / Zarar" value={formatCurrency(netProfit)} icon={<DollarSign size={24} />} bgColor={netProfit >= 0 ? 'bg-blue-100' : 'bg-red-100'} textColor={netProfit >= 0 ? 'text-blue-600' : 'text-red-600'} />
                <StatCard title="Aylık Anlaşmalar" value={formatCurrency(revenueData.monthlyRevenue)} icon={<Calendar size={24} />} />
                <StatCard title="Ziyaret Başı Gelir" value={formatCurrency(revenueData.perVisitRevenue)} icon={<Building size={24} />} />
                <StatCard title="Malzeme Satış Geliri" value={formatCurrency(revenueData.materialRevenue)} icon={<Bug size={24} />} />
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => handleTabClick(tab.id as any)} className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-sm whitespace-nowrap ${activeTab === tab.id ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-6">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 h-80">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">Operatör Bazlı Gelir Dağılımı</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={revenueData.operatorRevenues} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="operator_name" fontSize={12} />
                                        <YAxis tickFormatter={(value) => `${value.toLocaleString()} ₺`} fontSize={12} width={80}/>
                                        <Tooltip formatter={(value: number) => [formatCurrency(value), 'Gelir']}/>
                                        <Bar dataKey="total_revenue" fill="#10b981" name="Toplam Gelir" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="h-80 flex flex-col items-center justify-center">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">Gelir Türü Dağılımı</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={[
                                                { name: 'Aylık Anlaşma', value: revenueData.monthlyRevenue },
                                                { name: 'Ziyaret Başı', value: revenueData.perVisitRevenue },
                                                { name: 'Malzeme Satış', value: revenueData.materialRevenue },
                                            ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(entry) => `${(entry.percent * 100).toFixed(0)}%`}>
                                            <Cell fill="#3b82f6" />
                                            <Cell fill="#10b981" />
                                            <Cell fill="#f97316" />
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatCurrency(value)}/>
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                    {activeTab === 'expenses' && (
                        <div>
                            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                    <MinusCircle className="text-gray-500" /> {format(selectedMonth, 'MMMM yyyy', { locale: tr })} Ayı Giderleri
                                </h2>
                                <button onClick={() => handleExport(filteredExpenses.map(e => ({ Gider_Adı: e.name, Tutar: e.amount, Ay: allMonths[e.month] })), 'Giderler')} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm">
                                    <Download size={16} /> Excel'e Aktar
                                </button>
                            </div>
                            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                                <h3 className="text-lg font-medium text-gray-700 mb-3">Yeni Gider Ekle</h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input type="text" placeholder="Gider Adı" value={newExpenseName} onChange={(e) => setNewExpenseName(e.target.value)} className="flex-grow p-2 border rounded-md"/>
                                    <input type="number" placeholder="Miktar (TL)" value={newExpenseAmount} onChange={(e) => setNewExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full sm:w-40 p-2 border rounded-md" min="0"/>
                                    <select value={newExpenseMonth} onChange={(e) => setNewExpenseMonth(parseInt(e.target.value))} className="w-full sm:w-48 p-2 border rounded-md">
                                        {allMonths.map((monthName, index) => (<option key={index} value={index}>{monthName}</option>))}
                                    </select>
                                    <button onClick={addExpense} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2">
                                        <PlusCircle size={18} /> Ekle
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50"><tr><th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Gider Adı</th><th className="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Tutar</th><th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase">İşlemler</th></tr></thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredExpenses.length === 0 ? (<tr><td colSpan={3} className="text-center py-10 text-gray-500">Bu ay için gider bulunmuyor.</td></tr>) : filteredExpenses.map(expense => (
                                    <tr key={expense.id}>
                                        {editingExpenseId === expense.id ? (
                                        <>
                                            <td className="p-2"><input type="text" value={editExpenseName} onChange={(e) => setEditExpenseName(e.target.value)} className="w-full p-2 border rounded-md text-sm"/></td>
                                            <td className="p-2"><input type="number" value={editExpenseAmount} onChange={(e) => setEditExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded-md text-sm text-right" min="0"/></td>
                                            <td className="p-2 whitespace-nowrap text-center">
                                                <button onClick={saveEditedExpense} className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 mr-2" title="Kaydet"><Save size={18} /></button>
                                                <button onClick={cancelEditingExpense} className="p-2 bg-gray-400 text-white rounded-md hover:bg-gray-500" title="İptal"><XCircle size={18} /></button>
                                            </td>
                                        </>
                                        ) : (
                                        <>
                                            <td className="p-4 font-medium">{expense.name}</td>
                                            <td className="p-4 text-right">{formatCurrency(expense.amount)}</td>
                                            <td className="p-4 whitespace-nowrap text-center">
                                                <button onClick={() => startEditingExpense(expense)} className="p-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 mr-2" title="Düzenle"><Edit size={18} /></button>
                                                <button onClick={() => removeExpense(expense.id)} className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600" title="Sil"><Trash2 size={18} /></button>
                                            </td>
                                        </>
                                        )}
                                    </tr>
                                    ))}
                                    </tbody>
                                    <tfoot className="bg-gray-100">
                                        <tr>
                                            <td className="p-4 font-bold text-gray-800">Toplam</td>
                                            <td className="p-4 text-right font-bold text-gray-800">{formatCurrency(totalCurrentMonthExpenses)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                    {activeTab === 'operators' && (
                        <div>
                            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="Operatör ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-80 pl-10 pr-4 py-2 border rounded-lg"/></div>
                                <button onClick={() => handleExport(filteredOperators.map(op => ({ Operatör: op.operator_name, Gelir: op.total_revenue, Ziyaret_Sayısı: op.visit_count })), 'Operator_Gelirleri')} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"><Download size={16} /> Excel'e Aktar</button>
                            </div>
                            <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-gray-50"><tr><th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Operatör</th><th className="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Toplam Gelir</th><th className="p-4 text-center text-xs font-semibold text-gray-500 uppercase">Ziyaret Sayısı</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{filteredOperators.length === 0 ? (<tr><td colSpan={3} className="text-center py-10 text-gray-500">Sonuç bulunamadı.</td></tr>) : filteredOperators.map((item: any) => (<tr key={item.operator_id} className="hover:bg-gray-50"><td className="p-4 whitespace-nowrap text-sm font-medium text-gray-800">{item.operator_name}</td><td className="p-4 whitespace-nowrap text-sm text-right font-semibold">{formatCurrency(item.total_revenue)}</td><td className="p-4 whitespace-nowrap text-sm text-center font-semibold">{item.visit_count}</td></tr>))}</tbody></table></div>
                        </div>
                    )}
                    {activeTab === 'customers' && (
                        <div>
                             <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="Müşteri ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-80 pl-10 pr-4 py-2 border rounded-lg"/></div>
                                <button onClick={() => handleExport(filteredCustomers.map(c => ({ Müşteri: c.name, Aylık_Fiyat: c.monthly_price, Ziyaret_Başı_Fiyat: c.per_visit_price })), 'Musteri_Fiyatlari')} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"><Download size={16} /> Excel'e Aktar</button>
                            </div>
                            <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-gray-50"><tr><th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Müşteri</th><th className="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Aylık Fiyat</th><th className="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Ziyaret Başı Fiyat</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{filteredCustomers.length === 0 ? (<tr><td colSpan={3} className="text-center py-10 text-gray-500">Sonuç bulunamadı.</td></tr>) : filteredCustomers.map((item: any) => (<tr key={item.id} className="hover:bg-gray-50"><td className="p-4 whitespace-nowrap text-sm font-medium text-gray-800">{item.name}</td><td className="p-4 whitespace-nowrap text-sm text-right font-semibold">{item.monthly_price ? formatCurrency(item.monthly_price) : '-'}</td><td className="p-4 whitespace-nowrap text-sm text-right font-semibold">{item.per_visit_price ? formatCurrency(item.per_visit_price) : '-'}</td></tr>))}</tbody><tfoot className="bg-gray-100"><tr><td className="p-4 font-bold text-gray-800">Toplam Müşteri: {filteredCustomers.length}</td><td colSpan={2}></td></tr></tfoot></table></div>
                        </div>
                    )}
                    {activeTab === 'branches' && (
                        <div>
                            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="Şube veya müşteri ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-80 pl-10 pr-4 py-2 border rounded-lg"/></div>
                                <button onClick={() => handleExport(filteredBranches.map(b => ({ Müşteri: b.parentName, Şube: b.name, Aylık_Fiyat: b.monthly_price, Ziyaret_Başı_Fiyat: b.per_visit_price })), 'Sube_Fiyatlari')} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"><Download size={16} /> Excel'e Aktar</button>
                            </div>
                            <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-gray-50"><tr><th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Müşteri</th><th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">Şube</th><th className="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Aylık Fiyat</th><th className="p-4 text-right text-xs font-semibold text-gray-500 uppercase">Ziyaret Başı Fiyat</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{filteredBranches.length === 0 ? (<tr><td colSpan={4} className="text-center py-10 text-gray-500">Sonuç bulunamadı.</td></tr>) : filteredBranches.map((item: any) => (<tr key={item.id} className="hover:bg-gray-50"><td className="p-4 whitespace-nowrap text-sm text-gray-600">{item.parentName}</td><td className="p-4 whitespace-nowrap text-sm font-medium text-gray-800">{item.name}</td><td className="p-4 whitespace-nowrap text-sm text-right font-semibold">{item.monthly_price ? formatCurrency(item.monthly_price) : '-'}</td><td className="p-4 whitespace-nowrap text-sm text-right font-semibold">{item.per_visit_price ? formatCurrency(item.per_visit_price) : '-'}</td></tr>))}</tbody><tfoot className="bg-gray-100"><tr><td className="p-4 font-bold text-gray-800">Toplam Şube: {filteredBranches.length}</td><td colSpan={3}></td></tr></tfoot></table></div>
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
