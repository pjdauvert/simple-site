import { z } from 'zod';
import type { I18nEntry } from './sections/section.interface.js';

/**
 * Gallery — images from the media library organised by TAGS, stored INSIDE the
 * site config under the optional `gallery` attribute (draft → publish lifecycle,
 * unlike the team/contact blobs). The whole surface — config interpretation, the
 * public /gallery routes, the menu entries and the admin editor — is gated by
 * the FEATURE_GALLERY flag.
 *
 * Tags have their own lifecycle, managed on the gallery admin page: created
 * with an immutable id (only its translatable `displayName`/`description`
 * change afterwards, so stored translations never orphan), referenced by any
 * number of items (an item carries one or several tags), and deleted with
 * their references — removing a tag strips it from every item. A "theme" is
 * simply the collection of items carrying a tag, browsed publicly at
 * `/gallery/tag/<tag>`. Nothing is added to the navigation automatically: the
 * admin links tag collections from the menu explicitly (menu entries of type
 * `galleryTag`, see `menu.interface.ts`).
 */

/**
 * Tag ids: plain unaccented alphanumerics plus `-` and `_`, immutable once
 * created. The id doubles as the collection's URL segment
 * (`/gallery/tag/<tag>`) and as an i18n-key segment (`gallery.tag.<tag>.*`).
 */
export const GALLERY_TAG_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const GALLERY_TAG_MAX_LENGTH = 64;

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
   * rendered publicly at all (lists, tag collections and zoom carousel alike).
   */
  imageUrl: z.string().optional(),
  /** Translation DEFAULT — per-language values live under the item's i18n key. */
  title: z.string().min(1),
  /** Optional subtitle, a translation DEFAULT like the title. */
  subtitle: z.string().optional(),
  /**
   * The tags this item carries — references into the gallery's declared
   * `tags` (schema-enforced). Deleting a tag deletes these references with it.
   */
  tags: z.array(z.string()).default([]),
});

export type GalleryItem = z.infer<typeof GalleryItemSchema>;

export const GalleryTagSchema = z.object({
  /** The immutable id — see {@link GALLERY_TAG_PATTERN}. */
  tag: z.string().min(1).max(GALLERY_TAG_MAX_LENGTH).regex(GALLERY_TAG_PATTERN),
  /**
   * The tag's presentation name — a translation DEFAULT (menu label + the tag
   * collection page's heading; key: `gallery.tag.<tag>.menuTitle`, following
   * the nav's `<pageName>.menuTitle` label convention).
   */
  displayName: z.string().min(1),
  /**
   * Optional introduction (markdown) shown under the collection page's
   * heading — a translation DEFAULT (key: `gallery.tag.<tag>.description`).
   */
  description: z.string().optional(),
});

export type GalleryTag = z.infer<typeof GalleryTagSchema>;

