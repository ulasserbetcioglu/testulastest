'use client';

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './components/Auth/AuthProvider';
import { supabase } from './lib/supabase';

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
import BilgilendirimePazarlama from './pages/BilgilendirimePazarlama';
import EpostaPazarlama from './pages/EpostaPazarlama';
import IsletmeKesif from './components/IsletmeKesif';
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

// --- ADMIN MENTOR MODULE IMPORTLARI ---
import AdminMentorHome from './pages/AdminMentor/AdminMentorHome';
import CustomerSelection from './pages/AdminMentor/CustomerSelection';
import BranchSelection from './pages/AdminMentor/BranchSelection';
import AuditMenu from './pages/AdminMentor/AuditMenu';
import FileAuditChecklist from './pages/AdminMentor/FileAuditChecklist';
import AuditSummary from './pages/AdminMentor/AuditSummary';
// Mentor Formları
import StationControl from './pages/AdminMentor/Forms/StationControl';
import BiocidalApplicationForm from './pages/AdminMentor/Forms/BiocidalApplicationForm';
import ApprovedProductList from './pages/AdminMentor/Forms/ApprovedProductList';
import ProductUsageCard from './pages/AdminMentor/Forms/ProductUsageCard';
import WasteDisposalLog from './pages/AdminMentor/Forms/WasteDisposalLog';
import LicenseManager from './pages/AdminMentor/Forms/LicenseManager';
import CustomerInfoView from './pages/AdminMentor/Forms/CustomerInfoView';
import RiskActionPlan from './pages/AdminMentor/Forms/RiskActionPlan';
import CustomerFeedbackForm from './pages/AdminMentor/Forms/CustomerFeedbackForm';
import DocumentCheckDetail from './pages/AdminMentor/Forms/DocumentCheckDetail';

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
import ProtectedReportViewer from './components/ProtectedReportViewer';


// =============================================================================
// 🔥 KURTARICI: MOBİL UYUMLULUK KÖPRÜSÜ (MOBILE BRIDGE)
// Bu bileşen, eski "navigation" ve "route" prop'larını bekleyen sayfaların
// Web üzerinde çökmesini engeller ve otomatik dönüştürme yapar.
// =============================================================================
const withMobileFix = (Component: React.ComponentType<any>) => {
  return (props: any) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Mobil sayfa isimlerini Web URL'lerine eşleyen harita
    const routeMap: Record<string, string> = {
      'AdminMentorHome': '/admin/mentor',
      'BranchSelection': '/admin/mentor/branch-selection',
      'CustomerSelection': '/admin/mentor/customer-selection',
      'AuditMenu': '/admin/mentor/audit-menu',
      'FileAuditChecklist': '/admin/mentor/file-audit',
      'AuditSummary': '/admin/mentor/audit-summary',
      'StationControl': '/admin/mentor/StationControl',
      'BiocidalApplicationForm': '/admin/mentor/BiocidalApplicationForm',
      'ApprovedProductList': '/admin/mentor/ApprovedProductList',
      'ProductUsageCard': '/admin/mentor/ProductUsageCard',
      'WasteDisposalLog': '/admin/mentor/WasteDisposalLog',
      'LicenseManager': '/admin/mentor/LicenseManager',
      'CustomerInfoView': '/admin/mentor/CustomerInfoView',
      'RiskActionPlan': '/admin/mentor/RiskActionPlan',
      'DocumentCheckDetail': '/admin/mentor/DocumentCheckDetail',
      // Geriye dönük uyumluluk
      'RiskAssessment': '/moduller/risk-degerlendirme',
    };

    // Sahte Navigation Nesnesi (Mobil -> Web Dönüştürücü)
    const navigationProp = {
      navigate: (screenName: string, params: any) => {
        // Eğer hedef bir web yoluysa ('/admin/...') direkt git
        if (screenName.startsWith('/')) {
          navigate(screenName, { state: params });
        } else {
          // Eğer mobil sayfa ismiyse, haritadan bul ve git
          const path = routeMap[screenName] || `/admin/mentor/${screenName}`;
          console.log(`Mobile Bridge Yönlendirmesi: ${screenName} -> ${path}`);
          navigate(path, { state: params });
        }
      },
      goBack: () => navigate(-1),
      setOptions: () => {}, // Hata vermemesi için boş fonksiyon
      addListener: () => {}, 
    };

    // Sahte Route Nesnesi (Parametreleri yakalamak için)
    const routeProp = {
      params: location.state || {}, // Web state'ini mobil params'a çevir
      name: 'WebRoute'
    };

    // Orijinal bileşeni, oluşturduğumuz sahte props ile render et
    return <Component {...props} navigation={navigationProp} route={routeProp} />;
  };
};

