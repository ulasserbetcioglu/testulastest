import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { format } from 'date-fns';

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
      try {
        const { data: companyData } = await supabase.from('company_settings').select('*').single();
        if (companyData) setCompanySettings(companyData);
      } catch (e) {
        console.error('Şirket ayarları hatası:', e);
      }

      // Şube bilgisi
      const { data: branchData } = await supabase
        .from('branches')
        .select('sube_adi, customer:customer_id(kisa_isim)')
        .eq('id', branchId)
        .single();
      if (branchData) setBranchInfo(branchData);

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

      setEquipments(eqData || []);
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

            return (
              <g key={eqId} transform={`translate(${pos.x}, ${pos.y})`}>
                <circle
                  r="14"
                  fill="#2563eb"
                  stroke="white"
                  strokeWidth="3"
                  className="drop-shadow-sm"
                />

                <text x="0" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" style={{ userSelect: 'none' }}>
                  {eqInfo?.equipment_code.substring(0, 2) || 'EQ'}
                </text>

                <rect x="-22" y="20" width="44" height="18" rx="4" fill="white" stroke="#e5e7eb" strokeWidth={1} className="shadow-sm" />
                <text x="0" y="33" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#374151" style={{ userSelect: 'none' }}>
                  {eqInfo?.equipment_code || '??'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer */}
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
  );
};

export default FloorPlanPreview;
