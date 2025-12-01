import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Save, Plus, Upload, Trash2, Layers, Move, Type, 
  Square, DoorOpen, Layout, Box, ZoomIn, ZoomOut, RefreshCw, X, Image as ImageIcon, MapPin, Phone, Mail, Globe, Loader2, Edit3, ArrowLeft, MousePointer, LayoutTemplate
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

// --- TİPLER ---
interface FloorLayer {
  id: string;
  name: string;
  elements: any[];
  background?: string;
  width?: number; // Resmin orijinal genişliği
  height?: number; // Resmin orijinal yüksekliği
}

interface Equipment {
  id: string;
  equipment_code: string;
  equipment: { name: string; type: string };
  status?: string;
}

interface FloorPlanElement {
  id: string;
  type: 'wall' | 'room' | 'door' | 'window' | 'text' | 'equipment';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  rotation: number;
  equipmentId?: string;
  equipmentCode?: string;
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
  const urlBranchId = searchParams.get('branch_id'); // URL'den branch_id al (Varsa)
  const navigate = useNavigate();

  // --- STATE ---
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(urlBranchId || '');
  const [branchInfo, setBranchInfo] = useState<{ sube_adi: string; customer: { kisa_isim: string } } | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const [floors, setFloors] = useState<FloorLayer[]>([]);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [availableEquipments, setAvailableEquipments] = useState<Equipment[]>([]);
  
  // Çizim & Araçlar
  const [selectedTool, setSelectedTool] = useState<'select' | 'wall' | 'room' | 'door' | 'window' | 'text' | 'equipment'>('select');
  const [selectedEquipmentToPlace, setSelectedEquipmentToPlace] = useState<string | null>(null);
  
