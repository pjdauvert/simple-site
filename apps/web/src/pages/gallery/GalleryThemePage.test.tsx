import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import type { GalleryConfig, SiteConfig, ThemeConfig } from '@simple-site/interfaces';
import messages from '../../features/i18n/i18n.json';
import { ThemeContext, type ThemeContextValue } from '../../features/theme/ThemeContext';
import { GalleryThemePage } from './GalleryThemePage';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useSiteConfig } from '../../hooks/useSiteConfig';

vi.mock('../../hooks/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(),
  ALL_DISABLED: { media: false, team: false, contact: false, gallery: false },
}));
vi.mock('../../hooks/useSiteConfig', () => ({ useSiteConfig: vi.fn() }));

const themeValue: ThemeContextValue = {
  themeName: 'default',
  themeConfig: { themeName: 'default' } as unknown as ThemeConfig,
  siteThemeConfig: { siteName: 'Test Site', containerMaxWidth: 'lg' } as ThemeContextValue['siteThemeConfig'],
  switchTheme: () => {},
  availableThemes: [],
};

const gallery: GalleryConfig = {
  items: [{ imageUrl: '/root.jpg', title: 'Root shot' }],
  themes: [
    { themeId: 'nature', title: 'Nature', items: [
      { imageUrl: '/tree.jpg', title: 'Tree' },
      { title: 'Hidden — no image' },
    ] },
    { themeId: 'blank', title: 'Blank', items: [] },
  ],
};

const setConfig = (over?: GalleryConfig) =>
  vi.mocked(useSiteConfig).mockReturnValue({
    config: ({ site: { siteName: 'Test' }, themes: [], pages: [], gallery: over ?? gallery }) as unknown as SiteConfig,
  } as unknown as ReturnType<typeof useSiteConfig>);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
        <MuiThemeProvider theme={createTheme()}>
          <ThemeContext.Provider value={themeValue}>
            <Routes>
              <Route path="/gallery/:themeId" element={<GalleryThemePage />} />
            </Routes>
          </ThemeContext.Provider>
        </MuiThemeProvider>
      </IntlProvider>
    </MemoryRouter>,
  );
}

describe('GalleryThemePage (public /gallery/:themeId)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false, contact: false, gallery: true });
    setConfig();
  });

  it('renders the 404 page when the gallery feature is disabled', () => {
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false, contact: false, gallery: false });
    renderAt('/gallery/nature');
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('renders the theme heading and only its displayable items', () => {
    renderAt('/gallery/nature');
    expect(screen.getByRole('heading', { level: 1, name: 'Nature' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Tree' })).toBeInTheDocument();
    // The missing-image item and the other lists stay out.
    expect(screen.queryByText('Hidden — no image')).not.toBeInTheDocument();
    expect(screen.queryByText('Root shot')).not.toBeInTheDocument();
  });

  it('renders the 404 page for an unknown theme and for a theme with nothing displayable', () => {
    renderAt('/gallery/ghost');
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();

    renderAt('/gallery/blank');
    expect(screen.getAllByText('Oops — nothing here!').length).toBeGreaterThan(0);
  });
});
