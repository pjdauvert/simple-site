import {
  ALL_FEATURE_PAGE_IDS,
  FEATURE_PAGE_ROUTES,
  featureEntryLabel,
  groupTitleKey,
  menuEntryId,
  type FeaturePageId,
  type MenuConfig,
  type MenuEntry,
  type MenuGroupDisplay,
  type MenuItem,
  type MenuLeafEntry,
  type PageConfiguration,
  type SiteConfig,
} from '@simple-site/interfaces';
import type { FeatureFlags } from '../services/featuresService';

/**
 * Feature pages the web app ships (public pages owned by optional features, as
 * opposed to config-driven pages). `pageName` feeds the shared i18n key convention
 * — the nav label key is `${pageName}.menuTitle` (see `menuTitleKey`) — and `flag`
 * names the runtime feature flag that must be on for the page to exist. Labels are
 * config-driven: the menu entry's `menuTitle` (default per feature in
 * `FEATURE_PAGE_DEFAULT_LABELS`), translated via the Translations page.
 *
 * Adding a feature page (contact, gallery, events…): extend `FeaturePagesEnum` +
 * `FEATURE_PAGE_ROUTES` + `FEATURE_PAGE_DEFAULT_LABELS` in `@simple-site/interfaces`,
 * then register it here.
 */
export interface FeaturePageDefinition {
  route: string;
  pageName: string;
  flag: keyof FeatureFlags;
}

export const FEATURE_PAGE_REGISTRY: Partial<Record<FeaturePageId, FeaturePageDefinition>> = {
  team: {
    route: FEATURE_PAGE_ROUTES.team,
    pageName: 'team', // nav label i18n key: `team.menuTitle`
    flag: 'team',
  },
  contact: {
    route: FEATURE_PAGE_ROUTES.contact,
    pageName: 'contact', // nav label i18n key: `contact.menuTitle`
    flag: 'contact',
  },
};

/** The feature pages this app version can render whose flag is currently on. */
export const enabledFeaturePages = (flags: FeatureFlags): FeaturePageId[] =>
  ALL_FEATURE_PAGE_IDS.filter((id) => {
    const definition = FEATURE_PAGE_REGISTRY[id];
    return Boolean(definition && flags[definition.flag]);
  });

/**
 * A resolved top-level nav node. `group` nodes are origin-agnostic: today they
 * come from `group` menu entries, and a future feature can produce one from its
 * own data (e.g. the gallery's themes) without the nav rendering changing —
 * `MenuBar` only ever reads `NavNode`s.
 */
export interface NavGroup {
  kind: 'group';
  id: string;
  /** Translation default for the group label; per-language values live under `i18nKey`. */
  menuTitle: string;
  i18nKey: string;
  /** Mobile: render as an always-open section header instead of an accordion. */
  alwaysExpanded: boolean;
  items: MenuItem[];
}

export type NavNode = { kind: 'item'; item: MenuItem } | NavGroup;

/** The menu-wide desktop rendering mode for group nodes (absent → popover). */
export const resolveGroupDisplay = (config: SiteConfig): MenuGroupDisplay =>
  config.menu?.groupDisplay ?? 'popover';

/**
 * Resolves one leaf entry into a nav item, or null when it must not render:
 * hidden, referencing an unknown page, or a feature that is unregistered or
 * flag-off.
 */
const resolveLeaf = (
  entry: MenuLeafEntry,
  pagesByName: ReadonlyMap<string, PageConfiguration>,
  flags: FeatureFlags,
): MenuItem | null => {
  if (!entry.visible) return null;
  if (entry.type === 'page') {
    const page = pagesByName.get(entry.pageName);
    return page ? { menuTitle: entry.menuTitle ?? page.menuTitle, pageName: page.pageName, route: page.route } : null;
  }
  const definition = FEATURE_PAGE_REGISTRY[entry.feature];
  if (definition && flags[definition.flag]) {
    return { menuTitle: featureEntryLabel(entry), pageName: definition.pageName, route: definition.route };
  }
  return null;
};

