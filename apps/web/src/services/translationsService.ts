import type { ApiResponseErrorPayload, ApiResponseSuccessPayload, I18n, I18nDictionary, Locale } from '@simple-site/interfaces';
import { I18nSchema } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Translations admin service.
 *
 * Reads the whole blob for the editor. Writes are admin-gated:
 * - `replaceTranslations` (PUT `/:language`) swaps a language's whole dictionary, so
 *   keys removed in the editor actually disappear (POST only merges).
 * - `importTranslations` (PUT `/api/translations`) bulk-imports an `i18n.json`-shaped
 *   file — one or more languages upserted at once.
 * - `deleteLanguage` (DELETE `/:language`) removes a language.
 */

/** The full translations blob (all languages). */
export const loadAllTranslations = async (): Promise<I18n> => {
  const response = await apiService.get<I18n>('translations');
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
  return I18nSchema.parse((response as ApiResponseSuccessPayload<I18n>).data);
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
