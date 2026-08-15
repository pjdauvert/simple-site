import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import type { PageConfiguration, SiteConfig, ThemeConfig } from '@simple-site/interfaces';
import { PagesEditor } from './PagesEditor';
import { loadDraftConfig, saveDraftConfig } from '../../../services/configVersionService';
import { mockFeatures } from '../../../test/featureFlags';
import { renderWithProviders } from '../../../test/renderWithProviders';

vi.mock('../../../services/configVersionService', () => ({
  loadDraftConfig: vi.fn(),
  saveDraftConfig: vi.fn(),
}));
vi.mock('../../../services/mediaService', () => ({
  listMedia: vi.fn().mockResolvedValue({ folders: [], files: [] }),
}));
vi.mock('../../../hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));

const themeConfig: ThemeConfig = {
  themeName: 'default',
  primaryColor: '#1976d2',
  secondaryColor: '#9c27b0',
  linkColor: '#1976d2',
  linkHoverColor: '#1565c0',
  backgroundColor: '#ffffff',
  menuBackgroundColor: '#f5f5f5',
  menuHoverColor: '#e0e0e0',
} as unknown as ThemeConfig;

const theme = (name: string): ThemeConfig => ({ ...themeConfig, themeName: name });

const configWith = (pages: PageConfiguration[], themes: unknown[] = []): SiteConfig =>
  ({ site: { siteName: 'Test', containerMaxWidth: 'lg' }, themes, pages }) as unknown as SiteConfig;

const renderEditor = () =>
  renderWithProviders(<PagesEditor />, { route: '/', theme: { themeConfig }, notifications: true });

describe('PagesEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFeatures(); // no optional feature on: the section editors show their plain fields
    vi.mocked(loadDraftConfig).mockResolvedValue(configWith([]));
    vi.mocked(saveDraftConfig).mockResolvedValue(undefined);
  });

  it('shows the empty state after loading the draft', async () => {
    renderEditor();
    expect(await screen.findByText('No pages yet. Add one to get started.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add page/i })).toBeInTheDocument();
  });

  it('adds a page (opening its settings) and saves the whole draft', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add page/i }));

    // Creating a page opens its settings dialog — the route field is there.
    expect(await screen.findByLabelText(/route/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    const save = await screen.findByRole('button', { name: /^save$/i });
    await act(async () => { fireEvent.click(save); });

    await waitFor(() => expect(saveDraftConfig).toHaveBeenCalledTimes(1));
    const saved = vi.mocked(saveDraftConfig).mock.calls[0][0] as SiteConfig;
    expect(saved.pages).toHaveLength(1);
    expect(saved.themes).toEqual([]);
  });

  it('opens a section design panel below the section from its edit control', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add page/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^done$/i }));

    fireEvent.click(await screen.findByRole('button', { name: /add section/i }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Hero' }));

    // Selecting a section does not open the panel; its floating "edit" control does.
    expect(screen.queryByLabelText('Layout')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /edit section/i }));

    // The panel carries section-level design only — copy is edited on the section.
    expect(await screen.findByLabelText('Layout')).toBeInTheDocument();
    expect(
      screen.getByText('Text and images are edited directly on the section'),
    ).toBeInTheDocument();
  });

  it('edits a section title in place, on the rendered section', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add page/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^done$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /add section/i }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Hero' }));

    // The new section is selected, so its (empty) title renders as an in-place
    // field right on the rendered hero — no form, no drawer.
    const inline = await screen.findByPlaceholderText('Add a title…');
    fireEvent.change(inline, { target: { value: 'Welcome aboard' } });

    // The edit lands on the section itself, normalized, and saves.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(saveDraftConfig).toHaveBeenCalled());
    const saved = vi.mocked(saveDraftConfig).mock.calls[0][0] as SiteConfig;
    expect(saved.pages[0].sections[0]).toMatchObject({
      type: 'hero',
      content: { title: 'Welcome aboard' },
    });
  });

  it('flags invalid page fields and blocks save', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add page/i }));
    const route = await screen.findByLabelText(/route/i);
    fireEvent.change(route, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    const save = await screen.findByRole('button', { name: /^save$/i });
    await act(async () => { fireEvent.click(save); });

    expect(saveDraftConfig).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Some pages have invalid fields. Please fix the highlighted errors.'),
    ).toBeInTheDocument();
  });

  it('locks the home page: route/name read-only and delete disabled', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith([{ menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] }]),
    );
    renderEditor();
    // Open the settings dialog for the (auto-selected) home page.
    fireEvent.click(await screen.findByRole('button', { name: /^page settings$/i }));

    expect(await screen.findByLabelText(/route/i)).toBeDisabled();
    expect(screen.getByLabelText(/page name/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete page/i })).toBeDisabled();
  });

  it('shows the theme selector when 2+ themes exist', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith(
        [{ menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] }],
        [theme('Ocean'), theme('Sunset')],
      ),
    );
    renderEditor();
    expect(await screen.findByRole('button', { name: /preview theme/i })).toBeInTheDocument();
  });

  it('hides the theme selector with fewer than two themes', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith([{ menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] }], [theme('Ocean')]),
    );
    renderEditor();
    await screen.findByRole('button', { name: /^save$/i });
    expect(screen.queryByRole('button', { name: /preview theme/i })).not.toBeInTheDocument();
  });

  it('no longer offers page reordering — the Menu tab owns nav order', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith([
        { menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] },
        { menuTitle: 'About', pageName: 'page.about', route: '/about', sections: [] },
      ]),
    );
    renderEditor();
    await screen.findByRole('button', { name: /^save$/i });
    expect(screen.queryByRole('button', { name: /reorder/i })).not.toBeInTheDocument();
  });

  it('rejects a feature-reserved route and blocks save', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add page/i }));
    const route = await screen.findByLabelText(/route/i);
    fireEvent.change(route, { target: { value: '/team' } });
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    const save = await screen.findByRole('button', { name: /^save$/i });
    await act(async () => { fireEvent.click(save); });
    expect(saveDraftConfig).not.toHaveBeenCalled();

    // Reopening the page settings shows the reserved-route error on the field.
    fireEvent.click(screen.getByRole('button', { name: /^page settings$/i }));
    expect(
      await screen.findByText('This route is reserved for a feature page.'),
    ).toBeInTheDocument();
  });

  it('reconciles the draft menu with the pages on save (prunes stale, appends missing, keeps features)', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue({
      ...configWith([
        { menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] },
        { menuTitle: 'About', pageName: 'page.about', route: '/about', sections: [] },
      ]),
      menu: {
        entries: [
          { type: 'feature', feature: 'team', visible: false },
          { type: 'page', pageName: 'page.gone', visible: true },
          { type: 'page', pageName: 'page.home', visible: true },
        ],
      },
    } as SiteConfig);
    renderEditor();

    const save = await screen.findByRole('button', { name: /^save$/i });
    await act(async () => { fireEvent.click(save); });

    await waitFor(() => expect(saveDraftConfig).toHaveBeenCalled());
    const saved = vi.mocked(saveDraftConfig).mock.calls[0][0] as SiteConfig;
    expect(saved.menu?.entries).toEqual([
      { type: 'feature', feature: 'team', visible: false },
      { type: 'page', pageName: 'page.home', visible: true },
      { type: 'page', pageName: 'page.about', visible: true },
    ]);
  });
});
