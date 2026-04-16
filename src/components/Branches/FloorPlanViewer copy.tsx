import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Maximize2, ZoomIn, ZoomOut, MapPin, Phone, Mail, Globe,
  Loader2, Layers, ChevronDown, Calendar, AlertCircle, Download
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import html2canvas from 'html2canvas';
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

const EQUIPMENT_COLORS: Record<string, { bg: string; text: string; label: string; shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'pentagon' }> = {
  'kemirgen': { bg: '#ef4444', text: '#ffffff', label: 'Yem İstasyonu', shape: 'square' },
  'hasere': { bg: '#3b82f6', text: '#ffffff', label: 'EFK / Cihaz', shape: 'triangle' },
  'canli_yakalama': { bg: '#f59e0b', text: '#ffffff', label: 'Canlı Yakalama', shape: 'circle' },
  'feromon': { bg: '#10b981', text: '#ffffff', label: 'Feromonlu Tuzak', shape: 'diamond' },
  'default': { bg: '#6366f1', text: '#ffffff', label: 'Diğer', shape: 'pentagon' }
};

const EquipmentShape: React.FC<{ shape: string; color: string; isActive?: boolean }> = ({ shape, color, isActive }) => {
  const stroke = "white";
  const strokeWidth = "1.5";
  const fill = color;
  const className = "drop-shadow-sm";

  const renderBase = (isPulse = false) => {
    const props = isPulse
      ? { className: 'blinking-dot', fill: 'none', stroke: '#ef4444' }
      : { fill, stroke, strokeWidth, className };

    switch (shape) {
      case 'square':
        return <rect x="-9" y="-9" width="18" height="18" rx="2" {...props} />;
      case 'triangle':
        return <polygon points="0,-11 11,8 -11,8" {...props} />;
      case 'diamond':
        return <polygon points="0,-11 11,0 0,11 -11,0" {...props} />;
      case 'pentagon':
        return <polygon points="0,-11 11,-2 7,10 -7,10 -11,-2" {...props} />;
      default:
        return <circle r="9" {...props} />;
    }
  };

  return (
    <>
      {isActive && renderBase(true)}
      {renderBase(false)}
    </>
  );
};

const getEquipmentColor = (type?: string, code?: string) => {
  const t = (type || '').toLowerCase();
  const c = (code || '').toLowerCase();

  // Canlı Yakalama / Kapanlar (Öncelikli)
  if (t.includes('kapan') || t.includes('canli') || t.includes('yakalama') ||
    c.includes('kapan') || c.includes('canli') || c.includes('yakalama')) return EQUIPMENT_COLORS.canli_yakalama;

  // Kemirgen / Yem İstasyonları
  if (t.includes('yem') || t.includes('rodent') || t.includes('kemirgen') || t.includes('fare') ||
    c.includes('yem') || c.includes('rodent') || c.includes('kemirgen') || c.includes('fare')) return EQUIPMENT_COLORS.kemirgen;

  // EFK / Cihazlar
  if (t.includes('efk') || t.includes('sinek') || t.includes('hasere') ||
    c.includes('efk') || c.includes('sinek') || c.includes('hasere')) return EQUIPMENT_COLORS.hasere;

  // Feromon
  if (t.includes('feromon') || c.includes('feromon')) return EQUIPMENT_COLORS.feromon;

  return EQUIPMENT_COLORS.default;
};

