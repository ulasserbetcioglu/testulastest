import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Building, ChevronDown, ChevronUp, Package, Calendar, Layout, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import type { Branch } from '../types';
import BranchEquipment from '../components/Branches/BranchEquipment';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- Mock Component for Floor Plan (Replace with actual component if available) ---
const BranchFloorPlanView = ({ branchId }: { branchId: string }) => (
  <div className="p-4 text-center text-gray-500 bg-white border rounded-lg">
    <Layout className="w-12 h-12 mx-auto mb-2 text-gray-300" />
    <p>Kroki görüntüleme modülü ({branchId})</p>
  </div>
);

// --- Mock Component for Trend Analysis (Replace with actual component if available) ---
const BranchTrendAnalysisView = ({ branchId }: { branchId: string }) => (
  <div className="p-4 text-center text-gray-500 bg-white border rounded-lg">
    <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
    <p>Trend analiz grafikleri ({branchId})</p>
  </div>
);

// --- Component for Branch Visits ---
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
                {format(new Date(visit.visit_date), 'dd MMMM yyyy', { locale: tr })}
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

const CustomerBranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State to track which branch is expanded and which tab is active within that branch
  // Format: { branchId: 'equipment' | 'visits' | 'floorplan' | 'trends' | null }
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
      [branchId]: prev[branchId] === tabName ? null : tabName // Toggle off if same tab clicked
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
                {/* Branch Header Info */}
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                        <Building size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{branch.sube_adi}</h3>
                        <span className="text-sm text-gray-500">{branch.sehir}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPin size={18} className="mt-1 shrink-0 text-gray-400" />
                      <span className="text-sm">{branch.adres || 'Adres belirtilmemiş'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={18} className="shrink-0 text-gray-400" />
                      <span className="text-sm">{branch.telefon || 'Telefon belirtilmemiş'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={18} className="shrink-0 text-gray-400" />
                      <span className="text-sm">{branch.email || 'E-posta belirtilmemiş'}</span>
                    </div>
                  </div>
                </div>

                {/* Action Tabs Bar */}
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleTab(branch.id, 'equipment')}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'equipment' 
                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' 
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    <Package size={16} />
                    Ekipmanlar
                    {activeTab === 'equipment' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  <button
                    onClick={() => toggleTab(branch.id, 'visits')}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'visits' 
                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' 
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    <Calendar size={16} />
                    Ziyaretler
                    {activeTab === 'visits' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  <button
                    onClick={() => toggleTab(branch.id, 'floorplan')}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'floorplan' 
                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' 
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    <Layout size={16} />
                    Kroki
                    {activeTab === 'floorplan' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  <button
                    onClick={() => toggleTab(branch.id, 'trends')}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'trends' 
                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' 
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    <TrendingUp size={16} />
                    Trend Analiz
                    {activeTab === 'trends' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* Content Area (Conditional Rendering based on active tab) */}
                {activeTab && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50/30 animate-in fade-in slide-in-from-top-2 duration-200">
                    {activeTab === 'equipment' && (
                      /* BranchId ve ReadOnly mode prop'u eklendi (eğer BranchEquipment destekliyorsa) 
                         Not: BranchEquipment componentinizde 'readonly' veya 'hideAddButton' prop'u yoksa,
                         isAdmin kontrolü zaten butonları gizleyecektir çünkü müşteri admin değildir.
                         Ancak garanti olsun diye admin check'i component içinde zaten var. */
                      <BranchEquipment branchId={branch.id} />
                    )}
                    {activeTab === 'visits' && (
                      <BranchVisitsList branchId={branch.id} />
                    )}
                    {activeTab === 'floorplan' && (
                      <BranchFloorPlanView branchId={branch.id} />
                    )}
                    {activeTab === 'trends' && (
                      <BranchTrendAnalysisView branchId={branch.id} />
                    )}
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