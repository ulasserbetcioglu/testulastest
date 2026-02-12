import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  Save, Square, MousePointer, Move, Trash2, ArrowLeft,
  Maximize2, ZoomIn, ZoomOut, Type, DoorOpen, LayoutTemplate,
  Plus, Layers, Upload, Image as ImageIcon, MapPin, Phone, Mail, Globe, Loader2, Edit3,
  Pentagon, Activity, RotateCw, Circle as CircleIcon
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Equipment {
  id: string;
  equipment_code: string;
  equipment: { name: string; type: string };
}

interface Point {
  x: number;
  y: number;
}

interface FloorPlanElement {
  id: string;
  type: 'wall' | 'room' | 'door' | 'window' | 'text' | 'polygon' | 'polyline' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  rotation: number;
  points?: Point[]; // Polygon ve Polyline için noktalar
  color?: string; // Özelleştirilebilir renk
}

interface FloorPlan {
  id: string;
  title: string;
  background_url?: string;
  elements: FloorPlanElement[];
  equipment_positions: Record<string, { x: number, y: number }>;
}

interface CompanySettings {
  company_name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

const AdminFloorPlanEditor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const branchId = searchParams.get('branch_id');
  const navigate = useNavigate();

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [branchInfo, setBranchInfo] = useState<{ sube_adi: string; customer: { kisa_isim: string } } | null>(null);

  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<'select' | 'wall' | 'room' | 'door' | 'window' | 'text' | 'polygon' | 'polyline' | 'circle'>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [uploadingBg, setUploadingBg] = useState(false);

  // Çizim State'leri
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [currentMousePos, setCurrentMousePos] = useState<Point>({ x: 0, y: 0 });

