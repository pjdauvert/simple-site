import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import handler from './config.mjs';

vi.mock('@netlify/blobs', () => ({ getStore: vi.fn() }));

// CONTEXT != 'dev' so AuthHandler actually enforces auth (netlify dev bypasses
// it) and seedBlob short-circuits without touching the store.
const BASE_ENV: Record<string, string> = {
  APP_NAME: 'test-app',
  CONTEXT: 'production',
  FEATURE_GALLERY: 'true',
};

const stubEnv = (env: Record<string, string | undefined> = BASE_ENV) =>
  vi.stubGlobal('Netlify', { env: { get: (k: string) => env[k] } });

const storedConfig = {
  site: { siteName: 'Site' },
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

/** Stubs `getStore` with an in-memory key/value store. */
const makeStore = (seed: Record<string, unknown> = { config: storedConfig }) => {
  const data = new Map<string, string>(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  const store = {
    get: vi.fn(async (key: string) => data.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => { data.set(key, value); }),
    delete: vi.fn(async (key: string) => { data.delete(key); }),
    list: vi.fn(async () => ({ blobs: [], directories: [] })),
  };
  vi.mocked(getStore).mockReturnValue(store as never);
  return { store, data };
};

const request = (method: string, path: string, body?: unknown) =>
  new Request(`https://site.test${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

const anonymous = {} as unknown as Context;
const asAdmin = { clientContext: { user: { email: 'admin@site.test' } } } as unknown as Context;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readJson = async (res: Response): Promise<any> => res.json();

const gallery = { items: [{ imageUrl: '/img/a.jpg', title: 'A' }], themes: [] };

/**
 * Entrypoint contract of `config.mts` for the gallery surface: the
 * FEATURE_GALLERY gate answers before auth on the gallery route only, while the
 * rest of the config surface — including reading a stored config that carries a
 * `gallery` attribute — is unaffected by the flag.
 */
describe('config entrypoint (gallery flag gate)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('404s PUT /api/config/gallery before auth when FEATURE_GALLERY is off', async () => {
    stubEnv({ ...BASE_ENV, FEATURE_GALLERY: undefined });
    const { store } = makeStore();
    const res = await handler(request('PUT', '/api/config/gallery', gallery), asAdmin);
    expect(res.status).toBe(404);
    expect(await readJson(res)).toMatchObject({ ok: false, code: 'NOT_FOUND' });
    expect(store.set).not.toHaveBeenCalled();
  });

  it('rejects the anonymous gallery mutation (401) when the flag is on', async () => {
    stubEnv();
    const { data } = makeStore();
    const res = await handler(request('PUT', '/api/config/gallery', gallery), anonymous);
    expect(res.status).toBe(401);
    expect(await readJson(res)).toMatchObject({ ok: false, code: 'UNAUTHORIZED' });
    expect(data.has('config:draft')).toBe(false);
  });

  it('accepts the gallery mutation with an identity and writes the draft', async () => {
    stubEnv();
    const { data } = makeStore();
    const res = await handler(request('PUT', '/api/config/gallery', gallery), asAdmin);
    expect(res.status).toBe(200);
    expect(JSON.parse(data.get('config:draft')!).gallery).toEqual(gallery);
  });

  it('keeps serving a stored config carrying a gallery attribute while the flag is off', async () => {
    stubEnv({ ...BASE_ENV, FEATURE_GALLERY: undefined });
    makeStore({ config: { ...storedConfig, gallery } });
    const res = await handler(request('GET', '/api/config'), anonymous);
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.gallery).toEqual(gallery);
  });
});
