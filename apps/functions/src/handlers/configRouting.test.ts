import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorCode } from '@simple-site/interfaces';
import { createConfigHandler } from './configRouting';
import { BASE_ENV, jsonRequest, makeContext, makeStore, readJson, stubEnv } from './testing/handlerTestKit';

vi.mock('@netlify/blobs', () => ({ getStore: vi.fn() }));

/**
 * Wiring tests of the config API routing: these are the only assertions that
 * the gallery/events paths really sit behind their feature gate and the auth
 * chain — the handler tests call `ConfigModule` directly and would stay green
 * if a path were silently de-gated here.
 */

const FLAG_BY_PATH = { gallery: 'FEATURE_GALLERY', events: 'FEATURE_EVENTS' } as const;
const anonymous = makeContext(); // no clientContext.user
const authenticated = makeContext({ clientContext: { user: { email: 'admin@site.test' } } });

describe('config API routing', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  for (const [feature, flag] of Object.entries(FLAG_BY_PATH)) {
    it(`PUT /api/config/${feature} is 404 BEFORE auth while ${flag} is off — even anonymously`, async () => {
      stubEnv(); // BASE_ENV: no feature flags, CONTEXT=production
      makeStore();
      const res = await createConfigHandler()(
        jsonRequest(`https://site.test/api/config/${feature}`, 'PUT', {}),
        anonymous,
      );
      expect(res.status).toBe(404); // a 401 here would leak the route's existence
      expect(await readJson(res)).toMatchObject({ ok: false, code: ErrorCode.NOT_FOUND });
    });

    it(`PUT /api/config/${feature} is 401 for anonymous requests once ${flag} is on`, async () => {
      stubEnv({ ...BASE_ENV, [flag]: 'true' });
      makeStore();
      const res = await createConfigHandler()(
        jsonRequest(`https://site.test/api/config/${feature}`, 'PUT', {}),
        anonymous,
      );
      expect(res.status).toBe(401);
      expect(await readJson(res)).toMatchObject({ ok: false, code: ErrorCode.UNAUTHORIZED });
    });
  }

  it('PUT /api/config/events reaches the ConfigModule once gated and authenticated', async () => {
    stubEnv({ ...BASE_ENV, FEATURE_EVENTS: 'true' });
    const { data } = makeStore({ config: { site: { siteName: 'S', logoUrl: '/l.svg' }, themes: [], pages: [] } });
    const events = {
      events: [{ slug: 'fair', name: 'Fair', startDateTime: '2027-06-18T15:00:00.000Z', location: 'Docks' }],
    };
    const res = await createConfigHandler()(
      jsonRequest('https://site.test/api/config/events', 'PUT', events),
      authenticated,
    );
    expect(res.status).toBe(200);
    expect(JSON.parse(data.get('config:draft')!).events).toEqual(events);
  });

  it('GET /api/config stays public — an anonymous read is never 401', async () => {
    stubEnv();
    makeStore(); // empty store: the module answers 404, but auth was never consulted
    const res = await createConfigHandler()(jsonRequest('https://site.test/api/config', 'GET'), anonymous);
    expect(res.status).toBe(404);
    expect(await readJson(res)).toMatchObject({ ok: false, code: ErrorCode.NOT_FOUND });
  });

  it('every other config path is admin-gated — anonymous mutations are 401', async () => {
    stubEnv();
    makeStore();
    for (const [method, path, body] of [
      ['GET', '/api/config/draft', undefined],
      ['POST', '/api/config/publish', undefined],
      ['PUT', '/api/config/menu', {}],
    ] as const) {
      const res = await createConfigHandler()(jsonRequest(`https://site.test${path}`, method, body), anonymous);
      expect(res.status).toBe(401);
    }
  });
});
