// src/pages/AdminOperatorShifts.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { format, intervalToDuration, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Loader2, Search, Filter, Calendar, User, MapPin, Clock, Download, List, LayoutDashboard, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';

// --- ARAYÜZLER (INTERFACES) ---
interface OperatorShift {
  id: string;
  operator_id: string;
  check_in_time: string;
  check_out_time: string | null;
  start_location_latitude: number | null;
  start_location_longitude: number | null;
  end_location_latitude: number | null;
  end_location_longitude: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  operator: { // İlişkili operatör bilgisi
    id: string;
    name: string;
    email: string;
  } | null;
}

interface Operator {
  id: string;
  name: string;
  email: string;
}

// --- YARDIMCI FONKSİYONLAR ---

// Mesai süresini hesapla ve formatla
const formatDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let result = '';
    if (hours > 0) result += `${hours}s `;
    if (minutes > 0) result += `${minutes}dk `;
    if (seconds > 0) result += `${seconds}sn`;
    
    return result.trim() || '0dk';
};

// Konum linki oluştur
const formatLocation = (lat: number | null, lng: number | null): string => {
  if (lat === null || lng === null) return 'N/A';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

// --- ANA BİLEŞEN ---
const AdminOperatorShifts: React.FC = () => {
  const [shifts, setShifts] = useState<OperatorShift[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtre state'leri
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01')); // Ayın ilk günü
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd')); // Bugün
  const [searchTerm, setSearchTerm] = useState('');

  // Yeni state'ler
  const [viewMode, setViewMode] = useState<'table' | 'summary'>('table'); // 'table' veya 'summary'
  const [monthlySummaryData, setMonthlySummaryData] = useState<any[]>([]);
  const [selectedOperatorForDailyView, setSelectedOperatorForDailyView] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Takvim için mevcut ay

  // --- VERİ ÇEKME ---
  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('operator_shifts')
        .select(`
          *,
          operator:operator_id(id, name, email)
        `)
        .order('check_in_time', { ascending: false });

      // Tarih aralığı filtresi
      if (startDate) {
        query = query.gte('check_in_time', `${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        query = query.lte('check_in_time', `${endDate}T23:59:59.999Z`);
      }

      // Operatör filtresi
      if (selectedOperator !== 'all') {
        query = query.eq('operator_id', selectedOperator);
      }

      const { data, error } = await query;

      if (error) throw error;
      setShifts(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Mesai çizelgeleri çekilirken hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedOperator, startDate, endDate]);

  const fetchOperators = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('operators')
        .select('id, name, email')
        .order('name');
      if (error) throw error;
      setOperators(data || []);
    } catch (err: any) {
      toast.error(`Operatörler çekilirken hata: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    fetchOperators();
    fetchShifts();
  }, [fetchOperators, fetchShifts]);

  // --- ÖZET VERİ İŞLEME ---
  const processShiftsForSummary = useCallback(() => {
    const summaryMap = new Map<string, {
        operatorId: string;
        operatorName: string;
        totalDurationSeconds: number;
        daysWorked: Set<string>; // "YYYY-MM-DD"
        shiftsByDay: Map<string, { checkIn: string; checkOut: string | null; }[]>; // "YYYY-MM-DD" -> shifts
    }>();

    shifts.forEach(shift => {
        const opId = shift.operator_id;
        const opName = shift.operator?.name || 'Bilinmiyor';
        const checkInTime = parseISO(shift.check_in_time);
        const checkOutTime = shift.check_out_time ? parseISO(shift.check_out_time) : null;
        const dayKey = format(checkInTime, 'yyyy-MM-dd');

        if (!summaryMap.has(opId)) {
            summaryMap.set(opId, {
                operatorId: opId,
                operatorName: opName,
                totalDurationSeconds: 0,
                daysWorked: new Set(),
                shiftsByDay: new Map()
            });
        }

        const entry = summaryMap.get(opId)!;
        entry.daysWorked.add(dayKey);
        
        if (!entry.shiftsByDay.has(dayKey)) {
            entry.shiftsByDay.set(dayKey, []);
        }
        entry.shiftsByDay.get(dayKey)!.push({ checkIn: shift.check_in_time, checkOut: shift.check_out_time });

        if (checkOutTime) {
            const duration = intervalToDuration({ start: checkInTime, end: checkOutTime });
            const totalSeconds = (duration.days || 0) * 24 * 3600 + (duration.hours || 0) * 3600 + (duration.minutes || 0) * 60 + (duration.seconds || 0);
            entry.totalDurationSeconds += totalSeconds;
        }
    });

    return Array.from(summaryMap.values()).map(entry => ({
        ...entry,
        totalDurationFormatted: formatDuration(entry.totalDurationSeconds)
    }));
  }, [shifts]);

  useEffect(() => {
    setMonthlySummaryData(processShiftsForSummary());
  }, [shifts, processShiftsForSummary]);

  // --- Excel'e aktar ---
  const exportToExcel = () => {
    const dataToExport = filteredShifts.map(shift => ({
      'Operatör Adı': shift.operator?.name || 'Bilinmiyor',
      'Operatör E-posta': shift.operator?.email || 'Bilinmiyor',
      'Giriş Zamanı': format(parseISO(shift.check_in_time), 'dd.MM.yyyy HH:mm', { locale: tr }),
      'Çıkış Zamanı': shift.check_out_time ? format(parseISO(shift.check_out_time), 'dd.MM.yyyy HH:mm', { locale: tr }) : 'Devam Ediyor',
      'Mesai Süresi': calculateDuration(shift.check_in_time, shift.check_out_time),
      'Giriş Konumu (Enlem)': shift.start_location_latitude || 'N/A',
      'Giriş Konumu (Boylam)': shift.start_location_longitude || 'N/A',
      'Çıkış Konumu (Enlem)': shift.end_location_latitude || 'N/A',
      'Çıkış Konumu (Boylam)': shift.end_location_longitude || 'N/A',
      'Notlar': shift.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mesai Çizelgeleri');
    XLSX.writeFile(wb, `operator_mesai_cizelgeleri_${startDate}_${endDate}.xlsx`);
    toast.success('Mesai çizelgeleri Excel\'e aktarıldı!');
  };

  // --- FİLTRELEME ---
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      const matchesSearch = 
        (shift.operator?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (shift.operator?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (shift.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [shifts, searchTerm]);

  // --- TAKVİM GÖRÜNÜMÜ İÇİN YARDIMCI DEĞİŞKENLER ---
  const daysOfWeek = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const monthStart = startOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentMonth) });
  const startingDayIndex = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1; // Pazartesi 0 olacak şekilde

  // --- RENDER ---
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span className="ml-3 text-lg text-gray-700">Mesai çizelgeleri yükleniyor...</span>
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
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Operatör Mesai Çizelgeleri</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            <List size={20} /> Liste Görünümü
          </button>
          <button
            onClick={() => setViewMode('summary')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${viewMode === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            <LayoutDashboard size={20} /> Özet Görünümü
          </button>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download size={20} /> Excel'e Aktar
          </button>
        </div>
      </header>

      {/* Filtreler */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operatör</label>
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Tüm Operatörler</option>
              {operators.map(op => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arama</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Operatör adı veya not ara..."
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={fetchShifts}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            disabled={loading}
          >
            <Filter size={20} /> Filtrele
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        // Mesai Çizelgesi Tablosu
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operatör</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giriş Zamanı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çıkış Zamanı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mesai Süresi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giriş Konumu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çıkış Konumu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notlar</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredShifts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Gösterilecek mesai kaydı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredShifts.map(shift => (
                    <tr key={shift.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User size={16} className="mr-2 text-gray-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{shift.operator?.name || 'Bilinmiyor'}</div>
                            <div className="text-xs text-gray-500">{shift.operator?.email || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(parseISO(shift.check_in_time), 'dd.MM.yyyy HH:mm', { locale: tr })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {shift.check_out_time ? format(parseISO(shift.check_out_time), 'dd.MM.yyyy HH:mm', { locale: tr }) : <span className="text-yellow-600 font-medium">Devam Ediyor</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(intervalToDuration({ start: parseISO(shift.check_in_time), end: shift.check_out_time ? parseISO(shift.check_out_time) : new Date() }).totalSeconds || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-1 text-blue-500" />
                          {formatLocation(shift.start_location_latitude, shift.start_location_longitude)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-1 text-blue-500" />
                          {formatLocation(shift.end_location_latitude, shift.end_location_longitude)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={shift.notes || ''}>
                        {shift.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Özet Görünümü
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Operatör Mesai Özeti ({format(currentMonth, 'MMMM yyyy', { locale: tr })})</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(prev => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() - 1, 1)))} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft /></button>
              <span className="font-medium">{format(currentMonth, 'MMMM yyyy', { locale: tr })}</span>
              <button onClick={() => setCurrentMonth(prev => startOfMonth(new Date(prev.getFullYear(), prev.getMonth() + 1, 1)))} className="p-2 rounded-full hover:bg-gray-100"><ChevronRight /></button>
            </div>
          </div>

          {selectedOperatorForDailyView ? (
            // Günlük Detay Görünümü
            <div className="mt-6">
              <button onClick={() => setSelectedOperatorForDailyView(null)} className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2">
                <ArrowLeft /> Geri
              </button>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {monthlySummaryData.find(op => op.operatorId === selectedOperatorForDailyView)?.operatorName} - Günlük Mesai Detayı
              </h3>
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                {daysOfWeek.map(day => <div key={day} className="bg-gray-50 p-2 text-center font-bold text-gray-600 text-sm">{day}</div>)}
                {Array.from({ length: startingDayIndex }).map((_, i) => <div key={`empty-${i}`} className="bg-gray-100 p-2 min-h-[80px]"></div>)}
                {eachDayOfInterval({ start: monthStart, end: endOfMonth(currentMonth) }).map(day => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const operatorSummary = monthlySummaryData.find(op => op.operatorId === selectedOperatorForDailyView);
                  const shiftsOnDay = operatorSummary?.shiftsByDay.get(dayKey) || [];
                  const hasShift = shiftsOnDay.length > 0;
                  const isCurrentDay = isToday(day);

                  return (
                    <div key={dayKey} className={`p-2 min-h-[80px] border border-gray-200 ${isCurrentDay ? 'bg-blue-100' : 'bg-white'}`}>
                      <div className="text-xs font-medium text-gray-500 mb-1">{format(day, 'd')}</div>
                      <div className="space-y-1">
                        {shiftsOnDay.map((shift, idx) => (
                          <div key={idx} className={`p-1 rounded text-white text-[10px] ${shift.checkOut ? 'bg-green-500' : 'bg-yellow-500'}`}>
                            {format(parseISO(shift.checkIn), 'HH:mm')} - {shift.checkOut ? format(parseISO(shift.checkOut), 'HH:mm') : 'Devam'}
                          </div>
                        ))}
                        {!hasShift && <div className="p-1 rounded bg-gray-300 text-gray-700 text-[10px]">Mesai Yok</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Operatör Özet Tablosu
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operatör</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Mesai Süresi</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışılan Gün Sayısı</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Detay</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthlySummaryData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        Gösterilecek özet veri bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    monthlySummaryData.map(op => (
                      <tr key={op.operatorId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User size={16} className="mr-2 text-gray-500" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{op.operatorName}</div>
                              <div className="text-xs text-gray-500">{op.operator?.email || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {op.totalDurationFormatted}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                          {op.daysWorked.size}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button onClick={() => setSelectedOperatorForDailyView(op.operatorId)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200">
                            Günlük Gör
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminOperatorShifts;