/**
 * Resolves the stored menu into the nav tree rendered by the menu bars. When the
 * config has no `menu` (older configs), the nav derives from the pages array
 * order. Leaf entries resolve via `resolveLeaf`; a hidden group drops its whole
 * subtree, and a group whose children all resolve away is omitted (it stays in
 * the config — deleting it is an admin decision).
 */
export const resolveNavTree = (config: SiteConfig, flags: FeatureFlags): NavNode[] => {
  if (!config.menu) {
    return config.pages.map(({ pageName, route, menuTitle }) => ({ kind: 'item', item: { menuTitle, pageName, route } }));
  }
  const pagesByName = new Map(config.pages.map((page) => [page.pageName, page]));
  const nodes: NavNode[] = [];
  for (const entry of config.menu.entries) {
    if (entry.type === 'group') {
      if (!entry.visible) continue;
      const items = entry.children
        .map((child) => resolveLeaf(child, pagesByName, flags))
        .filter((item): item is MenuItem => item !== null);
      if (items.length === 0) continue;
      nodes.push({
        kind: 'group',
        id: entry.groupId,
        menuTitle: entry.menuTitle,
        i18nKey: groupTitleKey(entry.groupId),
        alwaysExpanded: entry.alwaysExpanded ?? false,
        items,
      });
    } else {
      const item = resolveLeaf(entry, pagesByName, flags);
      if (item) nodes.push({ kind: 'item', item });
    }
  }
  return nodes;
};

/**
 * Reconciles a stored menu against the current pages and enabled feature pages:
 * - no menu yet → seed page entries from the pages order (visible);
 * - prune page entries whose page no longer exists (a rename is a prune + re-append)
 *   at the top level and inside groups alike;
 * - keep groups even when all their children prune away (deleting is an admin call);
 * - append entries for new pages (visible) in pages order, at the top level only;
 * - append entries for newly-enabled features (hidden, until an admin opts them in);
 * - KEEP entries of currently-disabled features so flag flips don't lose ordering.
 * Ids are deduped first-occurrence-wins across one global space (top level and
 * every group's children combined), matching the schema's integrity rule.
 * Menu-level settings (e.g. `groupDisplay`) are carried through untouched.
 * Client-side consistency only — the server enforces menu integrity via the schema.
 */
export const reconcileMenu = (
  menu: MenuConfig | undefined,
  pages: ReadonlyArray<{ pageName: string }>,
  enabledFeatures: readonly FeaturePageId[],
): MenuConfig => {
  const pageNames = new Set(pages.map((page) => page.pageName));
  const entries: MenuEntry[] = [];
  const present = new Set<string>();

  const keepLeaf = (entry: MenuLeafEntry): boolean => {
    const id = menuEntryId(entry);
    if (present.has(id)) return false; // defensive dedupe — first occurrence wins
    if (entry.type === 'page' && !pageNames.has(entry.pageName)) return false;
    present.add(id);
    return true;
  };

  for (const entry of menu?.entries ?? []) {
    if (entry.type === 'group') {
      const id = menuEntryId(entry);
      if (present.has(id)) continue;
      present.add(id);
      entries.push({ ...entry, children: entry.children.filter(keepLeaf) });
    } else if (keepLeaf(entry)) {
      entries.push(entry);
    }
  }

  for (const page of pages) {
    if (present.has(`page:${page.pageName}`)) continue;
    present.add(`page:${page.pageName}`);
    entries.push({ type: 'page', pageName: page.pageName, visible: true });
  }

  for (const feature of enabledFeatures) {
    if (present.has(`feature:${feature}`)) continue;
    present.add(`feature:${feature}`);
    entries.push({ type: 'feature', feature, visible: false });
  }

  return { ...menu, entries };
};
