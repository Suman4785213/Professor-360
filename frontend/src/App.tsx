import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Role } from './types';
import { ResetPasswordView } from './features/auth/ResetPasswordView';
import { LoginView } from './features/auth/LoginView';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ErrorState } from './components/ui/ErrorState';

// Dashboards
import { SuperAdminDashboard } from './features/dashboard/SuperAdminDashboard';
import { ManagementDashboard } from './features/dashboard/ManagementDashboard';
import { IQACDashboard } from './features/dashboard/IQACDashboard';
import { HODDashboard } from './features/dashboard/HODDashboard';
import { InchargeDashboard } from './features/dashboard/InchargeDashboard';
import { FacultyDashboard } from './features/dashboard/FacultyDashboard';

// Features
import { FacultyProfileView } from './features/faculty/FacultyProfileView';
import { ActivityList } from './features/faculty/ActivityList';
import { ActivityFormModal } from './features/faculty/ActivityFormModal';
import { DepartmentList } from './features/departments/DepartmentList';
import { ProgramList } from './features/programs/ProgramList';
import { AcademicYearList } from './features/academic_years/AcademicYearList';
import { UserManagement } from './features/admin/UserManagement';
import { ActivityLogs } from './features/admin/ActivityLogs';
import { SystemSettings } from './features/admin/SystemSettings';
import { CollegeOverview } from './features/colleges/CollegeOverview';
import { CreateCollegeModal } from './features/admin/CreateCollegeModal';
import { VerificationQueue } from './features/verification/VerificationQueue';
import { VerificationReviewDetail } from './features/verification/VerificationReviewDetail';
import { EvidenceRepository } from './features/evidence/EvidenceRepository';
import { EvidenceDetailView } from './features/evidence/EvidenceDetailView';
import { CriteriaManagement } from './features/criteria/CriteriaManagement';
import { CriteriaDashboard } from './features/criteria/CriteriaDashboard';
import { CriterionDetailView } from './features/criteria/CriterionDetailView';
import { MetricDetailView } from './features/criteria/MetricDetailView';
import { ActivityFormPage } from './features/faculty/ActivityFormPage';
import { MySubmissions } from './features/faculty/MySubmissions';
import { SubmissionDetail } from './features/faculty/SubmissionDetail';
import { NotificationCenter } from './features/notifications/NotificationCenter';
import { TaskManagementView } from './features/tasks/TaskManagementView';
import { IQACWorkQueue } from './features/workqueues/IQACWorkQueue';
import { HODWorkQueue } from './features/workqueues/HODWorkQueue';
import { InchargeWorkQueue } from './features/workqueues/InchargeWorkQueue';
import { FacultyWorkspace } from './features/workqueues/FacultyWorkspace';
import { ReportGenerationPage } from './features/reports/ReportGenerationPage';
import { TemplateManagement } from './features/reports/TemplateManagement';
import { AQARWorkspace } from './features/aqar/AQARWorkspace';
import { SSRWorkspace } from './features/ssr/SSRWorkspace';
import { ManagementComplianceDashboard } from './features/management/ManagementComplianceDashboard';
import { ExecutiveAnalyticsDashboard } from './features/analytics/ExecutiveAnalyticsDashboard';
import { IQACIntelligenceDashboard } from './features/analytics/IQACIntelligenceDashboard';
import { DepartmentAnalyticsDashboard } from './features/analytics/DepartmentAnalyticsDashboard';
import { FacultyAnalyticsDashboard } from './features/analytics/FacultyAnalyticsDashboard';
import { SuperAdminControlCenter } from './features/admin/SuperAdminControlCenter';
import { CollegeSettingsView } from './features/settings/CollegeSettingsView';
import { TeamManagementView } from './features/settings/TeamManagementView';
import { ImportCenter } from './features/imports/ImportCenter';
import { ImportHistory } from './features/imports/ImportHistory';
import { DataMigrationWizard } from './features/imports/DataMigrationWizard';
import { IntegrationsManagement } from './features/imports/IntegrationsManagement';
import { CopilotPage } from './features/copilot';
import { CommunicationCenter } from './features/communication/CommunicationCenter';
import { BillingDashboard } from './features/billing/BillingDashboard';
import { PlanComparison } from './features/billing/PlanComparison';
import { AdminBillingDashboard } from './features/admin/AdminBillingDashboard';
import { SupportCenter } from './features/support/SupportCenter';
import { AdminSupportManagement } from './features/admin/AdminSupportManagement';
import { AdminSystemHealth } from './features/admin/AdminSystemHealth';
import { AdminJobMonitor } from './features/admin/AdminJobMonitor';
import { SecurityEventsExplorer } from './features/admin/SecurityEventsExplorer';
import { IncidentManagement } from './features/admin/IncidentManagement';
import { AnnouncementBanner } from './components/ui/AnnouncementBanner';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { FeedbackModal } from './components/ui/FeedbackModal';
import { OnboardingChecklist } from './components/ui/OnboardingChecklist';
import { CommandPalette } from './components/layout/CommandPalette';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { MobileCertificateUploadModal } from './features/activities/MobileCertificateUploadModal';
import { VerificationRecord } from './types';

