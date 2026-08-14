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
  GALLERY_TAG_MAX_LENGTH,
  GALLERY_TAG_PATTERN,
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
import { moveItem } from '../pages/pagesDraft';

/**
 * Pure draft mutations of the Gallery editor (mirrors `menuDraft` for the Menu
 * tab). Every helper returns a new GalleryConfig; the editor state is the
 * single working copy, saved wholesale via `PUT /api/config/gallery`.
 */

export const emptyGallery = (): GalleryConfig => ({ items: [], tags: [] });

/** True when `tag` is usable as a NEW tag id: pattern-valid and not taken. */
export const isValidNewTag = (gallery: GalleryConfig, tag: string): boolean =>
  tag.length > 0 &&
  tag.length <= GALLERY_TAG_MAX_LENGTH &&
  GALLERY_TAG_PATTERN.test(tag) &&
  !gallery.tags.some((existing) => existing.tag === tag);

export const addItem = (gallery: GalleryConfig, item: GalleryItem): GalleryConfig => ({
  ...gallery,
  items: [...gallery.items, item],
});

export const updateItem = (gallery: GalleryConfig, itemIndex: number, item: GalleryItem): GalleryConfig => ({
  ...gallery,
  items: gallery.items.map((existing, index) => (index === itemIndex ? item : existing)),
});

export const removeItem = (gallery: GalleryConfig, itemIndex: number): GalleryConfig => ({
  ...gallery,
  items: gallery.items.filter((_, index) => index !== itemIndex),
});

/** Moves an item by `offset` in the list (positional i18n keys re-map with it). */
export const moveItemInList = (gallery: GalleryConfig, itemIndex: number, offset: number): GalleryConfig => ({
  ...gallery,
  items: moveItem(gallery.items, itemIndex, itemIndex + offset),
});

/**
 * Declares a new tag. The id is IMMUTABLE once created (only the translatable
 * `displayName`/`description` change afterwards, so stored translations never
 * orphan) — an invalid or already-taken id is a no-op, the editor validates
 * before calling. The displayName defaults to the id until the admin names it.
 */
export const addTag = (gallery: GalleryConfig, tag: string, displayName?: string): GalleryConfig => {
  const id = tag.trim();
  if (!isValidNewTag(gallery, id)) return gallery;
  return {
    ...gallery,
    tags: [...gallery.tags, { tag: id, displayName: displayName?.trim() || id }],
  };
};

/** Sets a tag's presentation name — never its id (translations survive). */
export const setTagDisplayName = (gallery: GalleryConfig, tagIndex: number, displayName: string): GalleryConfig => {
  const trimmed = displayName.trim();
  if (!trimmed) return gallery;
  return {
    ...gallery,
    tags: gallery.tags.map((tag, index) => (index === tagIndex ? { ...tag, displayName: trimmed } : tag)),
  };
};

/** Sets a tag's introduction text (markdown); empty clears it. */
export const setTagDescription = (gallery: GalleryConfig, tagIndex: number, description: string): GalleryConfig => ({
  ...gallery,
  tags: gallery.tags.map((tag, index) => {
    if (index !== tagIndex) return tag;
    const next = { ...tag };
    if (description.trim()) next.description = description.trim();
    else delete next.description;
    return next;
  }),
});

/**
 * Deletes a tag AND its references — every item carrying it is untagged from
 * it (the items themselves stay). Menu entries pointing at the tag resolve
 * away from the nav and are pruned on the next menu reconciliation.
 */
export const removeTag = (gallery: GalleryConfig, tagIndex: number): GalleryConfig => {
  const removed = gallery.tags[tagIndex];
  if (!removed) return gallery;
  return {
    ...gallery,
    tags: gallery.tags.filter((_, index) => index !== tagIndex),
    items: gallery.items.map((item) =>
      (item.tags ?? []).includes(removed.tag)
        ? { ...item, tags: (item.tags ?? []).filter((tag) => tag !== removed.tag) }
        : item,
    ),
  };
};

/** Toggles `tag` on the item at `itemIndex` (declared-tag order is kept stable). */
export const setItemTagged = (
  gallery: GalleryConfig,
  itemIndex: number,
  tag: string,
  tagged: boolean,
): GalleryConfig => {
  const item = gallery.items[itemIndex];
  if (!item || !gallery.tags.some((declared) => declared.tag === tag)) return gallery;
  const itemTags = item.tags ?? []; // tolerant — stored configs may predate `tags`
  if (tagged === itemTags.includes(tag)) return gallery;
  const tags = tagged
    ? gallery.tags.map((declared) => declared.tag).filter((declared) => declared === tag || itemTags.includes(declared))
    : itemTags.filter((existing) => existing !== tag);
  return updateItem(gallery, itemIndex, { ...item, tags });
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
