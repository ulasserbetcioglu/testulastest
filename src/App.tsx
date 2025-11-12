import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
// import { AuthProvider, useAuth } from './components/Auth/AuthProvider';
// import Layout from './components/Layout/Layout';
// import Dashboard from './pages/Dashboard';
// import Login from './pages/Login';
// import Customers from './pages/Customers';
// import CustomerDetails from './components/Customers/CustomerDetails';
// import CustomerBranches from './components/Customers/CustomerBranches';
// import CustomerTreatments from './components/Customers/CustomerTreatments';
// import CustomerDocuments from './components/Customers/CustomerDocuments';
// import CustomerOffers from './components/Customers/CustomerOffers';
// import AdminOperators from './pages/AdminOperators';
// import AdminProducts from './pages/AdminProducts';
// import AdminVehicles from './pages/AdminVehicles';
// import AdminVisits from './pages/AdminVisits';
// import AdminCalendar from './pages/AdminCalendar';
// import AdminVisitReports from './pages/AdminVisitReports';
// import Documents from './pages/Documents';
// import Settings from './pages/Settings';
// import CustomerLayout from './components/Layout/CustomerLayout';
// import BranchLayout from './components/Layout/BranchLayout';
// import BranchDashboard from './pages/BranchDashboard';
// import BranchDocuments from './pages/BranchDocuments';
// import CustomerVisits from './pages/CustomerVisits';
// import BranchCalendar from './pages/BranchCalendar';
// import CorrectiveActions from './pages/CorrectiveActions';
// import CustomerDOF from './pages/CustomerDOF';
// import TrendAnalysisReport from './pages/TrendAnalysisReport';
// import Warehouses from './pages/Warehouses';
// import WarehouseTransfers from './pages/WarehouseTransfers';
// import PaidMaterialSales from './pages/PaidMaterialSales';
// import BranchPaidMaterials from './pages/BranchPaidMaterials';
// import CustomerPaidMaterials from './pages/CustomerPaidMaterials';
// import LiveTrackingMap from './pages/LiveTrackingMap';
// import AdminOperatorDistances from './pages/AdminOperatorDistances';
// import AdminUsers from './pages/AdminUsers';
// import AdminBranches from './pages/AdminBranches';
// import AdminNotifications from './pages/AdminNotifications';
// import Notifications from './pages/Notifications';
// import VisitDetails from './pages/VisitDetails';
// import AdminBranchPricing from './pages/AdminBranchPricing';
// import AdminQuickNotes from './pages/AdminQuickNotes';
// import Certificates from './pages/Certificates';
// import CustomerCertificates from './pages/CustomerCertificates';
// import InvoiceExport from './pages/InvoiceExport';
// import ProfitabilityAnalysis from './pages/ProfitabilityAnalysis';
// import UnbilledCustomers from './pages/UnbilledCustomers';
// import PaidVisitsPage from './pages/PaidVisitsPage';
// import OperatorLayout from './components/Layout/OperatorLayout';
// import OperatorDashboard from './pages/OperatorDashboard';
// import OperatorCalendar from './pages/OperatorCalendar';
// import Visits from './pages/Visits';
// import VisitForm from './pages/VisitForm';
// import OperatorPaidMaterials from './pages/OperatorPaidMaterials';
// import OperatorMaterialUsage from './pages/OperatorMaterialUsage';
// import OperatorDocuments from './pages/OperatorDocuments';
// import OperatorQuickNotes from './pages/OperatorQuickNotes';
// import OperatorWeeklyKmForm from './pages/OperatorWeeklyKmForm';
// import OperatorDailyChecklist from './pages/OperatorDailyChecklist';
// import OperatorCollectionReceipt from './pages/OperatorCollectionReceipt';
// import CustomerDashboard from './pages/CustomerDashboard';
// import CustomerCalendar from './pages/CustomerCalendar';
// import EkipmanYonetimi from './pages/EkipmanYonetimi';
// import HizmetYonetimi from './pages/HizmetYonetimi';
// import SubeLokasyon from './pages/SubeLokasyon';
// import BulkVisitImport from './pages/BulkVisitImport';
// import AdminMonthlyVisitSchedule from './pages/AdminMonthlyVisitSchedule';
// import OperatorCalendarPlanning from './pages/OperatorCalendarPlanning';
// import AdminCalendarPlanning from './pages/AdminCalendarPlanning';
// import RouteOptimizationPage from './pages/RouteOptimizationPage';
// import AdminOperatorShifts from './pages/AdminOperatorShifts';
// import AdminOperatorLeaves from './pages/AdminOperatorLeaves';
// import TekliflerListesi from './pages/TekliflerListesi';
// import NewOffer from './pages/NewOffer';
// import OfferTemplates from './pages/OfferTemplates';
// import TeklifGoruntule from './pages/TeklifGoruntule';
// import EpostaPazarlama from './pages/EpostaPazarlama';
// import PazarlamaEposta from './pages/PazarlamaEposta';
// import GonderilenEpostalar from './pages/GonderilenEpostalar';
// import AylikTakvimEposta from './pages/AylikTakvimEposta';
// import AylikMalzemeEposta from './pages/AylikMalzemeEposta';
// import HizmetPazarlama from './pages/HizmetPazarlama';
// import EkipmanPazarlama from './pages/EkipmanPazarlama';
// import BilgilendirimePazarlama from './pages/BilgilendirimePazarlama';
// import TedarikSiparisi from './pages/TedarikSiparisi';
// import SiparisOlusturma from './pages/SiparisOlusturma';
// import YillikKarZararRaporu from './pages/YillikKarZararRaporu';
// import CariSatisRaporu from './pages/CariSatisRaporu';
// import ActivityReportsTracking from './pages/ActivityReportsTracking';
// import BulkDeletePage from './pages/BulkDeletePage';
// import Definitions from './pages/Definitions';
// import Modules from './pages/Modules';
// import RiskAssessmentModule from './pages/modules/RiskAssessmentModule';
// import UvLampReport from './pages/modules/UvLampReport';
// import ProposalReportModule from './pages/modules/ProposalReportModule';
// import GenelRaporGoruntuleme from './pages/GenelRaporGoruntuleme';
// import ModulRaporGoruntuleme from './pages/ModulRaporGoruntuleme';
// import RaporSecVeGoruntule from './pages/RaporSecVeGoruntuleme';
// import ProtectedReportViewer from './components/ProtectedReportViewer';
// import BranchBiocidalReport from './pages/BranchBiocidalReport';
// import BranchBiocidalPrint from './pages/BranchBiocidalPrint';

