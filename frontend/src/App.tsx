import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LandingPage } from '@/pages/LandingPage';
import { GetStartedPage } from '@/pages/GetStartedPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignUpPage } from '@/pages/SignUpPage';
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

/**
 * Legacy /guest/* route adapter: enters Demo Mode for the requested persona
 * using the unified shared dashboard shell instead of a separate guest page.
 */
const GuestEntryRedirect: React.FC<{ persona: 'CLIENT' | 'DEVELOPER' }> = ({ persona }) => {
  const { continueAsGuest, hasSession, isGuest, effectiveRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const enterUnifiedGuestDashboard = async () => {
      if (!hasSession || (isGuest && effectiveRole !== persona)) {
        await continueAsGuest(persona);
      }
      if (active) {
        navigate('/dashboard', { replace: true });
      }
    };
    enterUnifiedGuestDashboard();
    return () => {
      active = false;
    };
  }, [persona, continueAsGuest, hasSession, isGuest, effectiveRole, navigate]);

  return null;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Public Landing & Authentication Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/get-started" element={<GetStartedPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/client" element={<LoginPage initialRole="CLIENT" />} />
            <Route path="/login/developer" element={<LoginPage initialRole="DEVELOPER" />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/signup/client" element={<SignUpPage initialRole="CLIENT" />} />
            <Route path="/signup/developer" element={<SignUpPage initialRole="DEVELOPER" />} />
            <Route path="/register" element={<SignUpPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

            {/* Legacy Guest Entry Aliases -> Unified Shared Dashboard in Demo Mode */}
            <Route path="/guest/client" element={<GuestEntryRedirect persona="CLIENT" />} />
            <Route path="/guest/developer" element={<GuestEntryRedirect persona="DEVELOPER" />} />
            <Route path="/guest/client/dashboard" element={<GuestEntryRedirect persona="CLIENT" />} />
            <Route path="/guest/developer/dashboard" element={<GuestEntryRedirect persona="DEVELOPER" />} />
            <Route path="/client-guest" element={<GuestEntryRedirect persona="CLIENT" />} />
            <Route path="/developer-guest" element={<GuestEntryRedirect persona="DEVELOPER" />} />

            {/* Guarded Unified Dashboard Workspace Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/milestones" element={<MilestonesPage />} />
                <Route path="/evidence" element={<EvidencePage />} />
                <Route path="/payments" element={<PaymentActivityPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />

                {/* Client-Only Operations */}
                <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
                  <Route path="/milestone-verification" element={<MilestoneVerificationPage />} />
                  <Route path="/invoices" element={<PaymentsPage />} />
                </Route>

                {/* Developer-Only Workflows */}
                <Route element={<ProtectedRoute allowedRoles={['DEVELOPER']} />}>
                  <Route path="/verification" element={<VerificationPage />} />
                  <Route path="/agents" element={<VerificationPage />} />
                  <Route path="/integrations" element={<IntegrationsPage />} />
                </Route>
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
