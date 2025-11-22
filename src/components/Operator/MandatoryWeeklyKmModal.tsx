import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
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
      toast.error('Bitiş km\'si başlangıç km\'sinden büyük olmalıdır');
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
            <p>Her pazartesi günü haftalık km bilgilerinizi girmeniz gerekmektedir.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operatör
            </label>
            <input
              type="text"
              value={operatorName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hafta Başı KM <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={startKm}
              onChange={(e) => setStartKm(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Örn: 15000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hafta Sonu KM <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={endKm}
              onChange={(e) => setEndKm(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Örn: 15500"
            />
          </div>

          {showTotal && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Haftalık Toplam:</span>
                <span className="text-lg font-bold text-blue-900">{totalKm.toFixed(1)} km</span>
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
                Girdiğim km bilgilerinin doğru olduğunu ve haftalık kayıtlarımı kontrol ettiğimi onaylıyorum.
                <span className="text-red-500 font-semibold"> *</span>
              </span>
            </label>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            <p className="font-semibold mb-1">⚠️ Önemli Bilgi:</p>
            <p>Bu formu onaylamadan sayfayı kapatamazsınız. Lütfen bilgilerinizi eksiksiz doldurun.</p>
          </div>

          <button
            type="submit"
            disabled={loading || !isConfirmed}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
              loading || !isConfirmed
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
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