// =============================================================================

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
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setCurrentUser(user);

        const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (profileData?.role) {
          setUserRole(profileData.role);
        } else {
          // Fallback logic
          setUserRole('user'); 
        }
      } catch (err) { setUserRole('user'); } finally { setLoading(false); }
    };
    checkUserRole();
  }, [navigate]);

  if (loading) return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>;
  if (userRole === 'operator' || (userRole === 'user' && /^[^@]+@ilaclamatik\.com$/.test(currentUser?.email ?? '') && currentUser?.email !== 'admin@ilaclamatik.com')) return <Navigate to="/operator" />;
  if (userRole === 'customer') return <Navigate to="/customer" />;
  if (userRole === 'branch') return <Navigate to="/branch" />;
  return children;
};

// --- KÖPRÜ İLE SARILMIŞ SAYFALAR (WRAPPED PAGES) ---
// Bu işlem sayesinde eski sayfaları değiştirmeden kullanabilirsin.
const WrappedAdminMentorHome = withMobileFix(AdminMentorHome);
const WrappedCustomerSelection = withMobileFix(CustomerSelection);
const WrappedBranchSelection = withMobileFix(BranchSelection);
const WrappedAuditMenu = withMobileFix(AuditMenu);
const WrappedFileAuditChecklist = withMobileFix(FileAuditChecklist);
const WrappedAuditSummary = withMobileFix(AuditSummary);
const WrappedStationControl = withMobileFix(StationControl);
const WrappedBiocidalApp = withMobileFix(BiocidalApplicationForm);
const WrappedApprovedProductList = withMobileFix(ApprovedProductList);
const WrappedProductUsageCard = withMobileFix(ProductUsageCard);
const WrappedWasteDisposalLog = withMobileFix(WasteDisposalLog);
const WrappedLicenseManager = withMobileFix(LicenseManager);
const WrappedCustomerInfoView = withMobileFix(CustomerInfoView);
const WrappedRiskActionPlan = withMobileFix(RiskActionPlan);
const WrappedCustomerFeedback = withMobileFix(CustomerFeedbackForm);
const WrappedDocumentCheckDetail = withMobileFix(DocumentCheckDetail);


