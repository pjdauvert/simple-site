import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { NetlifyCallbackHandler } from './features/auth/NetlifyCallbackHandler';
import { SiteConfigProvider } from './features/config/SiteConfigProvider';
import { IntlProvider } from './features/i18n/IntlProvider';
import { AuthProvider } from './features/auth/AuthProvider';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { AppRouter } from './router/AppRouter';
import { loadSiteConfig, loadTranslations, type TranslationLoaderType } from './services/initService';
import { AuthRouter } from './router/AuthRouter';
import { AdminRouter } from './router/AdminRouter';
import type { ReactNode } from 'react';


type ShellProps = {
  children: ReactNode;
  translationsLoader?: TranslationLoaderType
}
const Shell: React.FC<ShellProps> = ({ children, translationsLoader }) => (
  <IntlProvider loadTranslations={translationsLoader}>
    <AuthProvider>
      <ThemeProvider>
        { children }
      </ThemeProvider>
    </AuthProvider>
  </IntlProvider>
);


const router = createBrowserRouter([
  {
    path: '/',
    Component: NetlifyCallbackHandler
  },
  {
    path: '/auth/*',
    element:<Shell><AuthRouter /></Shell>,
  },{
    path: '/manage/*',
    element: <Shell><AdminRouter /></Shell>,
  },
  {
    path: '*',
    element: 
      <SiteConfigProvider loadSiteConfig={loadSiteConfig}>
        <Shell translationsLoader={loadTranslations}>
          <AppRouter />
        </Shell>
      </SiteConfigProvider>
  },
]);

const App = () => <RouterProvider router={router} />;

export default App;
