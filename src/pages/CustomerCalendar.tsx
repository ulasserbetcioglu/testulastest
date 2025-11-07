import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
// Bu import yollarının kendi projenizdeki yollarla eşleştiğini varsayıyorum.
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { Loader2, AlertTriangle } from 'lucide-react';

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
    // currentdate değiştiğinde verileri tekrar çek
    setLoading(true);
    fetchVisits();
  }, [currentDate]);

  // selectedStatus değiştiğinde verileri filtrele (tekrar çekmeye gerek yok)
  // Bu useEffect'i ayırmak, ay değiştirildiğinde gereksiz filtrelemeyi önler
  // ve filtre değiştirildiğinde gereksiz API çağrısını engeller.
  // Not: Bu kısım zaten getVisitsForDay içinde anlık yapıldığı için
  // bu useEffect'e bile gerek yok, anlık filtreleme daha performanslı.

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

  // Pazartesi'yi 0 (Pts) ve Pazar'ı 6 (Paz) olarak ayarla
  let firstDayOfMonth = monthStart.getDay() - 1; 
  if (firstDayOfMonth === -1) firstDayOfMonth = 6; // Pazar (0) ise 6 yap

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
        return 'bg-green-100 text-green-800 border-green-200';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusDot = (status: string) => {
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
  }

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

  // Yüklenme durumu için daha iyi bir arayüz
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        <span className="ml-2 text-gray-600">Takvim yükleniyor...</span>
      </div>
    );
  }

  // Hata durumu için daha iyi bir arayüz
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 p-4 rounded-lg border border-red-200">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <span className="mt-2 text-red-700 font-medium">Hata: {error}</span>
        <button 
          onClick={() => { setLoading(true); fetchVisits(); }} 
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    // Ana konteyner
    <div className="space-y-4 max-w-full overflow-x-hidden">
      
      {/* 1. Başlık ve Ay Navigasyonu */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ZİYARET TAKVİMİ</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-600 hover:text-gray-800 bg-white rounded-full shadow text-lg sm:text-xl"
            aria-label="Önceki Ay"
          >
            ←
          </button>
          <span className="text-base sm:text-lg font-medium min-w-[120px] text-center capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: tr })}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-600 hover:text-gray-800 bg-white rounded-full shadow text-lg sm:text-xl"
            aria-label="Sonraki Ay"
          >
            →
          </button>
        </div>
      </div>

      {/* 2. Filtreleme Alanı */}
      <div className="bg-white rounded-lg shadow p-2 sm:p-4">
        <label htmlFor="statusFilter" className="sr-only">Duruma göre filtrele</label>
        <select
          id="statusFilter"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full sm:w-48 px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          <option value="">Tüm Durumlar</option>
          <option value="planned">Planlandı</option>
          <option value="completed">Tamamlandı</option>
          <option value="cancelled">İptal Edildi</option>
        </select>
      </div>

      {/* 3. Takvim Gövdesi */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          
          {/* Gün Başlıkları */}
          {days.map(day => (
            <div key={day} className="bg-gray-50 p-1 sm:p-2 text-center">
              <span className="text-xs sm:text-sm font-medium text-gray-500">{day}</span>
            </div>
          ))}

          {/* Ay Başındaki Boş Hücreler */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-gray-50 p-1 sm:p-2 min-h-[80px] sm:min-h-[120px]" />
          ))}

          {/* Ayın Gün Hücreleri */}
          {monthDays.map(day => {
            const dayVisits = getVisitsForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`
                  bg-white p-1 sm:p-2 min-h-[80px] sm:min-h-[120px] 
                  ${/* DEĞİŞİKLİK: Sığma sorununu çözmek için flex eklendi */''}
                  flex flex-col
                  ${isCurrentDay ? 'bg-green-50' : ''}
                `}
              >
                {/* Gün Numarası */}
                <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${isCurrentDay ? 'text-green-600 font-bold' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </div>
                
                {/* DEĞİŞİKLİK: Ziyaret Listesi
                  - 'flex-1' ile kalan tüm dikey alanı doldurur.
                  - 'min-h-0' ile flex-1'in düzgün çalışmasını sağlar.
                  - 'overflow-y-auto' ile gerekirse kaydırma çubuğu çıkarır.
                  - Artık 'max-h' kullanmıyoruz, bu daha esnek.
                */}
                <div className="flex-1 min-h-0 space-y-1 overflow-y-auto">
                  {dayVisits.map(visit => (
                    <div
                      key={visit.id}
                      className={`
                        ${/* DEĞİŞİKLİK: Stil ve Kısaltma iyileştirmesi */''}
                        text-[10px] sm:text-xs p-1 rounded border 
                        ${getStatusColor(visit.status)}
                        overflow-hidden ${/* truncate için gerekli */''}
                        flex items-center
                      `}
                      title={`Şube: ${visit.branch?.sube_adi || 'Belirtilmemiş'}`}
                    >
                      {/* Durum Noktası */}
                      <span className={`w-2 h-2 ${getStatusDot(visit.status)} rounded-full mr-1.5 flex-shrink-0`}></span>
                      
                      {/* DEĞİŞİKLİK: Metin Kısaltma (Truncate)
                        - 'substring' yerine Tailwind'in 'truncate' sınıfı kullanıldı.
                        - Bu, metni otomatik olarak '...' ile kısaltır.
                      */}
                      <span className="truncate">
                        {visit.branch?.sube_adi || 'Belirtilmemiş'}
                      </span>

                      {/* DEĞİŞİKLİK: Eski metin kısaltma mantığı kaldırıldı.
                        Yeni 'truncate' sınıfı hem mobil hem desktop için çalışır.
                      */}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Lejant (Açıklama) */}
      <div className="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-4 p-2 text-xs sm:text-sm">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded border border-green-600"></div>
          <span>Tamamlandı</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded border border-yellow-600"></div>
          <span>Planlandı</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded border border-orange-600"></div>
          <span>İptal Edildi</span>
        </div>
      </div>
    </div>
  );
};

export default CustomerCalendar;