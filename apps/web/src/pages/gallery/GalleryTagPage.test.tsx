import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import type { GalleryConfig, SiteConfig, ThemeConfig } from '@simple-site/interfaces';
import messages from '../../features/i18n/i18n.json';
import { ThemeContext, type ThemeContextValue } from '../../features/theme/ThemeContext';
import { GalleryTagPage } from './GalleryTagPage';
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
  items: [
    { imageUrl: '/root.jpg', title: 'Root shot', tags: [] },
    { imageUrl: '/tree.jpg', title: 'Tree', tags: ['nature'] },
    { title: 'Hidden — no image', tags: ['nature'] },
  ],
  tags: [
    { tag: 'nature', displayName: 'Nature', description: 'Shot in **Corsica**.' },
    { tag: 'blank', displayName: 'Blank' },
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
              <Route path="/gallery/tag/:tag" element={<GalleryTagPage />} />
            </Routes>
          </ThemeContext.Provider>
        </MuiThemeProvider>
      </IntlProvider>
    </MemoryRouter>,
  );
}

describe('GalleryTagPage (public /gallery/tag/:tag)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false, contact: false, gallery: true });
    setConfig();
  });

  it('renders the 404 page when the gallery feature is disabled', () => {
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false, contact: false, gallery: false });
    renderAt('/gallery/tag/nature');
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('renders the tag heading, its description and only its displayable items', () => {
    renderAt('/gallery/tag/nature');
    expect(screen.getByRole('heading', { level: 1, name: 'Nature' })).toBeInTheDocument();
    // The markdown description renders under the heading.
    expect(screen.getByText('Corsica')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Tree' })).toBeInTheDocument();
    // The missing-image item and the untagged items stay out.
    expect(screen.queryByText('Hidden — no image')).not.toBeInTheDocument();
    expect(screen.queryByText('Root shot')).not.toBeInTheDocument();
  });

  it('renders the 404 page for an unknown tag and for a tag with nothing displayable', () => {
    renderAt('/gallery/tag/ghost');
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();

    renderAt('/gallery/tag/blank');
    expect(screen.getAllByText('Oops — nothing here!').length).toBeGreaterThan(0);
  });
});
