import {
  ALL_FEATURE_PAGE_IDS,
  FEATURE_PAGE_ROUTES,
  featureEntryLabel,
  type FeaturePageId,
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
