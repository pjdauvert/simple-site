import {
  ALL_FEATURE_PAGE_IDS,
  FEATURE_PAGE_ROUTES,
  featureEntryLabel,
  menuEntryId,
  type FeaturePageId,
  type MenuConfig,
  type MenuEntry,
  type MenuItem,
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
 * Resolves the stored menu into the nav items rendered by the menu bars. When the
 * config has no `menu` (older configs), the nav derives from the pages array order.
 * Hidden entries, entries referencing unknown pages, and feature entries whose
 * feature is unregistered or disabled are skipped.
 */
export const resolveMenuItems = (config: SiteConfig, flags: FeatureFlags): MenuItem[] => {
  if (!config.menu) {
    return config.pages.map(({ pageName, route, menuTitle }) => ({ menuTitle, pageName, route }));
  }
  const pagesByName = new Map(config.pages.map((page) => [page.pageName, page]));
  const items: MenuItem[] = [];
  for (const entry of config.menu.entries) {
    if (!entry.visible) continue;
    if (entry.type === 'page') {
      const page = pagesByName.get(entry.pageName);
      if (page) items.push({ menuTitle: entry.menuTitle ?? page.menuTitle, pageName: page.pageName, route: page.route });
    } else {
      const definition = FEATURE_PAGE_REGISTRY[entry.feature];
      if (definition && flags[definition.flag]) {
        items.push({ menuTitle: featureEntryLabel(entry), pageName: definition.pageName, route: definition.route });
      }
    }
  }
  return items;
};

/**
 * Reconciles a stored menu against the current pages and enabled feature pages:
 * - no menu yet → seed page entries from the pages order (visible);
 * - prune page entries whose page no longer exists (a rename is a prune + re-append);
 * - append entries for new pages (visible) in pages order;
 * - append entries for newly-enabled features (hidden, until an admin opts them in);
 * - KEEP entries of currently-disabled features so flag flips don't lose ordering.
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

  for (const entry of menu?.entries ?? []) {
    const id = menuEntryId(entry);
    if (present.has(id)) continue; // defensive dedupe — first occurrence wins
    if (entry.type === 'page' && !pageNames.has(entry.pageName)) continue;
    present.add(id);
    entries.push(entry);
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

  return { entries };
};
