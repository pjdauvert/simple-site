import type { ApiResponseErrorPayload, GalleryConfig } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Gallery admin service.
 *
 * Reads come from the working draft (`loadDraftConfig`, see `configVersionService`).
 * Writes hit the admin-gated, flag-gated `PUT /api/config/gallery`, which replaces
 * the `gallery` of the DRAFT and re-validates the entire config server-side
 * (unique themeIds). Changes go live only when published from the Config
 * Versions panel.
 */

/** Replaces the entire `gallery` of the config draft. */
export const updateGallery = async (gallery: GalleryConfig): Promise<void> => {
  const response = await apiService.put<GalleryConfig, { message: string }>('config/gallery', gallery);
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
};
