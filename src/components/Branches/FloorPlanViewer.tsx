import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RefreshCw, Layers, Move } from 'lucide-react';

interface FloorPlanElement {
  id: string;
  type: 'wall' | 'door' | 'window' | 'equipment' | 'text' | 'room';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  text?: string;
  equipmentId?: string;
  equipmentCode?: string;
  hasActivity?: boolean;
  lastActivity?: boolean;
}

interface FloorLayer {
  id: string;
  name: string;
  elements: FloorPlanElement[];
  background?: string;
}

interface FloorPlan {
  width: number;
  height: number;
  background?: string;
  elements: FloorPlanElement[];
  floors?: FloorLayer[];
}

interface FloorPlanViewerProps {
  floorPlan: FloorPlan;
  className?: string;
  showControls?: boolean;
}

const FloorPlanViewer: React.FC<FloorPlanViewerProps> = ({ 
  floorPlan, 
  className = "",
  showControls = true 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Kat Yönetimi State'i
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  
  // Pan & Zoom State'i (Harici kütüphane yerine manuel yönetim)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Mevcut katı belirle
  const hasMultipleFloors = floorPlan.floors && floorPlan.floors.length > 0;
  
  const currentFloorData = hasMultipleFloors 
    ? floorPlan.floors![activeFloorIndex] 
    : { 
        name: 'Zemin Kat', 
        elements: floorPlan.elements, 
        background: floorPlan.background 
      };

  const elements = currentFloorData.elements || [];
  const background = currentFloorData.background;

  // --- Pan & Zoom İşleyicileri ---
  const handleMouseDown = (e: React.MouseEvent) => {
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
    // Sadece container üzerindeyken zoom yap
    if (e.target === containerRef.current || containerRef.current?.contains(e.target as Node)) {
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.5, transform.scale + scaleAmount), 4);
        setTransform(prev => ({ ...prev, scale: newScale }));
    }
  };

  const zoomIn = () => setTransform(p => ({ ...p, scale: Math.min(4, p.scale + 0.2) }));
  const zoomOut = () => setTransform(p => ({ ...p, scale: Math.max(0.5, p.scale - 0.2) }));
  const resetTransform = () => setTransform({ x: 0, y: 0, scale: 1 });

  // --- Çizim Mantığı ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas boyutlarını ayarla
    canvas.width = floorPlan.width;
    canvas.height = floorPlan.height;

    // Temizle
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Arkaplan (Izgara)
    if (!background) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    // Elemanları Çiz
    elements.forEach(element => {
      ctx.save();
      
      const centerX = element.x + (element.width || 0) / 2;
      const centerY = element.y + (element.height || 0) / 2;

      ctx.translate(centerX, centerY);
      ctx.rotate((element.rotation || 0) * Math.PI / 180);
      ctx.translate(-centerX, -centerY);

      switch (element.type) {
        case 'wall': drawWall(ctx, element); break;
        case 'door': drawDoor(ctx, element); break;
        case 'window': drawWindow(ctx, element); break;
        case 'room': drawRoom(ctx, element); break;
        case 'equipment': drawEquipment(ctx, element); break;
        case 'text': drawText(ctx, element); break;
      }

      ctx.restore();
    });

  }, [floorPlan, activeFloorIndex, currentFloorData]); 

  // --- Çizim Alt Fonksiyonları ---
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x <= width; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 0; y <= height; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  };

  const drawWall = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    ctx.fillStyle = '#374151';
    ctx.fillRect(el.x, el.y, el.width || 10, el.height || 100);
  };

  const drawDoor = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#374151'; ctx.lineWidth = 2;
    ctx.fillRect(el.x, el.y, el.width || 40, el.height || 10);
    ctx.strokeRect(el.x, el.y, el.width || 40, el.height || 10);
    ctx.beginPath(); ctx.arc(el.x, el.y, el.width || 40, 0, Math.PI / 2); ctx.stroke();
  };

  const drawWindow = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    ctx.fillStyle = '#bfdbfe'; ctx.strokeStyle = '#374151'; ctx.lineWidth = 2;
    ctx.fillRect(el.x, el.y, el.width || 40, el.height || 10);
    ctx.strokeRect(el.x, el.y, el.width || 40, el.height || 10);
  };

  const drawRoom = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    ctx.fillStyle = 'rgba(243, 244, 246, 0.5)'; ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 2;
    ctx.fillRect(el.x, el.y, el.width || 200, el.height || 150);
    ctx.strokeRect(el.x, el.y, el.width || 200, el.height || 150);
    if (el.text) {
      ctx.fillStyle = '#4b5563'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(el.text, el.x + (el.width || 200) / 2, el.y + (el.height || 150) / 2);
    }
  };

  const drawEquipment = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    ctx.fillStyle = el.hasActivity ? '#ef4444' : el.lastActivity ? '#22c55e' : '#3b82f6';
    const radius = Math.min(el.width || 20, el.height || 20) / 2;
    ctx.beginPath(); ctx.arc(el.x + radius, el.y + radius, radius, 0, 2 * Math.PI); ctx.fill();
    if (el.equipmentCode) {
      ctx.fillStyle = '#1f2937'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(el.equipmentCode, el.x + radius, el.y - 5);
    }
  };

  const drawText = (ctx: CanvasRenderingContext2D, el: FloorPlanElement) => {
    ctx.fillStyle = '#1f2937'; ctx.font = '14px sans-serif';
    ctx.fillText(el.text || '', el.x, el.y + 14);
  };

  return (
    <div className={`flex flex-col h-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 ${className}`}>
      
      {/* ÜST PANEL */}
      {showControls && (
        <div className="bg-white p-2 border-b flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-2 overflow-x-auto">
            {hasMultipleFloors ? (
              floorPlan.floors!.map((floor, index) => (
                <button
                  key={index}
                  onClick={() => { setActiveFloorIndex(index); resetTransform(); }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeFloorIndex === index ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Layers size={16} /> {floor.name}
                </button>
              ))
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded font-medium">Zemin Kat</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
             <Move size={14} className="mr-1"/> Sürükleyerek gezinebilirsiniz
          </div>
        </div>
      )}

      {/* KROKİ ALANI */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative cursor-move bg-gray-50 flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
            className="bg-white shadow-lg transition-transform duration-75 ease-linear origin-center"
            style={{ 
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                width: floorPlan.width,
                height: floorPlan.height 
            }}
        >
            <canvas ref={canvasRef} className="block w-full h-full" />
        </div>

        {/* Harita Üstü Kontrol Butonları */}
        {showControls && (
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                <button onClick={zoomIn} className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 text-gray-700" title="Yakınlaş"><ZoomIn size={20} /></button>
                <button onClick={zoomOut} className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 text-gray-700" title="Uzaklaş"><ZoomOut size={20} /></button>
                <button onClick={resetTransform} className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 text-gray-700" title="Sıfırla"><RefreshCw size={20} /></button>
            </div>
        )}
      </div>
    </div>
  );
};

export default FloorPlanViewer;