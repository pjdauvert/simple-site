import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import type { MenuItem } from '@simple-site/interfaces';
import { AuthContext } from '../features/auth/AuthContext';
import type { AuthContextValue } from '../features/auth/AuthContext';
import messages from '../features/i18n/i18n.json';
import { ManageLayout } from './ManageLayout';

// The switchers and theme hook need providers this focused test doesn't set up.
vi.mock('../features/theme/ThemeSwitcher', () => ({ ThemeSwitcher: () => <div /> }));
vi.mock('../features/i18n/LanguageSwitcher', () => ({ LanguageSwitcher: () => <div /> }));
vi.mock('../hooks/useAppTheme', () => ({
  useAppTheme: () => ({ siteThemeConfig: { siteName: 'My Site', logoUrl: '' } }),
}));

const menuItems: MenuItem[] = [
  { menuTitle: 'Dashboard', pageName: 'manage.dashboard', route: '/manage' },
  { menuTitle: 'Site configuration', pageName: 'manage.siteConfig', route: '/manage/site' },
  { menuTitle: 'Translations', pageName: 'manage.translations', route: '/manage/translations' },
  { menuTitle: 'Media', pageName: 'manage.media', route: '/manage/media' },
];

function renderLayout(path = '/manage', context: Partial<AuthContextValue> = {}) {
  const defaults: AuthContextValue = {
    user: { id: 'u1', email: 'a@b.com' },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };
  return render(
    <MemoryRouter initialEntries={[path]}>
      <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
        <AuthContext.Provider value={{ ...defaults, ...context }}>
          <ManageLayout menuItems={menuItems}>
            <div>content</div>
          </ManageLayout>
        </AuthContext.Provider>
      </IntlProvider>
    </MemoryRouter>,
  );
}

describe('ManageLayout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a drawer entry for each menu item and the children', () => {
    renderLayout();
    // Desktop + mobile drawers both render the list, so labels appear twice.
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Site configuration').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Translations').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Media').length).toBeGreaterThan(0);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('marks the subtree-matching item active and leaves the dashboard inactive', () => {
    renderLayout('/manage/site/themes');
    const siteLinks = screen.getAllByText('Site configuration').map((el) => el.closest('a'));
    const dashLinks = screen.getAllByText('Dashboard').map((el) => el.closest('a'));
    expect(siteLinks.some((a) => a?.classList.contains('Mui-selected'))).toBe(true);
    expect(dashLinks.every((a) => !a?.classList.contains('Mui-selected'))).toBe(true);
  });

  it('keeps the dashboard active only on its exact path', () => {
    renderLayout('/manage');
    const dashLinks = screen.getAllByText('Dashboard').map((el) => el.closest('a'));
    expect(dashLinks.some((a) => a?.classList.contains('Mui-selected'))).toBe(true);
  });

  it('logs out when the logout button is clicked', () => {
    const logout = vi.fn();
    renderLayout('/manage', { logout });
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalledOnce();
  });
});
