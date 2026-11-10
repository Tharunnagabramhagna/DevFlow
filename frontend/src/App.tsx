import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignUpPage } from '@/pages/SignUpPage';
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

            {/* Dedicated Unauthenticated Guest Perspective Dashboards */}
            <Route path="/guest/client" element={<ClientGuestPage />} />
            <Route path="/guest/developer" element={<DeveloperGuestPage />} />
            <Route path="/client-guest" element={<Navigate to="/guest/client" replace />} />
            <Route path="/developer-guest" element={<Navigate to="/guest/developer" replace />} />

            {/* Guarded Dashboard Workspace Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/milestones" element={<MilestonesPage />} />
                <Route path="/evidence" element={<EvidencePage />} />
                <Route path="/verification" element={<VerificationPage />} />
                <Route path="/milestone-verification" element={<MilestoneVerificationPage />} />
                <Route path="/agents" element={<VerificationPage />} />
                <Route path="/payments" element={<PaymentActivityPage />} />
                <Route path="/invoices" element={<PaymentsPage />} />
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
