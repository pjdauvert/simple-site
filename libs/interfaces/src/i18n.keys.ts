import type { SiteConfig } from './site.interface.js';
import { SectionTypesEnum, type I18nEntry } from './sections/section.interface.js';
import { collectHeroI18n } from './sections/hero.section.interface.js';
import { collectTextI18n } from './sections/text.section.interface.js';

/**
 * How i18n keys are derived from the site config's JSON structure. The key format is
 * shared by the public renderers (MenuBar / HeroSection / TextSection, via `menuTitleKey`
 * and `sectionContentKey`) and the admin Translations editor (via `collectI18nEntries`),
 * so the two can never drift. Each section type owns the knowledge of which of its fields
 * are translatable — see the `collect*I18n` collectors in `sections/<type>.section.interface.ts`.
 */

/** i18n key for a page's menu title. */
export const menuTitleKey = (pageName: string): string => `${pageName}.menuTitle`;

/**
 * Page-qualified section name used to scope a section's i18n keys. Sections are named
 * per-page (e.g. both the home and get-started pages have a `hero`), so keys are scoped
 * by page to stay unique — the `Page` renderer passes this same value as `sectionName`.
 */
export const sectionScope = (pageName: string, sectionName: string): string => `${pageName}.${sectionName}`;

/**
 * Collects every translatable (key → original value) pair the site config references.
 * Page menu titles are handled here; each section contributes its own translatable
 * strings via its type's collector, keeping the field knowledge with the section
 * definition. Deduped by key — the first occurrence wins.
 */
export const collectI18nEntries = (config: SiteConfig): I18nEntry[] => {
  const entries: I18nEntry[] = [];
  const seen = new Set<string>();
  const push = (entry: I18nEntry): void => {
    if (seen.has(entry.key)) return;
    seen.add(entry.key);
    entries.push(entry);
  };

  for (const page of config.pages) {
    if (page.menuTitle) push({ key: menuTitleKey(page.pageName), defaultValue: page.menuTitle });
    for (const section of page.sections) {
      const scope = sectionScope(page.pageName, section.sectionName);
      switch (section.type) {
        case SectionTypesEnum.HERO:
          collectHeroI18n(section, scope).forEach(push);
          break;
        case SectionTypesEnum.TEXT:
          collectTextI18n(section, scope).forEach(push);
          break;
      }
    }
  }

  return entries;
};
