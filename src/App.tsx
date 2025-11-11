import React from 'react';
import { SiteConfigProvider } from './features/config/SiteConfigProvider';
import { AppThemeProvider } from './features/theme/ThemeProvider';
import { AppIntlProvider } from './features/i18n/IntlProvider';
import { AppRouter } from './router/AppRouter';
import { Loading } from './components/Loading';

const App: React.FC = () => {
  return (
    <SiteConfigProvider loadingComponent={<Loading message="Loading configuration..." />}>
      <AppIntlProvider>
        <AppThemeProvider>
          <AppRouter />
        </AppThemeProvider>
      </AppIntlProvider>
    </SiteConfigProvider>
  );
};

export default App;