export function getRoleDashboardPath(role?: Role | null): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin/dashboard';
    case 'COLLEGE_MANAGEMENT':
      return '/management/dashboard';
    case 'IQAC':
      return '/iqac/dashboard';
    case 'HOD':
      return '/hod/downloads';
    case 'DEPARTMENT_INCHARGE':
      return '/incharge/dashboard';
    case 'FACULTY':
      return '/faculty/profile';
    default:
      return '/login';
  }
}

interface RoleRouteProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return (
      <div className="py-12">
        <ErrorState
          is403={true}
          title="403 — Access Denied"
          message={`Your assigned role (${user.role.replace('_', ' ')}) does not have permission to access this section. Institutional data access is strictly isolated.`}
          onGoBack={() => navigate(getRoleDashboardPath(user.role))}
        />
      </div>
    );
  }

  return <>{children}</>;
};

export function App() {
  const { isAuthenticated, isLoading, loadUser, user } = useAuthStore();
  const navigate = useNavigate();

  const location = useLocation();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateCollegeOpen, setIsCreateCollegeOpen] = useState(false);
  const [selectedReviewRecord, setSelectedReviewRecord] = useState<VerificationRecord | null>(null);

  // Phase 13 UX, Mobile & Accessibility States
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isMobileUploadOpen, setIsMobileUploadOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  // Keyboard shortcut listener for Ctrl+K and Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (location.pathname === '/reset-password') return <ResetPasswordView />;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Initializing IQAC Platform...
          </p>
        </div>
      </div>
    );
  }

  // Handle Login View
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Authenticated layout
  const handleOpenReview = (record: VerificationRecord) => {
    setSelectedReviewRecord(record);
    const rolePath = user?.role === 'HOD' ? '/hod/verification' : user?.role === 'DEPARTMENT_INCHARGE' ? '/incharge/verification' : '/iqac/verification';
    navigate(rolePath);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <OfflineBanner />
      <Header
        activeTab=""
        setActiveTab={() => {}}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
      />
      {user?.role !== 'SUPER_ADMIN' && user?.role !== 'COLLEGE_MANAGEMENT' && user?.role !== 'IQAC' && user?.role !== 'DEPARTMENT_INCHARGE' && user?.role !== 'HOD' && user?.role !== 'FACULTY' && <AnnouncementBanner />}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
          {user?.role !== 'SUPER_ADMIN' && user?.role !== 'COLLEGE_MANAGEMENT' && user?.role !== 'IQAC' && user?.role !== 'DEPARTMENT_INCHARGE' && user?.role !== 'HOD' && user?.role !== 'FACULTY' && (
            <OnboardingChecklist onOpenUpload={() => setIsMobileUploadOpen(true)} />
          )}
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<Navigate to={getRoleDashboardPath(user?.role)} replace />} />
            <Route path="/login" element={<Navigate to={getRoleDashboardPath(user?.role)} replace />} />

            {/* SUPER_ADMIN Routes */}
            <Route
              path="/admin/*"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                  <Routes>
                    <Route
                      path="dashboard"
                      element={
                        <SuperAdminDashboard
                          setActiveTab={(tab) => {
                            if (tab === 'users') navigate('/admin/users');
                            else if (tab === 'departments') navigate('/admin/departments');
                            else if (tab === 'colleges') navigate('/admin/colleges');
                          }}
                          onOpenCreateCollege={() => setIsCreateCollegeOpen(true)}
                        />
                      }
                    />
                    <Route
                      path="colleges"
                      element={
                        <SuperAdminDashboard
                          setActiveTab={() => {}}
                          onOpenCreateCollege={() => setIsCreateCollegeOpen(true)}
                        />
                      }
                    />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="control-center" element={<SuperAdminControlCenter />} />
                    <Route path="saas" element={<SuperAdminControlCenter />} />
                    <Route path="billing" element={<AdminBillingDashboard />} />
                    <Route path="departments" element={<DepartmentList />} />
                    <Route path="programs" element={<ProgramList />} />
                    <Route path="academic-years" element={<AcademicYearList />} />
                    <Route path="settings" element={<SystemSettings />} />
                    <Route path="support" element={<AdminSupportManagement />} />
                    <Route path="system-health" element={<AdminSystemHealth />} />
                    <Route path="jobs" element={<AdminJobMonitor />} />
                    <Route path="security" element={<SecurityEventsExplorer />} />
                    <Route path="incidents" element={<IncidentManagement />} />
                    <Route path="activity-logs" element={<ActivityLogs />} />
                    <Route path="evidence" element={<EvidenceRepository />} />
                    <Route path="evidence/:id" element={<EvidenceDetailView />} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Routes>
                </RoleRoute>
              }
            />

            {/* COLLEGE_MANAGEMENT Routes */}
            <Route
              path="/management/*"
              element={
                <RoleRoute allowedRoles={['COLLEGE_MANAGEMENT']}>
                  <Routes>
                    <Route path="dashboard" element={<ManagementDashboard />} />
                    <Route path="purchasing" element={<ManagementDashboard initialView="PURCHASING" />} />
                    <Route path="college-overview" element={<CollegeOverview />} />
                    <Route path="departments" element={<DepartmentList />} />
                    <Route path="criteria" element={<CriteriaDashboard />} />
                    <Route path="criteria/dashboard" element={<CriteriaDashboard />} />
                    <Route path="criteria/:id" element={<CriterionDetailView />} />
                    <Route path="metrics/:id" element={<MetricDetailView />} />
                    <Route path="compliance" element={<ManagementComplianceDashboard />} />
                    <Route path="aqar" element={<AQARWorkspace />} />
                    <Route path="ssr" element={<SSRWorkspace />} />
                    <Route path="reports" element={<ReportGenerationPage />} />
                    <Route path="analytics" element={<ExecutiveAnalyticsDashboard />} />
                    <Route path="*" element={<Navigate to="/management/dashboard" replace />} />
                  </Routes>
                </RoleRoute>
              }
            />

            {/* IQAC Coordinator Routes */}
            <Route
              path="/iqac/*"
              element={
                <RoleRoute allowedRoles={['IQAC']}>
                  <Routes>
                    <Route path="dashboard" element={<IQACDashboard />} />
                    <Route path="departments" element={<DepartmentList />} />
                    <Route path="programs" element={<ProgramList />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="academic-years" element={<AcademicYearList />} />
                    <Route
                      path="verification"
                      element={
                        <VerificationQueue
                          initialTab="pending"
                          selectedRecord={selectedReviewRecord}
                          onClearSelected={() => setSelectedReviewRecord(null)}
                        />
                      }
                    />
                    <Route path="verification/:id" element={<VerificationReviewDetail />} />
                    <Route path="evidence" element={<EvidenceRepository />} />
                    <Route path="evidence/:id" element={<EvidenceDetailView />} />
                    <Route path="criteria" element={<CriteriaManagement />} />
                    <Route path="criteria/dashboard" element={<CriteriaDashboard />} />
                    <Route path="criteria/:id" element={<CriterionDetailView />} />
                    <Route path="metrics/:id" element={<MetricDetailView />} />
                    <Route path="aqar" element={<AQARWorkspace />} />
                    <Route path="ssr" element={<SSRWorkspace />} />
                    <Route path="work-queue" element={<IQACWorkQueue />} />
                    <Route path="tasks" element={<TaskManagementView />} />
                    <Route path="notifications" element={<NotificationCenter />} />
                    <Route path="reports" element={<ReportGenerationPage />} />
                    <Route path="templates" element={<TemplateManagement />} />
                    <Route path="intelligence" element={<IQACIntelligenceDashboard />} />
                    <Route path="analytics" element={<IQACIntelligenceDashboard />} />
                    <Route path="*" element={<Navigate to="/iqac/dashboard" replace />} />
                  </Routes>
                </RoleRoute>
              }
            />

            {/* HOD Routes */}
            <Route
              path="/hod/*"
              element={
                <RoleRoute allowedRoles={['HOD']}>
                  <Routes>
                    <Route path="downloads" element={<HODDashboard initialView="downloads" />} />
                    <Route path="submission" element={<HODDashboard initialView="submission" />} />
                    <Route path="dashboard" element={<Navigate to="/hod/downloads" replace />} />
                    <Route path="*" element={<Navigate to="/hod/downloads" replace />} />
                  </Routes>
                </RoleRoute>
              }
            />

            {/* DEPARTMENT_INCHARGE Routes */}
            <Route
              path="/incharge/*"
              element={
                <RoleRoute allowedRoles={['DEPARTMENT_INCHARGE']}>
                  <Routes>
                    <Route path="dashboard" element={<InchargeDashboard initialView="dashboard" />} />
                    <Route path="merge" element={<InchargeDashboard initialView="merge" />} />
                    <Route path="downloads" element={<InchargeDashboard initialView="downloads" />} />
                    <Route path="*" element={<Navigate to="/incharge/dashboard" replace />} />
                  </Routes>
                </RoleRoute>
              }
            />

            {/* FACULTY Routes */}
            <Route
              path="/faculty/*"
              element={
                <RoleRoute allowedRoles={['FACULTY']}>
                  <Routes>
                    <Route path="dashboard" element={<FacultyProfileView />} />
                    <Route path="profile" element={<FacultyProfileView />} />
                    <Route path="*" element={<Navigate to="/faculty/profile" replace />} />
                  </Routes>
                </RoleRoute>
              }
            />

            {/* Top-level Phase 10 routes */}
            <Route path="/notifications" element={<NotificationCenter />} />
            <Route path="/tasks" element={<TaskManagementView />} />
            <Route path="/iqac/work-queue" element={<IQACWorkQueue />} />
            <Route path="/hod/work-queue" element={<HODWorkQueue />} />
            <Route path="/department/work-queue" element={<InchargeWorkQueue />} />
            <Route path="/faculty/workspace" element={<FacultyWorkspace />} />
            <Route path="/settings/college" element={<CollegeSettingsView />} />
            <Route path="/settings/team" element={<TeamManagementView />} />
            <Route path="/admin/control-center" element={<SuperAdminControlCenter />} />

            {/* Phase 14 Data Import & Integrations */}
            <Route path="/imports" element={<ImportCenter />} />
            <Route path="/imports/history" element={<ImportHistory />} />
            <Route path="/imports/migration" element={<DataMigrationWizard />} />
            <Route path="/settings/integrations" element={<IntegrationsManagement />} />

            {/* Phase 15 IQAC AI Copilot */}
            <Route path="/ai/copilot" element={<CopilotPage />} />
            <Route path="/copilot" element={<Navigate to="/ai/copilot" replace />} />

            {/* Phase 16 External Integrations & Communication */}
            <Route path="/communication" element={<CommunicationCenter />} />

            {/* Phase 17 Billing & Commercial SaaS */}
            <Route
              path="/billing"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'COLLEGE_MANAGEMENT', 'IQAC']}>
                  <BillingDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/billing/plans"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'COLLEGE_MANAGEMENT', 'IQAC']}>
                  <PlanComparison />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/billing"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminBillingDashboard />
                </RoleRoute>
              }
            />

            {/* Phase 18 Support, System Health & Operations */}
            <Route path="/support" element={<SupportCenter />} />
            <Route
              path="/admin/support"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminSupportManagement />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/system-health"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminSystemHealth />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/jobs"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminJobMonitor />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/security"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                  <SecurityEventsExplorer />
                </RoleRoute>
              }
            />
            <Route
              path="/admin/incidents"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                  <IncidentManagement />
                </RoleRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to={getRoleDashboardPath(user?.role)} replace />} />
          </Routes>
        </main>
      </div>

      {/* Phase 13 Mobile Bottom Navigation */}
      <MobileBottomNav onOpenUpload={() => setIsMobileUploadOpen(true)} />

      {/* Phase 13 Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenUpload={() => setIsMobileUploadOpen(true)}
      />

      {/* Phase 13 Feedback & Support Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />

      {/* Phase 13 Mobile-Optimized Camera/File Upload Modal */}
      <MobileCertificateUploadModal
        isOpen={isMobileUploadOpen}
        onClose={() => setIsMobileUploadOpen(false)}
        onSuccess={() => navigate('/faculty/activities')}
      />

      {/* Existing Modals */}
      <ActivityFormModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          navigate('/faculty/activities');
        }}
      />

      <CreateCollegeModal
        isOpen={isCreateCollegeOpen}
        onClose={() => setIsCreateCollegeOpen(false)}
        onSuccess={() => {
          navigate('/admin/dashboard');
        }}
      />
    </div>
  );
}

export default App;
