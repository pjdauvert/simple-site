import {
  FEATURE_PAGE_ROUTES,
  type MenuEntry,
  type PageConfiguration,
} from '@simple-site/interfaces';
import type { FeatureFlags } from '../../../services/featuresService';
import { FEATURE_PAGE_REGISTRY } from '../../../router/publicMenu';

/** What the Menu tab renders for one entry: resolved label/route + availability. */
export interface MenuEntryRow {
  entry: MenuEntry;
  /** Resolved display label — the page's menu title, or the feature's default label. */
  label: string;
  route: string;
  kind: 'page' | 'feature';
  /**
   * False for feature entries whose feature is unregistered or flag-off: the row is
   * kept (so ordering survives flag flips) but rendered greyed and not toggleable.
   */
  available: boolean;
}

/** Builds the Menu tab's row view-models from reconciled entries. */
export const entryRows = (
  entries: MenuEntry[],
  pages: ReadonlyArray<Pick<PageConfiguration, 'pageName' | 'route' | 'menuTitle'>>,
  flags: FeatureFlags | null,
): MenuEntryRow[] => {
  const pagesByName = new Map(pages.map((page) => [page.pageName, page]));
  return entries.map((entry) => {
    if (entry.type === 'page') {
      const page = pagesByName.get(entry.pageName);
      return {
        entry,
        label: page?.menuTitle ?? entry.pageName,
        route: page?.route ?? '',
        kind: 'page' as const,
        available: Boolean(page),
      };
    }
    const definition = FEATURE_PAGE_REGISTRY[entry.feature];
    return {
      entry,
      label: definition?.defaultLabel ?? entry.feature,
      route: FEATURE_PAGE_ROUTES[entry.feature],
      kind: 'feature' as const,
      available: Boolean(definition && flags && flags[definition.flag]),
    };
  });
};
