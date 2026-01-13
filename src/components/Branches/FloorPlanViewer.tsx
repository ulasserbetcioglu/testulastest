import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Maximize2, ZoomIn, ZoomOut, MapPin, Phone, Mail, Globe, 
  Loader2, Layers, ChevronDown, Calendar, AlertCircle, Download
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toJpeg } from 'html-to-image';
import { toast } from 'sonner';

// --- Interfaces ---
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

interface Visit {
  id: string;
  visit_date: string;
  equipment_checks: Record<string, any>;
}

interface ViewerProps {
  branchId: string;
}

const FloorPlanViewer: React.FC<ViewerProps> = ({ branchId }) => {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [scale, setScale] = useState(0.8);
  
  // Ref (Resim çıktısı almak için)
  const paperRef = useRef<HTMLDivElement>(null);

  // Veri State'leri
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [branchInfo, setBranchInfo] = useState<{ sube_adi: string; customer: { kisa_isim: string } } | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  
  // Ziyaret ve Aktivite State'leri
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [activeEquipmentIds, setActiveEquipmentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (branchId) {
      fetchAllData();
    }
  }, [branchId]);

  // Seçilen ziyaret değiştiğinde aktif ekipmanları hesapla
  useEffect(() => {
    if (!selectedVisitId) {
      setActiveEquipmentIds(new Set());
      return;
    }

    const visit = visits.find(v => v.id === selectedVisitId);
    if (!visit || !visit.equipment_checks) return;

    const activeIds = new Set<string>();

    Object.entries(visit.equipment_checks).forEach(([eqId, checkData]: [string, any]) => {
      const hasActivity = Object.values(checkData).some(val => 
        val === true || val === 'true' || val === 'var' || val === 'evet' || 
        (typeof val === 'number' && val > 0)
      );

      if (hasActivity) {
        activeIds.add(eqId);
      }
    });

    setActiveEquipmentIds(activeIds);
  }, [selectedVisitId, visits]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // 1. Şirket Ayarları (Try-Catch ile sarıldı, hata olsa bile devam etsin)
      try {
        const { data: companyData, error } = await supabase.from('company_settings').select('*').single();
        if (error) console.error("Şirket bilgisi çekilemedi (RLS hatası olabilir):", error);
        if (companyData) setCompanySettings(companyData);
      } catch (e) {
        console.error("Şirket ayarları hatası:", e);
      }

      // 2. Şube Bilgisi
      const { data: branchData } = await supabase
        .from('branches')
        .select('sube_adi, customer:customer_id(kisa_isim)')
        .eq('id', branchId)
        .single();
      if (branchData) setBranchInfo(branchData);

      // 3. Ekipman Listesi
      const { data: eqData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, equipment:equipment_id(name, type)')
        .eq('branch_id', branchId);
      setEquipments(eqData || []);

      // 4. Kat Planları
      const { data: planData } = await supabase
        .from('branch_floor_plans')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: true });

      if (planData && planData.length > 0) {
        setPlans(planData.map(p => ({
          id: p.id,
          title: p.title || 'Kat Planı',
          background_url: p.background_url,
          elements: p.elements || [],
          equipment_positions: p.equipment_positions || {}
        })));
        setCurrentPlanId(planData[0].id);
      }

      // 5. Tamamlanmış Ziyaretler
      const { data: visitData } = await supabase
        .from('visits')
        .select('id, visit_date, equipment_checks')
        .eq('branch_id', branchId)
        .eq('status', 'completed')
        .order('visit_date', { ascending: false })
        .limit(20);
      
      setVisits(visitData || []);

    } catch (error) {
      console.error("Genel veri çekme hatası:", error);
      toast.error("Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // --- JPEG İndirme Fonksiyonu ---
  const handleDownload = useCallback(async () => {
    if (paperRef.current === null) return;
    
    setDownloading(true);
    try {
      // Kaliteyi artırmak için pixelRatio ve quality ayarları
      const dataUrl = await toJpeg(paperRef.current, { 
        quality: 0.95, 
        backgroundColor: '#ffffff',
        pixelRatio: 2 // Daha yüksek çözünürlük için
      });
      
      const link = document.createElement('a');
      link.download = `kroki-${currentPlanId}-${format(new Date(), 'dd-MM-yyyy')}.jpg`;
      link.href = dataUrl;
      link.click();
      toast.success("Kroki görseli indirildi.");
    } catch (err) {
      console.error("Resim oluşturma hatası:", err);
      toast.error("Resim oluşturulurken hata oluştu.");
    } finally {
      setDownloading(false);
    }
  }, [currentPlanId]);

  const currentPlan = plans.find(p => p.id === currentPlanId);
  const normalize = (v: number, min = 1) => (Number.isFinite(v) ? Math.max(min, v) : min);

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  if (!currentPlan) {
    return (
      <div className="p-8 text-center bg-gray-50 border border-dashed rounded-lg text-gray-500">
        <Layers className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Bu şube için henüz bir kat planı veya kroki oluşturulmamış.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-gray-100 rounded-lg border border-gray-200 overflow-hidden" style={{ minHeight: '600px' }}>
      
      {/* Yanıp Sönme Animasyonu */}
      <style>{`
        @keyframes pulse-red {
          0% { stroke-width: 0; stroke-opacity: 1; }
          50% { stroke-width: 15; stroke-opacity: 0.5; }
          100% { stroke-width: 0; stroke-opacity: 0; }
        }
        .blinking-dot {
          animation: pulse-red 1.5s infinite;
          fill: #ef4444;
          stroke: #ef4444;
        }
      `}</style>

      {/* --- Toolbar --- */}
      <div className="w-full bg-white border-b px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3 shadow-sm z-10">
        
        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {/* Kat Seçimi */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Layers size={16} className="text-gray-400" />
            <div className="relative">
              <select 
                value={currentPlanId || ''}
                onChange={(e) => setCurrentPlanId(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-300 text-gray-700 py-1.5 pl-3 pr-8 rounded leading-tight focus:outline-none focus:border-blue-500 text-sm font-medium cursor-pointer"
              >
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Tarih Seçimi */}
          <div className="flex items-center gap-2 border-l pl-4 ml-2 flex-shrink-0">
            <Calendar size={16} className={selectedVisitId ? "text-blue-600" : "text-gray-400"} />
            <div className="relative">
              <select 
                value={selectedVisitId}
                onChange={(e) => setSelectedVisitId(e.target.value)}
                className={`appearance-none border text-sm py-1.5 pl-3 pr-8 rounded leading-tight focus:outline-none cursor-pointer font-medium transition-colors ${
                  selectedVisitId 
                  ? 'bg-blue-50 border-blue-200 text-blue-800' 
                  : 'bg-gray-50 border-gray-300 text-gray-700'
                }`}
              >
                <option value="">Aktivite Gösterilmiyor</option>
                {visits.map(v => (
                  <option key={v.id} value={v.id}>
                    {format(parseISO(v.visit_date), 'dd.MM.yyyy')} - Aktivite Kontrolü
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {selectedVisitId && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1 animate-in fade-in whitespace-nowrap">
              <AlertCircle size={12} />
              <span>{activeEquipmentIds.size} nokta</span>
            </div>
          )}
        </div>

        {/* Sağ Taraf: Zoom ve İndirme */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          
          {/* İndirme Butonu */}
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span className="hidden sm:inline">JPEG İndir</span>
          </button>

          {/* Zoom Kontrolleri */}
          <div className="flex items-center gap-1 bg-gray-100 rounded p-1 border">
            <button onClick={() => setScale(s => Math.max(0.3, s - 0.1))} className="p-1 hover:bg-white rounded text-gray-600">
              <ZoomOut size={16} />
            </button>
            <span className="text-xs w-10 text-center font-mono text-gray-600">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1 hover:bg-white rounded text-gray-600">
              <ZoomIn size={16} />
            </button>
            <button onClick={() => setScale(0.8)} className="p-1 hover:bg-white rounded text-gray-600 ml-1 border-l border-gray-300">
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* --- Canvas Container --- */}
      <div className="flex-1 w-full overflow-auto bg-gray-200/50 p-8 flex justify-center items-start">
        
        {/* --- THE PAPER (Resim Çıktısı Alınacak Alan) --- */}
        <div 
          ref={paperRef}
          className="bg-white shadow-2xl relative transition-transform duration-200 ease-out origin-top"
          style={{ 
            width: 1000, 
            height: 800, 
            transform: `scale(${scale})`,
            flexShrink: 0 
          }}
        >
          
          {/* 1. Header (Logo & Bilgi) */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-white/95 border-b px-8 flex justify-between items-center z-20">
            <div className="flex items-center gap-5">
              {companySettings?.logo_url ? (
                <img src={companySettings.logo_url} className="h-16 object-contain max-w-[200px]" alt="Logo" />
              ) : (
                <div className="h-16 flex flex-col justify-center">
                   <h1 className="text-xl font-bold uppercase text-gray-900">{companySettings?.company_name || 'İlaçlama Firması'}</h1>
                </div>
              )}
              
              {/* Logo varsa ismi gizleyip sadece şube bilgisini gösterebiliriz veya ikisini de gösterebiliriz */}
              {companySettings?.logo_url && (
                <div>
                  <h1 className="text-lg font-bold uppercase text-gray-800">{companySettings.company_name}</h1>
                  <h2 className="text-sm text-gray-600 font-medium">
                    {branchInfo?.customer?.kisa_isim} - {branchInfo?.sube_adi}
                  </h2>
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800 uppercase tracking-wide border-b-4 border-blue-600 pb-1 inline-block">
                {currentPlan.title}
              </div>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
                {selectedVisitId 
                  ? `${format(parseISO(visits.find(v => v.id === selectedVisitId)?.visit_date || ''), 'dd.MM.yyyy')} Raporu` 
                  : 'Yerleşim Planı'
                }
              </div>
            </div>
          </div>

          {/* 2. Drawing Area (SVG) */}
          <div className="absolute top-24 bottom-16 left-0 right-0 bg-gray-50 overflow-hidden">
            
            {currentPlan.background_url ? (
              <img 
                src={currentPlan.background_url} 
                className="absolute top-0 left-0 w-full h-full object-contain opacity-90 pointer-events-none select-none"
                alt="Plan Arkaplan"
              />
            ) : (
               <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            )}

            <svg width="100%" height="100%" className="absolute top-0 left-0">
              
              {/* Elemanlar */}
              {currentPlan.elements.map((el) => (
                <g key={el.id} transform={`translate(${el.x}, ${el.y})`}>
                  {el.type === 'wall' && <rect width={normalize(el.width)} height={normalize(el.height)} fill="#334155" />}
                  {el.type === 'door' && <rect width={normalize(el.width)} height={normalize(el.height)} fill="#a16207" />}
                  {el.type === 'window' && <rect width={normalize(el.width)} height={normalize(el.height)} fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="2" />}
                  {el.type === 'room' && (
                    <>
                      <rect width={normalize(el.width)} height={normalize(el.height)} fill="#f8fafc" fillOpacity={0.6} stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
                      <text x={5} y={20} fontSize={el.fontSize} fontWeight="bold" fill="#475569" style={{ userSelect: 'none' }}>{el.text}</text>
                    </>
                  )}
                  {el.type === 'text' && (
                    <text x={0} y={el.fontSize} fontSize={el.fontSize} fontWeight="600" fill="#1e293b" style={{ userSelect: 'none' }}>{el.text}</text>
                  )}
                </g>
              ))}

              {/* Ekipmanlar */}
              {Object.entries(currentPlan.equipment_positions).map(([eqId, pos]) => {
                const eqInfo = equipments.find(e => e.id === eqId);
                const isActive = activeEquipmentIds.has(eqId);
                
                return (
                  <g key={eqId} transform={`translate(${pos.x}, ${pos.y})`}>
                    
                    {/* Aktivite Animasyonu */}
                    {isActive && (
                      <circle cx="0" cy="0" r="14" className="blinking-dot" fill="none" />
                    )}

                    <circle 
                      r="14" 
                      fill={isActive ? "#ef4444" : "#2563eb"} 
                      stroke="white" 
                      strokeWidth="3" 
                      className="drop-shadow-sm" 
                    />
                    
                    <text x="0" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" style={{ userSelect: 'none' }}>
                      {eqInfo?.equipment_code.substring(0, 2) || 'EQ'}
                    </text>

                    <rect x="-22" y="20" width="44" height="18" rx="4" fill="white" stroke={isActive ? "#ef4444" : "#e5e7eb"} strokeWidth={isActive ? 2 : 1} className="shadow-sm" />
                    <text x="0" y="33" textAnchor="middle" fontSize="10" fontWeight="bold" fill={isActive ? "#ef4444" : "#374151"} style={{ userSelect: 'none' }}>
                      {eqInfo?.equipment_code || '??'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 3. Footer */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t flex justify-between items-center px-8 text-xs text-gray-500 z-20">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-full">
                <MapPin size={14} />
              </div>
              <span className="font-medium">{companySettings?.address || 'Adres bilgisi mevcut değil.'}</span>
            </div>

            <div className="flex items-center gap-6">
              {companySettings?.phone && (
                <span className="flex items-center gap-1.5"><Phone size={14} /> {companySettings.phone}</span>
              )}
              {companySettings?.email && (
                <span className="flex items-center gap-1.5"><Mail size={14} /> {companySettings.email}</span>
              )}
              {companySettings?.website && (
                <span className="flex items-center gap-1.5"><Globe size={14} /> {companySettings.website}</span>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FloorPlanViewer;