import React from 'react'; // React'ı import etmeyi unutmayın

// --- HATA DÜZELTME: STUB BİLEŞENLER ---
// Önizleme ortamında "Could not resolve" hatalarını düzeltmek için
// sahte (stub) bileşenler eklendi.

const StubComponent: React.FC<{ children?: React.ReactNode; [key: string]: any }> = ({ children, ...props }) => (
  <div style={{ border: '2px dashed #ccc', padding: '10px', margin: '10px', borderRadius: '5px', backgroundColor: '#f9f9f9' }} {...props}>
    <strong style={{ color: '#555' }}>Stub Component (Geçici Bileşen)</strong>
    <p style={{ color: '#777', fontSize: '0.9em' }}>Bu bileşenin içeriği önizlemede gösterilmiyor.</p>
    {children}
  </div>
);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
const useAuth = () => ({ user: { id: 'dummy-user' }, loading: false, userRole: 'admin' });

const Layout = StubComponent;
const Dashboard = StubComponent;
const Login = StubComponent;
const Customers = StubComponent;
const CustomerDetails = StubComponent;
const CustomerBranches = StubComponent;
const CustomerTreatments = StubComponent;
const CustomerDocuments = StubComponent;
const CustomerOffers = StubComponent;
const AdminOperators = StubComponent;
const AdminProducts = StubComponent;
const AdminVehicles = StubComponent;
const AdminVisits = StubComponent;
const AdminCalendar = StubComponent;
const AdminVisitReports = StubComponent;
const Documents = StubComponent;
const Settings = StubComponent;
const CustomerLayout = StubComponent;
const BranchLayout = StubComponent;
const BranchDashboard = StubComponent;
const BranchDocuments = StubComponent;
const CustomerVisits = StubComponent;
const BranchCalendar = StubComponent;
const CorrectiveActions = StubComponent;
const CustomerDOF = StubComponent;
const TrendAnalysisReport = StubComponent;
const Warehouses = StubComponent;
const WarehouseTransfers = StubComponent;
const PaidMaterialSales = StubComponent;
const BranchPaidMaterials = StubComponent;
const CustomerPaidMaterials = StubComponent;
const LiveTrackingMap = StubComponent;
const AdminOperatorDistances = StubComponent;
const AdminUsers = StubComponent;
const AdminBranches = StubComponent;
const AdminNotifications = StubComponent;
const Notifications = StubComponent;
const VisitDetails = StubComponent;
const AdminBranchPricing = StubComponent;
const AdminQuickNotes = StubComponent;
const Certificates = StubComponent;
const CustomerCertificates = StubComponent;
const InvoiceExport = StubComponent;
const ProfitabilityAnalysis = StubComponent;
const UnbilledCustomers = StubComponent;
const PaidVisitsPage = StubComponent;
const OperatorLayout = StubComponent;
const OperatorDashboard = StubComponent;
const OperatorCalendar = StubComponent;
const Visits = StubComponent;
const VisitForm = StubComponent;
const OperatorPaidMaterials = StubComponent;
const OperatorMaterialUsage = StubComponent;
const OperatorDocuments = StubComponent;
const OperatorQuickNotes = StubComponent;
const OperatorWeeklyKmForm = StubComponent;
const OperatorDailyChecklist = StubComponent;
const OperatorCollectionReceipt = StubComponent;
const CustomerDashboard = StubComponent;
const CustomerCalendar = StubComponent;
const EkipmanYonetimi = StubComponent;
const HizmetYonetimi = StubComponent;
const SubeLokasyon = StubComponent;
const BulkVisitImport = StubComponent;
const AdminMonthlyVisitSchedule = StubComponent;
const OperatorCalendarPlanning = StubComponent;
const AdminCalendarPlanning = StubComponent;
const RouteOptimizationPage = StubComponent;
const AdminOperatorShifts = StubComponent;
const AdminOperatorLeaves = StubComponent;
const TekliflerListesi = StubComponent;
const NewOffer = StubComponent;
const OfferTemplates = StubComponent;
const TeklifGoruntule = StubComponent;
const EpostaPazarlama = StubComponent;
const PazarlamaEposta = StubComponent;
const GonderilenEpostalar = StubComponent;
const AylikTakvimEposta = StubComponent;
const AylikMalzemeEposta = StubComponent;
const HizmetPazarlama = StubComponent;
const EkipmanPazarlama = StubComponent;
const BilgilendirimePazarlama = StubComponent;
const TedarikSiparisi = StubComponent;
const SiparisOlusturma = StubComponent;
const YillikKarZararRaporu = StubComponent;
const CariSatisRaporu = StubComponent;
const ActivityReportsTracking = StubComponent;
const BulkDeletePage = StubComponent;
const Definitions = StubComponent;
const Modules = StubComponent;
const RiskAssessmentModule = StubComponent;
const UvLampReport = StubComponent;
const ProposalReportModule = StubComponent;
const GenelRaporGoruntuleme = StubComponent;
const ModulRaporGoruntuleme = StubComponent;
const RaporSecVeGoruntule = StubComponent;
const ProtectedReportViewer = StubComponent;
const BranchBiocidalReport = StubComponent;
const BranchBiocidalPrint = StubComponent;

