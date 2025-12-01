/**
 * FLOOR PLAN VIEWER (REFINED VERSION)
 * Admin’de çizilen planın şubelerde birebir aynı koordinatlarla görünmesini garanti eder.
 * Tüm width/height sadece DB’den okunur -> resim boyutu NEREDEYSE HİÇBİR ŞEYİ ETKİLEMEZ.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Calendar, RefreshCw, Layout, Info, X, Activity, Layers, 
  ZoomIn, ZoomOut, Move 
} from 'lucide-react';
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

// ------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------

const FloorPlanViewer: React.FC<FloorPlanViewerProps> = ({ branchId }) => {

  // -----------------------------------------------------------------
  // STATE
  // -----------------------------------------------------------------
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);

  const [visits, setVisits] = useState<any[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');

  const [equipmentsMap, setEquipmentsMap] = useState<Record<string, EquipmentInfo>>({});
  const [loading, setLoading] = useState(true);

  // Pan–Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);

  // Aktif plan
  const currentPlan = plans.find(p => p.id === currentPlanId);


  // -----------------------------------------------------------------
  // FETCH DATA (plans + equipments + visits)
  // -----------------------------------------------------------------
  useEffect(() => { fetchData(); }, [branchId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // PLANLAR
      const { data: planData } = await supabase
        .from('branch_floor_plans')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at');

      if (planData && planData.length > 0) {
        setPlans(planData);
        setCurrentPlanId(planData[0].id);
      }

      // EKİPMANLAR
      const { data: eqData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, equipment:equipment_id(name, type)')
        .eq('branch_id', branchId);

      const eqMap: Record<string, EquipmentInfo> = {};
      eqData?.forEach(eq => eqMap[eq.id] = eq);
      setEquipmentsMap(eqMap);

      // ZİYARETLER
      const { data: visitData } = await supabase
        .from('visits')
        .select('id, visit_date, equipment_checks, operator:operator_id(name)')
        .eq('branch_id', branchId)
        .eq('status', 'completed')
        .order('visit_date', { ascending: false })
        .limit(10);

      setVisits(visitData || []);
      if (visitData?.length) setSelectedVisitId(visitData[0].id);

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedVisit = visits.find(x => x.id === selectedVisitId);


  // -----------------------------------------------------------------
  // AKTİF KAT (EN KRİTİK BÖLÜM — Admin ile birebir koordinatlar)
  // -----------------------------------------------------------------

  const activeFloorData = useMemo(() => {
    if (!currentPlan) return null;

    // Çok katlı yapı
    if (currentPlan.floors?.length > 0) {
      const floor = currentPlan.floors[activeFloorIndex];

      const width = floor?.width ?? 1000;
      const height = floor?.height ?? 800;

      const equipmentPositions: Record<string, { x: number; y: number }> = {};
      floor.elements?.forEach(el => {
        if (el.type === 'equipment' && el.equipmentId) {
          equipmentPositions[el.equipmentId] = { x: el.x, y: el.y };
        }
      });

      return {
        name: floor.name,
        background: floor.background,
        elements: floor.elements || [],
        positions: equipmentPositions,
        width,
        height
      };
    }

    // Tek katlı plan (admin ile birebir)
    return {
      name: currentPlan.title,
      background: currentPlan.background_url,
      elements: currentPlan.elements || [],
      positions: currentPlan.equipment_positions || {},
      width: currentPlan.width ?? 1000,
      height: currentPlan.height ?? 800
    };
  }, [currentPlan, activeFloorIndex]);


  // -----------------------------------------------------------------
  // EKİPMAN RENK
  // -----------------------------------------------------------------
  const getStatusColor = (eqId: string) => {
    const check = selectedVisit?.equipment_checks?.[eqId];
    if (!check) return '#999'; // veri yok

    const hasIssue = Object.values(check).some(v =>
      v === true || v === 'var' || v === 'problem' || v === 'issue'
    );

    return hasIssue ? '#e11d48' : '#10b981';
  };


  // -----------------------------------------------------------------
  // PAN – ZOOM
  // -----------------------------------------------------------------
  const onMouseDown = (e: any) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const onMouseMove = (e: any) => {
    if (!isDragging) return;
    setTransform(prev => ({ ...prev, x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }));
  };

  const onMouseUp = () => setIsDragging(false);

  const onWheel = (e: any) => {
    if (!containerRef.current?.contains(e.target)) return;

    const delta = -e.deltaY * 0.001;
    const next = Math.min(Math.max(0.1, transform.scale + delta), 5);

    setTransform(prev => ({ ...prev, scale: next }));
  };

  const zoomIn = () => setTransform(p => ({ ...p, scale: Math.min(5, p.scale + 0.2) }));
  const zoomOut = () => setTransform(p => ({ ...p, scale: Math.max(0.1, p.scale - 0.2) }));
  const resetTransform = () => setTransform({ x: 0, y: 0, scale: 1 });


  // -----------------------------------------------------------------
  // LOADING
  // -----------------------------------------------------------------
  if (loading) {
    return <div className="flex justify-center p-10"><RefreshCw className="animate-spin w-8 h-8 text-gray-400" /></div>;
  }

  if (!currentPlan) {
    return (
      <div className="p-12 text-center border border-dashed rounded-lg bg-gray-50">
        <Layout className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <h2 className="font-semibold text-gray-700">Plan bulunamadı</h2>
      </div>
    );
  }


  // -----------------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------------

  return (
    <div className="space-y-4">

      {/* ÜST ARAÇLAR ------------------------------------------------------------------ */}
      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">

        <div className="flex flex-wrap items-center gap-4">
          
          {/* Plan */}
          {plans.length > 1 && (
            <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-lg border border-purple-200">
              <Layers size={18} className="text-purple-600" />
              <select 
                className="bg-transparent border-none font-semibold text-purple-900"
                value={currentPlanId ?? ''}
                onChange={e => {
                  setCurrentPlanId(e.target.value);
                  setActiveFloorIndex(0);
                  resetTransform();
                }}
              >
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Ziyaret */}
          <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
            <Calendar size={18} className="text-blue-600" />
            <select 
              className="bg-transparent border-none font-semibold text-blue-900"
              value={selectedVisitId}
              onChange={e => setSelectedVisitId(e.target.value)}
            >
              {visits.map(v => (
                <option key={v.id} value={v.id}>
                  {format(parseISO(v.visit_date), 'dd MMM yyyy', { locale: tr })} – {v.operator?.name}
                </option>
              ))}
            </select>
          </div>

        </div>


        {/* Katlar */}
        {currentPlan?.floors?.length > 0 && (
          <div className="flex gap-2">
            {currentPlan.floors.map((f, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveFloorIndex(idx);
                  resetTransform();
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                  activeFloorIndex === idx ? 
                  'bg-blue-600 text-white border-blue-600' :
                  'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
      </div>



      {/* ÇİZİM ALANI ------------------------------------------------------------------ */}
      <div 
        ref={containerRef}
        className="border bg-gray-100 rounded-xl h-[600px] overflow-hidden relative cursor-move"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        
        <div
          className="relative shadow-xl origin-center transition-transform"
          style={{
            width: activeFloorData?.width,
            height: activeFloorData?.height,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`
          }}
        >
          <svg
            width={activeFloorData?.width}
            height={activeFloorData?.height}
            viewBox={`0 0 ${activeFloorData?.width} ${activeFloorData?.height}`}
            className="w-full h-full"
          >

            {/* Arkaplan */}
            {activeFloorData?.background && (
              <image
                href={activeFloorData.background}
                x="0"
                y="0"
                width={activeFloorData.width}
                height={activeFloorData.height}
                preserveAspectRatio="none"
                opacity="0.95"
              />
            )}

            {/* Mimari Elemanlar */}
            {activeFloorData?.elements?.map(el => (
              <g key={el.id}>
                {el.type === 'wall' && (
                  <rect
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    fill="#334155"
                    rx={2}
                    transform={`rotate(${el.rotation || 0}, ${el.x + el.width/2}, ${el.y + el.height/2})`}
                  />
                )}

                {el.type === 'room' && (
                  <g transform={`rotate(${el.rotation || 0}, ${el.x+el.width/2}, ${el.y+el.height/2})`}>
                    <rect
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={el.height}
                      fill="#f1f5f9"
                      stroke="#cbd5e1"
                      strokeWidth={2}
                    />
                    <text
                      x={el.x + 8}
                      y={el.y + 20}
                      fontSize={el.fontSize || 14}
                      fill="#475569"
                      fontWeight="bold"
                    >
                      {el.text || 'Oda'}
                    </text>
                  </g>
                )}

                {el.type === 'door' && (
                  <g transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0}, ${el.width/2}, ${el.height/2})`}>
                    <rect width={el.width} height={el.height} fill="#b45309" rx={2} />
                    <path d={`M0 ${el.height} Q${el.width} ${el.height} ${el.width} 0`} fill="none" stroke="#b45309" />
                  </g>
                )}

                {el.type === 'window' && (
                  <rect
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    fill="#bfdbfe"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    transform={`rotate(${el.rotation || 0}, ${el.x+el.width/2}, ${el.y+el.height/2})`}
                  />
                )}

                {el.type === 'text' && (
                  <text
                    x={el.x}
                    y={el.y + (el.fontSize || 14)}
                    fontSize={el.fontSize || 14}
                    fill="#1e293b"
                    fontWeight="600"
                    transform={`rotate(${el.rotation || 0}, ${el.x}, ${el.y})`}
                  >
                    {el.text}
                  </text>
                )}
              </g>
            ))}

            {/* Ekipman Noktaları */}
            {activeFloorData?.positions &&
              Object.entries(activeFloorData.positions).map(([eqId, pos]) => {
                const color = getStatusColor(eqId);
                const eqInfo = equipmentsMap[eqId];

                return (
                  <g
                    key={eqId}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEquipmentId(eqId);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle r={10} fill={color} stroke="#fff" strokeWidth={2} />

                    {eqInfo && (
                      <text
                        x={0}
                        y={24}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="bold"
                        fill="#334155"
                      >
                        {eqInfo.equipment_code}
                      </text>
                    )}
                  </g>
                );
              })}
          </svg>

        </div>

        {/* Zoom butonları */}
        <div className="absolute bottom-4 right-4 flex gap-2 bg-white p-2 rounded-xl shadow">
          <button onClick={zoomOut} className="p-2 border rounded hover:bg-gray-50"><ZoomOut size={18} /></button>
          <button onClick={resetTransform} className="p-2 border rounded hover:bg-gray-50"><RefreshCw size={18} /></button>
          <button onClick={zoomIn} className="p-2 border rounded hover:bg-gray-50"><ZoomIn size={18} /></button>
        </div>

        {/* İpucu */}
        <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-xs border shadow flex items-center gap-2">
          <Move size={14} /> Sürükle / Zoom
        </div>
      </div>


      {/* DETAY MODALI --------------------------------------------------------------- */}
      {selectedEquipmentId && (
        <EquipmentDetailModal
          equipmentId={selectedEquipmentId}
          eqInfo={equipmentsMap[selectedEquipmentId]}
          selectedVisit={selectedVisit}
          onClose={() => setSelectedEquipmentId(null)}
        />
      )}

    </div>
  );
};



// -----------------------------------------------------------------------------
// MODAL
// -----------------------------------------------------------------------------

const EquipmentDetailModal = ({ equipmentId, eqInfo, selectedVisit, onClose }) => {
  const data = selectedVisit?.equipment_checks?.[equipmentId] ?? null;
  const color = data ? 
    (Object.values(data).some(v => v === true || v === 'var') ? 'red' : 'green') :
    'gray';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <div>
            <h2 className="font-bold text-lg">{eqInfo?.equipment_code}</h2>
            <p className="text-xs text-gray-500">{eqInfo?.equipment?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!data ? (
            <div className="text-center py-6 text-gray-500">Veri yok</div>
          ) : (
            Object.entries(data).map(([key, val]) => (
              <div key={key} className="flex justify-between border p-2 rounded">
                <span className="text-gray-600">{key}</span>
                <span className="font-semibold">{val}</span>
              </div>
            ))
          )}
        </div>

        <div className="p-4 text-right border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default FloorPlanViewer;
