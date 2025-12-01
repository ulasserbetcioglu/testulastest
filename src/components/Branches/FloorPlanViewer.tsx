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
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [equipmentsMap, setEquipmentsMap] = useState<Record<string, EquipmentInfo>>({});
  const [visits, setVisits] = useState<any[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  
  // Pan & Zoom State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  
  // Image size tracking
  const [imageSize, setImageSize] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const currentPlan = plans.find(p => p.id === currentPlanId);
  const selectedVisit = visits.find(v => v.id === selectedVisitId);

  // Active floor data calculation
  const activeFloorData = useMemo(() => {
    if (!currentPlan) return null;
    
    const defaultWidth = 1000;
    const defaultHeight = 800;

    if (currentPlan.floors && currentPlan.floors.length > 0) {
      const floor = currentPlan.floors[activeFloorIndex] || currentPlan.floors[0];
      
      const derivedPositions = {};
      floor.elements?.forEach((el) => {
        if (el.type === 'equipment' && el.equipmentId) {
          derivedPositions[el.equipmentId] = { x: el.x, y: el.y };
        }
      });

      return {
        elements: floor.elements || [],
        background: floor.background,
        positions: derivedPositions,
        name: floor.name,
        width: imageSize?.width || floor.width || currentPlan.width || defaultWidth,
        height: imageSize?.height || floor.height || currentPlan.height || defaultHeight
      };
    }

    return {
      elements: currentPlan.elements || [],
      background: currentPlan.background_url,
      positions: currentPlan.equipment_positions || {},
      name: currentPlan.title,
      width: imageSize?.width || currentPlan.width || defaultWidth,
      height: imageSize?.height || currentPlan.height || defaultHeight
    };
  }, [currentPlan, activeFloorIndex, imageSize]);

  // Load background image and get natural dimensions
  useEffect(() => {
    setImageLoaded(false);
    const bgUrl = currentPlan?.floors?.[activeFloorIndex]?.background || currentPlan?.background_url;
    
    if (bgUrl) {
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded:', img.naturalWidth, 'x', img.naturalHeight);
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        setImageLoaded(true);
      };
      img.onerror = () => {
        console.error('Image failed to load');
        setImageLoaded(true);
      };
      img.src = bgUrl;
    } else {
      setImageSize(null);
      setImageLoaded(true);
    }
  }, [currentPlan, activeFloorIndex]);

  const getEquipmentStatusColor = (eqId) => {
    if (!selectedVisit || !selectedVisit.equipment_checks) return '#9ca3af';

    const check = selectedVisit.equipment_checks[eqId];
    if (!check) return '#9ca3af';

    const isActivity = Object.values(check).some(val => 
       val === true || val === 'true' || val === 'var' || val === 'problem' || val === 'issue' ||
       (typeof val === 'string' && val.includes('tüketim') && val !== 'yok')
    );

    return isActivity ? '#ef4444' : '#10b981';
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.equipment-marker')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.1, transform.scale + scaleAmount), 10);
    setTransform(prev => ({ ...prev, scale: newScale }));
  };

  const zoomIn = () => setTransform(p => ({ ...p, scale: Math.min(10, p.scale + 0.2) }));
  const zoomOut = () => setTransform(p => ({ ...p, scale: Math.max(0.1, p.scale - 0.2) }));
  const resetTransform = () => setTransform({ x: 0, y: 0, scale: 1 });

  const formatValue = (key: string, val: any) => {
    if (val === true || val === 'true') return 'Evet / Var';
    if (val === false || val === 'false') return 'Hayır / Yok';
    return val;
  };

  // Debug info
  useEffect(() => {
    console.log('Active Floor Data:', activeFloorData);
    console.log('Equipment Positions:', activeFloorData?.positions);
    console.log('Image Size:', imageSize);
    console.log('Image Loaded:', imageLoaded);
  }, [activeFloorData, imageSize, imageLoaded]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <RefreshCw className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!currentPlan || plans.length === 0) {
    return (
      <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <Layout className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900">Kroki Bulunamadı</h3>
        <p className="text-gray-500">Bu şube için henüz bir yerleşim planı çizilmemiş.</p>
      </div>
    );
  }

  const selectedEqInfo = selectedEquipmentId ? equipmentsMap[selectedEquipmentId] : null;
  const selectedCheckData = selectedVisit && selectedEquipmentId ? selectedVisit.equipment_checks?.[selectedEquipmentId] : null;

  return (
    <div className="space-y-4">
      {/* Control Panel */}
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

        {/* Kat Seçim Butonları */}
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

        {/* Debug Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
          <div className="font-bold mb-1">Debug Bilgileri:</div>
          <div>Ekipman Sayısı: {Object.keys(activeFloorData?.positions || {}).length}</div>
          <div>Resim Boyutu: {imageSize ? `${imageSize.width}x${imageSize.height}` : 'Yükleniyor...'}</div>
          <div>Plan Boyutu: {activeFloorData?.width}x{activeFloorData?.height}</div>
          <div>Resim Yüklendi: {imageLoaded ? '✓' : '✗'}</div>
        </div>
      </div>

      {/* Floor Plan Canvas */}
      <div 
        ref={containerRef}
        className="overflow-hidden border rounded-xl bg-slate-100 flex justify-center items-center shadow-inner relative"
        style={{ height: '600px', cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
          className="relative bg-white shadow-2xl"
          style={{ 
            width: activeFloorData?.width, 
            height: activeFloorData?.height,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {/* Background Image */}
          {activeFloorData?.background && (
            <img 
              src={activeFloorData.background}
              alt="Floor plan"
              className="absolute inset-0 w-full h-full object-cover opacity-90"
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Equipment Markers - Using absolute positioning */}
          {activeFloorData?.positions && Object.entries(activeFloorData.positions).map(([eqId, pos]) => {
            const statusColor = getEquipmentStatusColor(eqId);
            const isHot = statusColor === '#ef4444';
            const eqInfo = equipmentsMap[eqId];
            
            return (
              <div
                key={eqId}
                className="equipment-marker absolute group cursor-pointer z-10"
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEquipmentId(eqId);
                }}
              >
                {/* Pulse effect for hot items */}
                {isHot && (
                  <div 
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ 
                      width: '48px', 
                      height: '48px',
                      left: '-14px',
                      top: '-14px',
                      backgroundColor: statusColor,
                      opacity: 0.3
                    }}
                  />
                )}
                
                {/* Main marker */}
                <div 
                  className="relative w-5 h-5 rounded-full border-2 border-white shadow-lg transition-transform hover:scale-125"
                  style={{ backgroundColor: statusColor }}
                />
                
                {/* Equipment code label */}
                {eqInfo && (
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <span 
                      className="text-xs font-bold px-2 py-0.5 bg-white/90 rounded shadow"
                      style={{ color: '#1e293b' }}
                    >
                      {eqInfo.equipment_code}
                    </span>
                  </div>
                )}
                
                {/* Hover tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-slate-800 text-white text-xs rounded px-3 py-2 shadow-lg whitespace-nowrap">
                    <div className="font-bold">{eqInfo?.equipment.name || 'Ekipman'}</div>
                    <div className="text-slate-300 text-[10px]">Detay için tıklayın</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Grid overlay when no background */}
          {!activeFloorData?.background && (
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            />
          )}
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex gap-2 bg-white/90 p-2 rounded-lg shadow border z-20">
          <button onClick={zoomOut} className="p-2 bg-white border rounded hover:bg-gray-50">
            <ZoomOut size={20}/>
          </button>
          <button onClick={resetTransform} className="p-2 bg-white border rounded hover:bg-gray-50">
            <RefreshCw size={20}/>
          </button>
          <button onClick={zoomIn} className="p-2 bg-white border rounded hover:bg-gray-50">
            <ZoomIn size={20}/>
          </button>
        </div>
        
        {/* Help Text */}
        <div className="absolute top-4 right-4 bg-white/90 px-3 py-1.5 rounded-full shadow border text-xs text-gray-500 flex items-center gap-2 z-20">
          <Move size={14} />
          Sürükle & Zoom
        </div>
      </div>
      
      {/* Equipment Detail Modal */}
      {selectedEquipmentId && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEquipmentId(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  {selectedEqInfo?.equipment_code || 'Kod Yok'}
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
                      <p className="text-sm font-medium text-gray-500">Durum</p>
                      <p className="font-bold text-gray-900">
                        {getEquipmentStatusColor(selectedEquipmentId) === '#ef4444' ? 'Aktivite Var' : 'Temiz'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {Object.entries(selectedCheckData).map(([key, val]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                        <span className="text-sm font-medium text-gray-600 capitalize">{key}</span>
                        <span className="text-sm font-bold text-gray-800">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Veri Bulunamadı</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlanViewer;