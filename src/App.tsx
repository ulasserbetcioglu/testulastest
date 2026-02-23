'use client';

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './components/Auth/AuthProvider';
import { supabase } from './lib/supabase';
import { Toaster } from 'sonner';

// --- LAYOUTS ---
import Layout from './components/Layout/Layout';
import OperatorLayout from './components/Layout/OperatorLayout';
import CustomerLayout from './components/Layout/CustomerLayout';
import BranchLayout from './components/Layout/BranchLayout';

// --- AUTH & DASHBOARDS ---
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OperatorDashboard from './pages/OperatorDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import BranchDashboard from './pages/BranchDashboard';

// --- ADMIN PAGES ---
import Customers from './pages/Customers';
import TrendAnalysis from './pages/TrendAnalysis';
import AdminPhotoMigration from './pages/AdminPhotoMigration';
import AdminDataSimulator from './pages/AdminDataSimulator';
import CustomerDetails from './components/Customers/CustomerDetails';
import AdminEnvironmentalRiskAssessment from './pages/AdminEnvironmentalRiskAssessment';
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
import PaidMaterialSales from './pages/PaidMaterialSales';
import AdminRevenue from './pages/AdminRevenue';
import Documents from './pages/Documents';
import Certificates from './pages/Certificates';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import AdminNotifications from './pages/AdminNotifications';
import AdminOperators from './pages/AdminOperators';
import AdminUsers from './pages/AdminUsers';
import AdminOperatorDistances from './pages/AdminOperatorDistances';
import AdminBranches from './pages/AdminBranches';
import AdminBranchPricing from './pages/AdminBranchPricing';
import InvoiceExport from './pages/InvoiceExport';
import Modules from './pages/Modules';
import ActivityReportsTracking from './pages/ActivityReportsTracking';
import RiskAssessmentModule from './pages/modules/RiskAssessmentModule';
import PaidVisitsPage from './pages/PaidVisitsPage';
import AdminProducts from './pages/AdminProducts';
import BulkDeletePage from './pages/BulkDeletePage';
import RouteOptimizationPage from './pages/RouteOptimizationPage';
import LiveTrackingMap from './pages/LiveTrackingMap';
import CariSatisRaporu from './pages/CariSatisRaporu';
import YillikKarZararRaporu from './pages/YillikKarZararRaporu';
import ProfitabilityAnalysis from './pages/ProfitabilityAnalysis';
import UvLampReport from './pages/modules/UvLampReport';
import SubeLokasyon from './pages/SubeLokasyon';
import OperatorPerformance from './pages/OperatorPerformance';
import AylikTakvimEposta from './pages/AylikTakvimEposta';
import OperatorCollectionReceipt from './pages/OperatorCollectionReceipt';
import AylikMalzemeEposta from './pages/AylikMalzemeEposta';
import PazarlamaEposta from './pages/PazarlamaEposta';
import EkipmanPazarlama from './pages/EkipmanPazarlama';
import EkipmanYonetimi from './pages/EkipmanYonetimi';
import HizmetPazarlama from './pages/HizmetPazarlama';
import GonderilenEpostalar from './pages/GonderilenEpostalar';
import TedarikSiparisi from './pages/TedarikSiparisi';
import SiparisOlusturma from './pages/SiparisOlusturma';
import HizmetYonetimi from './pages/HizmetYonetimi';
import ProposalReportModule from './pages/modules/ProposalReportModule';
import TeklifGoruntule from './pages/TeklifGoruntule';
import ModulRaporGoruntuleme from './pages/ModulRaporGoruntuleme';
import RaporSecVeGoruntule from './pages/RaporSecVeGoruntule';
import GenelRaporGoruntuleme from './pages/GenelRaporGoruntuleme';
import BilgilendirmePazarlama from './pages/BilgilendirmePazarlama';
import SurveyResults from './pages/SurveyResults';
import EpostaPazarlama from './pages/EpostaPazarlama';
import IsletmeKesif from './components/IsletmeKesif';
import SurveyPage from './pages/SurveyPage';
import BulkVisitImport from './pages/BulkVisitImport';
import AdminQuickNotes from './pages/AdminQuickNotes';
import UnbilledCustomers from './pages/UnbilledCustomers';
import AdminCollectionReceipts from './pages/AdminCollectionReceipts';
import AdminVisitReports from './pages/AdminVisitReports';
import AdminOperatorShifts from './pages/AdminOperatorShifts';
import AdminOperatorLeaves from './pages/AdminOperatorLeaves';
import AdminVehicles from './pages/AdminVehicles';
import AdminMonthlyVisitSchedule from './pages/AdminMonthlyVisitSchedule';
import AdminFloorPlanEditor from './pages/AdminFloorPlanEditor';
import AdminPesticideReport from './pages/AdminPesticideReport';
import AdminVisitDataEntry from './pages/AdminVisitDataEntry';
import SatisGorusmeFormu from './pages/SatisGorusmeFormu';
import AdminTrendAnalysisReport from './pages/AdminTrendAnalysisReport';
import AdminModuleReports from './pages/AdminModuleReports';
import TekliflerListesi from './pages/TekliflerListesi';
import AdminWeeklyKmTracking from './pages/AdminWeeklyKmTracking';
import AnnualVisitReport from './pages/AnnualVisitReport';
import Sozlesmeler from './pages/Sozlesmeler';
import TrainingPresentationPage from './pages/TrainingPresentationPage';
import AdminIpmContracts from './pages/AdminIpmContracts';
import AdminPestActivityLimits from './pages/AdminPestActivityLimits';
import AdminPestRiskAssessment from './pages/AdminPestRiskAssessment';
import AdminActionPlan from './pages/AdminActionPlan';
import AdminApprovedPesticides from './pages/AdminApprovedPesticides';
import PriceIncrease from './pages/PriceIncrease';

