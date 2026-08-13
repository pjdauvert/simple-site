import { describe, it, expect } from 'vitest';
import { collectGalleryI18nEntries, type GalleryConfig, type SiteConfig } from '@simple-site/interfaces';
import {
  displayableItems,
  displayableThemes,
  galleryPageTitle,
  galleryThemeRoute,
  itemWidthCapSx,
} from './galleryDisplay';

const gallery = (over: Partial<GalleryConfig> = {}): GalleryConfig => ({ items: [], themes: [], ...over });

describe('displayableItems', () => {
  it('filters out items without an image while preserving CONFIG indexes (i18n keys are positional)', () => {
    const entries = displayableItems([
      { title: 'No image yet' },
      { imageUrl: '/a.jpg', title: 'A' },
      { imageUrl: '   ', title: 'Blank url' },
      { imageUrl: '/b.jpg', title: 'B' },
    ]);
    expect(entries.map((e) => e.item.title)).toEqual(['A', 'B']);
    expect(entries.map((e) => e.index)).toEqual([1, 3]);
  });

  it('handles an absent list', () => {
    expect(displayableItems(undefined)).toEqual([]);
  });
});

describe('displayableThemes', () => {
  it('keeps only themes with at least one displayable item', () => {
    const config = gallery({
      themes: [
        { themeId: 'nature', title: 'Nature', items: [{ imageUrl: '/n.jpg', title: 'Tree' }] },
        { themeId: 'empty', title: 'Empty', items: [] },
        { themeId: 'draft', title: 'Draft', items: [{ title: 'Image missing' }] },
      ],
    });
    expect(displayableThemes(config).map((t) => t.themeId)).toEqual(['nature']);
    expect(displayableThemes(undefined)).toEqual([]);
  });
});

describe('galleryThemeRoute', () => {
  it('nests theme pages under the gallery reserved route', () => {
    expect(galleryThemeRoute('nature')).toBe('/gallery/nature');
  });
});

describe('itemWidthCapSx', () => {
  it('caps at the screen-width percentage behind a LANDSCAPE media query only', () => {
    expect(itemWidthCapSx(60)).toEqual({
      mx: 'auto',
      // vw = % of the viewport width; portrait screens keep the natural width.
      '@media (orientation: landscape)': { maxWidth: 'min(100%, 60vw)' },
    });
  });

  it('is empty without a cap — the mode keeps its natural width everywhere', () => {
    expect(itemWidthCapSx(undefined)).toEqual({});
  });
});

describe('galleryPageTitle', () => {
  const config = (menu?: SiteConfig['menu']): SiteConfig =>
    ({ site: { siteName: 'Test' }, themes: [], pages: [], menu }) as unknown as SiteConfig;

  it('uses the menu entry custom label, wherever the entry sits', () => {
    expect(
      galleryPageTitle(config({ entries: [{ type: 'feature', feature: 'gallery', visible: true, menuTitle: 'Portfolio' }] })),
    ).toBe('Portfolio');
    expect(
      galleryPageTitle(config({ entries: [
        { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
          { type: 'feature', feature: 'gallery', visible: true, menuTitle: 'Shots' },
        ] },
      ] })),
    ).toBe('Shots');
  });

  it('falls back to the feature default without a menu entry', () => {
    expect(galleryPageTitle(config())).toBe('Gallery');
    expect(galleryPageTitle(config({ entries: [{ type: 'feature', feature: 'gallery', visible: true }] }))).toBe('Gallery');
  });
});

describe('collectGalleryI18nEntries', () => {
  it('emits theme titles and positional item keys, skipping absent subtitles', () => {
    const entries = collectGalleryI18nEntries(
      gallery({
        items: [{ imageUrl: '/a.jpg', title: 'Root shot', subtitle: 'At dawn' }],
        themes: [
          { themeId: 'nature', title: 'Nature', items: [
            { imageUrl: '/n1.jpg', title: 'Tree' },
            { imageUrl: '/n2.jpg', title: 'Lake', subtitle: 'Winter' },
          ] },
        ],
      }),
    );
    expect(entries).toEqual([
      { key: 'gallery.items.0.title', defaultValue: 'Root shot' },
      { key: 'gallery.items.0.subtitle', defaultValue: 'At dawn' },
      { key: 'gallery.theme.nature.menuTitle', defaultValue: 'Nature' },
      { key: 'gallery.theme.nature.items.0.title', defaultValue: 'Tree' },
      { key: 'gallery.theme.nature.items.1.title', defaultValue: 'Lake' },
      { key: 'gallery.theme.nature.items.1.subtitle', defaultValue: 'Winter' },
    ]);
  });

  it('still emits keys for items whose image is missing — the text is data, display is separate', () => {
    const entries = collectGalleryI18nEntries(gallery({ items: [{ title: 'WIP' }] }));
    expect(entries).toEqual([{ key: 'gallery.items.0.title', defaultValue: 'WIP' }]);
  });
});
