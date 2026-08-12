import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import type { MenuGroupDisplay } from '@simple-site/interfaces';
import { AuthContext } from '../features/auth/AuthContext';
import type { AuthContextValue } from '../features/auth/AuthContext';
import messages from '../features/i18n/i18n.json';
import type { NavNode } from '../router/publicMenu';
import { MenuBar } from './MenuBar';

// The switchers and theme hook need providers this focused test doesn't set up.
vi.mock('../features/theme/ThemeSwitcher', () => ({ ThemeSwitcher: () => <div /> }));
vi.mock('../features/i18n/LanguageSwitcher', () => ({ LanguageSwitcher: () => <div /> }));
vi.mock('../hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    themeConfig: {},
    siteThemeConfig: { siteName: 'My Site', logoUrl: '', containerMaxWidth: 'lg' },
  }),
}));

const group = (overrides: Partial<Extract<NavNode, { kind: 'group' }>> = {}): NavNode => ({
  kind: 'group',
  id: 'more',
  menuTitle: 'More',
  i18nKey: 'menu.more.menuTitle',
  alwaysExpanded: false,
  items: [
    { menuTitle: 'About', pageName: 'page.about', route: '/about' },
    { menuTitle: 'Team', pageName: 'team', route: '/team' },
  ],
  ...overrides,
});

const nodes: NavNode[] = [
  { kind: 'item', item: { menuTitle: 'Home', pageName: 'page.home', route: '/home' } },
  group(),
];

function renderBar(
  navNodes: NavNode[],
  path = '/home',
  extraMessages: Record<string, string> = {},
  context: Partial<AuthContextValue> = {},
  groupDisplay?: MenuGroupDisplay,
) {
  const defaults: AuthContextValue = { user: null, isLoading: false, login: vi.fn(), logout: vi.fn() };
  return render(
    <MemoryRouter initialEntries={[path]}>
      <IntlProvider locale="en" messages={{ ...(messages.en as Record<string, string>), ...extraMessages }}>
        <AuthContext.Provider value={{ ...defaults, ...context }}>
          <MenuBar navNodes={navNodes} groupDisplay={groupDisplay} />
        </AuthContext.Provider>
      </IntlProvider>
    </MemoryRouter>,
  );
}

/** The mobile popover's nav list (desktop and mobile coexist in the DOM). */
const openMobileNav = () => {
  fireEvent.click(screen.getByRole('button', { name: 'open menu' }));
  return within(screen.getByRole('navigation'));
};

describe('MenuBar (desktop)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders leaf links and opens a group popover of child links, closing on select', async () => {
    renderBar(nodes);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/home');

    const groupButton = screen.getByRole('button', { name: 'More' });
    expect(groupButton).not.toHaveAttribute('aria-expanded');
    fireEvent.click(groupButton);
    expect(groupButton).toHaveAttribute('aria-expanded', 'true');

    const popover = screen.getByRole('menu');
    const about = within(popover).getByRole('menuitem', { name: 'About' });
    expect(about).toHaveAttribute('href', '/about');
    expect(within(popover).getByRole('menuitem', { name: 'Team' })).toHaveAttribute('href', '/team');

    fireEvent.click(about);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('marks the group button active when the current route is one of its children', () => {
    renderBar(nodes, '/about');
    const groupBg = window.getComputedStyle(screen.getByRole('button', { name: 'More' })).backgroundColor;
    const homeBg = window.getComputedStyle(screen.getByRole('link', { name: 'Home' })).backgroundColor;
    expect(groupBg).not.toBe(homeBg); // group highlighted, plain leaf not

    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'About' })).toHaveClass('Mui-selected');
  });
});

describe('MenuBar (desktop, secondary-bar mode)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('toggles a secondary bar of child links below the app bar instead of a popover', async () => {
    renderBar(nodes, '/home', {}, {}, 'bar');

    const groupButton = screen.getByRole('button', { name: 'More' });
    expect(groupButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'About' })).not.toBeInTheDocument();

    fireEvent.click(groupButton);
    expect(groupButton).toHaveAttribute('aria-expanded', 'true');
    expect(groupButton).toHaveAttribute('aria-controls', 'desktop-subnav');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument(); // no popover in bar mode
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Team' })).toHaveAttribute('href', '/team');

    // Clicking the group again folds the bar back.
    fireEvent.click(groupButton);
    expect(groupButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the bar when a child navigates and on Escape', async () => {
    renderBar(nodes, '/home', {}, {}, 'bar');
    const groupButton = screen.getByRole('button', { name: 'More' });

    fireEvent.click(groupButton);
    fireEvent.click(screen.getByRole('link', { name: 'About' }));
    await waitFor(() => expect(groupButton).toHaveAttribute('aria-expanded', 'false'));

    fireEvent.click(groupButton);
    expect(groupButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(screen.getByRole('link', { name: 'Team' }), { key: 'Escape' });
    expect(groupButton).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('MenuBar (mobile)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a collapsed accordion per group and expands/collapses it on click', () => {
    renderBar(nodes);
    const nav = openMobileNav();

    expect(nav.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    const toggle = nav.getByRole('button', { name: 'More' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(nav.queryByRole('link', { name: 'About' })).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(nav.getByRole('link', { name: 'Team' })).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // unmountOnExit removes the children once the collapse animation ends.
  });

  it('renders an always-expanded group as a static header with its children visible', () => {
    renderBar([{ kind: 'item', item: { menuTitle: 'Home', pageName: 'page.home', route: '/home' } }, group({ alwaysExpanded: true })]);
    const nav = openMobileNav();

    expect(nav.queryByRole('button', { name: 'More' })).not.toBeInTheDocument(); // no toggle
    expect(nav.getByText('More')).toBeInTheDocument(); // subheader
    expect(nav.getByRole('link', { name: 'About' })).toBeInTheDocument();
    expect(nav.getByRole('link', { name: 'Team' })).toBeInTheDocument();
  });

  it('translates leaf labels through the shared menuTitleKey convention', () => {
    renderBar(nodes, '/home', { 'page.home.menuTitle': 'Accueil' });
    const nav = openMobileNav();
    expect(nav.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/home');
    expect(nav.queryByText('Home')).not.toBeInTheDocument();
  });

  it('shows a logout entry for an authenticated user and calls logout', () => {
    const logout = vi.fn();
    renderBar(nodes, '/home', {}, { user: { id: 'u1', email: 'a@b.com' }, logout });
    const nav = openMobileNav();
    fireEvent.click(nav.getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalledOnce();
  });
});
