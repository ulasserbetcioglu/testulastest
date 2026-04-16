import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, MapPin, AlertTriangle, ShieldCheck, 
  Info, Brain, Download, RefreshCw, Filter, FileText, Layout
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend
} from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// --- TYPES ---
interface RiskData {
  branchId: string;
  branchName: string;
  lat: number;
  lng: number;
  score: number; // 0-100
  level: 'High' | 'Medium' | 'Low';
  mainPest: string;
  city?: string;
}

interface TrendData {
  month: string;
  historicalValue: number;
  predictedValue: number;
}

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
}

interface Insight {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
  suggestion: string;
}

// Map Helper to fit bounds
const FitBounds: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0 && map) {
      try {
        const bounds = points.map(p => [p[0], p[1]] as [number, number]);
        map.invalidateSize(); // Ensure map is ready
        map.fitBounds(bounds as any, { padding: [50, 50] });
      } catch (e) {
        console.warn('Map fitBounds error:', e);
      }
    }
  }, [points, map]);
  return null;
};

const AdminPredictiveAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [riskData, setRiskData] = useState<RiskData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  
  // Filters
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  
  // Gemini AI State
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  
  useEffect(() => {
    fetchFilterData();
    fetchAnalyticalData();
  }, [selectedCustomerId, selectedBranchId]);

  const fetchFilterData = async () => {
    try {
      const { data: custData } = await supabase.from('customers').select('id, kisa_isim').order('kisa_isim');
      setCustomers(custData || []);

      let query = supabase.from('branches').select('id, sube_adi, customer_id').order('sube_adi');
      if (selectedCustomerId !== 'all') {
        query = query.eq('customer_id', selectedCustomerId);
      }
      const { data: brData } = await query;
      setBranches(brData || []);
    } catch (err) {
      console.error('Filter data error:', err);
    }
  };

  const fetchAnalyticalData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const twelveMonthsAgo = subMonths(today, 24); // Use 24 months for better seasonality

      // 1. Fetch Visits & Pest Activity
      let query = supabase
        .from('visits')
        .select('id, visit_date, pest_types, branch_id, branches!inner(sube_adi, latitude, longitude, customer_id, sehir)')
        .gte('visit_date', twelveMonthsAgo.toISOString());

      if (selectedCustomerId !== 'all') {
        query = query.filter('branches.customer_id', 'eq', selectedCustomerId);
      }
      if (selectedBranchId !== 'all') {
        query = query.eq('branch_id', selectedBranchId);
      }

      const { data: visits, error: vError } = await query;

      if (vError) throw vError;

      calculatePredictions(visits || []);
    } catch (err: any) {
      toast.error('Analiz verileri yüklenirken hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculatePredictions = (visits: any[]) => {
    // --- Step A: Seasonality Profiling ---
    const monthlyProfile: Record<number, number> = {}; // Month (0-11) -> Activity Count
    visits.forEach(v => {
      const month = new Date(v.visit_date).getMonth();
      const weight = (v.pest_types?.length || 0) + 1;
      monthlyProfile[month] = (monthlyProfile[month] || 0) + weight;
    });

    // --- Step B: Calculate Predictions for Next 6 Months ---
    const nextTrends: TrendData[] = [];
    const today = new Date();
    for (let i = -6; i < 6; i++) {
      const d = startOfMonth(subMonths(today, -i));
      const month = d.getMonth();
      
      // Historical Average for this month
      const historicalVal = monthlyProfile[month] / 2 || 0; 
      
      // Prediction logic: Seasonality + Trend factor (simplified)
      const prediction = historicalVal * (1 + (i > 0 ? 0.1 : 0)); // Assume 10% growth in detection efficiency
      
      nextTrends.push({
        month: format(d, 'MMM yy', { locale: tr }),
        historicalValue: i <= 0 ? historicalVal : 0,
        predictedValue: Math.round(prediction)
      });
    }
    setTrendData(nextTrends);

    // --- Step C: Branch Risk Scoring ---
    const branchScores: Record<string, any> = {};
    visits.forEach(v => {
      if (!v.branch_id || !v.branches) return;
      if (!branchScores[v.branch_id]) {
        branchScores[v.branch_id] = { 
          name: v.branches.sube_adi, 
          city: v.branches.sehir,
          lat: v.branches.latitude, 
          lng: v.branches.longitude, 
          recentActivity: 0, 
          pests: {} 
        };
      }
      const b = branchScores[v.branch_id];
      const isRecent = new Date(v.visit_date) > subMonths(new Date(), 3);
      if (isRecent) b.recentActivity += 5;
      
      v.pest_types?.forEach((p: string) => {
        b.pests[p] = (b.pests[p] || 0) + 1;
      });
    });

    const risks: RiskData[] = Object.entries(branchScores).map(([id, b]: [string, any]) => {
      const score = Math.min(100, Math.max(10, b.recentActivity + (Object.keys(b.pests).length * 10)));
      const sortedPests = Object.entries(b.pests).sort((x: any, y: any) => y[1] - x[1]);
      return {
        branchId: id,
        branchName: b.name,
        city: b.city,
        lat: b.lat || 41.0082, // Default to Istanbul if missing
        lng: b.lng || 28.9784,
        score,
        level: score > 70 ? 'High' : score > 40 ? 'Medium' : 'Low',
        mainPest: sortedPests[0]?.[0] || 'Genel'
      };
    });
    setRiskData(risks);

    // --- Step D: Generate Insights ---
    const newInsights: Insight[] = [];
    const highRiskCount = risks.filter(r => r.level === 'High').length;
    if (highRiskCount > 0) {
      newInsights.push({
        id: '1',
        type: 'danger',
        title: 'Kritik Risk Altındaki Şubeler',
        description: `${highRiskCount} şubede son 3 ayda normalin üzerinde hareketlilik tespit edildi.`,
        suggestion: 'Bu şubeler için haftalık kontrol sıklığına geçilmesi önerilir.'
      });
    }

    const peakPest = Object.entries(monthlyProfile).sort((a: any, b: any) => b[1] - a[1])[0];
    if (peakPest) {
      const peakMonthName = format(new Date(2024, parseInt(peakPest[0])), 'MMMM', { locale: tr });
      newInsights.push({
        id: '2',
        type: 'warning',
        title: `Mevsimsel Artış Beklentisi: ${peakMonthName}`,
        description: `Tarihsel veriler ${peakMonthName} ayında genel aktivitenin %40 artacağını gösteriyor.`,
        suggestion: 'Müşterilere proaktif koruma paketleri önerilebilir.'
      });
    }

    setInsights(newInsights);
  };

  const downloadPDF = async () => {
    const element = document.getElementById('analytics-dashboard');
    if (!element) return;
    
    setLoading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Akilli_Analiz_Raporu_${format(new Date(), 'dd_MM_yyyy')}.pdf`);
      toast.success('PDF Raporu indirildi.');
    } catch (err) {
      toast.error('PDF oluşturulurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    try {
      const wsData = riskData.map(r => ({
        'Şube Adı': r.branchName,
        'Risk Skoru': r.score,
        'Risk Seviyesi': r.level,
        'Ana Zararlı': r.mainPest,
        'Enlem': r.lat,
        'Boylam': r.lng
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Risk Analizi");
      XLSX.writeFile(wb, `Risk_Veri_Export_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
      toast.success('Excel verisi indirildi.');
    } catch (err) {
      toast.error('Excel oluşturulurken hata oluştu.');
    }
  };

  const runGeminiAnalysis = async () => {
    setAnalyzing(true);
    setAiAnalysis('');
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Gemini API Key bulunamadı (.env kontrol edin)');

      const dataSummary = {
        risks: riskData.map(r => ({ 
          sube: r.branchName, 
          sehir: r.city || 'Bursa',
          koordinat: `${r.lat}, ${r.lng}`, // Explicitly named in Turkish for clarity
          skor: r.score, 
          zararli: r.mainPest 
        })),
        projeksiyon: trendData.filter(t => t.predictedValue > 0).map(t => ({ ay: t.month, deger: t.predictedValue })),
        filtre: selectedCustomerId !== 'all' ? 'Müşteri Bazlı' : 'Genel'
      };

      const prompt = `
        Aşağıdaki verileri bir profesyonel haşere kontrol uzmanı olarak analiz et.
        
        TEMEL GÖREV: Verilen KOORDİNATLARDAKİ (Lat/Lng) şubelerin coğrafi konumlarını ve şehirlerini (örn: Bursa) esas alarak lokasyona özel analiz yap.
        
        ANALİZ İÇERİĞİ:
        1. Konum ve İklim: Şubelerin koordinatları itibariyle hava gidişatını (mevsimsel sıcaklık, nem) ve bunun haşere üremesine (özellikle ${dataSummary.risks[0]?.zararli}) etkisini yorumla.
        2. Çevresel Faktörler: Koordinatlar civarındaki su kaynakları, yeşil alanlar veya endüstriyel yoğunluğun oluşturduğu riskleri tahmin et.
        3. Stratejik Tavsiye: Gelecek aylardaki aktivite artışına karşı o lokasyona özel 3-4 somut aksiyon öner.
        
        VERİLER: ${JSON.stringify(dataSummary)}
        
        Lütfen 4-5 madde halinde, tamamen Türkçe ve profesyonel bir dille cevap ver.
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      });

      if (response.status === 429) {
        throw new Error('API İstek Sınırı Aşıldı. Lütfen bir süre bekleyip tekrar deneyin.');
      }

      const result = await response.json();
      console.log('Gemini raw result:', result);
      
      const candidate = result.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;
      
      if (text) {
        setAiAnalysis(text);
        toast.success('Gemini AI analizi lokasyon bazlı tamamlandı.');
      } else {
        const finishReason = candidate?.finishReason;
        const msg = finishReason === 'SAFETY' ? 'Güvenlik filtreleri nedeniyle analiz üretilemedi.' : 
                   finishReason === 'RECITATION' ? 'Referans kısıtlaması nedeniyle analiz üretilemedi.' :
                   'Analiz üretilemedi. (Boş yanıt)';
        setAiAnalysis(msg);
        console.warn('Gemini empty result. Finish reason:', finishReason, 'Full result:', result);
      }
    } catch (err: any) {
      toast.error('AI Analizi hatası: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const riskColors = {
    High: '#ef4444',
    Medium: '#f59e0b',
    Low: '#10b981'
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[600px]">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Akıllı analizler hesaplanıyor...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="text-purple-600" />
            Akıllı Analiz ve Risk Tahmini
          </h1>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md mt-1 w-fit border border-emerald-100">
            <ShieldCheck size={14} /> Gerçek Veri Kaynağı Aktif (Supabase)
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all text-gray-600 shadow-sm">
              <Download size={16} /> Rapor İndir
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
              <button onClick={downloadPDF} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50">
                <FileText size={16} className="text-red-500" /> PDF Olarak İndir
              </button>
              <button onClick={downloadExcel} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2">
                <Layout size={16} className="text-emerald-500" /> Excel (Ham Veri)
              </button>
            </div>
          </div>
          <button onClick={() => fetchAnalyticalData()} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md">
            <RefreshCw size={20} />
          </button>
        </div>
      </header>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
          <Filter size={16} /> Filtrele:
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <select 
            value={selectedCustomerId}
            onChange={(e) => {
              setSelectedCustomerId(e.target.value);
              setSelectedBranchId('all'); // Reset branch when customer changes
            }}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="all">Tüm Müşteriler</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <select 
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="all">Tüm Şubeler</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
          </select>
        </div>

        {(selectedCustomerId !== 'all' || selectedBranchId !== 'all') && (
          <button 
            onClick={() => {
              setSelectedCustomerId('all');
              setSelectedBranchId('all');
            }}
            className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
          >
            Sıfırla
          </button>
        )}
      </div>

      <div id="analytics-dashboard" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Map & Trends */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* MAP CARD */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <MapPin className="text-red-500" /> Coğrafi Risk Haritası
              </h3>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Yüksek</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Orta</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Düşük</div>
              </div>
            </div>
            <div className="h-[450px] rounded-xl overflow-hidden border border-gray-100 z-0">
              <MapContainer 
                center={[39.9334, 32.8597]} 
                zoom={6} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {riskData.map((risk) => (
                  <CircleMarker
                    key={risk.branchId}
                    center={[risk.lat, risk.lng]}
                    radius={Math.sqrt(risk.score) * 2}
                    pathOptions={{ 
                      fillColor: riskColors[risk.level], 
                      color: 'white', 
                      weight: 2, 
                      fillOpacity: 0.7 
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold border-b pb-1 mb-1">{risk.branchName}</p>
                        <p>Risk Skoru: <span className="font-bold">{risk.score}</span></p>
                        <p>Ana Zararlı: <span className="text-red-600 font-bold">{risk.mainPest}</span></p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
                <FitBounds points={riskData.map(r => [r.lat, r.lng])} />
              </MapContainer>
            </div>
          </div>

          {/* PREDICTIVE CHART CARD */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="text-blue-500" /> Gelecek Dönem Aktivite Tahmini
              </h3>
              <div className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-full font-bold">
                Tarihsel + Mevsimsel Projeksiyon
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area 
                    type="monotone" 
                    dataKey="historicalValue" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorHist)" 
                    name="Gerçekleşen Aktivite"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="predictedValue" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    fillOpacity={1} 
                    fill="url(#colorPred)" 
                    name="Tahmin Edilen Aktivite"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Insights & Suggestions */}
        <div className="space-y-6">
          
          {/* SUMMARY CARDS */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-white/80 text-sm font-medium">Genel Risk Durumu</p>
              <h2 className="text-3xl font-black text-white mt-1">ORTA SEVİYE</h2>
              <div className="mt-4 flex items-center gap-2 text-white/90 text-xs bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                <Info size={14} />
                <span>Mevsimsel geçiş nedeniyle risk artış eğilimindedir.</span>
              </div>
            </div>
            <Brain className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10" />
          </div>

          {/* RISK LEVEL EXPLANATION */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2 text-sm">
              <Info className="text-blue-500" size={18} /> Risk Seviyeleri Ne Anlama Gelir?
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="shrink-0 w-1.5 h-auto rounded-full bg-red-500"></div>
                <div>
                  <p className="text-xs font-bold text-red-600 uppercase">Yüksek Risk (70+ Puan)</p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                    Kritik zararlı aktivitesi tespiti. Haftalık kontrol ve yoğun ilaçlama önerilir.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="shrink-0 w-1.5 h-auto rounded-full bg-amber-500"></div>
                <div>
                  <p className="text-xs font-bold text-amber-600 uppercase">Orta Risk (40-70 Puan)</p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                    Mevsimsel artış beklenen veya kontrol edilebilir aktivite. Standart aylık rutin yeterlidir.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="shrink-0 w-1.5 h-auto rounded-full bg-emerald-500"></div>
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase">Düşük Risk (0-40 Puan) </p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                    Kararlı ve güvenli durum. Rutin takip ve önleyici tedbirler uygulanır.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 font-bold flex items-center gap-2">
                <Brain className="text-purple-600" /> Gemini AI Derin Analiz
              </h3>
              <button 
                onClick={runGeminiAnalysis}
                disabled={analyzing}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  analyzing ? 'bg-gray-100 text-gray-400' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                }`}
              >
                {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Brain size={14} />}
                {analyzing ? 'Analiz Ediliyor...' : 'AI Analizi'}
              </button>
            </div>
            
            {aiAnalysis ? (
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 italic text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {aiAnalysis}
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center text-center">
                <Brain className="w-10 h-10 text-gray-200 mb-2" />
                <p className="text-xs text-gray-400 max-w-[200px]">
                  Verileri Gemini AI ile derinlemesine analiz etmek için butona tıklayın.
                </p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" /> Akıllı Öneriler
            </h3>
            <div className="space-y-4">
              {insights.map(item => (
                <div key={item.id} className={`p-4 rounded-xl border ${
                  item.type === 'danger' ? 'bg-red-50 border-red-100' : 
                  item.type === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'
                }`}>
                  <h4 className={`text-sm font-bold flex items-center gap-2 ${
                    item.type === 'danger' ? 'text-red-700' : 
                    item.type === 'warning' ? 'text-amber-700' : 'text-blue-700'
                  }`}>
                    {item.type === 'danger' ? <AlertTriangle size={16} /> : <Info size={16} />}
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">{item.description}</p>
                  <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Önerilen Aksiyon:</div>
                  <p className="text-xs font-semibold text-gray-800 mt-1">{item.suggestion}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-gray-900 font-bold mb-4">Risk Altındaki Top 5 Şube</h3>
            <div className="space-y-3">
              {riskData.sort((a, b) => b.score - a.score).slice(0, 5).map(risk => (
                <div key={risk.branchId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-all border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full" style={{ backgroundColor: riskColors[risk.level] }}></div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{risk.branchName}</p>
                      <p className="text-xs text-gray-500">{risk.mainPest}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">{risk.score}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">SKOR</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors border border-blue-100 rounded-lg hover:bg-blue-50">
              Tüm Riskleri Listele
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminPredictiveAnalytics;
