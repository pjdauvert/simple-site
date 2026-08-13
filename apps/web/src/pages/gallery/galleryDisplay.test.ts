import { describe, it, expect } from 'vitest';
import { collectGalleryI18nEntries, type GalleryConfig, type SiteConfig } from '@simple-site/interfaces';
import {
  displayableItems,
  displayableThemes,
  galleryAspectRatioValue,
  galleryColumnsSx,
  galleryDisplaySettings,
  galleryPageTitle,
  galleryThemeRoute,
  itemFrameSx,
  itemWidthCapSx,
  themeCoverUrl,
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

describe('themeCoverUrl', () => {
  const theme = (over: Partial<GalleryConfig['themes'][number]> = {}) => ({
    themeId: 'nature',
    title: 'Nature',
    items: [
      { title: 'No image' },
      { imageUrl: '/a.jpg', title: 'A' },
      { imageUrl: '/b.jpg', title: 'B' },
    ],
    ...over,
  });

  it('uses the explicit pick when it points at a displayable item', () => {
    expect(themeCoverUrl(theme({ coverIndex: 2 }))).toBe('/b.jpg');
  });

  it('falls back to the first displayable item without a pick, or on a stale one', () => {
    expect(themeCoverUrl(theme())).toBe('/a.jpg');
    // Index 0 has no image, and index 9 no longer exists.
    expect(themeCoverUrl(theme({ coverIndex: 0 }))).toBe('/a.jpg');
    expect(themeCoverUrl(theme({ coverIndex: 9 }))).toBe('/a.jpg');
  });
});

describe('galleryAspectRatioValue', () => {
  it('maps a ratio to its CSS value, and opts out on "original"', () => {
    expect(galleryAspectRatioValue('16:9')).toBe('16 / 9');
    expect(galleryAspectRatioValue('1:1')).toBe('1 / 1');
    expect(galleryAspectRatioValue('original')).toBeUndefined();
  });
});

describe('galleryColumnsSx', () => {
  it('honours the design count on wide screens only — narrow ones always collapse', () => {
    expect(galleryColumnsSx(5)).toEqual({ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' });
    expect(galleryColumnsSx(2).md).toBe('repeat(2, 1fr)');
  });
});

describe('galleryDisplaySettings', () => {
  it('resolves the new design defaults and the watermark', () => {
    expect(galleryDisplaySettings(undefined)).toMatchObject({
      itemColumns: 3,
      itemAspectRatio: '4:3',
      itemFit: 'cover',
      itemSpacing: 'normal',
      watermark: undefined,
    });

    const settings = galleryDisplaySettings(
      gallery({ design: { itemColumns: 5, itemSpacing: 'airy', watermarkText: '© Studio' } }),
    );
    expect(settings).toMatchObject({ itemColumns: 5, itemSpacing: 'airy' });
    // The watermark styling defaults come along once there is text to draw.
    expect(settings.watermark).toEqual({
      text: '© Studio',
      position: 'bottomRight',
      color: '#FFFFFF',
      opacity: 60,
    });
  });
});

describe('itemFrameSx', () => {
  it('frames the tile with the design elevation, border and corner radius', () => {
    expect(itemFrameSx({ itemElevation: 6, itemBorder: true, itemBorderColor: '#123456', itemCornerRadius: 12 })).toEqual({
      borderRadius: '12px',
      boxShadow: 6, // numeric sx boxShadow = the MUI elevation scale
      border: '2px solid',
      borderColor: '#123456',
    });
  });

  it('defaults to the base radius, flat and borderless — with the theme primary as border fallback', () => {
    expect(itemFrameSx({})).toEqual({ borderRadius: '4px' });
    // Radius 0 (sharp corners) is a real value, distinct from "unset".
    expect(itemFrameSx({ itemCornerRadius: 0 })).toEqual({ borderRadius: '0px' });
    // A border without a color falls back to the theme's primary.
    expect(itemFrameSx({ itemBorder: true, itemBorderColor: '  ' })).toEqual({
      borderRadius: '4px',
      border: '2px solid',
      borderColor: 'primary.main',
    });
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
