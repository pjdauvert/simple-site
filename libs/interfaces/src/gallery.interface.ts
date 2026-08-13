import { z } from 'zod';
import { GROUP_ID_PATTERN } from './menu.interface.js';
import type { I18nEntry } from './sections/section.interface.js';

/**
 * Gallery — images from the media library organised by themes, stored INSIDE the
 * site config under the optional `gallery` attribute (draft → publish lifecycle,
 * unlike the team/contact blobs). The whole surface — config interpretation, the
 * public /gallery routes, the menu entry and the admin editor — is gated by the
 * FEATURE_GALLERY flag.
 *
 * Themes follow the menu-group submenu model (one level deep by construction:
 * a theme holds items, never another theme): `themeId` is a single camelCase
 * i18n-key segment derived from the title at creation and immutable afterwards,
 * so renaming a theme never orphans its stored translations, and the public nav
 * can expose the themes as the gallery entry's submenu.
 */

/** Where an item's caption (title + subtitle) sits relative to the image — `list` mode only. */
export const GALLERY_CAPTION_POSITIONS = ['above', 'below', 'left', 'right'] as const;
export const GalleryCaptionPositionSchema = z.enum(GALLERY_CAPTION_POSITIONS);
export type GalleryCaptionPosition = z.infer<typeof GalleryCaptionPositionSchema>;

/** Caption position when the design does not set one. */
export const DEFAULT_GALLERY_CAPTION_POSITION: GalleryCaptionPosition = 'below';

/**
 * How a list of items is browsed: a centered vertical `list` (default), a
 * `grid` of cards, a `mosaic` — masonry columns of natural-height tiles — or
 * `alternate` — full-width rows whose image/caption sides flip on every row,
 * like the team page's alternating layout. `captionPosition` applies to `list`
 * only: `grid` always captions below the image, `mosaic` shows no caption at
 * all (the zoom view keeps title/subtitle), and `alternate`'s alternation
 * places the caption itself.
 */
export const GALLERY_DISPLAY_MODES = ['list', 'grid', 'mosaic', 'alternate'] as const;
export const GalleryDisplayModeSchema = z.enum(GALLERY_DISPLAY_MODES);
export type GalleryDisplayMode = z.infer<typeof GalleryDisplayModeSchema>;

/** Display mode when the design does not set one. */
export const DEFAULT_GALLERY_DISPLAY_MODE: GalleryDisplayMode = 'list';

/** Bounds of the optional per-item width cap (% of the screen width). */
export const GALLERY_ITEM_MAX_WIDTH_PERCENT_MIN = 10;
export const GALLERY_ITEM_MAX_WIDTH_PERCENT_MAX = 100;

/**
 * Desktop column count of the tiled modes (`grid` and `mosaic`). Narrow
 * screens always collapse (1 column on phones, 2 from `sm`), so this is the
 * wide-screen setting only.
 */
export const GALLERY_ITEM_COLUMNS_MIN = 2;
export const GALLERY_ITEM_COLUMNS_MAX = 5;
export const DEFAULT_GALLERY_ITEM_COLUMNS = 3;

/**
 * Aspect ratio imposed on the `grid` tiles — the other modes always keep the
 * image's natural ratio. `original` opts out of the constraint entirely.
 */
export const GALLERY_ITEM_ASPECT_RATIOS = ['original', '1:1', '4:3', '3:2', '16:9'] as const;
export const GalleryItemAspectRatioSchema = z.enum(GALLERY_ITEM_ASPECT_RATIOS);
export type GalleryItemAspectRatio = z.infer<typeof GalleryItemAspectRatioSchema>;
export const DEFAULT_GALLERY_ITEM_ASPECT_RATIO: GalleryItemAspectRatio = '4:3';

/** How an image fills its imposed ratio: cropped to fill, or fully visible. */
export const GALLERY_ITEM_FITS = ['cover', 'contain'] as const;
export const GalleryItemFitSchema = z.enum(GALLERY_ITEM_FITS);
export type GalleryItemFit = z.infer<typeof GalleryItemFitSchema>;
export const DEFAULT_GALLERY_ITEM_FIT: GalleryItemFit = 'cover';

