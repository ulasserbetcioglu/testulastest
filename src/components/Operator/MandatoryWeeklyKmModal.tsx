import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, History } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface MandatoryWeeklyKmModalProps {
  isOpen: boolean;
  operatorId: string;
  operatorName: string;
  onSuccess: () => void;
}

const MandatoryWeeklyKmModal: React.FC<MandatoryWeeklyKmModalProps> = ({
  isOpen,
  operatorId,
  operatorName,
  onSuccess,
}) => {
  const [startKm, setStartKm] = useState('');
  const [endKm, setEndKm] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingLastKm, setFetchingLastKm] = useState(false);
  const [isFirstEntry, setIsFirstEntry] = useState(true); // İlk kayıt mı kontrolü

  // Modal açıldığında son km bilgisini çek
  useEffect(() => {
    if (isOpen && operatorId) {
      fetchLastKmData();
    }
  }, [isOpen, operatorId]);

  const fetchLastKmData = async () => {
    setFetchingLastKm(true);
    try {
      // Operatörün en son girdiği kaydı bul (yıla ve haftaya göre tersten sırala)
      const { data, error } = await supabase
        .from('operator_weekly_km')
        .select('end_km')
        .eq('operator_id', operatorId)
        .order('year', { ascending: false })
        .order('week_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Önceki kayıt varsa, onun Bitiş KM'si bu haftanın Başlangıç KM'sidir.
        setStartKm(data.end_km.toString());
        setIsFirstEntry(false); // Artık ilk kayıt değil, input kilitlenecek
      } else {
        // Kayıt yoksa manuel girişe izin ver
        setStartKm('');
        setIsFirstEntry(true);
      }
    } catch (err) {
      console.error('Son KM çekme hatası:', err);
      // Hata durumunda manuel girişe izin verelim ki işlem tıkanmasın
      setIsFirstEntry(true);
    } finally {
      setFetchingLastKm(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      toast.error('O anki KM, Önceki KM\'den büyük olmalıdır');
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const weekNumber = getWeekNumber(now);
      const year = now.getFullYear();

      const { error } = await supabase
        .from('operator_weekly_km')
        .insert({
          operator_id: operatorId,
          week_number: weekNumber,
          year: year,
          start_km: start,
          end_km: end,
          total_km: end - start,
          submitted_at: now.toISOString(),
        });

      if (error) throw error;

      localStorage.setItem(`km_entry_${operatorId}_${year}_${weekNumber}`, 'completed');

      toast.success('Haftalık km bilgisi kaydedildi');
      onSuccess();
    } catch (err) {
      console.error('KM kayıt hatası:', err);
      toast.error('Kayıt sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const totalKm = parseFloat(endKm) - parseFloat(startKm);
  const showTotal = !isNaN(totalKm) && totalKm > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        <div className="bg-red-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-bold">Zorunlu Haftalık KM Girişi</h2>
              <p className="text-sm text-red-100">Bu form doldurulmadan devam edilemez</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <p className="font-semibold mb-1">📅 Haftalık Bildirim</p>
            <p>Lütfen aracınızın güncel kilometre bilgisini giriniz.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operatör
            </label>
            <input
              type="text"
              value={operatorName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Önceki KM (Hafta Başı)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={startKm}
                onChange={(e) => setStartKm(e.target.value)}
                required
                disabled={!isFirstEntry} // İlk kayıt değilse düzenlenemez
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  !isFirstEntry 
                    ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' 
                    : 'border-gray-300 bg-white'
                }`}
                placeholder={fetchingLastKm ? "Veri çekiliyor..." : "Önceki KM"}
              />
              {!isFirstEntry && !fetchingLastKm && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <History size={16} />
                </div>
              )}
            </div>
            {!isFirstEntry && (
              <p className="text-xs text-gray-500 mt-1">
                * Önceki haftanın kapanış kilometresidir, değiştirilemez.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              O Anki KM (Hafta Sonu) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={endKm}
              onChange={(e) => setEndKm(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium text-gray-900"
              placeholder="Örn: 15500"
              autoFocus
            />
          </div>

          {showTotal && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Haftalık Yapılan Yol:</span>
                <span className="text-xl font-bold text-blue-700">{totalKm.toFixed(1)} km</span>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                Girdiğim km bilgilerinin doğru olduğunu beyan ederim.
                <span className="text-red-500 font-semibold"> *</span>
              </span>
            </label>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            <p className="font-semibold mb-1">⚠️ Önemli Bilgi:</p>
            <p>Bu formu onaylamadan sayfayı kapatamazsınız. Lütfen güncel kilometre bilgisini giriniz.</p>
          </div>

          <button
            type="submit"
            disabled={loading || !isConfirmed || fetchingLastKm}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
              loading || !isConfirmed || fetchingLastKm
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md hover:shadow-lg'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Kaydediliyor...
              </span>
            ) : (
              'KM Bilgisini Kaydet ve Onayla'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MandatoryWeeklyKmModal;