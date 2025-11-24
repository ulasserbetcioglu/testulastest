import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, RefreshCw, Layout, Info, X, MapPin, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

interface FloorPlanViewerProps {
  branchId: string;
}

interface EquipmentInfo {
  id: string;
  equipment_code: string;
  equipment: { name: string; type: string };
}

const FloorPlanViewer: React.FC<FloorPlanViewerProps> = ({ branchId }) => {
  const [visits, setVisits] = useState<any[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [floorPlan, setFloorPlan] = useState<any>(null);
  const [equipmentsMap, setEquipmentsMap] = useState<Record<string, EquipmentInfo>>({});
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  
  // Detay Modalı için State
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);

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

      // 2. Ekipman Bilgilerini Çek (Kod ve İsimleri göstermek için)
      const { data: eqData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, equipment:equipment_id(name, type)')
        .eq('branch_id', branchId);

      const eqMap: Record<string, EquipmentInfo> = {};
      eqData?.forEach((eq: any) => {
        eqMap[eq.id] = eq;
      });
      setEquipmentsMap(eqMap);

      // 3. Tamamlanan Ziyaretleri Çek (Isı haritası verisi için)
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
    if (!check) return '#9ca3af'; // Bu ekipman bu ziyarette kontrol edilmemiş

    // Kırmızı: Aktivite var, sorun var
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

  // Seçili ekipmanın detay verisi
  const selectedCheckData = selectedVisit && selectedEquipmentId ? selectedVisit.equipment_checks?.[selectedEquipmentId] : null;
  const selectedEqInfo = selectedEquipmentId ? equipmentsMap[selectedEquipmentId] : null;

  return (
    <div className="space-y-4">
      {/* Filtre Alanı */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-3 rounded-lg border shadow-sm">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
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

        <div className="flex gap-3 text-xs font-medium text-gray-600 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span> Aktivite Var
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500"></span> Temiz
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-400"></span> Veri Yok
          </div>
        </div>
      </div>

      {/* Kroki Çizim Alanı */}
      <div className="overflow-auto border rounded-xl bg-slate-100 flex justify-center p-8 shadow-inner min-h-[500px] relative">
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
              <g key={el.id}>
                <rect 
                  x={el.x} y={el.y} width={el.width} height={el.height} 
                  fill={el.type === 'wall' ? '#334155' : '#f8fafc'}
                  fillOpacity={el.type === 'room' ? 0.8 : 1}
                  stroke={el.type === 'room' ? '#cbd5e1' : 'none'}
                  strokeWidth="2"
                  rx={el.type === 'wall' ? 2 : 0}
                />
                {/* Oda Etiketi */}
                {el.type === 'room' && (
                  <text 
                    x={el.x + 5} 
                    y={el.y + 20} 
                    fontSize="14" 
                    fill="#64748b" 
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    Oda / Bölge
                  </text>
                )}
              </g>
            ))}

            {/* Ekipmanlar ve Isı Haritası */}
            {floorPlan.equipment_positions && Object.entries(floorPlan.equipment_positions).map(([eqId, pos]: [string, any]) => {
              const statusColor = getEquipmentStatusColor(eqId);
              const isHot = statusColor === '#ef4444';
              const eqInfo = equipmentsMap[eqId];
              
              return (
                <g 
                  key={eqId} 
                  transform={`translate(${pos.x}, ${pos.y})`} 
                  className="group cursor-pointer"
                  onClick={() => setSelectedEquipmentId(eqId)}
                >
                  {/* Isı Etkisi (Sadece kırmızıysa yanıp sön) */}
                  {isHot && (
                    <circle r="20" fill={statusColor} opacity="0.25">
                      <animate attributeName="r" values="20;25;20" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.25;0.1;0.25" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  
                  {/* Ekipman Noktası */}
                  <circle r="10" fill={statusColor} stroke="white" strokeWidth="2" className="shadow-sm drop-shadow-md transition-transform hover:scale-125" />
                  
                  {/* Ekipman Kodu (Text) */}
                  {eqInfo && (
                    <text 
                      x="0" y="24" 
                      textAnchor="middle" 
                      fill="#1e293b" 
                      fontSize="11" 
                      fontWeight="bold" 
                      className="select-none bg-white"
                      style={{ textShadow: '0 1px 2px white' }}
                    >
                      {eqInfo.equipment_code}
                    </text>
                  )}
                  
                  {/* Hover Tooltip (Kısa Bilgi) */}
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <rect x="-60" y="-50" width="120" height="35" rx="4" fill="#1e293b" fillOpacity="0.9" />
                    <text x="0" y="-36" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                      {eqInfo?.equipment.name || 'Ekipman'}
                    </text>
                    <text x="0" y="-24" textAnchor="middle" fill="#94a3b8" fontSize="9">
                      Detay için tıklayın
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Zoom Kontrolleri */}
        <div className="absolute bottom-4 right-4 flex gap-2 bg-white/90 p-2 rounded-lg shadow border">
           <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="px-2 py-1 bg-white border rounded hover:bg-gray-50 text-sm">-</button>
           <span className="px-2 py-1 text-sm font-mono">{Math.round(scale * 100)}%</span>
           <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="px-2 py-1 bg-white border rounded hover:bg-gray-50 text-sm">+</button>
        </div>
      </div>
      
      {/* --- EKİPMAN DETAY MODALI --- */}
      {selectedEquipmentId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  {selectedEqInfo?.equipment_code || 'Bilinmeyen Kod'}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedEqInfo?.equipment.name || 'Ekipman'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedEquipmentId(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              {selectedCheckData ? (
                <div className="space-y-4">
                   <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                     <div className={`p-2 rounded-lg ${getEquipmentStatusColor(selectedEquipmentId) === '#ef4444' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        <Activity size={24} />
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-500">Kontrol Sonucu</p>
                       <p className="font-bold text-gray-900">
                         {getEquipmentStatusColor(selectedEquipmentId) === '#ef4444' ? 'Aktivite / Sorun Tespit Edildi' : 'Sorunsuz / Temiz'}
                       </p>
                     </div>
                   </div>

                   <div className="grid gap-3">
                     {Object.entries(selectedCheckData).map(([key, val]) => (
                       <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                         <span className="text-sm font-medium text-gray-600 capitalize">
                           {key === 'status' ? 'Durum' : 
                            key === 'activity' ? 'Aktivite' : 
                            key === 'consumption' ? 'Tüketim' : 
                            key === 'count' ? 'Sayı' : key}
                         </span>
                         <span className="text-sm font-bold text-gray-800">
                           {val === true ? 'Var / Evet' : 
                            val === false ? 'Yok / Hayır' : 
                            val === 'ok' ? 'Tamam' : String(val)}
                         </span>
                       </div>
                     ))}
                   </div>
                   
                   <div className="text-xs text-center text-gray-400 mt-4">
                     Ziyaret Tarihi: {selectedVisit ? format(parseISO(selectedVisit.visit_date), 'dd MMMM yyyy HH:mm', { locale: tr }) : '-'}
                   </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Veri Bulunamadı</p>
                  <p className="text-sm text-gray-400 mt-1">Bu ziyarette bu ekipman için kontrol verisi girilmemiş.</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button 
                onClick={() => setSelectedEquipmentId(null)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlanViewer;