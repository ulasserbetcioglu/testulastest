import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';

interface Visit {
  id: string;
  branch: {
    sube_adi: string;
  } | null;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
}

const CustomerCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    fetchVisits();
  }, [currentDate]);

  const fetchVisits = async () => {
    try {
      const customerId = await localAuth.getCurrentCustomerId();
      if (!customerId) throw new Error('Müşteri kaydı bulunamadı');

      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          visit_date,
          status,
          branch:branch_id (sube_adi)
        `)
        .eq('customer_id', customerId)
        .gte('visit_date', start.toISOString())
        .lte('visit_date', end.toISOString());

      if (error) throw error;
      setVisits(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const days = ['Pts', 'Sal', 'Çar', 'Per', 'Cum', 'Cts', 'Paz'];
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  let firstDayOfMonth = monthStart.getDay() - 1;
  if (firstDayOfMonth === -1) firstDayOfMonth = 6;

  const getVisitsForDay = (date: Date) => {
    return visits.filter(visit => {
      const visitDate = new Date(visit.visit_date);
      const matchesDate = visitDate.getDate() === date.getDate() &&
                         visitDate.getMonth() === date.getMonth() &&
                         visitDate.getFullYear() === date.getFullYear();
      
      const matchesStatus = !selectedStatus || visit.status === selectedStatus;

      return matchesDate && matchesStatus;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'planned':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'T';
      case 'planned':
        return 'P';
      case 'cancelled':
        return 'İ';
      default:
        return '';
    }
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ZİYARET TAKVİMİ</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-600 hover:text-gray-800 bg-white rounded-full shadow text-lg sm:text-xl"
          >
            ←
          </button>
          <span className="text-base sm:text-lg font-medium min-w-[120px] text-center">
            {format(currentDate, 'MMMM yyyy', { locale: tr })}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-600 hover:text-gray-800 bg-white rounded-full shadow text-lg sm:text-xl"
          >
            →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-2 sm:p-4">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full sm:w-48 px-2 py-1.5 sm:px-3 sm:py-2 border rounded text-sm"
        >
          <option value="">Tüm Durumlar</option>
          <option value="planned">Planlandı</option>
          <option value="completed">Tamamlandı</option>
          <option value="cancelled">İptal Edildi</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {days.map(day => (
            <div key={day} className="bg-gray-50 p-1 sm:p-2 text-center">
              <span className="text-[10px] sm:text-sm font-medium text-gray-500">{day}</span>
            </div>
          ))}

          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-gray-50 p-1 sm:p-2 min-h-[80px] sm:min-h-[120px]" />
          ))}

          {monthDays.map(day => {
            const dayVisits = getVisitsForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`bg-white p-1 sm:p-2 min-h-[80px] sm:min-h-[120px] ${
                  isCurrentDay ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className="text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5 sm:space-y-1 overflow-y-auto max-h-[60px] sm:max-h-[100px]">
                  {dayVisits.map(visit => (
                    <div
                      key={visit.id}
                      className={`text-[8px] sm:text-xs p-0.5 sm:p-1 rounded ${getStatusColor(visit.status)} text-white cursor-pointer`}
                      title={`Şube: ${visit.branch?.sube_adi || 'Belirtilmemiş'}`}
                    >
                      <span className="hidden sm:inline">
                        {visit.branch?.sube_adi 
                          ? (visit.branch.sube_adi.length > 15 
                              ? `${visit.branch.sube_adi.substring(0, 15)}...` 
                              : visit.branch.sube_adi)
                          : 'Belirtilmemiş'}
                      </span>
                      <span className="sm:hidden">
                        {getStatusText(visit.status)} - {visit.branch?.sube_adi 
                          ? (visit.branch.sube_adi.substring(0, 8) + (visit.branch.sube_adi.length > 8 ? '..' : ''))
                          : 'Belirtilmemiş'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-4 p-2 text-[10px] sm:text-sm">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded"></div>
          <span>Tamamlandı (T)</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded"></div>
          <span>Planlandı (P)</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded"></div>
          <span>İptal Edildi (İ)</span>
        </div>
      </div>
    </div>
  );
};

export default CustomerCalendar;