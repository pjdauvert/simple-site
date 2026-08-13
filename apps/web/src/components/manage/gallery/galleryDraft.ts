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
  type GalleryCaptionPosition,
  type GalleryConfig,
  type GalleryDesign,
  type GalleryDisplayMode,
  type GalleryItem,
  type GalleryItemAspectRatio,
  type GalleryItemFit,
  type GalleryItemSpacing,
  type GalleryWatermarkPosition,
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

/**
 * Applies `update` to the list at `themeIndex`, returning a new gallery.
 * `mapCover` rewrites the theme's `coverIndex` alongside, so a cover pick
 * follows its image through reorders and never points at the wrong shot after
 * a deletion (undefined = the pick is dropped, falling back to the first
 * displayable item).
 */
const withItems = (
  gallery: GalleryConfig,
  themeIndex: number | null,
  update: (items: GalleryItem[]) => GalleryItem[],
  mapCover: (coverIndex: number) => number | undefined = (coverIndex) => coverIndex,
): GalleryConfig => {
  if (themeIndex === null) return { ...gallery, items: update(gallery.items) };
  if (!gallery.themes[themeIndex]) return gallery;
  return {
    ...gallery,
    themes: gallery.themes.map((theme, index) => {
      if (index !== themeIndex) return theme;
      const next = { ...theme, items: update(theme.items) };
      const cover = theme.coverIndex === undefined ? undefined : mapCover(theme.coverIndex);
      if (cover === undefined) delete next.coverIndex;
      else next.coverIndex = cover;
      return next;
    }),
  };
};

export const addItem = (gallery: GalleryConfig, themeIndex: number | null, item: GalleryItem): GalleryConfig =>
  withItems(gallery, themeIndex, (items) => [...items, item]);

export const updateItem = (gallery: GalleryConfig, path: GalleryItemPath, item: GalleryItem): GalleryConfig =>
  withItems(gallery, path.themeIndex, (items) =>
    items.map((existing, index) => (index === path.itemIndex ? item : existing)),
  );

export const removeItem = (gallery: GalleryConfig, path: GalleryItemPath): GalleryConfig =>
  withItems(
    gallery,
    path.themeIndex,
    (items) => items.filter((_, index) => index !== path.itemIndex),
    // The cover image itself is gone → drop the pick; later items shift down.
    (cover) => (cover === path.itemIndex ? undefined : cover > path.itemIndex ? cover - 1 : cover),
  );

/** Moves an item by `offset` within its own list. */
export const moveItemInList = (gallery: GalleryConfig, path: GalleryItemPath, offset: number): GalleryConfig => {
  const from = path.itemIndex;
  const to = from + offset;
  return withItems(
    gallery,
    path.themeIndex,
    (items) => moveItem(items, from, to),
    (cover) => {
      const items = itemsAt(gallery, path.themeIndex);
      if (to < 0 || to >= items.length) return cover; // no-op move
      if (cover === from) return to;
      if (from < cover && cover <= to) return cover - 1;
      if (to <= cover && cover < from) return cover + 1;
      return cover;
    },
  );
};

/** Marks the item at `path` as its theme's cover (root items have no cover). */
export const setThemeCover = (gallery: GalleryConfig, path: GalleryItemPath): GalleryConfig => {
  if (path.themeIndex === null || !gallery.themes[path.themeIndex]) return gallery;
  return {
    ...gallery,
    themes: gallery.themes.map((theme, index) =>
      index === path.themeIndex ? { ...theme, coverIndex: path.itemIndex } : theme,
    ),
  };
};

/** Clears a theme's explicit cover pick (back to "the first displayable item"). */
export const clearThemeCover = (gallery: GalleryConfig, themeIndex: number): GalleryConfig => ({
  ...gallery,
  themes: gallery.themes.map((theme, index) => {
    if (index !== themeIndex) return theme;
    const next = { ...theme };
    delete next.coverIndex;
    return next;
  }),
});

