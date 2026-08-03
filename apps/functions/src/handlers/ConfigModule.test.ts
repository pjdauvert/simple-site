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

const solarTheme = {
  themeName: 'Solar',
  primaryColor: '#f90',
  secondaryColor: '#333',
  linkColor: '#00f',
  linkHoverColor: '#00a',
  backgroundColor: '#fff',
  menuBackgroundColor: '#eee',
  menuHoverColor: '#ddd',
};

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

  // A route only becomes feature-reserved when its feature ships: configs stored
  // before that must stay readable (lenient StoredSiteConfigSchema on reads),
  // while writes keep rejecting reserved routes (strict SiteConfigSchema).
  const legacyContactPage = { pageName: 'contact', route: '/contact', menuTitle: 'Contact', sections: [] };

  it('GET /api/config still reads a stored config whose page uses a now-reserved route', async () => {
    makeStore({ config: { ...storedConfig, pages: [legacyContactPage] } });
    const res = await handle(jsonRequest('https://site.test/api/config', 'GET'));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.pages.map((p: { route: string }) => p.route)).toEqual(['/contact']);
  });

  it('POST /api/config still rejects an incoming config that claims a feature-reserved route', async () => {
    const { data } = makeStore();
    const res = await handle(
      jsonRequest('https://site.test/api/config', 'POST', { ...storedConfig, pages: [legacyContactPage] }),
    );
    expect(res.status).toBe(500); // ZodError → CONFIGURATION_ERROR, like every schema rejection
    expect(data.has('config:draft')).toBe(false);
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
    expect(draft.site).toEqual({ siteName: 'New Name', logoUrl: '/new.svg', containerMaxWidth: 'md', defaultLanguage: 'en' });
    expect(draft.themes).toEqual(storedConfig.themes); // untouched
    const draftSummary = JSON.parse(data.get('config:versions')!).draft;
    expect(draftSummary).not.toBeNull();
    expect(draftSummary.name).toMatch(/^version_\d{14}$/); // default name
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

  it('POST /api/config replaces the whole DRAFT and leaves the published config untouched', async () => {
    const { data } = makeStore();
    const config = { ...storedConfig, pages: [{ menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] }] };
    const res = await handle(jsonRequest('https://site.test/api/config', 'POST', config));
    expect(res.status).toBe(200);
    expect(JSON.parse(data.get('config:draft')!).pages).toHaveLength(1);
    expect(JSON.parse(data.get('config')!).pages).toEqual([]); // published untouched
  });

  it('POST /api/config rejects duplicate page routes (uniqueness enforced server-side)', async () => {
    const { store } = makeStore();
    const config = {
      ...storedConfig,
      pages: [
        { menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] },
        { menuTitle: 'Home 2', pageName: 'page.home2', route: '/home', sections: [] },
      ],
    };
    const res = await handle(jsonRequest('https://site.test/api/config', 'POST', config));
    expect(res.status).toBe(500);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFIGURATION_ERROR);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('POST /api/config rejects duplicate page names (uniqueness enforced server-side)', async () => {
    const { store } = makeStore();
    const config = {
      ...storedConfig,
      pages: [
        { menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] },
        { menuTitle: 'Home 2', pageName: 'page.home', route: '/home2', sections: [] },
      ],
    };
    const res = await handle(jsonRequest('https://site.test/api/config', 'POST', config));
    expect(res.status).toBe(500);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFIGURATION_ERROR);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('PUT /api/config/site 404s when no config is stored yet', async () => {
    makeStore({});
    const res = await handle(jsonRequest('https://site.test/api/config/site', 'PUT', { siteName: 'X' }));
    expect(res.status).toBe(404);
    expect((await readJson(res)).code).toBe(ErrorCode.NOT_FOUND);
  });

  it('PUT /api/config/themes writes the DRAFT themes and leaves the published config untouched', async () => {
    const { data } = makeStore();
    const newThemes = [solarTheme];
    const res = await handle(jsonRequest('https://site.test/api/config/themes', 'PUT', newThemes));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.message).toMatch(/updated/i);

    // Published stays as-is; the change lands on the draft.
    expect(JSON.parse(data.get('config')!).themes).toEqual(storedConfig.themes);
    const draft = JSON.parse(data.get('config:draft')!);
    expect(draft.themes).toEqual(newThemes);
    // Site untouched (the schema injects the defaultLanguage default on parse).
    expect(draft.site).toEqual({ ...storedConfig.site, defaultLanguage: 'en' });
    expect(draft.pages).toEqual(storedConfig.pages); // pages untouched
  });

  it('PUT /api/config/themes accepts an empty themes array', async () => {
    const { data } = makeStore();
    const res = await handle(jsonRequest('https://site.test/api/config/themes', 'PUT', []));
    expect(res.status).toBe(200);
    expect(JSON.parse(data.get('config:draft')!).themes).toEqual([]);
  });

  it('PUT /api/config/themes rejects an invalid theme (missing required color)', async () => {
    const { data } = makeStore();
    const res = await handle(jsonRequest('https://site.test/api/config/themes', 'PUT', [{ themeName: 'Bad' }]));
    expect(res.status).toBe(500);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFIGURATION_ERROR);
    expect(data.has('config:draft')).toBe(false); // nothing written on a validation failure
  });

  it('PUT /api/config/themes requires an application/json content type', async () => {
    const { store } = makeStore();
    const res = await handle(jsonRequest('https://site.test/api/config/themes', 'PUT', [], 'text/plain'));
    expect(res.status).toBe(400);
    expect((await readJson(res)).code).toBe(ErrorCode.INVALID_REQUEST);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('PUT /api/config/menu writes the DRAFT menu and leaves pages/themes/site untouched', async () => {
    const config = { ...storedConfig, pages: [{ menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] }] };
    const { data } = makeStore({ config });
    const menu = { entries: [
      { type: 'feature', feature: 'team', visible: false },
      { type: 'page', pageName: 'page.home', visible: true },
    ] };
    const res = await handle(jsonRequest('https://site.test/api/config/menu', 'PUT', menu));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.message).toMatch(/updated/i);

    const draft = JSON.parse(data.get('config:draft')!);
    expect(draft.menu).toEqual(menu);
    expect(draft.pages).toEqual(config.pages);
    expect(draft.themes).toEqual(config.themes);
    expect(JSON.parse(data.get('config')!).menu).toBeUndefined(); // published untouched
  });

  it('PUT /api/config/menu rejects an entry referencing an unknown page', async () => {
    const { data } = makeStore();
    const menu = { entries: [{ type: 'page', pageName: 'page.ghost', visible: true }] };
    const res = await handle(jsonRequest('https://site.test/api/config/menu', 'PUT', menu));
    expect(res.status).toBe(500);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFIGURATION_ERROR);
    expect(data.has('config:draft')).toBe(false);
  });

  it('PUT /api/config/menu rejects duplicate entries', async () => {
    const config = { ...storedConfig, pages: [{ menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] }] };
    const { data } = makeStore({ config });
    const menu = { entries: [
      { type: 'page', pageName: 'page.home', visible: true },
      { type: 'page', pageName: 'page.home', visible: false },
    ] };
    const res = await handle(jsonRequest('https://site.test/api/config/menu', 'PUT', menu));
    expect(res.status).toBe(500);
    expect(data.has('config:draft')).toBe(false);
  });

  it('PUT /api/config/menu accepts a group with page and feature children and writes the DRAFT', async () => {
    const config = { ...storedConfig, pages: [{ menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] }] };
    const { data } = makeStore({ config });
    const menu = { entries: [
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, alwaysExpanded: true, children: [
        { type: 'page', pageName: 'page.home', visible: true },
        { type: 'feature', feature: 'team', visible: false },
      ] },
    ] };
    const res = await handle(jsonRequest('https://site.test/api/config/menu', 'PUT', menu));
    expect(res.status).toBe(200);
    expect(JSON.parse(data.get('config:draft')!).menu).toEqual(menu);
    expect(JSON.parse(data.get('config')!).menu).toBeUndefined(); // published untouched
  });

  it('PUT /api/config/menu accepts an empty group', async () => {
    const { data } = makeStore();
    const menu = { entries: [{ type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [] }] };
    const res = await handle(jsonRequest('https://site.test/api/config/menu', 'PUT', menu));
    expect(res.status).toBe(200);
    expect(JSON.parse(data.get('config:draft')!).menu).toEqual(menu);
  });

  it('PUT /api/config/menu rejects a group child referencing an unknown page', async () => {
    const { data } = makeStore();
    const menu = { entries: [
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
        { type: 'page', pageName: 'page.ghost', visible: true },
      ] },
    ] };
    const res = await handle(jsonRequest('https://site.test/api/config/menu', 'PUT', menu));
    expect(res.status).toBe(500);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFIGURATION_ERROR);
    expect(data.has('config:draft')).toBe(false);
  });

  it('PUT /api/config/menu rejects the same entry at the top level and inside a group', async () => {
    const config = { ...storedConfig, pages: [{ menuTitle: 'Home', pageName: 'page.home', route: '/home', sections: [] }] };
    const { data } = makeStore({ config });
    const menu = { entries: [
      { type: 'page', pageName: 'page.home', visible: true },
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
        { type: 'page', pageName: 'page.home', visible: false },
      ] },
    ] };
    const res = await handle(jsonRequest('https://site.test/api/config/menu', 'PUT', menu));
    expect(res.status).toBe(500);
    expect(data.has('config:draft')).toBe(false);
  });

  it('PUT /api/config/menu rejects two groups sharing a groupId', async () => {
    const { data } = makeStore();
    const menu = { entries: [
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [] },
      { type: 'group', groupId: 'more', menuTitle: 'Other', visible: true, children: [] },
    ] };
    const res = await handle(jsonRequest('https://site.test/api/config/menu', 'PUT', menu));
    expect(res.status).toBe(500);
    expect(data.has('config:draft')).toBe(false);
  });

  it('PUT /api/config/menu rejects a group nested inside a group (depth 1 only)', async () => {
    const { data } = makeStore();
    const menu = { entries: [
      { type: 'group', groupId: 'outer', menuTitle: 'Outer', visible: true, children: [
        { type: 'group', groupId: 'inner', menuTitle: 'Inner', visible: true, children: [] },
      ] },
    ] };
    const res = await handle(jsonRequest('https://site.test/api/config/menu', 'PUT', menu));
    expect(res.status).toBe(500);
    expect(data.has('config:draft')).toBe(false);
  });

  it('PUT /api/config/menu stores the menu-wide groupDisplay and rejects unknown values', async () => {
    const { data } = makeStore();
    const menu = { entries: [], groupDisplay: 'bar' };
    const res = await handle(jsonRequest('https://site.test/api/config/menu', 'PUT', menu));
    expect(res.status).toBe(200);
    expect(JSON.parse(data.get('config:draft')!).menu).toEqual(menu);

    const bad = { entries: [], groupDisplay: 'sidebar' };
    expect((await handle(jsonRequest('https://site.test/api/config/menu', 'PUT', bad))).status).toBe(500);
  });

  it('PUT /api/config/menu rejects an invalid groupId and an empty group label', async () => {
    const { data } = makeStore();
    const badId = { entries: [{ type: 'group', groupId: 'my-group', menuTitle: 'More', visible: true, children: [] }] };
    expect((await handle(jsonRequest('https://site.test/api/config/menu', 'PUT', badId))).status).toBe(500);
    const emptyLabel = { entries: [{ type: 'group', groupId: 'more', menuTitle: '', visible: true, children: [] }] };
    expect((await handle(jsonRequest('https://site.test/api/config/menu', 'PUT', emptyLabel))).status).toBe(500);
    expect(data.has('config:draft')).toBe(false);
  });

  it('POST /api/config rejects a page using a feature-reserved route', async () => {
    const { data } = makeStore();
    const config = { ...storedConfig, pages: [{ menuTitle: 'Team', pageName: 'page.team', route: '/team', sections: [] }] };
    const res = await handle(jsonRequest('https://site.test/api/config', 'POST', config));
    expect(res.status).toBe(500);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFIGURATION_ERROR);
    expect(data.has('config:draft')).toBe(false);
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

  // Seeds `config`, a `Draft`, and `count` archives A1..A<count> (A1 oldest).
  const seedAtCap = (count: number) => {
    const seed: Record<string, unknown> = { config: storedConfig, 'config:draft': withSiteName('Draft') };
    const archives: { key: string; name: string; createdAt: string }[] = [];
    for (let i = 1; i <= count; i++) {
      const key = String(20200101000000 + i);
      seed[`config:archive:${key}`] = withSiteName(`A${i}`);
      archives.push({ key, name: `A${i}`, createdAt: `2020-01-01T00:00:${String(i).padStart(2, '0')}.000Z` });
    }
    archives.reverse(); // newest-first; oldest = A1 (key ...0001)
    seed['config:versions'] = manifest({
      draft: { key: 'draft', name: 'Draft', createdAt: '2021-01-01T00:00:00.000Z' },
      archives,
    });
    return makeStore(seed);
  };

  it('publishing at the version cap erases the oldest archive', async () => {
    const { data } = seedAtCap(9); // published + 9 archives = 10 = MAX
    const res = await handle(jsonRequest('https://site.test/api/config/publish', 'POST'));
    expect(res.status).toBe(200);

    const m = JSON.parse(data.get('config:versions')!);
    expect(1 + m.archives.length).toBeLessThanOrEqual(10); // published + archives within cap
    expect(m.archives).toHaveLength(9);
    expect(m.archives.some((a: { key: string }) => a.key === '20200101000001')).toBe(false); // oldest gone
    expect(data.has('config:archive:20200101000001')).toBe(false);
  });

  it('importing at the version cap archives the draft and erases the oldest archive', async () => {
    const { data } = seedAtCap(9);
    const res = await handle(
      jsonRequest('https://site.test/api/config/import', 'POST', { name: 'Imported', config: withSiteName('From File') }),
    );
    expect(res.status).toBe(200);

    const m = JSON.parse(data.get('config:versions')!);
    expect(m.archives).toHaveLength(9); // old draft archived, oldest pruned
    expect(data.has('config:archive:20200101000001')).toBe(false);
    expect(JSON.parse(data.get('config:draft')!).site.siteName).toBe('From File');
  });

  it('POST /api/config/versions/:key/draft starts a draft from an archive (no existing draft)', async () => {
    const { data } = makeStore({
      config: storedConfig,
      'config:archive:20200101000000': withSiteName('Archived'),
      'config:versions': manifest({ archives: [{ key: '20200101000000', name: 'Snapshot', createdAt: '2020-01-01T00:00:00.000Z' }] }),
    });
    const res = await handle(jsonRequest('https://site.test/api/config/versions/20200101000000/draft', 'POST'));
    expect(res.status).toBe(200);
    // Draft now holds the archive's content; the source archive is untouched.
    expect(JSON.parse(data.get('config:draft')!).site.siteName).toBe('Archived');
    expect(data.has('config:archive:20200101000000')).toBe(true);
    const m = JSON.parse(data.get('config:versions')!);
    expect(m.draft).not.toBeNull();
    expect(m.archives.map((a: { key: string }) => a.key)).toContain('20200101000000');
  });

  it('starting a draft from a version archives the existing draft first', async () => {
    const { data } = makeStore({
      config: storedConfig,
      'config:draft': withSiteName('Old Draft'),
      'config:archive:20200101000000': withSiteName('Archived'),
      'config:versions': manifest({
        draft: { key: 'draft', name: 'Old Draft', createdAt: '2021-01-01T00:00:00.000Z' },
        archives: [{ key: '20200101000000', name: 'Snapshot', createdAt: '2020-01-01T00:00:00.000Z' }],
      }),
    });
    const res = await handle(jsonRequest('https://site.test/api/config/versions/20200101000000/draft', 'POST'));
    expect(res.status).toBe(200);
    // New draft = archive content; the previous draft was archived (never discarded).
    expect(JSON.parse(data.get('config:draft')!).site.siteName).toBe('Archived');
    const archived = [...data.keys()]
      .filter((k) => k.startsWith('config:archive:'))
      .map((k) => JSON.parse(data.get(k)!).site.siteName);
    expect(archived).toContain('Old Draft');
  });

  it('POST /api/config/import archives an existing draft before replacing it', async () => {
    const { data } = makeStore({
      config: storedConfig,
      'config:draft': withSiteName('Old Draft'),
      'config:versions': manifest({ draft: { key: 'draft', name: 'Old Draft', createdAt: '2021-01-01T00:00:00.000Z' } }),
    });
    const res = await handle(
      jsonRequest('https://site.test/api/config/import', 'POST', { name: 'Imported', config: withSiteName('From File') }),
    );
    expect(res.status).toBe(200);
    expect(JSON.parse(data.get('config:draft')!).site.siteName).toBe('From File');
    const archived = [...data.keys()]
      .filter((k) => k.startsWith('config:archive:'))
      .map((k) => JSON.parse(data.get(k)!).site.siteName);
    expect(archived).toContain('Old Draft'); // previous draft preserved
    expect(JSON.parse(data.get('config:versions')!).draft.name).toBe('Imported');
  });

  it('GET /api/config/versions returns the manifest', async () => {
    makeStore();
    const res = await handle(jsonRequest('https://site.test/api/config/versions', 'GET'));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.published.key).toBe('published');
  });

  it('initial manifest for a seeded store has the published config and no draft/archives', async () => {
    makeStore({ config: storedConfig });
    const res = await handle(jsonRequest('https://site.test/api/config/versions', 'GET'));
    const body = await readJson(res);
    expect(body.data.published.key).toBe('published');
    expect(body.data.published.name).toMatch(/^version_\d{14}$/); // default name
    expect(body.data.published.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // seeded config gets a creation date
    expect(body.data.draft).toBeNull();
    expect(body.data.archives).toHaveLength(0);
  });

  it('rebuild ignores non-archive keys even when list() does not honour the prefix', async () => {
    const { store, data } = makeStore({ config: storedConfig, translations: { en: {} }, 'config:draft': storedConfig });
    // Simulate the local dev list() returning every key regardless of `prefix`.
    store.list.mockImplementation(async () => ({
      blobs: [...data.keys()].map((key) => ({ key, etag: 'e' })),
      directories: [],
    }));
    const res = await handle(jsonRequest('https://site.test/api/config/versions', 'GET'));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.archives).toHaveLength(0);
  });

  it('GET /api/config/versions self-heals a manifest polluted with a phantom archive', async () => {
    const { data } = makeStore({
      config: storedConfig,
      'config:versions': manifest({
        draft: { key: 'draft', name: 'Working draft' },
        archives: [{ key: '', name: 'archive1' }],
      }),
    });
    const res = await handle(jsonRequest('https://site.test/api/config/versions', 'GET'));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.archives).toHaveLength(0);
    // The cleaned manifest is persisted.
    expect(JSON.parse(data.get('config:versions')!).archives).toHaveLength(0);
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
      'config:versions': manifest({ archives: [{ key: '20200101000000', name: 'Snapshot', createdAt: '2020-01-01T00:00:00.000Z' }] }),
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
      'config:versions': manifest({ archives: [{ key: '20200101000000', name: 'Snapshot', createdAt: '2020-01-01T00:00:00.000Z' }] }),
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
      'config:versions': manifest({ archives: [{ key: '20200101000000', name: 'Snapshot', createdAt: '2020-01-01T00:00:00.000Z' }] }),
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
