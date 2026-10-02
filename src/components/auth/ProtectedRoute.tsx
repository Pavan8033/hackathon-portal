import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { session, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F5EF] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#164A36] border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-[#667085] tracking-wide uppercase">
            Verifying Authentication...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in at all
  if (!session || !role) {
    const redirectPath = requiredRole === 'admin' ? '/admin/login' : '/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Role mismatch (e.g. Participant attempting to access Admin)
  if (role !== requiredRole) {
    // If a participant tries to access admin, redirect to participant dashboard
    if (role === 'team' && requiredRole === 'admin') {
      return <Navigate to="/participant" replace />;
    }
    // If admin visits participant route, allow or redirect to admin
    if (role === 'admin' && requiredRole === 'team') {
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{children}</>;
};