  // Pan & Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  
  // Eleman Düzenleme
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [isResizingElement, setIsResizingElement] = useState(false);
  const [elementStartPos, setElementStartPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [mouseStartPos, setMouseStartPos] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Yükleme Durumu
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Aktif Katın Verisi
  const activeFloor = floors[activeFloorIndex];

  // --- VERİ ÇEKME ---
  useEffect(() => {
    fetchCustomers();
    fetchCompanySettings();
  }, []);

  // URL'den branch_id gelirse otomatik yükle
  useEffect(() => {
    if (urlBranchId) {
      // Önce şubenin müşteri bilgisini bulup set etmeliyiz ki dropdownlar doğru çalışsın
      const fetchBranchDetails = async () => {
        const { data } = await supabase.from('branches').select('customer_id').eq('id', urlBranchId).single();
        if (data) {
            setSelectedCustomer(data.customer_id);
            handleCustomerChange({ target: { value: data.customer_id } } as any, urlBranchId);
        }
      };
      fetchBranchDetails();
    }
  }, [urlBranchId]);

  useEffect(() => {
    if (selectedBranch) {
      loadFloorPlanData();
      fetchBranchEquipments();
      fetchBranchInfo();
    } else {
      setFloors([]);
      setAvailableEquipments([]);
      setBranchInfo(null);
    }
  }, [selectedBranch]);

  const fetchCompanySettings = async () => {
    const { data } = await supabase.from('company_settings').select('*').single();
    if (data) setCompanySettings(data);
  };

  const fetchBranchInfo = async () => {
    const { data } = await supabase
      .from('branches')
      .select('sube_adi, customer:customer_id(kisa_isim)')
      .eq('id', selectedBranch)
      .single();
    if (data) setBranchInfo(data);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, kisa_isim').order('kisa_isim');
    setCustomers(data || []);
  };

  const handleCustomerChange = async (e: React.ChangeEvent<HTMLSelectElement>, preselectedBranchId?: string) => {
    const custId = e.target.value;
    setSelectedCustomer(custId);
    if (!preselectedBranchId) setSelectedBranch(''); // Eğer önceden seçili şube yoksa sıfırla
    
    if (custId) {
      const { data } = await supabase.from('branches').select('id, sube_adi').eq('customer_id', custId);
      setBranches(data || []);
      if (preselectedBranchId) setSelectedBranch(preselectedBranchId);
    } else {
      setBranches([]);
    }
  };

  const fetchBranchEquipments = async () => {
    const { data } = await supabase
      .from('branch_equipment')
      .select('id, equipment_code, equipment:equipment_id(name, type)')
      .eq('branch_id', selectedBranch);
    setAvailableEquipments(data || []);
  };

  const loadFloorPlanData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('branch_floor_plans')
      .select('*')
      .eq('branch_id', selectedBranch)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const mainPlan = data[0];
      if (mainPlan.floors && mainPlan.floors.length > 0) {
        setFloors(mainPlan.floors);
      } else {
        setFloors([{
          id: 'default',
          name: 'Zemin Kat',
          elements: mainPlan.elements || [],
          background: mainPlan.background_url,
          width: mainPlan.width || 1000,
          height: mainPlan.height || 800
        }]);
      }
    } else {
      setFloors([{
        id: crypto.randomUUID(),
        name: 'Zemin Kat',
        elements: [],
        width: 1000,
        height: 800
      }]);
    }
    setLoading(false);
  };

  // --- İŞLEMLER ---

  const addFloor = () => {
    const name = prompt('Kat Adı:', `${floors.length + 1}. Kat`);
    if (!name) return;
    setFloors([...floors, {
      id: crypto.randomUUID(),
      name,
      elements: [],
      width: 1000,
      height: 800
    }]);
    setActiveFloorIndex(floors.length);
  };

  const removeFloor = (index: number) => {
    if (floors.length <= 1) return alert("En az bir kat olmalıdır.");
    if (!confirm("Bu katı ve üzerindeki her şeyi silmek istediğinize emin misiniz?")) return;
    const newFloors = floors.filter((_, i) => i !== index);
    setFloors(newFloors);
    setActiveFloorIndex(0);
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `floor-plans/${selectedBranch}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Resmin DOĞAL BOYUTLARINI Al ve Kat Verisine Kaydet
      const img = new Image();
      img.src = publicUrl;
      img.onload = () => {
        const newFloors = [...floors];
        newFloors[activeFloorIndex] = {
          ...newFloors[activeFloorIndex],
          background: publicUrl,
          width: img.naturalWidth,   // Resmin gerçek genişliği
          height: img.naturalHeight  // Resmin gerçek yüksekliği
        };
        setFloors(newFloors);
        setUploading(false);
        toast.success("Kroki resmi yüklendi ve boyutlar ayarlandı.");
      };

    } catch (err: any) {
      toast.error("Yükleme hatası: " + err.message);
      setUploading(false);
    } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- KOORDİNAT HESAPLAMA (KRİTİK BÖLÜM) ---
  const getSVGCoordinates = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  };

  // --- FARE OLAYLARI (MOUSE EVENTS) ---
  
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDraggingCanvas || isDraggingElement || isResizingElement) return;
    if (selectedTool === 'select') {
        // Boş yere tıklayınca seçimi kaldır
        setSelectedElementId(null);
        return;
    }

    const { x, y } = getSVGCoordinates(e.clientX, e.clientY);

    const newElement: FloorPlanElement = {
      id: crypto.randomUUID(),
      type: selectedTool,
      x, 
      y,
      width: selectedTool === 'wall' ? 200 : selectedTool === 'door' || selectedTool === 'window' ? 40 : 50,
      height: selectedTool === 'wall' ? 10 : selectedTool === 'door' || selectedTool === 'window' ? 10 : 50,
      rotation: 0,
      text: selectedTool === 'text' ? 'Metin' : selectedTool === 'room' ? 'Oda' : '',
      ...(selectedTool === 'equipment' && selectedEquipmentToPlace ? {
        equipmentId: selectedEquipmentToPlace,
        equipmentCode: availableEquipments.find(eq => eq.id === selectedEquipmentToPlace)?.equipment_code,
        width: 30,
        height: 30
      } : {})
    };

    const newFloors = [...floors];
    newFloors[activeFloorIndex].elements.push(newElement);
    setFloors(newFloors);

    if (selectedTool === 'equipment') {
      setSelectedEquipmentToPlace(null);
      setSelectedTool('select');
      toast.success("Ekipman yerleştirildi.");
    } else {
        setSelectedElementId(newElement.id);
        setSelectedTool('select');
    }
  };

  const handleMouseDown = (e: React.MouseEvent, elementId?: string, isResizeHandle = false) => {
    if (selectedTool !== 'select') return;
    
    if (elementId) {
        e.stopPropagation();
        setSelectedElementId(elementId);
        const el = activeFloor.elements.find(el => el.id === elementId);
        if (!el) return;

        setMouseStartPos({ x: e.clientX, y: e.clientY });
        setElementStartPos({ x: el.x, y: el.y, w: el.width, h: el.height });

        if (isResizeHandle) setIsResizingElement(true);
        else setIsDraggingElement(true);
    } else {
        // Canvas sürükleme başlat
        setIsDraggingCanvas(true);
        dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setTransform(prev => ({ ...prev, x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y }));
      return;
    }

    if ((isDraggingElement || isResizingElement) && selectedElementId) {
        // Mouse hareketini SVG koordinat sistemine değil, ölçeğe (scale) göre hesapla
        const dx = (e.clientX - mouseStartPos.x) / transform.scale;
        const dy = (e.clientY - mouseStartPos.y) / transform.scale;
        
        const newFloors = [...floors];
        const elIndex = newFloors[activeFloorIndex].elements.findIndex(el => el.id === selectedElementId);
        
        if (elIndex !== -1) {
            const el = newFloors[activeFloorIndex].elements[elIndex];
            
            if (isDraggingElement) {
                el.x = elementStartPos.x + dx;
                el.y = elementStartPos.y + dy;
            } else if (isResizingElement) {
                el.width = Math.max(10, elementStartPos.w + dx);
                el.height = Math.max(10, elementStartPos.h + dy);
            }
            setFloors(newFloors);
        }
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setIsDraggingElement(false);
    setIsResizingElement(false);
  };

  const handleElementContextMenu = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    if (confirm("Bu öğeyi silmek istiyor musunuz?")) {
      const newFloors = [...floors];
      newFloors[activeFloorIndex].elements = newFloors[activeFloorIndex].elements.filter(el => el.id !== elementId);
      setFloors(newFloors);
      if (selectedElementId === elementId) setSelectedElementId(null);
    }
  };

  const handleDeleteSelected = () => {
      if (!selectedElementId) return;
      const newFloors = [...floors];
      newFloors[activeFloorIndex].elements = newFloors[activeFloorIndex].elements.filter(el => el.id !== selectedElementId);
      setFloors(newFloors);
      setSelectedElementId(null);
  };

  const updateElementProperty = (key: keyof FloorPlanElement, value: any) => {
      if (!selectedElementId) return;
      const newFloors = [...floors];
      const elIndex = newFloors[activeFloorIndex].elements.findIndex(el => el.id === selectedElementId);
      if (elIndex !== -1) {
          newFloors[activeFloorIndex].elements[elIndex] = { ...newFloors[activeFloorIndex].elements[elIndex], [key]: value };
          setFloors(newFloors);
      }
  };

  const saveAll = async () => {
    setLoading(true);
    try {
      // Bu şube için kayıt var mı?
      const { data } = await supabase.from('branch_floor_plans').select('id').eq('branch_id', selectedBranch);
      
      const payload = {
        branch_id: selectedBranch,
        title: 'Genel Yerleşim',
        floors: floors, // Tüm kat verisi ve boyutları burada
        updated_at: new Date().toISOString()
      };

      let error;
      if (data && data.length > 0) {
        const { error: updateError } = await supabase.from('branch_floor_plans').update(payload).eq('branch_id', selectedBranch);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('branch_floor_plans').insert([payload]);
        error = insertError;
      }

      if (error) throw error;
      toast.success("Kroki ve ekipman yerleşimi kaydedildi.");
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedElement = activeFloor?.elements.find(el => el.id === selectedElementId);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-gray-100" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      {/* ÜST PANEL: Seçimler */}
      <div className="bg-white p-4 border-b flex flex-wrap gap-4 items-center justify-between shadow-sm z-20">
        <div className="flex gap-2 items-center">
           <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full mr-2"><ArrowLeft size={20}/></button>
          <select 
            className="border p-2 rounded bg-gray-50" 
            value={selectedCustomer} 
            onChange={(e) => handleCustomerChange(e)}
          >
            <option value="">Müşteri Seçiniz</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
          </select>
          <select 
            className="border p-2 rounded bg-gray-50" 
            value={selectedBranch} 
            onChange={(e) => setSelectedBranch(e.target.value)}
            disabled={!selectedCustomer}
          >
            <option value="">Şube Seçiniz</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
          </select>
        </div>

        {selectedBranch && (
          <div className="flex gap-2">
            <button onClick={saveAll} disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-green-700 font-medium shadow-sm">
              <Save size={18} /> {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        )}
      </div>

      {selectedBranch && activeFloor ? (
        <div className="flex flex-1 overflow-hidden">
          {/* SOL PANEL: Araçlar */}
          <div className="w-72 bg-white border-r flex flex-col shadow-[2px_0_5px_rgba(0,0,0,0.05)] z-10">
            
            {/* Katlar */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2"><Layers size={16}/> Katlar</h3>
                <button onClick={addFloor} className="p-1 hover:bg-white rounded text-blue-600" title="Yeni Kat"><Plus size={18}/></button>
              </div>
              <div className="space-y-1">
                {floors.map((floor, idx) => (
                  <div 
                    key={floor.id} 
                    className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${activeFloorIndex === idx ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-200 text-gray-600'}`}
                    onClick={() => { setActiveFloorIndex(idx); setSelectedElementId(null); }}
                  >
                    <span className="text-sm">{floor.name}</span>
                    {idx > 0 && <button onClick={(e) => { e.stopPropagation(); removeFloor(idx); }} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                  </div>
                ))}
              </div>
            </div>

            {/* Kroki Yükleme */}
            <div className="p-4 border-b">
              <label className="block text-sm font-bold text-gray-700 mb-2">Arkaplan Resmi</label>
              <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 p-2 rounded-lg text-sm hover:bg-gray-50 transition-colors w-full justify-center">
                {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                <span>{uploading ? 'Yükleniyor...' : activeFloor.background ? 'Resmi Değiştir' : 'Resim Yükle'}</span>
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleBackgroundUpload} disabled={uploading} />
              </label>
              {activeFloor.width && (
                <div className="mt-2 text-xs text-center text-gray-400">
                  Orijinal Boyut: {activeFloor.width} x {activeFloor.height} px
                </div>
              )}
            </div>

            {/* Araç Kutusu */}
            <div className="p-4 flex-1 overflow-y-auto">
              <h3 className="font-bold text-sm text-gray-700 mb-3">Çizim Araçları</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSelectedTool('select')} className={`p-2 border rounded flex flex-col items-center gap-1 transition-colors ${selectedTool === 'select' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  <Move size={20} /> <span className="text-xs">Seç/Taşı</span>
                </button>
                <button onClick={() => setSelectedTool('wall')} className={`p-2 border rounded flex flex-col items-center gap-1 transition-colors ${selectedTool === 'wall' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  <div className="w-5 h-5 bg-current rounded-sm"></div> <span className="text-xs">Duvar</span>
                </button>
                <button onClick={() => setSelectedTool('room')} className={`p-2 border rounded flex flex-col items-center gap-1 transition-colors ${selectedTool === 'room' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  <Square size={20} /> <span className="text-xs">Oda</span>
                </button>
                <button onClick={() => setSelectedTool('door')} className={`p-2 border rounded flex flex-col items-center gap-1 transition-colors ${selectedTool === 'door' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  <DoorOpen size={20} /> <span className="text-xs">Kapı</span>
                </button>
                <button onClick={() => setSelectedTool('window')} className={`p-2 border rounded flex flex-col items-center gap-1 transition-colors ${selectedTool === 'window' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  <LayoutTemplate size={20} /> <span className="text-xs">Pencere</span>
                </button>
                <button onClick={() => setSelectedTool('text')} className={`p-2 border rounded flex flex-col items-center gap-1 transition-colors ${selectedTool === 'text' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  <Type size={20} /> <span className="text-xs">Metin</span>
                </button>
              </div>

              <h3 className="font-bold text-sm text-gray-700 mt-6 mb-3">Ekipman Listesi</h3>
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                {availableEquipments.map(eq => {
                  const isPlaced = activeFloor.elements.some(el => el.equipmentId === eq.id);
                  // Başka katlarda yerleştirilmiş mi? (Opsiyonel kontrol)
                  const isPlacedOther = floors.some((f, idx) => idx !== activeFloorIndex && f.elements.some(el => el.equipmentId === eq.id));

                  return (
                    <button 
                      key={eq.id}
                      disabled={isPlaced}
                      onClick={() => {
                        setSelectedTool('equipment');
                        setSelectedEquipmentToPlace(eq.id);
                      }}
                      className={`w-full text-left p-2 text-xs border rounded-lg flex justify-between items-center transition-all ${
                        selectedEquipmentToPlace === eq.id ? 'bg-blue-100 border-blue-500 ring-1 ring-blue-500 text-blue-700' : 
                        isPlaced ? 'bg-green-50 border-green-200 text-gray-400 cursor-not-allowed opacity-60' : 
                        isPlacedOther ? 'bg-yellow-50 border-yellow-200 text-gray-600 hover:bg-yellow-100' :
                        'bg-white text-gray-700 hover:bg-gray-50 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex flex-col">
                          <span className="font-bold">{eq.equipment_code}</span>
                          <span className="text-[10px] opacity-80 truncate max-w-[120px]">{eq.equipment.name}</span>
                      </div>
                      {isPlaced ? <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Eklendi</span> : 
                       isPlacedOther ? <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded flex items-center gap-1"><MapPin size={8}/> Diğer Kat</span> :
                       <Plus size={14} />}
                    </button>
                  );
                })}
                {availableEquipments.length === 0 && <div className="text-xs text-gray-400 text-center py-4">Ekipman bulunamadı.</div>}
              </div>
            </div>
          </div>

          {/* ORTA PANEL: Canvas */}
          <div className="flex-1 bg-gray-200 overflow-hidden relative flex flex-col justify-center items-center p-10 cursor-move" onMouseDown={handleMouseDown}>
            
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white p-2 rounded shadow" onMouseDown={e => e.stopPropagation()}>
              <button onClick={() => setTransform(t => ({ ...t, scale: t.scale + 0.1 }))} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><ZoomIn size={20}/></button>
              <button onClick={() => setTransform(t => ({ ...t, scale: Math.max(0.1, t.scale - 0.1) }))} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><ZoomOut size={20}/></button>
              <button onClick={() => setTransform({ x: 0, y: 0, scale: 1 })} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><RefreshCw size={20}/></button>
            </div>

            {/* Sürüklenebilir Alan (Canvas Wrapper) */}
            <div 
              style={{ 
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transformOrigin: '0 0',
                width: activeFloor.width || 1000,
                height: activeFloor.height || 800
              }}
              className="relative bg-white shadow-2xl transition-transform duration-75 ease-linear"
              onClick={handleCanvasClick}
            >
              {/* SVG Alanı - Resim Boyutlarına Sabitlenmiş */}
              <svg 
                ref={svgRef}
                width={activeFloor.width || 1000}
                height={activeFloor.height || 800}
                // DÜZELTME: viewBox'ı resmin doğal boyutlarına eşitliyoruz.
                viewBox={`0 0 ${activeFloor.width || 1000} ${activeFloor.height || 800}`}
                className="block"
                style={{ cursor: selectedTool !== 'select' ? 'crosshair' : 'default' }}
              >
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                    </pattern>
                </defs>

                {/* Arkaplan Resmi - DÜZELTME: preserveAspectRatio kaldırıldı */}
                {activeFloor.background ? (
                  <image 
                    href={activeFloor.background} 
                    width={activeFloor.width} 
                    height={activeFloor.height}
                    opacity={0.9}
                    // Resim esnetilmeyecek, çünkü viewBox zaten resim boyutunda.
                  />
                ) : (
                  <rect width="100%" height="100%" fill="url(#grid)" />
                )}

                {/* Elemanlar */}
                {activeFloor.elements.map(el => (
                  <g 
                    key={el.id} 
                    transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0}, ${el.width/2}, ${el.height/2})`}
                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                    onContextMenu={(e) => handleElementContextMenu(e, el.id)}
                    className="hover:opacity-80"
                    style={{ cursor: selectedTool === 'select' ? 'move' : 'default' }}
                  >
                    {/* Ekipman Çizimi */}
                    {el.type === 'equipment' ? (
                      <g>
                        <circle r={14} fill="#2563eb" stroke="white" strokeWidth="2" cx={15} cy={15} className="drop-shadow-md" />
                        <text x={15} y={20} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" className="select-none pointer-events-none" style={{fontFamily: 'monospace'}}>
                          {el.equipmentCode?.slice(0, 2)}
                        </text>
                        {/* Tam Kod Etiketi */}
                        <g transform="translate(-10, 35)">
                            <rect width="50" height="16" rx="4" fill="white" stroke="#e5e7eb" opacity="0.9" />
                            <text x="25" y="11" textAnchor="middle" fill="#1f2937" fontSize="9" fontWeight="bold" className="select-none">{el.equipmentCode}</text>
                        </g>
                        {/* Seçim Çerçevesi */}
                        {selectedElementId === el.id && (
                            <circle cx={15} cy={15} r={18} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" />
                        )}
                      </g>
                    ) : el.type === 'wall' ? (
                      <>
                         <rect width={el.width} height={el.height} fill="#374151" rx={0} className="shadow-sm" />
                         {selectedElementId === el.id && (
                             <rect x="-2" y="-2" width={el.width+4} height={el.height+4} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" />
                         )}
                      </>
                    ) : el.type === 'room' ? (
                      <>
                        <rect width={el.width} height={el.height} fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" fillOpacity={0.6} strokeDasharray="5,5" />
                        <text x={el.width/2} y={el.height/2} textAnchor="middle" fill="#64748b" fontSize={el.fontSize || 14} fontWeight="bold" pointerEvents="none" className="select-none">{el.text || 'Oda'}</text>
                        {selectedElementId === el.id && (
                             <>
                                <rect x="-2" y="-2" width={el.width+4} height={el.height+4} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" />
                                <circle cx={el.width} cy={el.height} r={6} fill="#ef4444" style={{cursor: 'nwse-resize'}} onMouseDown={(e) => handleMouseDown(e, el.id, true)} />
                             </>
                         )}
                      </>
                    ) : el.type === 'door' ? (
                        <g>
                           <rect width={el.width} height={el.height} fill="#a16207" rx={2} />
                           <path d={`M 0 ${el.height} Q ${el.width} ${el.height} ${el.width} 0`} fill="none" stroke="#a16207" strokeDasharray="3,3" />
                           {selectedElementId === el.id && (
                             <rect x="-2" y="-2" width={el.width+4} height={el.height+4} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" />
                           )}
                        </g>
                    ) : el.type === 'window' ? (
                        <g>
                           <rect width={el.width} height={el.height} fill="#bae6fd" stroke="#0ea5e9" strokeWidth="2" />
                           {selectedElementId === el.id && (
                             <rect x="-2" y="-2" width={el.width+4} height={el.height+4} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" />
                           )}
                        </g>
                    ) : el.type === 'text' ? (
                       <g>
                         <text x={0} y={(el.fontSize || 14)} fontSize={el.fontSize || 14} fill="#1f2937" fontWeight="600" className="select-none">{el.text || 'Metin'}</text>
                         {selectedElementId === el.id && (
                             <rect x="-2" y="-2" width={el.width > 20 ? el.width : 100} height={(el.fontSize || 14) + 4} fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="4" />
                         )}
                       </g>
                    ) : null}
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* SAĞ PANEL: Özellikler */}
          {selectedElement && (
             <div className="w-72 bg-white border-l p-5 shadow-xl z-20 overflow-y-auto">
                 <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                       <Edit3 size={16} /> Seçili Öğe
                    </h3>
                    <button onClick={() => setSelectedElementId(null)}><X size={16} className="text-gray-400 hover:text-gray-600"/></button>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="text-xs text-gray-500 mb-2">Tip: <span className="font-medium text-gray-700 uppercase">{selectedElement.type}</span></div>
                    
                    {(selectedElement.type === 'text' || selectedElement.type === 'room') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Metin</label>
                            <input 
                                type="text" 
                                value={selectedElement.text || ''} 
                                onChange={(e) => updateElementProperty('text', e.target.value)}
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
                                onChange={(e) => updateElementProperty('fontSize', Number(e.target.value))}
                                className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}

                    {selectedElement.type !== 'equipment' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Genişlik (px)</label>
                                <input 
                                    type="number" 
                                    value={selectedElement.width} 
                                    onChange={(e) => updateElementProperty('width', Number(e.target.value))}
                                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Yükseklik (px)</label>
                                <input 
                                    type="number" 
                                    value={selectedElement.height} 
                                    onChange={(e) => updateElementProperty('height', Number(e.target.value))}
                                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Döndürme (Derece)</label>
                        <input 
                            type="range" min="0" max="360" step="15"
                            value={selectedElement.rotation || 0} 
                            onChange={(e) => updateElementProperty('rotation', Number(e.target.value))}
                            className="w-full"
                        />
                        <div className="text-right text-xs text-gray-500">{selectedElement.rotation || 0}°</div>
                    </div>

                    <button 
                        onClick={handleDeleteSelected}
                        className="w-full bg-red-50 text-red-600 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-100 transition-colors font-medium text-sm border border-red-200 mt-4"
                    >
                        <Trash2 size={16} /> Sil
                    </button>
                 </div>
             </div>
          )}

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
          <div className="text-center p-10 border-2 border-dashed border-gray-200 rounded-2xl bg-white shadow-sm max-w-md">
            <Layout size={64} className="mx-auto mb-4 text-blue-200" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">Kroki Editörüne Hoşgeldiniz</h3>
            <p className="text-gray-500 mb-6">Düzenlemeye başlamak için lütfen yukarıdaki menüden bir Müşteri ve Şube seçiniz.</p>
            <div className="flex flex-col gap-2 text-sm text-left bg-blue-50 p-4 rounded-lg text-blue-700">
                <div className="flex items-center gap-2"><MousePointer size={14}/> <span className="font-medium">Seçim Aracı:</span> Elemanları taşır ve düzenler.</div>
                <div className="flex items-center gap-2"><Upload size={14}/> <span className="font-medium">Resim Yükle:</span> Kat planı görselini yükler.</div>
                <div className="flex items-center gap-2"><Layers size={14}/> <span className="font-medium">Katlar:</span> Birden fazla kat oluşturabilirsiniz.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFloorPlanEditor;