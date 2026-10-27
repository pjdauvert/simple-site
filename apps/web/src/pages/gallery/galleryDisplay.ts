import {
  DEFAULT_GALLERY_CAPTION_POSITION,
  DEFAULT_GALLERY_DISPLAY_MODE,
  DEFAULT_GALLERY_ITEM_ASPECT_RATIO,
  DEFAULT_GALLERY_ITEM_COLUMNS,
  DEFAULT_GALLERY_ITEM_CORNER_RADIUS,
  DEFAULT_GALLERY_ITEM_FIT,
  DEFAULT_GALLERY_ITEM_SPACING,
  DEFAULT_GALLERY_WATERMARK_COLOR,
  DEFAULT_GALLERY_WATERMARK_OPACITY,
  DEFAULT_GALLERY_WATERMARK_POSITION,
  FEATURE_PAGE_ROUTES,
  FeaturePagesEnum,
  featurePageTitle,
  type GalleryCaptionPosition,
  type GalleryConfig,
  type GalleryDisplayMode,
  type GalleryItem,
  type GalleryItemAspectRatio,
  type GalleryItemFit,
  type GalleryItemSpacing,
  type GalleryTag,
  type SiteConfig,
} from '@simple-site/interfaces';
import type { IkWatermark } from '../../utils/imagekit';

/**
 * Display/selection helpers of the public gallery (web-only — the functions
 * never filter gallery items). Central rule: an item whose image is missing is
 * not displayed AT ALL — not in the lists, not in the zoom carousel — and a
 * tag collection with no displayable item disappears from the nav and 404s at
 * its route alike (the tag stays in the config).
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

/** The displayable items carrying `tag`, keeping their config positions. */
export const displayableItemsForTag = (
  gallery: GalleryConfig | undefined,
  tag: string,
): DisplayableGalleryItem[] =>
  // Tolerant read — a stored config may predate the `tags` field.
  displayableItems(gallery?.items).filter(({ item }) => (item.tags ?? []).includes(tag));

/** The declared tags whose collections have something to show (else their page 404s). */
export const displayableTags = (gallery: GalleryConfig | undefined): GalleryTag[] =>
  (gallery?.tags ?? []).filter((tag) => displayableItemsForTag(gallery, tag.tag).length > 0);

/** Public route of a tag's collection page, nested under the gallery's reserved route. */
export const galleryTagRoute = (tag: string): string =>
  `${FEATURE_PAGE_ROUTES[FeaturePagesEnum.GALLERY]}/tag/${tag}`;

/** The design settings the browsing views render with, defaults resolved. */
export interface GalleryDisplaySettings {
  captionPosition: GalleryCaptionPosition;
  displayMode: GalleryDisplayMode;
  /** Whether the browsing lists show titles / subtitles (independent; zoom always does). */
  itemShowTitle: boolean;
  itemShowSubtitle: boolean;
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
  /** Desktop column count of the tiled modes. */
  itemColumns: number;
  /** Ratio imposed on the grid tiles (`original` = the image's own). */
  itemAspectRatio: GalleryItemAspectRatio;
  /** How an image fills an imposed ratio. */
  itemFit: GalleryItemFit;
  /** Gutter between items. */
  itemSpacing: GalleryItemSpacing;
  /** Watermark burnt into the public renditions; undefined = none. */
  watermark?: IkWatermark;
}

/** The gutter each spacing step renders, in MUI spacing units (mobile, desktop). */
export const GALLERY_SPACING_UNITS: Record<GalleryItemSpacing, { xs: number; md: number }> = {
  tight: { xs: 1, md: 1.5 },
  normal: { xs: 2, md: 3 },
  airy: { xs: 4, md: 6 },
};

/** The vertical rhythm of the stacked modes (list/alternate) per spacing step. */
export const GALLERY_STACK_SPACING_UNITS: Record<GalleryItemSpacing, { xs: number; md: number }> = {
  tight: { xs: 3, md: 4 },
  normal: { xs: 6, md: 8 },
  airy: { xs: 9, md: 12 },
};

/**
 * Responsive column track for the tiled modes: narrow screens always collapse
 * (one column on phones, two from `sm`) and only wide ones honour the design's
 * count — so a 5-column gallery never squeezes 5 tiles onto a phone.
 */
export const galleryColumnsSx = (itemColumns: number): { xs: string; sm: string; md: string } => ({
  xs: '1fr',
  sm: 'repeat(2, 1fr)',
  md: `repeat(${itemColumns}, 1fr)`,
});

/** CSS `aspect-ratio` value for an imposed ratio, or undefined for `original`. */
export const galleryAspectRatioValue = (ratio: GalleryItemAspectRatio): string | undefined =>
  ratio === 'original' ? undefined : ratio.replace(':', ' / ');

/** The watermark to burn in, or undefined when the design defines no text. */
const resolveWatermark = (gallery: GalleryConfig | undefined): IkWatermark | undefined => {
  const text = gallery?.design?.watermarkText?.trim();
  if (!text) return undefined;
  return {
    text,
    position: gallery?.design?.watermarkPosition ?? DEFAULT_GALLERY_WATERMARK_POSITION,
    color: gallery?.design?.watermarkColor ?? DEFAULT_GALLERY_WATERMARK_COLOR,
    opacity: gallery?.design?.watermarkOpacity ?? DEFAULT_GALLERY_WATERMARK_OPACITY,
  };
};

export const galleryDisplaySettings = (gallery: GalleryConfig | undefined): GalleryDisplaySettings => ({
  captionPosition: gallery?.design?.captionPosition ?? DEFAULT_GALLERY_CAPTION_POSITION,
  displayMode: gallery?.design?.displayMode ?? DEFAULT_GALLERY_DISPLAY_MODE,
  itemShowTitle: gallery?.design?.itemShowTitle ?? true,
  itemShowSubtitle: gallery?.design?.itemShowSubtitle ?? true,
  itemMaxWidthPercent: gallery?.design?.itemMaxWidthPercent,
  itemElevation: gallery?.design?.itemElevation,
  itemBorder: gallery?.design?.itemBorder,
  itemBorderColor: gallery?.design?.itemBorderColor,
  itemCornerRadius: gallery?.design?.itemCornerRadius,
  itemColumns: gallery?.design?.itemColumns ?? DEFAULT_GALLERY_ITEM_COLUMNS,
  itemAspectRatio: gallery?.design?.itemAspectRatio ?? DEFAULT_GALLERY_ITEM_ASPECT_RATIO,
  itemFit: gallery?.design?.itemFit ?? DEFAULT_GALLERY_ITEM_FIT,
  itemSpacing: gallery?.design?.itemSpacing ?? DEFAULT_GALLERY_ITEM_SPACING,
  watermark: resolveWatermark(gallery),
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

/** Default value of the gallery page heading / nav label (`gallery.menuTitle`). */
export const galleryPageTitle = (config: SiteConfig): string =>
  featurePageTitle(config.menu, FeaturePagesEnum.GALLERY);
