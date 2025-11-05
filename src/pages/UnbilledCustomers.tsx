// src/pages/UnbilledCustomers.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { DollarSign, Users, Building, Calendar, FileText, ReceiptText, CheckSquare, XSquare, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- ARAYÜZLER (INTERFACES) ---
interface Customer {
  id: string;
  kisa_isim: string;
  cari_isim?: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
}

interface Visit {
  id: string;
  customer_id: string;
  branch_id: string | null;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
  visit_type: string;
  report_number?: string;
  customer?: { kisa_isim: string };
  branch?: { sube_adi: string };
}

interface PaidMaterialSale {
  id: string;
  customer_id: string;
  branch_id: string | null;
  sale_date: string;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'invoiced' | 'paid';
  items?: { product: { name: string }, quantity: number }[];
}

interface CollectionReceipt {
  id: string;
  customer_id: string;
  branch_id: string | null;
  amount: number;
  receipt_date: string;
  receipt_no: string;
  payment_method: string;
  is_checked_by_admin: boolean;
  customer?: { kisa_isim: string };
  branch?: { sube_adi: string };
}

interface CustomerPricing {
  customer_id: string;
  monthly_price: number | null;
  per_visit_price: number | null;
}

interface BranchPricing {
  branch_id: string;
  monthly_price: number | null;
  per_visit_price: number | null;
}

interface CustomerDebtSummary {
  customer: Customer;
  totalDebt: number;
  totalCollections: number;
  balance: number;
  debtVisits: Visit[];
  debtMaterialSales: PaidMaterialSale[];
  collections: CollectionReceipt[];
}

