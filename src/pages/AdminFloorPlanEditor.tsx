import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Save, Square, MousePointer, Move, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Equipment {
  id: string;
  equipment_code: string;
  equipment: { name: string; type: string };
}

interface FloorPlanElement {
  id: string;
  type: 'wall' | 'room';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

const AdminFloorPlanEditor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const branchId = searchParams.get('branch_id');
  const navigate = useNavigate();

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [elements, setElements] = useState<FloorPlanElement[]>([]);
  const [equipmentPositions, setEquipmentPositions] = useState<Record<string, { x: number, y: number }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<'select' | 'wall' | 'room'>('select');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (branchId) {
      fetchData();
    }
  }, [branchId]);

  const fetchData = async () => {
    try {
      // 1. Ekipmanları Çek
      const { data: eqData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, equipment:equipment_id(name, type)')
        .eq('branch_id', branchId);
      
      setEquipments(eqData || []);

      // 2. Mevcut Krokiyi Çek
      const { data: planData } = await supabase
        .from('branch_floor_plans')
        .select('*')
        .eq('branch_id', branchId)
        .single();

      if (planData) {
        setElements(planData.elements || []);
        setEquipmentPositions(planData.equipment_positions || {});
      }
    } catch (error) {
      console.error('Veri çekme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!branchId) return;
    try {
      const payload = {
        branch_id: branchId,
        elements,
        equipment_positions: equipmentPositions,
        updated_at: new Date().toISOString()
      };

      // Upsert işlemi (Varsa güncelle, yoksa ekle)
      const { error } = await supabase
        .from('branch_floor_plans')
        .upsert(payload, { onConflict: 'branch_id' });

      if (error) throw error;
      toast.success('Kroki kaydedildi!');
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
    }
  };

  // SVG üzerine tıklama ve çizim mantığı (Basitleştirilmiş)
  const handleSvgClick = (e: React.MouseEvent) => {
    if (selectedTool === 'select') return;
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newElement: FloorPlanElement = {
      id: Date.now().toString(),
      type: selectedTool === 'wall' ? 'wall' : 'room',
      x: Math.round(x),
      y: Math.round(y),
      width: selectedTool === 'wall' ? 100 : 150,
      height: selectedTool === 'wall' ? 10 : 100,
      color: selectedTool === 'wall' ? '#333' : '#e5e7eb'
    };

    setElements([...elements, newElement]);
    setSelectedTool('select'); // Çizimden sonra seçime dön
  };

  // Sürükle Bırak Mantığı (Ekipmanlar için)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!svgRef.current || !draggedItem) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setEquipmentPositions(prev => ({
      ...prev,
      [draggedItem]: { x: Math.round(x), y: Math.round(y) }
    }));
    setDraggedItem(null);
  };

  const removeElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
  };

  const removeEquipmentFromMap = (id: string) => {
    const newPos = { ...equipmentPositions };
    delete newPos[id];
    setEquipmentPositions(newPos);
  };

  if (!branchId) return <div className="p-8 text-center">Şube ID'si bulunamadı.</div>;
  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded"><ArrowLeft size={20}/></button>
          <h1 className="font-bold text-lg">Kroki Düzenleyici</h1>
          <div className="h-6 w-px bg-gray-300 mx-2"></div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setSelectedTool('select')}
              className={`p-2 rounded ${selectedTool === 'select' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
              title="Seç / Taşı"
            >
              <MousePointer size={18} />
            </button>
            <button 
              onClick={() => setSelectedTool('wall')}
              className={`p-2 rounded ${selectedTool === 'wall' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
              title="Duvar Ekle"
            >
              <div className="w-4 h-1 bg-current border border-current"></div>
            </button>
            <button 
              onClick={() => setSelectedTool('room')}
              className={`p-2 rounded ${selectedTool === 'room' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
              title="Oda Ekle"
            >
              <Square size={18} />
            </button>
          </div>
        </div>
        <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700">
          <Save size={18} /> Kaydet
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Ekipman Listesi */}
        <div className="w-64 bg-white border-r overflow-y-auto p-4">
          <h3 className="font-semibold mb-4 text-sm text-gray-500 uppercase">Ekipman Listesi</h3>
          <div className="space-y-2">
            {equipments.map(eq => {
              const isPlaced = !!equipmentPositions[eq.id];
              return (
                <div 
                  key={eq.id}
                  draggable={!isPlaced}
                  onDragStart={() => setDraggedItem(eq.id)}
                  className={`p-3 rounded border text-sm flex justify-between items-center ${
                    isPlaced ? 'bg-green-50 border-green-200 opacity-50 cursor-default' : 'bg-white cursor-move hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="font-bold">{eq.equipment_code}</div>
                    <div className="text-xs text-gray-500">{eq.equipment.name}</div>
                  </div>
                  {isPlaced ? (
                    <button onClick={() => removeEquipmentFromMap(eq.id)} className="text-red-500 hover:bg-red-100 p-1 rounded" title="Haritadan Kaldır">
                      <X size={14} /> {/* X iconu import edilmeli veya basit text */}
                      x
                    </button>
                  ) : (
                    <Move size={14} className="text-gray-400" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Canvas Alanı */}
        <div className="flex-1 bg-gray-50 p-8 overflow-auto flex justify-center items-start">
          <div 
            className="bg-white shadow-lg relative border border-gray-200"
            style={{ width: 800, height: 600 }}
          >
            <svg 
              ref={svgRef}
              width="800" 
              height="600" 
              onClick={handleSvgClick}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="w-full h-full"
            >
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Çizim Elemanları (Odalar/Duvarlar) */}
              {elements.map((el, idx) => (
                <g key={el.id} onContextMenu={(e) => { e.preventDefault(); removeElement(el.id); }}>
                   <rect 
                     x={el.x} y={el.y} width={el.width} height={el.height} 
                     fill={el.type === 'wall' ? '#333' : '#f3f4f6'}
                     stroke={el.type === 'room' ? '#d1d5db' : 'none'}
                     strokeWidth="2"
                   />
                   {el.type === 'room' && (
                     <text x={el.x + 5} y={el.y + 20} fontSize="12" fill="#9ca3af">Oda</text>
                   )}
                </g>
              ))}

              {/* Yerleştirilen Ekipmanlar */}
              {Object.entries(equipmentPositions).map(([eqId, pos]) => {
                const eqInfo = equipments.find(e => e.id === eqId);
                return (
                  <g key={eqId} transform={`translate(${pos.x}, ${pos.y})`} style={{ cursor: 'pointer' }}>
                    <circle r="12" fill="#3b82f6" stroke="white" strokeWidth="2" />
                    <text y="4" x="0" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                      {eqInfo?.equipment_code.substring(0, 2)}
                    </text>
                    <text y="25" x="0" textAnchor="middle" fill="#374151" fontSize="10" fontWeight="bold" className="select-none">
                      {eqInfo?.equipment_code}
                    </text>
                  </g>
                );
              })}
            </svg>
            
            {/* Bilgi */}
            <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded text-xs text-gray-500 shadow border">
              Sağ tık: Elemanı sil | Sürükle-Bırak: Ekipman Yerleştir
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFloorPlanEditor;