import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';
import { TranslationsModule } from './TranslationsModule';
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

const makeContext = (language?: string): Context =>
  ({ params: { language } }) as unknown as Context;

const storedTranslations = {
  en: { 'page.home.title': 'Home', 'page.home.intro': 'Intro' },
  fr: { 'page.home.title': 'Accueil', 'page.home.intro': 'Intro FR' },
};

const makeStore = (initial: unknown = storedTranslations) => {
  const store = {
    get: vi.fn(async () => (initial === null ? null : JSON.stringify(initial))),
    set: vi.fn(async () => undefined),
  };
  vi.mocked(getStore).mockReturnValue(store as never);
  return store;
};

describe('TranslationsModule', () => {
  beforeEach(() => { vi.clearAllMocks(); stubEnv(); });
  afterEach(() => vi.unstubAllGlobals());

  it('GET /api/translations/en returns the locale dictionary', async () => {
    makeStore();
    const res = await new TranslationsModule().handle(
      jsonRequest('https://site.test/api/translations/en', 'GET'),
      makeContext('en'),
    );
    expect(res.status).toBe(200);
    expect((await readJson(res)).data).toEqual(storedTranslations.en);
  });

  it('PUT /api/translations/en replaces the locale dictionary (drops missing keys)', async () => {
    const store = makeStore();
    const res = await new TranslationsModule().handle(
      jsonRequest('https://site.test/api/translations/en', 'PUT', { 'page.home.title': 'Welcome' }),
      makeContext('en'),
    );
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.message).toMatch(/replaced/i);

    const [key, value] = store.set.mock.calls[0] as unknown as [string, string];
    expect(key).toBe('translations');
    const written = JSON.parse(value);
    expect(written.en).toEqual({ 'page.home.title': 'Welcome' }); // 'page.home.intro' dropped
    expect(written.fr).toEqual(storedTranslations.fr); // other locale untouched
  });

  it('POST /api/translations/en merges into the locale dictionary (keeps missing keys)', async () => {
    const store = makeStore();
    await new TranslationsModule().handle(
      jsonRequest('https://site.test/api/translations/en', 'POST', { 'page.home.title': 'Welcome' }),
      makeContext('en'),
    );
    const [, value] = store.set.mock.calls[0] as unknown as [string, string];
    expect(JSON.parse(value).en).toEqual({ 'page.home.title': 'Welcome', 'page.home.intro': 'Intro' });
  });

  it('PUT rejects a dictionary with an invalid key', async () => {
    const store = makeStore();
    const res = await new TranslationsModule().handle(
      jsonRequest('https://site.test/api/translations/en', 'PUT', { 'bad key!': 'x' }),
      makeContext('en'),
    );
    expect(res.status).toBe(500);
    expect((await readJson(res)).code).toBe(ErrorCode.CONFIGURATION_ERROR);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('returns a 400 for an unsupported language', async () => {
    makeStore();
    const res = await new TranslationsModule().handle(
      jsonRequest('https://site.test/api/translations/de', 'GET'),
      makeContext('de'),
    );
    expect(res.status).toBe(400);
    expect((await readJson(res)).code).toBe(ErrorCode.INVALID_REQUEST);
  });

  it('rejects unsupported methods', async () => {
    makeStore();
    const res = await new TranslationsModule().handle(
      jsonRequest('https://site.test/api/translations/en', 'DELETE'),
      makeContext('en'),
    );
    expect(res.status).toBe(405);
  });
});