function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/teklif-goruntule/:id" element={<TeklifGoruntule />} />
          <Route path="/view-report-protected/:documentId" element={<ProtectedReportViewer />} />
          
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
          </Route>

          {/* Customer Routes */}
          <Route path="/customer/*" element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
            <Route index element={<CustomerDashboard />} />
            <Route path="subeler" element={<CustomerBranchesPage />} />
            <Route path="modules" element={<Modules />} />
            <Route path="takvim" element={<CustomerCalendar />} />
            <Route path="ziyaretler" element={<CustomerVisits />} />
            <Route path="dof" element={<CustomerDOF />} />
            <Route path="dokumanlar" element={<CustomerDocuments />} />
            <Route path="sertifikalar" element={<CustomerCertificates />} />
            <Route path="bildirimler" element={<Notifications />} />
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
            <Route path="dokumanlar" element={<BranchDocuments />} />
            <Route path="sertifikalar" element={<Certificates />} />
            <Route path="bildirimler" element={<Notifications />} />
            <Route path="malzemeler" element={<BranchPaidMaterials />} />
            <Route path="trend-analizi" element={<div className="p-8 text-center">Trend Analizi Modülü</div>} />
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
            <Route path="subeler" element={<AdminBranches />} /> 
            <Route path="sube-fiyatlandirma" element={<AdminBranchPricing />} />
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
            <Route path="hizmet-pazarlama" element={<BilgilendirimePazarlama />} />
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
            
            {/* --- ADMIN MENTOR KÖPRÜLÜ ROTALAR (WRAPPED ROUTES) --- */}
            <Route path="admin/mentor" element={<AdminRoute><WrappedAdminMentorHome /></AdminRoute>} />
            <Route path="admin/mentor/customer-selection" element={<AdminRoute><WrappedCustomerSelection /></AdminRoute>} />
            <Route path="admin/mentor/branch-selection" element={<AdminRoute><WrappedBranchSelection /></AdminRoute>} />
            <Route path="admin/mentor/audit-menu" element={<AdminRoute><WrappedAuditMenu /></AdminRoute>} />
            <Route path="admin/mentor/file-audit" element={<AdminRoute><WrappedFileAuditChecklist /></AdminRoute>} />
            <Route path="admin/mentor/audit-summary" element={<AdminRoute><WrappedAuditSummary /></AdminRoute>} />
            <Route path="admin/mentor/StationControl" element={<AdminRoute><WrappedStationControl /></AdminRoute>} />
            <Route path="admin/mentor/BiocidalApplicationForm" element={<AdminRoute><WrappedBiocidalApp /></AdminRoute>} />
            <Route path="admin/mentor/ApprovedProductList" element={<AdminRoute><WrappedApprovedProductList /></AdminRoute>} />
            <Route path="admin/mentor/ProductUsageCard" element={<AdminRoute><WrappedProductUsageCard /></AdminRoute>} />
            <Route path="admin/mentor/WasteDisposalLog" element={<AdminRoute><WrappedWasteDisposalLog /></AdminRoute>} />
            <Route path="admin/mentor/LicenseManager" element={<AdminRoute><WrappedLicenseManager /></AdminRoute>} />
            <Route path="admin/mentor/CustomerInfoView" element={<AdminRoute><WrappedCustomerInfoView /></AdminRoute>} />
            <Route path="admin/mentor/RiskActionPlan" element={<AdminRoute><WrappedRiskActionPlan /></AdminRoute>} />
            <Route path="admin/mentor/CustomerFeedbackForm" element={<AdminRoute><WrappedCustomerFeedback /></AdminRoute>} />
            <Route path="admin/mentor/DocumentCheckDetail" element={<AdminRoute><WrappedDocumentCheckDetail /></AdminRoute>} />
            
            {/* Geriye uyumluluk için eski adresler */}
            <Route path="mentor-module" element={<AdminRoute><WrappedAdminMentorHome /></AdminRoute>} />
            <Route path="admin/faaliyet-dosyasi" element={<AdminRoute><WrappedAdminMentorHome /></AdminRoute>} />

            <Route path="admin/modul-raporlari" element={<AdminRoute><AdminModuleReports /></AdminRoute>} />
            <Route path="admin/monthly-visit-schedule" element={<AdminRoute><AdminMonthlyVisitSchedule /></AdminRoute>} />
            <Route path="subeler/kroki-duzenle" element={<AdminRoute><AdminFloorPlanEditor /></AdminRoute>} />
            <Route path="pestisit-raporu" element={<AdminRoute><AdminPesticideReport /></AdminRoute>} />  
            <Route path="admin/visit-data-entry" element={<AdminRoute><AdminVisitDataEntry /></AdminRoute>} />    
            <Route path="satis-gorusme-formu" element={<AdminRoute><SatisGorusmeFormu /></AdminRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
