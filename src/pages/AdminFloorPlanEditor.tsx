import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { 
  Save, Square, MousePointer, Move, Trash2, ArrowLeft, 
  Maximize2, ZoomIn, ZoomOut, Type, DoorOpen, LayoutTemplate, 
  Plus, Layers 
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Equipment {
  id: string;
  equipment_code: string;
  equipment: { name: string; type: string };
}

interface FloorPlanElement {
  id: string;
  type: 'wall' | 'room' | 'door' | 'window' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string; // Metin içeriği veya oda adı
  fontSize?: number;
  rotation: number;
}

interface FloorPlan {
  id: string;
  title: string;
  elements: FloorPlanElement[];
  equipment_positions: Record<string, { x: number, y: number }>;
}

const AdminFloorPlanEditor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const branchId = searchParams.get('branch_id');
  const navigate = useNavigate();

  // Veriler
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  
  // Editör Durumu
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<'select' | 'wall' | 'room' | 'door' | 'window' | 'text'>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  // Sürükleme/Boyutlandırma
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [elementStartPos, setElementStartPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [draggedEquipmentId, setDraggedEquipmentId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // Aktif plan verisi
  const currentPlan = plans.find(p => p.id === currentPlanId);

  useEffect(() => {
    if (branchId) fetchData();
  }, [branchId]);

  // Klavye kısayolları (Silme)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        // Aktif inputta değilse sil (metin düzenlerken silmesin diye)
        if (document.activeElement?.tagName !== 'INPUT') {
            handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId]);

  const fetchData = async () => {
    try {
      // Ekipmanları çek
      const { data: eqData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, equipment:equipment_id(name, type)')
        .eq('branch_id', branchId);
      setEquipments(eqData || []);

      // Krokileri çek
      const { data: planData } = await supabase
        .from('branch_floor_plans')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: true });

      if (planData && planData.length > 0) {
        setPlans(planData.map(p => ({
            id: p.id,
            title: p.title || 'Kat 1',
            elements: p.elements || [],
            equipment_positions: p.equipment_positions || {}
        })));
        setCurrentPlanId(planData[0].id);
      } else {
        // Hiç plan yoksa varsayılan bir tane oluştur (state'de)
        const newId = 'temp-new';
        setPlans([{
            id: newId,
            title: 'Zemin Kat',
            elements: [],
            equipment_positions: {}
        }]);
        setCurrentPlanId(newId);
      }
    } catch (error) {
      console.error('Veri hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- GÜNCELLEME YARDIMCILARI ---
  const updateCurrentPlan = (updates: Partial<FloorPlan>) => {
    setPlans(prev => prev.map(p => p.id === currentPlanId ? { ...p, ...updates } : p));
  };

  const updateElements = (newElements: FloorPlanElement[]) => {
    updateCurrentPlan({ elements: newElements });
  };

  const updatePositions = (newPositions: Record<string, { x: number, y: number }>) => {
    updateCurrentPlan({ equipment_positions: newPositions });
  };

  // --- FARE OLAYLARI ---
  const handleMouseDown = (e: React.MouseEvent, elementId?: string, isResizeHandle = false, equipmentId?: string) => {
    if (selectedTool !== 'select' || !currentPlan) return;

    if (equipmentId) {
       e.stopPropagation();
       setIsDragging(true);
       setDraggedEquipmentId(equipmentId);
       return;
    }

    if (elementId) {
      e.stopPropagation();
      setSelectedElementId(elementId);
      
      const el = currentPlan.elements.find(e => e.id === elementId);
      if (!el) return;

      setDragStartPos({ x: e.clientX, y: e.clientY });
      setElementStartPos({ x: el.x, y: el.y, w: el.width, h: el.height });

      if (isResizeHandle) setIsResizing(true);
      else setIsDragging(true);
    } else {
      setSelectedElementId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!svgRef.current || !currentPlan) return;

    // Ekipman Taşıma
    if (isDragging && draggedEquipmentId) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      
      updatePositions({
        ...currentPlan.equipment_positions,
        [draggedEquipmentId]: { x: Math.round(x), y: Math.round(y) }
      });
      return;
    }

    // Eleman Taşıma/Boyutlandırma
    if (selectedElementId) {
      const dx = (e.clientX - dragStartPos.x) / scale;
      const dy = (e.clientY - dragStartPos.y) / scale;

      if (isDragging) {
        updateElements(currentPlan.elements.map(el => 
          el.id === selectedElementId ? { ...el, x: elementStartPos.x + dx, y: elementStartPos.y + dy } : el
        ));
      } else if (isResizing) {
        updateElements(currentPlan.elements.map(el => 
          el.id === selectedElementId ? { ...el, width: Math.max(20, elementStartPos.w + dx), height: Math.max(20, elementStartPos.h + dy) } : el
        ));
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setDraggedEquipmentId(null);
  };

  // --- ARAÇLAR ---
  const addElement = (type: FloorPlanElement['type']) => {
    if (!currentPlan) return;
    
    const newEl: FloorPlanElement = {
      id: Date.now().toString(),
      type,
      x: 100, y: 100,
      width: type === 'wall' ? 200 : type === 'text' ? 100 : 120,
      height: type === 'wall' ? 10 : type === 'text' ? 30 : 120,
      text: type === 'text' ? 'Metin' : type === 'room' ? 'Oda Adı' : '',
      fontSize: 14,
      rotation: 0
    };

    if (type === 'door') { newEl.width = 40; newEl.height = 10; }
    if (type === 'window') { newEl.width = 40; newEl.height = 10; }

    updateElements([...currentPlan.elements, newEl]);
    setSelectedElementId(newEl.id);
    setSelectedTool('select');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const eqId = e.dataTransfer.getData('equipmentId');
    if (!eqId || !svgRef.current || !currentPlan) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    updatePositions({
      ...currentPlan.equipment_positions,
      [eqId]: { x: Math.round(x), y: Math.round(y) }
    });
  };

  const handleSave = async () => {
    if (!branchId || !currentPlan) return;
    try {
      const planToSave = {
          branch_id: branchId,
          title: currentPlan.title,
          elements: currentPlan.elements,
          equipment_positions: currentPlan.equipment_positions,
          updated_at: new Date().toISOString()
      };

      if (currentPlan.id.startsWith('temp-')) {
          // Insert new
          const { data, error } = await supabase.from('branch_floor_plans').insert(planToSave).select().single();
          if (error) throw error;
          // Update local ID
          setPlans(prev => prev.map(p => p.id === currentPlanId ? { ...p, id: data.id } : p));
          setCurrentPlanId(data.id);
      } else {
          // Update existing
          const { error } = await supabase
            .from('branch_floor_plans')
            .update(planToSave)
            .eq('id', currentPlan.id);
          if (error) throw error;
      }

      toast.success('Kroki kaydedildi!');
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    }
  };

  const handleAddNewPlan = async () => {
      const title = prompt('Yeni kat adı (örn: 1. Kat):');
      if (!title) return;

      const newPlan: FloorPlan = {
          id: `temp-${Date.now()}`,
          title,
          elements: [],
          equipment_positions: {}
      };
      
      setPlans([...plans, newPlan]);
      setCurrentPlanId(newPlan.id);
  };

  const handleDeleteSelected = () => {
     if (selectedElementId && currentPlan) {
        updateElements(currentPlan.elements.filter(el => el.id !== selectedElementId));
        setSelectedElementId(null);
     }
  };

  const handleRemoveEquipment = (eqId: string) => {
    if (!currentPlan) return;
    const newPos = { ...currentPlan.equipment_positions };
    delete newPos[eqId];
    updatePositions(newPos);
  };

  const selectedElement = currentPlan?.elements.find(el => el.id === selectedElementId);

  if (loading) return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-100" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      {/* Üst Toolbar */}
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={20}/></button>
          
          {/* Kat Seçimi */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <select 
                value={currentPlanId || ''} 
                onChange={(e) => setCurrentPlanId(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold focus:ring-0 cursor-pointer py-1 pl-2 pr-8"
              >
                  {plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <button onClick={handleAddNewPlan} className="p-1 hover:bg-white rounded text-blue-600" title="Yeni Kat Ekle"><Plus size={16}/></button>
          </div>

          <div className="h-8 w-px bg-gray-200 mx-2"></div>
          
          {/* Araçlar */}
          <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
            <button onClick={() => setSelectedTool('select')} className={`p-2 rounded ${selectedTool === 'select' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`} title="Seç"><MousePointer size={18} /></button>
            <button onClick={() => addElement('wall')} className={`p-2 rounded hover:bg-white hover:shadow text-gray-600`} title="Duvar"><div className="w-4 h-1 bg-current"></div></button>
            <button onClick={() => addElement('room')} className={`p-2 rounded hover:bg-white hover:shadow text-gray-600`} title="Oda"><Square size={18} /></button>
            <button onClick={() => addElement('door')} className={`p-2 rounded hover:bg-white hover:shadow text-gray-600`} title="Kapı"><DoorOpen size={18} /></button>
            <button onClick={() => addElement('window')} className={`p-2 rounded hover:bg-white hover:shadow text-gray-600`} title="Pencere"><LayoutTemplate size={18} /></button>
            <button onClick={() => addElement('text')} className={`p-2 rounded hover:bg-white hover:shadow text-gray-600`} title="Metin"><Type size={18} /></button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 ml-2 bg-gray-100 rounded-lg p-1">
             <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-white rounded"><ZoomOut size={14}/></button>
             <span className="text-xs w-8 text-center">{Math.round(scale * 100)}%</span>
             <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1.5 hover:bg-white rounded"><ZoomIn size={14}/></button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-blue-700 shadow-sm">
            <Save size={18} /> Kaydet
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sol Sidebar - Ekipmanlar */}
        <div className="w-64 bg-white border-r flex flex-col z-10 shadow-lg">
          <div className="p-3 border-b bg-gray-50 text-xs font-bold text-gray-500 uppercase">Ekipman Listesi</div>
          <div className="flex-1 p-2 space-y-2 overflow-y-auto">
            {equipments.map(eq => {
              // Ekipman bu katta yerleştirilmiş mi?
              const isPlacedThisPlan = !!currentPlan?.equipment_positions[eq.id];
              // Ekipman başka bir katta yerleştirilmiş mi? (Opsiyonel kontrol)
              const isPlacedOther = plans.some(p => p.id !== currentPlanId && p.equipment_positions[eq.id]);

              return (
                <div 
                  key={eq.id}
                  draggable={!isPlacedThisPlan}
                  onDragStart={(e) => e.dataTransfer.setData('equipmentId', eq.id)}
                  className={`p-2 rounded border text-xs flex justify-between items-center ${
                    isPlacedThisPlan ? 'bg-green-50 border-green-200 opacity-70' : 
                    isPlacedOther ? 'bg-yellow-50 border-yellow-200' :
                    'bg-white hover:border-blue-400 cursor-grab'
                  }`}
                >
                  <div>
                    <div className="font-bold">{eq.equipment_code}</div>
                    <div className="text-gray-500 truncate w-32">{eq.equipment.name}</div>
                    {isPlacedOther && <div className="text-[10px] text-yellow-600">Başka katta</div>}
                  </div>
                  {isPlacedThisPlan ? (
                    <button onClick={() => handleRemoveEquipment(eq.id)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 size={14} /></button>
                  ) : (
                    <Move size={14} className="text-gray-400" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Canvas Alanı */}
        <div className="flex-1 bg-gray-100 overflow-auto relative flex justify-center items-center p-10" onMouseDown={() => setSelectedElementId(null)}>
          <div 
            className="bg-white shadow-2xl relative transition-transform origin-center"
            style={{ width: 1000, height: 800, transform: `scale(${scale})` }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <svg ref={svgRef} width="100%" height="100%" className="w-full h-full">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />

              {/* Elemanlar */}
              {currentPlan?.elements.map((el) => (
                <g 
                  key={el.id}
                  transform={`translate(${el.x}, ${el.y})`}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                  style={{ cursor: 'move' }}
                >
                  {/* ŞEKİLLER */}
                  {el.type === 'wall' && <rect width={el.width} height={el.height} fill="#333" rx={2} />}
                  {el.type === 'room' && <rect width={el.width} height={el.height} fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />}
                  {el.type === 'door' && <rect width={el.width} height={el.height} fill="#a16207" rx={2} />}
                  {el.type === 'window' && <rect width={el.width} height={el.height} fill="#bae6fd" stroke="#0ea5e9" strokeWidth="2" />}
                  
                  {/* METİNLER */}
                  {(el.type === 'text' || el.type === 'room') && (
                     <text 
                        x={el.type === 'text' ? 0 : 5} 
                        y={el.type === 'text' ? 20 : 20} 
                        fontSize={el.fontSize || 14} 
                        fontWeight={el.type === 'room' ? 'bold' : 'normal'}
                        fill="#4b5563" 
                        style={{ userSelect: 'none' }}
                     >
                        {el.text || (el.type === 'room' ? 'Oda' : 'Metin')}
                     </text>
                  )}
                  
                  {/* Seçim Çerçevesi */}
                  {selectedElementId === el.id && (
                    <>
                        <rect x="-2" y="-2" width={el.width + 4} height={el.height + 4} fill="none" stroke="#2563eb" strokeDasharray="4" />
                        <circle cx={el.width} cy={el.height} r={5} fill="#2563eb" style={{ cursor: 'nwse-resize' }} onMouseDown={(e) => handleMouseDown(e, el.id, true)} />
                    </>
                  )}
                </g>
              ))}

              {/* Ekipmanlar */}
              {currentPlan && Object.entries(currentPlan.equipment_positions).map(([eqId, pos]) => {
                const eqInfo = equipments.find(e => e.id === eqId);
                return (
                  <g key={eqId} transform={`translate(${pos.x}, ${pos.y})`} onMouseDown={(e) => handleMouseDown(e, undefined, false, eqId)} style={{ cursor: 'grab' }}>
                    <circle r="10" fill="#2563eb" stroke="white" strokeWidth="2" className="shadow-sm" />
                    <text y="22" x="0" textAnchor="middle" fill="#1f2937" fontSize="10" fontWeight="bold" className="select-none pointer-events-none">
                      {eqInfo?.equipment_code}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Sağ Sidebar - Özellikler (Sadece bir eleman seçiliyse) */}
        {selectedElement && (
            <div className="w-64 bg-white border-l p-4 shadow-lg z-10">
                <h3 className="font-bold text-gray-700 text-sm mb-4 pb-2 border-b">Özellikler</h3>
                
                <div className="space-y-4">
                    {(selectedElement.type === 'text' || selectedElement.type === 'room') && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Etiket / Metin</label>
                            <input 
                                type="text" 
                                value={selectedElement.text || ''} 
                                onChange={(e) => updateElements(currentPlan!.elements.map(el => el.id === selectedElementId ? { ...el, text: e.target.value } : el))}
                                className="w-full p-2 border rounded text-sm"
                            />
                        </div>
                    )}
                     
                    {(selectedElement.type === 'text' || selectedElement.type === 'room') && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Yazı Boyutu</label>
                            <input 
                                type="number" 
                                value={selectedElement.fontSize || 14} 
                                onChange={(e) => updateElements(currentPlan!.elements.map(el => el.id === selectedElementId ? { ...el, fontSize: Number(e.target.value) } : el))}
                                className="w-full p-2 border rounded text-sm"
                            />
                        </div>
                    )}

                    <div>
                        <button 
                           onClick={handleDeleteSelected}
                           className="w-full bg-red-50 text-red-600 py-2 rounded flex items-center justify-center gap-2 hover:bg-red-100"
                        >
                            <Trash2 size={16} /> Sil
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminFloorPlanEditor;