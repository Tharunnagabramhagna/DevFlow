import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LandingPage } from '@/pages/LandingPage';
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
    <HashRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Dashboard Workspace Routes */}
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};
