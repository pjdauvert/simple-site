import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStore } from '@netlify/blobs';
import { ConfigModule } from './ConfigModule';
import { ErrorCode } from '@simple-site/interfaces';

vi.mock('@netlify/blobs', () => ({ getStore: vi.fn() }));

// CONTEXT != 'dev' so seedBlob short-circuits and never touches the store.
const ENV: Record<string, string> = { APP_NAME: 'test-app', CONTEXT: 'production' };

const stubEnv = (env: Record<string, string | undefined> = ENV) =>
  vi.stubGlobal('Netlify', { env: { get: (k: string) => env[k] } });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readJson = async (res: Response): Promise<any> => res.json();

const jsonRequest = (url: string, method: string, body?: unknown, contentType = 'application/json') =>
  new Request(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': contentType } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

const storedConfig = {
  site: { siteName: 'Old Name', logoUrl: '/old.svg' },
  themes: [
    {
      themeName: 'Light',
      primaryColor: '#111',
      secondaryColor: '#222',
      linkColor: '#333',
      linkHoverColor: '#444',
      backgroundColor: '#fff',
      menuBackgroundColor: '#eee',
      menuHoverColor: '#ddd',
    },
  ],
  pages: [],
};

const withSiteName = (name: string) => ({ ...storedConfig, site: { ...storedConfig.site, siteName: name } });

const manifest = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    published: { key: 'published', name: 'Published' },
    draft: null,
    archives: [],
    ...over,
  });

/** Stubs `getStore` with an in-memory key/value store implementing get/set/delete/list. */
const makeStore = (seed: Record<string, unknown> = { config: storedConfig }) => {
  const data = new Map<string, string>(
    Object.entries(seed).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
  );
  const store = {
    get: vi.fn(async (key: string) => data.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => { data.set(key, value); }),
    delete: vi.fn(async (key: string) => { data.delete(key); }),
    list: vi.fn(async ({ prefix }: { prefix: string }) => ({
      blobs: [...data.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key, etag: 'e' })),
      directories: [],
    })),
  };
  vi.mocked(getStore).mockReturnValue(store as never);
  return { store, data };
};

const ctx = {} as never;
const handle = (request: Request) => new ConfigModule().handle(request, ctx);

