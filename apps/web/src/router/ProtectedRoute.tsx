import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components/Loading';
import { loginPath } from '../features/auth/auth.constants';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const intl = useIntl();
  if (isLoading) return <Loading message={intl.formatMessage({ id: 'auth.checking' })} />;
  if (!user) return <Navigate to={loginPath} replace />;
  return <>{children}</>;
};
