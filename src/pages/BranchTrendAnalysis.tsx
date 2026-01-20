import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  TrendingUp,
  Download,
  Loader2,
  Filter,
  Activity,
  BarChart3,
  Calendar as CalendarIcon,
  Calculator,
  MapPin,
  Building2,
  FileText,
  AlertTriangle,
  ArrowRight,
  Target,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  LabelList
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- TİP TANIMLARI ---
interface BranchTrendAnalysisProps {
  branchId: string;
  branchName: string;
}

interface MonthlyTrend {
  month: string;
  visits: number;
  checks: number;
  issues: number;
}

interface AnalysisData {
  type: string;
  data: any[];
  keys: string[];
  labels: Record<string, string>;
  maxActivityCode?: string;
  maxActivityValue?: number;
  totalActivity: number;
}

interface BiocidalProductUsage {
  product_name: string;
  active_ingredient: string;
  total_quantity: number;
  unit: string;
  usage_count: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

const BranchTrendAnalysis: React.FC<BranchTrendAnalysisProps> = ({ branchId, branchName: initialBranchName }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportProgress, setExportProgress] = useState(0); // PDF ilerleme durumu
  
  const [currentBranchName, setCurrentBranchName] = useState(initialBranchName);
  const [customerInfo, setCustomerInfo] = useState<{ name: string, kisa_isim: string } | null>(null);

  const [dateRange, setDateRange] = useState({
    from: format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, cancelled: 0 });
  const [monthlyTrend, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [equipmentAnalysis, setEquipmentAnalysis] = useState<AnalysisData[]>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<AnalysisData[]>([]);
  const [biocidalProducts, setBiocidalProducts] = useState<BiocidalProductUsage[]>([]);
  const [riskyEquipments, setRiskyEquipments] = useState<any[]>([]); 

  const [chartMode, setChartMode] = useState<'total' | 'per_visit'>('total');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (branchId) {
      fetchCustomerAndBranchInfo();
      generateReport();
    }
  }, [branchId, dateRange]);

  const fetchCustomerAndBranchInfo = async () => {
    try {
      const { data } = await supabase
        .from('branches')
        .select(`sube_adi, customers (name, kisa_isim)`)
        .eq('id', branchId)
        .single();

      if (data) {
        setCurrentBranchName(data.sube_adi);
        if (data.customers) {
          // @ts-ignore
          setCustomerInfo(Array.isArray(data.customers) ? data.customers[0] : data.customers);
        }
      }
    } catch (error) { console.error(error); }
  };

  // --- PARSER ---
  const parseVal = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (val === true) return 1;
    if (val === false) return 0;
    
    if (typeof val === 'string') {
      const v = val.trim().toLowerCase();
      // Pozitif (1)
      if (v.includes('var') || v.includes('evet') || v.includes('true') || v.includes('kırık') || v.includes('kayıp') || v.includes('aktif') || v.includes('değişti')) {
         if (v.includes('yok') || v.includes('hayır')) return 0; // İstisna: "Aktivite Yok"
         return 1;
      }
      // Negatif (0)
      if (v.includes('yok') || v.includes('hayır') || v.includes('false') || v.includes('temiz') || v.includes('sağlam')) return 0;
      
      const num = parseFloat(v.replace(',', '.'));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const normalizeKey = (key: string) => String(key).trim().toLowerCase();

  // --- RAPOR OLUŞTURMA ---
  const generateReport = async () => {
    if (!branchId) return;
    setLoading(true);

    try {
      await Promise.all([
        getVisitStats(),
        getMonthlyTrends(),
        getEquipmentAnalysis(),
        getBiocidalProducts()
      ]);
    } catch (error) {
      console.error('Rapor hatası:', error);
      toast.error('Veriler alınırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // --- VERİ ÇEKME ---
  const getVisitStats = async () => {
    const { data } = await supabase.from('visits').select('status').eq('branch_id', branchId).gte('visit_date', dateRange.from).lte('visit_date', dateRange.to);
    const visits = data || [];
    setStats({
      total: visits.length,
      completed: visits.filter(v => ['completed', 'done', 'finished', 'tamamlandi'].includes(v.status)).length,
      pending: visits.filter(v => v.status === 'planned').length,
      cancelled: visits.filter(v => v.status === 'cancelled').length
    });
  };

  const getMonthlyTrends = async () => {
    const months = eachMonthOfInterval({ start: parseISO(dateRange.from), end: parseISO(dateRange.to) });
    const result = await Promise.all(months.map(async (date) => {
      const start = format(startOfMonth(date), 'yyyy-MM-dd');
      const end = format(endOfMonth(date), 'yyyy-MM-dd');
      const { data } = await supabase.from('visits').select('equipment_checks').eq('branch_id', branchId).gte('visit_date', start).lte('visit_date', end);
      let checks = 0, issues = 0;
      data?.forEach((v: any) => {
        if (v.equipment_checks) {
          checks += Object.keys(v.equipment_checks).length;
          Object.values(v.equipment_checks).forEach((val: any) => {
            if(typeof val === 'object' && val !== null) {
                Object.values(val).forEach(inner => { if(parseVal(inner) > 0 && !String(inner).toLowerCase().includes('temiz')) issues++; })
            } else {
                if(parseVal(val) > 0) issues++;
            }
          });
        }
      });
      return { month: format(date, 'MMM yyyy', { locale: tr }), visits: data?.length || 0, checks, issues };
    }));
    setMonthlyTrends(result);
  };

  const getBiocidalProducts = async () => {
    const { data } = await supabase.from('biocidal_products_usage').select('quantity, unit, biocidal_products(name, active_ingredient)').eq('branch_id', branchId).gte('created_at', dateRange.from).lte('created_at', dateRange.to);
    const map = new Map<string, BiocidalProductUsage>();
    data?.forEach((u: any) => {
      const name = u.biocidal_products?.name || 'Bilinmeyen';
      if (!map.has(name)) map.set(name, { product_name: name, active_ingredient: u.biocidal_products?.active_ingredient || '', total_quantity: 0, unit: u.unit || 'adet', usage_count: 0 });
      const p = map.get(name)!; p.total_quantity += parseFloat(u.quantity) || 0; p.usage_count++;
    });
    setBiocidalProducts(Array.from(map.values()).sort((a,b) => b.total_quantity - a.total_quantity));
  };

  const getEquipmentAnalysis = async () => {
    const { data: eqData } = await supabase.from('branch_equipment').select('id, equipment_code, equipment:equipment_id(name, properties)').eq('branch_id', branchId);
    const { data: visits } = await supabase.from('visits').select('visit_date, equipment_checks').eq('branch_id', branchId).gte('visit_date', dateRange.from).lte('visit_date', dateRange.to).in('status', ['completed', 'done', 'finished', 'tamamlandi']);

    if (!visits || visits.length === 0) { setEquipmentAnalysis([]); setTrendAnalysis([]); return; }

    const eqMap = new Map<string, any>(); const codeMap = new Map<string, any>();
    eqData?.forEach(eq => { eqMap.set(normalizeKey(eq.id), eq); codeMap.set(normalizeKey(eq.equipment_code), eq); });

    const groups = new Map<string, Map<string, any>>();
    const trendGroups = new Map<string, Map<string, any>>();
    const allActivityList: any[] = [];

    visits.forEach(visit => {
      if (!visit.equipment_checks) return;
      const date = format(parseISO(visit.visit_date), 'dd MMM', { locale: tr });
      Object.entries(visit.equipment_checks).forEach(([key, val]: [string, any]) => {
        const normKey = normalizeKey(key);
        let eq = eqMap.get(normKey) || codeMap.get(normKey);
        if (!eq) eq = { equipment_code: key, equipment: { name: 'Tanımsız Ekipman', properties: {} } };

        const type = eq.equipment?.name || 'Diğer';
        const code = eq.equipment_code || key;

        if (!groups.has(type)) groups.set(type, new Map());
        if (!trendGroups.has(type)) trendGroups.set(type, new Map());
        
        const typeGroup = groups.get(type)!;
        const trendGroup = trendGroups.get(type)!;

        if (!typeGroup.has(code)) typeGroup.set(code, { code, count: 0 });
        if (!trendGroup.has(date)) trendGroup.set(date, { date, count: 0 });

        const row = typeGroup.get(code)!;
        const trendRow = trendGroup.get(date)!;
        row.count++;

        if (typeof val === 'object' && val !== null) {
          Object.entries(val).forEach(([k, v]) => {
            if (['status', 'description', 'image', 'notes', 'control_result', 'equipment_name', 'equipment_code'].includes(k)) return;
            const num = parseVal(v);
            if (row[k] === undefined) row[k] = 0; if (trendRow[k] === undefined) trendRow[k] = 0;
            row[k] += num; trendRow[k] += num;
          });
        } else {
            const num = parseVal(val);
            if (row['durum'] === undefined) row['durum'] = 0; if (trendRow['durum'] === undefined) trendRow['durum'] = 0;
            row['durum'] += num; trendRow['durum'] += num;
        }
      });
    });

    const finalEq: AnalysisData[] = [];
    const finalTrend: AnalysisData[] = [];

    groups.forEach((itemsMap, type) => {
        const allKeys = new Set<string>();
        const items = Array.from(itemsMap.values());
        
        let maxActivityCode = '';
        let maxActivityValue = 0;
        let totalActivity = 0;

        items.forEach(i => {
          let itemTotal = 0;
          Object.keys(i).forEach(k => { 
            if (k!=='code' && k!=='count') {
              allKeys.add(k);
              itemTotal += (i[k] || 0);
            } 
          });

          totalActivity += itemTotal;

          if (itemTotal > 0) {
            allActivityList.push({ code: i.code, type: type, total: itemTotal });
          }

          if (itemTotal > maxActivityValue) {
            maxActivityValue = itemTotal;
            maxActivityCode = i.code;
          }
        });

        if (allKeys.size === 0) return;

        const keys = Array.from(allKeys);
        const labels: Record<string, string> = {};
        keys.forEach(k => {
             let label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
             if(label.toLowerCase().includes('sayisi')) label = label.replace(/Sayisi/i, ' Sayısı');
             labels[k] = label;
        });

        finalEq.push({ type, data: items.sort((a,b)=>a.code.localeCompare(b.code)), keys, labels, maxActivityCode, maxActivityValue, totalActivity });
        finalTrend.push({ type, data: Array.from(trendGroups.get(type)!.values()), keys, labels, totalActivity:0 });
    });

    setEquipmentAnalysis(finalEq);
    setTrendAnalysis(finalTrend);
    setRiskyEquipments(allActivityList.sort((a,b) => b.total - a.total).slice(0, 15));
  };

  // --- PDF OLUŞTURMA (Sayfa Bölme ve Kalite İyileştirme) ---
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    setExportProgress(10);

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 10;
      const contentWidth = pageWidth - (2 * margin);
      let currentY = margin;

      // HTML elementlerini seç
      const sections = reportRef.current.querySelectorAll('.pdf-section');
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;
        
        // Elementi Canvas'a çevir
        const canvas = await html2canvas(section, {
          scale: 2, // Yüksek kalite
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        // Sayfa sonu kontrolü
        if (currentY + imgHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, imgHeight);
        currentY += imgHeight + 5; // Biraz boşluk bırak
        
        setExportProgress(10 + Math.round(((i + 1) / sections.length) * 90));
      }

      const fileName = `Trend_Analiz_${currentBranchName}_${format(new Date(), 'dd-MM-yyyy')}.pdf`;
      pdf.save(fileName);
      toast.success('PDF başarıyla oluşturuldu.');

    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken bir hata oluştu.');
    } finally {
      setGenerating(false);
      setExportProgress(0);
    }
  };

  // --- YORUM OLUŞTURUCU ---
  const renderEquipmentComment = (eq: AnalysisData) => {
    if (eq.totalActivity === 0) {
      return (
        <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg flex items-start gap-3 text-sm text-green-800">
           <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600"/>
           <p>
             <strong>{eq.type} Analizi:</strong><br/>
             Bu dönemde kontrol edilen <strong>{eq.data.length}</strong> adet ekipmanda herhangi bir zararlı aktivitesi veya teknik uygunsuzluk tespit edilmemiştir.
             Mevcut koruyucu önlemlerin (izolasyon, temizlik vb.) devamlılığı sağlanmalıdır.
           </p>
        </div>
      );
    }

    return (
      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3 text-sm text-blue-900">
         <FileText className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600"/>
         <div className="space-y-2">
           <p>
             <strong>{eq.type} Değerlendirmesi:</strong><br/>
             Toplam <strong>{eq.data.length}</strong> adet ekipman üzerinde yapılan kontrollerde, <strong>{eq.totalActivity}</strong> adet veri (aktivite, tüketim veya teknik durum) kaydedilmiştir.
           </p>
           {eq.maxActivityValue && eq.maxActivityValue > 0 && (
              <p className="text-red-700 bg-white bg-opacity-60 p-2 rounded border border-red-100 inline-block font-medium">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4"/> 
                  Dikkat: En yoğun hareketlilik <u>{eq.maxActivityCode}</u> kodlu istasyonda ({eq.maxActivityValue} adet) görülmüştür.
                </span>
              </p>
           )}
           <p className="text-xs text-blue-700 opacity-80 mt-1">
             * Grafik üzerindeki barlar aktivite yoğunluğunu, çizgi trendi ise zaman içindeki değişimi ifade eder.
           </p>
         </div>
      </div>
    );
  };

  if (loading && stats.total === 0) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/></div>;

  return (
    <div>
      {/* Kontrol Paneli */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><TrendingUp className="h-8 w-8 text-blue-600" /> Trend Analizi</h2>
          <p className="text-sm text-gray-500 mt-1">{currentBranchName} şubesi performans raporu.</p>
        </div>
        <button onClick={handleExportPDF} disabled={generating} className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white border border-red-700 rounded-lg shadow-lg hover:bg-red-700 transition-all disabled:opacity-50 font-medium">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} 
          {generating ? `PDF Oluşturuluyor %${exportProgress}` : 'Raporu PDF İndir'}
        </button>
      </div>

      {/* Tarih */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-2 items-center"><Filter className="w-4 h-4 text-gray-400"/><span className="text-sm font-medium">Tarih Aralığı:</span></div>
          <div className="flex gap-2">
             <input type="date" value={dateRange.from} onChange={(e) => setDateRange(p => ({ ...p, from: e.target.value }))} className="w-full p-2 border rounded-lg text-sm"/>
             <input type="date" value={dateRange.to} onChange={(e) => setDateRange(p => ({ ...p, to: e.target.value }))} className="w-full p-2 border rounded-lg text-sm"/>
          </div>
      </div>

      {/* --- RAPOR ALANI (PDF'e Çıkarılacak Kısım) --- */}
      <div ref={reportRef} className="bg-white p-8 min-h-[1000px] relative text-gray-800 max-w-[297mm] mx-auto shadow-2xl">
        
        {/* 1. PDF SECTION: Header */}
        <div className="pdf-section mb-8">
          <div className="flex justify-between items-start border-b-4 border-blue-600 pb-6">
            <div className="flex items-center gap-6">
              <img 
                src="https://mlegotnkqlnkfwqblqbs.supabase.co/storage/v1/object/public/company-assets/logos/company-logo-1748646417451.webp" 
                alt="Logo" 
                className="h-24 w-auto object-contain"
                crossOrigin="anonymous" 
              />
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">TREND ANALİZ<br/>RAPORU</h1>
                <span className="text-sm text-gray-500 font-medium tracking-wide">PEST MENTOR RAPORLAMA SİSTEMİ</span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center justify-end gap-2 text-xl font-bold text-gray-800"><Building2 className="w-6 h-6 text-blue-600"/><span>{customerInfo?.kisa_isim || customerInfo?.name || 'Müşteri'}</span></div>
              <div className="flex items-center justify-end gap-2 text-md text-gray-600 font-medium"><MapPin className="w-5 h-5 text-red-500"/><span>{currentBranchName}</span></div>
              <div className="mt-3 inline-block bg-gray-100 px-4 py-1.5 rounded-full text-xs font-semibold text-gray-600 border border-gray-200">
                {format(parseISO(dateRange.from), 'dd.MM.yyyy')} - {format(parseISO(dateRange.to), 'dd.MM.yyyy')}
              </div>
            </div>
          </div>
        </div>

        {/* 2. PDF SECTION: İstatistikler */}
        {stats && (
          <div className="pdf-section mb-10">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity className="text-blue-500"/> Genel Bakış</h3>
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Toplam Ziyaret" value={stats.total} color="blue" />
              <StatCard label="Tamamlanan" value={stats.completed} color="green" />
              <StatCard label="Aktivite/Sorun" value={monthlyTrend.reduce((a,b)=>a+b.issues,0)} color="red" />
              <StatCard label="Kontrol Sayısı" value={monthlyTrend.reduce((a,b)=>a+b.checks,0)} color="purple" />
            </div>
          </div>
        )}

        {/* 3. PDF SECTION: Ziyaret Grafiği */}
        {monthlyTrend.length > 0 && (
          <div className="pdf-section mb-12 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-6 border-l-4 border-blue-500 pl-3">Aylık Ziyaret ve Aktivite Dağılımı</h3>
            <div className="h-72 w-full"><ResponsiveContainer><AreaChart data={monthlyTrend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month" style={{fontSize:12}}/><YAxis style={{fontSize:12}}/><Legend/><Area type="monotone" dataKey="visits" name="Ziyaret" stroke="#3B82F6" fill="#EFF6FF"/><Area type="monotone" dataKey="issues" name="Aktivite" stroke="#EF4444" fill="none"/></AreaChart></ResponsiveContainer></div>
          </div>
        )}

        {/* 4. PDF SECTION: Ekipman Analizleri (Loop) */}
        {equipmentAnalysis.map((eq, idx) => {
             const totals = eq.keys.reduce((acc, key) => { acc[key] = eq.data.reduce((sum, item) => sum + (Number(item[key]) || 0), 0); return acc; }, {} as Record<string, number>);
             return (
               <div key={idx} className="pdf-section mb-12 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center"><h4 className="font-bold text-gray-800 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-600"/> {eq.type}</h4><div className="flex gap-2">{Object.entries(totals).map(([k, v]) => (<span key={k} className="text-xs font-semibold bg-white px-3 py-1 rounded-full border border-gray-300 text-gray-600">{eq.labels[k]}: <span className="text-gray-900">{v}</span></span>))}</div></div>
                  <div className="p-6">
                    <div className="h-64 mb-6"><ResponsiveContainer><BarChart data={eq.data} margin={{top:20}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="code" style={{fontSize:10}} angle={-45} textAnchor="end" height={60} interval={0}/><YAxis style={{fontSize:12}}/><Legend/>{eq.keys.map((key, kIdx) => (<Bar key={key} dataKey={key} name={eq.labels[key]} fill={COLORS[kIdx % COLORS.length]} radius={[4,4,0,0]}><LabelList dataKey={key} position="top" style={{fontSize:10, fill:'#666'}} formatter={(val: number) => val > 0 ? val : ''}/></Bar>))}</BarChart></ResponsiveContainer></div>
                    {/* DİNAMİK YORUM */}
                    {renderEquipmentComment(eq)}
                  </div>
               </div>
             )
        })}

        {/* 5. PDF SECTION: Trendler */}
        {trendAnalysis.length > 0 && (
          <div className="pdf-section mb-12">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6 border-l-4 border-green-500 pl-3"><TrendingUp className="text-green-500 w-5 h-5"/> Zaman İçindeki Değişim (Trend)</h3>
             <div className="grid grid-cols-1 gap-8">
                {trendAnalysis.map((trend, idx) => (
                  <div key={idx} className="bg-white border rounded-xl p-6 shadow-sm"><h4 className="text-sm font-bold text-gray-600 mb-4">{trend.type}</h4><div className="h-64"><ResponsiveContainer><LineChart data={trend.data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" style={{fontSize:11}}/><YAxis style={{fontSize:12}}/><Legend/>{trend.keys.map((key, kIdx) => (<Line key={key} type="monotone" dataKey={key} name={trend.labels[key]} stroke={COLORS[kIdx % COLORS.length]} strokeWidth={2} dot={{r:3}}/>))}</LineChart></ResponsiveContainer></div></div>
                ))}
             </div>
          </div>
        )}

        {/* 6. PDF SECTION: Biyosidal */}
        {biocidalProducts.length > 0 && (
          <div className="pdf-section mb-12">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6 border-l-4 border-yellow-500 pl-3">Biyosidal Ürün Kullanım Özeti</h3>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm text-left"><thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs"><tr><th className="px-4 py-3">Ürün</th><th className="px-4 py-3 text-center">Miktar</th><th className="px-4 py-3 text-center">Sıklık</th></tr></thead><tbody className="divide-y divide-gray-200">{biocidalProducts.map((p,i)=>(<tr key={i} className="hover:bg-gray-50"><td className="px-4 py-2 font-medium">{p.product_name}</td><td className="px-4 py-2 text-center text-blue-600 font-bold">{p.total_quantity} {p.unit}</td><td className="px-4 py-2 text-center">{p.usage_count} kez</td></tr>))}</tbody></table>
            </div>
          </div>
        )}

        {/* 7. PDF SECTION: Risk Analizi (Kroki Yerine) */}
        {riskyEquipments.length > 0 && (
          <div className="pdf-section mb-12 bg-red-50 border border-red-200 rounded-xl p-8">
             <div className="flex items-center gap-3 mb-8 border-b border-red-200 pb-4">
                <Target className="w-10 h-10 text-red-600" />
                <div>
                   <h3 className="text-2xl font-bold text-red-900">Risk Analizi ve Kritik Noktalar</h3>
                   <p className="text-sm text-red-700 opacity-80">Veri analizi sonucunda en yüksek risk tespit edilen noktalar aşağıda listelenmiştir.</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-6">
                {riskyEquipments.map((item, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-lg border-l-4 border-red-500 shadow-sm flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-800 font-black text-lg">
                           {idx + 1}
                        </div>
                        <div>
                           <div className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                             {item.code} 
                             <ArrowRight className="w-5 h-5 text-red-400"/>
                             <span className="text-red-600">{item.total} Kez</span>
                           </div>
                           <div className="text-xs text-gray-500 font-medium uppercase">{item.type}</div>
                        </div>
                     </div>
                     <AlertOctagon className="w-6 h-6 text-red-500 animate-pulse"/>
                  </div>
                ))}
             </div>
             
             <div className="mt-6 text-xs text-red-600 italic bg-red-100 p-2 rounded">
                * Bu alanlar işletme krokisi üzerinde "Kırmızı Bölge" olarak işaretlenmeli ve fiziksel/kimyasal önlemler artırılmalıdır.
             </div>
          </div>
        )}

        {/* Footer */}
        <div className="pdf-section mt-16 pt-6 border-t-2 border-gray-100 text-center text-gray-400 text-xs flex justify-between items-center">
           <span>Rapor No: {Math.floor(Math.random() * 10000)}</span>
           <span>PestMentor Dijital Takip Sistemi © 2026</span>
        </div>

      </div>
    </div>
  );
};

const StatCard = ({ label, value, color }: any) => {
  const styles: any = { blue: 'bg-blue-50 text-blue-700 border-blue-200', green: 'bg-green-50 text-green-700 border-green-200', red: 'bg-red-50 text-red-700 border-red-200', purple: 'bg-purple-50 text-purple-700 border-purple-200' };
  return (<div className={`p-4 rounded-xl border ${styles[color]}`}><div className="text-xs font-bold opacity-80 uppercase tracking-wide">{label}</div><div className="text-3xl font-black mt-1">{value}</div></div>);
};

export default BranchTrendAnalysis;