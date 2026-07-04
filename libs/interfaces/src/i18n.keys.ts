import type { SiteConfig } from './site.interface.js';
import { SectionTypesEnum } from './sections/section.interface.js';

/**
 * Single source of truth for how i18n keys are derived from the site config's JSON
 * structure. The public renderers (MenuBar / HeroSection / TextSection) scope each
 * config string into a `<FormattedMessage id>` using these builders, and the admin
 * Translations editor collects the same keys via `collectI18nEntries` — so the two
 * can never drift.
 */

/** i18n key for a page's menu title. */
export const menuTitleKey = (pageName: string): string => `${pageName}.menuTitle`;

/** i18n key for a string held under a section's `content` (e.g. `title`, `columns.0.paragraph`). */
export const sectionContentKey = (sectionName: string, path: string): string =>
  `${sectionName}.content.${path}`;

/** A translatable key and its original (default) value, as held in the site config. */
export interface I18nEntry {
  key: string;
  defaultValue: string;
}

/**
 * Collects every translatable (key → original value) pair the site config references,
 * mirroring exactly how the renderers scope each JSON string into a `<FormattedMessage>`.
 * Only non-empty strings are included (matching the renderers' `field && …` guards).
 * Deduped by key — the first occurrence wins.
 */
export const collectI18nEntries = (config: SiteConfig): I18nEntry[] => {
  const entries: I18nEntry[] = [];
  const seen = new Set<string>();

  const add = (key: string, value: unknown): void => {
    if (typeof value !== 'string' || value.length === 0 || seen.has(key)) return;
    seen.add(key);
    entries.push({ key, defaultValue: value });
  };

  for (const page of config.pages) {
    add(menuTitleKey(page.pageName), page.menuTitle);
    for (const section of page.sections) {
      const s = section.sectionName;
      if (section.type === SectionTypesEnum.HERO) {
        add(sectionContentKey(s, 'title'), section.content.title);
        add(sectionContentKey(s, 'subtitle'), section.content.subtitle);
        section.content.ctaButtons?.forEach((cta, i) =>
          add(sectionContentKey(s, `ctaButtons.${i}.label`), cta.label),
        );
        section.content.featuringItems?.forEach((item, i) => {
          add(sectionContentKey(s, `featuringItems.${i}.label`), item.label);
          add(sectionContentKey(s, `featuringItems.${i}.value`), item.value);
        });
      } else if (section.type === SectionTypesEnum.TEXT) {
        section.content.columns.forEach((col, i) => {
          add(sectionContentKey(s, `columns.${i}.title`), col.title);
          add(sectionContentKey(s, `columns.${i}.paragraph`), col.paragraph);
        });
      }
    }
  }

  return entries;
};
