import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, RefreshCw, Layout, Layers } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

interface FloorPlanViewerProps {
  branchId: string;
}

const FloorPlanViewer: React.FC<FloorPlanViewerProps> = ({ branchId }) => {
  const [visits, setVisits] = useState<any[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [plans, setPlans] = useState<any[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Krokileri Çek
      const { data: planData } = await supabase
        .from('branch_floor_plans')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: true });
      
      if (planData && planData.length > 0) {
        setPlans(planData);
        setCurrentPlanId(planData[0].id);
      }

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
  const currentPlan = plans.find(p => p.id === currentPlanId);

  const getEquipmentStatusColor = (eqId: string) => {
    if (!selectedVisit || !selectedVisit.equipment_checks) return '#9ca3af';
    const check = selectedVisit.equipment_checks[eqId];
    if (!check) return '#9ca3af';

    const isActivity = Object.values(check).some(val => 
       val === true || val === 'true' || val === 'var' || val === 'problem' || val === 'issue'
    );

    if (isActivity) return '#ef4444';
    return '#10b981';
  };

  if (loading) return <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-gray-400" /></div>;

  if (plans.length === 0) {
    return (
      <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <Layout className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900">Kroki Bulunamadı</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Kontrol Paneli */}
      <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-wrap items-center gap-4">
        
        {/* Kat Seçimi */}
        {plans.length > 1 && (
            <div className="flex items-center gap-2 min-w-[200px]">
                <Layers className="text-purple-600" size={20} />
                <select 
                    value={currentPlanId}
                    onChange={(e) => setCurrentPlanId(e.target.value)}
                    className="flex-1 border-purple-200 rounded-md text-sm py-1.5 focus:ring-purple-500"
                >
                    {plans.map(p => <option key={p.id} value={p.id}>{p.title || 'Kat'}</option>)}
                </select>
            </div>
        )}

        {/* Tarih Seçimi */}
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <Calendar className="text-blue-600" size={20} />
          <select
            value={selectedVisitId}
            onChange={(e) => setSelectedVisitId(e.target.value)}
            className="flex-1 border-blue-200 rounded-md text-sm py-1.5 focus:ring-blue-500"
          >
            {visits.length === 0 && <option>Ziyaret verisi yok</option>}
            {visits.map(v => (
              <option key={v.id} value={v.id}>
                {format(parseISO(v.visit_date), 'dd MMM yyyy', { locale: tr })} - {v.operator?.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lejant */}
        <div className="flex gap-3 text-xs font-medium text-gray-600 ml-auto">
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span> Aktivite</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Temiz</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400"></span> Veri Yok</div>
        </div>
      </div>

      {/* Çizim */}
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

            {currentPlan?.elements?.map((el: any) => (
              <g key={el.id}>
                  {el.type === 'wall' && <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="#334155" rx={2} />}
                  {el.type === 'room' && (
                      <>
                        <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="#f8fafc" fillOpacity={0.8} stroke="#cbd5e1" strokeWidth="2" />
                        <text x={el.x + 5} y={el.y + 20} fontSize={el.fontSize || 14} fill="#64748b" fontWeight="bold">{el.text || 'Oda'}</text>
                      </>
                  )}
                  {el.type === 'door' && <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="#a16207" rx={2} />}
                  {el.type === 'window' && <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="#bae6fd" stroke="#0ea5e9" strokeWidth="2" />}
                  {el.type === 'text' && (
                      <text x={el.x} y={el.y + 20} fontSize={el.fontSize || 14} fill="#374151">{el.text || 'Metin'}</text>
                  )}
              </g>
            ))}

            {currentPlan?.equipment_positions && Object.entries(currentPlan.equipment_positions).map(([eqId, pos]: [string, any]) => {
              const statusColor = getEquipmentStatusColor(eqId);
              const isHot = statusColor === '#ef4444';
              
              return (
                <g key={eqId} transform={`translate(${pos.x}, ${pos.y})`} className="cursor-pointer group">
                  {isHot && (
                    <circle r="20" fill={statusColor} opacity="0.3">
                      <animate attributeName="r" values="20;25;20" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle r="10" fill={statusColor} stroke="white" strokeWidth="2" className="shadow-sm" />
                  
                  {/* Hover Tooltip */}
                  <title>
                     {selectedVisit?.equipment_checks?.[eqId] 
                       ? `Sonuç: ${JSON.stringify(selectedVisit.equipment_checks[eqId])}` 
                       : 'Veri Yok'}
                  </title>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="flex justify-center gap-2">
         <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="px-3 py-1 bg-white border rounded shadow-sm text-sm">-</button>
         <button onClick={() => setScale(1)} className="px-3 py-1 bg-white border rounded shadow-sm text-sm">Sıfırla</button>
         <button onClick={() => setScale(s => Math.min(1.5, s + 0.1))} className="px-3 py-1 bg-white border rounded shadow-sm text-sm">+</button>
      </div>
    </div>
  );
};

export default FloorPlanViewer;