/** Sets a theme's introduction text (markdown); empty clears it. */
export const setThemePresentation = (
  gallery: GalleryConfig,
  themeIndex: number,
  presentation: string,
): GalleryConfig => ({
  ...gallery,
  themes: gallery.themes.map((theme, index) => {
    if (index !== themeIndex) return theme;
    const next = { ...theme };
    if (presentation.trim()) next.presentation = presentation.trim();
    else delete next.presentation;
    return next;
  }),
});

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
  if (design.itemColumns !== undefined && design.itemColumns !== DEFAULT_GALLERY_ITEM_COLUMNS) {
    next.itemColumns = design.itemColumns;
  }
  if (design.itemAspectRatio && design.itemAspectRatio !== DEFAULT_GALLERY_ITEM_ASPECT_RATIO) {
    next.itemAspectRatio = design.itemAspectRatio;
  }
  if (design.itemFit && design.itemFit !== DEFAULT_GALLERY_ITEM_FIT) {
    next.itemFit = design.itemFit;
  }
  if (design.itemSpacing && design.itemSpacing !== DEFAULT_GALLERY_ITEM_SPACING) {
    next.itemSpacing = design.itemSpacing;
  }
  // The watermark's styling only exists while there is text to draw.
  if (design.watermarkText?.trim()) {
    next.watermarkText = design.watermarkText.trim();
    if (design.watermarkPosition && design.watermarkPosition !== DEFAULT_GALLERY_WATERMARK_POSITION) {
      next.watermarkPosition = design.watermarkPosition;
    }
    if (design.watermarkColor && design.watermarkColor.toUpperCase() !== DEFAULT_GALLERY_WATERMARK_COLOR) {
      next.watermarkColor = design.watermarkColor;
    }
    if (design.watermarkOpacity !== undefined && design.watermarkOpacity !== DEFAULT_GALLERY_WATERMARK_OPACITY) {
      next.watermarkOpacity = design.watermarkOpacity;
    }
  }
  // Frame options: flat (0), borderless and the default radius are the
  // defaults — only deviations are stored. The border color only exists
  // while the border itself is on.
  if (design.itemElevation) {
    next.itemElevation = design.itemElevation;
  }
  if (design.itemBorder) {
    next.itemBorder = true;
    if (design.itemBorderColor?.trim()) {
      next.itemBorderColor = design.itemBorderColor.trim();
    }
  }
  if (design.itemCornerRadius !== undefined && design.itemCornerRadius !== DEFAULT_GALLERY_ITEM_CORNER_RADIUS) {
    next.itemCornerRadius = design.itemCornerRadius;
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

/** Sets the tile shadow elevation (MUI scale); 0 collapses back to flat (the default). */
export const setItemElevation = (gallery: GalleryConfig, itemElevation: number): GalleryConfig =>
  withDesign(gallery, { itemElevation });

/** Toggles the tile border; turning it off also drops the stored border color. */
export const setItemBorder = (gallery: GalleryConfig, itemBorder: boolean): GalleryConfig =>
  withDesign(gallery, { itemBorder });

/** Sets the tile border color (empty → theme primary; only stored while the border is on). */
export const setItemBorderColor = (gallery: GalleryConfig, itemBorderColor: string): GalleryConfig =>
  withDesign(gallery, { itemBorderColor });

/** Sets the tile corner radius (px); the default radius collapses to "not stored". */
export const setItemCornerRadius = (gallery: GalleryConfig, itemCornerRadius: number): GalleryConfig =>
  withDesign(gallery, { itemCornerRadius });

/** Sets the desktop column count of the tiled modes. */
export const setItemColumns = (gallery: GalleryConfig, itemColumns: number): GalleryConfig =>
  withDesign(gallery, { itemColumns });

/** Sets the ratio imposed on the grid tiles. */
export const setItemAspectRatio = (gallery: GalleryConfig, itemAspectRatio: GalleryItemAspectRatio): GalleryConfig =>
  withDesign(gallery, { itemAspectRatio });

/** Sets how an image fills an imposed ratio (cropped or fully visible). */
export const setItemFit = (gallery: GalleryConfig, itemFit: GalleryItemFit): GalleryConfig =>
  withDesign(gallery, { itemFit });

/** Sets the gutter between items. */
export const setItemSpacing = (gallery: GalleryConfig, itemSpacing: GalleryItemSpacing): GalleryConfig =>
  withDesign(gallery, { itemSpacing });

/** Sets the watermark; an empty text clears the whole watermark styling with it. */
export const setWatermark = (
  gallery: GalleryConfig,
  watermark: {
    text: string;
    position: GalleryWatermarkPosition;
    color: string;
    opacity: number;
  },
): GalleryConfig =>
  withDesign(gallery, {
    watermarkText: watermark.text,
    watermarkPosition: watermark.position,
    watermarkColor: watermark.color,
    watermarkOpacity: watermark.opacity,
  });
