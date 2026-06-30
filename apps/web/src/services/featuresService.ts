import type { ApiResponseErrorPayload, ApiResponseSuccessPayload } from '@simple-site/interfaces';
import apiService from './apiService';

/** Runtime feature flags reported by `GET /api/features`. */
export interface FeatureFlags {
  /** Admin Media library (page, nav entry, and `/api/media*` endpoints). */
  media: boolean;
}

/** Fetches the feature flags the server currently has enabled. */
export const getFeatureFlags = async (): Promise<FeatureFlags> => {
  const response = await apiService.get<FeatureFlags>('features');
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
  return (response as ApiResponseSuccessPayload<FeatureFlags>).data;
};
