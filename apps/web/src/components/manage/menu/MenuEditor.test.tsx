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
  ALL_DISABLED: { media: false, team: false, contact: false, gallery: false },
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
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false, contact: false, gallery: false });
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

  it('renames an entry inline and saves the custom label', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith([page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')]),
    );
    renderEditor();
    await screen.findByText('About');

    fireEvent.click(screen.getAllByRole('button', { name: /^rename$/i })[1]);
    const field = screen.getByRole('textbox', { name: /^rename$/i });
    expect(field).toHaveAttribute('placeholder', 'About'); // fallback = the page's own title
    fireEvent.change(field, { target: { value: 'Who we are' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(await screen.findByText('Who we are')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    const saved = vi.mocked(updateMenu).mock.calls[0][0];
    expect(saved.entries[1]).toEqual({ type: 'page', pageName: 'page.about', visible: true, menuTitle: 'Who we are' });
  });

  it('opens the Translations page deep-linked to the entry label key', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith(
        [page('page.home', '/home', 'Home')],
        { entries: [
          { type: 'page', pageName: 'page.home', visible: true },
          { type: 'feature', feature: 'team', visible: true },
        ] },
      ),
    );
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderEditor();
    await screen.findByText('Home');

    const translateButtons = screen.getAllByRole('button', { name: /translate/i });
    fireEvent.click(translateButtons[0]);
    expect(open).toHaveBeenCalledWith('/manage/translations?key=page.home.menuTitle', '_blank');
    fireEvent.click(translateButtons[1]);
    expect(open).toHaveBeenCalledWith('/manage/translations?key=team.menuTitle', '_blank');
    open.mockRestore();
  });

  it('clears a custom label when the rename field is emptied', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith(
        [page('page.home', '/home', 'Home')],
        { entries: [{ type: 'page', pageName: 'page.home', visible: true, menuTitle: 'Welcome' }] },
      ),
    );
    renderEditor();
    await screen.findByText('Welcome');

    fireEvent.click(screen.getByRole('button', { name: /^rename$/i }));
    const field = screen.getByRole('textbox', { name: /^rename$/i });
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(await screen.findByText('Home')).toBeInTheDocument(); // reverted to the page title

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    const saved = vi.mocked(updateMenu).mock.calls[0][0];
    expect(saved.entries[0]).toEqual({ type: 'page', pageName: 'page.home', visible: true });
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
    expect(saved.entries.map((e) => (e.type === 'page' ? e.pageName : e.type === 'feature' ? e.feature : e.type === 'galleryTag' ? e.tag : e.groupId))).toEqual([
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

  it('creates a group, moves an entry into it and saves the nested payload', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith([page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')]),
    );
    renderEditor();
    await screen.findByText('About');

    fireEvent.click(screen.getByRole('button', { name: /add group/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /group name/i }), { target: { value: 'More links' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(await screen.findByText('More links')).toBeInTheDocument();

    // Rows: Home, About, group — move About into the group via its overflow menu.
    fireEvent.click(screen.getAllByRole('button', { name: /more actions/i })[1]);
    fireEvent.click(await screen.findByRole('menuitem', { name: /move to "More links"/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    expect(updateMenu).toHaveBeenCalledWith({
      entries: [
        { type: 'page', pageName: 'page.home', visible: true },
        { type: 'group', groupId: 'moreLinks', menuTitle: 'More links', visible: true, children: [
          { type: 'page', pageName: 'page.about', visible: true },
        ] },
      ],
    });
  });

  it('moves a group child back out, right after its group', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith(
        [page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')],
        { entries: [
          { type: 'page', pageName: 'page.home', visible: true },
          { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
            { type: 'page', pageName: 'page.about', visible: true },
          ] },
        ] },
      ),
    );
    renderEditor();
    await screen.findByText('More');

    // Rows: Home, group, About (child) — the child's overflow menu offers "move out".
    fireEvent.click(screen.getAllByRole('button', { name: /more actions/i })[2]);
    fireEvent.click(await screen.findByRole('menuitem', { name: /move out of group/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    const saved = vi.mocked(updateMenu).mock.calls[0][0];
    expect(saved.entries).toEqual([
      { type: 'page', pageName: 'page.home', visible: true },
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [] },
      { type: 'page', pageName: 'page.about', visible: true },
    ]);
  });

  it('reorders within a group without escaping it', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith(
        [page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')],
        { entries: [
          { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
            { type: 'page', pageName: 'page.home', visible: true },
            { type: 'page', pageName: 'page.about', visible: true },
          ] },
        ] },
      ),
    );
    renderEditor();
    await screen.findByText('More');

    // Rows: group, Home (child), About (child) — move the last child up.
    fireEvent.click(screen.getAllByRole('button', { name: /move up/i })[2]);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    const saved = vi.mocked(updateMenu).mock.calls[0][0];
    expect(saved.entries).toEqual([
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
        { type: 'page', pageName: 'page.about', visible: true },
        { type: 'page', pageName: 'page.home', visible: true },
      ] },
    ]);
  });

  it('deletes a group and returns its children to the top level, in place', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith(
        [page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')],
        { entries: [
          { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
            { type: 'page', pageName: 'page.about', visible: true },
          ] },
          { type: 'page', pageName: 'page.home', visible: true },
        ] },
      ),
    );
    renderEditor();
    await screen.findByText('More');

    fireEvent.click(screen.getAllByRole('button', { name: /more actions/i })[0]);
    fireEvent.click(await screen.findByRole('menuitem', { name: /delete group/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    const saved = vi.mocked(updateMenu).mock.calls[0][0];
    expect(saved.entries).toEqual([
      { type: 'page', pageName: 'page.about', visible: true },
      { type: 'page', pageName: 'page.home', visible: true },
    ]);
  });

  it('toggles a group "always expanded on mobile" and saves it', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith(
        [page('page.home', '/home', 'Home')],
        { entries: [
          { type: 'page', pageName: 'page.home', visible: true },
          { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [] },
        ] },
      ),
    );
    renderEditor();
    await screen.findByText('More');

    fireEvent.click(screen.getAllByRole('button', { name: /more actions/i })[1]);
    fireEvent.click(await screen.findByRole('menuitem', { name: /always expanded on mobile/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    const saved = vi.mocked(updateMenu).mock.calls[0][0];
    expect(saved.entries[1]).toEqual({
      type: 'group', groupId: 'more', menuTitle: 'More', visible: true, alwaysExpanded: true, children: [],
    });
  });

  it('switches the desktop submenu display and omits the popover default from the payload', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith(
        [page('page.home', '/home', 'Home')],
        { entries: [
          { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [] },
          { type: 'page', pageName: 'page.home', visible: true },
        ] },
      ),
    );
    renderEditor();
    await screen.findByText('More');

    fireEvent.click(screen.getByRole('button', { name: /secondary bar/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    expect(vi.mocked(updateMenu).mock.calls[0][0].groupDisplay).toBe('bar');

    fireEvent.click(screen.getByRole('button', { name: /pop-over/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    expect(vi.mocked(updateMenu).mock.calls[1][0].groupDisplay).toBeUndefined();
  });

  it('preselects the stored desktop submenu display on load', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith(
        [page('page.home', '/home', 'Home')],
        { entries: [
          { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [] },
          { type: 'page', pageName: 'page.home', visible: true },
        ], groupDisplay: 'bar' },
      ),
    );
    renderEditor();
    await screen.findByText('More');
    expect(screen.getByRole('button', { name: /secondary bar/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renames a group label while keeping its id, and links its translation key', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith(
        [page('page.home', '/home', 'Home')],
        { entries: [
          { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [] },
          { type: 'page', pageName: 'page.home', visible: true },
        ] },
      ),
    );
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderEditor();
    await screen.findByText('More');

    fireEvent.click(screen.getAllByRole('button', { name: /translate/i })[0]);
    expect(open).toHaveBeenCalledWith('/manage/translations?key=menu.more.menuTitle', '_blank');
    open.mockRestore();

    fireEvent.click(screen.getAllByRole('button', { name: /^rename$/i })[0]);
    const field = screen.getByRole('textbox', { name: /^rename$/i });
    fireEvent.change(field, { target: { value: 'Extra' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(await screen.findByText('Extra')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save menu/i }));
    });
    const saved = vi.mocked(updateMenu).mock.calls[0][0];
    expect(saved.entries[0]).toEqual({ type: 'group', groupId: 'more', menuTitle: 'Extra', visible: true, children: [] });
  });
});
