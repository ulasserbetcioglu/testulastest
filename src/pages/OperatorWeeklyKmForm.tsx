import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Save, Loader2, History, AlertCircle, CalendarDays } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

interface OutletContext {
  operatorId: string | null;
  loadingOperatorId: boolean;
}

interface OperatorWeeklyKmFormProps {
  onSuccess?: () => void; // Opsiyonel hale getirdik
}

const OperatorWeeklyKmForm: React.FC<OperatorWeeklyKmFormProps> = ({ onSuccess }) => {
  const { operatorId, loadingOperatorId } = useOutletContext<OutletContext>();

  const [startKm, setStartKm] = useState('');
  const [endKm, setEndKm] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingLastKm, setFetchingLastKm] = useState(false);
  const [isFirstEntry, setIsFirstEntry] = useState(true);
  const [operatorName, setOperatorName] = useState('');

  // Yardımcı Fonksiyon: Hafta Numarası
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // Operatör İsmini Çek
  useEffect(() => {
    const fetchOpName = async () => {
      if (operatorId) {
        const { data } = await supabase.from('operators').select('name').eq('id', operatorId).single();
        if (data) setOperatorName(data.name);
      }
    };
    fetchOpName();
  }, [operatorId]);

  // KM Verilerini Çek
  useEffect(() => {
    const fetchLastKmData = async () => {
      if (!operatorId) return;
      
      setFetchingLastKm(true);
      try {
        const now = new Date();
        const weekNumber = getWeekNumber(now);
        const year = now.getFullYear();

        // 1. Bu hafta için kayıt var mı?
        const { data: currentWeekData } = await supabase
          .from('operator_weekly_km')
          .select('*')
          .eq('operator_id', operatorId)
          .eq('year', year)
          .eq('week_number', weekNumber)
          .maybeSingle();

        if (currentWeekData) {
          setStartKm(currentWeekData.start_km.toString());
          setEndKm(currentWeekData.end_km.toString());
          setIsFirstEntry(false); 
        } else {
          // 2. Yoksa geçen haftanın bitişini al
          const { data: lastData } = await supabase
            .from('operator_weekly_km')
            .select('end_km')
            .eq('operator_id', operatorId)
            .or(`year.lt.${year},and(year.eq.${year},week_number.lt.${weekNumber})`)
            .order('year', { ascending: false })
            .order('week_number', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastData) {
            setStartKm(lastData.end_km.toString());
            setIsFirstEntry(false);
          } else {
            setStartKm('');
            setIsFirstEntry(true);
          }
        }
      } catch (err) {
        console.error('Veri çekme hatası:', err);
      } finally {
        setFetchingLastKm(false);
      }
    };

    fetchLastKmData();
  }, [operatorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!operatorId) return;
    if (!isConfirmed) {
      toast.error('Lütfen bilgilerin doğruluğunu onaylayın');
      return;
    }

    const start = parseFloat(startKm);
    const end = parseFloat(endKm);

    if (isNaN(start) || isNaN(end)) {
      toast.error('Lütfen geçerli km değerleri girin');
      return;
    }

    if (end <= start) {
      toast.error('Bitiş KM, Başlangıç KM\'den büyük olmalıdır');
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const weekNumber = getWeekNumber(now);
      const year = now.getFullYear();

      // Mevcut kaydı kontrol et
      const { data: existingRecord } = await supabase
        .from('operator_weekly_km')
        .select('id')
        .eq('operator_id', operatorId)
        .eq('year', year)
        .eq('week_number', weekNumber)
        .maybeSingle();

      let error;
      
      const payload = {
        start_km: start,
        end_km: end,
        total_km: end - start,
        submitted_at: now.toISOString(),
      };

      if (existingRecord) {
        const { error: updateError } = await supabase
          .from('operator_weekly_km')
          .update(payload)
          .eq('id', existingRecord.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('operator_weekly_km')
          .insert({
            ...payload,
            operator_id: operatorId,
            week_number: weekNumber,
            year: year,
          });
        error = insertError;
      }

      if (error) throw error;

      toast.success('Haftalık km bilgisi başarıyla kaydedildi');
      if (onSuccess) onSuccess();

    } catch (err: any) {
      toast.error(`Kayıt başarısız: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalKm = parseFloat(endKm) - parseFloat(startKm);
  const showTotal = !isNaN(totalKm) && totalKm > 0;

  if (loadingOperatorId) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2"/> Yükleniyor...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen flex items-start justify-center">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <CalendarDays className="h-6 w-6" />
            <h1 className="text-xl font-bold">Haftalık KM Girişi</h1>
          </div>
          <p className="text-blue-100 text-sm">Haftalık araç kullanım verilerinizi buradan güncelleyebilirsiniz.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Bilgi Kutusu */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
            <div>
              <p className="font-semibold mb-1">Dönem: {new Date().getFullYear()} / {getWeekNumber(new Date())}. Hafta</p>
              <p>Lütfen aracınızın güncel kilometre bilgisini giriniz.</p>
            </div>
          </div>

          {/* Operatör Adı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operatör</label>
            <input type="text" value={operatorName} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed" />
          </div>

          {/* Başlangıç KM */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Önceki KM (Hafta Başı)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={startKm}
                onChange={(e) => setStartKm(e.target.value)}
                required
                disabled={!isFirstEntry}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                  !isFirstEntry ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' : 'border-gray-300 bg-white'
                }`}
                placeholder={fetchingLastKm ? "Veri çekiliyor..." : "Önceki KM"}
              />
              {!isFirstEntry && !fetchingLastKm && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><History size={16} /></div>
              )}
            </div>
            {!isFirstEntry && <p className="text-xs text-gray-500 mt-1">* Önceki haftanın kapanış kilometresidir, değiştirilemez.</p>}
          </div>

          {/* Bitiş KM */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">O Anki KM (Hafta Sonu) <span className="text-red-500">*</span></label>
            <input
              type="number"
              step="0.1"
              value={endKm}
              onChange={(e) => setEndKm(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold text-gray-900"
              placeholder="Örn: 15500"
            />
          </div>

          {/* Hesaplanan Toplam */}
          {showTotal && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-900">Bu Hafta Yapılan Yol:</span>
                <span className="text-2xl font-bold text-green-700">{totalKm.toFixed(1)} km</span>
              </div>
            </div>
          )}

          {/* Onay Kutusu */}
          <div className="border-t pt-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                Girdiğim km bilgilerinin doğru olduğunu beyan ederim. <span className="text-red-500">*</span>
              </span>
            </label>
          </div>

          {/* Kaydet Butonu */}
          <button
            type="submit"
            disabled={loading || !isConfirmed || fetchingLastKm}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all shadow-md flex items-center justify-center gap-2 ${
              loading || !isConfirmed || fetchingLastKm
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95 hover:shadow-lg'
            }`}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save size={20} />}
            {loading ? 'Kaydediliyor...' : 'KM Bilgisini Kaydet'}
          </button>

        </form>
      </div>
    </div>
  );
};

export default OperatorWeeklyKmForm;