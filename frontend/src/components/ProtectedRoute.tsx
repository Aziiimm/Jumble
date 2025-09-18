// src/components/ProtectedRoute.tsx

import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';
import { Spinner } from './ui/spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = '/login' 
}) => {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center font-adlam text-white">
        <div className="flex flex-col items-center gap-6 text-center">
          <Spinner />
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl">Loading...</h1>
            <p className="text-lg">Checking authentication</p>
          </div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to={redirectTo} replace />;
};

export default ProtectedRoute;
