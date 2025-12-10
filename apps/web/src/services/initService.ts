import type { ApiResponseErrorPayload, ApiResponseSuccessPayload, I18nDictionary, Locale, SiteConfig } from '@simple-site/interfaces';
import { I18nDictionarySchema, I18nLocalesEnum, SiteConfigSchema } from '@simple-site/interfaces';
import apiService from './apiService';
/**
 * Simulates loading configuration from an API endpoint
 * In a real application, this would be a fetch call to an API
 */
export async function loadSiteConfig(): Promise<SiteConfig> {
  const response = await apiService.get<SiteConfig>('config');

  // Manage error message display
  if (!response.ok) {
    const error = (response as ApiResponseErrorPayload).message;
    throw new Error(error);
  }
  return SiteConfigSchema.parse((response as ApiResponseSuccessPayload<SiteConfig>).data);
}

export async function loadTranslations(locale: Locale): Promise<I18nDictionary> {
  const response = await apiService.get<I18nDictionary>(`translations/${locale}`);

  // Manage error message display
  if (!response.ok) {
    const error = (response as ApiResponseErrorPayload).message;
    throw new Error(error);
  }
  return I18nDictionarySchema.parse((response as ApiResponseSuccessPayload<I18nDictionary>).data);
}

export const LOCALE_KEY = 'app.locale';

export function initLocale(): Locale {
  // Get the locale from the local storage
  let locale = localStorage.getItem(LOCALE_KEY) as Locale | null;
  if (!locale) {
    // Get the browser locale
    const browserLocale =
      (navigator.languages && navigator.languages.length > 0
        ? navigator.languages[0]
        : navigator.language) || I18nLocalesEnum.EN;
    // Normalize the locale
    locale = browserLocale.split('-')[0] as Locale;
    // Check if the locale is supported
    if (!Object.values(I18nLocalesEnum).includes(locale)) {
      locale = I18nLocalesEnum.EN;
    }
    // Save the locale to the local storage
    localStorage.setItem(LOCALE_KEY, locale);
  }
  return locale;
}
