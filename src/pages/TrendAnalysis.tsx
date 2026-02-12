import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

export default function TrendAnalysis({ branchId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Veriyi Çek
  useEffect(() => {
    const fetchData = async () => {
      const { data: trendData, error } = await supabase
        .rpc('get_dashboard_trends', {
          p_branch_id: branchId,
          p_start_date: '2025-01-01', // Tarih seçiciden dinamik gelecek
          p_end_date: '2025-12-31'
        });

      if (trendData) {
        // Recharts için veriyi formatla
        // Örn: [{ period: '2025-01', Kemirgen: 5, Ucan: 12 }]
        const formatted = transformDataForChart(trendData);
        setData(formatted);
      }
      setLoading(false);
    };

    fetchData();
  }, [branchId]);

  // Yardımcı: Veriyi grafik formatına çevir
  const transformDataForChart = (rawData) => {
    const result = {};
    rawData.forEach(item => {
      if (!result[item.period]) result[item.period] = { period: item.period };
      result[item.period][item.pest_category] = item.total_count;
    });
    return Object.values(result);
  };

  if (loading) return <div>Analizler hazırlanıyor...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-8">
      
      {/* Başlık Alanı */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800">Trend Analiz Raporu</h1>
        <p className="text-gray-500">Şube bazlı haşere aktivite yoğunluk haritası</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Grafik 1: Aylık Değişim (Çizgi) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Aylık Aktivite Trendi</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} 
                />
                <Legend />
                <Line type="monotone" dataKey="Kemirgen" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Uçan Haşere" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik 2: Tür Karşılaştırma (Bar) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Aktivite Dağılımı</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Kemirgen" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Uçan Haşere" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}