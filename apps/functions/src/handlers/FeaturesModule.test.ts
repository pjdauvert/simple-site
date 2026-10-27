import { describe, it, expect, vi, afterEach } from 'vitest';
import { FeaturesModule } from './FeaturesModule';
import { jsonRequest, makeContext, readJson, stubEnv } from './testing/handlerTestKit';

const makeRequest = () => jsonRequest('https://site.test/api/features', 'GET');

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
      .toEqual({ media: false, team: true, contact: false, gallery: false, events: false });

    stubEnv({ FEATURE_MEDIA: 'true', FEATURE_TEAM: 'yes' });
    expect((await readJson(await new FeaturesModule().handle(makeRequest(), makeContext()))).data)
      .toEqual({ media: true, team: false, contact: false, gallery: false, events: false });
  });

  it('reports contact from FEATURE_CONTACT, independently of the other flags', async () => {
    stubEnv({ FEATURE_CONTACT: 'true' });
    expect((await readJson(await new FeaturesModule().handle(makeRequest(), makeContext()))).data)
      .toEqual({ media: false, team: false, contact: true, gallery: false, events: false });

    stubEnv({ FEATURE_CONTACT: 'yes' });
    expect((await readJson(await new FeaturesModule().handle(makeRequest(), makeContext()))).data.contact).toBe(false);
  });

  it('reports gallery from FEATURE_GALLERY, independently of the other flags', async () => {
    stubEnv({ FEATURE_GALLERY: 'true' });
    expect((await readJson(await new FeaturesModule().handle(makeRequest(), makeContext()))).data)
      .toEqual({ media: false, team: false, contact: false, gallery: true, events: false });

    stubEnv({ FEATURE_GALLERY: 'yes' });
    expect((await readJson(await new FeaturesModule().handle(makeRequest(), makeContext()))).data.gallery).toBe(false);
  });

  it('reports events from FEATURE_EVENTS, independently of the other flags', async () => {
    stubEnv({ FEATURE_EVENTS: 'true' });
    expect((await readJson(await new FeaturesModule().handle(makeRequest(), makeContext()))).data)
      .toEqual({ media: false, team: false, contact: false, gallery: false, events: true });

    stubEnv({ FEATURE_EVENTS: 'yes' });
    expect((await readJson(await new FeaturesModule().handle(makeRequest(), makeContext()))).data.events).toBe(false);
  });
});
