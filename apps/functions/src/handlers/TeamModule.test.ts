import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStore } from '@netlify/blobs';
import { TeamModule } from './TeamModule';
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

const member = (slug: string, over: Record<string, unknown> = {}) => ({
  slug,
  name: 'Jane Doe',
  jobTitle: 'CEO',
  biography: { en: 'Hello', fr: 'Bonjour' },
  ...over,
});

/** Stubs `getStore` with an in-memory key/value store. */
const makeStore = (seed: Record<string, unknown> = {}) => {
  const data = new Map<string, string>(
    Object.entries(seed).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
  );
  const store = {
    get: vi.fn(async (key: string) => data.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => { data.set(key, value); }),
    delete: vi.fn(async (key: string) => { data.delete(key); }),
  };
  vi.mocked(getStore).mockReturnValue(store as never);
  return { store, data };
};

const ctx = {} as never;
const handle = (request: Request) => new TeamModule().handle(request, ctx);

describe('TeamModule', () => {
  beforeEach(() => { vi.clearAllMocks(); stubEnv(); });
  afterEach(() => vi.unstubAllGlobals());

  it('GET /api/team returns an empty team when nothing is stored yet', async () => {
    const { data } = makeStore();
    const res = await handle(jsonRequest('https://site.test/api/team', 'GET'));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data).toEqual({ members: [] });
    expect(data.has('team')).toBe(false); // reading never writes
  });

  it('GET /api/team returns the stored team', async () => {
    makeStore({ team: { members: [member('jane-doe')] } });
    const res = await handle(jsonRequest('https://site.test/api/team', 'GET'));
    expect(res.status).toBe(200);
    const team = (await readJson(res)).data;
    expect(team.members).toHaveLength(1);
    expect(team.members[0].slug).toBe('jane-doe');
  });

  it('PUT /api/team replaces the whole team (live immediately, no draft)', async () => {
    const { data } = makeStore({ team: { members: [member('old-member')] } });
    const res = await handle(jsonRequest('https://site.test/api/team', 'PUT', {
      members: [member('jane-doe'), member('john-smith', { name: 'John Smith', photoUrl: '/img/john.jpg' })],
      alternateLayout: true,
    }));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.message).toMatch(/updated/i);
    const stored = JSON.parse(data.get('team')!);
    expect(stored.members.map((m: { slug: string }) => m.slug)).toEqual(['jane-doe', 'john-smith']);
    expect(stored.alternateLayout).toBe(true);
  });

  it('PUT /api/team accepts social links and rejects invalid ones', async () => {
    const { data } = makeStore();
    const ok = await handle(jsonRequest('https://site.test/api/team', 'PUT', {
      members: [member('jane-doe', { socialLinks: { linkedin: 'https://linkedin.com/in/jane' } })],
    }));
    expect(ok.status).toBe(200);
    expect(JSON.parse(data.get('team')!).members[0].socialLinks.linkedin).toBe('https://linkedin.com/in/jane');

    const bad = await handle(jsonRequest('https://site.test/api/team', 'PUT', {
      members: [member('john-smith', { socialLinks: { website: 'not a url' } })],
    }));
    expect(bad.status).toBe(500);
  });

  it('PUT /api/team rejects duplicate slugs', async () => {
    const { data } = makeStore();
    const res = await handle(jsonRequest('https://site.test/api/team', 'PUT', {
      members: [member('jane-doe'), member('jane-doe')],
    }));
    expect(res.status).toBe(500);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFIGURATION_ERROR);
    expect(data.has('team')).toBe(false);
  });

  it('PUT /api/team rejects an invalid slug (not kebab-case)', async () => {
    const { data } = makeStore();
    const res = await handle(jsonRequest('https://site.test/api/team', 'PUT', {
      members: [member('Jane Doe!')],
    }));
    expect(res.status).toBe(500);
    expect(data.has('team')).toBe(false);
  });

  it('PUT /api/team rejects a member without a name', async () => {
    const { data } = makeStore();
    const res = await handle(jsonRequest('https://site.test/api/team', 'PUT', {
      members: [member('jane-doe', { name: '' })],
    }));
    expect(res.status).toBe(500);
    expect(data.has('team')).toBe(false);
  });

  it('PUT /api/team requires an application/json content type', async () => {
    const { store } = makeStore();
    const res = await handle(jsonRequest('https://site.test/api/team', 'PUT', { members: [] }, 'text/plain'));
    expect(res.status).toBe(400);
    expect((await readJson(res)).code).toBe(ErrorCode.INVALID_REQUEST);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('rejects unsupported methods', async () => {
    makeStore();
    const res = await handle(jsonRequest('https://site.test/api/team', 'DELETE'));
    expect(res.status).toBe(405);
  });
});
