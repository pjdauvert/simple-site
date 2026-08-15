import type { ApiResponseErrorPayload, ApiResponseSuccessPayload } from '@simple-site/interfaces';
import apiService from './apiService';

/** Runtime feature flags reported by `GET /api/features`. */
export interface FeatureFlags {
  /** Admin Media library (page, nav entry, and `/api/media*` endpoints). */
  media: boolean;
  /** Team feature (admin /manage/team, public /team pages, and `/api/team`). */
  team: boolean;
  /** Contact feature (public /contact page and `/api/contact`). */
  contact: boolean;
  /** Gallery feature (admin /manage/gallery, public /gallery pages, menu entries, `PUT /api/config/gallery`). */
  gallery: boolean;
}

/**
 * The zero value of {@link FeatureFlags}: every optional feature off. Used
 * wherever the flags aren't known — while they load, or when the API can't be
 * reached — so an unreachable server never exposes a feature. Adding a flag to
 * the interface above updates every caller (and every test) through this
 * constant; it is the single place the full set is spelled out.
 */
export const ALL_DISABLED: FeatureFlags = { media: false, team: false, contact: false, gallery: false };

/** Fetches the feature flags the server currently has enabled. */
export const getFeatureFlags = async (): Promise<FeatureFlags> => {
  const response = await apiService.get<FeatureFlags>('features');
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
  return (response as ApiResponseSuccessPayload<FeatureFlags>).data;
};
