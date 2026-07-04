import type { ApiResponseErrorPayload, ApiResponseSuccessPayload, I18n, I18nDictionary, Locale, SiteConfig } from '@simple-site/interfaces';
import { BASE_LOCALE, I18nDictionarySchema, I18nSchema, SiteConfigSchema, isLocaleCode } from '@simple-site/interfaces';
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

export type LanguagesLoaderType = () => Promise<Locale[]>;

/** The languages the site currently offers — the keys of the translations blob. */
export const loadLanguages: LanguagesLoaderType = async () => {
  const response = await apiService.get<I18n>('translations');
  if (!response.ok) {
    const error = (response as ApiResponseErrorPayload).message;
    throw new Error(error);
  }
  const i18n = I18nSchema.parse((response as ApiResponseSuccessPayload<I18n>).data);
  return Object.keys(i18n) as Locale[];
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

  // Languages are data-driven, so we only format-validate here (ISO 639-1); the
  // IntlProvider reconciles against the actual available languages once they load,
  // falling back to the base locale if the saved/browser one isn't offered.
  let locale = localStorage.getItem(LOCALE_KEY) as Locale | null;
  if (!locale || !isLocaleCode(locale)) {
    const browserLocale =
      (navigator.languages && navigator.languages.length > 0
        ? navigator.languages[0]
        : navigator.language) || BASE_LOCALE;
    locale = browserLocale.split('-')[0] as Locale;
    if (!isLocaleCode(locale)) {
      locale = BASE_LOCALE;
    }
    localStorage.setItem(LOCALE_KEY, locale);
  }
  return locale;
}
