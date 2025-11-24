import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, RefreshCw, Layout } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

interface FloorPlanViewerProps {
  branchId: string;
}

const FloorPlanViewer: React.FC<FloorPlanViewerProps> = ({ branchId }) => {
  const [visits, setVisits] = useState<any[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [floorPlan, setFloorPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Krokiyi Çek
      const { data: planData } = await supabase
        .from('branch_floor_plans')
        .select('*')
        .eq('branch_id', branchId)
        .maybeSingle();
      
      setFloorPlan(planData);

      // 2. Tamamlanan Ziyaretleri Çek (Isı haritası verisi için)
      const { data: visitData } = await supabase
        .from('visits')
        .select('id, visit_date, equipment_checks, operator:operator_id(name)')
        .eq('branch_id', branchId)
        .eq('status', 'completed')
        .order('visit_date', { ascending: false })
        .limit(10);

      setVisits(visitData || []);
      if (visitData && visitData.length > 0) {
        setSelectedVisitId(visitData[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedVisit = visits.find(v => v.id === selectedVisitId);

  // Isı Haritası Renk Mantığı
  const getEquipmentStatusColor = (eqId: string) => {
    if (!selectedVisit || !selectedVisit.equipment_checks) return '#9ca3af'; // Veri yoksa Gri

    const check = selectedVisit.equipment_checks[eqId];
    if (!check) return '#9ca3af'; // Bu ekipman bu ziyarette kontrol edilmemiş

    // Kırmızı: Aktivite var, sorun var, tüketim var
    if (
      check.activity === true || check.activity === 'true' || 
      check.status === 'issue' || check.status === 'problem' ||
      (check.consumption && check.consumption !== 'yok' && check.consumption !== 'none')
    ) {
      return '#ef4444'; // Kırmızı (Sıcak bölge)
    }

    // Yeşil: Sorunsuz, temiz
    return '#10b981';
  };

  if (loading) return <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-gray-400" /></div>;

  if (!floorPlan) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <Layout className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p className="text-gray-500">Bu şube için henüz kroki çizilmemiş.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtre Alanı */}
      <div className="flex items-center gap-4 bg-white p-3 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 text-blue-600">
          <Calendar size={20} />
          <span className="font-semibold text-sm">Aktivite Haritası:</span>
        </div>
        <select
          value={selectedVisitId}
          onChange={(e) => setSelectedVisitId(e.target.value)}
          className="flex-1 border-gray-200 rounded-md text-sm py-1.5"
        >
          {visits.length === 0 && <option>Ziyaret verisi yok</option>}
          {visits.map(v => (
            <option key={v.id} value={v.id}>
              {format(parseISO(v.visit_date), 'dd MMM yyyy', { locale: tr })} ({v.operator?.name})
            </option>
          ))}
        </select>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Aktivite/Sorun</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Temiz/Sorunsuz</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-400"></div> Veri Yok</div>
        </div>
      </div>

      {/* Kroki Çizim Alanı */}
      <div className="overflow-auto border rounded-lg bg-gray-50 flex justify-center shadow-inner">
        <div className="relative bg-white shadow-lg m-4" style={{ width: 800, height: 600 }}>
          <svg width="800" height="600" className="w-full h-full">
            <defs>
              <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="gray" strokeWidth="0.5" opacity="0.1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#smallGrid)" />

            {/* Duvarlar ve Odalar */}
            {floorPlan.elements?.map((el: any) => (
              <rect 
                key={el.id}
                x={el.x} y={el.y} width={el.width} height={el.height} 
                fill={el.type === 'wall' ? '#374151' : '#f9fafb'}
                stroke={el.type === 'room' ? '#e5e7eb' : 'none'}
                strokeWidth="2"
              />
            ))}

            {/* Ekipmanlar ve Isı Haritası Renkleri */}
            {floorPlan.equipment_positions && Object.entries(floorPlan.equipment_positions).map(([eqId, pos]: [string, any]) => {
              const statusColor = getEquipmentStatusColor(eqId);
              
              return (
                <g key={eqId} transform={`translate(${pos.x}, ${pos.y})`}>
                  {/* Isı Haritası Efekti (Hale) */}
                  <circle r="16" fill={statusColor} opacity="0.3" className="animate-pulse" />
                  
                  {/* Ekipman Noktası */}
                  <circle r="8" fill={statusColor} stroke="white" strokeWidth="2" />
                  
                  {/* Hover Tooltip (Basit text) */}
                  <title>
                    {selectedVisit?.equipment_checks?.[eqId] 
                      ? `Durum: ${JSON.stringify(selectedVisit.equipment_checks[eqId])}` 
                      : 'Veri Yok'}
                  </title>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default FloorPlanViewer;