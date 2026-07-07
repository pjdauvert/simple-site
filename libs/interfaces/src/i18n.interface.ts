import { z } from "zod";

// Seed / default locales. Languages are otherwise data-driven at runtime: the set of
// available languages is derived from the stored translations blob, and admins can
// add / import / remove them via the Translations page. These constants are only the
// bundled defaults and the guaranteed base/fallback locale.
export const I18nLocalesEnum = {
    EN: 'en',
    FR: 'fr',
} as const;

// The base locale — always present, the fallback when a requested locale is unknown,
// and the one language that cannot be removed.
export const BASE_LOCALE: string = I18nLocalesEnum.EN;

// i18n Locale schema — any ISO 639-1 (two-letter, lowercase) code.
export const I18nLocaleSchema = z.string().regex(/^[a-z]{2}$/);
export type Locale = z.infer<typeof I18nLocaleSchema>;

/** True when `value` is a syntactically valid locale code (ISO 639-1). */
export const isLocaleCode = (value: string): boolean => I18nLocaleSchema.safeParse(value).success;

// i18n Dictionary schema
// The dictionary is a record of locales, each containing a record of keys and values, where keys are strings allowing a-z, A-Z, 0-9, _ and . characters.
export const I18nDictionarySchema = z.record(z.string().regex(/^[a-zA-Z0-9_.]+$/), z.string());

export type I18nDictionary = z.infer<typeof I18nDictionarySchema>;

// i18n schema
export const I18nSchema = z.record(I18nLocaleSchema, I18nDictionarySchema);
export type I18n = z.infer<typeof I18nSchema>;
