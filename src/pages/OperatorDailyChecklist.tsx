import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar, CheckCircle, Clock, X, AlertTriangle, MapPin, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Visit {
  id: string;
  customer: {
    kisa_isim: string;
  };
  branch?: {
    sube_adi: string;
    latitude?: number;
    longitude?: number;
  } | null;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
  visit_type?: string;
  notes?: string;
}

const OperatorDailyChecklist: React.FC = () => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [pendingVisits, setPendingVisits] = useState<Visit[]>([]);
  const [todayVisits, setTodayVisits] = useState<Visit[]>([]);

  useEffect(() => {
    fetchOperatorId();
  }, []);

  useEffect(() => {
    if (operatorId) {
      fetchVisits();
    }
  }, [selectedDate, operatorId]);

  const fetchOperatorId = async () => {
    try {
      const opId = await localAuth.getCurrentOperatorId();
      if (!opId) throw new Error('Kullanıcı bulunamadı');

      const { data, error } = await supabase
        .from('operators')
        .select('id')
        .eq('id', opId)
        .single();

      if (error) throw error;
      setOperatorId(data.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchVisits = async () => {
    try {
      setLoading(true);
      
      if (!operatorId) return;

      // Bugünün ziyaretleri
      const today = new Date(selectedDate);
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();

      const { data: todayData, error: todayError } = await supabase
        .from('visits')
        .select(`
          id,
          visit_date,
          status,
          visit_type,
          notes,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi, latitude, longitude)
        `)
        .eq('operator_id', operatorId)
        .gte('visit_date', todayStart)
        .lte('visit_date', todayEnd)
        .order('visit_date', { ascending: true });

      if (todayError) throw todayError;
      setTodayVisits(todayData || []);

      // Önceki günlerden tamamlanmamış ziyaretler
      const { data: pendingData, error: pendingError } = await supabase
        .from('visits')
        .select(`
          id,
          visit_date,
          status,
          visit_type,
          notes,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi, latitude, longitude)
        `)
        .eq('operator_id', operatorId)
        .eq('status', 'planned')
        .lt('visit_date', todayStart)
        .order('visit_date', { ascending: false });

      if (pendingError) throw pendingError;
      setPendingVisits(pendingData || []);

      // Tüm ziyaretleri birleştir
      setVisits([...(todayData || []), ...(pendingData || [])]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartVisit = (visitId: string) => {
    navigate(`/operator/ziyaretler/${visitId}/start`);
  };

  const handleViewVisit = (visit: Visit) => {
    // Tamamlanmış ziyaretleri görüntüleme mantığı
    // Bu kısmı ihtiyaca göre geliştirebilirsiniz
  };

  const getVisitTypeText = (type?: string) => {
    if (!type) return 'Belirtilmemiş';
    
    switch (type) {
      case 'ilk': return 'İlk Ziyaret';
      case 'ucretli': return 'Ücretli Ziyaret';
      case 'acil': return 'Acil Çağrı';
      case 'teknik': return 'Teknik İnceleme';
      case 'periyodik': return 'Periyodik Ziyaret';
      case 'isyeri': return 'İşyeri Ziyareti';
      case 'gozlem': return 'Gözlem Ziyareti';
      case 'son': return 'Son Ziyaret';
      default: return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'planned':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'cancelled':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'planned':
        return 'Planlandı';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return '';
    }
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Günlük Kontrol Listesi</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 border rounded"
          />
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Bugün
          </button>
        </div>
      </div>

      {pendingVisits.length > 0 && (
        <div className="mb-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Önceki günlerden tamamlanmamış {pendingVisits.length} ziyaret bulunuyor.
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-4">Tamamlanmamış Ziyaretler</h2>
          <div className="space-y-4">
            {pendingVisits.map((visit) => (
              <div key={visit.id} className="bg-white rounded-lg shadow-sm border-l-4 border-yellow-400">
                <div className="p-4 border-b border-gray-100">
                  <div className="text-sm text-gray-500">
                    {new Date(visit.visit_date).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="font-bold mt-1">
                    {visit.customer.kisa_isim}
                  </div>
                  {visit.branch && (
                    <div className="text-gray-700 flex items-center">
                      {visit.branch.sube_adi}
                      {visit.branch.latitude && visit.branch.longitude && (
                        <span className="ml-2 text-green-600 flex items-center text-sm">
                          <MapPin size={14} className="mr-1" />
                          {visit.branch.latitude.toFixed(4)}, {visit.branch.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Tür:</span> {getVisitTypeText(visit.visit_type)}
                  </div>
                </div>
                <div className="p-2 flex justify-end gap-2">
                  <button
                    onClick={() => handleStartVisit(visit.id)}
                    className="px-8 py-2 rounded-lg text-white bg-green-500 hover:bg-green-600"
                  >
                    Başla
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">Bugünün Ziyaretleri</h2>
      <div className="space-y-4">
        {todayVisits.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
            Bugün için planlanmış ziyaret bulunmuyor
          </div>
        ) : (
          todayVisits.map((visit) => (
            <div key={visit.id} className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <div className="text-sm text-gray-500">
                  {new Date(visit.visit_date).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="font-bold mt-1">
                  {visit.customer.kisa_isim}
                </div>
                {visit.branch && (
                  <div className="text-gray-700 flex items-center">
                    {visit.branch.sube_adi}
                    {visit.branch.latitude && visit.branch.longitude && (
                      <span className="ml-2 text-green-600 flex items-center text-sm">
                        <MapPin size={14} className="mr-1" />
                        {visit.branch.latitude.toFixed(4)}, {visit.branch.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-2 text-sm">
                  <span className="font-medium">Tür:</span> {getVisitTypeText(visit.visit_type)}
                </div>
                <div className="mt-2 flex items-center">
                  {getStatusIcon(visit.status)}
                  <span className="ml-2 text-sm">{getStatusText(visit.status)}</span>
                </div>
              </div>
              <div className="p-2 flex justify-end gap-2">
                {visit.status === 'completed' ? (
                  <button
                    onClick={() => handleViewVisit(visit)}
                    className="px-8 py-2 rounded-lg text-white bg-gray-500 hover:bg-gray-600 flex items-center"
                  >
                    <Eye size={16} className="mr-2" /> İncele
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartVisit(visit.id)}
                    className="px-8 py-2 rounded-lg text-white bg-green-500 hover:bg-green-600"
                  >
                    Başla
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OperatorDailyChecklist;