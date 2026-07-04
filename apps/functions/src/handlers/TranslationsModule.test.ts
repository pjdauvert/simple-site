import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStore } from '@netlify/blobs';
import { TranslationsModule } from './TranslationsModule';
import { ErrorCode } from '@simple-site/interfaces';

vi.mock('@netlify/blobs', () => ({ getStore: vi.fn() }));

// CONTEXT != 'dev' so seedBlob short-circuits and never touches the store.
const ENV: Record<string, string> = { APP_NAME: 'test-app', CONTEXT: 'production' };
const stubEnv = (env: Record<string, string | undefined> = ENV) =>
  vi.stubGlobal('Netlify', { env: { get: (k: string) => env[k] } });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readJson = async (res: Response): Promise<any> => res.json();

const request = (url: string, method: string, body?: unknown, contentType = 'application/json') =>
  new Request(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': contentType } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

const seed = { en: { greeting: 'Hello' }, fr: { greeting: 'Bonjour' } };

const makeStore = (data: Record<string, unknown> = { translations: seed }) => {
  const map = new Map<string, string>(
    Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
  );
  const store = {
    get: vi.fn(async (key: string) => map.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => { map.set(key, value); }),
    delete: vi.fn(async (key: string) => { map.delete(key); }),
    list: vi.fn(async () => ({ blobs: [], directories: [] })),
  };
  vi.mocked(getStore).mockReturnValue(store as never);
  return { store, map };
};

const handle = (req: Request, params: Record<string, string> = {}) =>
  new TranslationsModule().handle(req, { params } as never);

const stored = (map: Map<string, string>) => JSON.parse(map.get('translations')!);

describe('TranslationsModule', () => {
  beforeEach(() => { vi.clearAllMocks(); stubEnv(); });
  afterEach(() => vi.unstubAllGlobals());

  it('GET /api/translations returns the whole blob', async () => {
    makeStore();
    const res = await handle(request('https://s.test/api/translations', 'GET'));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data).toEqual(seed);
  });

  it('GET /api/translations/:language returns one dictionary', async () => {
    makeStore();
    const res = await handle(request('https://s.test/api/translations/fr', 'GET'), { language: 'fr' });
    expect(res.status).toBe(200);
    expect((await readJson(res)).data).toEqual({ greeting: 'Bonjour' });
  });

  it('PUT /api/translations/:language replaces the dictionary and leaves others untouched', async () => {
    const { map } = makeStore();
    const res = await handle(request('https://s.test/api/translations/fr', 'PUT', { hi: 'Salut' }), { language: 'fr' });
    expect(res.status).toBe(200);
    expect(stored(map).fr).toEqual({ hi: 'Salut' }); // greeting removed
    expect(stored(map).en).toEqual({ greeting: 'Hello' }); // untouched
  });

  it('PUT /api/translations bulk-imports languages (upsert, others intact)', async () => {
    const { map } = makeStore();
    const res = await handle(
      request('https://s.test/api/translations', 'PUT', { de: { greeting: 'Hallo' }, fr: { greeting: 'Salut' } }),
    );
    expect(res.status).toBe(200);
    expect(stored(map).de).toEqual({ greeting: 'Hallo' });
    expect(stored(map).fr).toEqual({ greeting: 'Salut' });
    expect(stored(map).en).toEqual({ greeting: 'Hello' }); // untouched
  });

  it('PUT /api/translations rejects an invalid file (bad key)', async () => {
    const { store } = makeStore();
    const res = await handle(request('https://s.test/api/translations', 'PUT', { en: { 'bad key!': 'x' } }));
    expect(res.status).toBe(400);
    expect((await readJson(res)).code).toBe(ErrorCode.INVALID_REQUEST);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('DELETE /api/translations/:language removes a language', async () => {
    const { map } = makeStore();
    const res = await handle(request('https://s.test/api/translations/fr', 'DELETE'), { language: 'fr' });
    expect(res.status).toBe(200);
    expect(stored(map)).toEqual({ en: { greeting: 'Hello' } });
  });

  it('DELETE refuses the base locale', async () => {
    const { store } = makeStore();
    const res = await handle(request('https://s.test/api/translations/en', 'DELETE'), { language: 'en' });
    expect(res.status).toBe(409);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('DELETE refuses the last remaining language', async () => {
    makeStore({ translations: { fr: { greeting: 'Bonjour' } } });
    const res = await handle(request('https://s.test/api/translations/fr', 'DELETE'), { language: 'fr' });
    expect(res.status).toBe(409);
  });

  it('rejects an invalid language code', async () => {
    makeStore();
    const res = await handle(request('https://s.test/api/translations/eng', 'GET'), { language: 'eng' });
    expect(res.status).toBe(400);
    expect((await readJson(res)).code).toBe(ErrorCode.INVALID_REQUEST);
  });
});
