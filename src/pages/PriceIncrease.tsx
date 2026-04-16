import React, { useState, useEffect } from 'react';
import { Save, Search, ArrowUpRight, TrendingUp, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { Customer, Branch } from '../types';

interface PriceItem {
  id: string; // customer_id or branch_id
  type: 'customer' | 'branch';
  name: string;
  parentName?: string; // For branches
  currentMonthlyPrice: number | null;
  currentPerVisitPrice: number | null;
  newMonthlyPrice: number | null;
  newPerVisitPrice: number | null;
  pricingId?: string; // ID from customer_pricing or branch_pricing table
  oldMonthlyPrice?: number | null;
  oldPerVisitPrice?: number | null;
  updatedAt?: string;
}

const PriceIncrease: React.FC = () => {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'customer' | 'branch'>('branch');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch Customers with Pricing
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('*, pricing:customer_pricing(*)')
        .eq('is_active', true)
        .order('kisa_isim');

      if (customerError) throw customerError;

      // Fetch Branches with Pricing and Customer info
      const { data: branches, error: branchError } = await supabase
        .from('branches')
        .select('*, pricing:branch_pricing(*), customer:customers(kisa_isim)')
        .order('sube_adi');

      if (branchError) throw branchError;

      const priceItems: PriceItem[] = [];

      // Process Customers
      customers?.forEach(customer => {
        priceItems.push({
          id: customer.id,
          type: 'customer',
          name: customer.kisa_isim,
          currentMonthlyPrice: customer.pricing?.monthly_price || null,
          currentPerVisitPrice: customer.pricing?.per_visit_price || null,
          newMonthlyPrice: customer.pricing?.monthly_price || null,
          newPerVisitPrice: customer.pricing?.per_visit_price || null,
          pricingId: customer.pricing?.id,
          oldMonthlyPrice: customer.pricing?.old_monthly_price,
          oldPerVisitPrice: customer.pricing?.old_per_visit_price,
          updatedAt: customer.pricing?.updated_at
        });
      });

      // Process Branches
      branches?.forEach(branch => {
        // Only include if customer is active? Assuming we want all
        priceItems.push({
          id: branch.id,
          type: 'branch',
          name: branch.sube_adi,
          parentName: branch.customer?.kisa_isim,
          currentMonthlyPrice: branch.pricing?.monthly_price || null,
          currentPerVisitPrice: branch.pricing?.per_visit_price || null,
          newMonthlyPrice: branch.pricing?.monthly_price || null,
          newPerVisitPrice: branch.pricing?.per_visit_price || null,
          pricingId: branch.pricing?.id,
          oldMonthlyPrice: branch.pricing?.old_monthly_price,
          oldPerVisitPrice: branch.pricing?.old_per_visit_price,
          updatedAt: branch.pricing?.updated_at
        });
      });

      setItems(priceItems);
    } catch (error: any) {
      toast.error('Veriler yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (id: string, field: 'newMonthlyPrice' | 'newPerVisitPrice', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: numValue } : item
    ));
  };

  const calculateIncrease = (oldPrice: number | null, newPrice: number | null) => {
    if (!oldPrice || !newPrice) return 0;
    return ((newPrice - oldPrice) / oldPrice) * 100;
  };

  const hasChanges = (item: PriceItem) => {
    return item.currentMonthlyPrice !== item.newMonthlyPrice ||
      item.currentPerVisitPrice !== item.newPerVisitPrice;
  };

  const handleSave = async () => {
    const changedItems = items.filter(hasChanges);

    if (changedItems.length === 0) {
      toast.info('Değişiklik yapılmadı');
      return;
    }

    try {
      setSaving(true);

      let successCount = 0;
      let errorCount = 0;

      for (const item of changedItems) {
        const table = item.type === 'customer' ? 'customer_pricing' : 'branch_pricing';
        const linkField = item.type === 'customer' ? 'customer_id' : 'branch_id';

        const payload: any = {
          monthly_price: item.newMonthlyPrice,
          per_visit_price: item.newPerVisitPrice,
          updated_at: new Date().toISOString()
        };

        // If monthly price changed, save old price
        if (item.currentMonthlyPrice !== item.newMonthlyPrice) {
          payload.old_monthly_price = item.currentMonthlyPrice;
        }

        // If per visit price changed, save old price
        if (item.currentPerVisitPrice !== item.newPerVisitPrice) {
          payload.old_per_visit_price = item.currentPerVisitPrice;
        }

        let result;

        if (item.pricingId) {
          // Update existing pricing
          result = await supabase
            .from(table)
            .update(payload)
            .eq('id', item.pricingId);
        } else {
          // Insert new pricing
          result = await supabase
            .from(table)
            .insert({
              [linkField]: item.id,
              ...payload
            });
        }

        if (result.error) {
          console.error(`Error updating ${item.name}:`, result.error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      if (errorCount > 0) {
        toast.warning(`${successCount} kayıt güncellendi, ${errorCount} kayıt güncellenemedi.`);
      } else {
        toast.success('Tüm değişiklikler başarıyla kaydedildi.');
      }

      // Refresh data to get new pricing IDs and reset "current" state
      fetchData();

    } catch (error: any) {
      toast.error('Kaydetme işlemi sırasında hata oluştu: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.parentName && item.parentName.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesDate = true;
    if (item.updatedAt) {
      const itemDate = new Date(item.updatedAt);
      if (startDate) {
        matchesDate = matchesDate && itemDate >= new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59);
        matchesDate = matchesDate && itemDate <= end;
      }
    } else if (startDate || endDate) {
      matchesDate = false; // If filtering by date but item has no date
    }

    if (typeFilter === 'all') return matchesSearch && matchesDate;
    return matchesSearch && item.type === typeFilter && matchesDate;
  });

  const totalCurrentMonthly = filteredItems.reduce((sum, item) => sum + (item.currentMonthlyPrice || 0), 0);
  const totalNewMonthly = filteredItems.reduce((sum, item) => sum + (item.newMonthlyPrice || 0), 0);
  const totalCurrentPerVisit = filteredItems.reduce((sum, item) => sum + (item.currentPerVisitPrice || 0), 0);
  const totalNewPerVisit = filteredItems.reduce((sum, item) => sum + (item.newPerVisitPrice || 0), 0);

  const avgMonthlyIncrease = totalCurrentMonthly > 0 ? ((totalNewMonthly - totalCurrentMonthly) / totalCurrentMonthly) * 100 : 0;
  const avgPerVisitIncrease = totalCurrentPerVisit > 0 ? ((totalNewPerVisit - totalCurrentPerVisit) / totalCurrentPerVisit) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-green-600" />
            Fiyat Artış Yönetimi
          </h1>
          <p className="text-gray-600 mt-1">Müşteri ve şube fiyatlarını toplu olarak güncelleyin ve artış oranlarını görüntüleyin.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTypeFilter('branch')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${typeFilter === 'branch' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              Şubeler
            </button>
            <button
              onClick={() => setTypeFilter('customer')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${typeFilter === 'customer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              Müşteriler
            </button>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${typeFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              Tümü
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Save size={20} />
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">Arama</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Müşteri veya Şube Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Filtreyi Temizle
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-xs font-medium text-gray-500 uppercase">Toplam Aylık Ciro (Mevcut)</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {totalCurrentMonthly.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-xs font-medium text-gray-500 uppercase">Toplam Aylık Ciro (Yeni)</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-green-600">
              {totalNewMonthly.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </p>
            <span className={`text-sm font-bold ${avgMonthlyIncrease > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              {avgMonthlyIncrease > 0 ? '+' : ''}%{avgMonthlyIncrease.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-xs font-medium text-gray-500 uppercase">Ziyaret Başı Ciro (Mevcut)</h3>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {totalCurrentPerVisit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-xs font-medium text-gray-500 uppercase">Ziyaret Başı Ciro (Yeni)</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-blue-600">
              {totalNewPerVisit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </p>
            <span className={`text-sm font-bold ${avgPerVisitIncrease > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
              {avgPerVisitIncrease > 0 ? '+' : ''}%{avgPerVisitIncrease.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Müşteri veya Şube Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Müşteri / Şube</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Son Güncelleme</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">Eski Aylık</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-blue-50">Mevcut Aylık</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-green-50">Aylık Fiyat (Yeni)</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Artış %</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50">Eski Ziyaret Başı</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-blue-50">Mevcut Ziyaret Başı</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider bg-green-50">Ziyaret Başı (Yeni)</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Artış %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-gray-500">Yükleniyor...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-gray-500">Kayıt bulunamadı.</td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const monthlyIncrease = calculateIncrease(item.currentMonthlyPrice, item.newMonthlyPrice);
                  const perVisitIncrease = calculateIncrease(item.currentPerVisitPrice, item.newPerVisitPrice);
                  const prevMonthlyIncrease = calculateIncrease(item.oldMonthlyPrice || null, item.currentMonthlyPrice);
                  const prevPerVisitIncrease = calculateIncrease(item.oldPerVisitPrice || null, item.currentPerVisitPrice);

                  return (
                    <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{item.name}</span>
                          {item.parentName && (
                            <span className="text-xs text-gray-500">{item.parentName}</span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 w-fit ${item.type === 'customer' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                            }`}>
                            {item.type === 'customer' ? 'Müşteri' : 'Şube'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('tr-TR') : '-'}
                      </td>

                      {/* Monthly Price */}
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 bg-gray-50/50">
                        <div className="flex flex-col items-center">
                          <span>{item.oldMonthlyPrice?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || '-'}</span>
                          {prevMonthlyIncrease !== 0 && (
                            <span className={`text-[10px] ${prevMonthlyIncrease > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              %{prevMonthlyIncrease.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 bg-blue-50/30">
                        {item.currentMonthlyPrice?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || '-'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center bg-green-50/30">
                        <div className="relative max-w-[120px] mx-auto">
                          <input
                            type="number"
                            value={item.newMonthlyPrice || ''}
                            onChange={(e) => handlePriceChange(item.id, 'newMonthlyPrice', e.target.value)}
                            className={`w-full text-center border rounded-md py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${item.newMonthlyPrice !== item.currentMonthlyPrice ? 'border-green-500 bg-green-50' : 'border-gray-300'
                              }`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {monthlyIncrease !== 0 && (
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${monthlyIncrease > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {monthlyIncrease > 0 ? <ArrowUpRight size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                            %{monthlyIncrease.toFixed(1)}
                          </span>
                        )}
                      </td>

                      {/* Per Visit Price */}
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 bg-gray-50/50">
                        <div className="flex flex-col items-center">
                          <span>{item.oldPerVisitPrice?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || '-'}</span>
                          {prevPerVisitIncrease !== 0 && (
                            <span className={`text-[10px] ${prevPerVisitIncrease > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              %{prevPerVisitIncrease.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 bg-blue-50/30">
                        {item.currentPerVisitPrice?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center bg-green-50/30">
                        <div className="relative max-w-[120px] mx-auto">
                          <input
                            type="number"
                            value={item.newPerVisitPrice || ''}
                            onChange={(e) => handlePriceChange(item.id, 'newPerVisitPrice', e.target.value)}
                            className={`w-full text-center border rounded-md py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${item.newPerVisitPrice !== item.currentPerVisitPrice ? 'border-green-500 bg-green-50' : 'border-gray-300'
                              }`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {perVisitIncrease !== 0 && (
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${perVisitIncrease > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {perVisitIncrease > 0 ? <ArrowUpRight size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                            %{perVisitIncrease.toFixed(1)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredItems.length > 0 && (
              <tfoot className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-right">GENEL TOPLAM:</td>
                  <td className="px-6 py-4 text-center bg-gray-50">-</td>
                  <td className="px-6 py-4 text-center bg-blue-100">{totalCurrentMonthly.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                  <td className="px-6 py-4 text-center bg-green-100">{totalNewMonthly.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                  <td className="px-6 py-4 text-center text-green-700">%{avgMonthlyIncrease.toFixed(1)}</td>
                  <td className="px-6 py-4 text-center bg-gray-50">-</td>
                  <td className="px-6 py-4 text-center bg-blue-100">{totalCurrentPerVisit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                  <td className="px-6 py-4 text-center bg-green-100">{totalNewPerVisit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                  <td className="px-6 py-4 text-center text-blue-700">%{avgPerVisitIncrease.toFixed(1)}</td>
                </tr>
              </tfoot>
            )}

          </table>
        </div>
      </div>
    </div >
  );
};

export default PriceIncrease;
