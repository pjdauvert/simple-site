import type { ApiResponseErrorPayload, ApiResponseSuccessPayload, I18n, I18nDictionary, Locale, TranslationsPayload } from '@simple-site/interfaces';
import { TranslationsPayloadSchema } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Translations admin service.
 *
 * Reads `{ defaultLanguage, translations }` for the editor — `translations` holds only
 * the override languages (the default language's text lives in the site config).
 * Writes are admin-gated:
 * - `replaceTranslations` (PUT `/:language`) swaps a language's whole dictionary, so
 *   keys removed in the editor actually disappear (POST only merges).
 * - `importTranslations` (PUT `/api/translations`) bulk-imports an `i18n.json`-shaped
 *   file — one or more languages upserted at once.
 * - `deleteLanguage` (DELETE `/:language`) removes a language.
 */

/** The config-defined default language plus every override language's dictionary. */
export const loadAllTranslations = async (): Promise<TranslationsPayload> => {
  const response = await apiService.get<TranslationsPayload>('translations');
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
  return TranslationsPayloadSchema.parse((response as ApiResponseSuccessPayload<TranslationsPayload>).data);
};

/** Replaces a language's entire dictionary. */
export const replaceTranslations = async (locale: Locale, dictionary: I18nDictionary): Promise<void> => {
  const response = await apiService.put<I18nDictionary, { message: string }>(`translations/${locale}`, dictionary);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};

/** Bulk-imports an `i18n.json`-shaped blob (upserts each language it contains). */
export const importTranslations = async (i18n: I18n): Promise<void> => {
  const response = await apiService.put<I18n, { message: string }>('translations', i18n);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};

/** Removes a language entirely. */
export const deleteLanguage = async (locale: Locale): Promise<void> => {
  const response = await apiService.delete(`translations/${locale}`);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};