// --- DÜZELTİLMİŞ KOD ---

// Auth durumu kontrolü için sarmalayıcı
const ProtectedRoute: React.FC<{ children: React.ReactElement; roles: string[] }> = ({ children, roles }) => {
  const { user, loading, userRole } = useAuth();
  if (loading) {
    return <div>Yükleniyor...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!userRole || !roles.includes(userRole)) {
    // Opsiyonel: Rolü yanlışsa bir "Yetkiniz Yok" sayfasına yönlendir
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Operatör rolü için kısayol
const OperatorRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => (
  <ProtectedRoute roles={['operator']}>{children}</ProtectedRoute>
);

// Admin/Manager rolleri için kısayol
const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => (
  <ProtectedRoute roles={['admin', 'manager']}>{children}</ProtectedRoute>
);

// Müşteri rolü için kısayol
const CustomerRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => (
  <ProtectedRoute roles={['customer']}>{children}</ProtectedRoute>
);


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Rapor Görüntüleyici (Auth Korumalı Link) */}
          <Route path="/report-viewer/:reportId" element={<ProtectedReportViewer />} />
          
          {/* YENİ EKLENEN ROTA: Biyosidal Raporu Yazdırma Sayfası (Layout olmadan) */}
          <Route path="/customer/branches/:branchId/biocidal-report/print" 
            element={
              <CustomerRoute>
                <BranchBiocidalPrint />
              </CustomerRoute>
            } 
          />
          
          {/* Modül Raporları (Layout olmadan) */}
          <Route path="/modules/risk-assessment/:visitId" element={<RiskAssessmentModule />} />
          <Route path="/modules/uv-lamp-report/:visitId" element={<UvLampReport />} />
          <Route path="/modules/proposal-report/:visitId" element={<ProposalReportModule />} />
          <Route path="/rapor/genel/:visitId" element={<GenelRaporGoruntuleme />} />
          <Route path="/rapor/modul/:reportId" element={<ModulRaporGoruntuleme />} />
          <Route path="/rapor/goruntule" element={<RaporSecVeGoruntule />} />
          <Route path="/teklif/goruntule/:offerId" element={<TeklifGoruntule />} />
          <Route path="/eposta/pazarlama/:templateId" element={<PazarlamaEposta />} />
          <Route path="/eposta/takvim/:customerId" element={<AylikTakvimEposta />} />
          <Route path="/eposta/malzeme/:saleId" element={<AylikMalzemeEposta />} />
          <Route path="/eposta/hizmet/:customerId" element={<HizmetPazarlama />} />
          <Route path="/eposta/ekipman/:customerId" element={<EkipmanPazarlama />} />
          <Route path="/eposta/bilgilendirme/:customerId" element={<BilgilendirimePazarlama />} />
          
          {/* Admin/Manager Rotaları */}
          <Route
            path="/"
            element={
              <AdminRoute>
                <Layout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerLayout />}>
              <Route index element={<Navigate to="details" replace />} />
              <Route path="details" element={<CustomerDetails />} />
              <Route path="branches" element={<CustomerBranches />} />
              <Route path="treatments" element={<CustomerTreatments />} />
              <Route path="documents" element={<CustomerDocuments />} />
              <Route path="offers" element={<CustomerOffers />} />
            </Route>
            <Route path="branches" element={<AdminBranches />} />
            <Route path="branch-pricing" element={<AdminBranchPricing />} />
            <Route path="operators" element={<AdminOperators />} />
            <Route path="operator-distances" element={<AdminOperatorDistances />} />
            <Route path="operator-shifts" element={<AdminOperatorShifts />} />
            <Route path="operator-leaves" element={<AdminOperatorLeaves />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="vehicles" element={<AdminVehicles />} />
            <Route path="visits" element={<AdminVisits />} />
            <Route path="visit-reports" element={<AdminVisitReports />} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="calendar-planning" element={<AdminCalendarPlanning />} />
            <Route path="monthly-visit-schedule" element={<AdminMonthlyVisitSchedule />} />
            <Route path="corrective-actions" element={<CorrectiveActions />} />
            <Route path="documents" element={<Documents />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="settings" element={<Settings />} />
            <Route path="warehouses" element={<Warehouses />} />
            <Route path="warehouse-transfers" element={<WarehouseTransfers />} />
            <Route path="paid-material-sales" element={<PaidMaterialSales />} />
            <Route path="live-map" element={<LiveTrackingMap />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="quick-notes" element={<AdminQuickNotes />} />
            <Route path="invoice-export" element={<InvoiceExport />} />
            <Route path="profit-analysis" element={<ProfitabilityAnalysis />} />
            <Route path="unbilled-customers" element={<UnbilledCustomers />} />
            <Route path="paid-visits" element={<PaidVisitsPage />} />
            <Route path="ekipman-yonetimi" element={<EkipmanYonetimi />} />
            <Route path="hizmet-yonetimi" element={<HizmetYonetimi />} />
            <Route path="bulk-visit-import" element={<BulkVisitImport />} />
            <Route path="route-optimization" element={<RouteOptimizationPage />} />
            <Route path="offers" element={<TekliflerListesi />} />
            <Route path="offers/new" element={<NewOffer />} />
            <Route path="offer-templates" element={<OfferTemplates />} />
            <Route path="email-marketing" element={<EpostaPazarlama />} />
            <Route path="sent-emails" element={<GonderilenEpostalar />} />
            <Route path="tedarik-siparisi" element={<TedarikSiparisi />} />
            <Route path="siparis-olusturma" element={<SiparisOlusturma />} />
            <Route path="yillik-kar-zarar" element={<YillikKarZararRaporu />} />
            <Route path="cari-satis-raporu" element={<CariSatisRaporu />} />
            <Route path="activity-reports-tracking" element={<ActivityReportsTracking />} />
            <Route path="bulk-delete" element={<BulkDeletePage />} />
            <Route path="definitions" element={<Definitions />} />
            <Route path="modules" element={<Modules />} />
          </Route>

          {/* Operatör Rotaları */}
          <Route
            path="/operator"
            element={
              <OperatorRoute>
                <OperatorLayout />
              </OperatorRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OperatorDashboard />} />
            <Route path="calendar" element={<OperatorCalendar />} />
            <Route path="calendar-planning" element={<OperatorCalendarPlanning />} />
            <Route path="visits" element={<Visits />} />
            <Route path="visits/:visitId/start" element={<VisitForm />} />
            <Route path="new-visit" element={<VisitForm />} />
            <Route path="paid-materials" element={<OperatorPaidMaterials />} />
            <Route path="material-usage" element={<OperatorMaterialUsage />} />
            <Route path="documents" element={<OperatorDocuments />} />
            <Route path="quick-notes" element={<OperatorQuickNotes />} />
            <Route path="weekly-km" element={<OperatorWeeklyKmForm />} />
            <Route path="daily-checklist" element={<OperatorDailyChecklist />} />
            <Route path="collection-receipt" element={<OperatorCollectionReceipt />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="visit-details/:visitId" element={<VisitDetails />} />
            <Route path="corrective-actions" element={<CorrectiveActions />} />
            <Route path="dof" element={<CustomerDOF />} />
            <Route path="sube-lokasyon" element={<SubeLokasyon />} />
          </Route>
          
          {/* Müşteri Rotaları */}
          <Route 
            path="/customer"
            element={
              <CustomerRoute>
                <CustomerLayout />
              </CustomerRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="calendar" element={<CustomerCalendar />} />
            <Route path="dof" element={<CustomerDOF />} />
            <Route path="documents" element={<CustomerDocuments />} />
            <Route path="certificates" element={<CustomerCertificates />} />
            <Route path="paid-materials" element={<CustomerPaidMaterials />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
          
          {/* Şube Rotaları (Müşteri için) */}
          <Route 
            path="/customer/branches/:branchId"
            element={
              <CustomerRoute>
                <BranchLayout />
              </CustomerRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<BranchDashboard />} />
            <Route path="visits" element={<CustomerVisits />} />
            <Route path="calendar" element={<BranchCalendar />} />
            <Route path="documents" element={<BranchDocuments />} />
            <Route path="dof" element={<CustomerDOF />} />
            <Route path="trend-analysis" element={<TrendAnalysisReport />} />
            <Route path="paid-materials" element={<BranchPaidMaterials />} />
            
            {/* YENİ EKLENEN ROTA: Biyosidal Rapor Sayfası */}
            <Route path="biocidal-report" element={<BranchBiocidalReport />} />
          </Route>

          {/* Fallback Rota */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;