import { SiteConfigProvider } from '../features/config/SiteConfigProvider';
import { AppIntlProvider } from '../features/i18n/IntlProvider';
import { AuthProvider } from '../features/auth/AuthProvider';
import { AppThemeProvider } from '../features/theme/ThemeProvider';
import { AppRouter } from './AppRouter';
import { Loading } from '../components/Loading';
import { useFavicon } from '../hooks/useFavicon';
import { useAppTheme } from '../hooks/useTheme';

const PublicContent = () => {
  const { siteThemeConfig } = useAppTheme();
  useFavicon(siteThemeConfig.faviconUrl);
  return <AppRouter />;
};

export const PublicShell = () => (
  <SiteConfigProvider loadingComponent={<Loading message="Loading configuration..." />}>
    <AppIntlProvider loadingComponent={<Loading message="Loading translations..." />}>
      <AuthProvider>
        <AppThemeProvider>
          <PublicContent />
        </AppThemeProvider>
      </AuthProvider>
    </AppIntlProvider>
  </SiteConfigProvider>
);
