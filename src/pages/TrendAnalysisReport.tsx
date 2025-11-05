import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { BarChart2, Calendar, Download, FileImage, Loader2, Search, PieChart as PieIcon, BarChartHorizontal } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- ARAYÜZLER (INTERFACES) ---
interface Customer { id: string; kisa_isim: string; }
interface Branch { id: string; sube_adi: string; customer_id: string; }
interface VisitData {
  id: string;
  visit_date: string;
  visit_type: string;
}
interface EquipmentTypeData {
    name: string;
    value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
        <p className="font-bold">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
                {`${entry.name}: ${entry.value}`}
            </p>
        ))}
      </div>
    );
  }
  return null;
};

const TrendAnalysisReport: React.FC = () => {
  // --- STATE YÖNETİMİ ---
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<VisitData[]>([]);
  const [equipmentTypeData, setEquipmentTypeData] = useState<EquipmentTypeData[]>([]);
  
  // Filtreler
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [dateRange, setDateRange] = useState({
    from: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  const reportRef = useRef<HTMLDivElement>(null);

  // --- VERİ ÇEKME ---
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase.from('customers').select('id, kisa_isim').order('kisa_isim');
        if (error) throw error;
        setCustomers(data || []);
      } catch (error: any) {
        toast.error("Müşteriler yüklenemedi.");
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) {
      setBranches([]);
      setSelectedBranchId('');
      return;
    }
    const fetchBranches = async () => {
      try {
        const { data, error } = await supabase.from('branches').select('id, sube_adi, customer_id').eq('customer_id', selectedCustomerId).order('sube_adi');
        if (error) throw error;
        setBranches(data || []);
      } catch (error: any) {
        toast.error("Şubeler yüklenemedi.");
      }
    };
    fetchBranches();
  }, [selectedCustomerId]);

  // --- RAPOR OLUŞTURMA ---
  const handleGenerateReport = useCallback(async () => {
    if (!selectedCustomerId || !selectedBranchId) {
      toast.error("Lütfen bir müşteri ve şube seçin.");
      return;
    }
    setLoading(true);
    setReportData([]);
    setEquipmentTypeData([]);
    try {
      // 1. Ziyaret verilerini çek (ziyaret sayısı ve türleri için)
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('id, visit_date, visit_type')
        .eq('branch_id', selectedBranchId)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .order('visit_date', { ascending: true });

      if (visitsError) throw visitsError;
      setReportData(visitsData || []);
      if(visitsData.length === 0) {
        toast.info("Seçilen kriterlere uygun ziyaret bulunamadı.");
      }
      
      // 2. Ekipman türü verilerini çek
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('branch_equipment')
        .select(`equipment:equipment_id(type)`)
        .eq('branch_id', selectedBranchId);

      if (equipmentError) throw equipmentError;

      const typeCounts = (equipmentData || []).reduce((acc, item) => {
        // @ts-ignore
        const type = item.equipment?.type || 'Bilinmiyor';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const formattedEquipmentData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
      setEquipmentTypeData(formattedEquipmentData);

    } catch (error: any) {
      toast.error("Rapor verileri çekilirken bir hata oluştu: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCustomerId, selectedBranchId, dateRange]);

  // --- GRAFİK VERİLERİNİ İŞLEME ---
  const visitCountByDay = useMemo(() => {
    if (!reportData.length) return [];
    const counts = new Map<string, number>();
    const days = eachDayOfInterval({ start: parseISO(dateRange.from), end: parseISO(dateRange.to) });

    days.forEach(day => {
        counts.set(format(day, 'yyyy-MM-dd'), 0);
    });

    reportData.forEach(visit => {
        const dayKey = format(new Date(visit.visit_date), 'yyyy-MM-dd');
        counts.set(dayKey, (counts.get(dayKey) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([date, count]) => ({
        name: format(parseISO(date), 'dd MMM', { locale: tr }),
        'Ziyaret Sayısı': count,
    }));
  }, [reportData, dateRange]);

  const visitTypeDistribution = useMemo(() => {
    if (!reportData.length) return [];
    const counts = reportData.reduce((acc, visit) => {
        const type = visit.visit_type || 'Belirtilmemiş';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reportData]);


  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
            <BarChart2 className="h-6 w-6 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Trend Analiz Raporu</h1>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
            <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg">
              <option value="">Müşteri Seçin</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şube</label>
            <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" disabled={!selectedCustomerId}>
              <option value="">Şube Seçin</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
            </select>
          </div>
           <div className="grid grid-cols-2 gap-2">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
                <input type="date" value={dateRange.from} onChange={e => setDateRange(prev => ({...prev, from: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-lg"/>
               </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
                <input type="date" value={dateRange.to} onChange={e => setDateRange(prev => ({...prev, to: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-lg"/>
               </div>
           </div>
        </div>
        <div className="mt-4 flex justify-end">
            <button onClick={handleGenerateReport} disabled={loading} className="px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 flex items-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" /> : <Search />}
                Rapor Oluştur
            </button>
        </div>
      </div>
      
      {loading && <div className="text-center py-10"><Loader2 className="animate-spin inline-block text-gray-400" /> Veriler yükleniyor...</div>}

      {!loading && reportData.length > 0 && (
        <div ref={reportRef} className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-center mb-2">Trend Analiz Raporu</h2>
            <p className="text-center text-gray-600 mb-8">{customers.find(c=>c.id === selectedCustomerId)?.kisa_isim} - {branches.find(b=>b.id === selectedBranchId)?.sube_adi}</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Ziyaret Sayısı Grafiği */}
                <div className="mb-12">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Calendar className="text-teal-500"/>Günlük Ziyaret Sayısı</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={visitCountByDay}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="Ziyaret Sayısı" fill="#14b8a6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                
                {/* Ziyaret Türü Dağılımı */}
                <div className="mb-12">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><PieIcon className="text-teal-500"/>Ziyaret Türü Dağılımı</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={visitTypeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {visitTypeDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Ekipman Tipi Dağılımı */}
                <div className="mb-12 lg:col-span-2">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><BarChartHorizontal className="text-teal-500"/>Şube Ekipman Tipi Dağılımı</h3>
                     {equipmentTypeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart layout="vertical" data={equipmentTypeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis type="category" dataKey="name" width={150} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Ekipman Sayısı" fill="#0d9488" />
                            </BarChart>
                        </ResponsiveContainer>
                     ) : <p className="text-center text-gray-500">Bu şube için ekipman verisi bulunamadı.</p>}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default TrendAnalysisReport;
