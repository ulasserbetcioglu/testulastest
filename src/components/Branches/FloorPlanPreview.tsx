import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

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

interface FloorPlanPreviewProps {
  planId: string;
  branchId: string;
}

const FloorPlanPreview: React.FC<FloorPlanPreviewProps> = ({ planId, branchId }) => {
  const [loading, setLoading] = useState(true);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [elements, setElements] = useState<FloorPlanElement[]>([]);
  const [equipmentPositions, setEquipmentPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  useEffect(() => {
    loadFloorPlan();
  }, [planId, branchId]);

  const loadFloorPlan = async () => {
    setLoading(true);
    try {
      const { data: planData } = await supabase
        .from('branch_floor_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planData) {
        setBackgroundUrl(planData.background_url);
        setElements(planData.elements || []);
        setEquipmentPositions(planData.equipment_positions || {});
      }

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
    <div className="relative bg-white rounded-lg overflow-hidden border-2 border-gray-200" style={{ width: '100%', aspectRatio: '4/3' }}>
      <div className="absolute inset-0 bg-gray-50">
        {backgroundUrl ? (
          <img
            src={backgroundUrl}
            className="absolute top-0 left-0 w-full h-full object-contain opacity-90"
            alt="Kroki Arkaplan"
          />
        ) : (
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        )}

        <svg width="100%" height="100%" className="absolute top-0 left-0" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid meet">
          {elements.map((el) => (
            <g key={el.id} transform={`translate(${el.x}, ${el.y})`}>
              {el.type === 'wall' && <rect width={normalize(el.width)} height={normalize(el.height)} fill="#334155" />}
              {el.type === 'door' && <rect width={normalize(el.width)} height={normalize(el.height)} fill="#a16207" />}
              {el.type === 'window' && <rect width={normalize(el.width)} height={normalize(el.height)} fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="2" />}
              {el.type === 'room' && (
                <>
                  <rect width={normalize(el.width)} height={normalize(el.height)} fill="#f8fafc" fillOpacity={0.6} stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
                  <text x={5} y={20} fontSize={el.fontSize} fontWeight="bold" fill="#475569">{el.text}</text>
                </>
              )}
              {el.type === 'text' && (
                <text x={0} y={el.fontSize} fontSize={el.fontSize} fontWeight="600" fill="#1e293b">{el.text}</text>
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

                <text x="0" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="900">
                  {eqInfo?.equipment_code.substring(0, 2) || 'EQ'}
                </text>

                <rect x="-22" y="20" width="44" height="18" rx="4" fill="white" stroke="#e5e7eb" strokeWidth={1} className="shadow-sm" />
                <text x="0" y="33" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#374151">
                  {eqInfo?.equipment_code || '??'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default FloorPlanPreview;