export const GalleryDesignSchema = z.object({
  /** Absent → {@link DEFAULT_GALLERY_CAPTION_POSITION}, keeping stored configs minimal. */
  captionPosition: GalleryCaptionPositionSchema.optional(),
  /** Absent → {@link DEFAULT_GALLERY_DISPLAY_MODE}, keeping stored configs minimal. */
  displayMode: GalleryDisplayModeSchema.optional(),
  /**
   * Whether the browsing lists show each item's title / subtitle —
   * INDEPENDENT toggles, applying to the captioned modes (`list`, `grid`,
   * `alternate`; `mosaic` never captions). Absent → shown (only `false` is
   * stored). The zoom view always keeps title and subtitle.
   */
  itemShowTitle: z.boolean().optional(),
  itemShowSubtitle: z.boolean().optional(),
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
    /** Every gallery item, in display order — the root page browses them all. */
    items: z.array(GalleryItemSchema).default([]),
    /** The declared tags; each collection is explored at `/gallery/tag/<tag>`. */
    tags: z.array(GalleryTagSchema).default([]),
    design: GalleryDesignSchema.optional(),
  })
  .superRefine((gallery, ctx) => {
    const declared = new Set<string>();
    gallery.tags.forEach((tag, index) => {
      if (declared.has(tag.tag)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate gallery tag "${tag.tag}"`,
          path: ['tags', index, 'tag'],
        });
      }
      declared.add(tag.tag);
    });
    // Tag references are cascade-deleted with their tag — a dangling reference
    // is a client bug, rejected rather than silently ignored.
    gallery.items.forEach((item, itemIndex) => {
      item.tags.forEach((ref, refIndex) => {
        if (!declared.has(ref)) {
          ctx.addIssue({
            code: 'custom',
            message: `Unknown gallery tag "${ref}"`,
            path: ['items', itemIndex, 'tags', refIndex],
          });
        }
      });
    });
  });

export type GalleryConfig = z.infer<typeof GalleryConfigSchema>;

// ---------------------------------------------------------------------------
// i18n keys
//
// The gallery lives in the site config, but its keys are collected by a
// dedicated collector (not `collectI18nEntries`) so the Translations editor can
// merge them only while the feature flag is on — mirroring the team/contact
// collectors. Key layout:
//  - `gallery.tag.<tag>.menuTitle`     the tag's displayName (menu label + the
//    collection page heading — `.menuTitle` because the nav renders every
//    item's label under `<pageName>.menuTitle`, and a tag entry's pageName is
//    its scope; the `tag.` namespace keeps a tag from ever colliding with the
//    `gallery.items.*` keys or `gallery.menuTitle`)
//  - `gallery.tag.<tag>.description`   the tag's introduction (markdown)
//  - `gallery.items.<i>.title|subtitle`  items (one flat list — positional)
// A tag segment may contain `-` (see GALLERY_TAG_PATTERN); the translation
// dictionary's key charset allows it. The gallery menu entry's own label is
// the feature key `gallery.menuTitle`, handled like every feature entry.
// ---------------------------------------------------------------------------

/** i18n scope of the gallery's own items. */
export const GALLERY_SCOPE = 'gallery';

/**
 * Scope of the submenu's "all items" link (`pageName` of the nav item, label
 * key `gallery.all.menuTitle`) — the same label serves the collection pages'
 * back-to-everything link. A translation DEFAULT like every nav label,
 * collected while the flag is on.
 */
export const GALLERY_ALL_SCOPE = `${GALLERY_SCOPE}.all`;
export const GALLERY_ALL_NAME_KEY = `${GALLERY_ALL_SCOPE}.menuTitle`;
export const DEFAULT_GALLERY_ALL_LABEL = 'All items';

/** i18n scope of a tag (`gallery.tag.<tag>`) — also the nav item's `pageName`. */
export const galleryTagScope = (tag: string): string => `${GALLERY_SCOPE}.tag.${tag}`;

/** i18n key of a tag's displayName (rendered by the nav via `menuTitleKey(scope)`). */
export const galleryTagNameKey = (tag: string): string => `${galleryTagScope(tag)}.menuTitle`;

/** i18n key of a tag's introduction text (markdown). */
export const galleryTagDescriptionKey = (tag: string): string => `${galleryTagScope(tag)}.description`;

/** i18n key of an item field — positional in the gallery's single item list. */
export const galleryItemKey = (index: number, field: 'title' | 'subtitle'): string =>
  `${GALLERY_SCOPE}.items.${index}.${field}`;

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
  gallery.items.forEach((item, index) => {
    add(galleryItemKey(index, 'title'), item.title);
    add(galleryItemKey(index, 'subtitle'), item.subtitle);
  });
  for (const tag of gallery.tags) {
    add(galleryTagNameKey(tag.tag), tag.displayName);
    add(galleryTagDescriptionKey(tag.tag), tag.description);
  }
  // The "all items" label only matters once a tag exists to contrast with.
  if (gallery.tags.length > 0) add(GALLERY_ALL_NAME_KEY, DEFAULT_GALLERY_ALL_LABEL);
  return entries;
};
