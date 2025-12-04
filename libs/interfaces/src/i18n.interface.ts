import { z } from "zod";

// available locales
// Only ISO 639-1 codes are supported
export const I18nLocalesEnum = {
    EN: 'en',
    FR: 'fr',
} as const;

// i18n Locale schema
const I18nLocaleSchema = z.enum(Object.values(I18nLocalesEnum));
export type Locale = z.infer<typeof I18nLocaleSchema>;

// i18n Dictionary schema
// The dictionary is a record of locales, each containing a record of keys and values, where keys are strings allowing a-z, A-Z, 0-9, _ and . characters.
const I18nDictionarySchema = z.record(z.string().regex(/^[a-zA-Z0-9_.]+$/), z.string());

export type I18nDictionary = z.infer<typeof I18nDictionarySchema>;

// i18n schema
export const I18nSchema = z.record(I18nLocaleSchema, I18nDictionarySchema);
