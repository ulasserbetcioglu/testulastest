import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Table, 
  MapPin, 
  Calendar, 
  Filter, 
  Search, 
  Download, 
  Loader2, 
  Car,
  TrendingUp 
} from 'lucide-react';
import { format, setWeek, startOfWeek, endOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import * as XLSX from 'xlsx'; // Excel çıktısı için (opsiyonel, yoksa kaldırabilirsiniz)

interface KmRecord {
  id: string;
  operator_id: string;
  year: number;
  week_number: number;
  start_km: number;
  end_km: number;
  total_km: number;
  submitted_at: string;
  operators: {
    name: string;
  };
}

interface Operator {
  id: string;
  name: string;
}

const AdminWeeklyKmTracking: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<KmRecord[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  
  // Filtreler
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchOperators();
    fetchKmRecords();
  }, [selectedOperator, selectedYear]);

  const fetchOperators = async () => {
    const { data } = await supabase.from('operators').select('id, name').order('name');
    setOperators(data || []);
  };

  const fetchKmRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('operator_weekly_km')
        .select(`
          *,
          operators (name)
        `)
        .eq('year', selectedYear)
        .order('week_number', { ascending: false });

      if (selectedOperator !== 'all') {
        query = query.eq('operator_id', selectedOperator);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Hafta numarasından tarih aralığını bulma
  const getWeekDateRange = (year: number, weekNo: number) => {
    // Yılın ilk haftasını baz alarak tarihi ayarla
    const date = setWeek(new Date(year, 0, 1), weekNo, { weekStartsOn: 1 });
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    
    return `${format(start, 'd MMM', { locale: tr })} - ${format(end, 'd MMM', { locale: tr })}`;
  };

  // Excel İndirme
  const exportToExcel = () => {
    const dataToExport = records.map(rec => ({
      'Operatör': rec.operators?.name,
      'Yıl': rec.year,
      'Hafta': rec.week_number,
      'Tarih Aralığı': getWeekDateRange(rec.year, rec.week_number),
      'Başlangıç KM': rec.start_km,
      'Bitiş KM': rec.end_km,
      'Toplam Yapılan (KM)': rec.total_km,
      'Kayıt Tarihi': format(new Date(rec.submitted_at), 'dd.MM.yyyy HH:mm')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KM Takip");
    XLSX.writeFile(wb, `KM_Raporu_${selectedYear}.xlsx`);
  };

  // Toplam Hesaplama
  const totalKm = records.reduce((sum, rec) => sum + (rec.total_km || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Başlık */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Car className="text-blue-600" />
            Araç KM Takip & Raporlama
          </h1>
          <p className="text-gray-500 text-sm">Operatörlerin haftalık araç kullanım kayıtları.</p>
        </div>
        <button 
          onClick={exportToExcel}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
        >
          <Download size={18} /> Excel İndir
        </button>
      </div>

      {/* İstatistik Kartı */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Toplam Yapılan Yol</p>
            <p className="text-2xl font-bold text-gray-900">{totalKm.toLocaleString('tr-TR')} km</p>
            <p className="text-xs text-blue-600 font-medium">{selectedYear} Yılı / Seçili Operatör</p>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Filtrele:</span>
        </div>
        
        <select 
          value={selectedOperator} 
          onChange={(e) => setSelectedOperator(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px]"
        >
          <option value="all">Tüm Operatörler</option>
          {operators.map(op => (
            <option key={op.id} value={op.id}>{op.name}</option>
          ))}
        </select>

        <select 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value={2024}>2024</option>
          <option value={2025}>2025</option>
          <option value={2026}>2026</option>
        </select>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-medium">
                <tr>
                  <th className="px-6 py-4">Operatör</th>
                  <th className="px-6 py-4">Dönem (Yıl / Hafta)</th>
                  <th className="px-6 py-4">Tarih Aralığı</th>
                  <th className="px-6 py-4 text-right">Başlangıç KM</th>
                  <th className="px-6 py-4 text-right">Bitiş KM</th>
                  <th className="px-6 py-4 text-right">Yapılan Yol</th>
                  <th className="px-6 py-4 text-center">Bildirim Tarihi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">Kayıt bulunamadı.</td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {record.operators?.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">
                          {record.year} / {record.week_number}. Hafta
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {getWeekDateRange(record.year, record.week_number)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-500">
                        {record.start_km.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-900 font-bold">
                        {record.end_km.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold">
                          {record.total_km.toFixed(1)} km
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500 text-xs">
                        {format(new Date(record.submitted_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWeeklyKmTracking;