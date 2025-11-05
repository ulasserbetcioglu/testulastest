import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Car, Save, Loader2, CalendarDays, AlertTriangle } from 'lucide-react';
import { format, startOfWeek, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useOutletContext } from 'react-router-dom'; // useOutletContext'i import edin

interface Vehicle {
  id: string;
  plate_number: string;
  current_km: number;
  operator_id: string;
}

interface OutletContext {
  operatorId: string | null;
  loadingOperatorId: boolean;
}

interface OperatorWeeklyKmFormProps {
  onSuccess: () => void; // Başarılı gönderimde çağrılacak callback
}

const OperatorWeeklyKmForm: React.FC<OperatorWeeklyKmFormProps> = ({ onSuccess }) => {
  // Context'ten operatorId ve loadingOperatorId'yi alın
  const { operatorId, loadingOperatorId } = useOutletContext<OutletContext>();

  const [assignedVehicles, setAssignedVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [currentKm, setCurrentKm] = useState<number | ''>('');
  const [loadingVehicles, setLoadingVehicles] = useState(true); // Araçları yükleme durumu
  const [submitting, setSubmitting] = useState(false);
  const [lastKmUpdateDate, setLastKmUpdateDate] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!operatorId) {
        // operatorId henüz yüklenmediyse veya null ise araçları çekme
        setLoadingVehicles(false);
        return;
      }

      setLoadingVehicles(true);
      console.log('Fetching vehicles for operatorId:', operatorId);
      try {
        const { data: vehiclesData, error: vehiclesError } = await supabase
          .from('vehicles')
          .select('id, plate_number, current_km, updated_at')
          .eq('operator_id', operatorId)
          .eq('status', 'active');

        console.log('Supabase query result - vehiclesData:', vehiclesData);
        console.log('Supabase query result - vehiclesError:', vehiclesError);

        if (vehiclesError) {
          console.error('Supabase vehicles fetch error:', vehiclesError);
          throw vehiclesError;
        }
        setAssignedVehicles(vehiclesData || []);

        if (vehiclesData && vehiclesData.length > 0) {
          setSelectedVehicleId(vehiclesData[0].id);
          setCurrentKm(vehiclesData[0].current_km || '');
          setLastKmUpdateDate(vehiclesData[0].updated_at ? format(new Date(vehiclesData[0].updated_at), 'dd.MM.yyyy HH:mm', { locale: tr }) : null);
        }
      } catch (err: any) {
        console.error('Error in fetchVehicles:', err);
        toast.error('Araçlar yüklenirken hata: ' + err.message);
      } finally {
        setLoadingVehicles(false);
        console.log('Finished fetching vehicles. LoadingVehicles set to false.');
      }
    };

    fetchVehicles();
  }, [operatorId]); // operatorId değiştiğinde tekrar çalıştır

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || currentKm === '') {
      toast.error('Lütfen araç ve güncel KM bilgisini girin.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ current_km: currentKm })
        .eq('id', selectedVehicleId);

      if (error) {
        console.error('Supabase update KM error:', error);
        throw error;
      }
      toast.success('KM bilgisi başarıyla güncellendi!');
      onSuccess();
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      toast.error('KM bilgisi güncellenirken hata: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVehicleId = e.target.value;
    setSelectedVehicleId(newVehicleId);
    const selectedVehicle = assignedVehicles.find(v => v.id === newVehicleId);
    setCurrentKm(selectedVehicle?.current_km || '');
    setLastKmUpdateDate(selectedVehicle?.updated_at ? format(new Date(selectedVehicle.updated_at), 'dd.MM.yyyy HH:mm', { locale: tr }) : null);
  };

  if (loadingOperatorId || loadingVehicles) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin" /> Yükleniyor...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Araç Seçin</label>
          <select value={selectedVehicleId} onChange={handleVehicleChange} className="w-full p-2 border rounded" required>
            {assignedVehicles.length === 0 ? (
              <option value="">Atanmış araç bulunamadı</option>
            ) : (
              assignedVehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.plate_number}</option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Güncel Kilometre</label>
          <input type="number" value={currentKm} onChange={(e) => setCurrentKm(parseInt(e.target.value) || '')} className="w-full p-2 border rounded" required min="0" />
        </div>

        {lastKmUpdateDate && (
          <p className="text-sm text-gray-600">Son KM güncelleme: {lastKmUpdateDate}</p>
        )}

        <button type="submit" disabled={submitting || assignedVehicles.length === 0} className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {submitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          {submitting ? 'Kaydediliyor...' : 'KM Bilgisini Kaydet'}
        </button>
      </form>
    </div>
  );
};

export default OperatorWeeklyKmForm;
