import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthProvider';
import { AdminIntlProvider } from '../features/i18n/AdminIntlProvider';
import { AdminThemeProvider } from '../features/theme/AdminThemeProvider';

export const AdminShell = () => (
  <AuthProvider>
    <AdminIntlProvider>
      <AdminThemeProvider>
        <Outlet />
      </AdminThemeProvider>
    </AdminIntlProvider>
  </AuthProvider>
);
