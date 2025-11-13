// src/App.tsx
'use client';

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
// ✅ DÜZELTME: Dosya yolları, App.tsx'in konumuna göre düzeltildi.
import { AuthProvider } from './components/Auth/AuthProvider';
import Layout from './components/Layout/Layout';
import OperatorLayout from './components/Layout/OperatorLayout';
import CustomerLayout from './components/Layout/CustomerLayout';
import BranchLayout from './components/Layout/BranchLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OperatorDashboard from './pages/OperatorDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import BranchDashboard from './pages/BranchDashboard';
import Customers from './pages/Customers';
import CustomerDetails from './components/Customers/CustomerDetails';
import Offers from './pages/Offers';
import OfferTemplates from './pages/OfferTemplates';
import NewOffer from './pages/NewOffer';
import Definitions from './pages/Definitions';
import Warehouses from './pages/Warehouses';
import WarehouseTransfers from './pages/WarehouseTransfers';
import Visits from './pages/Visits';
import AdminVisits from './pages/AdminVisits';
import VisitForm from './pages/VisitForm';
import VisitDetails from './pages/VisitDetails';
import AdminCalendar from './pages/AdminCalendar';
import AdminCalendarPlanning from './pages/AdminCalendarPlanning';
import OperatorCalendar from './pages/OperatorCalendar';
import OperatorCalendarPlanning from './pages/OperatorCalendarPlanning';
import CustomerCalendar from './pages/CustomerCalendar';
import BranchCalendar from './pages/BranchCalendar';
import PaidMaterialSales from './pages/PaidMaterialSales';
import OperatorPaidMaterials from './pages/OperatorPaidMaterials';
import OperatorMaterialUsage from './pages/OperatorMaterialUsage';
import CustomerPaidMaterials from './pages/CustomerPaidMaterials';
import BranchPaidMaterials from './pages/BranchPaidMaterials';
import CorrectiveActions from './pages/CorrectiveActions';
import CustomerVisits from './pages/CustomerVisits';
import CustomerDOF from './pages/CustomerDOF';
import Documents from './pages/Documents';
import CustomerDocuments from './pages/CustomerDocuments';
import BranchDocuments from './pages/BranchDocuments';
import OperatorDocuments from './pages/OperatorDocuments';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import AdminNotifications from './pages/AdminNotifications';
import Certificates from './pages/Certificates';
import CustomerCertificates from './pages/CustomerCertificates';
import AdminRevenue from './pages/AdminRevenue';
import AdminOperators from './pages/AdminOperators';
import AdminUsers from './pages/AdminUsers';
import AdminOperatorDistances from './pages/AdminOperatorDistances';
import AdminBranchPricing from './pages/AdminBranchPricing';
import OperatorDailyChecklist from './pages/OperatorDailyChecklist';
import InvoiceExport from './pages/InvoiceExport';
import Modules from './pages/Modules';
import ActivityReportsTracking from './pages/ActivityReportsTracking';
import RiskAssessmentModule from './pages/modules/RiskAssessmentModule';
import ProposalReportModule from './pages/modules/ProposalReportModule';
import PaidVisitsPage from './pages/PaidVisitsPage';
import TrendAnalysisReport from './pages/TrendAnalysisReport';
import AdminProducts from './pages/AdminProducts';
import BulkDeletePage from './pages/BulkDeletePage';
import RouteOptimizationPage from './pages/RouteOptimizationPage';
import LiveTrackingMap from './pages/LiveTrackingMap';
import CariSatisRaporu from './pages/CariSatisRaporu';
import UvLampReport from './pages/modules/UvLampReport';
import SubeLokasyon from './pages/SubeLokasyon';
import OperatorPerformance from './pages/OperatorPerformance';
import AylikTakvimEposta from './pages/AylikTakvimEposta';
import OperatorCollectionReceipt from './pages/OperatorCollectionReceipt';
import AylikMalzemeEposta from './pages/AylikMalzemeEposta';
import PazarlamaEposta from './pages/PazarlamaEposta';
import EkipmanPazarlama from './pages/EkipmanPazarlama';
import EkipmanYonetimi from './pages/EkipmanYonetimi';
import HizmetPazarlama from './pages/HizmetYonetimi';
import GonderilenEpostalar from './pages/GonderilenEpostalar';
import TedarikSiparisi from './pages/TedarikSiparisi';
import SiparisOlusturma from './pages/SiparisOlusturma';
import HizmetYonetimi from './pages/HizmetYonetimi';
import TeklifGoruntule from './pages/TeklifGoruntule';
import TekliflerListesi from './pages/TekliflerListesi';
import IsletmeKesif from './components/IsletmeKesif'; // Dosya yolunu kendi projenize göre güncelleyin
import ModulRaporGoruntuleme from './pages/ModulRaporGoruntuleme';
import RaporSecVeGoruntule from './pages/RaporSecVeGoruntule';
import GenelRaporGoruntuleme from './pages/GenelRaporGoruntuleme';
import BilgilendirimePazarlama from './pages/BilgilendirimePazarlama';
import EpostaPazarlama from './pages/EpostaPazarlama';
import { supabase } from './lib/supabase';
// YENİ EKLENEN IMPORT
import YillikKarZararRaporu from './pages/YillikKarZararRaporu';
import ProfitabilityAnalysis from './pages/ProfitabilityAnalysis';
import BulkVisitImport from './pages/BulkVisitImport'; // Import the new component
import AdminBranches from './pages/AdminBranches'; 
import OperatorQuickNotes from './pages/OperatorQuickNotes'; // Import the new component
import AdminQuickNotes from './pages/AdminQuickNotes'; // Import the new AdminQuickNotes component
import UnbilledCustomers from './pages/UnbilledCustomers'; // YENİ: Faturasız Müşteriler sayfasını import edin
import AdminCollectionReceipts from './pages/AdminCollectionReceipts'; // YENİ: AdminCollectionReceipts sayfasını import edin
import AdminVisitReports from './pages/AdminVisitReports'; // NEW: Import AdminVisitReports
import AdminOperatorShifts from './pages/AdminOperatorShifts'; // NEW: Import AdminOperatorShifts
import ProtectedReportViewer from './components/ProtectedReportViewer'; // ✅ YENİ: ProtectedReportViewer import edildi
import AdminOperatorLeaves from './pages/AdminOperatorLeaves'; // NEW: Import AdminOperatorLeaves
import AdminVehicles from './pages/AdminVehicles'; // NEW: Import AdminVehicles
import AdminMonthlyVisitSchedule from './pages/AdminMonthlyVisitSchedule';
import OperatorWeeklyKmForm from './pages/OperatorWeeklyKmForm'; // NEW: Import OperatorWeeklyKmForm
// YENİ EKLENEN RAPOR SAYFASI
import PesticideUsageReport from './pages/PesticideUsageReport';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabaseSession = localStorage.getItem('sb-mlegotnkqlnkfwqblqbs-auth-token');
  const localSession = localStorage.getItem('local_session');
  return (supabaseSession || localSession) ? children : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          setIsAdmin(user.email === 'admin@ilaclamatik.com');
        } else {
          setIsAdmin(profileData.role === 'admin');
        }
      } catch (error) {
        console.error('Admin check error:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  return isAdmin ? children : <Navigate to="/" />;
};

const RoleBasedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  React.useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } = {} } = await supabase.auth.getUser(); // Destructure with default empty object
        if (!user) {
          setLoading(false);
          return;
        }

        setCurrentUser(user);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData?.role) {
          setUserRole(profileData.role);
        } else {
          const { data: operatorData } = await supabase
            .from('operators')
            .select('id')
            .eq('auth_id', user.id)
            .maybeSingle();

          if (operatorData) {
            setUserRole('operator');
          } else {
            const { data: customerData } = await supabase
              .from('customers')
              .select('id')
              .eq('auth_id', user.id)
              .maybeSingle();

            if (customerData) {
              setUserRole('customer');
            } else {
              const { data: branchData } = await supabase
                .from('branches')
                .select('id')
                .eq('auth_id', user.id)
                .maybeSingle();

              if (branchData) {
                setUserRole('branch');
              } else if (user.email === 'admin@ilaclamatik.com') {
                setUserRole('admin');
              } else {
                setUserRole('user');
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Role check error:', err);
        setUserRole('user');
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [navigate]);

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  if (userRole === 'operator' || (userRole === 'user' && /^[^@]+@ilaclamatik\.com$/.test(currentUser?.email ?? '') && currentUser?.email !== 'admin@ilaclamatik.com')) {
    return <Navigate to="/operator" />;
  } else if (userRole === 'customer') {
    return <Navigate to="/customer" />;
  } else if (userRole === 'branch') {
    return <Navigate to="/branch" />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/teklif-goruntule/:id" element={<TeklifGoruntule />} />
          {/* ✅ YENİ ROTA: Korumalı rapor görüntüleyici */}
          <Route path="/view-report-protected/:documentId" element={<ProtectedReportViewer />} />
          
          {/* Admin Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleBasedRoute>
                  <Layout />
                </RoleBasedRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="modules" element={<Modules />} />
            <Route path="musteriler" element={<Customers />} />
            <Route path="musteriler/:id" element={<CustomerDetails />} />
            <Route path="ziyaretler" element={<AdminVisits />} />
            <Route path="ziyaretler/yeni" element={<VisitForm />} />
            <Route path="teklifler" element={<TekliflerListesi />} />
            <Route path="teklifler/templates" element={<OfferTemplates />} />
            <Route path="teklifler/new" element={<NewOffer />} />
            <Route path="depolar" element={<Warehouses />} />
            <Route path="depolar/transfer" element={<WarehouseTransfers />} />
            <Route path="ucretli-malzemeler" element={<PaidMaterialSales />} />
            <Route path="gelir-yonetimi" element={<AdminRevenue />} />
            <Route path="dokumanlar" element={<Documents />} />
            <Route path="sertifikalar" element={<Certificates />} />
            <Route path="ayarlar" element={<Settings />} />
            <Route path="bildirimler" element={<Notifications />} />
            <Route path="bildirim-gonder" element={<AdminNotifications />} />
            <Route path="tanimlamalar" element={<Definitions />} />
            <Route path="takvim" element={<AdminCalendar />} />
            <Route path="takvim-planlama" element={<AdminCalendarPlanning />} />
            <Route path="operatorler" element={<AdminOperators />} />
            <Route path="kullanicilar" element={<AdminUsers />} />      
            <Route path="operator-mesafeleri" element={<AdminOperatorDistances />} />
            <Route path="subeler" element={<AdminBranches />} /> {/* NEW: Admin Branches Page */}
            <Route path="sube-fiyatlandirma" element={<AdminBranchPricing />} />
            <Route path="fatura-export" element={<AdminRoute><InvoiceExport /></AdminRoute>} />
            <Route path="faaliyet-rapor-takip" element={<ActivityReportsTracking />} />
            <Route path="moduller/risk-degerlendirme" element={<RiskAssessmentModule />} />
            <Route path="ucretli-ziyaretler" element={<PaidVisitsPage />} />
            <Route path="trend-analizi" element={<TrendAnalysisReport />} />
            <Route path="urunler" element={<AdminProducts />} />
            <Route path="toplu-silme" element={<BulkDeletePage />} />
            <Route path="rota-optimizasyonu" element={<RouteOptimizationPage />} />
            <Route path="canli-harita" element={<LiveTrackingMap />} />
            <Route path="cari-satis-raporu" element={<CariSatisRaporu />} />
            {/* YENİ EKLENEN ROTA */}
            <Route path="yillik-kar-zarar" element={<YillikKarZararRaporu />} />
            <Route path="karlilik-analizi" element={<ProfitabilityAnalysis />} />
            <Route path="/moduller/uv-lamba-raporu" element={<UvLampReport />} />
            <Route path="sube-lokasyon" element={<SubeLokasyon />} />
            <Route path="operator-performans" element={<OperatorPerformance />} />
            <Route path="aylik-takvim-eposta" element={<AylikTakvimEposta />} />
            <Route path="tahsilat-makbuzu" element={<OperatorCollectionReceipt />} />
            <Route path="aylik-malzeme-eposta" element={<AylikMalzemeEposta />} />
            <Route path="pazarlama-eposta" element={<PazarlamaEposta />} />
            <Route path="ekipman-pazarlama" element={<EkipmanPazarlama />} />
            <Route path="ekipman-yonetimi" element={<EkipmanYonetimi />} />
            <Route path="hizmet-pazarlama" element={<HizmetPazarlama />} />
            <Route path="gonderilen-epostalar" element={<GonderilenEpostalar />} />
            <Route path="siparis-olustur" element={<SiparisOlusturma />} />
            <Route path="tedarik-siparisi" element={<TedarikSiparisi />} />
            <Route path="hizmet-yonetimi" element={<HizmetYonetimi />} />
            <Route path="moduller/teklif-raporu" element={<ProposalReportModule />} />
            <Route path="teklif-goruntule" element={<TeklifGoruntule />} />
            <Route path="/rapor/goruntule/:reportId" element={<ModulRaporGoruntuleme />} />
            <Route path="/rapor-goruntule" element={<RaporSecVeGoruntule />} />
            <Route path="/raporlar" element={<GenelRaporGoruntuleme />} />
            <Route path="/hizmet-pazarlama" element={<BilgilendirimePazarlama />} />
            <Route path="/eposta-pazarlama" element={<EpostaPazarlama />} />
            <Route path="/isletme-kesif" element={<IsletmeKesif />} />
            {/* NEW ADMIN ROUTE FOR BULK VISIT IMPORT */}
            <Route path="/bulk-visit-import" element={<AdminRoute><BulkVisitImport /></AdminRoute>} />
            {/* NEW ADMIN ROUTE FOR QUICK NOTES */}
            <Route path="/hizli-notlar" element={<AdminRoute><AdminQuickNotes /></AdminRoute>} />
            {/* YENİ: Faturasız Müşteriler Sayfası */}
            <Route path="/faturasiz-musteriler" element={<AdminRoute><UnbilledCustomers /></AdminRoute>} />
            {/* YENİ: Admin Tahsilat Makbuzları Sayfası */}
            <Route path="/admin/tahsilat-makbuzlari" element={<AdminRoute><AdminCollectionReceipts /></AdminRoute>} />
            {/* NEW: Admin Visit Reports Page */}
            <Route path="/admin/ziyaret-raporlari" element={<AdminRoute><AdminVisitReports /></AdminRoute>} />
            {/* NEW: Admin Operator Shifts Page */}
            <Route path="/admin/mesai-cizelgeleri" element={<AdminRoute><AdminOperatorShifts /></AdminRoute>} />
            {/* NEW: Admin Operator Leaves Page */}
            <Route path="/admin/operator-leaves" element={<AdminRoute><AdminOperatorLeaves /></AdminRoute>} />
            {/* NEW: Admin Vehicles Page */}
            <Route path="/admin/vehicles" element={<AdminRoute><AdminVehicles /></AdminRoute>} />
            {/* Monthly Visit Schedule */}
            <Route path="/admin/monthly-visit-schedule" element={<AdminRoute><AdminMonthlyVisitSchedule /></AdminRoute>} />
          </Route>
          
        

          {/* Operator Routes */}
          <Route
            path="/operator"
            element={
              <ProtectedRoute>
                <OperatorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<OperatorDashboard />} />
            <Route path="modules" element={<Modules />} />
            <Route path="gunluk-kontrol" element={<OperatorDailyChecklist />} />
            <Route path="ziyaretler" element={<Visits />} />
            <Route path="ziyaretler/yeni" element={<VisitForm />} />
            <Route path="ziyaretler/:id/start" element={<VisitDetails />} />
            <Route path="depolar" element={<Warehouses />} />
            <Route path="depolar/transfer" element={<WarehouseTransfers />} />
            <Route path="ucretli-malzemeler" element={<OperatorPaidMaterials />} />
            <Route path="malzeme-kullanimi" element={<OperatorMaterialUsage />} />
            <Route path="takvim" element={<OperatorCalendar />} />
            <Route path="takvim-planlama" element={<OperatorCalendarPlanning />} />
            <Route path="dof" element={<CorrectiveActions />} />
            <Route path="dokumanlar" element={<OperatorDocuments />} />
            <Route path="sertifikalar" element={<Certificates />} />
            <Route path="bildirimler" element={<Notifications />} />
            <Route path="teklifler" element={<Offers />} />
            <Route path="teklifler/new" element={<NewOffer />} />
            <Route path="fatura-export" element={<AdminRoute><InvoiceExport /></AdminRoute>} />
            <Route path="moduller/uv-lamba-raporu" element={<UvLampReport />} />
            <Route path="faaliyet-rapor-takip" element={<ActivityReportsTracking />} />
            <Route path="ekipman-pazarlama" element={<EkipmanPazarlama />} />
            <Route path="hizmet-pazarlama" element={<HizmetPazarlama />} />
            <Route path="tahsilat-makbuzu" element={<OperatorCollectionReceipt />} />
            <Route path="hizli-notlar" element={<OperatorQuickNotes />} /> {/* NEW: Quick Notes Route */}
            <Route path="weekly-km" element={<OperatorWeeklyKmForm />} /> {/* NEW: Operator Weekly KM Form */}
          </Route>

          {/* Customer Routes */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute>
                <CustomerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CustomerDashboard />} />
            <Route path="modules" element={<Modules />} />
            <Route path="takvim" element={<CustomerCalendar />} />
            <Route path="ziyaretler" element={<CustomerVisits />} />
            <Route path="dof" element={<CustomerDOF />} />
            <Route path="dokumanlar" element={<CustomerDocuments />} />
            <Route path="sertifikalar" element={<CustomerCertificates />} />
            <Route path="bildirimler" element={<Notifications />} />
            <Route path="malzemeler" element={<CustomerPaidMaterials />} />
            <Route path="trend-analizi" element={<div className="p-8 text-center">Trend Analizi Modülü</div>} />
            <Route path="teklifler" element={<Offers />} />
            {/* YENİ PESTİSİT RAPORU ROTASI */}
            <Route path="pestisit-raporu" element={<PesticideUsageReport />} />
          </Route>

          {/* Branch Routes */}
          <Route
            path="/branch"
            element={
              <ProtectedRoute>
                <BranchLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<BranchDashboard />} />
            <Route path="modules" element={<Modules />} />
            <Route path="takvim" element={<BranchCalendar />} />
            <Route path="dokumanlar" element={<BranchDocuments />} />
            <Route path="sertifikalar" element={<Certificates />} />
            <Route path="bildirimler" element={<Notifications />} />
            <Route path="malzemeler" element={<BranchPaidMaterials />} />
            <Route path="trend-analizi" element={<div className="p-8 text-center">Trend Analizi Modülü</div>} />
            <Route path="teklifler" element={<Offers />} />
            {/* YENİ PESTİSİT RAPORU ROTASI */}
            <Route path="pestisit-raporu" element={<PesticideUsageReport />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;