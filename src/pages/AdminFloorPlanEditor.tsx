import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Save, Plus, Upload, Trash2, Layers, Move, Type, 
  Square, DoorOpen, Layout, Box, ZoomIn, ZoomOut, RefreshCw, X, Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';

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

const AdminFloorPlanEditor: React.FC = () => {
  // --- STATE ---
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  
  const [floors, setFloors] = useState<FloorLayer[]>([]);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [availableEquipments, setAvailableEquipments] = useState<Equipment[]>([]);
  
  // Çizim & Araçlar
  const [selectedTool, setSelectedTool] = useState<'select' | 'wall' | 'room' | 'door' | 'window' | 'text' | 'equipment'>('select');
  const [selectedEquipmentToPlace, setSelectedEquipmentToPlace] = useState<string | null>(null);
  
  // Pan & Zoom (Sadece Görüntüleme İçin)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  
  // Sürüklenen Eleman
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Yükleme Durumu
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Aktif Katın Verisi
  const activeFloor = floors[activeFloorIndex];

  // --- VERİ ÇEKME ---
  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadFloorPlanData();
      fetchBranchEquipments();
    } else {
      setFloors([]);
      setAvailableEquipments([]);
    }
  }, [selectedBranch]);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, kisa_isim').order('kisa_isim');
    setCustomers(data || []);
  };

  const handleCustomerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    setSelectedCustomer(custId);
    setSelectedBranch('');
    if (custId) {
      const { data } = await supabase.from('branches').select('id, sube_adi').eq('customer_id', custId);
      setBranches(data || []);
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
      const fileName = `${selectedBranch}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('floor-plans')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('floor-plans')
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
    }
  };

  // --- KOORDİNAT HESAPLAMA (KRİTİK BÖLÜM) ---
  // Ekran koordinatını (mouse click) SVG içindeki GERÇEK koordinata çevirir.
  // Bu, zoom/pan ve resim boyutundan bağımsız olarak doğru noktayı verir.
  const getSVGCoordinates = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    // SVG'nin o anki dönüşüm matrisinin tersini alarak gerçek koordinatı bulur
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDraggingCanvas) return;
    if (selectedTool === 'select') return;

    const { x, y } = getSVGCoordinates(e.clientX, e.clientY);

    const newElement = {
      id: crypto.randomUUID(),
      type: selectedTool,
      x, 
      y,
      width: 50,
      height: 50,
      rotation: 0,
      text: selectedTool === 'text' ? 'Metin' : '',
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
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (selectedTool !== 'select') return;
    e.stopPropagation();
    setDraggingElementId(elementId);
  };

  const handleElementMouseMove = (e: React.MouseEvent) => {
    if (draggingElementId) {
      const { x, y } = getSVGCoordinates(e.clientX, e.clientY);
      
      const newFloors = [...floors];
      const elIndex = newFloors[activeFloorIndex].elements.findIndex(el => el.id === draggingElementId);
      if (elIndex !== -1) {
        const el = newFloors[activeFloorIndex].elements[elIndex];
        el.x = x - (el.width || 0) / 2;
        el.y = y - (el.height || 0) / 2;
        setFloors(newFloors);
      }
    }
  };

  const handleElementMouseUp = () => {
    setDraggingElementId(null);
  };

  const handleElementContextMenu = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    if (confirm("Bu öğeyi silmek istiyor musunuz?")) {
      const newFloors = [...floors];
      newFloors[activeFloorIndex].elements = newFloors[activeFloorIndex].elements.filter(el => el.id !== elementId);
      setFloors(newFloors);
    }
  };

  const saveAll = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('branch_floor_plans').select('id').eq('branch_id', selectedBranch);
      
      const payload = {
        branch_id: selectedBranch,
        title: 'Genel Yerleşim',
        floors: floors,
        updated_at: new Date().toISOString()
      };

      if (data && data.length > 0) {
        await supabase.from('branch_floor_plans').update(payload).eq('branch_id', selectedBranch);
      } else {
        await supabase.from('branch_floor_plans').insert([payload]);
      }
      toast.success("Kroki ve ekipman yerleşimi kaydedildi.");
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* ÜST PANEL */}
      <div className="bg-white p-4 border-b flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <select 
            className="border p-2 rounded" 
            value={selectedCustomer} 
            onChange={handleCustomerChange}
          >
            <option value="">Müşteri Seçiniz</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
          </select>
          <select 
            className="border p-2 rounded" 
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
            <button onClick={saveAll} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700">
              <Save size={18} /> {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        )}
      </div>

      {selectedBranch && activeFloor ? (
        <div className="flex flex-1 overflow-hidden">
          {/* SOL PANEL: Araçlar */}
          <div className="w-64 bg-gray-50 border-r flex flex-col overflow-y-auto">
            
            {/* Katlar */}
            <div className="p-4 border-b">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-sm text-gray-700">Katlar</h3>
                <button onClick={addFloor} className="p-1 hover:bg-gray-200 rounded"><Plus size={16}/></button>
              </div>
              <div className="space-y-1">
                {floors.map((floor, idx) => (
                  <div 
                    key={floor.id} 
                    className={`flex justify-between items-center p-2 rounded cursor-pointer ${activeFloorIndex === idx ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}
                    onClick={() => setActiveFloorIndex(idx)}
                  >
                    <span className="text-sm">{floor.name}</span>
                    {idx > 0 && <button onClick={(e) => { e.stopPropagation(); removeFloor(idx); }}><Trash2 size={14} className="text-red-400"/></button>}
                  </div>
                ))}
              </div>
            </div>

            {/* Kroki Yükleme */}
            <div className="p-4 border-b">
              <label className="block text-sm font-bold text-gray-700 mb-2">Arkaplan Resmi</label>
              <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 p-2 rounded text-sm hover:bg-gray-50 transition-colors">
                {uploading ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                <span>{uploading ? 'Yükleniyor...' : activeFloor.background ? 'Resmi Değiştir' : 'Resim Yükle'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} disabled={uploading} />
              </label>
              {activeFloor.width && (
                <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">
                  <div className="font-semibold">Resim Boyutu:</div>
                  {activeFloor.width} x {activeFloor.height} px
                </div>
              )}
            </div>

            {/* Araç Kutusu */}
            <div className="p-4 flex-1">
              <h3 className="font-bold text-sm text-gray-700 mb-2">Araçlar</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSelectedTool('select')} className={`p-2 border rounded flex flex-col items-center gap-1 ${selectedTool === 'select' ? 'bg-blue-50 border-blue-500' : 'bg-white'}`}>
                  <Move size={20} /> <span className="text-xs">Seç/Taşı</span>
                </button>
                <button onClick={() => setSelectedTool('wall')} className={`p-2 border rounded flex flex-col items-center gap-1 ${selectedTool === 'wall' ? 'bg-blue-50 border-blue-500' : 'bg-white'}`}>
                  <Square size={20} /> <span className="text-xs">Duvar</span>
                </button>
                <button onClick={() => setSelectedTool('room')} className={`p-2 border rounded flex flex-col items-center gap-1 ${selectedTool === 'room' ? 'bg-blue-50 border-blue-500' : 'bg-white'}`}>
                  <Layout size={20} /> <span className="text-xs">Oda</span>
                </button>
                <button onClick={() => setSelectedTool('door')} className={`p-2 border rounded flex flex-col items-center gap-1 ${selectedTool === 'door' ? 'bg-blue-50 border-blue-500' : 'bg-white'}`}>
                  <DoorOpen size={20} /> <span className="text-xs">Kapı</span>
                </button>
                <button onClick={() => setSelectedTool('text')} className={`p-2 border rounded flex flex-col items-center gap-1 ${selectedTool === 'text' ? 'bg-blue-50 border-blue-500' : 'bg-white'}`}>
                  <Type size={20} /> <span className="text-xs">Metin</span>
                </button>
              </div>

              <h3 className="font-bold text-sm text-gray-700 mt-4 mb-2">Ekipmanlar</h3>
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {availableEquipments.map(eq => {
                  const isPlaced = activeFloor.elements.some(el => el.equipmentId === eq.id);
                  return (
                    <button 
                      key={eq.id}
                      disabled={isPlaced}
                      onClick={() => {
                        setSelectedTool('equipment');
                        setSelectedEquipmentToPlace(eq.id);
                      }}
                      className={`w-full text-left p-2 text-xs border rounded flex justify-between items-center transition-colors ${
                        selectedEquipmentToPlace === eq.id ? 'bg-blue-100 border-blue-500 ring-1 ring-blue-500' : 
                        isPlaced ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium">{eq.equipment_code}</span>
                      <span className="text-[10px] text-gray-500 truncate max-w-[80px]" title={eq.equipment.name}>{eq.equipment.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ORTA PANEL: Canvas */}
          <div className="flex-1 bg-gray-200 overflow-hidden relative flex flex-col">
            
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white p-2 rounded shadow">
              <button onClick={() => setTransform(t => ({ ...t, scale: t.scale + 0.1 }))} className="p-1 hover:bg-gray-100 rounded"><ZoomIn size={20}/></button>
              <button onClick={() => setTransform(t => ({ ...t, scale: Math.max(0.1, t.scale - 0.1) }))} className="p-1 hover:bg-gray-100 rounded"><ZoomOut size={20}/></button>
              <button onClick={() => setTransform({ x: 0, y: 0, scale: 1 })} className="p-1 hover:bg-gray-100 rounded"><RefreshCw size={20}/></button>
            </div>

            {/* Sürüklenebilir Alan */}
            <div 
              className="flex-1 overflow-hidden relative cursor-crosshair flex items-center justify-center"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && selectedTool === 'select') {
                  setIsDraggingCanvas(true);
                  dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
                }
              }}
              onMouseMove={(e) => {
                if (isDraggingCanvas) {
                  setTransform(prev => ({ ...prev, x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y }));
                } else {
                  handleElementMouseMove(e);
                }
              }}
              onMouseUp={() => {
                setIsDraggingCanvas(false);
                handleElementMouseUp();
              }}
              onClick={handleCanvasClick}
            >
              <div 
                style={{ 
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                  // DÜZELTME: Transform origin merkezi değil, sol üst köşe olsun ki koordinatlar karışmasın
                  transformOrigin: '0 0', 
                  width: activeFloor.width || 1000,
                  height: activeFloor.height || 800
                }}
                className="relative bg-white shadow-2xl transition-transform duration-75 ease-linear"
              >
                {/* SVG Alanı - Resim Boyutlarına Sabitlenmiş */}
                <svg 
                  ref={svgRef}
                  width={activeFloor.width || 1000}
                  height={activeFloor.height || 800}
                  // DÜZELTME: viewBox, resmin GERÇEK boyutlarına eşitlenir.
                  viewBox={`0 0 ${activeFloor.width || 1000} ${activeFloor.height || 800}`}
                  className="block"
                >
                  {/* Arkaplan Resmi */}
                  {activeFloor.background ? (
                    <image 
                      href={activeFloor.background} 
                      width={activeFloor.width} 
                      height={activeFloor.height}
                      opacity={0.8}
                      // DÜZELTME: preserveAspectRatio KALDIRILDI. Resim esnetilmeden doğal haliyle oturur.
                    />
                  ) : (
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  )}

                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                    </pattern>
                  </defs>

                  {/* Elemanlar */}
                  {activeFloor.elements.map(el => (
                    <g 
                      key={el.id} 
                      transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation || 0}, ${el.width/2}, ${el.height/2})`}
                      onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                      onContextMenu={(e) => handleElementContextMenu(e, el.id)}
                      className="cursor-move hover:opacity-80"
                    >
                      {/* Ekipman Çizimi */}
                      {el.type === 'equipment' ? (
                        <>
                          <circle r={15} fill="#3b82f6" stroke="white" strokeWidth="2" cx={15} cy={15} />
                          <text x={15} y={-5} textAnchor="middle" fill="#1e293b" fontSize="12" fontWeight="bold" className="select-none bg-white px-1 shadow-sm rounded">
                            {el.equipmentCode}
                          </text>
                        </>
                      ) : el.type === 'wall' ? (
                        <rect width={el.width} height={el.height} fill="#374151" rx={2} />
                      ) : el.type === 'room' ? (
                        <>
                          <rect width={el.width} height={el.height} fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" fillOpacity={0.5} />
                          <text x={el.width/2} y={el.height/2} textAnchor="middle" fill="#64748b" fontSize="14" fontWeight="bold" pointerEvents="none" className="select-none">{el.text || 'Oda'}</text>
                        </>
                      ) : el.type === 'door' ? (
                        <g>
                           <rect width={el.width} height={el.height} fill="#a16207" rx={2} />
                           <path d={`M 0 ${el.height} Q ${el.width} ${el.height} ${el.width} 0`} fill="none" stroke="#a16207" strokeDasharray="4" />
                        </g>
                      ) : el.type === 'text' ? (
                         <text fontSize={20} fill="#1f2937" fontWeight="bold" className="select-none">{el.text || 'Metin'}</text>
                      ) : (
                        <rect width={el.width} height={el.height} fill="#ccc" />
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
          <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-xl">
            <Layout size={48} className="mx-auto mb-4 opacity-50 text-blue-400" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">Kroki Editörü</h3>
            <p className="text-sm">Düzenleme yapmak için yukarıdan Müşteri ve Şube seçiniz.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFloorPlanEditor;