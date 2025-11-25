import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Users, FileText, BarChart, AlertTriangle, 
  Package, Layout, TrendingUp, Bug, AlertCircle, 
  CheckCircle, Clock, X, MapPin, Loader2, Award, FileCheck, 
  ChevronLeft, ChevronRight, Download, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import StatCard from '../components/Dashboard/StatCard';
import BranchEquipment from '../components/Branches/BranchEquipment';
import FloorPlanViewer from '../components/Branches/FloorPlanViewer';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// --- ARAYÜZLER ---
interface MonthlyPlan {
  month: number;
  total_required: number;
}

interface Visit {
  id: string;
  visit_date: string;
  status: string;
  visit_type: string;
  equipment_checks: any;
  operator?: { name: string };
}

interface Document {
  id: string;
  name: string;
  type: string;
  created_at: string;
  file_url: string;
}

interface Certificate {
  id: string;
  name: string;
  type: string;
  valid_until: string;
  status: string;
  file_url: string;
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

// --- ALT BİLEŞENLER ---

// 1. Takvim Görünümü
const BranchCalendarView = ({ branchId }: { branchId: string }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisits();
  }, [currentDate, branchId]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentDate).toISOString();
      const end = endOfMonth(currentDate).toISOString();

      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          visit_date,
          status,
          visit_type,
          operator:operator_id (name)
        `)
        .eq('branch_id', branchId)
        .gte('visit_date', start)
        .lte('visit_date', end);

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startingDayIndex = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;

  return (
    <div className="space-y-4">
      {/* Takvim Başlık ve Kontroller */}
      <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
        <span className="font-bold text-lg text-gray-800">{format(currentDate, 'MMMM yyyy', { locale: tr })}</span>
        <button onClick={() => setCurrentDate(subMonths(currentDate, -1))} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight /></button>
      </div>

      {/* Takvim Grid */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {daysOfWeek.map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-600">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 bg-gray-200 gap-px">
          {Array.from({ length: startingDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white min-h-[80px]"></div>
          ))}
          {monthDays.map(day => {
            const dayVisits = visits.filter(v => isSameDay(parseISO(v.visit_date), day));
            const isTodayDay = isToday(day);
            return (
              <div key={day.toString()} className={`bg-white min-h-[80px] p-1 flex flex-col ${isTodayDay ? 'bg-blue-50' : ''}`}>
                <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isTodayDay ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </span>
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[60px]">
                  {dayVisits.map(v => (
                    <div key={v.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${
                      v.status === 'completed' ? 'bg-green-100 text-green-800' :
                      v.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`} title={`${v.visit_type} - ${v.operator?.name}`}>
                      {format(parseISO(v.visit_date), 'HH:mm')} {v.visit_type}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 2. Dökümanlar Listesi
const BranchDocumentsView = ({ branchId }: { branchId: string }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });
      setDocuments(data || []);
      setLoading(false);
    };
    fetchDocs();
  }, [branchId]);

  if (loading) return <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;
  if (documents.length === 0) return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded border border-dashed">Bu şubeye ait döküman bulunamadı.</div>;

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div key={doc.id} className="flex justify-between items-center p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded">
              <FileText size={20} />
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900">{doc.name}</p>
              <p className="text-xs text-gray-500">{doc.type} • {format(parseISO(doc.created_at), 'dd MMM yyyy', { locale: tr })}</p>
            </div>
          </div>
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors">
            <Download size={18} />
          </a>
        </div>
      ))}
    </div>
  );
};

// 3. Sertifikalar Listesi
const BranchCertificatesView = ({ branchId }: { branchId: string }) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCerts = async () => {
      const { data } = await supabase
        .from('certificates')
        .select('*')
        .eq('branch_id', branchId)
        .order('valid_until', { ascending: true });
      setCertificates(data || []);
      setLoading(false);
    };
    fetchCerts();
  }, [branchId]);

  if (loading) return <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;
  if (certificates.length === 0) return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded border border-dashed">Bu şubeye ait sertifika bulunamadı.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {certificates.map((cert) => (
        <div key={cert.id} className="p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded">
                <Award size={20} />
              </div>
              <div>
                <h4 className="font-medium text-sm text-gray-900">{cert.name}</h4>
                <span className="text-xs text-gray-500">{cert.type}</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              cert.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {cert.status === 'active' ? 'Geçerli' : 'Süresi Dolmuş'}
            </span>
          </div>
          <div className="text-xs text-gray-600 mb-3">
            Geçerlilik: <span className="font-medium">{format(parseISO(cert.valid_until), 'dd MMMM yyyy', { locale: tr })}</span>
          </div>
          {cert.file_url && (
            <a href={cert.file_url} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-2 bg-gray-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-50 transition-colors">
              Belgeyi Görüntüle
            </a>
          )}
        </div>
      ))}
    </div>
  );
};