// --- OPERATOR & CUSTOMER & BRANCH PAGES ---
import OperatorCalendar from './pages/OperatorCalendar';
import OperatorCalendarPlanning from './pages/OperatorCalendarPlanning';
import OperatorPaidMaterials from './pages/OperatorPaidMaterials';
import OperatorMaterialUsage from './pages/OperatorMaterialUsage';
import CorrectiveActions from './pages/CorrectiveActions';
import OperatorDocuments from './pages/OperatorDocuments';
import OperatorDailyChecklist from './pages/OperatorDailyChecklist';
import OperatorQuickNotes from './pages/OperatorQuickNotes';
import OperatorWeeklyKmForm from './pages/OperatorWeeklyKmForm';
import CustomerCalendar from './pages/CustomerCalendar';
import CustomerPaidMaterials from './pages/CustomerPaidMaterials';
import CustomerVisits from './pages/CustomerVisits';
import CustomerDOF from './pages/CustomerDOF';
import CustomerDocuments from './pages/CustomerDocuments';
import CustomerModuleReports from './pages/CustomerModuleReports';
import CustomerTrendAnalysis from './pages/CustomerTrendAnalysis';
import CustomerTrendReports from './pages/CustomerTrendReports';
import CustomerTrendReportView from './pages/CustomerTrendReportView';
import CustomerCertificates from './pages/CustomerCertificates';
import PesticideUsageReport from './pages/PesticideUsageReport';
import CustomerBranchesPage from './pages/CustomerBranchesPage';
import BranchCalendar from './pages/BranchCalendar';
import BranchPaidMaterials from './pages/BranchPaidMaterials';
import BranchDocuments from './pages/BranchDocuments';
import BranchTrendAnalysisPage from './pages/BranchTrendAnalysis';
import ProtectedReportViewer from './components/ProtectedReportViewer';
import ActivityFileViewer from './pages/ActivityFileViewer';
import AdminActivityFileManagement from './pages/AdminActivityFileManagement';


