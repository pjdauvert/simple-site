import type { ApiResponseErrorPayload, ApiResponseSuccessPayload, I18nDictionary, Locale, SiteConfig, TranslationsPayload } from '@simple-site/interfaces';
import { BASE_LOCALE, I18nDictionarySchema, SiteConfigSchema, TranslationsPayloadSchema, toCanonicalLocale } from '@simple-site/interfaces';
import apiService from './apiService';

export type SiteConfigLoaderType = () => Promise<SiteConfig>;

export const loadSiteConfig: SiteConfigLoaderType = async () => {
  const response = await apiService.get<SiteConfig>('config');

  // Manage error message display
  if (!response.ok) {
    const error = (response as ApiResponseErrorPayload).message;
    throw new Error(error);
  }
  return SiteConfigSchema.parse((response as ApiResponseSuccessPayload<SiteConfig>).data);
}

export type TranslationLoaderType = (locale: Locale) => Promise<I18nDictionary>;

export const loadTranslations: TranslationLoaderType = async (locale) => {
  const response = await apiService.get<I18nDictionary>(`translations/${locale}`);

  // Manage error message display
  if (!response.ok) {
    const error = (response as ApiResponseErrorPayload).message;
    throw new Error(error);
  }
  return I18nDictionarySchema.parse((response as ApiResponseSuccessPayload<I18nDictionary>).data);
}

export interface LanguagesInfo {
  defaultLocale: Locale;
  locales: Locale[];
}

export type LanguagesLoaderType = () => Promise<LanguagesInfo>;

/** The languages the site currently offers — the config default language plus the blob override keys. */
export const loadLanguages: LanguagesLoaderType = async () => {
  const response = await apiService.get<TranslationsPayload>('translations');
  if (!response.ok) {
    const error = (response as ApiResponseErrorPayload).message;
    throw new Error(error);
  }
  const { defaultLanguage, translations } = TranslationsPayloadSchema.parse(
    (response as ApiResponseSuccessPayload<TranslationsPayload>).data,
  );
  const overrides = Object.keys(translations).filter(locale => locale !== defaultLanguage).sort();
  return { defaultLocale: defaultLanguage, locales: [defaultLanguage, ...overrides] };
}

export const LOCALE_KEY = 'app.locale';

export const THEME_KEY = 'app.theme';

export const initTheme = (availableThemes: string[]): string => {
  if (typeof window === 'undefined' || availableThemes.length === 0) {
    return availableThemes[0] ?? '';
  }
  const saved = localStorage.getItem(THEME_KEY);
  if (saved && availableThemes.includes(saved)) {
    return saved;
  }
  return availableThemes[0];
};

export const initLocale = (): Locale => {
  if (typeof window === 'undefined') {
    // SSR / non-browser environment: localStorage and navigator are unavailable.
    // Return the base locale so any future SSR adoption does not crash.
    return BASE_LOCALE;
  }

  // Languages are data-driven, so we only format-validate here (any Intl-resolvable
  // BCP-47 tag, region/script kept); the IntlProvider reconciles against the actual
  // available languages once they load.
  const saved = localStorage.getItem(LOCALE_KEY);
  let locale = saved ? toCanonicalLocale(saved) : undefined;
  if (!locale) {
    const browserLocale =
      (navigator.languages && navigator.languages.length > 0
        ? navigator.languages[0]
        : navigator.language) || BASE_LOCALE;
    locale =
      toCanonicalLocale(browserLocale) ??
      toCanonicalLocale(browserLocale.split('-')[0]) ??
      BASE_LOCALE;
    localStorage.setItem(LOCALE_KEY, locale);
  }
  return locale;
}
