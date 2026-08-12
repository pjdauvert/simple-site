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

/** Where an item's caption (title + subtitle) sits relative to the image. */
export const GALLERY_CAPTION_POSITIONS = ['above', 'below', 'left', 'right'] as const;
export const GalleryCaptionPositionSchema = z.enum(GALLERY_CAPTION_POSITIONS);
export type GalleryCaptionPosition = z.infer<typeof GalleryCaptionPositionSchema>;

/** Caption position when the design does not set one. */
export const DEFAULT_GALLERY_CAPTION_POSITION: GalleryCaptionPosition = 'below';

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
  items: z.array(GalleryItemSchema).default([]),
});

export type GalleryTheme = z.infer<typeof GalleryThemeSchema>;

export const GalleryDesignSchema = z.object({
  /** Absent → {@link DEFAULT_GALLERY_CAPTION_POSITION}, keeping stored configs minimal. */
  captionPosition: GalleryCaptionPositionSchema.optional(),
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
    addItems(galleryThemeScope(theme.themeId), theme.items);
  }
  return entries;
};
