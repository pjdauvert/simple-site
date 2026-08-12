import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import type { GalleryConfig, SiteConfig, ThemeConfig } from '@simple-site/interfaces';
import messages from '../../features/i18n/i18n.json';
import { ThemeContext, type ThemeContextValue } from '../../features/theme/ThemeContext';
import { GalleryPage } from './GalleryPage';
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

const configWith = (gallery?: GalleryConfig): SiteConfig =>
  ({ site: { siteName: 'Test' }, themes: [], pages: [], gallery }) as unknown as SiteConfig;

const setConfig = (gallery?: GalleryConfig) =>
  vi.mocked(useSiteConfig).mockReturnValue({ config: configWith(gallery) } as unknown as ReturnType<typeof useSiteConfig>);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/gallery']}>
      <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
        <MuiThemeProvider theme={createTheme()}>
          <ThemeContext.Provider value={themeValue}>
            <GalleryPage />
          </ThemeContext.Provider>
        </MuiThemeProvider>
      </IntlProvider>
    </MemoryRouter>,
  );
}

describe('GalleryPage (public /gallery)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false, contact: false, gallery: true });
  });

  it('renders the 404 page when the gallery feature is disabled, config or not', () => {
    vi.mocked(useFeatureFlags).mockReturnValue({ media: false, team: false, contact: false, gallery: false });
    setConfig({ items: [{ imageUrl: '/a.jpg', title: 'A' }], themes: [] });
    renderPage();
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('renders the 404 page when nothing is displayable (no gallery, or images all missing)', () => {
    setConfig(undefined);
    renderPage();
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();

    setConfig({ items: [{ title: 'No image yet' }], themes: [{ themeId: 'draft', title: 'Draft', items: [] }] });
    renderPage();
    expect(screen.getAllByText('Oops — nothing here!').length).toBeGreaterThan(0);
  });

  it('lists unthemed items with title and subtitle, hiding items whose image is missing', () => {
    setConfig({
      items: [
        { imageUrl: '/a.jpg', title: 'A', subtitle: 'Sub A' },
        { title: 'Hidden — no image' },
        { imageUrl: '/b.jpg', title: 'B' },
      ],
      themes: [],
    });
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Gallery' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'A' })).toBeInTheDocument();
    expect(screen.getByText('Sub A')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'B' })).toBeInTheDocument();
    expect(screen.queryByText('Hidden — no image')).not.toBeInTheDocument();
  });

  it('places the caption before the image when the design says "above"', () => {
    setConfig({
      items: [{ imageUrl: '/a.jpg', title: 'A' }],
      themes: [],
      design: { captionPosition: 'above' },
    });
    renderPage();
    const row = screen.getByRole('button', { name: 'A' }).parentElement as HTMLElement;
    expect(within(row.firstElementChild as HTMLElement).getByRole('heading', { level: 3, name: 'A' })).toBeInTheDocument();
  });

  it('renders theme covers linking to the theme pages, omitting non-displayable themes', () => {
    setConfig({
      items: [{ imageUrl: '/solo.jpg', title: 'Solo shot' }],
      themes: [
        { themeId: 'nature', title: 'Nature', items: [{ imageUrl: '/n.jpg', title: 'Tree' }] },
        { themeId: 'empty', title: 'Empty theme', items: [{ title: 'Image missing' }] },
      ],
    });
    renderPage();
    expect(screen.getByRole('link', { name: /Nature/ })).toHaveAttribute('href', '/gallery/nature');
    expect(screen.queryByText('Empty theme')).not.toBeInTheDocument();
    // Unthemed items are still explored from the root, below the theme index.
    expect(screen.getByRole('heading', { level: 3, name: 'Solo shot' })).toBeInTheDocument();
  });

  it('opens the zoom mode on click and browses the list as a wrap-around carousel', async () => {
    setConfig({
      items: [
        { imageUrl: '/a.jpg', title: 'A', subtitle: 'Sub A' },
        { imageUrl: '/b.jpg', title: 'B' },
      ],
      themes: [],
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('A')).toBeInTheDocument();
    expect(within(dialog).getByText('Sub A')).toBeInTheDocument();

    // Right arrow → B; again → wraps back to A.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Next image' }));
    expect(within(dialog).getByText('B')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Next image' }));
    expect(within(dialog).getByText('A')).toBeInTheDocument();

    // Left arrow wraps backward from the first item.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Previous image' }));
    expect(within(dialog).getByText('B')).toBeInTheDocument();

    // The dialog unmounts after its exit transition — wait it out. The list
    // itself still shows the captions, so assert on the dialog, not the text.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('delivers ImageKit-served images right-sized: responsive list srcSet, viewport-bucketed zoom', () => {
    const ikUrl = 'https://ik.imagekit.io/demo/shot.jpg';
    setConfig({
      items: [
        { imageUrl: ikUrl, title: 'IK shot' },
        { imageUrl: '/local/raw.jpg', title: 'Local shot' },
      ],
      themes: [],
    });
    renderPage();

    const ikImage = screen.getByRole('img', { name: 'IK shot' });
    expect(ikImage).toHaveAttribute('src', `${ikUrl}?tr=w-1080,q-80,f-auto`);
    expect(ikImage.getAttribute('srcset')).toContain(`${ikUrl}?tr=w-480,q-80,f-auto 480w`);
    expect(ikImage.getAttribute('srcset')).toContain('w-1920,q-80,f-auto 1920w');
    // Non-ImageKit URLs stay untouched — no srcset, no tr.
    const localImage = screen.getByRole('img', { name: 'Local shot' });
    expect(localImage).toHaveAttribute('src', '/local/raw.jpg');
    expect(localImage).not.toHaveAttribute('srcset');

    // Zoom: jsdom viewport is 1024×768 at DPR 1 → the 1280 delivery bucket.
    fireEvent.click(screen.getByRole('button', { name: 'IK shot' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('img', { name: 'IK shot' })).toHaveAttribute(
      'src',
      `${ikUrl}?tr=w-1280,q-80,f-auto`,
    );
  });

  it('renders the grid display mode — caption always below the image, whatever the setting', () => {
    setConfig({
      items: [
        { imageUrl: '/a.jpg', title: 'A', subtitle: 'Sub A' },
        { imageUrl: '/b.jpg', title: 'B' },
        { title: 'Hidden — no image' },
      ],
      themes: [],
      // The caption position is a list-mode setting — ignored by the grid.
      design: { displayMode: 'grid', captionPosition: 'above' },
    });
    renderPage();
    expect(screen.getByRole('heading', { level: 3, name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'B' })).toBeInTheDocument();
    expect(screen.queryByText('Hidden — no image')).not.toBeInTheDocument();

    // Image first, caption after — despite captionPosition: 'above'.
    const imageButton = screen.getByRole('button', { name: 'A' });
    expect((imageButton.parentElement as HTMLElement).firstElementChild).toBe(imageButton);

    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(within(screen.getByRole('dialog')).getByText('B')).toBeInTheDocument();
  });

  it('renders the mosaic display mode — pure image tiles, captions only in the zoom view', () => {
    setConfig({
      items: [
        { imageUrl: '/a.jpg', title: 'A', subtitle: 'Sub A' },
        { imageUrl: '/b.jpg', title: 'B' },
        { title: 'Hidden — no image' },
      ],
      themes: [],
      design: { displayMode: 'mosaic' },
    });
    renderPage();
    // The tiles carry no caption at all (images stay reachable by their alt)…
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'A' })).not.toBeInTheDocument();
    expect(screen.queryByText('Sub A')).not.toBeInTheDocument();
    expect(screen.queryByText('Hidden — no image')).not.toBeInTheDocument();

    // …while the zoom view still shows the title and subtitle.
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('A')).toBeInTheDocument();
    expect(within(dialog).getByText('Sub A')).toBeInTheDocument();
  });

  it('renders the alternating display mode — captions kept beside every shot', () => {
    setConfig({
      items: [
        { imageUrl: '/a.jpg', title: 'A', subtitle: 'Sub A' },
        { imageUrl: '/b.jpg', title: 'B', subtitle: 'Sub B' },
      ],
      themes: [],
      // captionPosition is ignored in alternate mode — rows place it themselves.
      design: { displayMode: 'alternate', captionPosition: 'above' },
    });
    renderPage();
    expect(screen.getByRole('heading', { level: 3, name: 'A' })).toBeInTheDocument();
    expect(screen.getByText('Sub A')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'B' })).toBeInTheDocument();
    expect(screen.getByText('Sub B')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(within(screen.getByRole('dialog')).getByText('Sub A')).toBeInTheDocument();
  });

  it('caps the clickable image at the design itemMaxWidth (zoom view unaffected)', () => {
    setConfig({
      items: [{ imageUrl: '/a.jpg', title: 'A' }],
      themes: [],
      design: { itemMaxWidth: 480 },
    });
    renderPage();
    expect(screen.getByRole('button', { name: 'A' })).toHaveStyle({ maxWidth: 'min(100%, 480px)' });
  });

  it('shows no carousel arrows when a single item is displayable', () => {
    setConfig({ items: [{ imageUrl: '/a.jpg', title: 'A' }], themes: [] });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Previous image' })).not.toBeInTheDocument();
  });
});
