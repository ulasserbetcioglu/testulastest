import React, { useState, useEffect } from 'react';
import { 
  MapPin, Phone, Mail, Building, ChevronDown, ChevronUp, 
  Package, Calendar, Layout, TrendingUp, Loader2, 
  AlertCircle, Bug, FileText, Filter
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import type { Branch } from '../types';
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

// --- Interfaces ---
interface EquipmentCheck {
  status: string;
  activity?: boolean;
  consumption?: string;
  count?: number;
  description?: string;
  [key: string]: any;
}

interface Visit {
  id: string;
  visit_date: string;
  equipment_checks: Record<string, EquipmentCheck>;
  status: string;
  operator: { name: string };
}

interface Equipment {
  id: string;
  equipment_code: string;
  department: string;
  equipment: { name: string; type: string };
}

// --- 1. TREND ANALİZ BİLEŞENİ (GRAFİKLER) ---
const BranchTrendAnalysisView = ({ branchId }: { branchId: string }) => {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendData();
  }, [branchId]);

  const fetchTrendData = async () => {
    try {
      // Son 6 ayı baz al
      const endDate = new Date();
      const startDate = subMonths(endDate, 6);
      
      const { data: visits, error } = await supabase
        .from('visits')
        .select('visit_date, equipment_checks')
        .eq('branch_id', branchId)
        .eq('status', 'completed')
        .gte('visit_date', startDate.toISOString())
        .lte('visit_date', endDate.toISOString())
        .order('visit_date', { ascending: true });

      if (error) throw error;

      // Veriyi işle: Aylara göre grupla
      const monthlyStats: Record<string, any> = {};

      visits?.forEach(visit => {
        const monthKey = format(parseISO(visit.visit_date), 'MMM yyyy', { locale: tr });
        
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = {
            month: monthKey,
            kemirgen_aktivite: 0,
            ucan_sayim: 0,
            yuruyen_aktivite: 0,
            kontrol_sayisi: 0
          };
        }

        if (visit.equipment_checks) {
          Object.values(visit.equipment_checks).forEach((check: any) => {
             monthlyStats[monthKey].kontrol_sayisi++;
             
             // Aktivite Sayımları
             if (check.activity === true || check.activity === 'true') {
               monthlyStats[monthKey].kemirgen_aktivite++;
             }
             
             // Sinek Sayımları (EFC)
             if (check.count && typeof check.count === 'number') {
               monthlyStats[monthKey].ucan_sayim += check.count;
             }
          });
        }
      });

      setTrendData(Object.values(monthlyStats));
    } catch (err) {
      console.error("Trend data error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></div>;
  
  if (trendData.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed">
        <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">Bu şube için yeterli trend verisi bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aktivite Grafiği */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <ActivityIcon className="w-4 h-4 text-blue-500" /> Kemirgen Aktivite Trendi
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" style={{ fontSize: '12px' }} />
                <YAxis allowDecimals={false} style={{ fontSize: '12px' }} />
                <Tooltip />
                <Bar dataKey="kemirgen_aktivite" name="Aktivite Sayısı" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* EFC Sayım Grafiği */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Bug className="w-4 h-4 text-green-500" /> Uçan Haşere (EFC) Sayımları
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ucan_sayim" name="Toplam Yakalama" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
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
    loadData();
  }, [branchId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 1. Ekipmanları Çek
      const { data: eqData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, department, equipment:equipment_id(name, type)')
        .eq('branch_id', branchId)
        .order('equipment_code');
      
      setEquipments(eqData || []);

      // 2. Ziyaretleri Çek (Dropdown için)
      const { data: visitData } = await supabase
        .from('visits')
        .select('id, visit_date, equipment_checks, status, operator:operator_id(name)')
        .eq('branch_id', branchId)
        .eq('status', 'completed')
        .order('visit_date', { ascending: false })
        .limit(10); // Son 10 ziyaret

      setVisits(visitData || []);
      
      // Varsayılan olarak en son ziyareti seç
      if (visitData && visitData.length > 0) {
        setSelectedVisitId(visitData[0].id);
      }

    } catch (err) {
      console.error("Data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedVisit = visits.find(v => v.id === selectedVisitId);

  // Ekipmanları Departmana Göre Grupla
  const groupedEquipments = equipments.reduce((acc, eq) => {
    const dept = eq.department || 'Diğer';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(eq);
    return acc;
  }, {} as Record<string, Equipment[]>);

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      {/* Ziyaret Seçimi */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-full shadow-sm text-blue-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-blue-900">Ziyaret Bazlı Ekipman Raporu</h4>
            <p className="text-xs text-blue-700">Hangi tarihteki kontrolleri görmek istediğinizi seçin.</p>
          </div>
        </div>
        
        <div className="w-full sm:w-64">
          <select 
            value={selectedVisitId} 
            onChange={(e) => setSelectedVisitId(e.target.value)}
            className="w-full p-2.5 text-sm border-blue-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
          >
            {visits.length === 0 && <option>Tamamlanmış ziyaret yok</option>}
            {visits.map(v => (
              <option key={v.id} value={v.id}>
                {format(parseISO(v.visit_date), 'dd MMMM yyyy', { locale: tr })} - {v.operator?.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ekipman Listesi ve Durumları */}
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
                  // Bu ekipman için ziyaretteki veriyi bul (ID ile eşleşir)
                  const checkData = selectedVisit.equipment_checks?.[eq.id];
                  const hasActivity = checkData?.activity === true || checkData?.activity === 'true';
                  
                  return (
                    <div key={eq.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full ${hasActivity ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{eq.equipment.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{eq.equipment_code}</div>
                        </div>
                      </div>

                      {/* Kontrol Sonuçları */}
                      <div className="flex flex-wrap gap-2 items-center justify-start sm:justify-end">
                        {checkData ? (
                          <>
                            {/* Durum Badge */}
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${
                              checkData.status === 'ok' ? 'bg-green-50 text-green-700 border-green-200' :
                              checkData.status === 'issue' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                              {checkData.status === 'ok' ? 'Sorunsuz' : checkData.status}
                            </span>

                            {/* Aktivite */}
                            {checkData.activity !== undefined && (
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${
                                hasActivity ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                              }`}>
                                {hasActivity ? '⚠️ Aktivite Var' : 'Aktivite Yok'}
                              </span>
                            )}

                            {/* Tüketim */}
                            {checkData.consumption && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                                Tüketim: {checkData.consumption}
                              </span>
                            )}

                            {/* Sayım */}
                            {checkData.count !== undefined && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                Sayım: {checkData.count}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic px-2">Kontrol Verisi Yok</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
          <p className="text-gray-500">Görüntülenecek ziyaret verisi bulunamadı.</p>
        </div>
      )}
    </div>
  );
};

// --- DİĞER BİLEŞENLER (Aynı kalıyor, sadece placeholderları güncelledim) ---
const BranchFloorPlanView = ({ branchId }: { branchId: string }) => (
  <div className="p-6 text-center text-gray-500 bg-white border border-dashed border-gray-300 rounded-lg">
    <Layout className="w-12 h-12 mx-auto mb-2 text-gray-300" />
    <p>Bu şube için kroki yüklenmemiştir.</p>
  </div>
);

const BranchPesticideUsageView = ({ branchId }: { branchId: string }) => (
  <div className="p-6 text-center text-gray-500 bg-white border border-dashed border-gray-300 rounded-lg">
    <Bug className="w-12 h-12 mx-auto mb-2 text-gray-300" />
    <p>Bu şube için pestisit kullanım raporu bulunamadı.</p>
  </div>
);

// Ziyaret Listesi
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
        .limit(5);
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

// Malzeme Kullanımı
const BranchMaterialUsageList = ({ branchId }: { branchId: string }) => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      const { data, error } = await supabase
        .from('paid_material_sales')
        .select(`
          *, 
          paid_material_sale_items (
            quantity, 
            unit_price,
            products:paid_products ( name )
          )
        `)
        .eq('branch_id', branchId)
        .order('sale_date', { ascending: false })
        .limit(5);
      
      setSales(data || []);
      setLoading(false);
    };
    fetchSales();
  }, [branchId]);

  if (loading) return <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto"/></div>;
  if (sales.length === 0) return <div className="p-4 text-center text-gray-500">Malzeme kullanım kaydı bulunmuyor.</div>;

  return (
    <div className="space-y-3">
      {sales.map((sale) => (
        <div key={sale.id} className="p-3 bg-white border rounded-lg">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-sm text-gray-900">
                {format(parseISO(sale.sale_date), 'dd MMMM yyyy', { locale: tr })}
              </span>
            </div>
            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
              {sale.total_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </span>
          </div>
          <div className="pl-6 space-y-1">
            {sale.paid_material_sale_items?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-xs text-gray-600">
                <span>• {item.products?.name || 'Ürün'}</span>
                <span className="font-medium">{item.quantity} Adet</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// DÖF Listesi
const BranchCorrectiveActionsList = ({ branchId }: { branchId: string }) => {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActions = async () => {
      const { data } = await supabase
        .from('corrective_actions')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(5);
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
            <div>
              <p className="font-medium text-sm text-gray-900">{action.non_compliance_type || 'DÖF Kaydı'}</p>
              <p className="text-xs text-gray-500">{format(parseISO(action.created_at), 'dd MMM yyyy', { locale: tr })}</p>
            </div>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${action.status === 'closed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {action.status === 'closed' ? 'Kapalı' : 'Açık'}
          </span>
        </div>
      ))}
    </div>
  );
};

// --- Helper Icon Component for Recharts ---
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
          const { data: customerData } = await supabase
            .from('customers')
            .select('id')
            .eq('auth_id', user.id)
            .single();
          customerId = customerData?.id || null;
        }
      }

      if (!customerId) throw new Error('Müşteri oturumu bulunamadı.');

      const { data, error } = await supabase
        .from('branches')
        .select(`*, pricing:branch_pricing(*)`)
        .eq('customer_id', customerId)
        .order('sube_adi', { ascending: true });

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
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                      <Building size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{branch.sube_adi}</h3>
                      <span className="text-sm text-gray-500">{branch.sehir}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPin size={18} className="mt-1 shrink-0 text-gray-400" />
                      <span className="text-sm">{branch.adres || 'Adres yok'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={18} className="shrink-0 text-gray-400" />
                      <span className="text-sm">{branch.telefon || 'Telefon yok'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={18} className="shrink-0 text-gray-400" />
                      <span className="text-sm">{branch.email || 'E-posta yok'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex flex-wrap gap-2">
                  <button onClick={() => toggleTab(branch.id, 'equipment')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'equipment' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}>
                    <Package size={16} /> Ekipmanlar {activeTab === 'equipment' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => toggleTab(branch.id, 'visits')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'visits' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}>
                    <Calendar size={16} /> Ziyaretler {activeTab === 'visits' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => toggleTab(branch.id, 'dof')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'dof' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}>
                    <AlertCircle size={16} /> DÖF {activeTab === 'dof' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => toggleTab(branch.id, 'materials')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'materials' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}>
                    <FileText size={16} /> Malzeme {activeTab === 'materials' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => toggleTab(branch.id, 'pesticides')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'pesticides' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}>
                    <Bug size={16} /> Pestisit {activeTab === 'pesticides' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => toggleTab(branch.id, 'floorplan')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'floorplan' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}>
                    <Layout size={16} /> Kroki {activeTab === 'floorplan' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => toggleTab(branch.id, 'trends')} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'trends' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-white'}`}>
                    <TrendingUp size={16} /> Trend Analiz {activeTab === 'trends' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {activeTab && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50/30 animate-in fade-in slide-in-from-top-2 duration-200">
                    {activeTab === 'equipment' && <BranchEquipmentActivityView branchId={branch.id} />}
                    {activeTab === 'visits' && <BranchVisitsList branchId={branch.id} />}
                    {activeTab === 'dof' && <BranchCorrectiveActionsList branchId={branch.id} />}
                    {activeTab === 'materials' && <BranchMaterialUsageList branchId={branch.id} />}
                    {activeTab === 'pesticides' && <BranchPesticideUsageView branchId={branch.id} />}
                    {activeTab === 'floorplan' && <BranchFloorPlanView branchId={branch.id} />}
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