// 4. Trend Analizi Grafikleri
const BranchTrendAnalysisView = ({ branchId }: { branchId: string }) => {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        const endDate = new Date();
        const startDate = subMonths(endDate, 6);
        
        const { data: visits } = await supabase
          .from('visits')
          .select('visit_date, equipment_checks')
          .eq('branch_id', branchId)
          .eq('status', 'completed')
          .gte('visit_date', startDate.toISOString())
          .lte('visit_date', endDate.toISOString())
          .order('visit_date', { ascending: true });

        const monthlyStats: Record<string, any> = {};

        visits?.forEach(visit => {
          const monthKey = format(parseISO(visit.visit_date), 'MMM yyyy', { locale: tr });
          if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = { month: monthKey, aktivite: 0, kontrol: 0 };
          }
          if (visit.equipment_checks) {
            Object.values(visit.equipment_checks).forEach((check: any) => {
               monthlyStats[monthKey].kontrol++;
               // Dinamik aktivite kontrolü
               const isActivity = Object.values(check).some(val => 
                 val === true || val === 'true' || val === 'var' || val === 'problem' || val === 'issue' || (typeof val === 'number' && val > 0)
               );
               if (isActivity) monthlyStats[monthKey].aktivite++;
            });
          }
        });
        setTrendData(Object.values(monthlyStats));
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchTrendData();
  }, [branchId]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></div>;
  if (trendData.length === 0) return <div className="p-8 text-center text-gray-500 bg-gray-50 rounded border border-dashed">Veri yok.</div>;

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" /> Aktivite Trendi</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" style={{ fontSize: '12px' }} />
            <YAxis allowDecimals={false} style={{ fontSize: '12px' }} />
            <Tooltip />
            <Bar dataKey="aktivite" name="Aktivite Sayısı" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={40} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 5. Ziyaret Listesi
const BranchVisitsList = ({ branchId }: { branchId: string }) => {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisits = async () => {
      const { data } = await supabase
        .from('visits')
        .select('*')
        .eq('branch_id', branchId)
        .order('visit_date', { ascending: false })
        .limit(10);
      setVisits(data || []);
      setLoading(false);
    };
    fetchVisits();
  }, [branchId]);

  if (loading) return <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto"/></div>;
  if (visits.length === 0) return <div className="p-4 text-center text-gray-500">Kayıtlı ziyaret bulunmuyor.</div>;

  return (
    <div className="space-y-2">
      {visits.map((visit) => (
        <div key={visit.id} className="flex justify-between items-center p-3 bg-white border rounded-lg hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${
              visit.status === 'completed' ? 'bg-green-500' : 
              visit.status === 'cancelled' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <div>
              <p className="font-medium text-sm text-gray-900">
                {format(parseISO(visit.visit_date), 'dd MMMM yyyy', { locale: tr })}
              </p>
              <p className="text-xs text-gray-500 capitalize">{visit.visit_type || 'Standart Ziyaret'}</p>
            </div>
          </div>
          <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">
            {visit.status === 'completed' ? 'Tamamlandı' : visit.status === 'cancelled' ? 'İptal' : 'Planlandı'}
          </span>
        </div>
      ))}
    </div>
  );
};

// 6. Diğer Listeler (Basitleştirilmiş)
const BranchMaterialUsageList = ({ branchId }: { branchId: string }) => {
  const [sales, setSales] = useState<any[]>([]);
  useEffect(() => {
    const f = async () => {
      const { data } = await supabase.from('paid_material_sales').select('*, items:paid_material_sale_items(quantity, products:paid_products(name))').eq('branch_id', branchId).limit(5);
      setSales(data || []);
    };
    f();
  }, [branchId]);
  return sales.length ? <div className="space-y-2">{sales.map((s, i) => <div key={i} className="p-3 bg-white border rounded text-sm">Total: {s.total_amount}₺</div>)}</div> : <div className="text-center text-gray-500 p-4">Malzeme kaydı yok.</div>;
};

const BranchPesticideUsageView = ({ branchId }: { branchId: string }) => (
  <div className="p-6 text-center text-gray-500 bg-white border border-dashed border-gray-300 rounded-lg">
    <Bug className="w-12 h-12 mx-auto mb-2 text-gray-300" />
    <p>Pestisit verisi bulunamadı.</p>
  </div>
);

const BranchCorrectiveActionsList = ({ branchId }: { branchId: string }) => {
  const [actions, setActions] = useState<any[]>([]);
  useEffect(() => {
    const f = async () => {
      const { data } = await supabase.from('corrective_actions').select('*').eq('branch_id', branchId).limit(5);
      setActions(data || []);
    };
    f();
  }, [branchId]);
  return actions.length ? <div className="space-y-2">{actions.map((a, i) => <div key={i} className="p-3 bg-white border rounded text-sm">{a.non_compliance_type}</div>)}</div> : <div className="text-center text-gray-500 p-4">DÖF kaydı yok.</div>;
};

