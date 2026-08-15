import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import type { MenuItem } from '@simple-site/interfaces';
import type { AuthContextValue } from '../features/auth/AuthContext';
import { ManageLayout } from './ManageLayout';
import { renderWithProviders, TEST_USER } from '../test/renderWithProviders';

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

const renderLayout = (path = '/manage', context: Partial<AuthContextValue> = {}) =>
  renderWithProviders(
    <ManageLayout menuItems={menuItems}>
      <div>content</div>
    </ManageLayout>,
    { route: path, auth: { user: TEST_USER, ...context } },
  );

describe('ManageLayout', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

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

  it('folds the desktop drawer to icons only and back', async () => {
    renderLayout();
    const expanded = screen.getAllByText('Dashboard').length; // desktop + mobile
    fireEvent.click(screen.getByRole('button', { name: 'Collapse menu' }));
    // The desktop drawer drops its labels immediately (mobile keeps them).
    expect(screen.getAllByText('Dashboard').length).toBeLessThan(expanded);
    // Expanding reveals the labels again once the animation completes.
    fireEvent.click(screen.getByRole('button', { name: 'Expand menu' }));
    await waitFor(() => expect(screen.getAllByText('Dashboard').length).toBe(expanded));
  });

  it('logs out when the logout button is clicked', () => {
    const logout = vi.fn();
    renderLayout('/manage', { logout });
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalledOnce();
  });
});
