import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, MapPin, Phone, Mail, Globe } from 'lucide-react';

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

interface Equipment {
  id: string;
  equipment_code: string;
  equipment: { name: string; type: string };
}

interface CompanySettings {
  company_name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

interface FloorPlanPreviewProps {
  planId: string;
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

const FloorPlanPreview: React.FC<FloorPlanPreviewProps> = ({ planId, branchId }) => {
  const [loading, setLoading] = useState(true);
  const [planTitle, setPlanTitle] = useState('');
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [elements, setElements] = useState<FloorPlanElement[]>([]);
  const [equipmentPositions, setEquipmentPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [branchInfo, setBranchInfo] = useState<{ sube_adi: string; customer: { kisa_isim: string } } | null>(null);

  useEffect(() => {
    loadFloorPlan();
  }, [planId, branchId]);

  const loadFloorPlan = async () => {
    setLoading(true);
    try {
      // Şirket ayarları
      const { data: companyData } = await supabase.from('company_settings').select('*').single();
      if (companyData) setCompanySettings(companyData);

      // Şube bilgisi
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

      // Plan verisi
      const { data: planData } = await supabase
        .from('branch_floor_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planData) {
        setPlanTitle(planData.title || 'Kat Planı');
        setBackgroundUrl(planData.background_url);
        setElements(planData.elements || []);
        setEquipmentPositions(planData.equipment_positions || {});
      }

      // Ekipmanlar
      const { data: eqData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, equipment:equipment_id(name, type)')
        .eq('branch_id', branchId);

      const mappedEquipments = (eqData || []).map(eq => ({
        ...eq,
        equipment: Array.isArray(eq.equipment) ? eq.equipment[0] : eq.equipment
      }));
      setEquipments(mappedEquipments as any);
    } catch (error) {
      console.error('Kroki yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalize = (v: number, min = 1) => (Number.isFinite(v) ? Math.max(min, v) : min);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white shadow-2xl relative mx-auto" style={{ width: 1000, height: 800 }}>
      {/* Header */}
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
            {planTitle}
          </div>
          <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
            Yerleşim Planı
          </div>
        </div>
      </div>

      {/* Drawing Area */}
      <div className="absolute top-24 bottom-16 left-0 right-0 bg-gray-50 overflow-hidden">
        {backgroundUrl ? (
          <img
            src={backgroundUrl}
            className="absolute top-0 left-0 w-full h-full object-contain opacity-90 pointer-events-none select-none"
            alt="Plan Arkaplan"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        )}

        <svg width="100%" height="100%" className="absolute top-0 left-0">
          {elements.map((el) => (
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

          {Object.entries(equipmentPositions).map(([eqId, pos]) => {
            const eqInfo = equipments.find(e => e.id === eqId);
            const colorConfig = getEquipmentColor(eqInfo?.equipment.type, eqInfo?.equipment_code);
            const displayNum = eqInfo?.equipment_code.split('-').pop() || eqInfo?.equipment_code.slice(-2) || '?';

            return (
              <g key={eqId} transform={`translate(${pos.x}, ${pos.y})`}>
                <EquipmentShape shape={colorConfig.shape} color={colorConfig.bg} />

                <text x="0" y="0" textAnchor="middle" fill={colorConfig.text} fontSize="8" fontWeight="900" dy=".35em" style={{ userSelect: 'none' }}>
                  {displayNum}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t flex justify-between items-center px-8 z-20">
        <div className="flex items-center gap-1 text-[10px] text-gray-500 max-w-[30%]">
          <MapPin size={12} className="text-blue-600 flex-shrink-0" />
          <span className="truncate">{companySettings?.address || 'Adres bilgisi mevcut değil.'}</span>
        </div>

        {/* Legend */}
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
  );
};

export default FloorPlanPreview;