// --- ANA BİLEŞEN ---
const BranchDashboard: React.FC = () => {
  const [stats, setStats] = useState({ completedVisits: 0, pendingVisits: 0, totalOperators: 0 });
  const [monthlyPlans, setMonthlyPlans] = useState<MonthlyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [activeTab, setActiveTab] = useState('visits');

  useEffect(() => {
    fetchBranchData();
  }, []);

  const fetchBranchData = async () => {
    try {
      setLoading(true);
      const localSession = localAuth.getSession();
      let bId: string | null = null;

      if (localSession && localSession.type === 'branch') {
        bId = localSession.id;
        setBranchName(localSession.name); // Varsayılan isim
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: branchData } = await supabase.from('branches').select('id, sube_adi').eq('auth_id', user.id).single();
          if (branchData) {
            bId = branchData.id;
            setBranchName(branchData.sube_adi);
          }
        }
      }

      if (!bId) throw new Error('Şube oturumu bulunamadı.');
      setBranchId(bId);

      // İstatistikler
      const currentYear = new Date().getFullYear();
      const [visitsRes, operatorsRes, monthlyPlansRes] = await Promise.all([
        supabase.from('visits').select('status').eq('branch_id', bId),
        supabase.from('operators').select('id').eq('branch_id', bId),
        supabase.from('monthly_visit_schedules').select('month, visits_required').eq('branch_id', bId).or(`year.eq.${currentYear},year.is.null`)
      ]);

      const completedVisits = visitsRes.data?.filter(v => v.status === 'completed').length || 0;
      const pendingVisits = visitsRes.data?.filter(v => v.status === 'planned').length || 0;

      const aggregatedPlans = Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1;
        const plansForMonth = monthlyPlansRes.data?.filter((p: any) => p.month === monthNum) || [];
        const total = plansForMonth.reduce((sum: number, p: any) => sum + (p.visits_required || 0), 0);
        return { month: monthNum, total_required: total };
      });

      setStats({ completedVisits, pendingVisits, totalOperators: operatorsRes.data?.length || 0 });
      setMonthlyPlans(aggregatedPlans);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Hata: {error}</div>;

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Başlık */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 uppercase">{branchName || 'ŞUBE PANELİ'}</h1>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Tamamlanan Ziyaretler" value={stats.completedVisits} icon={<FileText size={24} />} changeType="positive" bgColor="bg-white" />
        <StatCard title="Bekleyen Ziyaretler" value={stats.pendingVisits} icon={<Calendar size={24} />} changeType="neutral" bgColor="bg-white" />
        <StatCard title="Aktif Operatörler" value={stats.totalOperators} icon={<Users size={24} />} changeType="neutral" bgColor="bg-white" />
      </div>

      {/* Aylık Plan */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart className="text-blue-600" /> {new Date().getFullYear()} Ziyaret Planı
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {monthlyPlans.map((plan) => {
                const isCurrent = plan.month === (new Date().getMonth() + 1);
                return (
                    <div key={plan.month} className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${isCurrent ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                        <span className={`text-sm font-medium mb-1 ${isCurrent ? 'text-blue-700' : 'text-gray-500'}`}>{MONTH_NAMES[plan.month - 1]}</span>
                        <span className={`text-2xl font-bold ${plan.total_required > 0 ? 'text-gray-800' : 'text-gray-300'}`}>{plan.total_required}</span>
                        <span className="text-xs text-gray-400">Ziyaret</span>
                    </div>
                );
            })}
        </div>
      </div>

      {/* DETAYLI İÇERİK SEKMELERİ */}
      {branchId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex flex-wrap gap-2">
                <button onClick={() => setActiveTab('visits')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'visits' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><Clock size={16} /> Ziyaretler</button>
                <button onClick={() => setActiveTab('calendar')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><Calendar size={16} /> Takvim</button>
                <button onClick={() => setActiveTab('equipment')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'equipment' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><Package size={16} /> Ekipmanlar</button>
                <button onClick={() => setActiveTab('dof')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'dof' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><AlertCircle size={16} /> DÖF</button>
                <button onClick={() => setActiveTab('materials')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'materials' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><FileText size={16} /> Malzeme</button>
                <button onClick={() => setActiveTab('documents')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'documents' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><FileCheck size={16} /> Dökümanlar</button>
                <button onClick={() => setActiveTab('certificates')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'certificates' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><Award size={16} /> Sertifikalar</button>
                <button onClick={() => setActiveTab('floorplan')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'floorplan' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><Layout size={16} /> Kroki</button>
                <button onClick={() => setActiveTab('trends')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'trends' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}><TrendingUp size={16} /> Trend</button>
            </div>

            <div className="p-6 bg-gray-50/30 min-h-[400px]">
                {activeTab === 'visits' && <BranchVisitsList branchId={branchId} />}
                {activeTab === 'calendar' && <BranchCalendarView branchId={branchId} />}
                {activeTab === 'equipment' && <BranchEquipment branchId={branchId} />}
                {activeTab === 'dof' && <BranchCorrectiveActionsList branchId={branchId} />}
                {activeTab === 'materials' && <BranchMaterialUsageList branchId={branchId} />}
                {activeTab === 'documents' && <BranchDocumentsView branchId={branchId} />}
                {activeTab === 'certificates' && <BranchCertificatesView branchId={branchId} />}
                {activeTab === 'floorplan' && <FloorPlanViewer branchId={branchId} />}
                {activeTab === 'trends' && <BranchTrendAnalysisView branchId={branchId} />}
            </div>
        </div>
      )}
    </div>
  );
};

export default BranchDashboard;