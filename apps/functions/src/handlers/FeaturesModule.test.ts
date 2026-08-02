import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Context } from '@netlify/functions';
import { FeaturesModule } from './FeaturesModule';

const stubEnv = (env: Record<string, string | undefined>) =>
  vi.stubGlobal('Netlify', { env: { get: (k: string) => env[k] } });

const makeRequest = () => new Request('https://site.test/api/features');
const makeContext = () => ({} as unknown as Context);

const readJson = async (res: Response): Promise<{ ok: boolean; data: { media: boolean; team: boolean; contact: boolean } }> =>
  res.json() as Promise<{ ok: boolean; data: { media: boolean; team: boolean; contact: boolean } }>;

describe('FeaturesModule', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports media: true when FEATURE_MEDIA is "true"', async () => {
    stubEnv({ FEATURE_MEDIA: 'true' });
    const res = await new FeaturesModule().handle(makeRequest(), makeContext());
    expect(res.status).toBe(200);
    expect(await readJson(res)).toMatchObject({ ok: true, data: { media: true, team: false } });
  });

  it('reports media: false when FEATURE_MEDIA is absent or not "true"', async () => {
    stubEnv({});
    expect((await readJson(await new FeaturesModule().handle(makeRequest(), makeContext()))).data.media).toBe(false);

    stubEnv({ FEATURE_MEDIA: 'yes' });
    expect((await readJson(await new FeaturesModule().handle(makeRequest(), makeContext()))).data.media).toBe(false);
  });

  it('reports team from FEATURE_TEAM, independently of media', async () => {
    stubEnv({ FEATURE_TEAM: 'true' });
    expect((await readJson(await new FeaturesModule().handle(makeRequest(), makeContext()))).data)
      .toEqual({ media: false, team: true, contact: false });

    stubEnv({ FEATURE_MEDIA: 'true', FEATURE_TEAM: 'yes' });
    expect((await readJson(await new FeaturesModule().handle(makeRequest(), makeContext()))).data)
      .toEqual({ media: true, team: false, contact: false });
  });

  it('reports contact from FEATURE_CONTACT, independently of the other flags', async () => {
    stubEnv({ FEATURE_CONTACT: 'true' });
    expect((await readJson(await new FeaturesModule().handle(makeRequest(), makeContext()))).data)
      .toEqual({ media: false, team: false, contact: true });

    stubEnv({ FEATURE_CONTACT: 'yes' });
    expect((await readJson(await new FeaturesModule().handle(makeRequest(), makeContext()))).data.contact).toBe(false);
  });
});
