import type { ApiResponseErrorPayload, MenuConfig } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Menu admin service.
 *
 * Reads come from the working draft (`loadDraftConfig`, see `configVersionService`).
 * Writes hit the admin-gated `PUT /api/config/menu`, which replaces the `menu` of
 * the DRAFT and re-validates the entire config server-side (entry integrity is
 * enforced against the draft's pages). Changes go live only when published from
 * the Config Versions panel.
 */

/** Replaces the entire `menu` of the config draft. */
export const updateMenu = async (menu: MenuConfig): Promise<void> => {
  const response = await apiService.put<MenuConfig, { message: string }>('config/menu', menu);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};