describe('ConfigModule', () => {
  beforeEach(() => { vi.clearAllMocks(); stubEnv(); });
  afterEach(() => vi.unstubAllGlobals());

  it('GET /api/config returns the published config', async () => {
    makeStore();
    const res = await handle(jsonRequest('https://site.test/api/config', 'GET'));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.site.siteName).toBe('Old Name');
  });

  it('GET /api/config/draft returns the published config when no draft exists (no side effects)', async () => {
    const { data } = makeStore();
    const res = await handle(jsonRequest('https://site.test/api/config/draft', 'GET'));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.site.siteName).toBe('Old Name');
    expect(data.has('config:draft')).toBe(false);
  });

  it('PUT /api/config/site writes the DRAFT and leaves the published config untouched', async () => {
    const { data } = makeStore();
    const res = await handle(
      jsonRequest('https://site.test/api/config/site', 'PUT', {
        siteName: 'New Name',
        logoUrl: '/new.svg',
        containerMaxWidth: 'md',
      }),
    );
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.message).toMatch(/updated/i);

    // Published stays as-is; the change lands on the draft.
    expect(JSON.parse(data.get('config')!).site.siteName).toBe('Old Name');
    const draft = JSON.parse(data.get('config:draft')!);
    expect(draft.site).toEqual({ siteName: 'New Name', logoUrl: '/new.svg', containerMaxWidth: 'md' });
    expect(draft.themes).toEqual(storedConfig.themes); // untouched
    expect(JSON.parse(data.get('config:versions')!).draft).not.toBeNull();
  });

  it('PUT /api/config/site rejects an invalid site body (missing siteName)', async () => {
    const { store } = makeStore();
    const res = await handle(jsonRequest('https://site.test/api/config/site', 'PUT', { logoUrl: '/x.svg' }));
    expect(res.status).toBe(500);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFIGURATION_ERROR);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('PUT /api/config/site requires an application/json content type', async () => {
    const { store } = makeStore();
    const res = await handle(
      jsonRequest('https://site.test/api/config/site', 'PUT', { siteName: 'X' }, 'text/plain'),
    );
    expect(res.status).toBe(400);
    expect((await readJson(res)).code).toBe(ErrorCode.INVALID_REQUEST);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('PUT /api/config/site 404s when no config is stored yet', async () => {
    makeStore({});
    const res = await handle(jsonRequest('https://site.test/api/config/site', 'PUT', { siteName: 'X' }));
    expect(res.status).toBe(404);
    expect((await readJson(res)).code).toBe(ErrorCode.NOT_FOUND);
  });

  it('POST /api/config/publish promotes the draft and archives the previous published config', async () => {
    const { data } = makeStore({ config: storedConfig, 'config:draft': withSiteName('Draft Name') });
    const res = await handle(jsonRequest('https://site.test/api/config/publish', 'POST'));
    expect(res.status).toBe(200);

    // Draft is now live and cleared.
    expect(JSON.parse(data.get('config')!).site.siteName).toBe('Draft Name');
    expect(data.has('config:draft')).toBe(false);

    // The previous published config was archived.
    const archiveKeys = [...data.keys()].filter((k) => k.startsWith('config:archive:'));
    expect(archiveKeys).toHaveLength(1);
    expect(JSON.parse(data.get(archiveKeys[0])!).site.siteName).toBe('Old Name');

    const m = JSON.parse(data.get('config:versions')!);
    expect(m.draft).toBeNull();
    expect(m.archives).toHaveLength(1);
  });

  it('POST /api/config/publish rejects when there is no draft', async () => {
    makeStore();
    const res = await handle(jsonRequest('https://site.test/api/config/publish', 'POST'));
    expect(res.status).toBe(409);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFLICT);
  });

  it('POST /api/config/publish rejects a no-op (draft equals published)', async () => {
    makeStore({ config: storedConfig, 'config:draft': storedConfig });
    const res = await handle(jsonRequest('https://site.test/api/config/publish', 'POST'));
    expect(res.status).toBe(409);
  });

  it('GET /api/config/versions returns the manifest', async () => {
    makeStore();
    const res = await handle(jsonRequest('https://site.test/api/config/versions', 'GET'));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.published.key).toBe('published');
  });

  it('POST /api/config/import stores the uploaded config as the named draft', async () => {
    const { data } = makeStore();
    const res = await handle(
      jsonRequest('https://site.test/api/config/import', 'POST', { name: 'Imported', config: withSiteName('From File') }),
    );
    expect(res.status).toBe(200);
    expect(JSON.parse(data.get('config:draft')!).site.siteName).toBe('From File');
    expect(JSON.parse(data.get('config:versions')!).draft.name).toBe('Imported');
  });

  it('POST /api/config/import rejects an invalid configuration', async () => {
    makeStore();
    const res = await handle(
      jsonRequest('https://site.test/api/config/import', 'POST', { name: 'Bad', config: { nonsense: true } }),
    );
    expect(res.status).toBe(400);
    expect((await readJson(res)).code).toBe(ErrorCode.INVALID_REQUEST);
  });

  it('PUT /api/config/versions/:key renames an archive', async () => {
    const { data } = makeStore({
      config: storedConfig,
      'config:archive:20200101000000': withSiteName('Snapshot'),
      'config:versions': manifest({ archives: [{ key: '20200101000000', name: 'Snapshot', archivedAt: '2020-01-01T00:00:00.000Z' }] }),
    });
    const res = await handle(
      jsonRequest('https://site.test/api/config/versions/20200101000000', 'PUT', { name: 'Renamed' }),
    );
    expect(res.status).toBe(200);
    expect(JSON.parse(data.get('config:versions')!).archives[0].name).toBe('Renamed');
  });

  it('DELETE /api/config/versions/:key removes an archive', async () => {
    const { data } = makeStore({
      config: storedConfig,
      'config:archive:20200101000000': withSiteName('Snapshot'),
      'config:versions': manifest({ archives: [{ key: '20200101000000', name: 'Snapshot', archivedAt: '2020-01-01T00:00:00.000Z' }] }),
    });
    const res = await handle(jsonRequest('https://site.test/api/config/versions/20200101000000', 'DELETE'));
    expect(res.status).toBe(200);
    expect(data.has('config:archive:20200101000000')).toBe(false);
    expect(JSON.parse(data.get('config:versions')!).archives).toHaveLength(0);
  });

  it('DELETE /api/config/versions/published is rejected', async () => {
    makeStore();
    const res = await handle(jsonRequest('https://site.test/api/config/versions/published', 'DELETE'));
    expect(res.status).toBe(400);
    expect((await readJson(res)).code).toBe(ErrorCode.INVALID_REQUEST);
  });

  it('POST /api/config/versions/:key/publish rolls back to an archive', async () => {
    const { data } = makeStore({
      config: storedConfig,
      'config:archive:20200101000000': withSiteName('Archived'),
      'config:versions': manifest({ archives: [{ key: '20200101000000', name: 'Snapshot', archivedAt: '2020-01-01T00:00:00.000Z' }] }),
    });
    const res = await handle(
      jsonRequest('https://site.test/api/config/versions/20200101000000/publish', 'POST'),
    );
    expect(res.status).toBe(200);

    // The archive is now live; the previously-published config was archived in its place.
    expect(JSON.parse(data.get('config')!).site.siteName).toBe('Archived');
    expect(data.has('config:archive:20200101000000')).toBe(false);
    const archiveKeys = [...data.keys()].filter((k) => k.startsWith('config:archive:'));
    expect(archiveKeys).toHaveLength(1);
    expect(JSON.parse(data.get(archiveKeys[0])!).site.siteName).toBe('Old Name');
    expect(JSON.parse(data.get('config:versions')!).published.name).toBe('Snapshot');
  });

  it('rejects unsupported methods', async () => {
    makeStore();
    const res = await handle(jsonRequest('https://site.test/api/config', 'PATCH'));
    expect(res.status).toBe(405);
  });
});
