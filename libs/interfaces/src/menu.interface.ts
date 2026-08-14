import { z } from "zod";
import { GALLERY_TAG_PATTERN } from "./gallery.interface.js";

// MenuItem schema — the resolved navigation view-model rendered by the menu bars.
export const MenuItemSchema = z.object({
  menuTitle: z.string(),
  pageName: z.string(),
  route: z.string(),
});

export type MenuItem = z.infer<typeof MenuItemSchema>;

// ---------------------------------------------------------------------------
// Feature pages
//
// Public pages shipped by optional features (as opposed to config-driven pages).
// Each feature page owns a fixed public route and can be linked from the menu.
// Extending the menu with a new feature page (contact, gallery, events…) means:
// add it to `FeaturePagesEnum` + `FEATURE_PAGE_ROUTES` here, then register it in
// the web app's feature-page registry (see `router/publicMenu.ts`).
// ---------------------------------------------------------------------------

export const FeaturePagesEnum = {
  TEAM: 'team',
  CONTACT: 'contact',
  GALLERY: 'gallery',
} as const;

export const FeaturePageIdSchema = z.enum([
  FeaturePagesEnum.TEAM,
  FeaturePagesEnum.CONTACT,
  FeaturePagesEnum.GALLERY,
]);
export type FeaturePageId = z.infer<typeof FeaturePageIdSchema>;

/** Every known feature page id, whether or not its feature is enabled. */
export const ALL_FEATURE_PAGE_IDS: readonly FeaturePageId[] = Object.values(FeaturePagesEnum);

/** Public routes owned by feature pages. Reserved: config pages may not use them. */
export const FEATURE_PAGE_ROUTES: Record<FeaturePageId, string> = {
  [FeaturePagesEnum.TEAM]: '/team',
  [FeaturePagesEnum.CONTACT]: '/contact',
  [FeaturePagesEnum.GALLERY]: '/gallery',
};

/**
 * Default nav label per feature page — used when a menu entry has no custom
 * `menuTitle` yet, and as the default value of the `${feature}.menuTitle`
 * translation key (see `collectI18nEntries`).
 */
export const FEATURE_PAGE_DEFAULT_LABELS: Record<FeaturePageId, string> = {
  [FeaturePagesEnum.TEAM]: 'Team',
  [FeaturePagesEnum.CONTACT]: 'Contact',
  [FeaturePagesEnum.GALLERY]: 'Gallery',
};

/** True when `route` is a feature-owned route or nests under one (e.g. `/team/member/x`). */
export const isReservedRoute = (route: string): boolean =>
  Object.values(FEATURE_PAGE_ROUTES).some((reserved) => route === reserved || route.startsWith(`${reserved}/`));

// ---------------------------------------------------------------------------
// Menu configuration
//
// The menu is an ordered list of entries referencing their target — config pages
// by `pageName`, feature pages by id — instead of copying route/label, so page
// renames can never leave a stale copy behind. `visible: false` keeps a page
// reachable at its URL while hiding it from the navigation. When `menu` is absent
// from the site config, the navigation falls back to the pages array order.
//
// `menuTitle` is the entry's editable nav label: for a page entry it is an
// optional override of the page's own title (absent → the page's `menuTitle`);
// for a feature entry it is the label itself (absent → the feature's default).
// Like every config label it is a translation DEFAULT — per-language values are
// managed on the Translations page under the `${pageName|feature}.menuTitle` key.
//
// A `group` entry is a submenu: a non-navigable label whose `children` are
// page/feature entries. Depth is one level by construction — children are
// `MenuLeafEntrySchema`, so a group can never contain a group. Clicking a group
// in the nav opens its children (desktop popover / mobile accordion) instead of
// navigating; a hidden group hides its whole subtree, and a group whose children
// all resolve away is omitted from the nav (but kept in the config). Its label
// is translated under the `menu.${groupId}.menuTitle` key (see `groupTitleKey`).
// ---------------------------------------------------------------------------

const MenuPageEntrySchema = z.object({
  type: z.literal("page"),
  pageName: z.string(),
  visible: z.boolean(),
  menuTitle: z.string().optional(),
});

/**
 * One row of the gallery entry's tag submenu: a reference to a declared tag
 * plus its activation. The Menu tab lists EVERY declared tag here (order =
 * submenu order); reconciliation appends newly created tags deactivated and
 * prunes deleted ones, so the list always mirrors the gallery's tags.
 */
const MenuGalleryTagStateSchema = z.object({
  tag: z.string().regex(GALLERY_TAG_PATTERN),
  visible: z.boolean(),
});

export type MenuGalleryTagState = z.infer<typeof MenuGalleryTagStateSchema>;

const MenuFeatureEntrySchema = z.object({
  type: z.literal("feature"),
  feature: FeaturePageIdSchema,
  visible: z.boolean(),
  menuTitle: z.string().optional(),
  /**
   * GALLERY ENTRY ONLY — the ordered tag submenu. In the public nav, at least
   * one activated tag with a displayable collection turns the entry into a
   * one-level submenu (an "all items" link first, then the active collections);
   * otherwise it stays a plain /gallery link. Meaningless on other features.
   */
  galleryTags: z.array(MenuGalleryTagStateSchema).optional(),
});

/**
 * DEPRECATED — the former standalone tag link, superseded by the gallery
 * entry's `galleryTags` submenu. Still parsed so stored configs keep loading;
 * never rendered, and reconciliation converts it (its activation moves onto
 * the gallery entry's submenu row) before dropping it.
 */
const MenuGalleryTagEntrySchema = z.object({
  type: z.literal("galleryTag"),
  tag: z.string().regex(GALLERY_TAG_PATTERN),
  visible: z.boolean(),
  menuTitle: z.string().optional(),
});

/** Leaf entries — the only things a group may contain (depth 1 is structural). */
export const MenuLeafEntrySchema = z.discriminatedUnion("type", [
  MenuPageEntrySchema,
  MenuFeatureEntrySchema,
  MenuGalleryTagEntrySchema,
]);

export type MenuLeafEntry = z.infer<typeof MenuLeafEntrySchema>;

/**
 * Group ids are a single camelCase i18n-key segment, immutable after creation
 * (renames only change `menuTitle`) so stored translations survive renames.
 */
export const GROUP_ID_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

export const MenuGroupEntrySchema = z.object({
  type: z.literal("group"),
  groupId: z.string().regex(GROUP_ID_PATTERN),
  // The group IS its label (no page/feature to fall back to) — required.
  menuTitle: z.string().min(1),
  visible: z.boolean(),
  // Mobile only: render as an always-open section header instead of an accordion.
  alwaysExpanded: z.boolean().optional(),
  // The gallery entry carries its own tag submenu, and submenus cannot nest
  // (depth 1 is structural) — so it can never join a group.
  children: z.array(MenuLeafEntrySchema).refine(
    (children) => !children.some((child) => child.type === "feature" && child.feature === FeaturePagesEnum.GALLERY),
    { message: "The gallery entry cannot be part of a group" },
  ),
});

export type MenuGroupEntry = z.infer<typeof MenuGroupEntrySchema>;

export const MenuEntrySchema = z.discriminatedUnion("type", [
  MenuPageEntrySchema,
  MenuFeatureEntrySchema,
  MenuGalleryTagEntrySchema,
  MenuGroupEntrySchema,
]);

export type MenuEntry = z.infer<typeof MenuEntrySchema>;

/** The nav label a feature entry renders: its custom title, else the feature default. */
export const featureEntryLabel = (entry: Extract<MenuEntry, { type: "feature" }>): string =>
  entry.menuTitle ?? FEATURE_PAGE_DEFAULT_LABELS[entry.feature];

/**
 * How groups render their children on desktop: an anchored popover (default),
 * or a secondary menu bar sliding out from under the main bar. One menu-wide
 * setting so the navigation stays visually coherent. Mobile always renders
 * the accordion (or the always-expanded section) regardless.
 */
export const MenuGroupDisplaySchema = z.enum(["popover", "bar"]);

export type MenuGroupDisplay = z.infer<typeof MenuGroupDisplaySchema>;

export const MenuConfigSchema = z.object({
  entries: z.array(MenuEntrySchema),
  // Absent = "popover", keeping stored configs minimal and older ones valid.
  groupDisplay: MenuGroupDisplaySchema.optional(),
});

export type MenuConfig = z.infer<typeof MenuConfigSchema>;

/** Stable identity of a menu entry, used for dedupe and reconciliation. */
export const menuEntryId = (entry: MenuEntry): string => {
  switch (entry.type) {
    case "page":
      return `page:${entry.pageName}`;
    case "feature":
      return `feature:${entry.feature}`;
    case "galleryTag":
      return `galleryTag:${entry.tag}`;
    case "group":
      return `group:${entry.groupId}`;
  }
};

