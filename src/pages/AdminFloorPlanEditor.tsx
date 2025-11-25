import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { 
  Save, Square, MousePointer, Move, Trash2, ArrowLeft, 
  Maximize2, ZoomIn, ZoomOut, Type, DoorOpen, LayoutTemplate, 
  Plus, Layers, Upload, Image as ImageIcon, MapPin, Phone, Mail, Globe, Loader2
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
  text?: string;
  fontSize?: number;
  rotation: number;
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

  // Veriler
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [branchInfo, setBranchInfo] = useState<{ sube_adi: string; customer: { kisa_isim: string } } | null>(null);
  
  // Editör Durumu
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<'select' | 'wall' | 'room' | 'door' | 'window' | 'text'>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [uploadingBg, setUploadingBg] = useState(false);

  // Sürükleme/Boyutlandırma
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [elementStartPos, setElementStartPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [draggedEquipmentId, setDraggedEquipmentId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Aktif Plan
  const currentPlan = plans.find(p => p.id === currentPlanId);

  useEffect(() => {
    if (branchId) {
      fetchData();
      fetchCompanySettings();
    }
  }, [branchId]);

  // Klavye kısayolları
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        if (document.activeElement?.tagName !== 'INPUT') {
            handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId]);

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
      // Şube Bilgisi
      const { data: branchData } = await supabase
        .from('branches')
        .select('sube_adi, customer:customer_id(kisa_isim)')
        .eq('id', branchId)
        .single();
      if (branchData) setBranchInfo(branchData);

      // Ekipmanlar
      const { data: eqData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, equipment:equipment_id(name, type)')
        .eq('branch_id', branchId);
      setEquipments(eqData || []);

      // Krokiler
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

  // --- ARKAPLAN RESMİ YÜKLEME ---
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentPlan) return;

    // Dosya tipi kontrolü
    if (!file.type.startsWith('image/')) {
        toast.error('Lütfen geçerli bir resim dosyası (JPEG, PNG) seçin.');
        return;
    }

    setUploadingBg(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `floor-plans/${branchId}/${currentPlan.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
      
      // State güncelleme
      updateCurrentPlan({ background_url: urlData.publicUrl });
      toast.success('Plan resmi yüklendi');
    } catch (error: any) {
      console.error('Upload Error:', error);
      toast.error('Yükleme hatası: ' + error.message);
    } finally {
      setUploadingBg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
          background_url: currentPlan.background_url,
          elements: currentPlan.elements,
          equipment_positions: currentPlan.equipment_positions,
          updated_at: new Date().toISOString()
      };

      if (currentPlan.id.startsWith('temp-')) {
          const { data, error } = await supabase.from('branch_floor_plans').insert(planToSave).select().single();
          if (error) throw error;
          setPlans(prev => prev.map(p => p.id === currentPlanId ? { ...p, id: data.id } : p));
          setCurrentPlanId(data.id);
      } else {
          const { error } = await supabase.from('branch_floor_plans').update(planToSave).eq('id', currentPlan.id);
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
          background_url: '',
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
      
      {/* --- Toolbar --- */}
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={20}/></button>
          
          {/* Kat Seçimi */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg border">
              <select 
                value={currentPlanId || ''} 
                onChange={(e) => setCurrentPlanId(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold focus:ring-0 cursor-pointer py-1 pl-2 pr-8"
              >
                  {plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <button onClick={handleAddNewPlan} className="p-1 hover:bg-white rounded text-blue-600 border-l border-gray-300" title="Yeni Kat Ekle"><Plus size={16}/></button>
          </div>

          <div className="h-8 w-px bg-gray-200 mx-2"></div>
          
          {/* Araçlar */}
          <div className="flex bg-gray-100 p-1 rounded-lg gap-1 border">
            <button onClick={() => setSelectedTool('select')} className={`p-2 rounded ${selectedTool === 'select' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`} title="Seç / Taşı"><MousePointer size={18} /></button>
            <div className="w-px bg-gray-300 mx-1"></div>
            <button onClick={() => addElement('wall')} className="p-2 rounded hover:bg-white hover:shadow text-gray-600" title="Duvar Ekle"><div className="w-4 h-1 bg-current"></div></button>
            <button onClick={() => addElement('room')} className="p-2 rounded hover:bg-white hover:shadow text-gray-600" title="Oda/Alan Ekle"><Square size={18} /></button>
            <button onClick={() => addElement('door')} className="p-2 rounded hover:bg-white hover:shadow text-gray-600" title="Kapı Ekle"><DoorOpen size={18} /></button>
            <button onClick={() => addElement('window')} className="p-2 rounded hover:bg-white hover:shadow text-gray-600" title="Pencere Ekle"><LayoutTemplate size={18} /></button>
            <button onClick={() => addElement('text')} className="p-2 rounded hover:bg-white hover:shadow text-gray-600" title="Metin Ekle"><Type size={18} /></button>
          </div>

          <div className="h-8 w-px bg-gray-200 mx-2"></div>

          {/* Arkaplan Yükleme */}
          <div className="flex items-center">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleBackgroundUpload} />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={uploadingBg}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border"
            >
              {uploadingBg ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              {currentPlan?.background_url ? 'Planı Değiştir' : 'Plan Yükle (JPEG)'}
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 ml-2 bg-gray-100 rounded-lg p-1 border">
             <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 hover:bg-white rounded"><ZoomOut size={14}/></button>
             <span className="text-xs w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
             <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1.5 hover:bg-white rounded"><ZoomIn size={14}/></button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-blue-700 shadow-sm font-medium">
            <Save size={18} /> Kaydet
          </button>
        </div>
      </div>

      {/* --- Ana İçerik --- */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sol Sidebar - Ekipmanlar */}
        <div className="w-72 bg-white border-r overflow-y-auto flex flex-col z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
               <Layers size={18} className="text-blue-600"/> Ekipman Listesi
            </h3>
            <p className="text-xs text-gray-500 mt-1">Ekipmanları haritaya sürükleyip bırakın.</p>
          </div>
          <div className="flex-1 p-3 space-y-2 overflow-y-auto bg-gray-50/50">
            {equipments.map(eq => {
              const isPlacedThisPlan = !!currentPlan?.equipment_positions[eq.id];
              const isPlacedOther = plans.some(p => p.id !== currentPlanId && p.equipment_positions[eq.id]);

              return (
                <div 
                  key={eq.id}
                  draggable={!isPlacedThisPlan}
                  onDragStart={(e) => e.dataTransfer.setData('equipmentId', eq.id)}
                  className={`p-3 rounded-lg border text-sm flex justify-between items-center transition-all shadow-sm ${
                    isPlacedThisPlan 
                      ? 'bg-green-50 border-green-200 opacity-70 cursor-default' 
                      : isPlacedOther 
                      ? 'bg-yellow-50 border-yellow-200 cursor-grab hover:shadow-md'
                      : 'bg-white border-gray-200 cursor-grab hover:border-blue-400 hover:shadow-md active:cursor-grabbing'
                  }`}
                >
                  <div>
                    <div className="font-bold text-gray-800">{eq.equipment_code}</div>
                    <div className="text-[10px] text-gray-500 truncate w-36" title={eq.equipment.name}>{eq.equipment.name}</div>
                    {isPlacedOther && !isPlacedThisPlan && <div className="text-[9px] text-yellow-600 font-medium mt-0.5 flex items-center gap-1"><MapPin size={8}/> Başka katta</div>}
                  </div>
                  {isPlacedThisPlan ? (
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
            {equipments.length === 0 && <div className="text-center p-4 text-gray-400 text-sm">Ekipman bulunamadı.</div>}
          </div>
        </div>

        {/* Canvas Alanı (Kroki Kağıdı) */}
        <div className="flex-1 bg-gray-200 overflow-auto relative flex justify-center items-start p-10" onMouseDown={() => setSelectedElementId(null)}>
          
          {/* Kroki Kağıdı (Wrapper) */}
          <div 
            className="bg-white shadow-2xl relative transition-transform origin-top-center"
            style={{ 
              width: 1000, 
              height: 800, 
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              marginTop: '20px',
              position: 'relative' // Düzeltme: Pozisyonlama
            }}
            onDragOver={handleDrop} 
            onDrop={handleDrop}
          >
            
            {/* Header (Logo ve Başlık) */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-white/95 border-b px-6 flex justify-between items-center z-20 pointer-events-none backdrop-blur-sm">
               <div className="flex items-center gap-4">
                  {companySettings?.logo_url ? (
                     <img src={companySettings.logo_url} alt="Logo" className="h-16 object-contain" />
                  ) : (
                     <div className="w-16 h-16 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 rounded">LOGO</div>
                  )}
                  <div>
                     <h1 className="text-xl font-bold text-gray-900 uppercase">{companySettings?.company_name || 'İlaçlamatik'}</h1>
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

            {/* Çizim Alanı (HTML IMG + SVG) */}
            <div className="absolute top-24 bottom-16 left-0 right-0 bg-gray-50 overflow-hidden">
              
              {/* Katman 1: Arkaplan Resmi (HTML IMG) - Düzeltilmiş! */}
              {/* SVG yerine div arkasına koyduk, böylece çökme yapmaz */}
              {currentPlan?.background_url && (
                <img 
                  src={currentPlan.background_url}
                  alt="Kat Planı"
                  className="absolute top-0 left-0 w-full h-full object-contain opacity-90 pointer-events-none select-none"
                  crossOrigin="anonymous"
                />
              )}

              {/* Katman 2: SVG Çizim */}
              <svg 
                ref={svgRef}
                width="100%" 
                height="100%" 
                className="absolute top-0 left-0 w-full h-full z-10"
                style={{ cursor: selectedTool === 'select' ? 'default' : 'crosshair' }}
              >
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                  </pattern>
                </defs>
                
                {/* Izgara (Resim yoksa göster) */}
                {!currentPlan?.background_url && <rect width="100%" height="100%" fill="url(#grid)" pointerEvents="none" />}

                {/* Çizim Elemanları */}
                {currentPlan?.elements.map((el) => (
                  <g 
                    key={el.id}
                    transform={`translate(${el.x}, ${el.y})`}
                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                    style={{ cursor: 'move' }}
                  >
                    {/* DUVAR */}
                    {el.type === 'wall' && <rect width={el.width} height={el.height} fill="#334155" rx={0} className="shadow-sm" />}
                    
                    {/* ODA */}
                    {el.type === 'room' && (
                      <>
                        <rect width={el.width} height={el.height} fill="#f8fafc" fillOpacity={0.6} stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
                        <text x={5} y={20} fontSize={el.fontSize || 14} fill="#475569" fontWeight="bold" pointerEvents="none">{el.text || 'Oda'}</text>
                      </>
                    )}

                    {/* KAPI */}
                    {el.type === 'door' && (
                       <g>
                         <rect width={el.width} height={el.height} fill="#a16207" rx={2} />
                         <path d={`M 0 ${el.height} Q ${el.width} ${el.height} ${el.width} 0`} fill="none" stroke="#a16207" strokeDasharray="3,3" strokeWidth="1" />
                       </g>
                    )}

                    {/* PENCERE */}
                    {el.type === 'window' && <rect width={el.width} height={el.height} fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="2" />}

                    {/* METİN */}
                    {el.type === 'text' && (
                       <text x={0} y={el.fontSize || 14} fontSize={el.fontSize || 14} fill="#1f2937" fontWeight="600" style={{ userSelect: 'none' }}>{el.text || 'Metin'}</text>
                    )}
                    
                    {/* Seçim Çerçevesi */}
                    {selectedElementId === el.id && (
                      <>
                          <rect x="-4" y="-4" width={el.width + 8} height={el.height + 8} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="4" />
                          <circle cx={el.width} cy={el.height} r={6} fill="#2563eb" style={{ cursor: 'nwse-resize' }} onMouseDown={(e) => handleMouseDown(e, el.id, true)} />
                      </>
                    )}
                  </g>
                ))}

                {/* Ekipmanlar */}
                {currentPlan && Object.entries(currentPlan.equipment_positions).map(([eqId, pos]) => {
                  const eqInfo = equipments.find(e => e.id === eqId);
                  return (
                    <g key={eqId} transform={`translate(${pos.x}, ${pos.y})`} onMouseDown={(e) => handleMouseDown(e, undefined, false, eqId)} style={{ cursor: 'grab' }}>
                      <circle r="14" fill="#2563eb" stroke="white" strokeWidth="3" className="drop-shadow-md" />
                      <text y="5" x="0" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" pointerEvents="none" style={{ fontFamily: 'monospace' }}>
                        {eqInfo?.equipment_code.slice(0, 2)}
                      </text>
                      {/* Alt Kod Etiketi */}
                      <rect x="-20" y="20" width="40" height="16" rx="4" fill="white" stroke="#e5e7eb" />
                      <text y="32" x="0" textAnchor="middle" fill="#1f2937" fontSize="9" fontWeight="bold" className="select-none" pointerEvents="none">
                        {eqInfo?.equipment_code}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Footer (İletişim Bilgileri) */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t flex justify-between items-center px-8 text-xs text-gray-500 pointer-events-none z-20">
               <div className="flex items-center gap-1">
                 <MapPin size={12} className="text-blue-600"/> {companySettings?.address || 'Adres Bilgisi'}
               </div>
               <div className="flex items-center gap-4">
                 <span className="flex items-center gap-1"><Phone size={12} className="text-blue-600"/> {companySettings?.phone}</span>
                 <span className="flex items-center gap-1"><Mail size={12} className="text-blue-600"/> {companySettings?.email}</span>
                 <span className="flex items-center gap-1"><Globe size={12} className="text-blue-600"/> {companySettings?.website}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Sağ Sidebar - Özellikler */}
        {selectedElement && (
            <div className="w-72 bg-white border-l p-5 shadow-xl z-20">
                <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b flex items-center gap-2">
                   <Edit3 size={16} /> Özellikler
                </h3>
                
                <div className="space-y-4">
                    {(selectedElement.type === 'text' || selectedElement.type === 'room') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Etiket / Metin</label>
                            <input 
                                type="text" 
                                value={selectedElement.text || ''} 
                                onChange={(e) => updateElements(currentPlan!.elements.map(el => el.id === selectedElementId ? { ...el, text: e.target.value } : el))}
                                className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                     
                    {(selectedElement.type === 'text' || selectedElement.type === 'room') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Yazı Boyutu</label>
                            <input 
                                type="number" 
                                value={selectedElement.fontSize || 14} 
                                onChange={(e) => updateElements(currentPlan!.elements.map(el => el.id === selectedElementId ? { ...el, fontSize: Number(e.target.value) } : el))}
                                className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}

                    <div className="pt-4 border-t mt-4">
                        <button 
                           onClick={handleDeleteSelected}
                           className="w-full bg-red-50 text-red-600 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-100 transition-colors font-medium text-sm border border-red-200"
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