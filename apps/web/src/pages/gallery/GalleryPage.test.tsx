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

type GalleryFixture = {
  items?: Array<{ imageUrl?: string; title: string; subtitle?: string; tags?: string[] }>;
  tags?: GalleryConfig['tags'];
  design?: GalleryConfig['design'];
};

const configWith = (gallery?: GalleryFixture): SiteConfig =>
  ({ site: { siteName: 'Test' }, themes: [], pages: [], gallery }) as unknown as SiteConfig;

const setConfig = (gallery?: GalleryFixture) =>
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
    setConfig({ items: [{ imageUrl: '/a.jpg', title: 'A' }] });
    renderPage();
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('renders the 404 page when nothing is displayable (no gallery, or images all missing)', () => {
    setConfig(undefined);
    renderPage();
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();

    setConfig({ items: [{ title: 'No image yet', tags: ['draft'] }], tags: [{ tag: 'draft', displayName: 'Draft' }] });
    renderPage();
    expect(screen.getAllByText('Oops — nothing here!').length).toBeGreaterThan(0);
  });

  it('lists the items with title and subtitle, hiding items whose image is missing', () => {
    setConfig({
      items: [
        { imageUrl: '/a.jpg', title: 'A', subtitle: 'Sub A' },
        { title: 'Hidden — no image' },
        { imageUrl: '/b.jpg', title: 'B' },
      ],
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
      design: { captionPosition: 'above' },
    });
    renderPage();
    const row = screen.getByRole('button', { name: 'A' }).parentElement as HTMLElement;
    expect(within(row.firstElementChild as HTMLElement).getByRole('heading', { level: 3, name: 'A' })).toBeInTheDocument();
  });

  it('browses every item from the root, surfacing the tags as a bar and per-item chips', () => {
    setConfig({
      items: [
        { imageUrl: '/solo.jpg', title: 'Solo shot' },
        { imageUrl: '/tree.jpg', title: 'Tree', tags: ['nature'] },
        { title: 'Hidden', tags: ['empty'] },
      ],
      tags: [
        { tag: 'nature', displayName: 'Nature' },
        // Nothing displayable carries it → its collection would 404: kept off the bar.
        { tag: 'empty', displayName: 'Empty' },
      ],
    });
    renderPage();
    // Tagged and untagged items sit in the same root list — tags never partition it.
    expect(screen.getByRole('heading', { level: 3, name: 'Solo shot' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Tree' })).toBeInTheDocument();
    // The GENERAL page surfaces the tags: a bar under the heading and a chip
    // on the tagged item, all linking to the collection.
    const links = screen.getAllByRole('link', { name: 'Nature' });
    expect(links).toHaveLength(2); // the bar chip + the item chip
    links.forEach((link) => expect(link).toHaveAttribute('href', '/gallery/tag/nature'));
    expect(screen.getByTestId('gallery-tag-bar')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Empty' })).not.toBeInTheDocument();
  });

  it('opens the zoom mode on click and browses the list as a wrap-around carousel', async () => {
    setConfig({
      items: [
        { imageUrl: '/a.jpg', title: 'A', subtitle: 'Sub A' },
        { imageUrl: '/b.jpg', title: 'B' },
      ],
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

  it('renders capped items without breaking (the media-gated cap itself is unit-tested)', () => {
    setConfig({
      items: [{ imageUrl: '/a.jpg', title: 'A' }],
      design: { itemMaxWidthPercent: 60 },
    });
    renderPage();
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
  });

  it('lays the grid out on the design column count, with the imposed ratio and fit', () => {
    setConfig({
      items: [
        { imageUrl: '/a.jpg', title: 'A' },
        { imageUrl: '/b.jpg', title: 'B' },
      ],
      design: { displayMode: 'grid', itemColumns: 5, itemAspectRatio: '16:9', itemFit: 'contain' },
    });
    renderPage();
    // jsdom resolves the mobile branch of the responsive track, so the desktop
    // count itself is unit-tested (`galleryColumnsSx`); here we lock the ratio.
    expect(screen.getByTestId('gallery-grid')).toBeInTheDocument();
    // jsdom normalises `16 / 9` to `16/9`.
    expect(screen.getByRole('img', { name: 'A' })).toHaveStyle({ aspectRatio: '16/9', objectFit: 'contain' });
  });

  it('burns the design watermark into every public rendition (list src and srcSet alike)', () => {
    const ikUrl = 'https://ik.imagekit.io/demo/shot.jpg';
    setConfig({
      items: [{ imageUrl: ikUrl, title: 'A' }],
      design: { watermarkText: '© Studio', watermarkPosition: 'center', watermarkOpacity: 100 },
    });
    renderPage();
    const image = screen.getByRole('img', { name: 'A' });
    expect(image.getAttribute('src')).toContain(
      'l-text,ie-wqkgU3R1ZGlv,fs-49,co-FFFFFFFF,w-972,ia-center,pa-29,lfo-center,l-end',
    );
    expect(image.getAttribute('srcset')).toContain('l-text,ie-wqkgU3R1ZGlv');

    // …and the zoom rendition carries it too.
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(within(screen.getByRole('dialog')).getByRole('img', { name: 'A' }).getAttribute('src')).toContain(
      'l-text,ie-wqkgU3R1ZGlv',
    );
  });

  it('situates the visitor with a zoom counter that follows the carousel', () => {
    setConfig({
      items: [
        { imageUrl: '/a.jpg', title: 'A' },
        { imageUrl: '/b.jpg', title: 'B' },
        { imageUrl: '/c.jpg', title: 'C' },
      ],
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByTestId('gallery-zoom-counter')).toHaveTextContent('1 / 3');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Next image' }));
    expect(within(dialog).getByTestId('gallery-zoom-counter')).toHaveTextContent('2 / 3');
    // Wrapping backward from the first shot lands on the last.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Previous image' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Previous image' }));
    expect(within(dialog).getByTestId('gallery-zoom-counter')).toHaveTextContent('3 / 3');
  });

  it('shows no counter when a single shot is displayable', () => {
    setConfig({ items: [{ imageUrl: '/a.jpg', title: 'A' }] });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(within(screen.getByRole('dialog')).queryByTestId('gallery-zoom-counter')).not.toBeInTheDocument();
  });

  it('navigates the zoom with a horizontal swipe, ignoring taps and vertical drags', () => {
    setConfig({
      items: [
        { imageUrl: '/a.jpg', title: 'A' },
        { imageUrl: '/b.jpg', title: 'B' },
      ],
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    const dialog = screen.getByRole('dialog');
    const surface = within(dialog).getByTestId('gallery-zoom-counter').closest('[data-testid]')?.parentElement
      ?.parentElement as HTMLElement;

    const swipe = (fromX: number, toX: number, fromY = 200, toY = 200) => {
      fireEvent.touchStart(surface, { touches: [{ clientX: fromX, clientY: fromY }] });
      fireEvent.touchEnd(surface, { changedTouches: [{ clientX: toX, clientY: toY }] });
    };

    // Swiping left walks forward…
    swipe(300, 100);
    expect(within(dialog).getByTestId('gallery-zoom-counter')).toHaveTextContent('2 / 2');
    // …swiping right walks back…
    swipe(100, 300);
    expect(within(dialog).getByTestId('gallery-zoom-counter')).toHaveTextContent('1 / 2');
    // …a short tap and a vertical drag leave the carousel alone.
    swipe(200, 190);
    swipe(200, 150, 100, 400);
    expect(within(dialog).getByTestId('gallery-zoom-counter')).toHaveTextContent('1 / 2');
  });

  it('shows no carousel arrows when a single item is displayable', () => {
    setConfig({ items: [{ imageUrl: '/a.jpg', title: 'A' }] });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'A' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Previous image' })).not.toBeInTheDocument();
  });
});
