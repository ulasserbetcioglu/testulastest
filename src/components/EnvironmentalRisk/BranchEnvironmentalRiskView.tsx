import React, { useState, useEffect } from 'react';
import { Loader2, FileDown, Leaf, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
    PEST_ENV_ROWS,
    calculateEnvScore,
    getEnvRiskColor,
    getEnvAverages,
    type EnvDataMap,
} from '../../data/environmentalRiskCategories';
import { generateEnvironmentalRiskAssessmentPdf, type EnvRiskPdfInput } from '../../utils/environmentalRiskPdfGenerator';
import { format } from 'date-fns';

interface EnvAssessment {
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
    risk_data: EnvDataMap;
}

interface Props {
    branchId: string;
}

const BranchEnvironmentalRiskView: React.FC<Props> = ({ branchId }) => {
    const [assessment, setAssessment] = useState<EnvAssessment | null>(null);
    const [loading, setLoading] = useState(true);
    const [companySettings, setCompanySettings] = useState<any>(null);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const [ass, set] = await Promise.all([
                    supabase
                        .from('branch_environmental_risk_assessments')
                        .select('*')
                        .eq('branch_id', branchId)
                        .eq('status', 'active')
                        .order('assessment_date', { ascending: false })
                        .limit(1)
                        .maybeSingle(),
                    supabase.from('company_settings').select('*').maybeSingle()
                ]);

                setAssessment(ass.data);
                setCompanySettings(set.data);
            } catch (error) {
                console.error('Veri cekme hatasi:', error);
            } finally {
                setLoading(false);
            }
        };
        if (branchId) fetch();
    }, [branchId]);

    const handleExportPdf = () => {
        if (!assessment) return;
        const input: EnvRiskPdfInput = {
            ...assessment,
            riskData: assessment.risk_data,
            companyLogo: companySettings?.logo_url
        };
        generateEnvironmentalRiskAssessmentPdf(input);
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-green-600" />
            </div>
        );
    }

    if (!assessment) {
        return (
            <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                <Leaf className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500 font-medium">Bu şube için çevre risk değerlendirmesi bulunmuyor.</p>
            </div>
        );
    }

    const riskData = assessment.risk_data || {};
    const averages = getEnvAverages(riskData);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full shadow-sm text-green-600">
                        <Leaf className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-green-900">Çevre Risk Değerlendirmesi</h4>
                        <p className="text-xs text-green-700">Tarih: {format(new Date(assessment.assessment_date), 'dd.MM.yyyy')} | Bölüm: {assessment.division || '-'}</p>
                    </div>
                </div>
                <button
                    onClick={handleExportPdf}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                    <FileDown size={16} /> PDF İndir
                </button>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700 border-b">
                            <tr>
                                <th className="p-3 text-left">Zararlı Türü</th>
                                <th className="p-3 text-center w-24">Hijyen</th>
                                <th className="p-3 text-center w-24">Yalıtım</th>
                                <th className="p-3 text-center w-24">Depolama</th>
                                <th className="p-3 text-center w-24">Gözlem</th>
                                <th className="p-3 text-center w-24 bg-gray-100 font-bold text-gray-600">Çevre Ort.</th>
                                <th className="p-3 text-center w-24 text-red-600 font-bold">Popülasyon</th>
                                <th className="p-3 text-center w-32 font-bold">RİSK SKORU</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {PEST_ENV_ROWS.map(row => {
                                const d = riskData[row.key] || { hygiene: 0, insulation: 0, storage: 0, monitoring: 0, population: 0 };
                                const envTotal = d.hygiene + d.insulation + d.storage + d.monitoring;
                                const score = calculateEnvScore(d);
                                const style = getEnvRiskColor(score);

                                return (
                                    <tr key={row.key} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-3 font-medium text-gray-800">
                                            {row.label}
                                            <span className="text-xs text-gray-400 block font-normal">{row.labelEn}</span>
                                        </td>
                                        <td className="p-3 text-center text-gray-600">{d.hygiene}</td>
                                        <td className="p-3 text-center text-gray-600">{d.insulation}</td>
                                        <td className="p-3 text-center text-gray-600">{d.storage}</td>
                                        <td className="p-3 text-center text-gray-600">{d.monitoring}</td>
                                        <td className="p-3 text-center bg-gray-50 font-bold text-gray-700">{envTotal}</td>
                                        <td className="p-3 text-center font-bold text-red-600 bg-red-50">{d.population}</td>
                                        <td className="p-3 text-center">
                                            <span
                                                className="inline-block w-full py-1 px-2 rounded font-bold text-xs"
                                                style={{ backgroundColor: style.bg, color: style.text }}
                                            >
                                                {score} - {style.label.split(' ')[0]}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t font-bold text-gray-700">
                            <tr>
                                <td className="p-3">ORTALAMALAR</td>
                                <td className="p-3 text-center">{averages.avgH}</td>
                                <td className="p-3 text-center">{averages.avgI}</td>
                                <td className="p-3 text-center">{averages.avgS}</td>
                                <td className="p-3 text-center">{averages.avgM}</td>
                                <td className="p-3 text-center">-</td>
                                <td className="p-3 text-center">{averages.avgP}</td>
                                <td className="p-3 text-center">{averages.avgScore}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                    <span className="font-bold text-gray-700">Hesaplama Yöntemi: </span>
                    (Hijyen + Yalıtım + Depolama + Gözlem) x Popülasyon = RİSK SKORU
                    <br />
                    <span className="font-medium mt-1 inline-block">Risk Seviyeleri: </span>
                    <span className="mx-1 font-bold text-green-700">0-6 Düşük</span> |
                    <span className="mx-1 font-bold text-yellow-700">7-12 Orta</span> |
                    <span className="mx-1 font-bold text-orange-700">13-24 Yüksek</span> |
                    <span className="mx-1 font-bold text-red-700">25+ Çok Yüksek</span>
                </div>
            </div>
        </div>
    );
};

export default BranchEnvironmentalRiskView;
