import type { ApiResponseErrorPayload, ThemeConfig } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Themes admin service.
 *
 * Reads come from the public `loadSiteConfig` (see `initService`). Writes hit the
 * admin-gated `PUT /api/config/themes`, which replaces the whole `themes` array and
 * re-validates the entire config server-side — so add/edit/delete are all expressed
 * as "send the full list", leaving `site`/`pages` untouched.
 */

/** Replaces the entire `themes` array of the site config. */
export const updateThemes = async (themes: ThemeConfig[]): Promise<void> => {
  const response = await apiService.put<ThemeConfig[], { message: string }>('config/themes', themes);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};
