import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { Search, Filter, Calendar, Download, BarChart2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface MaterialUsage {
  product_id: string;
  product_name: string;
  total_quantity: number;
  month: string;
  year: number;
}

interface MonthlyUsageSummary {
  month: string;
  year: number;
  items: {
    product_id: string;
    product_name: string;
    total_quantity: number;
  }[];
  total_items: number;
  total_quantity: number;
}

const OperatorMaterialUsage: React.FC = () => {
  const [materialUsage, setMaterialUsage] = useState<MaterialUsage[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlyUsageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [viewMode, setViewMode] = useState<'monthly' | 'product'>('monthly');
  const [operatorId, setOperatorId] = useState<string | null>(null);

  useEffect(() => {
    fetchOperatorId();
  }, []);

  useEffect(() => {
    if (operatorId) {
      fetchMaterialUsage();
    }
  }, [operatorId, selectedMonth]);

  const fetchOperatorId = async () => {
    try {
      const opId = await localAuth.getCurrentOperatorId();
      if (!opId) throw new Error('Kullanıcı bulunamadı');

      const { data, error } = await supabase
        .from('operators')
        .select('id')
        .eq('id', opId)
        .single();

      if (error) throw error;
      setOperatorId(data.id);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching operator ID:', err);
    }
  };

  const fetchMaterialUsage = async () => {
    try {
      setLoading(true);
      
      if (!operatorId) {
        throw new Error('Operatör ID bulunamadı');
      }
      
      // Parse selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      
      // First get visits for this operator
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('id')
        .eq('operator_id', operatorId)
        .eq('status', 'completed')
        .gte('visit_date', startDate)
        .lte('visit_date', endDate);
        
      if (visitsError) throw visitsError;
      
      if (!visits || visits.length === 0) {
        setMaterialUsage([]);
        setMonthlySummaries([]);
        setLoading(false);
        return;
      }
      
      const visitIds = visits.map(v => v.id);
      
      // Then fetch sales related to these visits
      const { data: salesData, error: salesError } = await supabase
        .from('paid_material_sales')
        .select(`
          id,
          sale_date,
          items:paid_material_sale_items (
            id,
            product_id,
            product:product_id (name),
            quantity
          )
        `)
        .in('visit_id', visitIds)
        .in('status', ['approved', 'invoiced', 'paid'])
        .order('sale_date', { ascending: true });
      
      if (salesError) throw salesError;
      
      // Process the data to get material usage by product
      const usageMap: Record<string, MaterialUsage> = {};
      
      salesData?.forEach(sale => {
        const saleDate = new Date(sale.sale_date);
        const monthName = format(saleDate, 'MMMM', { locale: tr });
        const year = saleDate.getFullYear();
        
        sale.items.forEach(item => {
          if (!item.product) return;
          
          const key = `${item.product_id}-${monthName}-${year}`;
          
          if (!usageMap[key]) {
            usageMap[key] = {
              product_id: item.product_id,
              product_name: item.product.name,
              total_quantity: 0,
              month: monthName,
              year: year
            };
          }
          
          usageMap[key].total_quantity += item.quantity;
        });
      });
      
      const usageData = Object.values(usageMap);
      setMaterialUsage(usageData);
      
      // Generate monthly summaries
      const summaryMap: Record<string, MonthlyUsageSummary> = {};
      
      usageData.forEach(usage => {
        const key = `${usage.month}-${usage.year}`;
        
        if (!summaryMap[key]) {
          summaryMap[key] = {
            month: usage.month,
            year: usage.year,
            items: [],
            total_items: 0,
            total_quantity: 0
          };
        }
        
        summaryMap[key].items.push({
          product_id: usage.product_id,
          product_name: usage.product_name,
          total_quantity: usage.total_quantity
        });
        
        summaryMap[key].total_items += 1;
        summaryMap[key].total_quantity += usage.total_quantity;
      });
      
      const summaries = Object.values(summaryMap);
      setMonthlySummaries(summaries);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching material usage:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (viewMode === 'monthly') {
      // Export monthly summaries
      const data = monthlySummaries.map(summary => {
        const baseData = {
          'Dönem': `${summary.month} ${summary.year}`,
          'Toplam Ürün Çeşidi': summary.total_items,
          'Toplam Miktar': summary.total_quantity
        };
        
        // Add each product as a column
        summary.items.forEach(item => {
          baseData[`${item.product_name}`] = item.total_quantity;
        });
        
        return baseData;
      });
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Aylık Kullanım');
      XLSX.writeFile(wb, `Malzeme_Kullanim_Ozeti_${selectedMonth}.xlsx`);
    } else {
      // Export product-based data
      const data = materialUsage.map(usage => ({
        'Ürün': usage.product_name,
        'Dönem': `${usage.month} ${usage.year}`,
        'Miktar': usage.total_quantity
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ürün Kullanımı');
      XLSX.writeFile(wb, `Urun_Kullanim_Detayi_${selectedMonth}.xlsx`);
    }
  };

  // Filter material usage based on search term
  const filteredMaterialUsage = materialUsage.filter(usage => 
    usage.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter monthly summaries based on selected month
  const filteredMonthlySummaries = monthlySummaries.filter(summary => {
    // Convert month name to month number
    const monthNumber = new Date(Date.parse(`${summary.month} 1, ${summary.year}`)).getMonth() + 1;
    const formattedMonth = `${summary.year}-${String(monthNumber).padStart(2, '0')}`;
    
    return formattedMonth === selectedMonth;
  });

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">MALZEME KULLANIM ANALİZİ</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'product' ? 'monthly' : 'product')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <BarChart2 size={20} />
            {viewMode === 'product' ? 'Aylık Görünüm' : 'Ürün Görünümü'}
          </button>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download size={20} />
            Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Ürün Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Filter className="w-5 h-5" />
            Filtrele
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dönem
              </label>
              <input
                type="month"
                className="w-full p-2 border rounded"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {viewMode === 'monthly' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium">Aylık Kullanım Özeti</h3>
            <p className="text-sm text-gray-500">
              {selectedMonth.split('-')[0]} yılı {parseInt(selectedMonth.split('-')[1])}. ay
            </p>
          </div>
          
          {filteredMonthlySummaries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Bu ay için malzeme kullanımı bulunamadı
            </div>
          ) : (
            <div className="p-6">
              {filteredMonthlySummaries.map((summary, index) => (
                <div key={index} className="mb-8 last:mb-0">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium">{summary.month} {summary.year}</h4>
                    <div className="text-sm text-gray-500">
                      Toplam: {summary.total_quantity} adet ({summary.total_items} çeşit ürün)
                    </div>
                  </div>
                  
                  <div className="overflow-hidden bg-gray-100 rounded-lg">
                    {summary.items.map((item, itemIndex) => {
                      // Calculate percentage of total for bar width
                      const percentage = (item.total_quantity / summary.total_quantity) * 100;
                      
                      return (
                        <div key={itemIndex} className="mb-2 last:mb-0">
                          <div className="flex justify-between items-center px-4 py-2">
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm">{item.total_quantity} adet</div>
                          </div>
                          <div className="h-2 bg-gray-200 mx-4 mb-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ürün
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dönem
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Miktar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMaterialUsage.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      Malzeme kullanımı bulunamadı
                    </td>
                  </tr>
                ) : (
                  filteredMaterialUsage.map((usage, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{usage.product_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{usage.month} {usage.year}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-medium">{usage.total_quantity}</div>
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

export default OperatorMaterialUsage;