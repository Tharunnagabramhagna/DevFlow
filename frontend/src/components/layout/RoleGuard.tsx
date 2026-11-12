import React from 'react';
import { Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldAlert, ArrowLeft, LayoutDashboard, AlertOctagon } from 'lucide-react';

interface RoleGuardProps {
  allowedRole?: 'CLIENT' | 'DEVELOPER';
  allowedRoles?: ('CLIENT' | 'DEVELOPER')[];
  children?: React.ReactElement;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRole, allowedRoles, children }) => {
  const { hasSession, isClient, isGuest } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!hasSession) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const currentRole: 'CLIENT' | 'DEVELOPER' = isClient ? 'CLIENT' : 'DEVELOPER';
  const validRoles = allowedRoles || (allowedRole ? [allowedRole] : ['CLIENT', 'DEVELOPER']);
  const isAuthorized = validRoles.includes(currentRole);

  if (!isAuthorized) {
    const requiredRoleLabel = validRoles.includes('CLIENT') ? 'Client' : 'Developer';
    const currentRoleLabel = currentRole === 'CLIENT' ? 'Client' : 'Developer';

    return (
      <div className="flex-1 min-h-[80vh] flex items-center justify-center p-6 bg-slate-50 dark:bg-[#070C16] text-slate-900 dark:text-white">
        <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0E1726] border border-slate-200 dark:border-white/10 shadow-2xl p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase tracking-wider font-mono">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Access Denied \u2022 Role Restricted</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {requiredRoleLabel} Workspace Only
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              This route is restricted to <strong className="text-slate-800 dark:text-white">{requiredRoleLabel}</strong> accounts. You are currently active as a{' '}
              <strong className="text-blue-600 dark:text-blue-400">{currentRoleLabel}</strong> {isGuest ? '(Guest Mode)' : ''}.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-[#152238]/60 border border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400 text-left space-y-2">
            <div className="flex justify-between items-center">
              <span>Attempted Path:</span>
              <span className="font-mono text-slate-900 dark:text-white font-semibold">{location.pathname}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Required Role:</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">{requiredRoleLabel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active Session Role:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{currentRoleLabel}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-sm font-semibold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Return to {currentRoleLabel} Dashboard</span>
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
};

export default RoleGuard;
