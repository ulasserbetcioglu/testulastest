import React, { useEffect, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Maximize, Minimize, ZoomIn, ZoomOut, RefreshCw, Layers } from 'lucide-react';

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
  floors?: FloorLayer[]; // Çoklu kat desteği
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
  
  // Mevcut katı belirle: Eğer 'floors' dizisi varsa onu kullan, yoksa kök 'elements'i (eski yapı) kullan.
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
    } else {
        // Arkaplan resmi varsa çizilebilir (opsiyonel)
    }

    // Elemanları Çiz
    elements.forEach(element => {
      ctx.save();
      
      // Pozisyon ve Döndürme
      const centerX = element.x + (element.width || 0) / 2;
      const centerY = element.y + (element.height || 0) / 2;

      ctx.translate(centerX, centerY);
      ctx.rotate((element.rotation || 0) * Math.PI / 180);
      ctx.translate(-centerX, -centerY);

      switch (element.type) {
        case 'wall':
          drawWall(ctx, element);
          break;
        case 'door':
          drawDoor(ctx, element);
          break;
        case 'window':
          drawWindow(ctx, element);
          break;
        case 'room':
          drawRoom(ctx, element);
          break;
        case 'equipment':
          drawEquipment(ctx, element);
          break;
        case 'text':
          drawText(ctx, element);
          break;
      }

      ctx.restore();
    });

  }, [floorPlan, activeFloorIndex, currentFloorData]); // Kat değiştiğinde yeniden çiz

  // Çizim Fonksiyonları
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    const gridSize = 20;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawWall = (ctx: CanvasRenderingContext2D, element: FloorPlanElement) => {
    ctx.fillStyle = '#374151';
    ctx.fillRect(element.x, element.y, element.width || 10, element.height || 100);
  };

  const drawDoor = (ctx: CanvasRenderingContext2D, element: FloorPlanElement) => {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.fillRect(element.x, element.y, element.width || 40, element.height || 10);
    ctx.strokeRect(element.x, element.y, element.width || 40, element.height || 10);
    
    // Kapı yayı
    ctx.beginPath();
    ctx.arc(element.x, element.y, element.width || 40, 0, Math.PI / 2);
    ctx.stroke();
  };

  const drawWindow = (ctx: CanvasRenderingContext2D, element: FloorPlanElement) => {
    ctx.fillStyle = '#bfdbfe';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.fillRect(element.x, element.y, element.width || 40, element.height || 10);
    ctx.strokeRect(element.x, element.y, element.width || 40, element.height || 10);
  };

  const drawRoom = (ctx: CanvasRenderingContext2D, element: FloorPlanElement) => {
    ctx.fillStyle = 'rgba(243, 244, 246, 0.5)';
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.fillRect(element.x, element.y, element.width || 200, element.height || 150);
    ctx.strokeRect(element.x, element.y, element.width || 200, element.height || 150);
    
    if (element.text) {
      ctx.fillStyle = '#4b5563';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        element.text, 
        element.x + (element.width || 200) / 2, 
        element.y + (element.height || 150) / 2
      );
    }
  };

  const drawEquipment = (ctx: CanvasRenderingContext2D, element: FloorPlanElement) => {
    // Ekipman Rengi (Aktivite durumuna göre)
    if (element.hasActivity) {
      ctx.fillStyle = '#ef4444'; // Kırmızı (Aktif/Sorunlu)
    } else if (element.lastActivity) {
      ctx.fillStyle = '#22c55e'; // Yeşil (Kontrol Edilmiş)
    } else {
      ctx.fillStyle = '#3b82f6'; // Mavi (Standart)
    }
    
    // Daire şekli
    const size = Math.min(element.width || 20, element.height || 20);
    const radius = size / 2;
    
    ctx.beginPath();
    ctx.arc(element.x + radius, element.y + radius, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Kod etiketi
    if (element.equipmentCode) {
      ctx.fillStyle = '#1f2937';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        element.equipmentCode, 
        element.x + radius, 
        element.y - 5
      );
    }
  };

  const drawText = (ctx: CanvasRenderingContext2D, element: FloorPlanElement) => {
    ctx.fillStyle = '#1f2937';
    ctx.font = '14px sans-serif';
    ctx.fillText(element.text || '', element.x, element.y + 14);
  };

  return (
    <div className={`flex flex-col h-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 ${className}`}>
      
      {/* ÜST PANEL: Kat Seçimi ve Kontroller */}
      {showControls && (
        <div className="bg-white p-2 border-b flex items-center justify-between shadow-sm z-10">
          
          {/* Kat Seçimi (Varsa) */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {hasMultipleFloors ? (
              floorPlan.floors!.map((floor, index) => (
                <button
                  key={index}
                  onClick={() => setActiveFloorIndex(index)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeFloorIndex === index
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Layers size={16} />
                  {floor.name}
                </button>
              ))
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded font-medium">Zemin Kat</span>
            )}
          </div>

          {/* Zoom Kontrolleri */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 mr-2 hidden sm:inline">
              Yakınlaştırmak için mouse tekerleği veya pinch kullanın
            </span>
          </div>
        </div>
      )}

      {/* KROKİ ALANI */}
      <div className="flex-1 overflow-hidden relative cursor-move bg-gray-50" ref={containerRef}>
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={4}
          centerOnInit
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Harita Üstü Kontrol Butonları */}
              {showControls && (
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                  <button onClick={() => zoomIn()} className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 text-gray-700" title="Yakınlaş">
                    <ZoomIn size={20} />
                  </button>
                  <button onClick={() => zoomOut()} className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 text-gray-700" title="Uzaklaş">
                    <ZoomOut size={20} />
                  </button>
                  <button onClick={() => resetTransform()} className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 text-gray-700" title="Sıfırla">
                    <RefreshCw size={20} />
                  </button>
                </div>
              )}

              <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center">
                <div className="bg-white shadow-lg relative">
                  <canvas ref={canvasRef} className="block" />
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
};

export default FloorPlanViewer;