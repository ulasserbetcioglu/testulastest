import React, { useState, useEffect } from 'react';
import { Loader2, FileDown, Bug, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  PEST_CATEGORIES,
  getRiskScore,
  getRiskScoreColor,
  getCategoryAverage,
  type PestDataMap,
} from '../../data/pestRiskCategories';
import { generatePestRiskAssessmentPdf, type PestRiskPdfInput } from '../../utils/pestRiskPdfGenerator';

interface Assessment {
  id: string;
  customer_name: string;
  customer_address: string;
  division: string;
  assessment_date: string;
  responsible_person: string;
  customer_responsible: string;
  document_number: string;
  revision_number: string;
  revision_date: string;
  pest_data: PestDataMap;
}

interface Props {
  branchId: string;
}

const BranchPestRiskView: React.FC<Props> = ({ branchId }) => {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('branch_pest_risk_assessments')
        .select('*')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('assessment_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      setAssessment(data);
      setLoading(false);
    };
    if (branchId) fetch();
  }, [branchId]);

  const handleExportPdf = () => {
    if (!assessment) return;
    const input: PestRiskPdfInput = {
      customerName: assessment.customer_name,
      customerAddress: assessment.customer_address,
      division: assessment.division,
      assessmentDate: assessment.assessment_date,
      responsiblePerson: assessment.responsible_person,
      customerResponsible: assessment.customer_responsible,
      documentNumber: assessment.document_number,
      revisionNumber: assessment.revision_number,
      revisionDate: assessment.revision_date,
      pestData: assessment.pest_data || {},
    };
    generatePestRiskAssessmentPdf(input);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-lg">
        <Bug className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p className="text-gray-500 font-medium">Bu sube icin risk degerlendirmesi bulunmuyor.</p>
      </div>
    );
  }

  const pestData = assessment.pest_data || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-amber-50 p-4 rounded-lg border border-amber-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full shadow-sm text-amber-600">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-amber-900">Zararli Risk Degerlendirmesi</h4>
            <p className="text-xs text-amber-700">Tarih: {assessment.assessment_date} | Bolum: {assessment.division || '-'}</p>
          </div>
        </div>
        <button
          onClick={handleExportPdf}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
        >
          <FileDown size={16} /> PDF Indir
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PEST_CATEGORIES.map(cat => {
          const catData = pestData[cat.key];
          const avg = getCategoryAverage(catData);
          const avgColor = getRiskScoreColor(Math.round(avg.avgScore));
          const hasData = catData && Object.values(catData).some(p => p.pop > 0 || p.risk > 0);

          if (!hasData) return null;

          return (
            <div key={cat.key} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-gray-800">{cat.label}</span>
                  <span className="text-xs text-gray-400 ml-1.5">({cat.labelEn})</span>
                </div>
                {avg.avgScore > 0 && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: avgColor.bg, color: avgColor.text }}
                  >
                    {avg.avgScore.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {cat.pests.map(pest => {
                  const d = catData?.[pest.key] || { pop: 0, risk: 0 };
                  const score = getRiskScore(d.pop, d.risk);
                  if (score === 0 && d.pop === 0) return null;
                  const sColor = getRiskScoreColor(score);
                  return (
                    <div key={pest.key} className="px-3 py-1.5 flex items-center justify-between text-sm hover:bg-gray-50">
                      <span className="text-gray-700">{pest.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">P:{d.pop} R:{d.risk}</span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded min-w-[28px] text-center"
                          style={{ backgroundColor: sColor.bg, color: sColor.text }}
                        >
                          {score}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500">
        <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-medium">Skor Anlamlari: </span>
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-1" style={{ backgroundColor: '#C6EFCE', color: '#006100' }}>1-7 Dusuk</span>
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-1" style={{ backgroundColor: '#FFEB9C', color: '#9C6500' }}>8-14 Orta</span>
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: '#FFC7CE', color: '#9C0006' }}>15-25 Yuksek</span>
        </div>
      </div>
    </div>
  );
};

export default BranchPestRiskView;
