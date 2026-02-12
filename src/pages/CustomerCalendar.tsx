import React, { useState, useEffect, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import html2canvas from 'html2canvas';
import { Download, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const calendarRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchVisits();
  }, [currentDate]);

  const fetchVisits = async () => {
    setLoading(true);
    setError(null);
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
      setError(err.message || 'Ziyaretler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJPEG = () => {
    if (!calendarRef.current) return;

    setIsDownloading(true);
    const calendarElement = calendarRef.current;

    // 1. Stilleri geçici olarak değiştir
    const listElements = calendarElement.querySelectorAll('.visit-list-container');
    const itemElements = calendarElement.querySelectorAll('.visit-item-text');

    const originalListStyles = new Map<number, { overflowY: string }>();
    const originalItemStyles = new Map<number, { textOverflow: string, whiteSpace: string, overflow: string }>();

    listElements.forEach((el, i) => {
      const htmlEl = el as HTMLElement;
      originalListStyles.set(i, { overflowY: htmlEl.style.overflowY });
      htmlEl.style.overflowY = 'visible'; // Tüm içeriği göster
      htmlEl.style.maxHeight = 'none'; // Yükseklik kısıtlamasını kaldır
    });

    itemElements.forEach((el, i) => {
      const htmlEl = el as HTMLElement;
      originalItemStyles.set(i, { 
        textOverflow: htmlEl.style.textOverflow, 
        whiteSpace: htmlEl.style.whiteSpace, 
        overflow: htmlEl.style.overflow 
      });
      htmlEl.style.textOverflow = 'clip'; // Kırpmayı kaldır
      htmlEl.style.whiteSpace = 'normal'; // Metin kaydırmaya izin ver
      htmlEl.style.overflow = 'visible';
    });

    // Sayfanın en üstüne kaydır
    window.scrollTo(0, 0);

    html2canvas(calendarElement, {
      scale: 3, // Çözünürlüğü 3 kat artır
      useCORS: true,
      logging: false,
      onclone: (document) => {
        // Klonlanan dokümanda stilleri tekrar uygula
        const clonedListElements = document.querySelectorAll('.visit-list-container');
        clonedListElements.forEach(el => {
          (el as HTMLElement).style.overflowY = 'visible';
          (el as HTMLElement).style.maxHeight = 'none';
        });
        const clonedItemElements = document.querySelectorAll('.visit-item-text');
        clonedItemElements.forEach(el => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.textOverflow = 'clip';
          htmlEl.style.whiteSpace = 'normal';
          htmlEl.style.overflow = 'visible';
        });
      }
    })
      .then(canvas => {
        const link = document.createElement('a');
        link.download = `ziyaret-takvimi-${format(currentDate, 'yyyy-MM')}.jpeg`;
        link.href = canvas.toDataURL('image/jpeg', 1.0); // En yüksek kalite
        link.click();
      })
      .catch(err => {
        console.error('JPEG indirilirken hata oluştu:', err);
        setError('JPEG indirilirken bir hata oluştu. Lütfen tekrar deneyin.');
      })
      .finally(() => {
        // 3. Orijinal stilleri geri yükle
        listElements.forEach((el, i) => {
          const htmlEl = el as HTMLElement;
          const originalStyle = originalListStyles.get(i);
          if (originalStyle) {
            htmlEl.style.overflowY = originalStyle.overflowY;
          }
          htmlEl.style.maxHeight = ''; // Orijinal (CSS'deki) değere döner
        });

        itemElements.forEach((el, i) => {
          const htmlEl = el as HTMLElement;
          const originalStyle = originalItemStyles.get(i);
          if (originalStyle) {
            htmlEl.style.textOverflow = originalStyle.textOverflow;
            htmlEl.style.whiteSpace = originalStyle.whiteSpace;
            htmlEl.style.overflow = originalStyle.overflow;
          }
        });

        setIsDownloading(false);
      });
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

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'planned': return 'bg-yellow-500';
      case 'cancelled': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getVisitBGColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 hover:bg-green-100 border-green-200';
      case 'planned': return 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200';
      case 'cancelled': return 'bg-orange-50 hover:bg-orange-100 border-orange-200';
      default: return 'bg-gray-50 hover:bg-gray-100 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md max-w-lg mx-auto">
        <div className="flex items-center">
          <AlertCircle className="w-6 h-6 mr-3" />
          <div>
            <h4 className="font-bold">Bir Hata Oluştu</h4>
            <p className="text-sm">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchVisits}
          className="mt-4 flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ZİYARET TAKVİMİ</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="p-2 text-gray-600 hover:text-gray-800 bg-white rounded-full shadow hover:bg-gray-100 transition-colors"
            aria-label="Önceki Ay"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <span className="text-base sm:text-lg font-medium min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy', { locale: tr })}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="p-2 text-gray-600 hover:text-gray-800 bg-white rounded-full shadow hover:bg-gray-100 transition-colors"
            aria-label="Sonraki Ay"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-2 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Tüm Durumlar</option>
            <option value="planned">Planlandı</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal Edildi</option>
          </select>

          <button
            onClick={handleDownloadJPEG}
            disabled={isDownloading}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Download className="w-5 h-5 mr-2" />
            )}
            {isDownloading ? 'Oluşturuluyor...' : 'Takvimi İndir (JPEG)'}
          </button>
        </div>
      </div>

      {/* Takvimi bu div'den yakalıyoruz */}
      <div ref={calendarRef} className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200 border-b border-gray-200">
          {days.map(day => (
            <div key={day} className="bg-gray-50 p-1 sm:p-2 text-center">
              <span className="text-xs sm:text-sm font-medium text-gray-500">{day}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-gray-50 p-1 sm:p-2 min-h-[100px] sm:min-h-[140px]" />
          ))}

          {monthDays.map(day => {
            const dayVisits = getVisitsForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`flex flex-col bg-white p-1 sm:p-2 min-h-[100px] sm:min-h-[140px] transition-colors ${
                  isCurrentDay ? 'bg-green-50' : ''
                }`}
              >
                <div className={`text-xs sm:text-sm font-medium mb-1 ${
                  isCurrentDay ? 'text-green-700 font-bold' : 'text-gray-700'
                }`}>
                  {format(day, 'd')}
                </div>
                
                {/* Ziyaret listesi için kaydırma alanı */}
                <div className="flex-1 min-h-0 space-y-1 overflow-y-auto visit-list-container">
                  {dayVisits.map(visit => (
                    <div
                      key={visit.id}
                      className={`flex items-center text-xs p-1 rounded border ${getVisitBGColor(visit.status)} cursor-pointer`}
                      title={`Şube: ${visit.branch?.sube_adi || 'Belirtilmemiş'}`}
                    >
                      <span className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${getStatusDotColor(visit.status)}`}></span>
                      <span className="flex-1 truncate visit-item-text">
                        {visit.branch?.sube_adi || 'Belirtilmemiş'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lejant */}
      <div className="flex flex-wrap justify-center sm:justify-end gap-3 sm:gap-4 p-2 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Tamamlandı</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span>Planlandı</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span>İptal Edildi</span>
        </div>
      </div>
    </div>
  );
};

export default CustomerCalendar;