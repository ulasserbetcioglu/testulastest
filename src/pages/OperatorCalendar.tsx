import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, addWeeks, subWeeks, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, User, Building, X } from 'lucide-react';
import { toast } from 'sonner';

interface Visit {
  id: string;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
  customer_id: string;
  branch_id: string | null;
  customer: { kisa_isim: string } | null;
  branch: { sube_adi: string; latitude?: number; longitude?: number } | null;
  operator: { name: string } | null;
  visit_type: string | string[];
}

interface MonthlySchedule {
  id: string;
  customer_id: string;
  branch_id: string | null;
  operator_id: string;
  month: number;
  year: number;
  visits_required: number;
  customer?: { kisa_isim: string } | null;
  branch?: {
    sube_adi: string;
    customer_id: string;
    customer?: { kisa_isim: string } | null;
  } | null;
  operator?: { name: string } | null;
}

interface Operator {
  id: string;
  name: string;
  auth_id: string;
}

const getVisitTypeLabel = (type: string | string[] | undefined): string => {
  if (!type) return '';
  const typeId = Array.isArray(type) ? type[0] : type;
  const types: { [key: string]: string } = {
    'ilk': 'İlk', 'ucretli': 'Ücretli', 'acil': 'Acil',
    'teknik': 'Teknik', 'periyodik': 'Periyodik',
    'isyeri': 'İşyeri', 'gozlem': 'Gözlem', 'son': 'Son'
  };
  return types[typeId] || typeId.charAt(0).toUpperCase() + typeId.slice(1);
};

