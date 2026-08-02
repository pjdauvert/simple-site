import type {
  ApiResponseErrorPayload,
  ApiResponseSuccessPayload,
  ConfigVersionsManifest,
  SiteConfig,
} from '@simple-site/interfaces';
import { ConfigVersionsManifestSchema, StoredSiteConfigSchema } from '@simple-site/interfaces';
import apiService from './apiService';

/**
 * Config version management service (admin only).
 *
 * The whole `SiteConfig` is versioned with a draft → publish model. Admin forms
 * edit the **draft** (`loadDraftConfig`); the live site keeps reading the published
 * config via `initService.loadSiteConfig`. Publishing promotes the draft to live and
 * archives the previously-published config. All endpoints below are admin-gated.
 */

const unwrap = <T>(response: ApiResponseSuccessPayload<T> | ApiResponseErrorPayload): T => {
  if (!response.ok) throw new Error((response as ApiResponseErrorPayload).message);
  return (response as ApiResponseSuccessPayload<T>).data;
};

/** Loads the working draft that the admin edit forms operate on. */
export const loadDraftConfig = async (): Promise<SiteConfig> => {
  const response = await apiService.get<SiteConfig>('config/draft');
  return StoredSiteConfigSchema.parse(unwrap(response));
};

/** Replaces the whole working draft (`POST /api/config`). Never writes live. */
export const saveDraftConfig = async (config: SiteConfig): Promise<void> => {
  const response = await apiService.post<SiteConfig, { message: string }>('config', config);
  unwrap(response);
};

/** Returns the version manifest (published + draft + archives). */
export const listVersions = async (): Promise<ConfigVersionsManifest> => {
  const response = await apiService.get<ConfigVersionsManifest>('config/versions');
  return ConfigVersionsManifestSchema.parse(unwrap(response));
};

/** Returns a version's full `SiteConfig` — used to build a download. */
export const getVersionConfig = async (key: string): Promise<SiteConfig> => {
  const response = await apiService.get<SiteConfig>(`config/versions/${encodeURIComponent(key)}`);
  return StoredSiteConfigSchema.parse(unwrap(response));
};

/** Promotes the draft to live; the outgoing published config is archived. */
export const publishDraft = async (): Promise<void> => {
  const response = await apiService.post<undefined, { message: string }>('config/publish');
  unwrap(response);
};

/** Uploads a config as the new named draft. */
export const importConfig = async (name: string, config: SiteConfig): Promise<void> => {
  const response = await apiService.post<{ name: string; config: SiteConfig }, { message: string }>(
    'config/import',
    { name, config },
  );
  unwrap(response);
};

/** Renames a version (published, draft, or archive). */
export const renameVersion = async (key: string, name: string): Promise<void> => {
  const response = await apiService.put<{ name: string }, { message: string }>(
    `config/versions/${encodeURIComponent(key)}`,
    { name },
  );
  unwrap(response);
};

/** Rolls back to an archive: it becomes live and the current live config is archived. */
export const republishVersion = async (key: string): Promise<void> => {
  const response = await apiService.post<undefined, { message: string }>(
    `config/versions/${encodeURIComponent(key)}/publish`,
  );
  unwrap(response);
};

/** Starts a new draft from a version's content; any existing draft is archived first. */
export const startDraftFromVersion = async (key: string): Promise<void> => {
  const response = await apiService.post<undefined, { message: string }>(
    `config/versions/${encodeURIComponent(key)}/draft`,
  );
  unwrap(response);
};

/** Permanently deletes an archive. */
export const deleteVersion = async (key: string): Promise<void> => {
  const response = await apiService.delete(`config/versions/${encodeURIComponent(key)}`);
  unwrap(response);
};
