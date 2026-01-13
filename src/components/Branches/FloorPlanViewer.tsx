import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Maximize2, ZoomIn, ZoomOut, MapPin, Phone, Mail, Globe, 
  Loader2, Layers, ChevronDown 
} from 'lucide-react';

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

interface ViewerProps {
  branchId: string;
}

const FloorPlanViewer: React.FC<ViewerProps> = ({ branchId }) => {
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(0.8); // Varsayılan biraz küçük başlasın ki ekrana sığsın
  
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [branchInfo, setBranchInfo] = useState<{ sube_adi: string; customer: { kisa_isim: string } } | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  useEffect(() => {
    if (branchId) {
      fetchAllData();
    }
  }, [branchId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // 1. Şirket Ayarları (Logo vs için)
      const { data: companyData } = await supabase.from('company_settings').select('*').single();
      if (companyData) setCompanySettings(companyData);

      // 2. Şube Bilgisi (Başlık için)
      const { data: branchData } = await supabase
        .from('branches')
        .select('sube_adi, customer:customer_id(kisa_isim)')
        .eq('id', branchId)
        .single();
      if (branchData) setBranchInfo(branchData);

      // 3. Ekipman Listesi (Kodları eşleştirmek için)
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

    } catch (error) {
      console.error("Veri çekme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

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
      
      {/* --- Viewer Toolbar (Zoom & Kat Seçimi) --- */}
      <div className="w-full bg-white border-b px-4 py-2 flex justify-between items-center shadow-sm z-10">
        
        {/* Kat Seçimi */}
        <div className="flex items-center gap-2">
          {plans.length > 1 ? (
            <div className="relative">
              <select 
                value={currentPlanId || ''}
                onChange={(e) => setCurrentPlanId(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-300 text-gray-700 py-1.5 pl-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500 text-sm font-medium cursor-pointer"
              >
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ChevronDown size={14} />
              </div>
            </div>
          ) : (
            <span className="font-bold text-gray-700 text-sm flex items-center gap-2">
              <Layers size={16} className="text-blue-600" /> {currentPlan.title}
            </span>
          )}
        </div>

        {/* Zoom Kontrolleri */}
        <div className="flex items-center gap-1 bg-gray-100 rounded p-1 border">
          <button onClick={() => setScale(s => Math.max(0.3, s - 0.1))} className="p-1 hover:bg-white rounded text-gray-600" title="Küçült">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs w-10 text-center font-mono text-gray-600">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1 hover:bg-white rounded text-gray-600" title="Büyüt">
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setScale(0.8)} className="p-1 hover:bg-white rounded text-gray-600 ml-1 border-l border-gray-300" title="Sıfırla">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* --- Canvas Container --- */}
      <div className="flex-1 w-full overflow-auto bg-gray-200/50 p-8 flex justify-center items-start">
        
        {/* --- THE PAPER (Admin Editor'ün Birebir Kopyası) --- */}
        <div 
          className="bg-white shadow-2xl relative transition-transform duration-200 ease-out origin-top"
          style={{ 
            width: 1000, 
            height: 800, 
            transform: `scale(${scale})`,
            flexShrink: 0 // Küçülmesini engelle
          }}
        >
          
          {/* 1. Header (Logo & Bilgi) */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-white/95 border-b px-8 flex justify-between items-center z-20">
            <div className="flex items-center gap-5">
              {companySettings?.logo_url ? (
                <img src={companySettings.logo_url} className="h-16 object-contain" alt="Logo" />
              ) : (
                <div className="w-16 h-16 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 rounded">LOGO</div>
              )}
              
              <div>
                <h1 className="text-xl font-bold uppercase text-gray-900">{companySettings?.company_name || 'İlaçlama Firması'}</h1>
                <h2 className="text-sm text-gray-600 font-medium mt-1">
                  {branchInfo?.customer.kisa_isim} - {branchInfo?.sube_adi}
                </h2>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800 uppercase tracking-wide border-b-4 border-blue-600 pb-1 inline-block">
                {currentPlan.title}
              </div>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Kroki & Yerleşim Planı</div>
            </div>
          </div>

          {/* 2. Drawing Area (SVG) */}
          <div className="absolute top-24 bottom-16 left-0 right-0 bg-gray-50 overflow-hidden">
            
            {/* Arkaplan Resmi */}
            {currentPlan.background_url && (
              <img 
                src={currentPlan.background_url} 
                className="absolute top-0 left-0 w-full h-full object-contain opacity-90 pointer-events-none select-none"
                alt="Plan Background"
              />
            )}

            {/* Grid (Sadece arka plan yoksa) */}
            {!currentPlan.background_url && (
               <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            )}

            <svg width="100%" height="100%" className="absolute top-0 left-0">
              
              {/* --- Çizim Elemanları (Duvar, Oda, Kapı vb.) --- */}
              {currentPlan.elements.map((el) => (
                <g key={el.id} transform={`translate(${el.x}, ${el.y})`}>
                  
                  {/* WALL */}
                  {el.type === 'wall' && (
                    <rect width={normalize(el.width)} height={normalize(el.height)} fill="#334155" />
                  )}

                  {/* ROOM */}
                  {el.type === 'room' && (
                    <>
                      <rect 
                        width={normalize(el.width)} height={normalize(el.height)} 
                        fill="#f8fafc" fillOpacity={0.6} 
                        stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" 
                      />
                      <text x={5} y={20} fontSize={el.fontSize} fontWeight="bold" fill="#475569" style={{ userSelect: 'none' }}>
                        {el.text}
                      </text>
                    </>
                  )}

                  {/* DOOR */}
                  {el.type === 'door' && (
                    <rect width={normalize(el.width)} height={normalize(el.height)} fill="#a16207" />
                  )}

                  {/* WINDOW */}
                  {el.type === 'window' && (
                    <rect 
                      width={normalize(el.width)} height={normalize(el.height)} 
                      fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="2" 
                    />
                  )}

                  {/* TEXT */}
                  {el.type === 'text' && (
                    <text x={0} y={el.fontSize} fontSize={el.fontSize} fontWeight="600" fill="#1e293b" style={{ userSelect: 'none' }}>
                      {el.text}
                    </text>
                  )}
                </g>
              ))}

              {/* --- Ekipmanlar (Noktalar) --- */}
              {Object.entries(currentPlan.equipment_positions).map(([eqId, pos]) => {
                const eqInfo = equipments.find(e => e.id === eqId);
                
                // Müşteri için sadece görüntüleme, etkileşim yok
                return (
                  <g key={eqId} transform={`translate(${pos.x}, ${pos.y})`}>
                    {/* Dış Halka */}
                    <circle r="14" fill="#2563eb" stroke="white" strokeWidth="3" className="drop-shadow-sm" />
                    
                    {/* Ekipman Tipi Kısaltması (EFC -> EF) */}
                    <text x="0" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" style={{ userSelect: 'none' }}>
                      {eqInfo?.equipment_code.substring(0, 2) || 'EQ'}
                    </text>

                    {/* Alt Etiket (Tam Kod) */}
                    <rect x="-22" y="20" width="44" height="18" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1" className="shadow-sm" />
                    <text x="0" y="33" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#374151" style={{ userSelect: 'none' }}>
                      {eqInfo?.equipment_code || '??'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 3. Footer (Adres & İletişim) */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t flex justify-between items-center px-8 text-xs text-gray-500 z-20">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-full">
                <MapPin size={14} />
              </div>
              <span className="font-medium">{companySettings?.address || 'Adres bilgisi girilmemiş'}</span>
            </div>

            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                <Phone size={14} /> {companySettings?.phone}
              </span>
              <span className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                <Mail size={14} /> {companySettings?.email}
              </span>
              <span className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                <Globe size={14} /> {companySettings?.website}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FloorPlanViewer;