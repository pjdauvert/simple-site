import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { NetlifyCallbackHandler } from './features/auth/NetlifyCallbackHandler';
import { SiteConfigProvider } from './features/config/SiteConfigProvider';
import { IntlProvider } from './features/i18n/IntlProvider';
import { AuthProvider } from './features/auth/AuthProvider';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { AppRouter } from './router/AppRouter';
import { loadSiteConfig, loadTranslations, loadLanguages, type LanguagesLoaderType, type TranslationLoaderType } from './services/initService';
import { Loading } from './components';
import type { ReactNode } from 'react';

// The sign-in and admin areas are code-split: a public visitor never signs in,
// so neither graph belongs in the eagerly loaded chunks (same reasoning as the
// lazy `lexical-vendor` chunk — see docs/architecture.md). They are fetched the
// first time someone opens `/auth/*` or `/manage/*`.
const AuthRouter = lazy(() => import('./router/AuthRouter').then((m) => ({ default: m.AuthRouter })));
const ManageRouter = lazy(() => import('./router/ManageRouter').then((m) => ({ default: m.ManageRouter })));


type ShellProps = {
  children: ReactNode;
  translationsLoader?: TranslationLoaderType;
  languagesLoader?: LanguagesLoaderType;
}
const Shell: React.FC<ShellProps> = ({ children, translationsLoader, languagesLoader }) => (
  <IntlProvider loadTranslations={translationsLoader} loadLanguages={languagesLoader}>
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
    // Suspense sits INSIDE the Shell so the fallback renders themed, like every
    // other loading state.
    element:<Shell><Suspense fallback={<Loading message="Loading…" />}><AuthRouter /></Suspense></Shell>,
  },{
    path: '/manage/*',
    element: <Shell languagesLoader={loadLanguages}><Suspense fallback={<Loading message="Loading…" />}><ManageRouter /></Suspense></Shell>,
  },
  {
    path: '*',
    element: 
      <SiteConfigProvider loadSiteConfig={loadSiteConfig}>
        <Shell translationsLoader={loadTranslations} languagesLoader={loadLanguages}>
          <AppRouter />
        </Shell>
      </SiteConfigProvider>
  },
]);

const App = () => <RouterProvider router={router} />;

export default App;
