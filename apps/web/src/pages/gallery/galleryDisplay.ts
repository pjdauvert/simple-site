import {
  DEFAULT_GALLERY_CAPTION_POSITION,
  DEFAULT_GALLERY_DISPLAY_MODE,
  DEFAULT_GALLERY_ITEM_CORNER_RADIUS,
  FEATURE_PAGE_ROUTES,
  FeaturePagesEnum,
  featureEntryLabel,
  FEATURE_PAGE_DEFAULT_LABELS,
  type GalleryCaptionPosition,
  type GalleryConfig,
  type GalleryDisplayMode,
  type GalleryItem,
  type GalleryTheme,
  type SiteConfig,
} from '@simple-site/interfaces';

/**
 * Display/selection helpers of the public gallery (web-only — the functions
 * never filter gallery items). Central rule: an item whose image is missing is
 * not displayed AT ALL — not in the lists, not in the zoom carousel, not as a
 * theme cover, and a theme with no displayable item disappears from the nav
 * and the theme index alike (it stays in the config).
 */

/** A displayable item plus its index in the CONFIG array — i18n keys are positional. */
export interface DisplayableGalleryItem {
  item: GalleryItem;
  index: number;
}

/** The items that render publicly (image present), with their config positions. */
export const displayableItems = (items: GalleryItem[] | undefined): DisplayableGalleryItem[] =>
  (items ?? [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => Boolean(item.imageUrl?.trim()));

/** The themes that render publicly: at least one displayable item. */
export const displayableThemes = (gallery: GalleryConfig | undefined): GalleryTheme[] =>
  (gallery?.themes ?? []).filter((theme) => displayableItems(theme.items).length > 0);

/** Public route of a theme page, nested under the gallery's reserved route. */
export const galleryThemeRoute = (themeId: string): string =>
  `${FEATURE_PAGE_ROUTES[FeaturePagesEnum.GALLERY]}/${themeId}`;

/** The design settings the browsing views render with, defaults resolved. */
export interface GalleryDisplaySettings {
  captionPosition: GalleryCaptionPosition;
  displayMode: GalleryDisplayMode;
  /** Per-item width cap in % of the screen width; undefined = the mode's natural width. */
  itemMaxWidthPercent?: number;
  /** Shadow elevation of the image tiles (MUI scale); undefined/0 = flat. */
  itemElevation?: number;
  /** Solid border around the image tiles; undefined/false = none. */
  itemBorder?: boolean;
  /** Border color; empty/undefined = the theme's primary color. */
  itemBorderColor?: string;
  /** Tile corner radius in px; undefined = {@link DEFAULT_GALLERY_ITEM_CORNER_RADIUS}. */
  itemCornerRadius?: number;
}

export const galleryDisplaySettings = (gallery: GalleryConfig | undefined): GalleryDisplaySettings => ({
  captionPosition: gallery?.design?.captionPosition ?? DEFAULT_GALLERY_CAPTION_POSITION,
  displayMode: gallery?.design?.displayMode ?? DEFAULT_GALLERY_DISPLAY_MODE,
  itemMaxWidthPercent: gallery?.design?.itemMaxWidthPercent,
  itemElevation: gallery?.design?.itemElevation,
  itemBorder: gallery?.design?.itemBorder,
  itemBorderColor: gallery?.design?.itemBorderColor,
  itemCornerRadius: gallery?.design?.itemCornerRadius,
});

/** The frame options `itemFrameSx` consumes — the design's tile "chrome". */
export type GalleryItemFrame = Pick<
  GalleryDisplaySettings,
  'itemElevation' | 'itemBorder' | 'itemBorderColor' | 'itemCornerRadius'
>;

/**
 * The sx fragment framing each item's image tile per the design, identical in
 * every display mode (numeric `boxShadow` maps to the MUI elevation scale, and
 * an empty border color falls back to the theme's primary). The admin preview
 * reuses it so the skeleton mirrors the real chrome.
 */
export const itemFrameSx = (frame: GalleryItemFrame): Record<string, unknown> => ({
  borderRadius: `${frame.itemCornerRadius ?? DEFAULT_GALLERY_ITEM_CORNER_RADIUS}px`,
  ...(frame.itemElevation ? { boxShadow: frame.itemElevation } : {}),
  ...(frame.itemBorder
    ? { border: '2px solid', borderColor: frame.itemBorderColor?.trim() || 'primary.main' }
    : {}),
});

/**
 * The sx fragment applying the design's per-item width cap: `<percent>vw` of
 * the viewport, on LANDSCAPE screens only (height smaller than width — the
 * design rule; portrait keeps the mode's natural width). Empty without a cap.
 * `mx: auto` keeps a capped tile centered inside plain-block wrappers.
 */
export const itemWidthCapSx = (itemMaxWidthPercent: number | undefined): Record<string, unknown> =>
  itemMaxWidthPercent
    ? {
        mx: 'auto',
        '@media (orientation: landscape)': { maxWidth: `min(100%, ${itemMaxWidthPercent}vw)` },
      }
    : {};

/**
 * Default value of the gallery page heading / nav label (`gallery.menuTitle`):
 * the menu entry's custom title when one is set, else the feature default —
 * the same fallback chain the nav renders.
 */
export const galleryPageTitle = (config: SiteConfig): string => {
  for (const entry of config.menu?.entries ?? []) {
    if (entry.type === 'feature' && entry.feature === FeaturePagesEnum.GALLERY) return featureEntryLabel(entry);
    if (entry.type === 'group') {
      const child = entry.children.find((c) => c.type === 'feature' && c.feature === FeaturePagesEnum.GALLERY);
      if (child?.type === 'feature') return featureEntryLabel(child);
    }
  }
  return FEATURE_PAGE_DEFAULT_LABELS[FeaturePagesEnum.GALLERY];
};
