// src/components/PaidMaterialSales/PaidMaterialsModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type PaidMaterial = {
  id: string;
  product: {
    name: string;
  };
  quantity: number;
  unit_price: number | null; // Updated to allow null
  total_price: number | null; // Updated to allow null
};

type MonthlyUsage = {
  month: string;
  year: number;
  visits: number;
  products: {
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
  total: number;
};

type PaidMaterialsModalProps = {
  visitId: string;
  materials: PaidMaterial[];
  branchName: string;
  onClose: () => void;
};

const PaidMaterialsModal: React.FC<PaidMaterialsModalProps> = ({
  visitId,
  materials,
  branchName,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'monthly'>('current');
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = materials.reduce((sum, material) => sum + (material.total_price ?? 0), 0); // Added ?? 0
  const currentYear = new Date().getFullYear();
  const allMonths = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyUsage();
    }
  }, [activeTab]);

  const fetchMonthlyUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: currentVisit, error: visitError } = await supabase
        .from('visits')
        .select('customer_id, branch_id')
        .eq('id', visitId)
        .single();
        
      if (visitError) throw visitError;
      if (!currentVisit) throw new Error('Ziyaret bulunamadı');
      
      const { data: allVisits, error: visitsError } = await supabase
        .from('visits')
        .select('id, visit_date, status')
        .eq('customer_id', currentVisit.customer_id)
        .eq('branch_id', currentVisit.branch_id)
        .eq('status', 'completed');
        
      if (visitsError) throw visitsError;
      
      const visitIds = allVisits?.map(v => v.id) || [];
      if (visitIds.length === 0) {
        setMonthlyUsage([]);
        setLoading(false);
        return;
      }

      // DÜZELTME 1: Ziyaret ID'sini ve tarihini eşleştirmek için bir harita oluşturuluyor.
      const visitDateMap = new Map<string, string>();
      allVisits?.forEach(v => {
        visitDateMap.set(v.id, v.visit_date);
      });

      const { data: sales, error: salesError } = await supabase
        .from('paid_material_sales')
        .select(`
          id, visit_id,
          items:paid_material_sale_items (
            id,
            product:product_id (name),
            quantity, unit_price, total_price
          )
        `)
        .in('visit_id', visitIds);
        
      if (salesError) throw salesError;
      
      const monthlyData: Record<string, {
        month: string;
        year: number;
        visits: Set<string>;
        products: Record<string, {
          name: string;
          quantity: number;
          unit_price: number;
          total: number;
        }>;
        total: number;
      }> = {};
      
      allMonths.forEach(month => {
        const key = `${month} ${currentYear}`;
        monthlyData[key] = {
          month, year: currentYear, visits: new Set(), products: {}, total: 0
        };
      });
      
      allVisits?.forEach(visit => {
        const date = new Date(visit.visit_date);
        const month = format(date, 'MMMM', { locale: tr });
        const year = date.getFullYear();
        const key = `${month} ${year}`;
        
        if (!monthlyData[key]) {
          monthlyData[key] = {
            month, year, visits: new Set(), products: {}, total: 0
          };
        }
        monthlyData[key].visits.add(visit.id);
      });
      
      sales?.forEach(sale => {
        if (!sale.visit_id) return;
        
        // DÜZELTME 2: Satış tarihi yerine, haritadan bulunan doğru ziyaret tarihi kullanılıyor.
        const visitDateString = visitDateMap.get(sale.visit_id);
        if (!visitDateString) return; // Eşleşen ziyaret yoksa bu satışı atla

        const date = new Date(visitDateString);
        const month = format(date, 'MMMM', { locale: tr });
        const year = date.getFullYear();
        const key = `${month} ${year}`;
        
        if (!monthlyData[key]) {
           monthlyData[key] = {
            month, year, visits: new Set(), products: {}, total: 0
          };
        }
        
        sale.items?.forEach(item => {
          if (!item.product) return;
          const productName = item.product.name;
          
          if (!monthlyData[key].products[productName]) {
            monthlyData[key].products[productName] = {
              name: productName, quantity: 0, unit_price: item.unit_price, total: 0
            };
          }
          
          monthlyData[key].products[productName].quantity += item.quantity;
          monthlyData[key].products[productName].total += (item.total_price ?? 0); // Added ?? 0
          monthlyData[key].total += (item.total_price ?? 0); // Added ?? 0
        });
      });
      
      const monthlyUsageArray = Object.values(monthlyData).map(data => ({
        month: data.month,
        year: data.year,
        visits: data.visits.size,
        products: Object.values(data.products),
        total: data.total
      }));
      
      monthlyUsageArray.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return allMonths.indexOf(a.month) - allMonths.indexOf(b.month);
      });
      
      setMonthlyUsage(monthlyUsageArray);
      
      const expanded: Record<string, boolean> = {};
      monthlyUsageArray.forEach(month => {
        if (month.products.length > 0) {
          expanded[`${month.month} ${month.year}`] = true;
        }
      });
      setExpandedMonths(expanded);
      
    } catch (err: any) {
      console.error('Error fetching monthly usage:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMonth = (monthYear: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthYear]: !prev[monthYear]
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Ücretli Malzemeler - {branchName}</h3>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-4 py-2 ${activeTab === 'current' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            >
              Bu Ziyaretin Malzemeleri
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 ${activeTab === 'monthly' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            >
              Aylık Kullanım Özeti
            </button>
          </div>
        </div>

        {activeTab === 'current' && (
          <div className="mt-4">
            {materials.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Bu ziyaret için ücretli malzeme bulunmuyor
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Malzeme</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Birim Fiyat</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {materials.map((material) => (
                    <tr key={material.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{material.product?.name || 'Bilinmeyen Ürün'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{material.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{(material.unit_price ?? 0).toLocaleString('tr-TR')} ₺</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{(material.total_price ?? 0).toLocaleString('tr-TR')} ₺</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">Toplam Tutar:</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{total.toLocaleString('tr-TR')} ₺</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="mt-4 max-h-96 overflow-y-auto">
            <h4 className="text-lg font-medium mb-4">Aylık Kullanım Özeti</h4>
            
            {loading ? (
              <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">Hata: {error}</div>
            ) : (
              <div className="space-y-4">
                {monthlyUsage.map((month) => {
                  const monthYear = `${month.month} ${month.year}`;
                  const isExpanded = !!expandedMonths[monthYear];
                  
                  return (
                    <div key={monthYear} className="border rounded-lg overflow-hidden">
                      <div 
                        className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
                        onClick={() => toggleMonth(monthYear)}
                      >
                        <div className="flex items-center">
                          <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                          <span className="font-medium">{monthYear}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="flex items-center mr-4">
                            <span className="text-sm text-gray-500 mr-2">{month.visits} Ziyaret</span>
                            <span className="font-medium">{month.total.toLocaleString('tr-TR')} ₺</span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                      
                      {isExpanded && month.products.length > 0 && (
                        <div className="p-4 border-t">
                          <table className="min-w-full">
                            <thead>
                              <tr className="text-xs text-gray-500 uppercase">
                                <th className="text-left py-2">Malzeme</th>
                                <th className="text-center py-2">Miktar</th>
                                <th className="text-right py-2">Birim Fiyat</th>
                                <th className="text-right py-2">Toplam</th>
                              </tr>
                            </thead>
                            <tbody>
                              {month.products.map((product, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="py-2 text-sm">{product.name}</td>
                                  <td className="py-2 text-sm text-center">{product.quantity} adet</td>
                                  <td className="py-2 text-sm text-right">{(product.unit_price ?? 0).toLocaleString('tr-TR')} ₺</td>
                                  <td className="py-2 text-sm text-right font-medium">{(product.total ?? 0).toLocaleString('tr-TR')} ₺</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {isExpanded && month.products.length === 0 && (
                        <div className="p-4 border-t text-center text-gray-500">
                          Bu ay için malzeme kullanımı bulunmuyor
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaidMaterialsModal;

