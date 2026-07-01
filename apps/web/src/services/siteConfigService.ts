import type { ApiResponseErrorPayload, SiteThemeConfig } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Site config admin service.
 *
 * Reads go through the public `loadSiteConfig` (see `initService`). Writes hit the
 * admin-gated `/api/config/site` function, which merges the `site` section into the
 * stored config and re-validates the whole thing server-side — so the form only ever
 * sends the four `site` fields, never the themes/pages it didn't touch.
 */

/** Persists the `site` section (siteName, logoUrl, faviconUrl, containerMaxWidth). */
export const updateSiteSettings = async (site: SiteThemeConfig): Promise<void> => {
  const response = await apiService.put<SiteThemeConfig, { message: string }>('config/site', site);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};