  // Manipülasyon State'leri
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [elementStartPos, setElementStartPos] = useState({ x: 0, y: 0, w: 0, h: 0, r: 0 });
  const [draggedEquipmentId, setDraggedEquipmentId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPlan = plans.find(p => p.id === currentPlanId);

  useEffect(() => {
    if (branchId) {
      fetchData();
      fetchCompanySettings();
    }
  }, [branchId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        if (document.activeElement?.tagName !== 'INPUT') handleDeleteSelected();
      }
      if (e.key === 'Enter' && isDrawing) {
        finishDrawing();
      }
      if (e.key === 'Escape') {
        if (isDrawing) {
          setIsDrawing(false);
          setDrawingPoints([]);
        } else {
          setSelectedElementId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, isDrawing, drawingPoints]);

  const fetchCompanySettings = async () => {
    try {
      const { data } = await supabase.from('company_settings').select('*').single();
      if (data) setCompanySettings(data);
    } catch (error) {
      console.error('Şirket ayarları alınamadı:', error);
    }
  };

  const fetchData = async () => {
    try {
      const { data: branchData } = await supabase
        .from('branches')
        .select('sube_adi, customer:customer_id(kisa_isim)')
        .eq('id', branchId)
        .single();
      if (branchData) setBranchInfo(branchData);

      const { data: eqData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, equipment:equipment_id(name, type)')
        .eq('branch_id', branchId);
      setEquipments(eqData || []);

      const { data: planData } = await supabase
        .from('branch_floor_plans')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: true });

      if (planData && planData.length > 0) {
        setPlans(planData.map(p => ({
          id: p.id,
          title: p.title || 'Kat 1',
          background_url: p.background_url,
          elements: p.elements || [],
          equipment_positions: p.equipment_positions || {}
        })));
        setCurrentPlanId(planData[0].id);
      } else {
        const newId = 'temp-new';
        setPlans([{
          id: newId,
          title: 'Zemin Kat',
          background_url: '',
          elements: [],
          equipment_positions: {}
        }]);
        setCurrentPlanId(newId);
      }
    } catch (error) {
      console.error('Veri hatası:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentPlan = (updates: Partial<FloorPlan>) => {
    setPlans(prev => prev.map(p => p.id === currentPlanId ? { ...p, ...updates } : p));
  };

  const updateElements = (newElements: FloorPlanElement[]) => {
    updateCurrentPlan({ elements: newElements });
  };

  const updatePositions = (newPositions: Record<string, { x: number, y: number }>) => {
    updateCurrentPlan({ equipment_positions: newPositions });
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentPlan) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Geçerli bir resim seçiniz');
      return;
    }

    setUploadingBg(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `floor-plans/${branchId}/${currentPlan.id}-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);

      updateCurrentPlan({ background_url: urlData.publicUrl });

      toast.success('Arkaplan yüklendi');
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
    } finally {
      setUploadingBg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const normalize = (v: number, min = 1) => {
    return Number.isFinite(v) ? Math.max(min, v) : min;
  };

  const getMousePos = (e: React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  };

  const handleMouseDown = (
    e: React.MouseEvent,
    elementId?: string,
    actionType: 'drag' | 'resize' | 'rotate' = 'drag',
    equipmentId?: string
  ) => {
    if (selectedTool !== 'select' || !currentPlan) {
      // Çizim Modu veya Boş Tıklama
      if (!elementId && !equipmentId && (selectedTool === 'polygon' || selectedTool === 'polyline')) {
        const pos = getMousePos(e);
        if (!isDrawing) {
          setIsDrawing(true);
          setDrawingPoints([pos]);
        } else {
          setDrawingPoints([...drawingPoints, pos]);
        }
      } else if (!elementId && !equipmentId && isDrawing) {
        // Çizim devam ederken boşluğa tıkladı, nokta ekle
        const pos = getMousePos(e);
        setDrawingPoints([...drawingPoints, pos]);
      } else if (!elementId && !equipmentId) {
        // Boşluğa tıklandı, seçimi kaldır ve çizimi iptal et
        setSelectedElementId(null);
        setIsDrawing(false);
        setDrawingPoints([]);
      }
      return;
    }

    // Seçim Modu
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

      setElementStartPos({
        x: el.x ?? 0,
        y: el.y ?? 0,
        w: el.width ?? 50,
        h: el.height ?? 50,
        r: el.rotation ?? 0
      });

      if (actionType === 'resize') setIsResizing(true);
      else if (actionType === 'rotate') setIsRotating(true);
      else setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    setCurrentMousePos(pos);

    if (!svgRef.current || !currentPlan) return;

    if (isDragging && draggedEquipmentId) {
      updatePositions({
        ...currentPlan.equipment_positions,
        [draggedEquipmentId]: { x: Math.round(pos.x), y: Math.round(pos.y) }
      });
      return;
    }

    if (selectedElementId) {
      const dx = (e.clientX - dragStartPos.x) / scale;
      const dy = (e.clientY - dragStartPos.y) / scale;
      const el = currentPlan.elements.find(e => e.id === selectedElementId);
      if (!el) return;

      if (isDragging) {
        updateElements(currentPlan.elements.map(item =>
          item.id === selectedElementId
            ? {
              ...item,
              x: normalize(elementStartPos.x + dx, -1000), // Negatif koordinatlara izin ver
              y: normalize(elementStartPos.y + dy, -1000)
            }
            : item
        ));
      }

      if (isResizing) {
        updateElements(currentPlan.elements.map(item =>
          item.id === selectedElementId
            ? {
              ...item,
              width: normalize(elementStartPos.w + dx, 5),
              height: normalize(elementStartPos.h + dy, 5)
            }
            : item
        ));
      }

      if (isRotating) {
        // Döndürme mantığı: Mouse'un eleman merkezine göre açısını hesapla
        const centerX = (el.x + (el.width / 2)) * scale + svgRef.current.getBoundingClientRect().left;
        const centerY = (el.y + (el.height / 2)) * scale + svgRef.current.getBoundingClientRect().top;

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const radians = Math.atan2(mouseY - centerY, mouseX - centerX);
        const degrees = radians * (180 / Math.PI);
        // Başlangıç açısı + delta gibi karmaşık değil, direkt açı
        // Daha pürüzsüz olması için 90 derece ekleyebiliriz (tutamak üstte olduğu için)
        const finalRotation = (degrees + 90) % 360;

        updateElements(currentPlan.elements.map(item =>
          item.id === selectedElementId ? { ...item, rotation: finalRotation } : item
        ));
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
    setDraggedEquipmentId(null);
  };

  // Çift tıklama ile çizimi bitir
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isDrawing) {
      finishDrawing();
    }
  };

  const finishDrawing = () => {
    if (!isDrawing || drawingPoints.length < 2) {
      setIsDrawing(false);
      setDrawingPoints([]);
      return;
    }

    // Yeni şekli ekle
    // Polygon ise minX, minY hesapla ve noktaları normalize et
    // Bu sayede şekil x,y koordinatında render edilir ve noktalar local olur.

    const xs = drawingPoints.map(p => p.x);
    const ys = drawingPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;

    // Noktaları sol üst köşeye göre ayarla
    const relativePoints = drawingPoints.map(p => ({ x: p.x - minX, y: p.y - minY }));

    const newElement: FloorPlanElement = {
      id: Date.now().toString(),
      type: selectedTool as 'polygon' | 'polyline',
      x: minX,
      y: minY,
      width: width,
      height: height,
      rotation: 0,
      points: relativePoints,
      text: '',
      fontSize: 14
    };

    if (currentPlan) {
      updateElements([...currentPlan.elements, newElement]);
      setSelectedElementId(newElement.id);
    }

    setIsDrawing(false);
    setDrawingPoints([]);
    setSelectedTool('select');
  };


  const addElement = (type: FloorPlanElement['type']) => {
    if (!currentPlan) return;

    // Polygon ve Polyline için bu fonksiyonu kullanmayıp (handleMouseDown) çizim moduna geçiyoruz
    if (type === 'polygon' || type === 'polyline') {
      setSelectedTool(type);
      return;
    }

    const base: FloorPlanElement = {
      id: Date.now().toString(),
      type,
      x: 120,
      y: 120,
      width: 100,
      height: 100,
      rotation: 0,
      text: '',
      fontSize: 14
    };

    if (type === 'wall') {
      base.width = 200;
      base.height = 10;
    }

    if (type === 'door' || type === 'window') {
      base.width = 40;
      base.height = 40; // Kapı için kare çerçeve, içinde yay olacak
    }

    if (type === 'text') {
      base.width = 100;
      base.height = 20;
      base.text = 'Metin';
    }

    if (type === 'room') {
      base.text = 'Oda';
    }

    if (type === 'circle') {
      base.width = 100;
      base.height = 100;
      base.text = 'Silo';
    }

    updateElements([...currentPlan.elements, base]);
    setSelectedElementId(base.id);
    setSelectedTool('select');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('equipmentId');
    if (!id || !svgRef.current || !currentPlan) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    updatePositions({
      ...currentPlan.equipment_positions,
      [id]: { x: Math.round(x), y: Math.round(y) }
    });
  };

  const handleSave = async () => {
    if (!branchId || !currentPlan) return;

    try {
      const payload = {
        branch_id: branchId,
        title: currentPlan.title,
        background_url: currentPlan.background_url,
        elements: currentPlan.elements,
        equipment_positions: currentPlan.equipment_positions,
        updated_at: new Date().toISOString()
      };

      if (currentPlan.id.startsWith('temp-')) {
        const { data, error } = await supabase.from('branch_floor_plans').insert(payload).select().single();
        if (error) throw error;

        // ID güncelleme hatası: Mevcut plan listesindeki temp ID'yi yenisiyle değiştir
        setPlans(prev => prev.map(p => p.id === currentPlanId ? { ...p, id: data.id } : p));
        // Mevcut plan ID'yi de güncelle, böylece sonraki kaydetmeler update olur
        setCurrentPlanId(data.id);

        toast.success('Yeni kat kaydedildi');
      } else {
        const { error } = await supabase.from('branch_floor_plans').update(payload).eq('id', currentPlan.id);
        if (error) throw error;
        toast.success('Kroki güncellendi');
      }

    } catch (e: any) {
      toast.error('Hata: ' + e.message);
    }
  };

  const handleAddNewPlan = async () => {
    const t = prompt('Yeni kat adı:');
    if (!t) return;

    const newP: FloorPlan = {
      id: 'temp-' + Date.now(),
      title: t,
      background_url: '',
      elements: [],
      equipment_positions: {}
    };

    setPlans([...plans, newP]);
    setCurrentPlanId(newP.id);
  };

  const handleDeleteSelected = () => {
    if (!selectedElementId || !currentPlan) return;
    updateElements(currentPlan.elements.filter(el => el.id !== selectedElementId));
    setSelectedElementId(null);
  };

  const handleRemoveEquipment = (id: string) => {
    if (!currentPlan) return;

    const copy = { ...currentPlan.equipment_positions };
    delete copy[id];

    updatePositions(copy);
  };

  const selectedElement = currentPlan?.elements.find(el => el.id === selectedElementId);

  if (loading) return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-100"
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >

      {/* ---------------------------------- Toolbar ---------------------------------- */}
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm z-20">

        {/* Sol */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border">
            <select
              value={currentPlanId || ''}
              onChange={(e) => setCurrentPlanId(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold focus:ring-0 cursor-pointer py-1 pl-2 pr-8"
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            <button onClick={handleAddNewPlan} className="p-1 hover:bg-white rounded text-blue-600 border-l border-gray-300">
              <Plus size={16} />
            </button>
          </div>

          <div className="h-8 w-px bg-gray-200 mx-2"></div>

          {/* Araçlar */}
          <div className="flex bg-gray-100 p-1 rounded-lg gap-1 border">
            <button onClick={() => setSelectedTool('select')}
              title="Seç / Taşı"
              className={`p-2 rounded ${selectedTool === 'select' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}>
              <MousePointer size={18} />
            </button>

            <div className="w-px bg-gray-300 mx-1"></div>

            <button onClick={() => addElement('wall')} title="Duvar" className="p-2 rounded hover:bg-white hover:shadow text-gray-600">
              <div className="w-4 h-1 bg-current"></div>
            </button>

            <button onClick={() => addElement('room')} title="Oda (Kare)" className="p-2 rounded hover:bg-white hover:shadow text-gray-600">
              <Square size={18} />
            </button>

            <button onClick={() => addElement('circle')} title="Silo / Yuvarlak (Daire)" className="p-2 rounded hover:bg-white hover:shadow text-gray-600">
              <CircleIcon size={18} />
            </button>

            <button onClick={() => addElement('polygon')}
              title="Çokgen (Karmaşık Şekil)"
              className={`p-2 rounded ${selectedTool === 'polygon' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-white hover:shadow'}`}>
              <Pentagon size={18} />
            </button>

            <button onClick={() => addElement('polyline')}
              title="Çizgi (Serbest Hat)"
              className={`p-2 rounded ${selectedTool === 'polyline' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-white hover:shadow'}`}>
              <Activity size={18} />
            </button>

            <div className="w-px bg-gray-300 mx-1"></div>

            <button onClick={() => addElement('door')} title="Kapı" className="p-2 rounded hover:bg-white hover:shadow text-gray-600">
              <DoorOpen size={18} />
            </button>

            <button onClick={() => addElement('window')} title="Pencere" className="p-2 rounded hover:bg-white hover:shadow text-gray-600">
              <LayoutTemplate size={18} />
            </button>

            <button onClick={() => addElement('text')} title="Metin" className="p-2 rounded hover:bg-white hover:shadow text-gray-600">
              <Type size={18} />
            </button>
          </div>

          <div className="h-8 w-px bg-gray-200 mx-2"></div>

          {/* Arkaplan */}
          <div className="flex items-center">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleBackgroundUpload} />

            <button onClick={() => fileInputRef.current?.click()}
              disabled={uploadingBg}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border">

              {uploadingBg ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              {currentPlan?.background_url ? 'Planı Değiştir' : 'Plan Yükle'}
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 ml-2 bg-gray-100 rounded-lg p-1 border">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-white rounded">
              <ZoomOut size={14} />
            </button>

            <span className="text-xs w-10 text-center font-mono">{Math.round(scale * 100)}%</span>

            <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1.5 hover:bg-white rounded">
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        {/* Sağ */}
        <button onClick={handleSave}
          className="bg-blue-600 text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-blue-700 shadow-sm font-medium">
          <Save size={18} /> Kaydet
        </button>
      </div>

      {/* ---------------------------------- İçerik ---------------------------------- */}
      <div className="flex flex-1 overflow-hidden">


        {/* -------------------------------------------------------------------------- */}
        {/* Sol Sidebar - Ekipmanlar */}
        {/* -------------------------------------------------------------------------- */}

        <div className="w-72 bg-white border-r overflow-y-auto flex flex-col z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Layers size={18} className="text-blue-600" /> Ekipman Listesi
            </h3>
            <p className="text-xs text-gray-500 mt-1">Sürükleyip haritaya bırakın.</p>
          </div>

          <div className="flex-1 p-3 space-y-2 overflow-y-auto bg-gray-50/50">

            {equipments.map(eq => {
              const placedHere = !!currentPlan?.equipment_positions[eq.id];
              const placedOther = plans.some(p => p.id !== currentPlanId && p.equipment_positions[eq.id]);

              return (
                <div key={eq.id}
                  draggable={!placedHere}
                  onDragStart={(e) => e.dataTransfer.setData('equipmentId', eq.id)}
                  className={`p-3 rounded-lg border text-sm flex justify-between items-center ${placedHere
                      ? 'bg-green-50 border-green-200 opacity-70 cursor-default'
                      : placedOther
                        ? 'bg-yellow-50 border-yellow-200 cursor-grab hover:shadow-md'
                        : 'bg-white border-gray-200 cursor-grab hover:border-blue-400 hover:shadow-md'
                    }`}>

                  <div>
                    <div className="font-bold text-gray-800">{eq.equipment_code}</div>
                    <div className="text-[10px] text-gray-500 truncate w-36">{eq.equipment.name}</div>

                    {placedOther && !placedHere && (
                      <div className="text-[9px] text-yellow-600 font-medium mt-0.5 flex items-center gap-1">
                        <MapPin size={8} /> Başka katta
                      </div>
                    )}
                  </div>

                  {placedHere ? (
                    <button onClick={() => handleRemoveEquipment(eq.id)}
                      className="text-red-500 hover:bg-red-100 p-1.5 rounded">
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <Move size={14} className="text-gray-400" />
                  )}
                </div>
              );
            })}

            {equipments.length === 0 && (
              <div className="text-center p-4 text-gray-400 text-sm">Ekipman yok.</div>
            )}

          </div>
        </div>


        {/* -------------------------------------------------------------------------- */}
        {/* Orta Alan - SVG + Arkaplan */}
        {/* -------------------------------------------------------------------------- */}

        <div className="flex-1 bg-gray-200 overflow-auto relative flex justify-center items-start p-10 cursor-crosshair">

          <div
            className="bg-white shadow-2xl relative transition-transform"
            style={{
              width: 1000,
              height: 800,
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              marginTop: '20px',
              cursor: isDrawing ? 'crosshair' : 'default'
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onMouseDown={(e) => handleMouseDown(e)}
            onDoubleClick={handleDoubleClick}
          >

            {/* ------------------------------- Header -------------------------------- */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-white/95 border-b px-6 flex justify-between items-center z-20 pointer-events-none backdrop-blur-sm">

              <div className="flex items-center gap-4">
                {companySettings?.logo_url ? (
                  <img src={companySettings.logo_url} className="h-16 object-contain" />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 rounded">LOGO</div>
                )}

                <div>
                  <h1 className="text-xl font-bold uppercase">{companySettings?.company_name || 'İlaçlamatik'}</h1>
                  <h2 className="text-sm text-gray-600 font-medium">
                    {branchInfo?.customer.kisa_isim} - {branchInfo?.sube_adi}
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800 uppercase tracking-wide border-b-2 border-blue-600 pb-1">
                  {currentPlan?.title || 'KAT PLANI'}
                </div>
              </div>
            </div>


            {/* ----------------------------- Çizim Alanı ----------------------------- */}
            <div className="absolute top-24 bottom-16 left-0 right-0 bg-gray-50 overflow-hidden">

              {currentPlan?.background_url && (
                <img src={currentPlan.background_url}
                  className="absolute top-0 left-0 w-full h-full object-contain opacity-90 pointer-events-none select-none" />
              )}

              <svg ref={svgRef} width="100%" height="100%" className="absolute top-0 left-0">

                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                  </pattern>
                </defs>

                {!currentPlan?.background_url && (
                  <rect width="100%" height="100%" fill="url(#grid)" />
                )}

                {/* --- Çizim Önizlemesi --- */}
                {isDrawing && drawingPoints.length > 0 && (
                  <g pointerEvents="none">
                    <polyline
                      points={[...drawingPoints, currentMousePos].map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                    {drawingPoints.map((p, idx) => (
                      <circle key={idx} cx={p.x} cy={p.y} r={3} fill="#3b82f6" />
                    ))}
                  </g>
                )}

                {/* -------------------------- Elemanlar -------------------------- */}
                {currentPlan?.elements.map((el) => (
                  <g key={el.id}
                    transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0}, ${el.width / 2}, ${el.height / 2})`}
                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                    style={{ cursor: 'move' }}
                  >

                    {/* WALL - Çift Çizgi */}
                    {el.type === 'wall' && (
                      <g>
                        <rect width={normalize(el.width)} height={normalize(el.height)} fill="#334155" />
                        <rect x={2} y={2} width={Math.max(0, normalize(el.width) - 4)} height={Math.max(0, normalize(el.height) - 4)} fill="#475569" />
                      </g>
                    )}

                    {/* ROOM */}
                    {el.type === 'room' && (
                      <>
                        <rect width={normalize(el.width)} height={normalize(el.height)}
                          fill="#f8fafc" fillOpacity={0.6}
                          stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
                        <text x={5} y={20} fontSize={el.fontSize} fontWeight="bold" fill="#475569">{el.text}</text>
                      </>
                    )}

                    {/* CIRCLE - SİLO */}
                    {el.type === 'circle' && (
                      <>
                        <ellipse
                          cx={normalize(el.width) / 2}
                          cy={normalize(el.height) / 2}
                          rx={normalize(el.width) / 2}
                          ry={normalize(el.height) / 2}
                          fill="#e2e8f0" stroke="#475569" strokeWidth="2"
                        />
                        <text
                          x={normalize(el.width) / 2}
                          y={normalize(el.height) / 2}
                          textAnchor="middle"
                          dy=".3em"
                          fontSize={el.fontSize} fontWeight="bold" fill="#475569">{el.text}</text>
                      </>
                    )}

                    {/* POLYGON */}
                    {el.type === 'polygon' && el.points && (
                      <polygon
                        points={el.points.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="#f8fafc" fillOpacity={0.6}
                        stroke="#94a3b8" strokeWidth="2"
                      />
                    )}

                    {/* POLYLINE */}
                    {el.type === 'polyline' && el.points && (
                      <polyline
                        points={el.points.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="#334155" strokeWidth="4"
                      />
                    )}

                    {/* DOOR - YAY VE ÇİZGİ */}
                    {el.type === 'door' && (
                      <g>
                        {/* Kapı Aralığı */}
                        <path
                          d={`M 0,${normalize(el.height)} L ${normalize(el.width)},${normalize(el.height)}`}
                          stroke="transparent" strokeWidth="1"
                        />
                        {/* Kapı Kanadı - Dikey Çizgi */}
                        <line
                          x1={0} y1={normalize(el.height)}
                          x2={0} y2={0}
                          stroke="#a16207" strokeWidth="3"
                        />
                        {/* Kapı Yayı - Çeyrek Daire */}
                        <path
                          d={`M 0,0 Q ${normalize(el.width)},0 ${normalize(el.width)},${normalize(el.height)}`}
                          fill="none" stroke="#a16207" strokeWidth="1" strokeDasharray="2,2"
                        />
                        {/* Kapı Çerçevesi (Alt) */}
                        <rect x={0} y={normalize(el.height) - 2} width={5} height={4} fill="#78350f" />
                        <rect x={normalize(el.width) - 5} y={normalize(el.height) - 2} width={5} height={4} fill="#78350f" />
                      </g>
                    )}

                    {/* WINDOW */}
                    {el.type === 'window' && (
                      <g>
                        <rect width={normalize(el.width)} height={normalize(el.height)} fill="#fff" stroke="#94a3b8" strokeWidth="1" />
                        <line x1={0} y1={normalize(el.height) / 2} x2={normalize(el.width)} y2={normalize(el.height) / 2} stroke="#3b82f6" strokeWidth="2" />
                      </g>
                    )}

                    {/* TEXT */}
                    {el.type === 'text' && (
                      <text x={0} y={el.fontSize} fontSize={el.fontSize} fontWeight="600">{el.text}</text>
                    )}

                    {/* Selection Handles */}
                    {selectedElementId === el.id && (
                      <>
                        {/* Bounding Box */}
                        <rect
                          x={-4} y={-4}
                          width={normalize(el.width) + 8}
                          height={normalize(el.height) + 8}
                          stroke="#2563eb"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray="4"
                        />

                        {/* Resize Handle */}
                        <circle cx={normalize(el.width)} cy={normalize(el.height)}
                          r={6} fill="#2563eb"
                          style={{ cursor: 'nwse-resize' }}
                          onMouseDown={(e) => handleMouseDown(e, el.id, 'resize')}
                        />

                        {/* Rotation Handle */}
                        <line x1={normalize(el.width) / 2} y1={-4} x2={normalize(el.width) / 2} y2={-20} stroke="#2563eb" />
                        <circle cx={normalize(el.width) / 2} cy={-20}
                          r={5} fill="#fff" stroke="#2563eb" strokeWidth={2}
                          style={{ cursor: 'grab' }}
                          onMouseDown={(e) => handleMouseDown(e, el.id, 'rotate')}
                        />
                      </>
                    )}

                  </g>
                ))}

                {/* ------------------------- Ekipmanlar ------------------------- */}
                {currentPlan && Object.entries(currentPlan.equipment_positions).map(([eqId, pos]) => {
                  const eqInfo = equipments.find(e => e.id === eqId);

                  return (
                    <g key={eqId}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onMouseDown={(e) => handleMouseDown(e, undefined, 'drag', eqId)}
                      style={{ cursor: 'grab' }}
                    >
                      <circle r="14" fill="#2563eb" stroke="white" strokeWidth="3" />
                      <text x="0" y="5" textAnchor="middle" fill="white"
                        fontSize="11" fontWeight="900">
                        {eqInfo?.equipment_code.slice(0, 2)}
                      </text>

                      <rect x="-20" y="20" width="40" height="16" rx="4"
                        fill="white" stroke="#e5e7eb" />
                      <text x="0" y="32" textAnchor="middle"
                        fontSize="9" fontWeight="bold">
                        {eqInfo?.equipment_code}
                      </text>
                    </g>
                  );
                })}

              </svg>
            </div>

            {/* ------------------------------ Footer ------------------------------ */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t flex justify-between items-center px-8 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-blue-600" />
                {companySettings?.address}
              </div>

              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><Phone size={12} /> {companySettings?.phone}</span>
                <span className="flex items-center gap-1"><Mail size={12} /> {companySettings?.email}</span>
                <span className="flex items-center gap-1"><Globe size={12} /> {companySettings?.website}</span>
              </div>
            </div>

          </div>
        </div>


        {/* -------------------------------------------------------------------------- */}
        {/* Sağ Sidebar - Özellikler */}
        {/* -------------------------------------------------------------------------- */}

        {selectedElement && (
          <div className="w-72 bg-white border-l p-5 shadow-xl z-20">
            <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b flex items-center gap-2">
              <Edit3 size={16} /> Özellikler
            </h3>

            <div className="space-y-4">

              {(selectedElement.type === 'text' || selectedElement.type === 'room' || selectedElement.type === 'circle') && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Metin / Etiket</label>
                  <input
                    type="text"
                    value={selectedElement.text}
                    onChange={(e) =>
                      updateElements(currentPlan!.elements.map(el =>
                        el.id === selectedElementId ? { ...el, text: e.target.value } : el
                      ))
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
              )}

              {(selectedElement.type === 'text' || selectedElement.type === 'room' || selectedElement.type === 'circle') && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Yazı Boyutu</label>
                  <input
                    type="number"
                    value={selectedElement.fontSize}
                    onChange={(e) =>
                      updateElements(currentPlan!.elements.map(el =>
                        el.id === selectedElementId ? { ...el, fontSize: Number(e.target.value) } : el
                      ))
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Açı (Derece)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="0" max="360"
                    value={selectedElement.rotation || 0}
                    onChange={(e) => updateElements(currentPlan!.elements.map(el => el.id === selectedElementId ? { ...el, rotation: Number(e.target.value) } : el))}
                    className="flex-1"
                  />
                  <span className="text-xs w-8">{Math.round(selectedElement.rotation || 0)}°</span>
                </div>
              </div>

              <div className="pt-4 border-t mt-4">
                <button
                  onClick={handleDeleteSelected}
                  className="w-full bg-red-50 text-red-600 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-100 border border-red-200"
                >
                  <Trash2 size={16} /> Elemanı Sil
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
