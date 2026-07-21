import { z } from "zod";

// Seed / default locales. Languages are otherwise data-driven at runtime: the set of
// available languages is derived from the stored translations blob, and admins can
// add / import / remove them via the Translations page. These constants are only the
// bundled defaults and the guaranteed base/fallback locale.
export const I18nLocalesEnum = {
    EN: 'en',
    FR: 'fr',
} as const;

// Last-resort fallback only, used when no site config is in scope (e.g. SSR before the
// config loads). The authoritative default language lives in `config.site.defaultLanguage`.
export const BASE_LOCALE: string = I18nLocalesEnum.EN;

/**
 * Normalizes a locale code to its canonical BCP-47 form (e.g. `fr-ca` → `fr-CA`,
 * `zh-hant` → `zh-Hant`), or returns undefined when the code is malformed or names a
 * language the runtime cannot resolve to a display name.
 */
export const toCanonicalLocale = (code: string): string | undefined => {
    const trimmed = code.trim();
    if (!trimmed) return undefined;
    let canonical: string | undefined;
    try {
        canonical = Intl.getCanonicalLocales(trimmed)[0];
    } catch {
        return undefined;
    }
    if (!canonical) return undefined;
    try {
        const name = new Intl.DisplayNames(['en'], { type: 'language', fallback: 'none' }).of(canonical);
        return name === undefined ? undefined : canonical;
    } catch {
        return undefined;
    }
};

/** True when `value` is an Intl-resolvable locale code (BCP-47, region/script variants included). */
export const isLocaleCode = (value: string): boolean => toCanonicalLocale(value) !== undefined;

// i18n Locale schema — any Intl-resolvable BCP-47 locale code.
export const I18nLocaleSchema = z.string().refine(isLocaleCode, 'Unknown or malformed locale code');
export type Locale = z.infer<typeof I18nLocaleSchema>;

// i18n Dictionary schema
// The dictionary is a record of locales, each containing a record of keys and values, where keys are strings allowing a-z, A-Z, 0-9, _ and . characters.
export const I18nDictionarySchema = z.record(z.string().regex(/^[a-zA-Z0-9_.]+$/), z.string());

export type I18nDictionary = z.infer<typeof I18nDictionarySchema>;

// i18n schema
export const I18nSchema = z.record(I18nLocaleSchema, I18nDictionarySchema);
export type I18n = z.infer<typeof I18nSchema>;

// `GET /api/translations` response shape: the config-defined default language plus the
// override dictionaries (the default language has no dictionary — its text lives in the site config).
export const TranslationsPayloadSchema = z.object({
    defaultLanguage: I18nLocaleSchema,
    translations: I18nSchema,
});
export type TranslationsPayload = z.infer<typeof TranslationsPayloadSchema>;