/** Gutter between items, applied in every display mode. */
export const GALLERY_ITEM_SPACINGS = ['tight', 'normal', 'airy'] as const;
export const GalleryItemSpacingSchema = z.enum(GALLERY_ITEM_SPACINGS);
export type GalleryItemSpacing = z.infer<typeof GalleryItemSpacingSchema>;
export const DEFAULT_GALLERY_ITEM_SPACING: GalleryItemSpacing = 'normal';

/**
 * Watermark burnt into the PUBLIC image renditions by the media CDN (never
 * stored on the original, never applied to the admin thumbnails). Positions
 * map to the CDN's layer-focus values; the opacity travels in the color's
 * alpha channel, since the layer opacity parameter is not universally
 * available. See `apps/web/src/utils/imagekit.ts`.
 */
export const GALLERY_WATERMARK_POSITIONS = ['bottomRight', 'bottomLeft', 'topRight', 'topLeft', 'center'] as const;
export const GalleryWatermarkPositionSchema = z.enum(GALLERY_WATERMARK_POSITIONS);
export type GalleryWatermarkPosition = z.infer<typeof GalleryWatermarkPositionSchema>;
export const DEFAULT_GALLERY_WATERMARK_POSITION: GalleryWatermarkPosition = 'bottomRight';
export const GALLERY_WATERMARK_TEXT_MAX_LENGTH = 40;
export const DEFAULT_GALLERY_WATERMARK_COLOR = '#FFFFFF';
export const DEFAULT_GALLERY_WATERMARK_OPACITY = 60;
/** Six-digit hex — the CDN needs a bare hex, and the alpha is derived from the opacity. */
export const GALLERY_WATERMARK_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * Bounds/defaults of the item frame options (elevation / border / corners).
 *
 * The elevation steps are the ONLY ones the platform's visual identity
 * defines (its shadow scale fills every other index with `none`), so the
 * editor offers exactly these — any other value would silently render flat.
 */
export const GALLERY_ITEM_ELEVATION_STEPS = [0, 1, 2, 4, 8, 16, 24] as const;
export const GALLERY_ITEM_ELEVATION_MAX = 24;
export const GALLERY_ITEM_CORNER_RADIUS_MAX = 48;
/** Corner radius rendered when the design does not set one (px). */
export const DEFAULT_GALLERY_ITEM_CORNER_RADIUS = 4;

export const GalleryItemSchema = z.object({
  /**
   * Public URL of the image, typically picked from the media library. Optional
   * so a work-in-progress item can be saved — but an item with no image is not
   * rendered publicly at all (list, zoom carousel and theme covers alike).
   */
  imageUrl: z.string().optional(),
  /** Translation DEFAULT — per-language values live under the item's i18n key. */
  title: z.string().min(1),
  /** Optional subtitle, a translation DEFAULT like the title. */
  subtitle: z.string().optional(),
});

export type GalleryItem = z.infer<typeof GalleryItemSchema>;

export const GalleryThemeSchema = z.object({
  /**
   * Single camelCase i18n-key segment (same rule as menu `groupId`), immutable
   * after creation — renames only change `title`, so translations survive.
   * Also the theme's public URL segment: `/gallery/<themeId>`.
   */
  themeId: z.string().regex(GROUP_ID_PATTERN),
  /** The theme's name — a translation DEFAULT (nav submenu label + page heading). */
  title: z.string().min(1),
  /**
   * Optional introduction (markdown) shown under the theme page's heading — a
   * translation DEFAULT, like the title (key: `gallery.theme.<id>.presentation`).
   */
  presentation: z.string().optional(),
  /**
   * Index (in `items`) of the image representing the theme on the gallery
   * index. Absent, out of range or pointing at an item with no image → the
   * first displayable item, as before.
   */
  coverIndex: z.number().int().min(0).optional(),
  items: z.array(GalleryItemSchema).default([]),
});

