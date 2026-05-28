import type { ApiResponseErrorPayload, ApiResponseSuccessPayload, I18nDictionary, Locale, SiteConfig } from '@simple-site/interfaces';
import { I18nDictionarySchema, I18nLocalesEnum, SiteConfigSchema } from '@simple-site/interfaces';
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

export const initLocale = () => {
  if (typeof window === 'undefined') {
    // SSR / non-browser environment: localStorage and navigator are unavailable.
    // Return the default locale so any future SSR adoption does not crash.
    return I18nLocalesEnum.EN;
  }

  let locale = localStorage.getItem(LOCALE_KEY) as Locale | null;
  if (!locale || !Object.values(I18nLocalesEnum).includes(locale)) {
    const browserLocale =
      (navigator.languages && navigator.languages.length > 0
        ? navigator.languages[0]
        : navigator.language) || I18nLocalesEnum.EN;
    locale = browserLocale.split('-')[0] as Locale;
    if (!Object.values(I18nLocalesEnum).includes(locale)) {
      locale = I18nLocalesEnum.EN;
    }
    localStorage.setItem(LOCALE_KEY, locale);
  }
  return locale;
}
