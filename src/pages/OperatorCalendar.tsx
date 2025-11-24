import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';

interface Visit {
  id: string;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
  customer: {
    kisa_isim: string;
  } | null;
  branch: {
    sube_adi: string;
    latitude?: number;
    longitude?: number;
  } | null;
}

const OperatorCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [operatorId, setOperatorId] = useState<string | null>(null);

  useEffect(() => {
    fetchOperatorId();
  }, []);

  useEffect(() => {
    if (operatorId) {
      fetchVisits();
    }
  }, [currentDate, operatorId]);

  const fetchOperatorId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('operators')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (error) throw error;
      setOperatorId(data.id);
    } catch (error) {
      console.error('Error fetching operator:', error);
    }
  };

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentDate).toISOString();
      const end = endOfMonth(currentDate).toISOString();

      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          visit_date,
          status,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi, latitude, longitude)
        `)
        .eq('operator_id', operatorId)
        .gte('visit_date', start)
        .lte('visit_date', end);

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startingDayIndex = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;

  // Planlanan ziyaretleri filtrele
  const plannedVisits = visits
    .filter(v => v.status === 'planned')
    .sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());

  if (loading && !visits.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-4 mb-4 sm:mb-0">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-800 min-w-[180px] text-center">
            {format(currentDate, 'MMMM yyyy', { locale: tr })}
          </h2>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronRight size={24} className="text-gray-600" />
          </button>
        </div>
        <button 
          onClick={() => setCurrentDate(new Date())}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Bugün
        </button>
      </div>

      {/* YER DEĞİŞİKLİĞİ: Takvim artık yukarıda */}
      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {daysOfWeek.map((day) => (
            <div key={day} className="py-3 text-center text-sm font-semibold text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px border-b border-gray-200">
          {/* Empty cells for previous month */}
          {Array.from({ length: startingDayIndex }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-white min-h-[100px] p-2" />
          ))}

          {/* Days of current month */}
          {monthDays.map((day) => {
            const dayVisits = visits.filter(
              (v) => new Date(v.visit_date).toDateString() === day.toDateString()
            );
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toString()}
                className={`bg-white min-h-[100px] p-2 transition-colors hover:bg-gray-50 ${
                  isCurrentDay ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                      isCurrentDay
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayVisits.length > 0 && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {dayVisits.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {dayVisits.map((visit) => (
                    <div
                      key={visit.id}
                      className={`px-2 py-1 rounded text-xs truncate border ${
                        visit.status === 'completed'
                          ? 'bg-green-50 text-green-700 border-green-100'
                          : visit.status === 'cancelled'
                          ? 'bg-red-50 text-red-700 border-red-100'
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}
                      title={`${visit.customer?.kisa_isim} - ${format(new Date(visit.visit_date), 'HH:mm')}`}
                    >
                      <div className="font-medium truncate">
                        {visit.customer?.kisa_isim || 'Müşteri Yok'}
                      </div>
                      <div className="text-[10px] opacity-75 truncate">
                        {format(new Date(visit.visit_date), 'HH:mm')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* YER DEĞİŞİKLİĞİ: Planlanan Ziyaretler Listesi artık aşağıda */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="text-blue-600" size={20} />
            Bu Ay Planlanan Ziyaretler
          </h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {plannedVisits.length} Ziyaret
          </span>
        </div>

        <div className="space-y-3">
          {plannedVisits.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              Bu ay için planlanmış ziyaret bulunmuyor.
            </div>
          ) : (
            plannedVisits.map((visit) => (
              <div 
                key={visit.id} 
                className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg border border-gray-200 flex flex-col items-center justify-center text-gray-700">
                  <span className="text-xs font-bold uppercase">{format(new Date(visit.visit_date), 'MMM', { locale: tr })}</span>
                  <span className="text-lg font-bold leading-none">{format(new Date(visit.visit_date), 'dd')}</span>
                </div>
                
                <div className="ml-4 flex-grow min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-gray-900 truncate">
                      {visit.customer?.kisa_isim || 'Müşteri Bilgisi Yok'}
                    </h4>
                    <div className="flex items-center text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                      <Clock size={12} className="mr-1" />
                      {format(new Date(visit.visit_date), 'HH:mm')}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-500">
                    <MapPin size={12} className="mr-1 flex-shrink-0" />
                    <span className="truncate">{visit.branch?.sube_adi || 'Şube Bilgisi Yok'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default OperatorCalendar;