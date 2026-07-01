import type { ApiResponseErrorPayload, I18nDictionary, Locale } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Translations admin service.
 *
 * Reads come from the public `loadTranslations` (see `initService`). Writes hit the
 * admin-gated `PUT /api/translations/:locale`, which REPLACES that locale's whole
 * dictionary — so keys removed in the editor actually disappear (the POST endpoint
 * only merges, i.e. adds/updates). The editor sends the complete desired dictionary.
 */

/** Replaces a locale's entire translation dictionary. */
export const replaceTranslations = async (locale: Locale, dictionary: I18nDictionary): Promise<void> => {
  const response = await apiService.put<I18nDictionary, { message: string }>(`translations/${locale}`, dictionary);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};
