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

const configWith = (pages: PageConfiguration[]): SiteConfig =>
  ({ site: { siteName: 'Test', containerMaxWidth: 'lg' }, themes: [], pages }) as unknown as SiteConfig;

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

  it('adds a page (opening the settings drawer) and saves the whole draft', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add page/i }));

    // The drawer opens on the new page's settings — the route field is present.
    expect(await screen.findByLabelText(/route/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });

    await waitFor(() => expect(saveDraftConfig).toHaveBeenCalledTimes(1));
    const saved = vi.mocked(saveDraftConfig).mock.calls[0][0] as SiteConfig;
    expect(saved.pages).toHaveLength(1);
    expect(saved.themes).toEqual([]);
  });

  it('adds a section and mounts its editor in the drawer with a live preview', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add page/i }));

    fireEvent.click(await screen.findByRole('button', { name: /add section/i }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Hero' }));

    // The Hero editor mounts in the drawer once the new section is selected.
    expect(await screen.findByLabelText('Title')).toBeInTheDocument();

    // Editing the title flows into the live preview (rendered by the real HeroSection).
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Welcome aboard' } });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Welcome aboard' })).toBeInTheDocument(),
    );
  });

  it('flags invalid page fields and blocks save', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add page/i }));
    const route = await screen.findByLabelText(/route/i);
    fireEvent.change(route, { target: { value: '' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });

    expect(saveDraftConfig).not.toHaveBeenCalled();
    expect(screen.getAllByText('Route is required.').length).toBeGreaterThan(0);
  });

  it('locks the home page: route/name read-only and delete disabled', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      configWith([{ menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] }]),
    );
    renderEditor();
    // Open the settings drawer for the (auto-selected) home page.
    fireEvent.click(await screen.findByRole('button', { name: /toggle settings panel/i }));

    expect(await screen.findByLabelText(/route/i)).toBeDisabled();
    expect(screen.getByLabelText(/page name/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete page/i })).toBeDisabled();
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
