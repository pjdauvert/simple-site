import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components/Loading';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Loading message="Checking authentication..." />;
  if (!user) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};
