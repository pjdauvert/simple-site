import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import type { PageConfiguration, SiteConfig, ThemeConfig } from '@simple-site/interfaces';
import messages from '../../../features/i18n/i18n.json';
import { NotificationsProvider } from '../../../features/notifications/NotificationsProvider';
import { ThemeContext, type ThemeContextValue } from '../../../features/theme/ThemeContext';
import { PagesEditor } from './PagesEditor';
import { loadDraftConfig, saveDraftConfig } from '../../../services/configVersionService';

vi.mock('../../../services/configVersionService', () => ({
  loadDraftConfig: vi.fn(),
  saveDraftConfig: vi.fn(),
}));
vi.mock('../../../services/mediaService', () => ({
  listMedia: vi.fn().mockResolvedValue({ folders: [], files: [] }),
}));
vi.mock('../../../hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn(() => ({ media: false })) }));

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

const themeValue: ThemeContextValue = {
  themeName: 'default',
  themeConfig,
  siteThemeConfig: { siteName: 'Test', containerMaxWidth: 'lg' } as ThemeContextValue['siteThemeConfig'],
  switchTheme: () => {},
  availableThemes: [],
};

const theme = (name: string): ThemeConfig => ({ ...themeConfig, themeName: name });

const configWith = (pages: PageConfiguration[], themes: unknown[] = []): SiteConfig =>
  ({ site: { siteName: 'Test', containerMaxWidth: 'lg' }, themes, pages }) as unknown as SiteConfig;

function renderEditor() {
  return render(
    <MemoryRouter>
      <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
        <MuiThemeProvider theme={createTheme()}>
          <ThemeContext.Provider value={themeValue}>
            <NotificationsProvider>
              <PagesEditor />
            </NotificationsProvider>
          </ThemeContext.Provider>
        </MuiThemeProvider>
      </IntlProvider>
    </MemoryRouter>,
  );
}

describe('PagesEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

  it('adds a section and docks its design controls in the bottom sheet', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add page/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^done$/i }));

    fireEvent.click(await screen.findByRole('button', { name: /add section/i }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Hero' }));

    // The bottom sheet carries design/structure only — copy is edited on the section.
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

  it('reorders pages from the reorder dialog', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith([
        { menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] },
        { menuTitle: 'About', pageName: 'page.about', route: '/about', sections: [] },
      ]),
    );
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /reorder pages/i }));

    // Move the second page (About) up above Home.
    const upButtons = await screen.findAllByRole('button', { name: /move up/i });
    fireEvent.click(upButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: /done/i }));

    // Wait for the dialog to finish closing before the toolbar is queryable again.
    const saveBtn = await screen.findByRole('button', { name: /^save$/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });
    await waitFor(() => expect(saveDraftConfig).toHaveBeenCalled());
    const saved = vi.mocked(saveDraftConfig).mock.calls[0][0] as SiteConfig;
    expect(saved.pages.map((p) => p.route)).toEqual(['/about', '/home']);
  });
});
