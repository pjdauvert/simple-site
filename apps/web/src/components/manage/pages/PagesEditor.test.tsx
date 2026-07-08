import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import type { SiteConfig, ThemeConfig } from '@simple-site/interfaces';
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

const emptyConfig = (): SiteConfig =>
  ({ site: { siteName: 'Test', containerMaxWidth: 'lg' }, themes: [], pages: [] }) as unknown as SiteConfig;

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
    vi.mocked(loadDraftConfig).mockResolvedValue(emptyConfig());
    vi.mocked(saveDraftConfig).mockResolvedValue(undefined);
  });

  it('shows the empty state after loading the draft', async () => {
    renderEditor();
    expect(await screen.findByRole('button', { name: /add page/i })).toBeInTheDocument();
    // Shown in both the rail and the center pane when there are no pages.
    expect(screen.getAllByText('No pages yet. Add one to get started.').length).toBeGreaterThan(0);
  });

  it('adds a page and saves the whole draft with it', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add page/i }));

    // The page settings form appears for the newly-added page.
    expect(await screen.findByLabelText(/route/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });

    await waitFor(() => expect(saveDraftConfig).toHaveBeenCalledTimes(1));
    const saved = vi.mocked(saveDraftConfig).mock.calls[0][0] as SiteConfig;
    expect(saved.pages).toHaveLength(1);
    // Untouched slices are preserved from the re-fetched draft.
    expect(saved.themes).toEqual([]);
  });

  it('adds a section and mounts its editor with a live preview', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add page/i }));

    fireEvent.click(await screen.findByRole('button', { name: /add section/i }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Hero' }));

    // The Hero editor mounts (its Title field) once the new section is selected.
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
    const forms = screen.getAllByText('Route is required.');
    expect(forms.length).toBeGreaterThan(0);
  });
});