// --- ANA BİLEŞEN ---
const UnbilledCustomers: React.FC = () => {
  const [customersData, setCustomersData] = useState<Customer[]>([]);
  const [visitsData, setVisitsData] = useState<Visit[]>([]);
  const [salesData, setSalesData] = useState<PaidMaterialSale[]>([]);
  const [receiptsData, setReceiptsData] = useState<CollectionReceipt[]>([]);
  const [customerPricingData, setCustomerPricingData] = useState<CustomerPricing[]>([]);
  const [branchPricingData, setBranchPricingData] = useState<BranchPricing[]>([]);
  const [branchesList, setBranchesList] = useState<Branch[]>([]); // For branch name lookup

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set()); // NEW: State for selected customer IDs

  // --- Veri Çekme ---
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const { data: user } = (await supabase.auth.getUser()).data;

        const [
          customersRes,
          visitsRes,
          salesRes,
          receiptsRes,
          customerPricingRes,
          branchPricingRes,
          branchesListRes,
        ] = await Promise.all([
          supabase.from('customers').select('id, kisa_isim, cari_isim').order('kisa_isim'),
          supabase.from('visits').select(`
            id, customer_id, branch_id, visit_date, status, visit_type, report_number,
            customer:customer_id(kisa_isim), branch:branch_id(sube_adi)
          `).eq('status', 'completed').eq('is_invoiced', false), // Sadece tamamlanmış ve faturalandırılmamış ziyaretler
          supabase.from('paid_material_sales').select(`
            id, customer_id, branch_id, sale_date, total_amount, status,
            items:paid_material_sale_items(product:product_id(name), quantity)
          `).filter('status', 'not.in', '("invoiced", "paid")'), // Faturalandırılmamış veya ödenmemiş satışlar
          supabase.from('collection_receipts').select(`
            id, customer_id, branch_id, amount, receipt_date, receipt_no, payment_method, is_checked_by_admin,
            customer:customer_id(kisa_isim), branch:branch_id(sube_adi)
          `).order('receipt_date', { ascending: false }),
          supabase.from('customer_pricing').select('customer_id, monthly_price, per_visit_price'),
          supabase.from('branch_pricing').select('branch_id, monthly_price, per_visit_price'),
          supabase.from('branches').select('id, sube_adi, customer_id'), // For branch name lookup
        ]);

        if (customersRes.error) throw customersRes.error;
        if (visitsRes.error) throw visitsRes.error;
        if (salesRes.error) throw salesRes.error;
        if (receiptsRes.error) throw receiptsRes.error;
        if (customerPricingRes.error) throw customerPricingRes.error;
        if (branchPricingRes.error) throw branchPricingRes.error;
        if (branchesListRes.error) throw branchesListRes.error;

        setCustomersData(customersRes.data || []);
        setVisitsData(visitsRes.data || []);
        setSalesData(salesRes.data || []);
        setReceiptsData(receiptsRes.data || []);
        setCustomerPricingData(customerPricingRes.data || []);
        setBranchPricingData(branchPricingRes.data || []);
        setBranchesList(branchesListRes.data || []);

      } catch (err: any) {
        setError(err.message);
        toast.error(`Veriler yüklenirken hata: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // --- Borç ve Tahsilat Hesaplaması ---
  const debtSummary: CustomerDebtSummary[] = useMemo(() => {
    const summaryMap = new Map<string, CustomerDebtSummary>();

    // Helper maps for quick lookups
    const customerPricingMap = new Map(customerPricingData.map(p => [p.customer_id, p]));
    const branchPricingMap = new Map(branchPricingData.map(p => [p.branch_id, p]));
    const branchesLookupMap = new Map(branchesList.map(b => [b.id, b]));

    // Initialize summary for all customers
    customersData.forEach(customer => {
      summaryMap.set(customer.id, {
        customer,
        totalDebt: 0,
        totalCollections: 0,
        balance: 0,
        debtVisits: [],
        debtMaterialSales: [],
        collections: [],
      });
    });

    // Calculate Debt from Visits
    visitsData.forEach(visit => {
      const customerSummary = summaryMap.get(visit.customer_id);
      if (!customerSummary) return;

      let visitValue = 0;
      // Prioritize branch pricing
      if (visit.branch_id && branchPricingMap.has(visit.branch_id)) {
        const pricing = branchPricingMap.get(visit.branch_id)!;
        if (pricing.per_visit_price) {
          visitValue = pricing.per_visit_price;
        } else if (pricing.monthly_price) {
          visitValue = pricing.monthly_price / 4; // Simplified: 4 visits per month
        }
      }
      // Fallback to customer pricing if no branch pricing or branch pricing is 0
      if (visitValue === 0 && customerPricingMap.has(visit.customer_id)) {
        const pricing = customerPricingMap.get(visit.customer_id)!;
        if (pricing.per_visit_price) {
          visitValue = pricing.per_visit_price;
        } else if (pricing.monthly_price) {
          visitValue = pricing.monthly_price / 4; // Simplified: 4 visits per month
        }
      }

      customerSummary.totalDebt += visitValue;
      customerSummary.debtVisits.push(visit);
    });

    // Calculate Debt from Paid Material Sales
    salesData.forEach(sale => {
      const customerSummary = summaryMap.get(sale.customer_id);
      if (!customerSummary) return;
      customerSummary.totalDebt += sale.total_amount;
      customerSummary.debtMaterialSales.push(sale);
    });

    // Calculate Collections
    receiptsData.forEach(receipt => {
      const customerSummary = summaryMap.get(receipt.customer_id);
      if (!customerSummary) return;
      customerSummary.totalCollections += receipt.amount;
      customerSummary.collections.push(receipt);
    });

    // Calculate Balance and return as array
    return Array.from(summaryMap.values()).map(summary => ({
      ...summary,
      balance: summary.totalDebt - summary.totalCollections,
    })).sort((a, b) => b.balance - a.balance); // Sort by balance descending
  }, [customersData, visitsData, salesData, receiptsData, customerPricingData, branchPricingData, branchesList]);

  // --- Tahsilat Makbuzu Onaylama İşlevi ---
  const handleCheckReceipt = useCallback(async (receiptId: string, isChecked: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email !== 'admin@ilaclamatik.com') { // Admin kontrolü burada yapılıyor
      toast.error('Bu işlemi gerçekleştirmek için admin yetkisine sahip olmalısınız.');
      return;
    }
    try {
      const { error } = await supabase
        .from('collection_receipts')
        .update({ is_checked_by_admin: isChecked })
        .eq('id', receiptId);

      if (error) throw error;

      setReceiptsData(prev => prev.map(receipt =>
        receipt.id === receiptId ? { ...receipt, is_checked_by_admin: isChecked } : receipt
      ));
      toast.success('Makbuz durumu güncellendi.');
    } catch (err: any) {
      toast.error(`Makbuz durumu güncellenirken hata: ${err.message}`);
    }
  }, []);

  // NEW: Handle individual customer selection
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  // NEW: Handle "Select All" checkbox
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allCustomerIds = new Set(debtSummary.map(summary => summary.customer.id));
      setSelectedCustomerIds(allCustomerIds);
    } else {
      setSelectedCustomerIds(new Set());
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span className="ml-3 text-lg text-gray-700">Veriler Yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-red-600 text-lg p-4 bg-red-100 rounded-lg shadow-md">
          <p>Hata oluştu:</p>
          <p className="font-mono mt-2">{error}</p>
          <p className="mt-4 text-sm text-gray-700">Lütfen sayfayı yenilemeyi deneyin veya yöneticinize başvurun.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Faturasız Müşteriler</h1>
      </header>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Müşteri Borç Durumu</h2>
          {/* NEW: Display selected count */}
          <p className="text-sm text-gray-600 mt-2">
            Seçili Müşteri Sayısı: {selectedCustomerIds.size}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* NEW: Checkbox for select all */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedCustomerIds.size === debtSummary.length && debtSummary.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Borç</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Tahsilat</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bakiye</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Detaylar</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {debtSummary.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500"> {/* Adjusted colspan */}
                    Gösterilecek faturasız müşteri bulunamadı.
                  </td>
                </tr>
              ) : (
                debtSummary.map(summary => (
                  <React.Fragment key={summary.customer.id}>
                    <tr className="hover:bg-gray-50">
                      {/* NEW: Checkbox for individual customer */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedCustomerIds.has(summary.customer.id)}
                          onChange={() => handleSelectCustomer(summary.customer.id)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {summary.customer.kisa_isim}
                        {summary.customer.cari_isim && <span className="text-gray-500 ml-2">({summary.customer.cari_isim})</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {summary.totalDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {summary.totalCollections.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${summary.balance > 0 ? 'text-red-600' : summary.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {summary.balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <details className="group">
                          <summary className="cursor-pointer list-none flex justify-end items-center text-blue-600 hover:text-blue-800">
                            Detaylar
                            <span className="ml-2 transform transition-transform group-open:rotate-180">
                              <ChevronDown size={16} />
                            </span>
                          </summary>
                          <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
                            <h4 className="font-semibold text-gray-800 mb-3">Borç Kalemleri</h4>
                            {summary.debtVisits.length === 0 && summary.debtMaterialSales.length === 0 ? (
                              <p className="text-sm text-gray-500">Borç kalemi bulunamadı.</p>
                            ) : (
                              <ul className="space-y-2 mb-4">
                                {summary.debtVisits.map(visit => (
                                  <li key={visit.id} className="text-sm text-gray-700 flex justify-between items-center">
                                    <span><Calendar size={14} className="inline mr-1" /> Ziyaret: {visit.customer?.kisa_isim} - {visit.branch?.sube_adi || 'Genel'} ({format(new Date(visit.visit_date), 'dd.MM.yyyy')})</span>
                                    <span className="font-medium text-red-600">Borç</span>
                                  </li>
                                ))}
                                {summary.debtMaterialSales.map(sale => (
                                  <li key={sale.id} className="text-sm text-gray-700 flex justify-between items-center">
                                    <span><FileText size={14} className="inline mr-1" /> Malzeme Satışı: {sale.total_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                    <span className="font-medium text-red-600">Borç</span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            <h4 className="font-semibold text-gray-800 mb-3">Tahsilat Makbuzları</h4>
                            {summary.collections.length === 0 ? (
                              <p className="text-sm text-gray-500">Tahsilat makbuzu bulunamadı.</p>
                            ) : (
                              <ul className="space-y-2">
                                {summary.collections.map(receipt => (
                                  <li key={receipt.id} className="text-sm text-gray-700 flex justify-between items-center">
                                    <div className="flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={receipt.is_checked_by_admin}
                                        onChange={(e) => handleCheckReceipt(receipt.id, e.target.checked)}
                                        className="mr-2"
                                      />
                                      <span><ReceiptText size={14} className="inline mr-1" /> Makbuz #{receipt.receipt_no} ({receipt.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })})</span>
                                    </div>
                                    <span className="font-medium text-green-600">Tahsilat</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UnbilledCustomers;
