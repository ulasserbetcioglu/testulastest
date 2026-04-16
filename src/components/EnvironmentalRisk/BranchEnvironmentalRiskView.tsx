import React, { useState, useEffect } from 'react';
import { Loader2, FileDown, Leaf, AlertTriangle, Brain, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
    PEST_ENV_ROWS,
    calculateEnvScore,
    getEnvRiskColor,
    getEnvAverages,
    getEmptyEnvData,
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
    ai_generated?: boolean;
}

interface Props {
    branchId: string;
    branchData?: {
        sube_adi?: string;
        sehir?: string;
        adres?: string;
        latitude?: number;
        longitude?: number;
        customer_id?: string;
    };
}

const BranchEnvironmentalRiskView: React.FC<Props> = ({ branchId, branchData }) => {
    const [assessment, setAssessment] = useState<EnvAssessment | null>(null);
    const [loading, setLoading] = useState(true);
    const [companySettings, setCompanySettings] = useState<any>(null);
    const [generating, setGenerating] = useState(false);
    const [genStatus, setGenStatus] = useState('');

    const loadData = async () => {
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

    useEffect(() => {
        if (branchId) loadData();
    }, [branchId]);

    const handleExportPdf = () => {
        if (!assessment) return;
        const input: EnvRiskPdfInput = {
            ...assessment,
            riskData: assessment.risk_data,
            companyLogo: companySettings?.logo_url,
            branding: companySettings ? {
                company_name: companySettings.name,
                address: companySettings.address,
                phone: companySettings.phone,
                email: companySettings.email,
                website: companySettings.website
            } : undefined
        };
        generateEnvironmentalRiskAssessmentPdf(input);
    };

    const generateWithAI = async () => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) { alert('VITE_GEMINI_API_KEY tanımlı değil.'); return; }
        setGenerating(true);
        setGenStatus('Şube ve müşteri bilgileri hazırlanıyor...');

        try {
            // Fetch customer info if not already available
            let customerName = branchData?.sube_adi || 'Bilinmiyor';
            let customerCity = branchData?.sehir || '';
            let customerAddr = branchData?.adres || '';
            let cuLat = branchData?.latitude;
            let cuLon = branchData?.longitude;

            if (branchData?.customer_id) {
                const { data: cust } = await supabase
                    .from('customers')
                    .select('kisa_isim, cari_isim, sehir')
                    .eq('id', branchData.customer_id)
                    .maybeSingle();
                if (cust) customerName = cust.cari_isim || cust.kisa_isim || customerName;
            }

            const koordinat = cuLat ? `${cuLat.toFixed(5)}, ${cuLon?.toFixed(5)}` : 'Belirtilmemiş';

            setGenStatus('Gemini AI çevre risk analizi yapıyor...');

            // Structured prompt asking Gemini for exact JSON
            const prompt = `Sen bir profesyonel haşere kontrol uzmanısın. Aşağıdaki şubeye ait çevresel risk değerlendirmesini yap ve sonucu SADECE JSON formatında ver.

ŞUBE BİLGİLERİ:
- Şube/Müşteri: ${customerName}
- Şehir: ${customerCity || 'Belirtilmemiş'}
- Adres: ${customerAddr || 'Belirtilmemiş'}
- Koordinat: ${koordinat}
- Sektör: Firma isminden sektörü tahmin et (restoran, otel, fabrika, market, okul vb.)

GÖREV:
Koordinat/şehir itibarıyla bölgenin iklim ve çevre koşullarını değerlendirerek aşağıdaki 13 zararlı türü için risk skorları belirle.

Her zararlı için şu 5 değeri 0-5 arası (tam sayı) olarak belirle:
- hygiene: Hijyen risk faktörü (0=mükemmel, 5=çok kötü)
- insulation: Yalıtım/izolasyon risk (0=mükemmel, 5=çok kötü)
- storage: Depolama risk faktörü (0=yok, 5=çok yüksek)
- monitoring: Gözlem/takip risk (0=kolay, 5=çok zor)
- population: Popülasyon yoğunluğu (0=yok, 5=çok yüksek)

Skor hesabı: (hygiene + insulation + storage + monitoring) × population = Risk Skoru

JSON formatı (başka hiçbir şey yazma, sadece JSON):
{
  "cockroach": {"hygiene":X,"insulation":X,"storage":X,"monitoring":X,"population":X},
  "rodent": {"hygiene":X,"insulation":X,"storage":X,"monitoring":X,"population":X},
  "ant": {"hygiene":X,"insulation":X,"storage":X,"monitoring":X,"population":X},
  "fly": {"hygiene":X,"insulation":X,"storage":X,"monitoring":X,"population":X},
  "mosquito": {"hygiene":X,"insulation":X,"storage":X,"monitoring":X,"population":X},
  "moth": {"hygiene":X,"insulation":X,"storage":X,"monitoring":X,"population":X},
  "spider": {"hygiene":X,"insulation":X,"storage":X,"monitoring":X,"population":X},
  "silverfish": {"hygiene":X,"insulation":X,"storage":X,"monitoring":X,"population":X},
  "flea": {"hygiene":X,"insulation":X,"storage":X,"monitoring":X,"population":X},
  "tick": {"hygiene":X,"insulation":X,"storage":X,"monitoring":X,"population":X},
  "bedbug": {"hygiene":X,"insulation":X,"storage":X,"monitoring":X,"population":X},
  "scorpion": {"hygiene":X,"insulation":X,"storage":X,"monitoring":X,"population":X},
  "bird": {"hygiene":X,"insulation":X,"storage":X,"monitoring":X,"population":X}
}`;

            // Retry up to 3 times for 429/503
            let resp: Response | null = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                resp = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
                            safetySettings: [
                                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                            ]
                        })
                    }
                );
                if (resp.status === 429 || resp.status === 503) {
                    if (attempt < 3) {
                        setGenStatus(`Sunucu yoğun, ${attempt * 5}sn bekleniyoor... (${attempt}/3)`);
                        await new Promise(r => setTimeout(r, attempt * 5000));
                        continue;
                    }
                    throw new Error('Sunucu geçici olarak müsait değil. Lütfen tekrar deneyin.');
                }
                break;
            }
            if (!resp) throw new Error('İstek başlatılamadı.');

            const result = await resp.json();
            const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Extract JSON from response (strip markdown code blocks if any)
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('AI geçerli JSON döndürmedi. Tekrar deneyin.');

            const riskData: EnvDataMap = JSON.parse(jsonMatch[0]);

            // Validate all keys present and clamp values 0-5
            const validData: EnvDataMap = getEmptyEnvData();
            for (const key of Object.keys(validData)) {
                if (riskData[key]) {
                    validData[key] = {
                        hygiene: Math.min(5, Math.max(0, Math.round(riskData[key].hygiene || 0))),
                        insulation: Math.min(5, Math.max(0, Math.round(riskData[key].insulation || 0))),
                        storage: Math.min(5, Math.max(0, Math.round(riskData[key].storage || 0))),
                        monitoring: Math.min(5, Math.max(0, Math.round(riskData[key].monitoring || 0))),
                        population: Math.min(5, Math.max(0, Math.round(riskData[key].population || 0))),
                    };
                }
            }

            // INSERT FIRST — only archive old records AFTER successful insert
            const today = new Date().toISOString().split('T')[0];
            const { error: insErr } = await supabase
                .from('branch_environmental_risk_assessments')
                .insert({
                    branch_id: branchId,
                    customer_id: branchData?.customer_id || null,
                    customer_name: customerName,
                    customer_address: customerAddr || customerCity,
                    division: customerCity || 'Genel',
                    assessment_date: today,
                    responsible_person: companySettings?.company_name || 'İlaçlamatik AI',
                    customer_responsible: customerName,
                    document_number: `AI-${branchId.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`,
                    revision_number: '1',
                    revision_date: today,
                    status: 'active',
                    risk_data: validData,
                })

            if (insErr) throw new Error(insErr.message);

            // NOW archive old records — new record is safely saved
            await supabase
                .from('branch_environmental_risk_assessments')
                .update({ status: 'archived' })
                .eq('branch_id', branchId)
                .eq('status', 'active')
                .neq('assessment_date', today);

            // Reload from DB
            await loadData();
            setGenStatus('');
        } catch (err: any) {
            alert(`AI Çevre Risk Hatası: ${err.message}`);
            setGenStatus('');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-green-600" />
            </div>
        );
    }

    const riskData = assessment?.risk_data || {};
    const averages = assessment ? getEnvAverages(riskData) : null;

    return (
        <div className="space-y-4">
            {/* Header bar */}
            <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full shadow-sm text-green-600">
                        <Leaf className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-green-900">Çevre Risk Değerlendirmesi</h4>
                        {assessment ? (
                            <p className="text-xs text-green-700">
                                Tarih: {format(new Date(assessment.assessment_date), 'dd.MM.yyyy')}
                                {assessment.ai_generated && <span className="ml-2 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs font-semibold">🤖 AI Üretildi</span>}
                                {assessment.division ? ` | Bölüm: ${assessment.division}` : ''}
                            </p>
                        ) : (
                            <p className="text-xs text-green-700">Henüz değerlendirme yok</p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {assessment && (
                        <button
                            onClick={handleExportPdf}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <FileDown size={15} /> PDF İndir
                        </button>
                    )}
                    <button
                        onClick={generateWithAI}
                        disabled={generating}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-60"
                    >
                        {generating ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        {generating ? 'AI Oluşturuyor...' : 'AI ile Oluştur'}
                    </button>
                </div>
            </div>

            {/* AI generation status */}
            {generating && genStatus && (
                <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 border border-purple-100 rounded-lg text-sm text-purple-700">
                    <Brain size={16} className="animate-pulse" />
                    <span>{genStatus}</span>
                </div>
            )}

            {/* Empty state */}
            {!assessment && !generating && (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                    <Leaf className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500 font-medium">Bu şube için çevre risk değerlendirmesi bulunmuyor.</p>
                    <p className="text-xs text-gray-400 mt-1">
                        <strong>"AI ile Oluştur"</strong> butonuna basarak koordinat ve müşteri bilgisine göre otomatik oluşturun.
                    </p>
                </div>
            )}

            {/* Risk table */}
            {assessment && (
                <>
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
                                {averages && (
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
                                )}
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
                            {assessment.ai_generated && (
                                <span className="block mt-1 text-purple-600">🤖 Bu değerlendirme İLAÇLAMATİK AI tarafından şube koordinatları ve sektör analizine göre otomatik üretilmiştir.</span>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default BranchEnvironmentalRiskView;