const FloorPlanViewer: React.FC<ViewerProps> = ({ branchId }) => {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [scale, setScale] = useState(0.8);

  const paperRef = useRef<HTMLDivElement>(null);

  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [branchInfo, setBranchInfo] = useState<{ sube_adi: string; customer: { kisa_isim: string } } | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [activeEquipmentIds, setActiveEquipmentIds] = useState<Set<string>>(new Set());
  const [hoveredEquipment, setHoveredEquipment] = useState<{ id: string, x: number, y: number } | null>(null);

  useEffect(() => {
    if (branchId) {
      fetchAllData();
    }
  }, [branchId]);

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

      const { data: companyData } = await supabase.from('company_settings').select('*').single();
      if (companyData) setCompanySettings(companyData);

      const { data: branchData } = await supabase
        .from('branches')
        .select('sube_adi, customer:customer_id(kisa_isim)')
        .eq('id', branchId)
        .single();

      if (branchData) {
        setBranchInfo({
          sube_adi: branchData.sube_adi,
          customer: Array.isArray(branchData.customer) ? branchData.customer[0] : branchData.customer
        });
      }

      const { data: eqData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, equipment:equipment_id(name, type)')
        .eq('branch_id', branchId);

      const mappedEquipments = (eqData || []).map(eq => ({
        ...eq,
        equipment: Array.isArray(eq.equipment) ? eq.equipment[0] : eq.equipment
      }));
      setEquipments(mappedEquipments as any);

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

      const { data: visitData } = await supabase
        .from('visits')
        .select('id, visit_date, equipment_checks')
        .eq('branch_id', branchId)
        .eq('status', 'completed')
        .order('visit_date', { ascending: false })
        .limit(20);

      setVisits(visitData || []);

    } catch (error) {
      console.error("Veri çekme hatası:", error);
      toast.error("Veriler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = useCallback(async () => {
    if (!paperRef.current) return;

    setDownloading(true);
    try {
      // html2canvas captures the element as it appears in the DOM.
      // CSS transitions and transforms (like scale) can cause displacement of absolute elements or SVG parts.
      // We temporarily reset these to ensure coordinate accuracy during the capture.
      const originalTransform = paperRef.current.style.transform;
      const originalTransition = paperRef.current.style.transition;

      paperRef.current.style.transition = 'none';
      paperRef.current.style.transform = 'none';

      // Wait a frame to ensure the browser has applied the "no-transform" state
      await new Promise(resolve => requestAnimationFrame(resolve));

      const canvas = await html2canvas(paperRef.current, {
        scale: 2, // High resolution output scale
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Restore the original UI state
      paperRef.current.style.transform = originalTransform;
      paperRef.current.style.transition = originalTransition;

      const image = canvas.toDataURL("image/jpeg", 0.9);
      const link = document.createElement('a');
      link.download = `kroki-${currentPlanId}-${format(new Date(), 'dd-MM-yyyy')}.jpg`;
      link.href = image;
      link.click();

      toast.success("Kroki görseli başarıyla indirildi.");
    } catch (err) {
      console.error("Resim oluşturma hatası:", err);
      toast.error("Görsel oluşturulurken bir hata oluştu.");
    } finally {
      setDownloading(false);
    }
  }, [currentPlanId]);

  const currentPlan = plans.find(p => p.id === currentPlanId);
  const normalize = (v: number, min = 1) => (Number.isFinite(v) ? Math.max(min, v) : min);

  const renderTooltip = () => {
    if (!hoveredEquipment || !currentPlan) return null;

    const eqInfo = equipments.find(e => e.id === hoveredEquipment.id);
    if (!eqInfo) return null;

    const visit = visits.find(v => v.id === selectedVisitId);
    const checkData = visit?.equipment_checks[hoveredEquipment.id];
    const isActive = activeEquipmentIds.has(hoveredEquipment.id);

    // Fly counts if applicable
    const flyData: Record<string, number> = {};
    if (checkData) {
      const keys = ['karasinek', 'gok_sinek', 'metalik_sinek', 'meyve_sinegi', 'diger_sinek'];
      keys.forEach(key => {
        if (checkData[key]) {
          flyData[key] = Number(checkData[key]);
        }
      });
    }

    return (
      <div
        className="absolute z-50 bg-white/95 backdrop-blur-sm border shadow-xl rounded-lg p-3 pointer-events-none min-w-[200px]"
        style={{
          left: hoveredEquipment.x,
          top: hoveredEquipment.y - 10,
          transform: `scale(${1 / scale}) translate(-50%, -100%)`,
          transformOrigin: 'bottom center'
        }}
      >
        <div className="flex items-center gap-2 mb-2 border-b pb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getEquipmentColor(eqInfo.equipment.type, eqInfo.equipment_code).bg }}></div>
          <span className="font-bold text-gray-900">{eqInfo.equipment_code}</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Ekipman:</span>
            <span className="font-medium text-gray-700 text-right">{eqInfo.equipment.name}</span>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Durum:</span>
            <span className={`font-bold ${isActive ? 'text-red-600' : 'text-green-600'}`}>
              {isActive ? 'Aktivite Var' : 'Aktivite Yok'}
            </span>
          </div>

          {Object.keys(flyData).length > 0 && (
            <div className="mt-2 pt-2 border-t space-y-1">
              {Object.entries(flyData).map(([name, count]) => (
                <div key={name} className="flex justify-between text-[10px]">
                  <span className="text-gray-500 capitalize">{name.replace('_', ' ')}:</span>
                  <span className="font-bold text-gray-800">{count}</span>
                </div>
              ))}
            </div>
          )}

          {!selectedVisitId && (
            <div className="mt-1 text-[10px] text-gray-400 italic">
              Aktivite verisi için bir ziyaret seçin
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/95"></div>
      </div>
    );
  };

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

          <div className="flex items-center gap-2 border-l pl-4 ml-2 flex-shrink-0">
            <Calendar size={16} className={selectedVisitId ? "text-blue-600" : "text-gray-400"} />
            <div className="relative">
              <select
                value={selectedVisitId}
                onChange={(e) => setSelectedVisitId(e.target.value)}
                className={`appearance-none border text-sm py-1.5 pl-3 pr-8 rounded leading-tight focus:outline-none cursor-pointer font-medium transition-colors ${selectedVisitId
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

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span className="hidden sm:inline">JPEG İndir</span>
          </button>

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

      <div className="flex-1 w-full overflow-auto bg-gray-200/50 p-8 flex justify-center items-start">
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
          <div className="absolute top-0 left-0 right-0 h-24 bg-white/95 border-b px-8 flex justify-between items-center z-20">
            <div className="flex items-center gap-5">
              {companySettings?.logo_url ? (
                <img
                  src={companySettings.logo_url}
                  className="h-16 object-contain max-w-[200px]"
                  alt="Logo"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="h-16 flex flex-col justify-center">
                  <h1 className="text-xl font-bold uppercase text-gray-900">{companySettings?.company_name || 'İlaçlama Firması'}</h1>
                </div>
              )}

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

          <div className="absolute top-24 bottom-16 left-0 right-0 bg-gray-50 overflow-hidden">
            {currentPlan.background_url ? (
              <div
                className="absolute top-0 left-0 w-full h-full opacity-90 pointer-events-none select-none"
                style={{
                  backgroundImage: `url(${currentPlan.background_url})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />
            ) : (
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            )}

            <svg width="100%" height="100%" className="absolute top-0 left-0">
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

              {Object.entries(currentPlan.equipment_positions).map(([eqId, pos]) => {
                const eqInfo = equipments.find(e => e.id === eqId);
                const isActive = activeEquipmentIds.has(eqId);
                const colorConfig = getEquipmentColor(eqInfo?.equipment.type, eqInfo?.equipment_code);
                const displayNum = eqInfo?.equipment_code.split('-').pop() || eqInfo?.equipment_code.slice(-2) || '?';

                return (
                  <g
                    key={eqId}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onMouseEnter={() => setHoveredEquipment({ id: eqId, x: pos.x, y: pos.y })}
                    onMouseLeave={() => setHoveredEquipment(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <EquipmentShape
                      shape={colorConfig.shape}
                      color={colorConfig.bg}
                      isActive={isActive}
                    />

                    <text x="0" y="0" textAnchor="middle" fill={colorConfig.text} fontSize="8" fontWeight="900" dy=".35em" style={{ userSelect: 'none' }}>
                      {displayNum}
                    </text>
                  </g>
                );
              })}
            </svg>
            {renderTooltip()}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t flex justify-between items-center px-8 z-20">
            <div className="flex items-center gap-1 text-[10px] text-gray-500 max-w-[30%]">
              <MapPin size={12} className="text-blue-600 flex-shrink-0" />
              <span className="truncate">{companySettings?.address || 'Adres bilgisi mevcut değil.'}</span>
            </div>

            <div className="flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
              {Object.entries(EQUIPMENT_COLORS).filter(([key]) => key !== 'default').map(([key, config]) => (
                <div key={key} className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="-11 -11 22 22">
                    <EquipmentShape shape={config.shape} color={config.bg} />
                  </svg>
                  <span className="text-[10px] font-bold text-gray-700">{config.label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              {companySettings?.phone && (
                <span className="flex items-center gap-1.5"><Phone size={12} /> {companySettings.phone}</span>
              )}
              {companySettings?.email && (
                <span className="flex items-center gap-1.5"><Mail size={12} /> {companySettings.email}</span>
              )}
              {companySettings?.website && (
                <span className="flex items-center gap-1.5"><Globe size={12} /> {companySettings.website}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorPlanViewer;