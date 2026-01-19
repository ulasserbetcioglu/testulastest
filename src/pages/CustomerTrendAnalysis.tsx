import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/Auth/AuthProvider';
import { localAuth } from '../lib/localAuth';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  TrendingUp,
  Download,
  Loader2,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Calculator,
  AlertCircle
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

// --- TİP TANIMLARI ---
interface MonthlyTrend {
  month: string;
  visits: number;
  checks: number;
  issues: number;
}

interface BiocidalProduct {
  name: string;
  ingredient: string;
  total: number;
  unit: string;
  count: number;
}

interface AnalysisData {
  type: string;          // Örn: "Kemirgen İstasyonu"
  data: any[];           // Grafik için veri dizisi
  keys: string[];        // Grafikte gösterilecek sütunlar (örn: "aktivite", "tuketim")
  labels: Record<string, string>; // Sütunların Türkçe etiketleri
}

// Renk Paleti
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

const CustomerTrendAnalysis: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filtreler
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [dateRange, setDateRange] = useState({
    from: format(new Date(new Date().setMonth(new Date().getMonth() - 3)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  // Veri State'leri
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, cancelled: 0 });
  const [monthlyTrend, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [products, setProducts] = useState<BiocidalProduct[]>([]);
  const [equipmentAnalysis, setEquipmentAnalysis] = useState<AnalysisData[]>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<AnalysisData[]>([]);
  const [chartMode, setChartMode] = useState<'total' | 'avg'>('total');

  const reportRef = useRef<HTMLDivElement>(null);

  // 1. Başlangıç: Müşteri ve Şube Bilgisi
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const id = await localAuth.getCurrentCustomerId() || user?.customer_id;
        if (id) {
          setCustomerId(id);
          const { data } = await supabase.from('branches').select('id, sube_adi').eq('customer_id', id).order('sube_adi');
          setBranches(data || []);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    init();
  }, [user]);

  // 2. Rapor Oluşturma Tetikleyicisi
  useEffect(() => {
    if (customerId) generateReport();
  }, [customerId, selectedBranchId, dateRange]);

  // --- ANA RAPOR OLUŞTURMA FONKSİYONU ---
  const generateReport = async () => {
    if (!customerId) return;
    setLoading(true);

    try {
      // Hedef Şubeleri Belirle
      let targetBranches: string[] = [];
      if (selectedBranchId) {
        targetBranches = [selectedBranchId];
      } else {
        const { data } = await supabase.from('branches').select('id').eq('customer_id', customerId);
        targetBranches = data?.map(b => b.id) || [];
      }

      if (targetBranches.length === 0) {
        setLoading(false);
        return;
      }

      // Paralel Veri Çekme
      await Promise.all([
        getVisitStats(targetBranches),
        getMonthlyTrends(targetBranches),
        getProductUsage(targetBranches),
        getEquipmentAnalysis(targetBranches)
      ]);

    } catch (error) {
      console.error("Rapor hatası:", error);
      toast.error("Veriler alınırken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // --- YARDIMCI: Değer Okuyucu (Parser) ---
  const parseVal = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (val === true) return 1;
    if (val === false) return 0;
    
    if (typeof val === 'string') {
      const v = val.trim().toLowerCase();
      // Pozitif Durumlar (1 sayılacaklar)
      if (v.includes('var') || v.includes('evet') || v.includes('true') || v.includes('kırık') || v.includes('kayıp') || v.includes('aktif') || v.includes('değişti')) return 1;
      // Negatif Durumlar (0 sayılacaklar)
      if (v.includes('yok') || v.includes('hayır') || v.includes('false') || v.includes('temiz') || v.includes('sağlam')) return 0;
      
      // Sayısal String ("10,5")
      const num = parseFloat(v.replace(',', '.'));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // --- 1. Ziyaret İstatistikleri ---
  const getVisitStats = async (branchIds: string[]) => {
    const { data } = await supabase
      .from('visits')
      .select('status')
      .in('branch_id', branchIds)
      .gte('visit_date', dateRange.from)
      .lte('visit_date', dateRange.to);
    
    const visits = data || [];
    setStats({
      total: visits.length,
      completed: visits.filter(v => ['completed', 'done', 'finished', 'tamamlandi'].includes(v.status)).length,
      pending: visits.filter(v => v.status === 'planned').length,
      cancelled: visits.filter(v => v.status === 'cancelled').length
    });
  };

  // --- 2. Aylık Trend ---
  const getMonthlyTrends = async (branchIds: string[]) => {
    const months = eachMonthOfInterval({
      start: parseISO(dateRange.from),
      end: parseISO(dateRange.to)
    });

    const result = await Promise.all(months.map(async (date) => {
      const start = format(startOfMonth(date), 'yyyy-MM-dd');
      const end = format(endOfMonth(date), 'yyyy-MM-dd');

      const { data } = await supabase
        .from('visits')
        .select('equipment_checks')
        .in('branch_id', branchIds)
        .gte('visit_date', start)
        .lte('visit_date', end);

      let checks = 0;
      let issues = 0;

      data?.forEach((v: any) => {
        if (v.equipment_checks) {
          checks += Object.keys(v.equipment_checks).length;
          Object.values(v.equipment_checks).forEach((val: any) => {
            // Basitçe: Eğer değer 0'dan büyükse (Aktivite/Sorun) sorun sayısına ekle
            // Ancak "Hayır/Yok" (0) ise ekleme.
            // Sadece spesifik sorun kelimelerini arayalım
            const strVal = JSON.stringify(val).toLowerCase();
            if (strVal.includes('sorun') || strVal.includes('problem') || strVal.includes('kırık') || strVal.includes('kayıp') || strVal.includes('eksik') || (strVal.includes('aktivite') && strVal.includes('var'))) {
              issues++;
            }
          });
        }
      });

      return {
        month: format(date, 'MMM yyyy', { locale: tr }),
        visits: data?.length || 0,
        checks,
        issues
      };
    }));

    setMonthlyTrends(result);
  };

  // --- 3. Ürün Kullanımı ---
  const getProductUsage = async (branchIds: string[]) => {
    const { data } = await supabase
      .from('biocidal_products_usage')
      .select('quantity, unit, biocidal_products (name, active_ingredient)')
      .in('branch_id', branchIds)
      .gte('created_at', dateRange.from)
      .lte('created_at', dateRange.to);

    const map = new Map<string, BiocidalProduct>();
    data?.forEach((item: any) => {
      const name = item.biocidal_products?.name || 'Bilinmeyen';
      if (!map.has(name)) {
        map.set(name, {
          name,
          ingredient: item.biocidal_products?.active_ingredient || '-',
          total: 0,
          unit: item.unit || 'adet',
          count: 0
        });
      }
      const p = map.get(name)!;
      p.total += Number(item.quantity) || 0;
      p.count += 1;
    });

    setProducts(Array.from(map.values()).sort((a,b) => b.total - a.total));
  };

  // --- 4. Ekipman Analizi (En Karmaşık Kısım) ---
  const getEquipmentAnalysis = async (branchIds: string[]) => {
    // A. Ekipman Tanımlarını Çek
    const { data: eqData } = await supabase
      .from('branch_equipment')
      .select('id, equipment_code, equipment:equipment_id(name, properties)')
      .in('branch_id', branchIds);

    // B. Ziyaret Verilerini Çek
    const { data: visits } = await supabase
      .from('visits')
      .select('visit_date, equipment_checks')
      .in('branch_id', branchIds)
      .gte('visit_date', dateRange.from)
      .lte('visit_date', dateRange.to)
      .in('status', ['completed', 'done', 'finished', 'tamamlandi']); // Geniş filtre

    if (!visits || visits.length === 0) {
      setEquipmentAnalysis([]);
      setTrendAnalysis([]);
      return;
    }

    // C. Eşleştirme Sözlükleri
    const eqMap = new Map<string, any>(); // ID -> Ekipman
    const codeMap = new Map<string, any>(); // Code -> Ekipman

    eqData?.forEach(eq => {
      // Key normalizasyonu (boşluk sil, küçük harf yap)
      const cleanId = String(eq.id).trim().toLowerCase();
      const cleanCode = String(eq.equipment_code).trim().toLowerCase();
      eqMap.set(cleanId, eq);
      codeMap.set(cleanCode, eq);
    });

    // D. Veri Toplama Kutusu
    // Map<EkipmanTürü, Map<EkipmanKodu, {Veriler}>>
    const groups = new Map<string, Map<string, any>>();
    // Map<EkipmanTürü, Map<Tarih, {Veriler}>> (Trend için)
    const trendGroups = new Map<string, Map<string, any>>();

    // E. Tüm Ziyaretleri Gez
    visits.forEach(visit => {
      if (!visit.equipment_checks) return;
      const date = format(parseISO(visit.visit_date), 'dd MMM', { locale: tr });

      Object.entries(visit.equipment_checks).forEach(([key, val]: [string, any]) => {
        const cleanKey = String(key).trim().toLowerCase();
        
        // 1. Ekipmanı Bul (Veritabanından veya Sanal)
        let eq = eqMap.get(cleanKey) || codeMap.get(cleanKey);
        
        // Ekipman veritabanında yoksa bile (silinmiş olabilir) Sanal oluştur
        if (!eq) {
            eq = { 
                equipment_code: key, 
                equipment: { name: 'Tanımsız Ekipmanlar', properties: {} } 
            };
        }

        const type = eq.equipment?.name || 'Diğer';
        const code = eq.equipment_code || key;

        // 2. Grupları Hazırla
        if (!groups.has(type)) groups.set(type, new Map());
        if (!trendGroups.has(type)) trendGroups.set(type, new Map());

        const typeGroup = groups.get(type)!;
        const trendGroup = trendGroups.get(type)!;

        // 3. Ekipman Satırını Hazırla
        if (!typeGroup.has(code)) typeGroup.set(code, { code, count: 0 });
        if (!trendGroup.has(date)) trendGroup.set(date, { date, count: 0 });

        const row = typeGroup.get(code)!;
        const trendRow = trendGroup.get(date)!;
        
        row.count++;
        trendRow.count++;

        // 4. Verileri İşle ve Topla
        if (typeof val === 'object' && val !== null) {
          // Obje ise içindeki her alanı gez
          Object.entries(val).forEach(([k, v]) => {
            // Gereksiz alanları atla
            if (['status', 'description', 'image', 'notes', 'control_result'].includes(k)) return;
            
            const num = parseVal(v);
            // Sadece sayısal değeri olanları topla (0 olsa bile, anahtar oluşsun diye)
            if (row[k] === undefined) row[k] = 0;
            if (trendRow[k] === undefined) trendRow[k] = 0;
            
            row[k] += num;
            trendRow[k] += num;
          });
        } else {
          // Tekil değer ise (örn: "Var")
          const num = parseVal(val);
          if (row['durum'] === undefined) row['durum'] = 0;
          if (trendRow['durum'] === undefined) trendRow['durum'] = 0;
          
          row['durum'] += num;
          trendRow['durum'] += num;
        }
      });
    });

    // F. Sonuç Formatına Çevir
    const finalEqData: AnalysisData[] = [];
    const finalTrendData: AnalysisData[] = [];

    groups.forEach((itemsMap, type) => {
      // Tüm olası veri anahtarlarını bul (Örn: tuketim, aktivite)
      const allKeys = new Set<string>();
      const items = Array.from(itemsMap.values());
      
      items.forEach(item => {
        Object.keys(item).forEach(k => {
          if (k !== 'code' && k !== 'count') allKeys.add(k);
        });
      });

      if (allKeys.size === 0) return;

      const keys = Array.from(allKeys);
      const labels: Record<string, string> = {};
      keys.forEach(k => {
        // DeveCümlesi -> Normal Cümle (camelCase -> Title Case)
        labels[k] = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      });

      finalEqData.push({ type, data: items, keys, labels });

      // Trend Verisi Hazırla
      const trendMap = trendGroups.get(type)!;
      // Tarih sırasına sok
      const sortedTrends = Array.from(trendMap.values()).sort((a,b) => {
         // Basit tarih sıralaması (Geliştirilebilir)
         return 0; 
      });
      finalTrendData.push({ type, data: sortedTrends, keys, labels });
    });

    setEquipmentAnalysis(finalEqData);
    setTrendAnalysis(finalTrendData);
  };

  // --- İNDİRME ---
  const exportImage = async () => {
    if (reportRef.current) {
      setGenerating(true);
      try {
        const canvas = await html2canvas(reportRef.current, { scale: 2 });
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/jpeg');
        link.download = `Trend_Raporu_${format(new Date(), 'yyyy-MM-dd')}.jpg`;
        link.click();
        toast.success("Rapor indirildi.");
      } catch {
        toast.error("İndirme hatası.");
      }
      setGenerating(false);
    }
  };

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-blue-600"/></div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Başlık ve Filtreler */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><TrendingUp/> Trend Analizi</h1>
            <p className="text-sm text-gray-500">Müşteri verilerine dayalı detaylı performans raporu.</p>
          </div>
          <div className="flex gap-2">
            <select className="p-2 border rounded-lg bg-white" value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}>
              <option value="">Tüm Şubeler</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
            </select>
            <button onClick={exportImage} disabled={generating} className="p-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700">
              {generating ? <Loader2 className="animate-spin h-4 w-4"/> : <Download className="h-4 w-4"/>} İndir
            </button>
          </div>
        </div>

        {/* Tarih Seçimi */}
        <div className="bg-white p-4 rounded-lg shadow-sm border flex gap-4 items-center">
            <Filter className="h-4 w-4 text-gray-500"/>
            <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="border p-1 rounded text-sm"/>
            <span>-</span>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="border p-1 rounded text-sm"/>
        </div>

        {/* Rapor Alanı */}
        <div ref={reportRef} className="bg-white p-8 rounded-xl shadow-lg min-h-[600px] space-y-8">
            
            {/* 1. Özet İstatistikler */}
            <div className="grid grid-cols-4 gap-4">
                <StatBox label="Toplam Ziyaret" value={stats.total} color="blue" />
                <StatBox label="Tamamlanan" value={stats.completed} color="green" />
                <StatBox label="Sorun/Aktivite" value={monthlyTrend.reduce((a,b)=>a+b.issues,0)} color="red" />
                <StatBox label="Kontrol Sayısı" value={monthlyTrend.reduce((a,b)=>a+b.checks,0)} color="purple" />
            </div>

            {/* 2. Ziyaret Grafiği */}
            <Section title="Ziyaret ve Sorun Grafiği" icon={<Activity/>}>
                <div className="h-64">
                    <ResponsiveContainer>
                        <AreaChart data={monthlyTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" style={{fontSize:12}} />
                            <YAxis style={{fontSize:12}}/>
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="visits" name="Ziyaret" stroke="#3B82F6" fill="#EFF6FF" />
                            <Area type="monotone" dataKey="issues" name="Sorun/Aktivite" stroke="#EF4444" fill="none" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Section>

            {/* 3. Ekipman Analizleri (Dinamik) */}
            {equipmentAnalysis.length > 0 ? equipmentAnalysis.map((eq, idx) => (
                <Section key={idx} title={`${eq.type} Analizi`} icon={<BarChart3/>}>
                    <div className="h-72 mb-6">
                        <ResponsiveContainer>
                            <BarChart data={eq.data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="code" style={{fontSize:10}} angle={-45} textAnchor="end" height={60} />
                                <YAxis style={{fontSize:12}} />
                                <Tooltip />
                                <Legend />
                                {eq.keys.map((key, kIdx) => (
                                    <Bar key={key} dataKey={key} name={eq.labels[key]} fill={COLORS[kIdx % COLORS.length]} radius={[4,4,0,0]}>
                                        <LabelList dataKey={key} position="top" style={{fontSize:10, fill:'#666'}} />
                                    </Bar>
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Section>
            )) : (
                <div className="p-8 text-center border-2 border-dashed rounded-lg text-gray-400">
                    Ekipman aktivite verisi bulunamadı.
                </div>
            )}

            {/* 4. Trend Çizgileri */}
            {trendAnalysis.map((trend, idx) => (
                <Section key={`trend-${idx}`} title={`${trend.type} - Zaman İçindeki Değişim`} icon={<TrendingUp/>}>
                    <div className="h-64">
                         <ResponsiveContainer>
                            <LineChart data={trend.data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" style={{fontSize:11}} />
                                <YAxis style={{fontSize:12}} />
                                <Tooltip />
                                <Legend />
                                {trend.keys.map((key, kIdx) => (
                                    <Line key={key} type="monotone" dataKey={key} name={trend.labels[key]} stroke={COLORS[kIdx % COLORS.length]} strokeWidth={2} dot={{r:3}} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Section>
            ))}

            {/* 5. Biyosidal Ürünler */}
            {products.length > 0 && (
                <Section title="Biyosidal Ürün Kullanımı" icon={<PieChartIcon/>}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border rounded-lg">
                            <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                    <th className="p-3">Ürün</th>
                                    <th className="p-3">Etken Madde</th>
                                    <th className="p-3 text-right">Miktar</th>
                                    <th className="p-3 text-center">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {products.map((p, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="p-3 font-medium">{p.name}</td>
                                        <td className="p-3 text-gray-500">{p.ingredient}</td>
                                        <td className="p-3 text-right font-bold text-blue-600">{p.total} {p.unit}</td>
                                        <td className="p-3 text-center"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{p.count} Kez</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>
            )}

        </div>
      </div>
    </div>
  );
};

// Basit Bileşenler
const StatBox = ({ label, value, color }: any) => {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        green: 'bg-green-50 text-green-700 border-green-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return (
        <div className={`p-4 rounded-lg border ${colors[color]}`}>
            <div className="text-xs font-medium opacity-80">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
        </div>
    );
};

const Section = ({ title, icon, children }: any) => (
    <div className="border rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="p-2 bg-gray-100 rounded-lg text-gray-600">{icon}</span>
            {title}
        </h3>
        {children}
    </div>
);

export default CustomerTrendAnalysis;