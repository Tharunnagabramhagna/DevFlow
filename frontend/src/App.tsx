import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { ClientGuestWelcomePage } from '@/pages/ClientGuestWelcomePage';
import { DeveloperGuestWelcomePage } from '@/pages/DeveloperGuestWelcomePage';
import { ClientGuestPage } from '@/pages/ClientGuestPage';
import { DeveloperGuestPage } from '@/pages/DeveloperGuestPage';
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { MilestonesPage } from '@/pages/MilestonesPage';
import { EvidencePage } from '@/pages/EvidencePage';
import { VerificationPage } from '@/pages/VerificationPage';
import { MilestoneVerificationPage } from '@/pages/MilestoneVerificationPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { PaymentActivityPage } from '@/pages/PaymentActivityPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { IntegrationsPage } from '@/pages/IntegrationsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SettingsPage } from '@/pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Public Landing & Authentication Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/get-started" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/client" element={<LoginPage initialRole="CLIENT" />} />
            <Route path="/login/developer" element={<LoginPage initialRole="DEVELOPER" />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/signup/client" element={<SignUpPage initialRole="CLIENT" />} />
            <Route path="/signup/developer" element={<SignUpPage initialRole="DEVELOPER" />} />
            <Route path="/register" element={<SignUpPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

            {/* Dedicated Guest Welcome Pages & Dashboard Routes */}
            <Route path="/guest/client" element={<ClientGuestWelcomePage />} />
            <Route path="/guest/developer" element={<DeveloperGuestWelcomePage />} />
            <Route path="/guest/client/dashboard" element={<ClientGuestPage />} />
            <Route path="/guest/developer/dashboard" element={<DeveloperGuestPage />} />
            <Route path="/client-guest" element={<Navigate to="/guest/client" replace />} />
            <Route path="/developer-guest" element={<Navigate to="/guest/developer" replace />} />

            {/* Guarded Dashboard Workspace Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/milestones" element={<MilestonesPage />} />

                {/* Evidence Routes: Adaptive & Role-Guarded */}
                <Route path="/evidence" element={<EvidencePage />} />
                <Route
                  path="/evidence/review"
                  element={
                    <RoleGuard allowedRole="CLIENT">
                      <EvidencePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/evidence/submit"
                  element={
                    <RoleGuard allowedRole="DEVELOPER">
                      <EvidencePage />
                    </RoleGuard>
                  }
                />

                <Route path="/agents" element={<VerificationPage />} />
                <Route path="/verification" element={<MilestoneVerificationPage />} />
                <Route path="/milestone-verification" element={<MilestoneVerificationPage />} />

                {/* Finance Routes: Adaptive & Role-Guarded */}
                <Route path="/invoices" element={<PaymentsPage />} />
                <Route
                  path="/invoices/review"
                  element={
                    <RoleGuard allowedRole="CLIENT">
                      <PaymentsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/invoices/earnings"
                  element={
                    <RoleGuard allowedRole="DEVELOPER">
                      <PaymentsPage />
                    </RoleGuard>
                  }
                />
                <Route path="/payments" element={<PaymentActivityPage />} />
                <Route
                  path="/payments/payouts"
                  element={
                    <RoleGuard allowedRole="DEVELOPER">
                      <PaymentActivityPage />
                    </RoleGuard>
                  }
                />

                {/* Analytics Routes: Adaptive & Role-Guarded */}
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route
                  path="/analytics/financial"
                  element={
                    <RoleGuard allowedRole="CLIENT">
                      <AnalyticsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/analytics/development"
                  element={
                    <RoleGuard allowedRole="DEVELOPER">
                      <AnalyticsPage />
                    </RoleGuard>
                  }
                />

                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Fallback Catch-all Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
