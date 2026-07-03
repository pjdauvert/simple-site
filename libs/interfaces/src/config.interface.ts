import { z } from 'zod';
import { SiteConfigSchema } from './site.interface.js';

/**
 * Maximum number of retained versions = published + archives (the working draft is
 * uncounted). Creating a new archive beyond this erases the oldest one.
 */
export const MAX_CONFIG_VERSIONS = 10;

/**
 * Config version management.
 *
 * The whole `SiteConfig` (site/themes/pages) is versioned with a draft → publish
 * model: admins edit a working **draft**, the live site keeps reading the
 * **published** config, and publishing snapshots the outgoing published config
 * into a timestamped **archive**. See `ConfigModule` for the storage layout.
 */

/**
 * A named pointer to a stored config version. `key` is the API-facing id used in
 * `/api/config/versions/:key`:
 *  - `'published'` → the live config
 *  - `'draft'` → the working draft
 *  - `'<YYYYMMDDHHMMSS>'` (optionally with a `-N` collision suffix) → an archive
 */
export const ConfigVersionSummarySchema = z.object({
  key: z.string(),
  name: z.string(),
  /** ISO timestamp of when this version's content was created (seed/edit/import time). */
  createdAt: z.string().optional(),
});
export type ConfigVersionSummary = z.infer<typeof ConfigVersionSummarySchema>;

/** The full version list returned by `GET /api/config/versions`. */
export const ConfigVersionsManifestSchema = z.object({
  published: ConfigVersionSummarySchema,
  /** `null` until an admin edit or import creates a draft. */
  draft: ConfigVersionSummarySchema.nullable(),
  /** Previously-published configs, newest first. */
  archives: z.array(ConfigVersionSummarySchema),
});
export type ConfigVersionsManifest = z.infer<typeof ConfigVersionsManifestSchema>;

/** Body for `POST /api/config/import` — upload a config as the new named draft. */
export const ConfigImportRequestSchema = z.object({
  name: z.string().trim().min(1),
  config: SiteConfigSchema,
});
export type ConfigImportRequest = z.infer<typeof ConfigImportRequestSchema>;

/** Body for `PUT /api/config/versions/:key` — rename a version. */
export const ConfigRenameRequestSchema = z.object({
  name: z.string().trim().min(1),
});
export type ConfigRenameRequest = z.infer<typeof ConfigRenameRequestSchema>;