export type GalleryTheme = z.infer<typeof GalleryThemeSchema>;

export const GalleryDesignSchema = z.object({
  /** Absent → {@link DEFAULT_GALLERY_CAPTION_POSITION}, keeping stored configs minimal. */
  captionPosition: GalleryCaptionPositionSchema.optional(),
  /** Absent → {@link DEFAULT_GALLERY_DISPLAY_MODE}, keeping stored configs minimal. */
  displayMode: GalleryDisplayModeSchema.optional(),
  /**
   * Maximum rendered width of each item's image, as a PERCENTAGE of the screen
   * width (the exact resolution is never known in advance) — caps the
   * clickable image in every display mode, on LANDSCAPE screens only (height
   * smaller than width; portrait keeps the mode's natural width). The zoom
   * view is unaffected. Absent → no cap.
   */
  itemMaxWidthPercent: z
    .number()
    .int()
    .min(GALLERY_ITEM_MAX_WIDTH_PERCENT_MIN)
    .max(GALLERY_ITEM_MAX_WIDTH_PERCENT_MAX)
    .optional(),
  /**
   * Shadow elevation of each item's image tile — one of
   * {@link GALLERY_ITEM_ELEVATION_STEPS}. Absent/0 → flat.
   */
  itemElevation: z
    .number()
    .int()
    .min(0)
    .max(GALLERY_ITEM_ELEVATION_MAX)
    .refine((value) => (GALLERY_ITEM_ELEVATION_STEPS as readonly number[]).includes(value), {
      message: 'Unsupported elevation step',
    })
    .optional(),
  /**
   * Desktop column count of the tiled modes (`grid`, `mosaic`) — narrow
   * screens always collapse. Absent → {@link DEFAULT_GALLERY_ITEM_COLUMNS}.
   */
  itemColumns: z.number().int().min(GALLERY_ITEM_COLUMNS_MIN).max(GALLERY_ITEM_COLUMNS_MAX).optional(),
  /** Ratio imposed on the `grid` tiles. Absent → {@link DEFAULT_GALLERY_ITEM_ASPECT_RATIO}. */
  itemAspectRatio: GalleryItemAspectRatioSchema.optional(),
  /** How the image fills an imposed ratio. Absent → {@link DEFAULT_GALLERY_ITEM_FIT}. */
  itemFit: GalleryItemFitSchema.optional(),
  /** Gutter between items in every mode. Absent → {@link DEFAULT_GALLERY_ITEM_SPACING}. */
  itemSpacing: GalleryItemSpacingSchema.optional(),
  /** Watermark text burnt into the public renditions; absent/empty → none. */
  watermarkText: z.string().trim().max(GALLERY_WATERMARK_TEXT_MAX_LENGTH).optional(),
  /** Absent → {@link DEFAULT_GALLERY_WATERMARK_POSITION}. */
  watermarkPosition: GalleryWatermarkPositionSchema.optional(),
  /** Six-digit hex; absent → {@link DEFAULT_GALLERY_WATERMARK_COLOR}. */
  watermarkColor: z.string().regex(GALLERY_WATERMARK_COLOR_PATTERN).optional(),
  /** Percent (10–100); absent → {@link DEFAULT_GALLERY_WATERMARK_OPACITY}. */
  watermarkOpacity: z.number().int().min(10).max(100).optional(),
  /** Solid border around each item's image tile. Absent/false → none. */
  itemBorder: z.boolean().optional(),
  /** Border color (any CSS color); empty/absent → the theme's primary color. */
  itemBorderColor: z.string().max(64).optional(),
  /**
   * Corner radius of the image tiles, px (0–48; 0 = sharp corners). Absent →
   * {@link DEFAULT_GALLERY_ITEM_CORNER_RADIUS}.
   */
  itemCornerRadius: z.number().int().min(0).max(GALLERY_ITEM_CORNER_RADIUS_MAX).optional(),
});

