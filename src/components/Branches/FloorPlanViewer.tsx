import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, RefreshCw, Layout, Info, X, Activity, Layers, ZoomIn, ZoomOut, Move, AlertCircle } from 'lucide-react';

// Mock data for testing
const mockPlans = [{
  id: '1',
  title: 'Ana Kat Planı',
  background_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1000&h=800&fit=crop',
  width: 1000,
  height: 800,
  equipment_positions: {
    'eq1': { x: 200, y: 300 },
    'eq2': { x: 500, y: 400 },
    'eq3': { x: 700, y: 200 }
  },
  elements: []
}];

const mockEquipments = {
  'eq1': { id: 'eq1', equipment_code: 'EK-001', equipment: { name: 'Tuzak 1', type: 'trap' }},
  'eq2': { id: 'eq2', equipment_code: 'EK-002', equipment: { name: 'Tuzak 2', type: 'trap' }},
  'eq3': { id: 'eq3', equipment_code: 'EK-003', equipment: { name: 'İlaçlama', type: 'spray' }}
};

const mockVisits = [{
  id: 'v1',
  visit_date: '2024-01-15T10:00:00',
  operator: { name: 'Ahmet Yılmaz' },
  equipment_checks: {
    'eq1': { status: 'checked', activity: true, consumption: 'var' },
    'eq2': { status: 'checked', activity: false },
    'eq3': { status: 'checked', activity: true, count: 3 }
  }
}];

const FloorPlanViewer = () => {
  const [plans] = useState(mockPlans);
  const [currentPlanId, setCurrentPlanId] = useState('1');
  const [equipmentsMap] = useState(mockEquipments);
  const [visits] = useState(mockVisits);
  const [selectedVisitId, setSelectedVisitId] = useState('v1');
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

  // Debug info
  useEffect(() => {
    console.log('Active Floor Data:', activeFloorData);
    console.log('Equipment Positions:', activeFloorData?.positions);
    console.log('Image Size:', imageSize);
    console.log('Image Loaded:', imageLoaded);
  }, [activeFloorData, imageSize, imageLoaded]);

  if (!currentPlan) {
    return (
      <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <Layout className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900">Kroki Bulunamadı</h3>
      </div>
    );
  }

  const selectedEqInfo = selectedEquipmentId ? equipmentsMap[selectedEquipmentId] : null;
  const selectedCheckData = selectedVisit && selectedEquipmentId ? selectedVisit.equipment_checks?.[selectedEquipmentId] : null;

  return (
    <div className="space-y-4 p-4">
      {/* Control Panel */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
              <Calendar className="text-blue-600" size={20} />
              <div>
                <label className="block text-xs font-bold text-blue-800">Ziyaret</label>
                <select
                  value={selectedVisitId}
                  onChange={(e) => setSelectedVisitId(e.target.value)}
                  className="bg-transparent border-none p-0 text-sm font-medium text-blue-900"
                >
                  {visits.map(v => (
                    <option key={v.id} value={v.id}>
                      {new Date(v.visit_date).toLocaleDateString('tr-TR')} - {v.operator?.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 text-xs font-medium">
            <div className="flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded border border-red-100">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Aktivite
            </div>
            <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded border border-green-100">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Temiz
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-100">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span> Veri Yok
            </div>
          </div>
        </div>

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