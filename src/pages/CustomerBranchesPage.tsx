import React, { useState, useEffect } from 'react';
import { 
  MapPin, Phone, Mail, Building, ChevronDown, ChevronUp, 
  Package, Calendar, Layout, TrendingUp, Loader2, 
  AlertCircle, Bug, FileText, Filter, Eye, X, XCircle, CheckCircle, Clock, CreditCard, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import type { Branch } from '../types';
import { format, subMonths, parseISO, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import FloorPlanViewer from '../components/Branches/FloorPlanViewer';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';

// --- Interfaces ---
interface EquipmentCheck {
  [key: string]: any;
}

interface Visit {
  id: string;
  visit_date: string;
  equipment_checks: Record<string, EquipmentCheck>;
  status: string;
  visit_type?: string;
  report_number?: string;
  notes?: string;
  operator?: { name: string };
}

interface Equipment {
  id: string;
  equipment_code: string;
  department: string;
  equipment: { name: string; type: string };
}

interface SaleItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: { name: string } | null;
}

interface MaterialSale {
  id: string;
  sale_date: string;
  total_amount: number;
  items: SaleItem[];
}

// --- 1. Geliştirilmiş TREND ANALİZ BİLEŞENİ ---
const BranchTrendAnalysisView = ({ branchId }: { branchId: string }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalChecks: 0, totalIssues: 0, consumption: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        const endDate = new Date();
        const startDate = subMonths(endDate, 6);
        
        const { data: visits, error } = await supabase
          .from('visits')
          .select(`
            visit_date, 
            equipment_checks
          `)
          .eq('branch_id', branchId)
          .eq('status', 'completed')
          .gte('visit_date', startDate.toISOString())
          .lte('visit_date', endDate.toISOString())
          .order('visit_date', { ascending: true });

        if (error) throw error;

        const monthlyStats: Record<string, any> = {};
        let totalChecks = 0;
        let totalIssues = 0;
        let totalConsumption = 0;

        for (let i = 5; i >= 0; i--) {
          const d = subMonths(new Date(), i);
          const key = format(d, 'MMM yyyy', { locale: tr });
          monthlyStats[key] = {
            month: key,
            kemirgen: 0,
            yuruyen: 0,
            uckun: 0,
            toplam_kontrol: 0,
            sorunlu_ekipman: 0
          };
        }

        visits?.forEach(visit => {
          const monthKey = format(parseISO(visit.visit_date), 'MMM yyyy', { locale: tr });
          if (!monthlyStats[monthKey]) return;

          if (visit.equipment_checks) {
            Object.values(visit.equipment_checks).forEach((check: any) => {
              monthlyStats[monthKey].toplam_kontrol++;
              totalChecks++;

              let hasIssue = false;
              let count = 0;

              Object.entries(check).forEach(([k, v]) => {
                const key = k.toLowerCase();
                if ((key.includes('activity') || key.includes('aktivite') || key.includes('durum')) && 
                    (v === true || v === 'true' || v === 'var' || v === 'active')) {
                  hasIssue = true;
                }
                if (key.includes('consumption') || key.includes('tuketim')) {
                  hasIssue = true;
                  totalConsumption++;
                }
                if ((key.includes('count') || key.includes('sayi') || key.includes('adet')) && typeof v === 'number') {
                  count += v;
                  if (v > 0) hasIssue = true;
                }
              });

              if (hasIssue) {
                monthlyStats[monthKey].sorunlu_ekipman++;
                totalIssues++;
                
                const checkString = JSON.stringify(check).toLowerCase();
                if (checkString.includes('efc') || checkString.includes('sinek') || checkString.includes('fly')) {
                  monthlyStats[monthKey].uckun += (count > 0 ? count : 1);
                } else if (checkString.includes('yem') || checkString.includes('bait') || checkString.includes('kemirgen')) {
                  monthlyStats[monthKey].kemirgen++;
                } else {
                  if (count > 0) monthlyStats[monthKey].uckun += count;
                  else monthlyStats[monthKey].yuruyen += (count > 0 ? count : 1);
                }
              }
            });
          }
        });

        setSummary({ totalChecks, totalIssues, consumption: totalConsumption });
        setChartData(Object.values(monthlyStats));
      } catch (err) {
        console.error("Trend data error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();
  }, [branchId]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></div>;
  
  if (summary.totalChecks === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed">
        <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">Bu şube için analiz edilecek yeterli veri bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-600 font-medium">Toplam Kontrol</p>
          <p className="text-2xl font-bold text-blue-900">{summary.totalChecks}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
          <p className="text-sm text-red-600 font-medium">Tespit Edilen Aktivite</p>
          <p className="text-2xl font-bold text-red-900">{summary.totalIssues}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
          <p className="text-sm text-orange-600 font-medium">Yem Tüketimi</p>
          <p className="text-2xl font-bold text-orange-900">{summary.consumption} <span className="text-xs font-normal">Nokta</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" /> Zararlı Türüne Göre Trend
          </h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUckun" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorKemirgen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorYuruyen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" style={{ fontSize: '11px' }} tickMargin={10} />
                <YAxis style={{ fontSize: '11px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                <Area type="monotone" dataKey="uckun" name="Uçkun (Sinek vb.)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUckun)" stackId="1" />
                <Area type="monotone" dataKey="yuruyen" name="Yürüyen (Böcek)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorYuruyen)" stackId="1" />
                <Area type="monotone" dataKey="kemirgen" name="Kemirgen" stroke="#ef4444" fillOpacity={1} fill="url(#colorKemirgen)" stackId="1" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <ActivityIcon className="w-4 h-4 text-green-500" /> Ekipman Sorun Oranı
          </h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" style={{ fontSize: '11px' }} tickMargin={10} />
                <YAxis yAxisId="left" style={{ fontSize: '11px' }} />
                <YAxis yAxisId="right" orientation="right" style={{ fontSize: '11px' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="toplam_kontrol" name="Toplam Kontrol" fill="#e5e7eb" radius={[4, 4, 0, 0]} barSize={30} />
                <Line yAxisId="right" type="monotone" dataKey="sorunlu_ekipman" name="Sorunlu/Aktivite" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 2. EKİPMAN AKTİVİTE GÖRÜNTÜLEYİCİ ---
const BranchEquipmentActivityView = ({ branchId }: { branchId: string }) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data: eqData } = await supabase
          .from('branch_equipment')
          .select('id, equipment_code, department, equipment:equipment_id(name, type)')
          .eq('branch_id', branchId)
          .order('equipment_code');
        setEquipments(eqData || []);

        const { data: visitData } = await supabase
          .from('visits')
          .select('id, visit_date, equipment_checks, status, operator:operator_id(name)')
          .eq('branch_id', branchId)
          .eq('status', 'completed')
          .order('visit_date', { ascending: false })
          .limit(15);

        setVisits(visitData || []);
        if (visitData && visitData.length > 0) setSelectedVisitId(visitData[0].id);
      } catch (err) {
        console.error("Data load error:", err);
      } finally {
        setLoading(false);
      }
    };
    if(branchId) loadData();
  }, [branchId]);

  const selectedVisit = visits.find(v => v.id === selectedVisitId);
  const groupedEquipments = equipments.reduce((acc, eq) => {
    const dept = eq.department || 'Diğer';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(eq);
    return acc;
  }, {} as Record<string, Equipment[]>);

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></div>;

  const formatValue = (key: string, val: any) => {
    if (val === true || val === 'true') return 'Evet / Var';
    if (val === false || val === 'false') return 'Hayır / Yok';
    return val;
  };

  const isAlert = (checkData: any) => {
    if (!checkData) return false;
    return Object.values(checkData).some(val => val === true || val === 'true' || val === 'var' || val === 'problem' || val === 'issue');
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full shadow-sm text-blue-600"><Calendar className="w-5 h-5" /></div>
          <div>
            <h4 className="font-bold text-blue-900">Ziyaret Bazlı Ekipman Raporu</h4>
            <p className="text-xs text-blue-700">{selectedVisit ? `Seçili: ${format(parseISO(selectedVisit.visit_date), 'dd MMMM yyyy', { locale: tr })}` : 'Lütfen ziyaret seçin'}</p>
          </div>
        </div>
        <div className="w-full sm:w-64">
          <select value={selectedVisitId} onChange={(e) => setSelectedVisitId(e.target.value)} className="w-full p-2.5 text-sm border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white shadow-sm">
            {visits.length === 0 && <option>Tamamlanmış ziyaret yok</option>}
            {visits.map(v => (
              <option key={v.id} value={v.id}>{format(parseISO(v.visit_date), 'dd.MM.yyyy')} - {v.operator?.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedVisit ? (
        <div className="space-y-6">
          {Object.entries(groupedEquipments).map(([dept, items]) => (
            <div key={dept} className="border rounded-lg overflow-hidden shadow-sm">
              <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-700 text-sm flex justify-between">
                <span>{dept}</span>
                <span className="text-xs bg-white px-2 py-0.5 rounded border">{items.length} Ekipman</span>
              </div>
              <div className="divide-y divide-gray-100 bg-white">
                {items.map(eq => {
                  const checkData = selectedVisit.equipment_checks?.[eq.id];
                  const hasAlert = isAlert(checkData);
                  return (
                    <div key={eq.id} className="p-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3 min-w-[200px]">
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${hasAlert ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{eq.equipment.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{eq.equipment_code}</div>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-wrap gap-2 items-center justify-start sm:justify-end">
                        {checkData ? (
                          Object.entries(checkData).map(([key, val]) => (
                            <span key={key} className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 ${(val === true || val === 'true' || val === 'var') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                              <span className="opacity-60 capitalize">{key}:</span>
                              <span>{formatValue(key, val)}</span>
                            </span>
                          ))
                        ) : <span className="text-xs text-gray-400 italic px-2 border border-dashed rounded">Kontrol Verisi Yok</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed"><p className="text-gray-500">Görüntülenecek ziyaret verisi bulunamadı.</p></div>}
    </div>
  );
};

// --- 3. PESTİSİT KULLANIMI ---
const BranchPesticideUsageView = ({ branchId }: { branchId: string }) => {
  const [usageData, setUsageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setLoading(true);
        const { data: visits } = await supabase.from('visits').select('id').eq('branch_id', branchId);
        const visitIds = visits?.map(v => v.id) || [];

        if (visitIds.length === 0) { setUsageData([]); setLoading(false); return; }

        const { data, error } = await supabase
          .from('biocidal_products_usage')
          .select(`id, quantity, unit, created_at, product:biocidal_products (name, active_ingredient), visit:visits (visit_date)`)
          .in('visit_id', visitIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUsageData(data || []);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    if (branchId) fetchUsage();
  }, [branchId]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></div>;
  if (usageData.length === 0) return <div className="p-6 text-center text-gray-500 bg-white border border-dashed border-gray-300 rounded-lg"><Bug className="w-12 h-12 mx-auto mb-2 text-gray-300" /><p>Bu şube için pestisit kullanım raporu bulunamadı.</p></div>;

  return (
    <div className="space-y-3">
      {usageData.map((item) => (
        <div key={item.id} className="p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-800 text-sm">{item.product?.name || 'Bilinmeyen Ürün'}</span>
              <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">{item.product?.active_ingredient || '-'}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Calendar size={12} /> {item.visit?.visit_date ? format(parseISO(item.visit.visit_date), 'dd MMM yyyy', { locale: tr }) : format(parseISO(item.created_at), 'dd MMM yyyy', { locale: tr })}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="block font-bold text-green-700 text-sm">{item.quantity} {item.unit}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Miktar</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- 4. ZİYARET LİSTESİ (GELİŞTİRİLMİŞ) ---
const BranchVisitsList = ({ branchId }: { branchId: string }) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const { data, error } = await supabase.from('visits').select(`*, operator:operator_id (name)`).eq('branch_id', branchId).order('visit_date', { ascending: false }).limit(10);
        if (error) throw error;
        setVisits(data || []);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    if (branchId) fetchVisits();
  }, [branchId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"><CheckCircle size={12} /> Tamamlandı</span>;
      case 'cancelled': return <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200"><XCircle size={12} /> İptal</span>;
      default: return <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200"><Clock size={12} /> Planlandı</span>;
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600"/></div>;
  if (visits.length === 0) return <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-lg"><Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" /><p className="text-gray-500 font-medium">Bu şube için kayıtlı ziyaret bulunmuyor.</p></div>;

  return (
    <>
      <div className="space-y-3">
        {visits.map((visit) => (
          <div key={visit.id} onClick={() => setSelectedVisit(visit)} className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-800 text-sm">{format(parseISO(visit.visit_date), 'dd MMMM yyyy', { locale: tr })}</span>
                <span className="text-xs text-gray-400">({format(parseISO(visit.visit_date), 'HH:mm')})</span>
              </div>
              {getStatusBadge(visit.status)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mt-3">
              <div className="flex items-center gap-2 text-gray-600"><span className="text-blue-500 font-semibold text-xs">OP:</span> <span className="truncate">{visit.operator?.name || 'Atanmamış'}</span></div>
              <div className="flex items-center gap-2 text-gray-600"><FileText size={14} className="text-purple-500" /><span className="capitalize">{visit.visit_type || 'Periyodik'}</span></div>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="text-gray-400" /></div>
          </div>
        ))}
      </div>
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Eye size={18} className="text-blue-600"/> Ziyaret Detayı</h3>
              <button onClick={() => setSelectedVisit(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div><p className="text-xs text-gray-500 uppercase tracking-wide">Tarih</p><p className="font-medium text-gray-900">{format(parseISO(selectedVisit.visit_date), 'dd MMMM yyyy - HH:mm', { locale: tr })}</p><p className="text-xs text-blue-600 mt-0.5">{formatDistanceToNow(parseISO(selectedVisit.visit_date), { addSuffix: true, locale: tr })}</p></div>
                <div>{getStatusBadge(selectedVisit.status)}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div><p className="text-xs text-gray-500 uppercase">Operatör</p><p className="font-medium text-gray-800">{selectedVisit.operator?.name || '-'}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">Rapor No</p><p className="font-mono font-medium text-gray-800">{selectedVisit.report_number || '-'}</p></div>
              </div>
              <div><p className="text-xs text-gray-500 uppercase mb-1">Ziyaret Notları</p><div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg text-sm text-gray-700 min-h-[60px]">{selectedVisit.notes || 'Herhangi bir not girilmemiş.'}</div></div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t text-right"><button onClick={() => setSelectedVisit(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Kapat</button></div>
          </div>
        </div>
      )}
    </>
  );
};

// --- 5. MALZEME KULLANIMI (GELİŞTİRİLMİŞ) ---
const SaleDetailModal = ({ sale, onClose }: { sale: MaterialSale; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <div><h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><FileText size={18} className="text-blue-600"/> Satış Detayı</h3><p className="text-xs text-gray-500 mt-1">{format(parseISO(sale.sale_date), 'dd MMMM yyyy HH:mm', { locale: tr })}</p></div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="p-6"><div className="space-y-4">{sale.items.map((item, idx) => (<div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"><div><p className="font-medium text-gray-800">{item.products?.name || 'Bilinmeyen Ürün'}</p><p className="text-xs text-gray-500">{item.quantity} adet x {item.unit_price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p></div><div className="font-semibold text-gray-700">{(item.quantity * item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</div></div>))}</div></div>
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center"><span className="font-semibold text-gray-600">GENEL TOPLAM</span><span className="text-xl font-bold text-green-600">{sale.total_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span></div>
      </div>
    </div>
  );
};

const BranchMaterialUsageList = ({ branchId }: { branchId: string }) => {
  const [sales, setSales] = useState<MaterialSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<MaterialSale | null>(null);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const { data, error } = await supabase.from('paid_material_sales').select(`id, sale_date, total_amount, items:paid_material_sale_items (id, quantity, unit_price, products:paid_products ( name ))`).eq('branch_id', branchId).order('sale_date', { ascending: false }).limit(10);
        if (error) throw error;
        const formattedData: MaterialSale[] = (data || []).map((s: any) => ({ ...s, items: s.items || [] }));
        setSales(formattedData);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    if (branchId) fetchSales();
  }, [branchId]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600"/></div>;
  if (sales.length === 0) return <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-lg"><Package className="w-10 h-10 mx-auto mb-2 text-gray-300" /><p className="text-gray-500 font-medium">Bu şube için malzeme satışı bulunmuyor.</p></div>;

  const totalSpent = sales.reduce((acc, sale) => acc + (sale.total_amount || 0), 0);

  return (
    <>
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 flex justify-between items-center">
        <div><p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Son Harcamalar</p><p className="text-sm text-blue-800">Görüntülenen {sales.length} kayıt</p></div>
        <div className="text-right"><p className="text-2xl font-bold text-blue-700">{totalSpent.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p></div>
      </div>
      <div className="space-y-3">
        {sales.map((sale) => (
          <div key={sale.id} onClick={() => setSelectedSale(sale)} className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer relative">
            <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
              <div className="flex items-center gap-2 text-gray-600"><Calendar size={14} className="text-blue-500" /><span className="text-sm font-medium">{format(parseISO(sale.sale_date), 'dd MMM yyyy', { locale: tr })}</span></div>
              <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded text-green-700 border border-green-100"><CreditCard size={12} /><span className="text-xs font-bold">{sale.total_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span></div>
            </div>
            <div className="space-y-1">
              {sale.items.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div><span className="text-gray-700 truncate max-w-[180px]">{item.products?.name || 'Ürün'}</span></div>
                  <span className="text-gray-500 text-xs font-medium bg-gray-100 px-1.5 py-0.5 rounded">x{item.quantity}</span>
                </div>
              ))}
              {sale.items.length > 3 && <p className="text-xs text-blue-500 font-medium pl-3.5 pt-1">+ {sale.items.length - 3} diğer ürün...</p>}
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm p-1 rounded-full border"><ChevronRight className="text-blue-500" size={16} /></div>
          </div>
        ))}
      </div>
      {selectedSale && <SaleDetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}
    </>
  );
};

// DÖF Listesi (Placeholder - Geliştirilebilir)
const BranchCorrectiveActionsList = ({ branchId }: { branchId: string }) => {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActions = async () => {
      const { data } = await supabase.from('corrective_actions').select('*').eq('branch_id', branchId).order('created_at', { ascending: false }).limit(5);
      setActions(data || []);
      setLoading(false);
    };
    fetchActions();
  }, [branchId]);

  if (loading) return <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto"/></div>;
  if (actions.length === 0) return <div className="p-4 text-center text-gray-500">Kayıtlı DÖF bulunmuyor.</div>;

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <div key={action.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className={`w-4 h-4 ${action.status === 'closed' ? 'text-green-500' : 'text-red-500'}`} />
            <div><p className="font-medium text-sm text-gray-900">{action.non_compliance_type || 'DÖF Kaydı'}</p><p className="text-xs text-gray-500">{format(parseISO(action.created_at), 'dd MMM yyyy', { locale: tr })}</p></div>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${action.status === 'closed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{action.status === 'closed' ? 'Kapalı' : 'Açık'}</span>
        </div>
      ))}
    </div>
  );
};

const ActivityIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);

// --- ANA SAYFA ---
const CustomerBranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTabState, setActiveTabState] = useState<Record<string, string | null>>({});

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      let customerId: string | null = null;
      const localSession = localAuth.getSession();

      if (localSession && localSession.type === 'customer') {
        customerId = localSession.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: customerData } = await supabase.from('customers').select('id').eq('auth_id', user.id).single();
          customerId = customerData?.id || null;
        }
      }

      if (!customerId) throw new Error('Müşteri oturumu bulunamadı.');

      const { data, error } = await supabase.from('branches').select(`*, pricing:branch_pricing(*)`).eq('customer_id', customerId).order('sube_adi', { ascending: true });
      if (error) throw error;
      setBranches(data || []);
    } catch (err: any) {
      console.error('Şube çekme hatası:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTab = (branchId: string, tabName: string) => {
    setActiveTabState(prev => ({
      ...prev,
      [branchId]: prev[branchId] === tabName ? null : tabName
    }));
  };

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Hata: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Şubelerim</h1>
        <div className="text-sm text-gray-500">Toplam {branches.length} şube listeleniyor</div>
      </div>

      {branches.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">Kayıtlı şubeniz bulunmamaktadır.</div>
      ) : (
        <div className="grid gap-6">
          {branches.map((branch) => {
            const activeTab = activeTabState[branch.id];
            return (
              <div key={branch.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600"><Building size={24} /></div>
                    <div><h3 className="text-xl font-bold text-gray-900">{branch.sube_adi}</h3><span className="text-sm text-gray-500">{branch.sehir}</span></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                    <div className="flex items-start gap-2 text-gray-600"><MapPin size={18} className="mt-1 shrink-0 text-gray-400" /><span className="text-sm">{branch.adres || 'Adres yok'}</span></div>
                    <div className="flex items-center gap-2 text-gray-600"><Phone size={18} className="shrink-0 text-gray-400" /><span className="text-sm">{branch.telefon || 'Telefon yok'}</span></div>
                    <div className="flex items-center gap-2 text-gray-600"><Mail size={18} className="shrink-0 text-gray-400" /><span className="text-sm">{branch.email || 'E-posta yok'}</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex flex-wrap gap-2">
                  <button onClick={() => toggleTab(branch.id, 'equipment')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'equipment' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><Package size={16} /> Ekipmanlar {activeTab === 'equipment' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                  <button onClick={() => toggleTab(branch.id, 'visits')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'visits' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><Calendar size={16} /> Ziyaretler {activeTab === 'visits' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                  <button onClick={() => toggleTab(branch.id, 'dof')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'dof' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><AlertCircle size={16} /> DÖF {activeTab === 'dof' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                  <button onClick={() => toggleTab(branch.id, 'materials')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'materials' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><FileText size={16} /> Malzeme {activeTab === 'materials' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                  <button onClick={() => toggleTab(branch.id, 'pesticides')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'pesticides' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><Bug size={16} /> Pestisit {activeTab === 'pesticides' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                  <button onClick={() => toggleTab(branch.id, 'floorplan')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'floorplan' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><Layout size={16} /> Kroki {activeTab === 'floorplan' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                  <button onClick={() => toggleTab(branch.id, 'trends')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'trends' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><TrendingUp size={16} /> Trend Analiz {activeTab === 'trends' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                </div>
                {activeTab && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50/30 animate-in fade-in slide-in-from-top-2 duration-200">
                    {activeTab === 'equipment' && <BranchEquipmentActivityView branchId={branch.id} />}
                    {activeTab === 'visits' && <BranchVisitsList branchId={branch.id} />}
                    {activeTab === 'dof' && <BranchCorrectiveActionsList branchId={branch.id} />}
                    {activeTab === 'materials' && <BranchMaterialUsageList branchId={branch.id} />}
                    {activeTab === 'pesticides' && <BranchPesticideUsageView branchId={branch.id} />}
                    {activeTab === 'floorplan' && <FloorPlanViewer branchId={branch.id} />}
                    {activeTab === 'trends' && <BranchTrendAnalysisView branchId={branch.id} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerBranchesPage;