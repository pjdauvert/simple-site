import { z } from "zod";

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
} as const;

export const FeaturePageIdSchema = z.enum([FeaturePagesEnum.TEAM]);
export type FeaturePageId = z.infer<typeof FeaturePageIdSchema>;

/** Every known feature page id, whether or not its feature is enabled. */
export const ALL_FEATURE_PAGE_IDS: readonly FeaturePageId[] = Object.values(FeaturePagesEnum);

/** Public routes owned by feature pages. Reserved: config pages may not use them. */
export const FEATURE_PAGE_ROUTES: Record<FeaturePageId, string> = {
  [FeaturePagesEnum.TEAM]: '/team',
};

/**
 * Default nav label per feature page — used when a menu entry has no custom
 * `menuTitle` yet, and as the default value of the `${feature}.menuTitle`
 * translation key (see `collectI18nEntries`).
 */
export const FEATURE_PAGE_DEFAULT_LABELS: Record<FeaturePageId, string> = {
  [FeaturePagesEnum.TEAM]: 'Team',
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
// ---------------------------------------------------------------------------

export const MenuEntrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("page"), pageName: z.string(), visible: z.boolean(), menuTitle: z.string().optional() }),
  z.object({ type: z.literal("feature"), feature: FeaturePageIdSchema, visible: z.boolean(), menuTitle: z.string().optional() }),
]);

export type MenuEntry = z.infer<typeof MenuEntrySchema>;

/** The nav label a feature entry renders: its custom title, else the feature default. */
export const featureEntryLabel = (entry: Extract<MenuEntry, { type: "feature" }>): string =>
  entry.menuTitle ?? FEATURE_PAGE_DEFAULT_LABELS[entry.feature];

export const MenuConfigSchema = z.object({
  entries: z.array(MenuEntrySchema),
});

export type MenuConfig = z.infer<typeof MenuConfigSchema>;

/** Stable identity of a menu entry, used for dedupe and reconciliation. */
export const menuEntryId = (entry: MenuEntry): string =>
  entry.type === "page" ? `page:${entry.pageName}` : `feature:${entry.feature}`;

/**
 * Reconciles a stored menu against the current pages and enabled feature pages:
 * - no menu yet → seed page entries from the pages order (visible);
 * - prune page entries whose page no longer exists (a rename is a prune + re-append);
 * - append entries for new pages (visible) in pages order;
 * - append entries for newly-enabled features (hidden, until an admin opts them in);
 * - KEEP entries of currently-disabled features so flag flips don't lose ordering.
 */
export const reconcileMenu = (
  menu: MenuConfig | undefined,
  pages: ReadonlyArray<{ pageName: string }>,
  enabledFeatures: readonly FeaturePageId[],
): MenuConfig => {
  const pageNames = new Set(pages.map((page) => page.pageName));
  const entries: MenuEntry[] = [];
  const present = new Set<string>();

  for (const entry of menu?.entries ?? []) {
    const id = menuEntryId(entry);
    if (present.has(id)) continue; // defensive dedupe — first occurrence wins
    if (entry.type === "page" && !pageNames.has(entry.pageName)) continue;
    present.add(id);
    entries.push(entry);
  }

  for (const page of pages) {
    if (present.has(`page:${page.pageName}`)) continue;
    present.add(`page:${page.pageName}`);
    entries.push({ type: "page", pageName: page.pageName, visible: true });
  }

  for (const feature of enabledFeatures) {
    if (present.has(`feature:${feature}`)) continue;
    present.add(`feature:${feature}`);
    entries.push({ type: "feature", feature, visible: false });
  }

  return { entries };
};
