import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import handler from './contact.mjs';

vi.mock('@netlify/blobs', () => ({ getStore: vi.fn() }));

// CONTEXT != 'dev' so AuthHandler actually enforces auth (netlify dev bypasses it).
const BASE_ENV: Record<string, string> = {
  APP_NAME: 'test-app',
  CONTEXT: 'production',
  FEATURE_CONTACT: 'true',
  RESEND_API_KEY: 're_test_key',
  CONTACT_FROM_EMAIL: 'Site <contact@site.test>',
  CONTACT_TO_EMAIL: 'owner@site.test',
};

const stubEnv = (env: Record<string, string | undefined> = BASE_ENV) =>
  vi.stubGlobal('Netlify', { env: { get: (k: string) => env[k] } });

const stubFetch = () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"email_1"}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

/** Stubs `getStore` with an in-memory key/value store. */
const makeStore = (seed: Record<string, unknown> = {}) => {
  const data = new Map<string, string>(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  const store = {
    get: vi.fn(async (key: string) => data.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => { data.set(key, value); }),
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

/**
 * Entrypoint contract of `contact.mts`: the flag gate answers before anything
 * else, `/api/contact/message` accepts the public POST only, and the settings
 * mutation is the sole route behind `AuthHandler`.
 */
describe('contact entrypoint (flag gate + method/path routing)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('404s every route before auth when FEATURE_CONTACT is off', async () => {
    stubEnv({ ...BASE_ENV, FEATURE_CONTACT: undefined });
    const fetchMock = stubFetch();
    makeStore();
    const attempts: Array<[string, string, unknown?]> = [
      ['GET', '/api/contact'],
      ['PUT', '/api/contact', { presentation: 'x' }],
      ['POST', '/api/contact/message', { email: 'jane@site.test', message: 'Hello' }],
    ];
    for (const [method, path, body] of attempts) {
      const res = await handler(request(method, path, body), asAdmin);
      expect(res.status).toBe(404);
      expect(await readJson(res)).toMatchObject({ ok: false, code: 'NOT_FOUND' });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects the anonymous settings mutation (401) while GET stays public', async () => {
    stubEnv();
    const { data } = makeStore({ contact: { presentation: 'Stored' } });

    const put = await handler(request('PUT', '/api/contact', { presentation: 'hacked' }), anonymous);
    expect(put.status).toBe(401);
    expect(await readJson(put)).toMatchObject({ ok: false, code: 'UNAUTHORIZED' });
    expect(JSON.parse(data.get('contact') as string)).toEqual({ presentation: 'Stored' });

    const get = await handler(request('GET', '/api/contact'), anonymous);
    expect(get.status).toBe(200);
    expect((await readJson(get)).data).toEqual({ presentation: 'Stored' });
  });

  it('accepts the settings mutation with an identity', async () => {
    stubEnv();
    const { data } = makeStore();
    const res = await handler(request('PUT', '/api/contact', { presentation: 'New text' }), asAdmin);
    expect(res.status).toBe(200);
    expect(JSON.parse(data.get('contact') as string)).toEqual({ presentation: 'New text' });
  });

  it('serves the anonymous send on POST /api/contact/message', async () => {
    stubEnv();
    const fetchMock = stubFetch();
    const res = await handler(request('POST', '/api/contact/message', { email: 'jane@site.test', message: 'Hello' }), anonymous);
    expect(res.status).toBe(200);
    expect(await readJson(res)).toMatchObject({ ok: true, data: { message: 'Message sent' } });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejects methods on the wrong path (405)', async () => {
    stubEnv();
    stubFetch();
    makeStore();
    // The send no longer lives on the settings URI…
    const postSettings = await handler(request('POST', '/api/contact', { email: 'jane@site.test', message: 'Hi' }), anonymous);
    expect(postSettings.status).toBe(405);
    // …and the action path only takes POST.
    const getMessage = await handler(request('GET', '/api/contact/message'), anonymous);
    expect(getMessage.status).toBe(405);
    expect(await readJson(getMessage)).toMatchObject({ ok: false, code: 'METHOD_NOT_ALLOWED' });
  });
});
