import type { ApiResponseErrorPayload, ApiResponseSuccessPayload, SiteConfig } from '@simple-site/interfaces';
import { SiteConfigSchema } from '@simple-site/interfaces';
import apiService from './apiService';
/**
 * Simulates loading configuration from an API endpoint
 * In a real application, this would be a fetch call to an API
 */
export async function loadSiteConfig(): Promise<SiteConfig> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In production, this would be: return fetch('/api/config').then(res => res.json());
  // For now, we dynamically import the JSON file
  const response = await apiService.get<SiteConfig>('config');

  // Manage error message display
  if (!response.ok) {
    const error = (response as ApiResponseErrorPayload).message;
    throw new Error(error);
  }
  return SiteConfigSchema.parse((response as ApiResponseSuccessPayload<SiteConfig>).data);
}
