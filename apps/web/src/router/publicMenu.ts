import {
  ALL_FEATURE_PAGE_IDS,
  DEFAULT_GALLERY_ALL_LABEL,
  FEATURE_PAGE_ROUTES,
  FeaturePagesEnum,
  GALLERY_ALL_SCOPE,
  featureEntryLabel,
  galleryTagScope,
  groupTitleKey,
  menuEntryId,
  menuTitleKey,
  type GalleryConfig,
  type FeaturePageId,
  type MenuConfig,
  type MenuEntry,
  type MenuGalleryTagState,
  type MenuGroupDisplay,
  type MenuItem,
  type MenuLeafEntry,
  type PageConfiguration,
  type SiteConfig,
} from '@simple-site/interfaces';
import type { FeatureFlags } from '../services/featuresService';
import { displayableItemsForTag, galleryTagRoute } from '../pages/gallery/galleryDisplay';

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
  gallery: {
    route: FEATURE_PAGE_ROUTES.gallery,
    pageName: 'gallery', // nav label i18n key: `gallery.menuTitle`
    flag: 'gallery',
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
 * hidden, referencing an unknown page, a feature that is unregistered or
 * flag-off, or the deprecated `galleryTag` entry type (superseded by the
 * gallery entry's tag submenu — reconciliation converts and drops it).
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
  if (entry.type === 'galleryTag') return null; // deprecated — never rendered
  const definition = FEATURE_PAGE_REGISTRY[entry.feature];
  if (definition && flags[definition.flag]) {
    return { menuTitle: featureEntryLabel(entry), pageName: definition.pageName, route: definition.route };
  }
  return null;
};

/**
 * The gallery entry's tag submenu: its ACTIVATED tags whose collections have
 * something displayable, in the menu's order — each labelled by the tag's
 * displayName under its own translation key (`gallery.tag.<tag>.menuTitle`).
 */
const activeGalleryTagItems = (
  states: readonly MenuGalleryTagState[] | undefined,
  gallery: GalleryConfig | undefined,
): MenuItem[] =>
  (states ?? []).flatMap((state) => {
    if (!state.visible) return [];
    const tag = gallery?.tags.find((candidate) => candidate.tag === state.tag);
    if (!tag || displayableItemsForTag(gallery, tag.tag).length === 0) return [];
    return [{ menuTitle: tag.displayName, pageName: galleryTagScope(tag.tag), route: galleryTagRoute(tag.tag) }];
  });

/**
 * How the gallery's top-level entry renders: with at least one activated tag
 * whose collection is displayable, a one-level submenu — an "all items" link
 * first (dedicated translatable label, `gallery.all.menuTitle`), then the
 * active collections in the menu's order. With none (no tags, all off, or all
 * empty) the entry stays a plain /gallery link. `NavGroup` is origin-agnostic,
 * so `MenuBar` renders it like any config group; the `feature:` id prefix
 * keeps it from colliding with a config group named `gallery`.
 */
const galleryNavNode = (
  entry: Extract<MenuEntry, { type: 'feature' }>,
  item: MenuItem,
  gallery: GalleryConfig | undefined,
): NavNode => {
  const tagItems = activeGalleryTagItems(entry.galleryTags, gallery);
  if (tagItems.length === 0) return { kind: 'item', item };
  return {
    kind: 'group',
    id: `feature:${FeaturePagesEnum.GALLERY}`,
    menuTitle: item.menuTitle,
    i18nKey: menuTitleKey(item.pageName),
    alwaysExpanded: false,
    items: [
      { menuTitle: DEFAULT_GALLERY_ALL_LABEL, pageName: GALLERY_ALL_SCOPE, route: item.route },
      ...tagItems,
    ],
  };
};

/**
 * Resolves the stored menu into the nav tree rendered by the menu bars. When the
 * config has no `menu` (older configs), the nav derives from the pages array
 * order. Leaf entries resolve via `resolveLeaf`; a hidden group drops its whole
 * subtree, and a group whose children all resolve away is omitted (it stays in
 * the config — deleting it is an admin decision). The top-level gallery entry
 * resolves through `galleryNavNode` (plain link or tag submenu) — it can never
 * sit inside a group (schema-enforced), since submenus cannot nest.
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
      if (!item) continue;
      nodes.push(
        entry.type === 'feature' && entry.feature === FeaturePagesEnum.GALLERY
          ? galleryNavNode(entry, item, config.gallery)
          : { kind: 'item', item },
      );
    }
  }
  return nodes;
};

/**
 * Reconciles a stored menu against the current pages, enabled feature pages and
 * declared gallery tags:
 * - no menu yet → seed page entries from the pages order (visible);
 * - prune page entries whose page no longer exists (a rename is a prune + re-append)
 *   at the top level and inside groups alike;
 * - keep groups even when all their children prune away (deleting is an admin call);
 * - append entries for new pages (visible) in pages order, at the top level only;
 * - append entries for newly-enabled features (hidden, until an admin opts them in);
 * - KEEP entries of currently-disabled features so flag flips don't lose ordering;
 * - sync the gallery entry's tag submenu with the declared tags: EVERY tag has
 *   its row (newly created ones appended DEACTIVATED — activating is an explicit
 *   admin choice), deleted tags lose theirs, stored order is kept;
 * - migrate: deprecated standalone `galleryTag` entries are dropped, their
 *   activation moving onto the gallery entry's submenu row; a gallery entry
 *   found inside a group is pulled out to the top level (the schema rejects it).
 * Ids are deduped first-occurrence-wins across one global space (top level and
 * every group's children combined), matching the schema's integrity rule.
 * Menu-level settings (e.g. `groupDisplay`) are carried through untouched.
 * Client-side consistency only — the server enforces menu integrity via the schema.
 */
export const reconcileMenu = (
  menu: MenuConfig | undefined,
  pages: ReadonlyArray<{ pageName: string }>,
  enabledFeatures: readonly FeaturePageId[],
  galleryTags: readonly string[] = [],
): MenuConfig => {
  const pageNames = new Set(pages.map((page) => page.pageName));
  const declaredTags = new Set(galleryTags);
  // Deprecated standalone tag entries: remember the tags they had activated,
  // so the migration carries the admin's intent onto the submenu rows.
  const activatedByLegacyEntry = new Set<string>();
  const entries: MenuEntry[] = [];
  const present = new Set<string>();

  const keepLeaf = (entry: MenuLeafEntry): boolean => {
    if (entry.type === 'galleryTag') {
      if (entry.visible && declaredTags.has(entry.tag)) activatedByLegacyEntry.add(entry.tag);
      return false;
    }
    const id = menuEntryId(entry);
    if (present.has(id)) return false; // defensive dedupe — first occurrence wins
    if (entry.type === 'page' && !pageNames.has(entry.pageName)) return false;
    present.add(id);
    return true;
  };

  /** The gallery entry can never sit inside a group — relocated when found there. */
  const escapedFromGroups: MenuEntry[] = [];

  for (const entry of menu?.entries ?? []) {
    if (entry.type === 'group') {
      const id = menuEntryId(entry);
      if (present.has(id)) continue;
      present.add(id);
      const [gallery, others] = entry.children.reduce<[MenuLeafEntry[], MenuLeafEntry[]]>(
        (acc, child) => {
          acc[child.type === 'feature' && child.feature === 'gallery' ? 0 : 1].push(child);
          return acc;
        },
        [[], []],
      );
      entries.push({ ...entry, children: others.filter(keepLeaf) });
      escapedFromGroups.push(...gallery.filter(keepLeaf));
    } else if (keepLeaf(entry)) {
      entries.push(entry);
    }
  }
  entries.push(...escapedFromGroups);

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

  // Gallery submenu sync: keep the stored rows (and order) of still-declared
  // tags, then append the missing ones deactivated — unless a legacy entry
  // had activated them.
  const synced = entries.map((entry) => {
    if (entry.type !== 'feature' || entry.feature !== 'gallery') return entry;
    const kept = (entry.galleryTags ?? []).filter((state) => declaredTags.has(state.tag));
    const known = new Set(kept.map((state) => state.tag));
    const appended = galleryTags
      .filter((tag) => !known.has(tag))
      .map((tag) => ({ tag, visible: activatedByLegacyEntry.has(tag) }));
    const states = [...kept, ...appended].map((state) =>
      activatedByLegacyEntry.has(state.tag) ? { ...state, visible: true } : state,
    );
    if (states.length === 0) {
      const bare = { ...entry };
      delete bare.galleryTags;
      return bare;
    }
    return { ...entry, galleryTags: states };
  });

  return { ...menu, entries: synced };
};