const StatusBadge: React.FC<{ status: Visit['status'] }> = ({ status }) => {
  const config = {
    completed: { text: 'Tamamlandı', color: 'bg-green-500' },
    planned: { text: 'Planlı', color: 'bg-yellow-500' },
    cancelled: { text: 'İptal', color: 'bg-red-500' },
  }[status] || { text: 'Bilinmiyor', color: 'bg-gray-500' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white ${config.color}`}>
      {config.text}
    </span>
  );
};

const VisitModal: React.FC<{ visit: Visit; onClose: () => void }> = ({ visit, onClose }) => {
  const customerName = visit.customer?.kisa_isim || 'N/A';
  const branchName = visit.branch?.sube_adi;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-lg rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Ziyaret Detayı</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Müşteri</label>
            <p className="text-base font-semibold text-gray-800 mt-1">{customerName}</p>
          </div>

          {branchName && (
            <div>
              <label className="text-sm font-medium text-gray-600">Şube</label>
              <p className="text-base text-gray-800 mt-1">{branchName}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-600">Ziyaret Tipi</label>
            <p className="text-base text-gray-800 mt-1">{getVisitTypeLabel(visit.visit_type)}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Durum</label>
            <div className="mt-1">
              <StatusBadge status={visit.status} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Tarih</label>
            <p className="text-base text-gray-800 mt-1">
              {format(new Date(visit.visit_date), 'dd MMMM yyyy, EEEE', { locale: tr })}
            </p>
          </div>

          {visit.branch?.latitude && visit.branch?.longitude && (
            <div>
              <label className="text-sm font-medium text-gray-600">Konum</label>
              <p className="text-base text-gray-800 mt-1 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                {visit.branch.latitude.toFixed(6)}, {visit.branch.longitude.toFixed(6)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const OperatorCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visits, setVisits] = useState<Visit[]>([]);
  const [monthlySchedules, setMonthlySchedules] = useState<MonthlySchedule[]>([]);
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const weekStart = startOfWeek(currentDate, { locale: tr });
  const weekEnd = endOfWeek(currentDate, { locale: tr });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { data: operatorData, error: operatorError } = await supabase
        .from('operators')
        .select('id, name, auth_id')
        .eq('auth_id', user.id)
        .single();

      if (operatorError) throw operatorError;
      if (!operatorData) throw new Error('Operatör bilgisi bulunamadı');

      setCurrentOperator(operatorData);

      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const [visitsRes, schedulesRes] = await Promise.all([
        supabase
          .from('visits')
          .select(`
            id, visit_date, status, visit_type, customer_id, branch_id,
            customer:customer_id(kisa_isim),
            branch:branch_id(sube_adi, latitude, longitude),
            operator:operator_id(name)
          `)
          .eq('operator_id', operatorData.id)
          .gte('visit_date', start.toISOString())
          .lte('visit_date', end.toISOString())
          .order('visit_date'),
        supabase
          .from('monthly_visit_schedules')
          .select(`
            id, customer_id, branch_id, operator_id, month, year, visits_required,
            customer:customer_id(kisa_isim),
            branch:branch_id(sube_adi, customer_id, customer:customer_id(kisa_isim)),
            operator:operator_id(name)
          `)
          .eq('operator_id', operatorData.id)
          .eq('month', currentDate.getMonth() + 1)
          .or(`year.eq.${currentDate.getFullYear()},year.is.null`)
      ]);

      if (visitsRes.error) throw visitsRes.error;
      if (schedulesRes.error) throw schedulesRes.error;

      setVisits(visitsRes.data || []);
      setMonthlySchedules(schedulesRes.data || []);
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
      toast.error('Veriler yüklenemedi: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getVisitsForDay = (date: Date) => {
    return visits.filter(visit => {
      const visitDate = new Date(visit.visit_date);
      return isSameDay(visitDate, date);
    });
  };

  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const scheduleProgress = useMemo(() => {
    return monthlySchedules.map(schedule => {
      const completed = visits.filter(v => {
        if (schedule.branch_id) {
          return v.branch_id === schedule.branch_id && v.status === 'completed';
        } else {
          return v.customer_id === schedule.customer_id && !v.branch_id && v.status === 'completed';
        }
      }).length;

      return {
        ...schedule,
        completed,
        remaining: Math.max(0, schedule.visits_required - completed)
      };
    });
  }, [monthlySchedules, visits]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                <span className="truncate">{currentOperator?.name || 'Operatör'}</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {format(weekStart, 'd MMM', { locale: tr })} - {format(weekEnd, 'd MMM yyyy', { locale: tr })}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={goToPreviousWeek}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:bg-gray-200"
                title="Önceki Hafta"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium"
              >
                Bugün
              </button>
              <button
                onClick={goToNextWeek}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors active:bg-gray-200"
                title="Sonraki Hafta"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Aylık Plan Özeti */}
        {scheduleProgress.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Building className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span className="text-sm sm:text-base">Bu Ay İçin Planlarım</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {scheduleProgress.map(schedule => {
                const customerName = schedule.customer?.kisa_isim || schedule.branch?.customer?.kisa_isim || 'Bilinmeyen Müşteri';
                const displayName = schedule.branch
                  ? `${customerName} - ${schedule.branch.sube_adi}`
                  : customerName;
                const percentage = (schedule.completed / schedule.visits_required) * 100;
                const isComplete = schedule.completed >= schedule.visits_required;

                return (
                  <div
                    key={schedule.id}
                    className={`p-3 rounded-lg border-2 ${
                      isComplete ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'
                    }`}
                  >
                    <div className="font-medium text-gray-800 text-sm mb-2 break-words">
                      {displayName}
                    </div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={isComplete ? 'text-green-700' : 'text-yellow-700'}>
                        {schedule.completed} / {schedule.visits_required}
                      </span>
                      {!isComplete && (
                        <span className="text-red-600 font-semibold">
                          {schedule.remaining} kaldı
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isComplete ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Haftalık Takvim - Mobil Optimized */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Masaüstü görünüm */}
          <div className="hidden sm:grid sm:grid-cols-7 gap-px bg-gray-200">
            {weekDays.map((day, index) => {
              const dayVisits = getVisitsForDay(day);
              const isCurrentDay = isToday(day);
              const dayName = format(day, 'EEE', { locale: tr });
              const dayNumber = format(day, 'd');

              return (
                <div
                  key={index}
                  className={`bg-white min-h-[250px] flex flex-col ${
                    isCurrentDay ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className={`p-3 text-center border-b ${
                    isCurrentDay ? 'bg-blue-600 text-white' : 'bg-gray-50'
                  }`}>
                    <div className="text-sm font-semibold uppercase">{dayName}</div>
                    <div className={`text-xl font-bold ${
                      isCurrentDay ? 'text-white' : 'text-gray-800'
                    }`}>
                      {dayNumber}
                    </div>
                  </div>

                  <div className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {dayVisits.length === 0 ? (
                      <div className="text-center text-gray-400 text-xs py-4">
                        Ziyaret yok
                      </div>
                    ) : (
                      dayVisits.map((visit) => {
                        const customerName = visit.customer?.kisa_isim || 'N/A';
                        const branchName = visit.branch?.sube_adi;

                        return (
                          <div
                            key={visit.id}
                            onClick={() => setSelectedVisit(visit)}
                            className={`p-2 rounded-lg border text-xs cursor-pointer hover:shadow-md transition-shadow ${
                              visit.status === 'completed'
                                ? 'bg-green-50 border-green-300'
                                : visit.status === 'cancelled'
                                ? 'bg-red-50 border-red-300'
                                : 'bg-blue-50 border-blue-300'
                            }`}
                          >
                            <div className="font-semibold text-gray-800 mb-1 break-words">
                              {customerName}
                            </div>
                            {branchName && (
                              <div className="text-gray-600 text-[10px] mb-1 truncate">
                                {branchName}
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-gray-600 truncate text-[10px]">
                                {getVisitTypeLabel(visit.visit_type)}
                              </span>
                              <StatusBadge status={visit.status} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobil görünüm - Liste formatı */}
          <div className="sm:hidden">
            {weekDays.map((day, index) => {
              const dayVisits = getVisitsForDay(day);
              const isCurrentDay = isToday(day);
              const dayName = format(day, 'EEEE', { locale: tr });
              const dayNumber = format(day, 'd MMMM', { locale: tr });

              return (
                <div
                  key={index}
                  className={`border-b last:border-b-0 ${
                    isCurrentDay ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  <div className={`p-3 ${
                    isCurrentDay ? 'bg-blue-600 text-white' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium uppercase">{dayName}</div>
                        <div className="text-sm font-semibold">{dayNumber}</div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        isCurrentDay ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {dayVisits.length} ziyaret
                      </div>
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    {dayVisits.length === 0 ? (
                      <div className="text-center text-gray-400 text-sm py-4">
                        Bu gün için planlanmış ziyaret yok
                      </div>
                    ) : (
                      dayVisits.map((visit) => {
                        const customerName = visit.customer?.kisa_isim || 'N/A';
                        const branchName = visit.branch?.sube_adi;

                        return (
                          <div
                            key={visit.id}
                            onClick={() => setSelectedVisit(visit)}
                            className={`p-3 rounded-lg border active:scale-[0.98] transition-transform ${
                              visit.status === 'completed'
                                ? 'bg-green-50 border-green-300'
                                : visit.status === 'cancelled'
                                ? 'bg-red-50 border-red-300'
                                : 'bg-blue-50 border-blue-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-800 text-sm break-words">
                                  {customerName}
                                </div>
                                {branchName && (
                                  <div className="text-gray-600 text-xs mt-0.5">
                                    {branchName}
                                  </div>
                                )}
                              </div>
                              <StatusBadge status={visit.status} />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <span>{getVisitTypeLabel(visit.visit_type)}</span>
                              {visit.branch?.latitude && visit.branch?.longitude && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  Konum
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Özet İstatistikler */}
        <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {visits.length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Toplam</div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {visits.filter(v => v.status === 'completed').length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Tamamlanan</div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md text-center">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">
              {visits.filter(v => v.status === 'planned').length}
            </div>
            <div className="text-xs text-gray-600 mt-1">Planlı</div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md text-center">
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {visits.filter(v => v.status === 'cancelled').length}
            </div>
            <div className="text-xs text-gray-600 mt-1">İptal</div>
          </div>
        </div>
      </div>

      {/* Ziyaret Detay Modal */}
      {selectedVisit && (
        <VisitModal visit={selectedVisit} onClose={() => setSelectedVisit(null)} />
      )}
    </div>
  );
};

export default OperatorCalendar;