export type GalleryDesign = z.infer<typeof GalleryDesignSchema>;

export const GalleryConfigSchema = z
  .object({
    /** Unthemed items, explored directly from the gallery root page. */
    items: z.array(GalleryItemSchema).default([]),
    /** Themes, each explored at `/gallery/<themeId>` (depth 1 by construction). */
    themes: z.array(GalleryThemeSchema).default([]),
    design: GalleryDesignSchema.optional(),
  })
  .superRefine((gallery, ctx) => {
    const seen = new Set<string>();
    gallery.themes.forEach((theme, index) => {
      if (seen.has(theme.themeId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate gallery theme "${theme.themeId}"`,
          path: ['themes', index, 'themeId'],
        });
      }
      seen.add(theme.themeId);
    });
  });

export type GalleryConfig = z.infer<typeof GalleryConfigSchema>;

// ---------------------------------------------------------------------------
// i18n keys
//
// The gallery lives in the site config, but its keys are collected by a
// dedicated collector (not `collectI18nEntries`) so the Translations editor can
// merge them only while the feature flag is on — mirroring the team/contact
// collectors. Key layout (all camelCase segments):
//  - `gallery.theme.<themeId>.menuTitle`          theme name (nav submenu label
//    + theme page heading — the `theme.` namespace keeps a themeId from ever
//    colliding with the root `gallery.items.*` keys or `gallery.menuTitle`)
//  - `gallery.theme.<themeId>.presentation`       theme introduction (markdown)
//  - `gallery.items.<i>.title|subtitle`           unthemed items
//  - `gallery.theme.<themeId>.items.<i>.title|subtitle`  themed items
// The gallery menu entry's own label is the feature key `gallery.menuTitle`,
// handled by the menu collector like every feature entry.
// ---------------------------------------------------------------------------

/** i18n scope of the gallery root's own items. */
export const GALLERY_SCOPE = 'gallery';

/** i18n scope of a theme (`gallery.theme.<themeId>`) — also the nav item's `pageName`. */
export const galleryThemeScope = (themeId: string): string => `${GALLERY_SCOPE}.theme.${themeId}`;

/** i18n key of a theme's name (rendered by the nav via `menuTitleKey(scope)`). */
export const galleryThemeTitleKey = (themeId: string): string => `${galleryThemeScope(themeId)}.menuTitle`;

/** i18n key of a theme's introduction text (markdown). */
export const galleryThemePresentationKey = (themeId: string): string =>
  `${galleryThemeScope(themeId)}.presentation`;

/** i18n key of an item field; `scope` is {@link GALLERY_SCOPE} or a theme scope. */
export const galleryItemKey = (scope: string, index: number, field: 'title' | 'subtitle'): string =>
  `${scope}.items.${index}.${field}`;

/**
 * Translatable (key → default value) pairs the gallery references. Merged into
 * the Translations editor's expected keys while FEATURE_GALLERY is on —
 * item keys are positional (like section content keys), so reordering items
 * re-maps translations by position.
 */
export const collectGalleryI18nEntries = (gallery: GalleryConfig): I18nEntry[] => {
  const entries: I18nEntry[] = [];
  const add = (key: string, value: string | undefined): void => {
    if (value?.trim()) entries.push({ key, defaultValue: value });
  };
  const addItems = (scope: string, items: GalleryItem[]): void => {
    items.forEach((item, index) => {
      add(galleryItemKey(scope, index, 'title'), item.title);
      add(galleryItemKey(scope, index, 'subtitle'), item.subtitle);
    });
  };
  addItems(GALLERY_SCOPE, gallery.items);
  for (const theme of gallery.themes) {
    add(galleryThemeTitleKey(theme.themeId), theme.title);
    add(galleryThemePresentationKey(theme.themeId), theme.presentation);
    addItems(galleryThemeScope(theme.themeId), theme.items);
  }
  return entries;
};
