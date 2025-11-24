import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, RefreshCw, Layout, Info } from 'lucide-react';
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
  const [scale, setScale] = useState(1);

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

      // 2. Ziyaretleri Çek
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
    if (!selectedVisit || !selectedVisit.equipment_checks) return '#9ca3af'; // Gri (Veri yok)

    const check = selectedVisit.equipment_checks[eqId];
    if (!check) return '#9ca3af'; 

    // Kırmızı: Aktivite var
    // Dinamik kontrol: "activity", "true", "var", "problem" içeren değerler
    const isActivity = Object.values(check).some(val => 
       val === true || val === 'true' || val === 'var' || val === 'problem' || val === 'issue'
    );

    if (isActivity) return '#ef4444'; // Kırmızı
    return '#10b981'; // Yeşil (Temiz)
  };

  if (loading) return <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-gray-400" /></div>;

  if (!floorPlan) {
    return (
      <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <Layout className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900">Kroki Bulunamadı</h3>
        <p className="text-gray-500">Bu şube için henüz bir yerleşim planı çizilmemiş.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Kontrol Paneli */}
      <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[250px]">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Calendar size={20} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Aktivite Tarihi Seçin</label>
            <select
              value={selectedVisitId}
              onChange={(e) => setSelectedVisitId(e.target.value)}
              className="w-full border-gray-300 rounded-md text-sm py-1.5 focus:ring-blue-500 focus:border-blue-500"
            >
              {visits.length === 0 && <option>Ziyaret verisi yok</option>}
              {visits.map(v => (
                <option key={v.id} value={v.id}>
                  {format(parseISO(v.visit_date), 'dd MMM yyyy', { locale: tr })} - {v.operator?.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span> Aktivite Var
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500"></span> Temiz/Sorunsuz
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-400"></span> Veri Yok
          </div>
        </div>
      </div>

      {/* Kroki Alanı */}
      <div className="overflow-auto border rounded-xl bg-slate-100 flex justify-center p-8 shadow-inner min-h-[500px]">
        <div 
          className="relative bg-white shadow-2xl transition-transform duration-300 ease-out" 
          style={{ width: 1000, height: 800, transform: `scale(${scale})`, transformOrigin: 'top center' }}
        >
          <svg width="100%" height="100%" className="w-full h-full">
            <defs>
              <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#smallGrid)" />

            {/* Duvarlar ve Odalar */}
            {floorPlan.elements?.map((el: any) => (
              <rect 
                key={el.id}
                x={el.x} y={el.y} width={el.width} height={el.height} 
                fill={el.type === 'wall' ? '#334155' : '#f8fafc'}
                fillOpacity={el.type === 'room' ? 0.8 : 1}
                stroke={el.type === 'room' ? '#cbd5e1' : 'none'}
                strokeWidth="2"
                rx={el.type === 'wall' ? 2 : 0}
              />
            ))}

            {/* Ekipmanlar ve Isı Haritası */}
            {floorPlan.equipment_positions && Object.entries(floorPlan.equipment_positions).map(([eqId, pos]: [string, any]) => {
              const statusColor = getEquipmentStatusColor(eqId);
              const isHot = statusColor === '#ef4444';
              
              return (
                <g key={eqId} transform={`translate(${pos.x}, ${pos.y})`} className="group cursor-pointer">
                  {/* Isı Etkisi (Sadece kırmızıysa yanıp sön) */}
                  {isHot && (
                    <circle r="20" fill={statusColor} opacity="0.25">
                      <animate attributeName="r" values="20;25;20" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.25;0.1;0.25" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  
                  {/* Ekipman Noktası */}
                  <circle r="10" fill={statusColor} stroke="white" strokeWidth="2" className="shadow-sm drop-shadow-md" />
                  
                  {/* Hover Tooltip */}
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <rect x="-60" y="-45" width="120" height="35" rx="4" fill="#1e293b" fillOpacity="0.9" />
                    <text x="0" y="-32" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                      {selectedVisit?.equipment_checks?.[eqId] ? (isHot ? 'Aktivite Tespit Edildi' : 'Sorunsuz') : 'Kontrol Edilmedi'}
                    </text>
                    <text x="0" y="-20" textAnchor="middle" fill="#94a3b8" fontSize="9">
                      {/* Buraya ekipman kodu gelebilir eğer elimizde varsa */}
                      Detay için tıklayın
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      
      <div className="flex justify-center gap-2">
         <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="px-3 py-1 bg-white border rounded shadow-sm text-sm hover:bg-gray-50">Küçült (-)</button>
         <button onClick={() => setScale(1)} className="px-3 py-1 bg-white border rounded shadow-sm text-sm hover:bg-gray-50">Sıfırla</button>
         <button onClick={() => setScale(s => Math.min(1.5, s + 0.1))} className="px-3 py-1 bg-white border rounded shadow-sm text-sm hover:bg-gray-50">Büyüt (+)</button>
      </div>
    </div>
  );
};

export default FloorPlanViewer;