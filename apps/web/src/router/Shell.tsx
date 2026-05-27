import { Outlet } from 'react-router-dom';
import { SiteConfigProvider } from '../features/config/SiteConfigProvider';
import { IntlProvider } from '../features/i18n/IntlProvider';
import { AuthProvider } from '../features/auth/AuthProvider';
import { ThemeProvider } from '../features/theme/ThemeProvider';
import { AppRouter } from './AppRouter';
import { loadSiteConfig, loadTranslations } from '../services/initService';

export const PublicShell = () => (
  <SiteConfigProvider loadSiteConfig={loadSiteConfig}>
    <IntlProvider loadTranslations={loadTranslations}>
      <AuthProvider>
        <ThemeProvider>
          <AppRouter />
        </ThemeProvider>
      </AuthProvider>
    </IntlProvider>
  </SiteConfigProvider>
);

export const AdminShell = () => (
  <AuthProvider>
    <IntlProvider>
      <ThemeProvider>
        <Outlet />
      </ThemeProvider>
    </IntlProvider>
  </AuthProvider>
);
