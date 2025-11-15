import React from 'react';
import { SiteConfigProvider } from './features/config/SiteConfigProvider';
import { AppThemeProvider } from './features/theme/ThemeProvider';
import { AppIntlProvider } from './features/i18n/IntlProvider';
import { AppRouter } from './router/AppRouter';
import { Loading } from './components/Loading';
import { useFavicon } from './hooks/useFavicon';
import { useAppTheme } from './hooks/useTheme';

// Inner component that has access to the theme context
const AppContent: React.FC = () => {
  const { siteThemeConfig } = useAppTheme();
  useFavicon(siteThemeConfig.faviconUrl);

  return <AppRouter />;
};

const App: React.FC = () => {
  return (
    <SiteConfigProvider loadingComponent={<Loading message="Loading configuration..." />}>
      <AppIntlProvider>
        <AppThemeProvider>
          <AppContent />
        </AppThemeProvider>
      </AppIntlProvider>
    </SiteConfigProvider>
  );
};

export default App;