const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedUserTypes?: string[] }> = ({ children }) => {
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
        if (user.email === 'admin@ilaclamatik.com') {
          setIsAdmin(true);
          setLoading(false);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profileError) {
          setIsAdmin(false);
        } else {
          setIsAdmin(profileData.role === 'admin');
        }
      } catch (error) {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    checkAdminStatus();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>;
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
        const localSessionStr = localStorage.getItem('local_session');
        if (localSessionStr) {
          const localSession = JSON.parse(localSessionStr);
          if (localSession.type === 'customer') { setUserRole('customer'); setLoading(false); return; }
          else if (localSession.type === 'branch') { setUserRole('branch'); setLoading(false); return; }
          else if (localSession.type === 'operator') { setUserRole('operator'); setLoading(false); return; }
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setCurrentUser(user);

        const { data: operatorData } = await supabase
          .from('operators')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (operatorData) {
          setUserRole('operator');
          setLoading(false);
          return;
        }

        const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (profileData?.role) {
          setUserRole(profileData.role);
        } else {
          setUserRole('user');
        }
      } catch (err) {
        setUserRole('user');
      } finally {
        setLoading(false);
      }
    };
    checkUserRole();
  }, [navigate]);

  if (loading) return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>;

  if (userRole === 'operator') return <Navigate to="/operator" />;
  if (userRole === 'customer') return <Navigate to="/customer" />;
  if (userRole === 'branch') return <Navigate to="/branch" />;

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/teklif-goruntule/:id" element={<TeklifGoruntule />} />
          <Route path="/view-report-protected/:documentId" element={<ProtectedReportViewer />} />
          <Route path="/anket" element={<SurveyPage />} />

          {/* Operator Routes */}
          <Route path="/operator/*" element={<ProtectedRoute><OperatorLayout /></ProtectedRoute>}>
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
            <Route path="hizli-notlar" element={<OperatorQuickNotes />} />
            <Route path="weekly-km" element={<OperatorWeeklyKmForm />} />
            <Route path="egitim-sunumlari" element={<TrainingPresentationPage />} />
          </Route>

          {/* Customer Routes */}
          <Route path="/customer/*" element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
            <Route index element={<CustomerDashboard />} />
            <Route path="subeler" element={<CustomerBranchesPage />} />
            <Route path="modules" element={<Modules />} />
            <Route path="takvim" element={<CustomerCalendar />} />
            <Route path="ziyaretler" element={<CustomerVisits />} />
            <Route path="dof" element={<CustomerDOF />} />
            <Route path="faaliyet-dosyasi" element={<ActivityFileViewer />} />
            <Route path="dokumanlar" element={<CustomerDocuments />} />
            <Route path="sertifikalar" element={<CustomerCertificates />} />
            <Route path="malzemeler" element={<CustomerPaidMaterials />} />
            <Route path="teklifler" element={<Offers />} />
            <Route path="pestisit-raporu" element={<PesticideUsageReport />} />
            <Route path="modul-raporlari" element={<CustomerModuleReports />} />
            <Route path="trend-analizi" element={<CustomerTrendAnalysis />} />
            <Route path="trend-raporlari" element={<CustomerTrendReports />} />
            <Route path="trend-report/:reportId" element={<CustomerTrendReportView />} />
          </Route>

          {/* Branch Routes */}
          <Route path="/branch/*" element={<ProtectedRoute><BranchLayout /></ProtectedRoute>}>
            <Route index element={<BranchDashboard />} />
            <Route path="modules" element={<Modules />} />
            <Route path="takvim" element={<BranchCalendar />} />
            <Route path="faaliyet-dosyasi" element={<ActivityFileViewer />} />
            <Route path="dokumanlar" element={<BranchDocuments />} />
            <Route path="sertifikalar" element={<Certificates />} />
            <Route path="malzemeler" element={<BranchPaidMaterials />} />
            <Route path="trend-analizi" element={<BranchTrendAnalysisPage />} />
            <Route path="teklifler" element={<Offers />} />
            <Route path="pestisit-raporu" element={<PesticideUsageReport />} />
            <Route path="trend-raporlari" element={<CustomerTrendReports />} />
            <Route path="trend-report/:reportId" element={<CustomerTrendReportView />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/*" element={<ProtectedRoute><RoleBasedRoute><Layout /></RoleBasedRoute></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="admin" element={<Dashboard />} />

            <Route path="modules" element={<Modules />} />
            <Route path="musteriler" element={<Customers />} />
            <Route path="sozlesmeler" element={<Sozlesmeler />} />
            <Route path="musteriler/:id" element={<CustomerDetails />} />
            <Route path="ziyaretler" element={<AdminVisits />} />
            <Route path="ziyaretler/yeni" element={<VisitForm />} />
            <Route path="teklifler" element={<TekliflerListesi />} />
            <Route path="teklifler/templates" element={<OfferTemplates />} />
            <Route path="teklifler/new" element={<NewOffer />} />
            <Route path="photo-migration" element={<AdminPhotoMigration />} />
            <Route path="depolar" element={<Warehouses />} />
            <Route path="depolar/transfer" element={<WarehouseTransfers />} />
            <Route path="ucretli-malzemeler" element={<PaidMaterialSales />} />
            <Route path="km-takip" element={<AdminWeeklyKmTracking />} />
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
            <Route path="subeler" element={<AdminBranches />} />
            <Route path="sube-fiyatlandirma" element={<AdminBranchPricing />} />
            <Route path="environmental-risk-assessment" element={<AdminEnvironmentalRiskAssessment />} />
            <Route path="fatura-export" element={<AdminRoute><InvoiceExport /></AdminRoute>} />
            <Route path="faaliyet-rapor-takip" element={<ActivityReportsTracking />} />
            <Route path="moduller/risk-degerlendirme" element={<RiskAssessmentModule />} />
            <Route path="ucretli-ziyaretler" element={<PaidVisitsPage />} />
            <Route path="trend-analizi" element={<AdminTrendAnalysisReport />} />
            <Route path="urunler" element={<AdminProducts />} />
            <Route path="toplu-silme" element={<BulkDeletePage />} />
            <Route path="rota-optimizasyonu" element={<RouteOptimizationPage />} />
            <Route path="canli-harita" element={<LiveTrackingMap />} />
            <Route path="cari-satis-raporu" element={<CariSatisRaporu />} />
            <Route path="yillik-kar-zarar" element={<YillikKarZararRaporu />} />
            <Route path="karlilik-analizi" element={<ProfitabilityAnalysis />} />
            <Route path="moduller/uv-lamba-raporu" element={<UvLampReport />} />
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
            <Route path="rapor/goruntule/:reportId" element={<ModulRaporGoruntuleme />} />
            <Route path="rapor-goruntule" element={<RaporSecVeGoruntule />} />
            <Route path="raporlar" element={<GenelRaporGoruntuleme />} />
            <Route path="bilgilendirme-pazarlama" element={<BilgilendirmePazarlama />} />
            <Route path="anket-sonuclari" element={<AdminRoute><SurveyResults /></AdminRoute>} />
            <Route path="eposta-pazarlama" element={<EpostaPazarlama />} />
            <Route path="isletme-kesif" element={<IsletmeKesif />} />
            <Route path="bulk-visit-import" element={<AdminRoute><BulkVisitImport /></AdminRoute>} />
            <Route path="hizli-notlar" element={<AdminRoute><AdminQuickNotes /></AdminRoute>} />
            <Route path="faturasiz-musteriler" element={<AdminRoute><UnbilledCustomers /></AdminRoute>} />
            <Route path="admin/tahsilat-makbuzlari" element={<AdminRoute><AdminCollectionReceipts /></AdminRoute>} />
            <Route path="admin/ziyaret-raporlari" element={<AdminRoute><AdminVisitReports /></AdminRoute>} />
            <Route path="admin/mesai-cizelgeleri" element={<AdminRoute><AdminOperatorShifts /></AdminRoute>} />
            <Route path="admin/operator-leaves" element={<AdminRoute><AdminOperatorLeaves /></AdminRoute>} />
            <Route path="admin/vehicles" element={<AdminRoute><AdminVehicles /></AdminRoute>} />
            <Route path="yeni-trend-analizi" element={<TrendAnalysis branchId={undefined} />} />
            <Route path="admin/simulator" element={<AdminDataSimulator />} />
            <Route path="admin/yillik-rapor" element={<AnnualVisitReport />} />
            <Route path="dof" element={<CorrectiveActions />} />
            <Route path="sozlesmeler" element={<Sozlesmeler />} />
            <Route path="egitim-sunumlari" element={<TrainingPresentationPage />} />

            <Route path="admin/modul-raporlari" element={<AdminRoute><AdminModuleReports /></AdminRoute>} />
            <Route path="admin/monthly-visit-schedule" element={<AdminRoute><AdminMonthlyVisitSchedule /></AdminRoute>} />
            <Route path="subeler/kroki-duzenle" element={<AdminRoute><AdminFloorPlanEditor /></AdminRoute>} />
            <Route path="pestisit-raporu" element={<AdminRoute><AdminPesticideReport /></AdminRoute>} />
            <Route path="admin/visit-data-entry" element={<AdminRoute><AdminVisitDataEntry /></AdminRoute>} />
            <Route path="satis-gorusme-formu" element={<AdminRoute><SatisGorusmeFormu /></AdminRoute>} />
            <Route path="admin/faaliyet-dosyasi-yonetimi" element={<AdminRoute><AdminActivityFileManagement /></AdminRoute>} />
            <Route path="admin/faaliyet-dosyasi-goruntule" element={<AdminRoute><ActivityFileViewer /></AdminRoute>} />
            <Route path="ipm-sozlesmeleri" element={<AdminRoute><AdminIpmContracts /></AdminRoute>} />
            <Route path="zararli-kritik-limitler" element={<AdminRoute><AdminPestActivityLimits /></AdminRoute>} />
            <Route path="acil-eylem-plani" element={<AdminRoute><AdminActionPlan /></AdminRoute>} />
            <Route path="zararli-risk-degerlendirme" element={<AdminRoute><AdminPestRiskAssessment /></AdminRoute>} />
            <Route path="onayli-pestisit-listesi" element={<AdminRoute><AdminApprovedPesticides /></AdminRoute>} />
            <Route path="fiyat-artisi" element={<AdminRoute><PriceIncrease /></AdminRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
