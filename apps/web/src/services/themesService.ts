import type { ApiResponseErrorPayload, ThemeConfig } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Themes admin service.
 *
 * Reads come from the working draft (`loadDraftConfig`, see `configVersionService`).
 * Writes hit the admin-gated `PUT /api/config/themes`, which replaces the whole
 * `themes` array of the DRAFT and re-validates the entire config server-side — so
 * add/edit/delete are all expressed as "send the full list", leaving `site`/`pages`
 * untouched. Changes go live only when published from the Config Versions panel.
 */

/** Replaces the entire `themes` array of the config draft. */
export const updateThemes = async (themes: ThemeConfig[]): Promise<void> => {
  const response = await apiService.put<ThemeConfig[], { message: string }>('config/themes', themes);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};
