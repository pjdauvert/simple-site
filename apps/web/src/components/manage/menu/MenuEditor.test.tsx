import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import type { MenuConfig, SiteConfig } from '@simple-site/interfaces';
import messages from '../../../features/i18n/i18n.json';
import { NotificationsProvider } from '../../../features/notifications/NotificationsProvider';
import { MenuEditor } from './MenuEditor';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateMenu } from '../../../services/menuService';
import { useFeatureFlags } from '../../../hooks/useFeatureFlags';

vi.mock('../../../services/configVersionService', () => ({ loadDraftConfig: vi.fn() }));
vi.mock('../../../services/menuService', () => ({ updateMenu: vi.fn() }));
vi.mock('../../../hooks/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(),
  ALL_DISABLED: { media: false, team: false },
}));

const page = (pageName: string, route: string, menuTitle: string) =>
  ({ pageName, route, menuTitle, sections: [] });

const configWith = (pages: ReturnType<typeof page>[], menu?: MenuConfig): SiteConfig =>
  ({ site: { siteName: 'Test' }, themes: [], pages, menu }) as unknown as SiteConfig;

function renderEditor() {
  return render(
    <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
      <NotificationsProvider>
        <MenuEditor />
      </NotificationsProvider>
    </IntlProvider>,
  );
}

describe('MenuEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false });
    vi.mocked(updateMenu).mockResolvedValue(undefined);
  });

  it('seeds the list from the pages order when the draft has no menu yet', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith([page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')]),
    );
    renderEditor();

    expect(await screen.findByText('Home')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    expect(updateMenu).toHaveBeenCalledWith({
      entries: [
        { type: 'page', pageName: 'page.home', visible: true },
        { type: 'page', pageName: 'page.about', visible: true },
      ],
    });
  });

  it('moves an entry up and saves the new order', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith([page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')]),
    );
    renderEditor();
    await screen.findByText('About');

    const upButtons = screen.getAllByRole('button', { name: /move up/i });
    fireEvent.click(upButtons[1]);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    const saved = vi.mocked(updateMenu).mock.calls[0][0];
    expect(saved.entries.map((e) => (e.type === 'page' ? e.pageName : e.feature))).toEqual([
      'page.about',
      'page.home',
    ]);
  });

  it('toggles visibility off and keeps the entry in the saved menu', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith([page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')]),
    );
    renderEditor();
    await screen.findByText('About');

    const switches = screen.getAllByRole('checkbox', { name: /visible in menu/i });
    fireEvent.click(switches[1]);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    const saved = vi.mocked(updateMenu).mock.calls[0][0];
    expect(saved.entries).toContainEqual({ type: 'page', pageName: 'page.about', visible: false });
  });

  it('greys out a stored feature entry whose feature is unavailable and disables its toggle', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith(
        [page('page.home', '/home', 'Home')],
        { entries: [
          { type: 'feature', feature: 'team', visible: false },
          { type: 'page', pageName: 'page.home', visible: true },
        ] },
      ),
    );
    renderEditor();
    await screen.findByText('Home');

    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    const switches = screen.getAllByRole('checkbox', { name: /visible in menu/i });
    expect(switches[0]).toBeDisabled();

    // The entry still saves — flag flips must not lose ordering.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    await waitFor(() => expect(updateMenu).toHaveBeenCalled());
    const saved = vi.mocked(updateMenu).mock.calls[0][0];
    expect(saved.entries[0]).toEqual({ type: 'feature', feature: 'team', visible: false });
  });
});
