import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Save, Square, MousePointer, Move, Trash2, ArrowLeft, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Equipment {
  id: string;
  equipment_code: string;
  equipment: { name: string; type: string };
}

interface FloorPlanElement {
  id: string;
  type: 'wall' | 'room' | 'door';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
}

const AdminFloorPlanEditor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const branchId = searchParams.get('branch_id');
  const navigate = useNavigate();

  // Veriler
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [elements, setElements] = useState<FloorPlanElement[]>([]);
  const [equipmentPositions, setEquipmentPositions] = useState<Record<string, { x: number, y: number }>>({});
  
  // Editör Durumu
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<'select' | 'wall' | 'room'>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  // Sürükleme ve Boyutlandırma Durumları
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [elementStartPos, setElementStartPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [draggedEquipmentId, setDraggedEquipmentId] = useState<string | null>(null); // Sidebar'dan sürüklenen

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (branchId) fetchData();
  }, [branchId]);

  // Klavye Olayları (Silme vb.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          // Seçili duvar/oda sil
          setElements(prev => prev.filter(el => el.id !== selectedElementId));
          setSelectedElementId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId]);

  const fetchData = async () => {
    try {
      const { data: eqData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, equipment:equipment_id(name, type)')
        .eq('branch_id', branchId);
      setEquipments(eqData || []);

      const { data: planData } = await supabase
        .from('branch_floor_plans')
        .select('*')
        .eq('branch_id', branchId)
        .maybeSingle();

      if (planData) {
        setElements(planData.elements || []);
        setEquipmentPositions(planData.equipment_positions || {});
      }
    } catch (error) {
      console.error('Veri hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- FARE OLAYLARI (MOUSE EVENTS) ---

  // 1. Canvas veya Eleman Üzerine Basma
  const handleMouseDown = (e: React.MouseEvent, elementId?: string, isResizeHandle = false, equipmentId?: string) => {
    if (selectedTool !== 'select') return;

    // Eğer bir ekipmana tıklandıysa
    if (equipmentId) {
       e.stopPropagation();
       setIsDragging(true);
       setDraggedEquipmentId(equipmentId); // Mevcut ekipmanı taşıma modu
       // Başlangıç pozisyonunu kaydet (offset hesabı için gerekirse eklenebilir)
       return;
    }

    // Eğer bir yapı elemanına (duvar/oda) tıklandıysa
    if (elementId) {
      e.stopPropagation();
      setSelectedElementId(elementId);
      
      const el = elements.find(e => e.id === elementId);
      if (!el) return;

      setDragStartPos({ x: e.clientX, y: e.clientY });
      setElementStartPos({ x: el.x, y: el.y, w: el.width, h: el.height });

      if (isResizeHandle) {
        setIsResizing(true);
      } else {
        setIsDragging(true);
      }
    } else {
      // Boşluğa tıklandı, seçimi kaldır
      setSelectedElementId(null);
    }
  };

  // 2. Fare Hareketi (Sürükleme/Boyutlandırma)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current) return;

    // A) Sidebar'dan yeni ekipman sürükleniyorsa (HTML5 Drag API kullanır, buraya düşmez)
    // B) Canvas içindeki mevcut ekipman taşınıyorsa
    if (isDragging && draggedEquipmentId) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      
      setEquipmentPositions(prev => ({
        ...prev,
        [draggedEquipmentId]: { x: Math.round(x), y: Math.round(y) }
      }));
      return;
    }

    // C) Yapı elemanı taşınıyor veya boyutlandırılıyor
    if (selectedElementId) {
      const dx = (e.clientX - dragStartPos.x) / scale;
      const dy = (e.clientY - dragStartPos.y) / scale;

      if (isDragging) {
        setElements(prev => prev.map(el => 
          el.id === selectedElementId 
            ? { ...el, x: elementStartPos.x + dx, y: elementStartPos.y + dy } 
            : el
        ));
      } else if (isResizing) {
        setElements(prev => prev.map(el => 
          el.id === selectedElementId 
            ? { ...el, width: Math.max(20, elementStartPos.w + dx), height: Math.max(20, elementStartPos.h + dy) } 
            : el
        ));
      }
    }
  };

  // 3. Fareyi Bırakma
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setDraggedEquipmentId(null); // Ekipman taşıma bitti
  };

  // --- YENİ EKLEME FONKSİYONLARI ---

  const addElement = (type: 'wall' | 'room') => {
    const newEl: FloorPlanElement = {
      id: Date.now().toString(),
      type,
      x: 100, y: 100,
      width: type === 'wall' ? 200 : 150,
      height: type === 'wall' ? 20 : 150,
      color: type === 'wall' ? '#374151' : '#f3f4f6',
      rotation: 0
    };
    setElements([...elements, newEl]);
    setSelectedElementId(newEl.id);
    setSelectedTool('select');
  };

  // --- HTML5 DRAG & DROP (Sidebar'dan Canvas'a) ---
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const eqId = e.dataTransfer.getData('equipmentId');
    if (!eqId || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setEquipmentPositions(prev => ({
      ...prev,
      [eqId]: { x: Math.round(x), y: Math.round(y) }
    }));
  };

  // --- KAYDETME ---
  const handleSave = async () => {
    if (!branchId) return;
    try {
      const { error } = await supabase
        .from('branch_floor_plans')
        .upsert({
          branch_id: branchId,
          elements,
          equipment_positions: equipmentPositions,
          updated_at: new Date().toISOString()
        }, { onConflict: 'branch_id' });

      if (error) throw error;
      toast.success('Kroki kaydedildi!');
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    }
  };

  // --- SİLME ---
  const handleDeleteSelected = () => {
     if (selectedElementId) {
        setElements(prev => prev.filter(el => el.id !== selectedElementId));
        setSelectedElementId(null);
     }
  };

  const handleRemoveEquipment = (eqId: string) => {
    const newPos = { ...equipmentPositions };
    delete newPos[eqId];
    setEquipmentPositions(newPos);
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      {/* Toolbar */}
      <div className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={20}/></button>
          <h1 className="font-bold text-lg text-gray-800">Kroki Düzenleyici</h1>
          
          <div className="h-8 w-px bg-gray-200 mx-2"></div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
            <button 
              onClick={() => setSelectedTool('select')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${selectedTool === 'select' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              <MousePointer size={16} /> Seç
            </button>
            <button 
              onClick={() => addElement('wall')}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-white hover:shadow transition-all"
            >
              <div className="w-4 h-1 bg-current"></div> Duvar Ekle
            </button>
            <button 
              onClick={() => addElement('room')}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-white hover:shadow transition-all"
            >
              <Square size={16} /> Oda Ekle
            </button>
          </div>

          <div className="flex items-center gap-2 ml-4">
             <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 rounded hover:bg-gray-200"><ZoomOut size={16}/></button>
             <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
             <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 rounded hover:bg-gray-200"><ZoomIn size={16}/></button>
          </div>
        </div>

        <div className="flex gap-2">
          {selectedElementId && (
             <button onClick={handleDeleteSelected} className="bg-red-50 text-red-600 px-4 py-2 rounded hover:bg-red-100 flex items-center gap-2 border border-red-200">
               <Trash2 size={18} /> Sil
             </button>
          )}
          <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-blue-700 shadow-sm">
            <Save size={18} /> Kaydet
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Ekipmanlar */}
        <div className="w-72 bg-white border-r overflow-y-auto flex flex-col z-10 shadow-lg">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-700">Ekipman Listesi</h3>
            <p className="text-xs text-gray-500 mt-1">Yerleştirmek için krokiye sürükleyin.</p>
          </div>
          <div className="flex-1 p-3 space-y-2 overflow-y-auto">
            {equipments.map(eq => {
              const isPlaced = !!equipmentPositions[eq.id];
              return (
                <div 
                  key={eq.id}
                  draggable={!isPlaced}
                  onDragStart={(e) => e.dataTransfer.setData('equipmentId', eq.id)}
                  className={`p-3 rounded-lg border text-sm flex justify-between items-center transition-all ${
                    isPlaced 
                      ? 'bg-green-50 border-green-200 opacity-70' 
                      : 'bg-white border-gray-200 cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="font-bold text-gray-800">{eq.equipment_code}</div>
                    <div className="text-xs text-gray-500">{eq.equipment.name}</div>
                  </div>
                  {isPlaced ? (
                    <button 
                      onClick={() => handleRemoveEquipment(eq.id)}
                      className="text-red-500 hover:bg-red-100 p-1.5 rounded transition-colors"
                      title="Krokiden Kaldır"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <Move size={14} className="text-gray-400" />
                  )}
                </div>
              );
            })}
            {equipments.length === 0 && (
              <div className="text-center p-4 text-gray-400 text-sm">Bu şubeye ait ekipman bulunamadı.</div>
            )}
          </div>
        </div>

        {/* Canvas Alanı */}
        <div className="flex-1 bg-gray-100 overflow-auto relative flex justify-center items-center p-10">
          <div 
            className="bg-white shadow-2xl relative transition-transform origin-center"
            style={{ 
              width: 1000, 
              height: 800,
              transform: `scale(${scale})`
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onMouseDown={(e) => handleMouseDown(e)} // Boşluğa tıklamayı algıla
          >
            <svg 
              ref={svgRef}
              width="100%" 
              height="100%" 
              className="w-full h-full"
              style={{ cursor: selectedTool === 'select' ? 'default' : 'crosshair' }}
            >
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />

              {/* Elemanlar (Odalar/Duvarlar) */}
              {elements.map((el) => (
                <g 
                  key={el.id}
                  transform={`translate(${el.x}, ${el.y})`}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                  style={{ cursor: 'move' }}
                >
                  <rect 
                    width={el.width} 
                    height={el.height} 
                    fill={el.type === 'wall' ? '#374151' : '#ffffff'}
                    fillOpacity={el.type === 'room' ? 0.5 : 1}
                    stroke={selectedElementId === el.id ? '#2563eb' : (el.type === 'room' ? '#9ca3af' : 'none')}
                    strokeWidth={selectedElementId === el.id ? 2 : 1}
                    rx={2}
                  />
                  {/* Oda Etiketi */}
                  {el.type === 'room' && (
                    <text x={5} y={20} fontSize="12" fill="#6b7280" pointerEvents="none">Oda</text>
                  )}
                  
                  {/* Yeniden Boyutlandırma Tutacağı (Sadece seçiliyse göster) */}
                  {selectedElementId === el.id && (
                    <circle 
                      cx={el.width} cy={el.height} r={6} 
                      fill="white" stroke="#2563eb" strokeWidth="2"
                      style={{ cursor: 'nwse-resize' }}
                      onMouseDown={(e) => handleMouseDown(e, el.id, true)}
                    />
                  )}
                </g>
              ))}

              {/* Ekipmanlar */}
              {Object.entries(equipmentPositions).map(([eqId, pos]) => {
                const eqInfo = equipments.find(e => e.id === eqId);
                const isSelected = false; // Ekipman seçimi eklenebilir

                return (
                  <g 
                    key={eqId} 
                    transform={`translate(${pos.x}, ${pos.y})`} 
                    onMouseDown={(e) => handleMouseDown(e, undefined, false, eqId)}
                    style={{ cursor: 'grab' }}
                  >
                    <circle r="14" fill="#3b82f6" stroke="white" strokeWidth="2" className="shadow-sm" />
                    <text y="4" x="0" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" pointerEvents="none">
                      {eqInfo?.equipment_code.substring(0, 2)}
                    </text>
                    <text y="28" x="0" textAnchor="middle" fill="#1f2937" fontSize="10" fontWeight="600" className="select-none" pointerEvents="none">
                      {eqInfo?.equipment_code}
                    </text>
                  </g>
                );
              })}
            </svg>
            
            <div className="absolute top-2 left-2 text-xs text-gray-400 pointer-events-none bg-white/80 p-1 rounded">
              Kroki Alanı: 1000x800px
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFloorPlanEditor;