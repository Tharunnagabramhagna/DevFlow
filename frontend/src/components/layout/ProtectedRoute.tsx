import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { EffectiveRole } from '@/types';

interface ProtectedRouteProps {
  children?: React.ReactElement;
  allowedRoles?: EffectiveRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { hasSession, effectiveRole } = useAuth();
  const location = useLocation();

  if (!hasSession) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
      if (location.pathname !== '/dashboard') {
        return (
          <Navigate
            to="/dashboard"
            replace
            state={{ restrictedFrom: location.pathname }}
          />
        );
      }
    }
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;

