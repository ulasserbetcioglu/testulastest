import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { getMonth, getYear } from 'date-fns';
import { DollarSign, PlusCircle, Trash2, Edit, Save, XCircle, Loader2, TrendingUp, MinusCircle } from 'lucide-react';

// Türkçe ay isimleri
const allMonths = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

interface Expense {
  id: string;
  name: string;
  amount: number;
  month: number;
}

const YillikKarZararRaporu: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState<number | ''>('');
  const [newExpenseMonth, setNewExpenseMonth] = useState<number>(getMonth(new Date()));
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseName, setEditExpenseName] = useState('');
  const [editExpenseAmount, setEditExpenseAmount] = useState<number | ''>('');
  const [editExpenseMonth, setEditExpenseMonth] = useState<number>(0);

  // Veri state'leri
  const [sales, setSales] = useState<any[]>([]);
  const [customerPricing, setCustomerPricing] = useState<any[]>([]);
  const [branchPricing, setBranchPricing] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);

  // Veri çekme
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const startDate = `${selectedYear}-01-01T00:00:00.000Z`;
        const endDate = `${selectedYear}-12-31T23:59:59.999Z`;

        const [
          salesRes,
          customerPricingRes,
          branchPricingRes,
          visitsRes
        ] = await Promise.all([
          // Yıl içindeki satışlar
          supabase.from('paid_material_sales').select('sale_date, total_amount').gte('sale_date', startDate).lte('sale_date', endDate),
          // Tüm müşteri fiyatlandırmaları (tarih filtresi olmadan)
          supabase.from('customer_pricing').select('customer_id, monthly_price, per_visit_price'),
          // Tüm şube fiyatlandırmaları (tarih filtresi olmadan)
          supabase.from('branch_pricing').select('branch_id, monthly_price, per_visit_price'),
          // Yıl içindeki tamamlanmış ziyaretler
          supabase.from('visits').select('branch_id, customer_id, visit_date').eq('status', 'completed').gte('visit_date', startDate).lte('visit_date', endDate)
        ]);

        const responses = [salesRes, customerPricingRes, branchPricingRes, visitsRes];
        for (const res of responses) {
          if (res.error) throw res.error;
        }

        setSales(salesRes.data || []);
        setCustomerPricing(customerPricingRes.data || []);
        setBranchPricing(branchPricingRes.data || []);
        setVisits(visitsRes.data || []);

      } catch (error: any) {
        toast.error("Veriler çekilirken hata oluştu: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  // Aylık Ciro Hesaplaması (Gelir Paneli Mantığıyla)
  const monthlyRevenue = useMemo(() => {
    if (loading) return Array(12).fill(0);

    const monthlyRev = Array(12).fill(0);

    // --- 1. Adım: Tüm Aylık Anlaşma Gelirlerini Her Aya Ekle ---
    // Gelir Paneli'ndeki mantık: Her ay, tüm aktif aylık anlaşmaların toplamı kadar sabit gelir varsayılır.
    let totalMonthlyContractValue = 0;
    customerPricing.forEach(p => {
        totalMonthlyContractValue += p.monthly_price || 0;
    });
    branchPricing.forEach(p => {
        totalMonthlyContractValue += p.monthly_price || 0;
    });

    for (let i = 0; i < 12; i++) {
        monthlyRev[i] += totalMonthlyContractValue;
    }

    // --- 2. Adım: Ziyaret Başı Gelirleri İlgili Aylara Ekle ---
    const pricedBranches = new Set(branchPricing.filter(p => p.monthly_price && p.monthly_price > 0).map(p => p.branch_id));
    const customerPriceMap = new Map(customerPricing.map(cp => [cp.customer_id, { perVisit: cp.per_visit_price || 0 }]));
    const branchPriceMap = new Map(branchPricing.map(bp => [bp.branch_id, { perVisit: bp.per_visit_price || 0 }]));

    visits.forEach(visit => {
        const month = getMonth(new Date(visit.visit_date));
        const branchId = visit.branch_id;
        const customerId = visit.customer_id;

        if (!branchId || !customerId) return;
        
        let visitRevenue = 0;
        const branchPrice = branchPriceMap.get(branchId);
        const customerPrice = customerPriceMap.get(customerId);
        
        // Gelir Paneli'ndeki hiyerarşinin aynısı uygulanır:
        if (branchPrice?.perVisit > 0) {
            visitRevenue = branchPrice.perVisit;
        } else if (!pricedBranches.has(branchId) && customerPrice?.perVisit > 0) {
            // Sadece şubenin aylık anlaşması yoksa, müşteri geneli ziyaret başı ücreti geçerli olur.
            visitRevenue = customerPrice.perVisit;
        }
        
        monthlyRev[month] += visitRevenue;
    });

    // --- 3. Adım: Malzeme Satış Gelirlerini İlgili Aylara Ekle ---
    sales.forEach(sale => {
        const month = getMonth(new Date(sale.sale_date));
        monthlyRev[month] += sale.total_amount || 0;
    });

    return monthlyRev;
  }, [loading, sales, customerPricing, branchPricing, visits]);
  
  const totalAnnualRevenue = useMemo(() => {
    return monthlyRevenue.reduce((sum, rev) => sum + rev, 0);
  }, [monthlyRevenue]);

  const addExpense = useCallback(() => {
    if (newExpenseName.trim() === '' || newExpenseAmount === '' || newExpenseAmount <= 0) {
      toast.error('Lütfen geçerli bir gider adı ve pozitif bir miktar girin.');
      return;
    }
    setExpenses(prev => [...prev, { id: Date.now().toString(), name: newExpenseName.trim(), amount: Number(newExpenseAmount), month: newExpenseMonth }]);
    setNewExpenseName('');
    setNewExpenseAmount('');
    setNewExpenseMonth(getMonth(new Date()));
    toast.success('Gider başarıyla eklendi.');
  }, [newExpenseName, newExpenseAmount, newExpenseMonth]);

  const removeExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
    toast.info('Gider silindi.');
  }, []);

  const startEditingExpense = useCallback((expense: Expense) => {
    setEditingExpenseId(expense.id);
    setEditExpenseName(expense.name);
    setEditExpenseAmount(expense.amount);
    setEditExpenseMonth(expense.month);
  }, []);

  const saveEditedExpense = useCallback(() => {
    if (editingExpenseId === null || editExpenseName.trim() === '' || editExpenseAmount === '' || editExpenseAmount <= 0) {
      toast.error('Lütfen geçerli bir gider adı ve pozitif bir miktar girin.');
      return;
    }
    setExpenses(prev => prev.map(exp => 
      exp.id === editingExpenseId ? { ...exp, name: editExpenseName.trim(), amount: Number(editExpenseAmount), month: editExpenseMonth } : exp
    ));
    setEditingExpenseId(null);
    setEditExpenseName('');
    setEditExpenseAmount('');
    setEditExpenseMonth(0);
    toast.success('Gider güncellendi.');
  }, [editingExpenseId, editExpenseName, editExpenseAmount, editExpenseMonth]);

  const cancelEditingExpense = useCallback(() => {
    setEditingExpenseId(null);
    setEditExpenseName('');
    setEditExpenseAmount('');
    setEditExpenseMonth(0);
  }, []);

  const monthlyExpenses = useMemo(() => {
    const monthlyExp = Array(12).fill(0);
    expenses.forEach(exp => {
      monthlyExp[exp.month] += exp.amount;
    });
    return monthlyExp;
  }, [expenses]);

  const totalExpenses = useMemo(() => {
    return monthlyExpenses.reduce((sum, exp) => sum + exp, 0);
  }, [monthlyExpenses]);

  const monthlyNetProfit = useMemo(() => {
    return monthlyRevenue.map((rev, index) => rev - monthlyExpenses[index]);
  }, [monthlyRevenue, monthlyExpenses]);

  const netProfit = useMemo(() => {
    return totalAnnualRevenue - totalExpenses;
  }, [totalAnnualRevenue, totalExpenses]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span className="ml-3 text-lg text-gray-700">Veriler Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen font-inter">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Yıllık Kar/Zarar Raporu</h1>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="year-select" className="text-gray-700 font-medium">Yıl:</label>
          <input 
            id="year-select"
            type="number" 
            value={selectedYear} 
            onChange={e => setSelectedYear(parseInt(e.target.value))} 
            className="p-2 border rounded-lg w-24 text-center" 
            min="2000"
            max={getYear(new Date()) + 5}
          />
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg border flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-10 h-10 text-green-500 mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">Toplam Yıllık Ciro ({selectedYear})</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {totalAnnualRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border flex flex-col items-center justify-center text-center">
          <MinusCircle className="w-10 h-10 text-red-500 mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">Toplam Yıllık Giderler ({selectedYear})</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {totalExpenses.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </p>
        </div>
        <div className={`bg-white p-6 rounded-xl shadow-lg border flex flex-col items-center justify-center text-center ${netProfit >= 0 ? 'border-green-300' : 'border-red-300'}`}>
          <DollarSign className={`w-10 h-10 mb-3 ${netProfit >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
          <h3 className="text-lg font-semibold text-gray-700">Net Kar/Zarar ({selectedYear})</h3>
          <p className={`text-3xl font-bold mt-2 ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {netProfit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6 border mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <MinusCircle className="text-gray-500" /> Yıllık Gider Yönetimi
        </h2>
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Yeni Gider Ekle</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Gider Adı (örn: Kira, Maaşlar)"
              value={newExpenseName}
              onChange={(e) => setNewExpenseName(e.target.value)}
              className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="Miktar (TL)"
              value={newExpenseAmount}
              onChange={(e) => setNewExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full sm:w-40 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              min="0"
              step="0.01"
            />
            <select
              value={newExpenseMonth}
              onChange={(e) => setNewExpenseMonth(parseInt(e.target.value))}
              className="w-full sm:w-40 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {allMonths.map((monthName, index) => (
                <option key={index} value={index}>{monthName}</option>
              ))}
            </select>
            <button
              onClick={addExpense}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
            >
              <PlusCircle size={18} /> Ekle
            </button>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-3">Mevcut Giderler</h3>
          {expenses.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Henüz hiç gider eklenmedi.</p>
          ) : (
            <ul className="space-y-3">
              {expenses.map(expense => (
                <li key={expense.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                  {editingExpenseId === expense.id ? (
                    <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        value={editExpenseName}
                        onChange={(e) => setEditExpenseName(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md text-sm"
                      />
                      <input
                        type="number"
                        value={editExpenseAmount}
                        onChange={(e) => setEditExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="p-2 border border-gray-300 rounded-md text-sm"
                        min="0"
                        step="0.01"
                      />
                      <select
                        value={editExpenseMonth}
                        onChange={(e) => setEditExpenseMonth(parseInt(e.target.value))}
                        className="p-2 border border-gray-300 rounded-md text-sm"
                      >
                        {allMonths.map((monthName, index) => (
                          <option key={index} value={index}>{monthName}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex-grow">
                      <span className="font-medium text-gray-800">{expense.name}</span>
                      <span className="ml-3 text-gray-600">
                        ({allMonths[expense.month]}) {expense.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    {editingExpenseId === expense.id ? (
                      <>
                        <button
                          onClick={saveEditedExpense}
                          className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                          title="Kaydet"
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={cancelEditingExpense}
                          className="p-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors"
                          title="İptal"
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditingExpense(expense)}
                          className="p-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                          title="Düzenle"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => removeExpense(expense.id)}
                          className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Aylık Ciro, Gider ve Net Kar Detayı ({selectedYear})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ay</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ciro</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gider</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Kar/Zarar</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allMonths.map((monthName, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{monthName}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {monthlyRevenue[index].toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {monthlyExpenses[index].toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </td>
                  <td className={`px-4 py-3 text-sm font-bold text-right ${monthlyNetProfit[index] >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {monthlyNetProfit[index].toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">Yıllık Toplam</td>
                <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                  {totalAnnualRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                  {totalExpenses.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </td>
                <td className={`px-4 py-3 text-sm font-extrabold text-right ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {netProfit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default YillikKarZararRaporu;