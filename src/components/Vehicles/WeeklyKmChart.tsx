import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';
import { format, subWeeks } from 'date-fns';
import { tr } from 'date-fns/locale';

interface WeeklyKmData {
  id: string;
  operator_id: string;
  operator_name: string;
  week_number: number;
  year: number;
  start_km: number;
  end_km: number;
  total_km: number;
  submitted_at: string;
  vehicle_plate?: string;
}

interface ChartDataPoint {
  week: string;
  [key: string]: any;
}

const COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // green-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
  '#84CC16', // lime-500
];

const WeeklyKmChart: React.FC = () => {
  const [kmData, setKmData] = useState<WeeklyKmData[]>([]);
  const [operators, setOperators] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [weeksToShow, setWeeksToShow] = useState(8);

  useEffect(() => {
    fetchData();
  }, [weeksToShow]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const weeksAgo = subWeeks(now, weeksToShow);
      const targetWeek = getWeekNumber(weeksAgo);
      const targetYear = weeksAgo.getFullYear();

      const [kmRes, opRes, vehiclesRes] = await Promise.all([
        supabase
          .from('operator_weekly_km')
          .select('*')
          .gte('year', targetYear)
          .order('year', { ascending: true })
          .order('week_number', { ascending: true }),
        supabase
          .from('operators')
          .select('id, name')
          .order('name'),
        supabase
          .from('vehicles')
          .select('id, plate_number, operator_id')
      ]);

      if (kmRes.error) throw kmRes.error;
      if (opRes.error) throw opRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;

      const vehicleMap = new Map(
        vehiclesRes.data.map(v => [v.operator_id, v.plate_number])
      );

      const enrichedData = kmRes.data.map((km: any) => {
        const operator = opRes.data.find(op => op.id === km.operator_id);
        return {
          ...km,
          operator_name: operator?.name || 'Bilinmeyen',
          vehicle_plate: vehicleMap.get(km.operator_id) || '-',
        };
      });

      const operatorsWithColors = opRes.data.map((op, idx) => ({
        ...op,
        color: COLORS[idx % COLORS.length],
      }));

      setKmData(enrichedData);
      setOperators(operatorsWithColors);
    } catch (err) {
      console.error('KM verisi çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const chartData: ChartDataPoint[] = [];
  const weekSet = new Set<string>();

  kmData.forEach(km => {
    const weekKey = `${km.year}-W${km.week_number}`;
    weekSet.add(weekKey);
  });

  const sortedWeeks = Array.from(weekSet).sort();

  sortedWeeks.forEach(weekKey => {
    const dataPoint: ChartDataPoint = { week: weekKey };

    operators.forEach(operator => {
      const kmEntry = kmData.find(
        km => `${km.year}-W${km.week_number}` === weekKey && km.operator_id === operator.id
      );
      dataPoint[operator.name] = kmEntry ? kmEntry.total_km : 0;
    });

    chartData.push(dataPoint);
  });

  const totalKmByOperator = operators.map(operator => {
    const total = kmData
      .filter(km => km.operator_id === operator.id)
      .reduce((sum, km) => sum + km.total_km, 0);
    return { ...operator, total };
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Operatör Haftalık KM Grafik</h2>
          </div>
          <select
            value={weeksToShow}
            onChange={(e) => setWeeksToShow(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={4}>Son 4 Hafta</option>
            <option value={8}>Son 8 Hafta</option>
            <option value={12}>Son 12 Hafta</option>
            <option value={26}>Son 6 Ay</option>
          </select>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Henüz haftalık km verisi bulunmuyor</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                style={{ fontSize: '12px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                label={{ value: 'KM', angle: -90, position: 'insideLeft' }}
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '8px' }}
                formatter={(value: any) => [`${value.toFixed(1)} km`, '']}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {operators.map(operator => (
                <Line
                  key={operator.id}
                  type="monotone"
                  dataKey={operator.name}
                  stroke={operator.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Operatör Bazlı KM Detayları</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Renk</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operatör</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Araç</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam KM</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kayıt Sayısı</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {totalKmByOperator.map(operator => {
                const operatorRecords = kmData.filter(km => km.operator_id === operator.id);
                const vehiclePlate = operatorRecords[0]?.vehicle_plate || '-';

                return (
                  <tr key={operator.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div
                        className="w-8 h-8 rounded-full shadow-sm"
                        style={{ backgroundColor: operator.color }}
                      ></div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{operator.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono">{vehiclePlate}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      {operator.total.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {operatorRecords.length} hafta
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {totalKmByOperator.map(operator => {
          const operatorRecords = kmData.filter(km => km.operator_id === operator.id);
          const avgKm = operator.total / (operatorRecords.length || 1);
          const vehiclePlate = operatorRecords[0]?.vehicle_plate || '-';

          return (
            <div
              key={operator.id}
              className="bg-white rounded-lg shadow-md p-4 border-l-4"
              style={{ borderLeftColor: operator.color }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800 text-sm">{operator.name}</h4>
                <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {vehiclePlate}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Toplam:</span>
                  <span className="font-bold text-gray-900">
                    {operator.total.toLocaleString('tr-TR', { minimumFractionDigits: 1 })} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ortalama:</span>
                  <span className="font-semibold text-blue-600">
                    {avgKm.toLocaleString('tr-TR', { minimumFractionDigits: 1 })} km/hafta
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kayıt:</span>
                  <span className="text-gray-700">{operatorRecords.length} hafta</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyKmChart;
