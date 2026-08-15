import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement, ReactNode } from 'react';
import messages from '../features/i18n/i18n.json';
import { AuthContext, type AuthContextValue } from '../features/auth/AuthContext';
import { NotificationsProvider } from '../features/notifications/NotificationsProvider';
import { ThemeContext, type ThemeContextValue } from '../features/theme/ThemeContext';

/**
 * The provider stack the app mounts around every screen. A test opts into the
 * providers the component under test actually reads — anything left out stays
 * absent, so a missing provider still fails the way it would in the app.
 */
export interface ProviderOptions {
  /** Mount inside a `MemoryRouter` at this entry (or entries). Omit for no router. */
  route?: string | string[];
  /** `IntlProvider` locale — the bundled dictionary is always supplied. Default `'en'`. */
  locale?: 'en' | 'fr';
  /** Config-derived messages, merged over the bundled dictionary. */
  messages?: Record<string, string>;
  /** Mount inside `AuthContext`, merged over a signed-out default. */
  auth?: Partial<AuthContextValue>;
  /** Mount inside `NotificationsProvider` — every admin editor toasts on save. */
  notifications?: boolean;
  /** Mount inside the MUI theme + `ThemeContext`, merged over {@link TEST_THEME}. */
  theme?: boolean | Partial<ThemeContextValue>;
}

/** A signed-out visitor; `auth` overrides whatever a test needs. */
export const anonymousAuth = (): AuthContextValue => ({
  user: null,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
});

/** The signed-in admin the /manage screens are written against. */
export const TEST_USER = { id: 'u1', email: 'a@b.com' };

/**
 * A neutral site theme: one nameless theme, no alternatives to switch to. Tests
 * that assert on themed output pass their own `themeConfig` through `theme`.
 */
export const TEST_THEME: ThemeContextValue = {
  themeName: 'default',
  themeConfig: { themeName: 'default' } as ThemeContextValue['themeConfig'],
  siteThemeConfig: { siteName: 'Test Site', containerMaxWidth: 'lg' } as ThemeContextValue['siteThemeConfig'],
  switchTheme: () => {},
  availableThemes: [],
};

/** Wraps `children` in the providers `options` asks for, innermost first. */
const wrap = (children: ReactNode, options: ProviderOptions): ReactElement => {
  const { route, locale = 'en', messages: extraMessages, auth, notifications, theme } = options;
  let tree = children;

  if (theme) {
    tree = (
      <MuiThemeProvider theme={createTheme()}>
        <ThemeContext.Provider value={{ ...TEST_THEME, ...(theme === true ? {} : theme) }}>
          {tree}
        </ThemeContext.Provider>
      </MuiThemeProvider>
    );
  }
  if (notifications) tree = <NotificationsProvider>{tree}</NotificationsProvider>;
  if (auth) tree = <AuthContext.Provider value={{ ...anonymousAuth(), ...auth }}>{tree}</AuthContext.Provider>;

  tree = (
    <IntlProvider
      locale={locale}
      defaultLocale="en"
      messages={{ ...(messages[locale] as Record<string, string>), ...extraMessages }}
    >
      {tree}
    </IntlProvider>
  );

  if (route !== undefined) {
    tree = <MemoryRouter initialEntries={Array.isArray(route) ? route : [route]}>{tree}</MemoryRouter>;
  }
  return <>{tree}</>;
};

/**
 * Renders `ui` inside the providers named in `options`, and returns whatever
 * `@testing-library/react` returns (`unmount`, `rerender`, `container`…).
 *
 * ```ts
 * renderWithProviders(<GalleryPage />, { route: '/gallery', theme: true });
 * renderWithProviders(<MenuEditor />, { notifications: true });
 * ```
 */
export const renderWithProviders = (ui: ReactElement, options: ProviderOptions = {}) =>
  render(ui, { wrapper: ({ children }) => wrap(children, options) });
