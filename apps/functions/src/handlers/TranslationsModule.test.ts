import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TranslationsModule } from './TranslationsModule';
import { ErrorCode } from '@simple-site/interfaces';
import { jsonRequest, makeContext, makeStore, readJson, stubEnv } from './testing/handlerTestKit';

vi.mock('@netlify/blobs', () => ({ getStore: vi.fn() }));

// Override languages only — the default language ('en' without a config blob) has no dictionary.
const seed = { fr: { greeting: 'Bonjour' }, de: { greeting: 'Hallo' } };
// Published config blob defining the default language.
const configWithDefault = (defaultLanguage: string) => ({ site: { siteName: 'Test', defaultLanguage } });

/** Most cases start from the two override dictionaries above. */
const seedStore = (data: Record<string, unknown> = { translations: seed }) => {
  const { store, data: map } = makeStore(data);
  return { store, map };
};

const handle = (req: Request, params: Record<string, string> = {}) =>
  new TranslationsModule().handle(req, makeContext({ params }));

const stored = (map: Map<string, string>) => JSON.parse(map.get('translations')!);

describe('TranslationsModule', () => {
  beforeEach(() => { vi.clearAllMocks(); stubEnv(); });
  afterEach(() => vi.unstubAllGlobals());

  it('GET /api/translations returns { defaultLanguage, translations } (fallback default without a config)', async () => {
    seedStore();
    const res = await handle(jsonRequest('https://s.test/api/translations', 'GET'));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data).toEqual({ defaultLanguage: 'en', translations: seed });
  });

  it('GET /api/translations reads the default language from the published config', async () => {
    seedStore({ translations: { de: { greeting: 'Hallo' } }, config: configWithDefault('fr') });
    const res = await handle(jsonRequest('https://s.test/api/translations', 'GET'));
    expect((await readJson(res)).data.defaultLanguage).toBe('fr');
  });

  it('falls back to the base locale when the config blob is unreadable', async () => {
    seedStore({ translations: seed, config: 'not json' });
    const res = await handle(jsonRequest('https://s.test/api/translations', 'GET'));
    expect((await readJson(res)).data.defaultLanguage).toBe('en');
  });

  it('migrates a stored default-language dictionary out of the blob (config wins)', async () => {
    const { map } = seedStore({ translations: { en: { greeting: 'Hello' }, ...seed } });
    const res = await handle(jsonRequest('https://s.test/api/translations', 'GET'));
    expect((await readJson(res)).data.translations).toEqual(seed);
    expect(stored(map)).toEqual(seed); // persisted, not just filtered on read
  });

  it('GET /api/translations/:language returns one dictionary', async () => {
    seedStore();
    const res = await handle(jsonRequest('https://s.test/api/translations/fr', 'GET'), { language: 'fr' });
    expect(res.status).toBe(200);
    expect((await readJson(res)).data).toEqual({ greeting: 'Bonjour' });
  });

  it('GET /api/translations/:language returns {} for the default language', async () => {
    seedStore();
    const res = await handle(jsonRequest('https://s.test/api/translations/en', 'GET'), { language: 'en' });
    expect(res.status).toBe(200);
    expect((await readJson(res)).data).toEqual({});
  });

  it('canonicalizes the :language segment (fr-ca addresses fr-CA)', async () => {
    const { map } = seedStore({ translations: { ...seed, 'fr-CA': { greeting: 'Allo' } } });
    const res = await handle(jsonRequest('https://s.test/api/translations/fr-ca', 'GET'), { language: 'fr-ca' });
    expect((await readJson(res)).data).toEqual({ greeting: 'Allo' });
    const put = await handle(jsonRequest('https://s.test/api/translations/fr-ca', 'PUT', { hi: 'Allo!' }), { language: 'fr-ca' });
    expect(put.status).toBe(200);
    expect(stored(map)['fr-CA']).toEqual({ hi: 'Allo!' });
    expect(stored(map)['fr-ca']).toBeUndefined();
  });

  it('PUT /api/translations/:language replaces the dictionary and leaves others untouched', async () => {
    const { map } = seedStore();
    const res = await handle(jsonRequest('https://s.test/api/translations/fr', 'PUT', { hi: 'Salut' }), { language: 'fr' });
    expect(res.status).toBe(200);
    expect(stored(map).fr).toEqual({ hi: 'Salut' }); // greeting removed
    expect(stored(map).de).toEqual({ greeting: 'Hallo' }); // untouched
  });

  it('POST and PUT refuse the default language (409 — its text lives in the site configuration)', async () => {
    const { store } = seedStore();
    for (const method of ['POST', 'PUT']) {
      const res = await handle(jsonRequest('https://s.test/api/translations/en', method, { greeting: 'Hi' }), { language: 'en' });
      expect(res.status).toBe(409);
    }
    expect(store.set).not.toHaveBeenCalled();
  });

  it('refuses the config-defined default language, even via a non-canonical code', async () => {
    seedStore({ translations: seed, config: configWithDefault('fr-CA') });
    const res = await handle(jsonRequest('https://s.test/api/translations/fr-ca', 'PUT', { hi: 'Allo' }), { language: 'fr-ca' });
    expect(res.status).toBe(409);
  });

  it('PUT /api/translations bulk-imports languages (upsert, default skipped, others intact)', async () => {
    const { map } = seedStore();
    const res = await handle(
      jsonRequest('https://s.test/api/translations', 'PUT', {
        en: { greeting: 'Hello' }, // default — ignored, config wins
        es: { greeting: 'Hola' },
        fr: { greeting: 'Salut' },
      }),
    );
    expect(res.status).toBe(200);
    expect((await readJson(res)).data.message).toBe('Imported 2 language(s) successfully');
    expect(stored(map).en).toBeUndefined();
    expect(stored(map).es).toEqual({ greeting: 'Hola' });
    expect(stored(map).fr).toEqual({ greeting: 'Salut' });
    expect(stored(map).de).toEqual({ greeting: 'Hallo' }); // untouched
  });

  it('PUT /api/translations canonicalizes imported keys', async () => {
    const { map } = seedStore();
    const res = await handle(jsonRequest('https://s.test/api/translations', 'PUT', { 'pt-br': { greeting: 'Oi' } }));
    expect(res.status).toBe(200);
    expect(stored(map)['pt-BR']).toEqual({ greeting: 'Oi' });
    expect(stored(map)['pt-br']).toBeUndefined();
  });

  it('PUT /api/translations rejects an invalid file (bad key)', async () => {
    const { store } = seedStore();
    const res = await handle(jsonRequest('https://s.test/api/translations', 'PUT', { fr: { 'bad key!': 'x' } }));
    expect(res.status).toBe(400);
    expect((await readJson(res)).code).toBe(ErrorCode.INVALID_REQUEST);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('DELETE /api/translations/:language removes a language', async () => {
    const { map } = seedStore();
    const res = await handle(jsonRequest('https://s.test/api/translations/de', 'DELETE'), { language: 'de' });
    expect(res.status).toBe(200);
    expect(stored(map)).toEqual({ fr: { greeting: 'Bonjour' } });
  });

  it('DELETE refuses the default language', async () => {
    const { store } = seedStore();
    const res = await handle(jsonRequest('https://s.test/api/translations/en', 'DELETE'), { language: 'en' });
    expect(res.status).toBe(409);
    expect(store.set).not.toHaveBeenCalled();
  });

  it('DELETE refuses the last remaining language', async () => {
    seedStore({ translations: { fr: { greeting: 'Bonjour' } } });
    const res = await handle(jsonRequest('https://s.test/api/translations/fr', 'DELETE'), { language: 'fr' });
    expect(res.status).toBe(409);
  });

  it('rejects an invalid language code', async () => {
    seedStore();
    const res = await handle(jsonRequest('https://s.test/api/translations/123', 'GET'), { language: '123' });
    expect(res.status).toBe(400);
    expect((await readJson(res)).code).toBe(ErrorCode.INVALID_REQUEST);
  });
});
