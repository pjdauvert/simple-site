import { z } from "zod";

// Shared zone style — inline CSS overrides applicable to any zone/element
export const ZoneStyleSchema = z.object({
  style:   z.record(z.string(), z.string()).optional(), // regular CSS properties (padding, borderRadius, …)
  cssVars: z.record(z.string(), z.string()).optional(), // CSS custom properties (--xxx: value)
});
export type ZoneStyle = z.infer<typeof ZoneStyleSchema>;

// Section design schema
export const BaseSectionDesignSchema = z.object({
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
});

export const BaseSectionPropsSchema = z.object({
  sectionName: z.string(),
});

// Section types
export const SectionTypesEnum = {
  HERO: 'hero',
  TEXT: 'text',
} as const;

export const SectionTypeSchema = z.enum(Object.values(SectionTypesEnum));
export type SectionType = z.infer<typeof SectionTypeSchema>;

// --- i18n -------------------------------------------------------------------
// Section content is scoped into i18n keys by structural position; each section
// type owns the knowledge of which of its fields are translatable (see the
// `collect*I18n` collectors in the per-type interface files).

/** A translatable key and its original (default) value, as held in the site config. */
export interface I18nEntry {
  key: string;
  defaultValue: string;
}

/** i18n key for a string held under a section's `content` (e.g. `title`, `columns.0.paragraph`). */
export const sectionContentKey = (sectionName: string, path: string): string =>
  `${sectionName}.content.${path}`;

/** Collects the translatable entries of a section of type `T`, given its page-scoped name. */
export type SectionI18nCollector<T> = (section: T, scope: string) => I18nEntry[];

/**
 * Accumulator each section collector uses: `add(path, value)` records a
 * `(scoped content key → value)` entry, skipping empty/absent values — mirroring the
 * renderers' `field && <FormattedMessage>` guards.
 */
export const createSectionI18n = (scope: string) => {
  const entries: I18nEntry[] = [];
  const add = (path: string, value?: string): void => {
    if (typeof value === 'string' && value.length > 0) {
      entries.push({ key: sectionContentKey(scope, path), defaultValue: value });
    }
  };
  return { entries, add };
};