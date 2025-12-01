import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, RefreshCw, Layout, Info, X, Activity, Layers, ZoomIn, ZoomOut, Move } from 'lucide-react';
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

interface FloorLayer {
  id: string;
  name: string;
  elements: any[];
  background?: string;
  width?: number;
  height?: number;
}

interface FloorPlan {
  id: string;
  title: string;
  background_url?: string;
  elements: any[];
  equipment_positions: Record<string, { x: number, y: number }>;
  floors?: FloorLayer[];
  width?: number;
  height?: number;
}

const FloorPlanViewer: React.FC<FloorPlanViewerProps> = ({ branchId }) => {
  // State
  const [visits, setVisits] = useState<any[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);

  const [equipmentsMap, setEquipmentsMap] = useState<Record<string, EquipmentInfo>>({});
  const [loading, setLoading] = useState(true);
  
  // Pan & Zoom State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);

  // Resim Boyutları State'i (EN ÖNEMLİ KISIM: Koordinatları eşitlemek için)
  const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);

  // Aktif Plan
  const currentPlan = plans.find(p => p.id === currentPlanId);

  // Aktif Kat Verisini Hesapla
  const activeFloorData = useMemo(() => {
    if (!currentPlan) return null;
    
    // Çoklu kat yapısı varsa
    if (currentPlan.floors && currentPlan.floors.length > 0) {
      const floor = currentPlan.floors[activeFloorIndex] || currentPlan.floors[0];
      
      const derivedPositions: Record<string, { x: number, y: number }> = {};
      floor.elements?.forEach((el: any) => {
        if (el.type === 'equipment' && el.equipmentId) {
          derivedPositions[el.equipmentId] = { x: el.x, y: el.y };
        }
      });

      return {
        elements: floor.elements || [],
        background: floor.background,
        positions: derivedPositions,
        name: floor.name,
        // ÖNCELİK SIRASI: Resmin Doğal Boyutu > Veritabanı Boyutu > Varsayılan
        width: imageDimensions?.width || floor.width || currentPlan.width || 1000, 
        height: imageDimensions?.height || floor.height || currentPlan.height || 800
      };
    }

    // Tek katlı (eski) yapı
    return {
      elements: currentPlan.elements || [],
      background: currentPlan.background_url,
      positions: currentPlan.equipment_positions || {},
      name: currentPlan.title,
      width: imageDimensions?.width || currentPlan.width || 1000,
      height: imageDimensions?.height || currentPlan.height || 800
    };
  }, [currentPlan, activeFloorIndex, imageDimensions]); // imageDimensions değişince yeniden hesapla


  useEffect(() => {
    fetchData();
  }, [branchId]);

  // --- RESİM BOYUTLARINI ALGILA ---
  // Arka plan resmi değiştiğinde veya kat değiştiğinde çalışır.
  // Resmin doğal boyutlarını alıp state'e yazar. Böylece viewBox tam oturur.
  useEffect(() => {
    const bgUrl = currentPlan?.floors?.[activeFloorIndex]?.background || currentPlan?.background_url;
    
    if (bgUrl) {
        const img = new Image();
        img.src = bgUrl;
        img.onload = () => {
            setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        };
    } else {
        // Resim yoksa null yap (varsayılan boyutlar kullanılır)
        setImageDimensions(null);
    }
  }, [currentPlan, activeFloorIndex]); // Kat veya Plan değişince tetiklenir

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: planData } = await supabase
        .from('branch_floor_plans')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: true });
      
      if (planData && planData.length > 0) {
        setPlans(planData);
        setCurrentPlanId(planData[0].id);
        setActiveFloorIndex(0);
      } else {
        setPlans([]);
        setCurrentPlanId(null);
      }

      const { data: eqData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, equipment:equipment_id(name, type)')
        .eq('branch_id', branchId);

      const eqMap: Record<string, EquipmentInfo> = {};
      eqData?.forEach((eq: any) => {
        eqMap[eq.id] = eq;
      });
      setEquipmentsMap(eqMap);

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

  const getEquipmentStatusColor = (eqId: string) => {
    if (!selectedVisit || !selectedVisit.equipment_checks) return '#9ca3af'; 

    const check = selectedVisit.equipment_checks[eqId];
    if (!check) return '#9ca3af';

    const isActivity = Object.values(check).some(val => 
       val === true || val === 'true' || val === 'var' || val === 'problem' || val === 'issue' ||
       (typeof val === 'string' && val.includes('tüketim') && val !== 'yok')
    );

    if (isActivity) return '#ef4444'; 
    return '#10b981'; 
  };

  const formatValue = (key: string, val: any) => {
    if (val === true || val === 'true') return 'Evet / Var';
    if (val === false || val === 'false') return 'Hayır / Yok';
    return val;
  };

  // --- Pan & Zoom İşleyicileri ---
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); 
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.target === containerRef.current || containerRef.current?.contains(e.target as Node)) {
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.1, transform.scale + scaleAmount), 10);
        setTransform(prev => ({ ...prev, scale: newScale }));
    }
  };

  const zoomIn = () => setTransform(p => ({ ...p, scale: Math.min(10, p.scale + 0.2) }));
  const zoomOut = () => setTransform(p => ({ ...p, scale: Math.max(0.1, p.scale - 0.2) }));
  const resetTransform = () => setTransform({ x: 0, y: 0, scale: 1 });


  if (loading) return <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-gray-400" /></div>;

  if (plans.length === 0) {
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
      {/* Üst Kontrol Paneli */}
      <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col gap-4">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Sol Taraf: Plan ve Tarih Seçimi */}
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                
                {/* Plan Seçimi */}
                {plans.length > 1 && (!currentPlan?.floors || currentPlan.floors.length === 0) && (
                    <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-lg border border-purple-100 w-full sm:w-auto">
                        <Layers className="text-purple-600" size={20} />
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-purple-800 uppercase tracking-wider">Plan</label>
                            <select 
                                value={currentPlanId || ''} 
                                onChange={(e) => {
                                    setCurrentPlanId(e.target.value);
                                    setActiveFloorIndex(0);
                                    resetTransform();
                                }}
                                className="bg-transparent border-none p-0 text-sm font-semibold text-purple-900 focus:ring-0 cursor-pointer w-full"
                            >
                                {plans.map(p => <option key={p.id} value={p.id}>{p.title || 'Plan'}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {/* Tarih Seçimi */}
                <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100 flex-1 min-w-[250px]">
                    <Calendar className="text-blue-600" size={20} />
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider">Ziyaret Tarihi</label>
                        <select
                            value={selectedVisitId}
                            onChange={(e) => setSelectedVisitId(e.target.value)}
                            className="bg-transparent border-none p-0 text-sm font-medium text-blue-900 focus:ring-0 cursor-pointer w-full"
                        >
                            {visits.length === 0 && <option>Veri Yok</option>}
                            {visits.map(v => (
                                <option key={v.id} value={v.id}>
                                    {format(parseISO(v.visit_date), 'dd MMM yyyy', { locale: tr })} - {v.operator?.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Sağ Taraf: Lejant */}
            <div className="flex gap-3 text-xs font-medium text-gray-600 ml-auto">
                <div className="flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded border border-red-100">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Aktivite
                </div>
                <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded border border-green-100">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Temiz
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span> Veri Yok
                </div>
            </div>
        </div>

        {/* KAT SEÇİM BUTONLARI */}
        {currentPlan?.floors && currentPlan.floors.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 border-t pt-3">
                {currentPlan.floors.map((floor, idx) => (
                    <button
                        key={floor.id || idx}
                        onClick={() => {
                            setActiveFloorIndex(idx);
                            resetTransform();
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap border ${
                            activeFloorIndex === idx 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        <Layers size={16} />
                        {floor.name}
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* Kroki Çizim Alanı */}
      <div 
        ref={containerRef}
        className="overflow-hidden border rounded-xl bg-slate-100 flex justify-center items-center shadow-inner h-[600px] relative cursor-move touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
          className="relative bg-white shadow-2xl transition-transform duration-75 ease-linear origin-center" 
          style={{ 
            // Dinamik genişlik/yükseklik kullanımı
            width: activeFloorData?.width, 
            height: activeFloorData?.height, 
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` 
          }}
        >
          {/* viewBox'ı resmin gerçek boyutlarına eşitledik. Koordinat sistemi %100 doğru olacak. */}
          <svg 
            width={activeFloorData?.width}
            height={activeFloorData?.height}
            viewBox={`0 0 ${activeFloorData?.width} ${activeFloorData?.height}`}
            className="w-full h-full pointer-events-none"
          >
            <defs>
              <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
              </pattern>
            </defs>
            
            {/* Katman 1: Arkaplan Resmi */}
            {activeFloorData?.background ? (
              <image 
                href={activeFloorData.background} 
                xlinkHref={activeFloorData.background}
                x="0" y="0" 
                width={activeFloorData.width}
                height={activeFloorData.height}
                // DÜZELTME: preserveAspectRatio'yu kaldırdık veya varsayılana bıraktık.
                // viewBox resmin boyutunda olduğu için resim tam oturur, esneme olmaz.
                opacity="0.9"
              />
            ) : (
               <rect width="100%" height="100%" fill="url(#smallGrid)" />
            )}

            {/* Mimari Elemanlar */}
            {activeFloorData?.elements?.map((el: any) => (
              <g key={el.id}>
                {el.type === 'wall' && <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="#334155" rx={2} transform={`rotate(${el.rotation || 0}, ${el.x + el.width/2}, ${el.y + el.height/2})`} />}
                {el.type === 'room' && <g transform={`rotate(${el.rotation || 0}, ${el.x + el.width/2}, ${el.y + el.height/2})`}><rect x={el.x} y={el.y} width={el.width} height={el.height} fill="#f8fafc" fillOpacity={0.6} stroke="#cbd5e1" strokeWidth="2" /><text x={el.x + 5} y={el.y + 20} fontSize={el.fontSize || 14} fill="#64748b" fontWeight="bold">{el.text || 'Oda'}</text></g>}
                {el.type === 'door' && <g transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0}, ${el.width/2}, ${el.height/2})`}><rect width={el.width} height={el.height} fill="#a16207" rx={2} /><path d={`M 0 ${el.height} Q ${el.width} ${el.height} ${el.width} 0`} fill="none" stroke="#a16207" strokeDasharray="4" /></g>}
                {el.type === 'window' && <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="#bae6fd" stroke="#0ea5e9" strokeWidth="2" transform={`rotate(${el.rotation || 0}, ${el.x + el.width/2}, ${el.y + el.height/2})`} />}
                {el.type === 'text' && <text x={el.x} y={el.y + (el.fontSize || 14)} fontSize={el.fontSize || 14} fill="#374151" fontWeight="600" transform={`rotate(${el.rotation || 0}, ${el.x}, ${el.y})`} style={{ userSelect: 'none' }}>{el.text || 'Metin'}</text>}
              </g>
            ))}

            {/* Ekipmanlar ve Noktalar */}
            {activeFloorData?.positions && Object.entries(activeFloorData.positions).map(([eqId, pos]: [string, any]) => {
              const statusColor = getEquipmentStatusColor(eqId);
              const isHot = statusColor === '#ef4444';
              const eqInfo = equipmentsMap[eqId];
              
              return (
                <g 
                  key={eqId} 
                  transform={`translate(${pos.x}, ${pos.y})`} 
                  className="group cursor-pointer pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation(); 
                    setSelectedEquipmentId(eqId);
                  }}
                >
                  {isHot && (
                    <circle r="24" fill={statusColor} opacity="0.3">
                      <animate attributeName="r" values="20;28;20" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  
                  <circle r="10" fill={statusColor} stroke="white" strokeWidth="2" className="shadow-sm drop-shadow-md transition-transform hover:scale-125" />
                  
                  {eqInfo && (
                    <text 
                      x="0" y="24" 
                      textAnchor="middle" 
                      fill="#1e293b" 
                      fontSize="11" 
                      fontWeight="bold" 
                      className="select-none bg-white/80 px-1 rounded"
                      style={{ textShadow: '0 1px 2px white' }}
                    >
                      {eqInfo.equipment_code}
                    </text>
                  )}
                  
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

        {/* Zoom Butonları */}
        <div className="absolute bottom-4 right-4 flex gap-2 bg-white/90 p-2 rounded-lg shadow border z-20" onMouseDown={e => e.stopPropagation()}>
           <button onClick={zoomOut} className="p-2 bg-white border rounded hover:bg-gray-50 text-sm"><ZoomOut size={20}/></button>
           <button onClick={resetTransform} className="p-2 bg-white border rounded hover:bg-gray-50 text-sm"><RefreshCw size={20}/></button>
           <button onClick={zoomIn} className="p-2 bg-white border rounded hover:bg-gray-50 text-sm"><ZoomIn size={20}/></button>
        </div>
        
        {/* İpucu */}
        <div className="absolute top-4 right-4 bg-white/90 px-3 py-1.5 rounded-full shadow border text-xs text-gray-500 flex items-center gap-2 pointer-events-none z-20">
            <Move size={14} />
            Mouse ile sürükle / Tekerlek ile zoom
        </div>
      </div>
      
      {/* --- DETAY MODALI --- */}
      {selectedEquipmentId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm" onClick={() => setSelectedEquipmentId(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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
                           {formatValue(key, val)}
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