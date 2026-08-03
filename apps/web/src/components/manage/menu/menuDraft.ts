import {
  FEATURE_PAGE_ROUTES,
  featureEntryLabel,
  menuTitleKey,
  type MenuEntry,
  type PageConfiguration,
} from '@simple-site/interfaces';
import type { FeatureFlags } from '../../../services/featuresService';
import { FEATURE_PAGE_REGISTRY } from '../../../router/publicMenu';

/** What the Menu tab renders for one entry: resolved label/route + availability. */
export interface MenuEntryRow {
  entry: MenuEntry;
  /** Effective display label — the entry's custom title, else `baseLabel`. */
  label: string;
  /**
   * The label the entry falls back to without a custom title: the page's own
   * menu title, or the feature's default label. Shown as the rename field's
   * placeholder (an empty field reverts to it).
   */
  baseLabel: string;
  route: string;
  kind: 'page' | 'feature';
  /** The label's translation key (`${pageName|feature}.menuTitle`) on the Translations page. */
  i18nKey: string;
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
  return entries.flatMap((entry) => {
    // TODO(menu-groups): group rows land with the editor rework.
    if (entry.type === 'group') return [];
    if (entry.type === 'page') {
      const page = pagesByName.get(entry.pageName);
      const baseLabel = page?.menuTitle ?? entry.pageName;
      return {
        entry,
        label: entry.menuTitle ?? baseLabel,
        baseLabel,
        route: page?.route ?? '',
        kind: 'page' as const,
        i18nKey: menuTitleKey(entry.pageName),
        available: Boolean(page),
      };
    }
    const definition = FEATURE_PAGE_REGISTRY[entry.feature];
    return {
      entry,
      label: featureEntryLabel(entry),
      baseLabel: featureEntryLabel({ ...entry, menuTitle: undefined }),
      route: FEATURE_PAGE_ROUTES[entry.feature],
      kind: 'feature' as const,
      i18nKey: menuTitleKey(entry.feature),
      available: Boolean(definition && flags && flags[definition.flag]),
    };
  });
};

/** A trimmed rename: empty or identical to the fallback clears the custom title. */
export const normalizedMenuTitle = (value: string, baseLabel: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === baseLabel) return undefined;
  return trimmed;
};
