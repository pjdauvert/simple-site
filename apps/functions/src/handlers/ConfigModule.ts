import type { Context } from '@netlify/functions';
import type { RequestHandler } from '../types/server-types';
import { BaseHandler } from './BaseHandler';
import { getStore, type Store } from '@netlify/blobs';
import { ErrorResponses } from '../errors/error';
import {
    type ConfigVersionsManifest,
    ConfigVersionsManifestSchema,
    ConfigImportRequestSchema,
    ConfigRenameRequestSchema,
    type SiteConfig,
    SiteConfigSchema,
    SiteThemeConfigSchema,
} from '@simple-site/interfaces';
import { seedBlob } from './seed/seedBlob';

/**
 * Config version management (draft → publish with a linear archive history).
 *
 * Blob layout (store `${APP_NAME}-store`):
 *  - `config`                       → published/live config (public `GET /api/config`, unchanged)
 *  - `config:draft`                 → working draft (admin editing target)
 *  - `config:archive:<YYYYMMDDHHMMSS>` → immutable snapshot of a previously-published config
 *  - `config:versions`              → manifest (source of truth for names + the archive list)
 *
 * Publishing snapshots the OUTGOING published config into an archive, promotes the
 * draft to live (published takes the draft's name), then clears the draft so it is
 * lazily re-derived from published on the next admin read.
 */
export class ConfigModule extends BaseHandler {

    private static readonly PUBLISHED_KEY = 'config';
    private static readonly DRAFT_KEY = 'config:draft';
    private static readonly ARCHIVE_PREFIX = 'config:archive:';
    private static readonly MANIFEST_KEY = 'config:versions';
    private static readonly DRAFT_DEFAULT_NAME = 'Working draft';
    private static readonly PUBLISHED_DEFAULT_NAME = 'Published';

    // --- storage helpers -----------------------------------------------------

    private getStoredConfig = async (store: Store, storeKey: string, path: string): Promise<SiteConfig> => {
        const stored = await store.get(storeKey);
        if (!stored) {
            throw ErrorResponses.notFound(`Store key ${storeKey}`, path);
        }
        return SiteConfigSchema.parse(JSON.parse(String(stored)));
    };

    /** Maps an API-facing version id to its blob key. */
    private blobKeyForId = (id: string): string => {
        if (id === 'published') return ConfigModule.PUBLISHED_KEY;
        if (id === 'draft') return ConfigModule.DRAFT_KEY;
        return `${ConfigModule.ARCHIVE_PREFIX}${id}`;
    };

    /** UTC `YYYYMMDDHHMMSS`, e.g. `20260702160435`. */
    private formatTimestamp = (date: Date): string => {
        const p = (n: number, len = 2) => String(n).padStart(len, '0');
        return `${p(date.getUTCFullYear(), 4)}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}` +
            `${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`;
    };

    /** Best-effort ISO from an archive id (used only on manifest recovery). */
    private idToIso = (id: string): string | undefined => {
        const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(id);
        if (!m) return undefined;
        return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])).toISOString();
    };

    private saveManifest = async (store: Store, manifest: ConfigVersionsManifest): Promise<void> => {
        await store.set(ConfigModule.MANIFEST_KEY, JSON.stringify(manifest));
    };

    /**
     * Returns the version manifest, rebuilding it from the store if the manifest
     * blob is missing (e.g. a store seeded with only the published config).
     */
    private getManifest = async (store: Store): Promise<ConfigVersionsManifest> => {
        const raw = await store.get(ConfigModule.MANIFEST_KEY);
        if (raw) {
            return ConfigVersionsManifestSchema.parse(JSON.parse(String(raw)));
        }
        const { blobs } = await store.list({ prefix: ConfigModule.ARCHIVE_PREFIX });
        const archives = blobs
            .map((b) => {
                const id = b.key.slice(ConfigModule.ARCHIVE_PREFIX.length);
                return { key: id, name: id, archivedAt: this.idToIso(id) };
            })
            .sort((a, b) => b.key.localeCompare(a.key));
        const draftExists = Boolean(await store.get(ConfigModule.DRAFT_KEY));
        const manifest: ConfigVersionsManifest = {
            published: { key: 'published', name: ConfigModule.PUBLISHED_DEFAULT_NAME },
            draft: draftExists ? { key: 'draft', name: ConfigModule.DRAFT_DEFAULT_NAME } : null,
            archives,
        };
        await this.saveManifest(store, manifest);
        return manifest;
    };

    /** Returns the draft if one exists, otherwise the published config (no side effects). */
    private readDraft = async (store: Store, path: string): Promise<SiteConfig> => {
        const existing = await store.get(ConfigModule.DRAFT_KEY);
        if (existing) {
            return SiteConfigSchema.parse(JSON.parse(String(existing)));
        }
        return this.getStoredConfig(store, ConfigModule.PUBLISHED_KEY, path);
    };

    /**
     * Persists the draft and reflects it in the manifest. A draft blob only ever
     * exists once there are pending changes, so `manifest.draft` doubles as the
     * "has unpublished changes" flag. Passing `name` (re)labels the draft; a freshly
     * created draft otherwise defaults to "Working draft".
     */
    private writeDraft = async (store: Store, config: SiteConfig, name?: string): Promise<void> => {
        await store.set(ConfigModule.DRAFT_KEY, JSON.stringify(config));
        const manifest = await this.getManifest(store);
        if (name) {
            manifest.draft = { key: 'draft', name };
            await this.saveManifest(store, manifest);
        } else if (!manifest.draft) {
            manifest.draft = { key: 'draft', name: ConfigModule.DRAFT_DEFAULT_NAME };
            await this.saveManifest(store, manifest);
        }
    };

    /** Finds a free archive id, disambiguating same-second collisions with `-N`. */
    private uniqueArchiveId = async (store: Store, timestamp: string): Promise<string> => {
        let id = timestamp;
        let n = 1;
        while (await store.get(`${ConfigModule.ARCHIVE_PREFIX}${id}`)) {
            id = `${timestamp}-${n++}`;
        }
        return id;
    };

    /**
     * Archives the current published config and makes `next` the live config, named
     * `name`. Shared by publish (draft) and re-publish (archive rollback).
     */
    private promoteToPublished = async (
        store: Store,
        manifest: ConfigVersionsManifest,
        next: SiteConfig,
        name: string,
        path: string,
    ): Promise<void> => {
        const outgoing = await this.getStoredConfig(store, ConfigModule.PUBLISHED_KEY, path);
        const now = new Date();
        const id = await this.uniqueArchiveId(store, this.formatTimestamp(now));
        const archivedAt = now.toISOString();
        await store.set(`${ConfigModule.ARCHIVE_PREFIX}${id}`, JSON.stringify(outgoing));
        manifest.archives.unshift({ key: id, name: `${manifest.published.name}_${id}`, archivedAt });

        await store.set(ConfigModule.PUBLISHED_KEY, JSON.stringify(next));
        manifest.published = { key: 'published', name };
    };

    // --- endpoint handlers ---------------------------------------------------

    private getConfig = async (store: Store, storeKey: string, path: string): Promise<Response> => {
        const config = await this.getStoredConfig(store, storeKey, path);
        return this.createSuccessResponse<SiteConfig>(config);
    };

    private getDraft = async (store: Store, path: string): Promise<Response> => {
        const draft = await this.readDraft(store, path);
        return this.createSuccessResponse<SiteConfig>(draft);
    };

    /** PUT /api/config/site — merge the `site` section into the DRAFT. */
    private updateSite = async (store: Store, body: string, path: string): Promise<Response> => {
        const site = SiteThemeConfigSchema.parse(JSON.parse(body));
        const current = await this.readDraft(store, path);
        const merged = SiteConfigSchema.parse({ ...current, site });
        await this.writeDraft(store, merged);
        return this.createSuccessResponse({ message: 'Site settings updated successfully' });
    };

    /** POST /api/config — replace the whole DRAFT (never writes live). */
    private setDraft = async (store: Store, body: string): Promise<Response> => {
        const config = SiteConfigSchema.parse(JSON.parse(body));
        await this.writeDraft(store, config);
        return this.createSuccessResponse({ message: 'Draft updated successfully' });
    };

    /** POST /api/config/publish — promote the draft to live. */
    private publishDraft = async (store: Store, path: string): Promise<Response> => {
        const draftRaw = await store.get(ConfigModule.DRAFT_KEY);
        if (!draftRaw) {
            throw ErrorResponses.conflict('No draft to publish', path);
        }
        const draft = SiteConfigSchema.parse(JSON.parse(String(draftRaw)));
        const published = await this.getStoredConfig(store, ConfigModule.PUBLISHED_KEY, path);
        if (JSON.stringify(draft) === JSON.stringify(published)) {
            throw ErrorResponses.conflict('Draft matches the published config; nothing to publish', path);
        }

        const manifest = await this.getManifest(store);
        const name = manifest.draft?.name ?? ConfigModule.PUBLISHED_DEFAULT_NAME;
        await this.promoteToPublished(store, manifest, draft, name, path);

        // Clear the draft so it is re-derived from the new published on next read.
        await store.delete(ConfigModule.DRAFT_KEY);
        manifest.draft = null;
        await this.saveManifest(store, manifest);

        return this.createSuccessResponse({ message: 'Configuration published successfully', published: manifest.published });
    };

    /** GET /api/config/versions — the manifest. */
    private listVersions = async (store: Store): Promise<Response> => {
        const manifest = await this.getManifest(store);
        return this.createSuccessResponse<ConfigVersionsManifest>(manifest);
    };

    /** GET /api/config/versions/:key — a version's SiteConfig (for download). */
    private getVersion = async (store: Store, key: string, path: string): Promise<Response> => {
        const config = await this.getStoredConfig(store, this.blobKeyForId(key), path);
        return this.createSuccessResponse<SiteConfig>(config);
    };

    /** POST /api/config/import — upload a config as the new named draft. */
    private importDraft = async (store: Store, body: string, path: string): Promise<Response> => {
        const parsed = ConfigImportRequestSchema.safeParse(JSON.parse(body));
        if (!parsed.success) {
            throw ErrorResponses.invalidRequest('Invalid configuration file', path);
        }
        const { name, config } = parsed.data;
        await this.writeDraft(store, config, name);
        return this.createSuccessResponse({ message: 'Configuration imported as draft', draft: { key: 'draft', name } });
    };

    /** PUT /api/config/versions/:key — rename a version. */
    private renameVersion = async (store: Store, key: string, body: string, path: string): Promise<Response> => {
        const { name } = ConfigRenameRequestSchema.parse(JSON.parse(body));
        const manifest = await this.getManifest(store);
        if (key === 'published') {
            manifest.published.name = name;
        } else if (key === 'draft') {
            if (!manifest.draft) throw ErrorResponses.notFound('Draft', path);
            manifest.draft.name = name;
        } else {
            const archive = manifest.archives.find((a) => a.key === key);
            if (!archive) throw ErrorResponses.notFound(`Version ${key}`, path);
            archive.name = name;
        }
        await this.saveManifest(store, manifest);
        return this.createSuccessResponse({ message: 'Version renamed successfully' });
    };

    /** POST /api/config/versions/:key/publish — roll back to an archive. */
    private republishVersion = async (store: Store, key: string, path: string): Promise<Response> => {
        if (key === 'published' || key === 'draft') {
            throw ErrorResponses.invalidRequest('Only archives can be re-published', path);
        }
        const manifest = await this.getManifest(store);
        const index = manifest.archives.findIndex((a) => a.key === key);
        if (index === -1) throw ErrorResponses.notFound(`Version ${key}`, path);
        const archiveSummary = manifest.archives[index];
        const archiveConfig = await this.getStoredConfig(store, this.blobKeyForId(key), path);

        // The archive being restored leaves the history and becomes the live config;
        // the previously-published config is archived by promoteToPublished.
        manifest.archives.splice(index, 1);
        await store.delete(this.blobKeyForId(key));
        await this.promoteToPublished(store, manifest, archiveConfig, archiveSummary.name, path);
        await this.saveManifest(store, manifest);

        return this.createSuccessResponse({ message: 'Archive re-published successfully', published: manifest.published });
    };

    /** DELETE /api/config/versions/:key — delete an archive. */
    private deleteVersion = async (store: Store, key: string, path: string): Promise<Response> => {
        if (key === 'published' || key === 'draft') {
            throw ErrorResponses.invalidRequest('Cannot delete the published or draft configuration', path);
        }
        const manifest = await this.getManifest(store);
        const index = manifest.archives.findIndex((a) => a.key === key);
        if (index === -1) throw ErrorResponses.notFound(`Version ${key}`, path);
        await store.delete(this.blobKeyForId(key));
        manifest.archives.splice(index, 1);
        await this.saveManifest(store, manifest);
        return this.createSuccessResponse({ message: 'Version deleted successfully' });
    };

    // --- routing -------------------------------------------------------------

    private requireJson = (request: Request, path: string): void => {
        if (request.headers.get('Content-Type') !== 'application/json') {
            throw ErrorResponses.invalidRequest('Invalid content type', path);
        }
    };

    /** Extracts the `:key` segment from `/api/config/versions/:key[/publish]`. */
    private versionKey = (pathname: string, context: Context): string => {
        const fromParams = context.params?.key;
        if (fromParams) return decodeURIComponent(fromParams);
        const parts = pathname.split('/').filter(Boolean); // ['api','config','versions','<key>', ...]
        return decodeURIComponent(parts[3] ?? '');
    };

    override handle: RequestHandler = async (request, context) => {
        const path = request.url;
        const pathname = new URL(request.url).pathname;
        const method = request.method;
        const storeName = `${Netlify.env.get('APP_NAME')}-store`;
        try {
            const store = getStore(storeName);
            // Seed the published config on a fresh dev store; the draft/archives derive from it.
            await seedBlob(store, 'siteConfig.json', SiteConfigSchema, ConfigModule.PUBLISHED_KEY);

            // Reads
            if (method === 'GET' && pathname === '/api/config') {
                return await this.getConfig(store, ConfigModule.PUBLISHED_KEY, path);
            }
            if (method === 'GET' && pathname === '/api/config/draft') {
                return await this.getDraft(store, path);
            }
            if (method === 'GET' && pathname === '/api/config/versions') {
                return await this.listVersions(store);
            }
            if (method === 'GET' && pathname.startsWith('/api/config/versions/')) {
                return await this.getVersion(store, this.versionKey(pathname, context), path);
            }

            // Mutations
            if (method === 'POST' && pathname === '/api/config') {
                this.requireJson(request, path);
                return await this.setDraft(store, await request.text());
            }
            if (method === 'PUT' && pathname === '/api/config/site') {
                this.requireJson(request, path);
                return await this.updateSite(store, await request.text(), path);
            }
            if (method === 'POST' && pathname === '/api/config/publish') {
                return await this.publishDraft(store, path);
            }
            if (method === 'POST' && pathname === '/api/config/import') {
                this.requireJson(request, path);
                return await this.importDraft(store, await request.text(), path);
            }
            if (method === 'POST' && pathname.startsWith('/api/config/versions/') && pathname.endsWith('/publish')) {
                return await this.republishVersion(store, this.versionKey(pathname, context), path);
            }
            if (method === 'PUT' && pathname.startsWith('/api/config/versions/')) {
                this.requireJson(request, path);
                return await this.renameVersion(store, this.versionKey(pathname, context), await request.text(), path);
            }
            if (method === 'DELETE' && pathname.startsWith('/api/config/versions/')) {
                return await this.deleteVersion(store, this.versionKey(pathname, context), path);
            }

            throw ErrorResponses.methodNotAllowed(method, ['GET', 'POST', 'PUT', 'DELETE'], path);
        } catch (error) {
            return this.handleError(error, path);
        }
    };
}
