import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthProvider';
import { BaseIntlProvider } from '../features/i18n/IntlProvider';
import { StaticThemeProvider } from '../features/theme/ThemeProvider';
import type { Locale, I18nDictionary } from '@simple-site/interfaces';

const loadAdminMessages = (locale: Locale): Promise<I18nDictionary> =>
  fetch('/i18n.json')
    .then<Record<string, I18nDictionary>>(r => r.json())
    .then(all => all[locale] ?? all['en'] ?? {})
    .catch(() => ({}));

export const AdminShell = () => (
  <AuthProvider>
    <BaseIntlProvider loadMessages={loadAdminMessages}>
      <StaticThemeProvider>
        <Outlet />
      </StaticThemeProvider>
    </BaseIntlProvider>
  </AuthProvider>
);
