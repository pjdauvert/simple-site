import {
  DEFAULT_GALLERY_CAPTION_POSITION,
  DEFAULT_GALLERY_DISPLAY_MODE,
  type GalleryCaptionPosition,
  type GalleryConfig,
  type GalleryDesign,
  type GalleryDisplayMode,
  type GalleryItem,
} from '@simple-site/interfaces';
import { generateGroupId } from '../menu/menuDraft';
import { moveItem } from '../pages/pagesDraft';

/**
 * Pure draft mutations of the Gallery editor (mirrors `menuDraft` for the Menu
 * tab). Every helper returns a new GalleryConfig; the editor state is the
 * single working copy, saved wholesale via `PUT /api/config/gallery`.
 */

/** Position of an item: inside a theme (`themeIndex` set) or the root list (null). */
export interface GalleryItemPath {
  themeIndex: number | null;
  itemIndex: number;
}

export const emptyGallery = (): GalleryConfig => ({ items: [], themes: [] });

/** The list an item path points into (root items or a theme's items). */
export const itemsAt = (gallery: GalleryConfig, themeIndex: number | null): GalleryItem[] =>
  themeIndex === null ? gallery.items : (gallery.themes[themeIndex]?.items ?? []);

/** Applies `update` to the list at `themeIndex`, returning a new gallery. */
const withItems = (
  gallery: GalleryConfig,
  themeIndex: number | null,
  update: (items: GalleryItem[]) => GalleryItem[],
): GalleryConfig => {
  if (themeIndex === null) return { ...gallery, items: update(gallery.items) };
  if (!gallery.themes[themeIndex]) return gallery;
  return {
    ...gallery,
    themes: gallery.themes.map((theme, index) =>
      index === themeIndex ? { ...theme, items: update(theme.items) } : theme,
    ),
  };
};

export const addItem = (gallery: GalleryConfig, themeIndex: number | null, item: GalleryItem): GalleryConfig =>
  withItems(gallery, themeIndex, (items) => [...items, item]);

export const updateItem = (gallery: GalleryConfig, path: GalleryItemPath, item: GalleryItem): GalleryConfig =>
  withItems(gallery, path.themeIndex, (items) =>
    items.map((existing, index) => (index === path.itemIndex ? item : existing)),
  );

export const removeItem = (gallery: GalleryConfig, path: GalleryItemPath): GalleryConfig =>
  withItems(gallery, path.themeIndex, (items) => items.filter((_, index) => index !== path.itemIndex));

/** Moves an item by `offset` within its own list. */
export const moveItemInList = (gallery: GalleryConfig, path: GalleryItemPath, offset: number): GalleryConfig =>
  withItems(gallery, path.themeIndex, (items) => moveItem(items, path.itemIndex, path.itemIndex + offset));

/** Moves an item to the end of another list (a theme or the root). */
export const moveItemToList = (
  gallery: GalleryConfig,
  path: GalleryItemPath,
  targetThemeIndex: number | null,
): GalleryConfig => {
  const item = itemsAt(gallery, path.themeIndex)[path.itemIndex];
  if (!item || path.themeIndex === targetThemeIndex) return gallery;
  if (targetThemeIndex !== null && !gallery.themes[targetThemeIndex]) return gallery;
  return addItem(removeItem(gallery, path), targetThemeIndex, item);
};

/** Appends a new empty theme named `title`; the id is derived once and immutable. */
export const addTheme = (gallery: GalleryConfig, title: string): GalleryConfig => {
  const trimmed = title.trim();
  if (!trimmed) return gallery;
  const existing = gallery.themes.map((theme) => theme.themeId);
  return {
    ...gallery,
    themes: [...gallery.themes, { themeId: generateGroupId(trimmed, existing, 'theme'), title: trimmed, items: [] }],
  };
};

/** Renames a theme — only the title changes, never the id (translations survive). */
export const renameTheme = (gallery: GalleryConfig, themeIndex: number, title: string): GalleryConfig => {
  const trimmed = title.trim();
  if (!trimmed) return gallery;
  return {
    ...gallery,
    themes: gallery.themes.map((theme, index) => (index === themeIndex ? { ...theme, title: trimmed } : theme)),
  };
};

export const moveTheme = (gallery: GalleryConfig, themeIndex: number, offset: number): GalleryConfig => ({
  ...gallery,
  themes: moveItem(gallery.themes, themeIndex, themeIndex + offset),
});

/** Deletes a theme, returning its items to the root list (like deleting a menu group). */
export const removeTheme = (gallery: GalleryConfig, themeIndex: number): GalleryConfig => {
  const theme = gallery.themes[themeIndex];
  if (!theme) return gallery;
  return {
    ...gallery,
    items: [...gallery.items, ...theme.items],
    themes: gallery.themes.filter((_, index) => index !== themeIndex),
  };
};

/** Drops defaulted design fields; undefined when nothing deviates (configs stay minimal). */
const normalizeDesign = (design: GalleryDesign): GalleryDesign | undefined => {
  const next: GalleryDesign = {};
  if (design.captionPosition && design.captionPosition !== DEFAULT_GALLERY_CAPTION_POSITION) {
    next.captionPosition = design.captionPosition;
  }
  if (design.displayMode && design.displayMode !== DEFAULT_GALLERY_DISPLAY_MODE) {
    next.displayMode = design.displayMode;
  }
  if (design.itemMaxWidthPercent !== undefined) {
    next.itemMaxWidthPercent = design.itemMaxWidthPercent;
  }
  return Object.keys(next).length > 0 ? next : undefined;
};

const withDesign = (gallery: GalleryConfig, patch: GalleryDesign): GalleryConfig => {
  const design = normalizeDesign({ ...gallery.design, ...patch });
  const next = { ...gallery };
  if (design) next.design = design;
  else delete next.design;
  return next;
};

/** Sets the caption position; defaults are stored as "no design" to keep configs minimal. */
export const setCaptionPosition = (gallery: GalleryConfig, position: GalleryCaptionPosition): GalleryConfig =>
  withDesign(gallery, { captionPosition: position });

/** Sets the display mode (list / grid / mosaic / alternate); defaults collapse like the caption. */
export const setDisplayMode = (gallery: GalleryConfig, displayMode: GalleryDisplayMode): GalleryConfig =>
  withDesign(gallery, { displayMode });

/** Sets the per-item width cap (% of the screen); undefined clears it (no cap — the default). */
export const setItemMaxWidthPercent = (
  gallery: GalleryConfig,
  itemMaxWidthPercent: number | undefined,
): GalleryConfig => withDesign(gallery, { itemMaxWidthPercent });
