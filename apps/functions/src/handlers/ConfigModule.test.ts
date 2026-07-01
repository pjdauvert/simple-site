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

/** Stubs `getStore` with an in-memory store seeded from `initial` (null = missing key). */
const makeStore = (initial: unknown = storedConfig) => {
  const store = {
    get: vi.fn(async () => (initial === null ? null : JSON.stringify(initial))),
    set: vi.fn(async () => undefined),
  };
  vi.mocked(getStore).mockReturnValue(store as never);
  return store;
};

const ctx = {} as never;

describe('ConfigModule', () => {
  beforeEach(() => { vi.clearAllMocks(); stubEnv(); });
  afterEach(() => vi.unstubAllGlobals());

  it('PUT /api/config/site merges the site section and preserves themes/pages', async () => {
    const store = makeStore();
    const res = await new ConfigModule().handle(
      jsonRequest('https://site.test/api/config/site', 'PUT', {
        siteName: 'New Name',
        logoUrl: '/new.svg',
        containerMaxWidth: 'md',
      }),
      ctx,
    );

    expect(res.status).toBe(200);
    expect((await readJson(res)).data.message).toMatch(/updated/i);

    expect(store.set).toHaveBeenCalledTimes(1);
    const [key, value] = store.set.mock.calls[0] as unknown as [string, string];
    expect(key).toBe('config');
    const written = JSON.parse(value);
    expect(written.site).toEqual({ siteName: 'New Name', logoUrl: '/new.svg', containerMaxWidth: 'md' });
    expect(written.themes).toEqual(storedConfig.themes); // untouched
    expect(written.pages).toEqual([]);
  });

  it('PUT /api/config/site rejects an invalid site body (missing siteName)', async () => {
    const store = makeStore();
    const res = await new ConfigModule().handle(
      jsonRequest('https://site.test/api/config/site', 'PUT', { logoUrl: '/x.svg' }),
      ctx,
    );
    expect(res.status).toBe(500);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFIGURATION_ERROR);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('PUT /api/config/site requires an application/json content type', async () => {
    const store = makeStore();
    const res = await new ConfigModule().handle(
      jsonRequest('https://site.test/api/config/site', 'PUT', { siteName: 'X' }, 'text/plain'),
      ctx,
    );
    expect(res.status).toBe(400);
    expect((await readJson(res)).code).toBe(ErrorCode.INVALID_REQUEST);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('PUT /api/config/site 404s when no config is stored yet', async () => {
    makeStore(null);
    const res = await new ConfigModule().handle(
      jsonRequest('https://site.test/api/config/site', 'PUT', { siteName: 'X' }),
      ctx,
    );
    expect(res.status).toBe(404);
    expect((await readJson(res)).code).toBe(ErrorCode.NOT_FOUND);
  });

  it('PUT /api/config/themes replaces the themes array and preserves site/pages', async () => {
    const store = makeStore();
    const newThemes = [
      {
        themeName: 'Solar',
        primaryColor: '#f90',
        secondaryColor: '#09f',
        linkColor: '#f90',
        linkHoverColor: '#c70',
        backgroundColor: '#fff',
        menuBackgroundColor: '#eee',
        menuHoverColor: '#ddd',
      },
    ];
    const res = await new ConfigModule().handle(
      jsonRequest('https://site.test/api/config/themes', 'PUT', newThemes),
      ctx,
    );

    expect(res.status).toBe(200);
    expect((await readJson(res)).data.message).toMatch(/updated/i);

    const [key, value] = store.set.mock.calls[0] as unknown as [string, string];
    expect(key).toBe('config');
    const written = JSON.parse(value);
    expect(written.themes).toEqual(newThemes);
    expect(written.site).toEqual(storedConfig.site); // untouched
    expect(written.pages).toEqual([]);
  });

  it('PUT /api/config/themes rejects an invalid theme (missing required color)', async () => {
    const store = makeStore();
    const res = await new ConfigModule().handle(
      jsonRequest('https://site.test/api/config/themes', 'PUT', [{ themeName: 'Bad' }]),
      ctx,
    );
    expect(res.status).toBe(500);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFIGURATION_ERROR);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('PUT /api/config/themes accepts an empty themes array', async () => {
    const store = makeStore();
    const res = await new ConfigModule().handle(
      jsonRequest('https://site.test/api/config/themes', 'PUT', []),
      ctx,
    );
    expect(res.status).toBe(200);
    const [, value] = store.set.mock.calls[0] as unknown as [string, string];
    expect(JSON.parse(value).themes).toEqual([]);
  });

  it('GET /api/config returns the stored config', async () => {
    makeStore();
    const res = await new ConfigModule().handle(
      jsonRequest('https://site.test/api/config', 'GET'),
      ctx,
    );
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.site.siteName).toBe('Old Name');
  });

  it('rejects unsupported methods', async () => {
    makeStore();
    const res = await new ConfigModule().handle(
      jsonRequest('https://site.test/api/config', 'PATCH'),
      ctx,
    );
    expect(res.status).toBe(405);
  });
});
