import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { ContactModule } from './ContactModule';
import { RESEND_EMAILS_URL } from './resend/resendClient';
import { CONTACT_MESSAGE_MAX_LENGTH } from '@simple-site/interfaces';

vi.mock('@netlify/blobs', () => ({ getStore: vi.fn() }));

const RESEND_ENV = {
  RESEND_API_KEY: 're_test_key',
  CONTACT_FROM_EMAIL: 'Site <contact@site.test>',
  CONTACT_TO_EMAIL: 'owner@site.test',
};

const stubEnv = (env: Record<string, string | undefined>) =>
  vi.stubGlobal('Netlify', { env: { get: (k: string) => env[k] } });

const stubFetch = (response: Response = new Response('{"id":"email_1"}', { status: 200 })) => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const makeRequest = (body: unknown, contentType = 'application/json') =>
  new Request('https://site.test/api/contact/message', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const makeContext = () => ({} as unknown as Context);

const send = (request: Request) => new ContactModule().handle(request, makeContext());

/** Stubs `getStore` with an in-memory key/value store. */
const makeStore = (seed: Record<string, unknown> = {}) => {
  const data = new Map<string, string>(
    Object.entries(seed).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
  );
  const store = {
    get: vi.fn(async (key: string) => data.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => { data.set(key, value); }),
  };
  vi.mocked(getStore).mockReturnValue(store as never);
  return { store, data };
};

const settingsRequest = (method: string, body?: unknown, contentType = 'application/json') =>
  new Request('https://site.test/api/contact', {
    method,
    headers: body !== undefined ? { 'Content-Type': contentType } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

const readJson = async (res: Response): Promise<Record<string, unknown>> =>
  res.json() as Promise<Record<string, unknown>>;

describe('ContactModule', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects a non-JSON content type without calling Resend', async () => {
    stubEnv(RESEND_ENV);
    const fetchMock = stubFetch();
    const res = await send(makeRequest('email=a@b.c', 'text/plain'));
    expect(res.status).toBe(400);
    expect(await readJson(res)).toMatchObject({ ok: false, code: 'INVALID_REQUEST' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed JSON body', async () => {
    stubEnv(RESEND_ENV);
    stubFetch();
    const res = await send(makeRequest('{not json'));
    expect(res.status).toBe(400);
    expect(await readJson(res)).toMatchObject({ ok: false, code: 'INVALID_REQUEST' });
  });

  it.each([
    ['an invalid email', { email: 'not-an-email', message: 'Hello' }, 'email'],
    ['a blank message', { email: 'jane@site.test', message: '   ' }, 'message'],
    ['a message over the limit', { email: 'jane@site.test', message: 'x'.repeat(CONTACT_MESSAGE_MAX_LENGTH + 1) }, 'message'],
    ['a missing field', { email: 'jane@site.test' }, 'message'],
  ])('rejects %s with a 400 validation error', async (_label, payload, field) => {
    stubEnv(RESEND_ENV);
    const fetchMock = stubFetch();
    const res = await send(makeRequest(payload));
    expect(res.status).toBe(400);
    const body = await readJson(res);
    expect(body).toMatchObject({ ok: false, code: 'VALIDATION_FAILED' });
    expect((body.details as { errors: { field: string }[] }).errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field })]),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers a generic 500 when the Resend env is incomplete — env-var names stay in the logs', async () => {
    stubEnv({ RESEND_API_KEY: 're_test_key' });
    const fetchMock = stubFetch();
    const res = await send(makeRequest({ email: 'jane@site.test', message: 'Hello' }));
    expect(res.status).toBe(500);
    const body = await readJson(res);
    expect(body).toMatchObject({ ok: false, code: 'INTERNAL_ERROR', message: 'Failed to send the message' });
    // The caller is anonymous: no internal variable name may reach the response.
    for (const name of ['RESEND_API_KEY', 'CONTACT_FROM_EMAIL', 'CONTACT_TO_EMAIL', 'Resend']) {
      expect(JSON.stringify(body)).not.toContain(name);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an oversized body before reading it', async () => {
    stubEnv(RESEND_ENV);
    const fetchMock = stubFetch();
    // Constructed Requests compute Content-Length at send time, so the test sets
    // the header explicitly — real clients (browsers, curl) always send it.
    const res = await send(new Request('https://site.test/api/contact/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': '12024' },
      body: JSON.stringify({ email: 'jane@site.test', message: 'x'.repeat(12_000) }),
    }));
    expect(res.status).toBe(400);
    expect(await readJson(res)).toMatchObject({ ok: false, code: 'INVALID_REQUEST', message: 'Request body too large' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a Resend timeout/network failure to the same generic 500', async () => {
    stubEnv(RESEND_ENV);
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
    vi.stubGlobal('fetch', fetchMock);
    const res = await send(makeRequest({ email: 'jane@site.test', message: 'Hello' }));
    expect(res.status).toBe(500);
    expect(await readJson(res)).toMatchObject({ ok: false, code: 'INTERNAL_ERROR', message: 'Failed to send the message' });
  });

  it('relays a valid message to Resend and confirms the send', async () => {
    stubEnv(RESEND_ENV);
    const fetchMock = stubFetch();
    const res = await send(makeRequest({ email: 'jane@site.test', message: 'Hello there' }));
    expect(res.status).toBe(200);
    expect(await readJson(res)).toMatchObject({ ok: true, data: { message: 'Message sent' } });

    expect(fetchMock).toHaveBeenCalledWith(RESEND_EMAILS_URL, expect.objectContaining({ method: 'POST' }));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer re_test_key',
      'Content-Type': 'application/json',
      'User-Agent': expect.any(String),
    });
    expect(JSON.parse(String(init.body))).toEqual({
      from: 'Site <contact@site.test>',
      to: ['owner@site.test'],
      reply_to: 'jane@site.test',
      subject: 'New contact message from jane@site.test',
      text: 'Hello there',
    });
  });

  it('trims the message before sending it', async () => {
    stubEnv(RESEND_ENV);
    const fetchMock = stubFetch();
    await send(makeRequest({ email: 'jane@site.test', message: '  Hello  ' }));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).text).toBe('Hello');
  });

  it('maps a Resend refusal to a generic 500 without leaking the provider response', async () => {
    stubEnv(RESEND_ENV);
    stubFetch(new Response('{"message":"API key is invalid"}', { status: 401 }));
    const res = await send(makeRequest({ email: 'jane@site.test', message: 'Hello' }));
    expect(res.status).toBe(500);
    const body = await readJson(res);
    expect(body).toMatchObject({ ok: false, code: 'INTERNAL_ERROR', message: 'Failed to send the message' });
    expect(JSON.stringify(body)).not.toContain('API key');
  });
});

describe('ContactModule settings (GET/PUT)', () => {
  afterEach(() => vi.unstubAllGlobals());

  const withStore = (seed: Record<string, unknown> = {}) => {
    stubEnv({ APP_NAME: 'test-app' });
    return makeStore(seed);
  };

  it('GET returns empty settings when nothing is stored yet', async () => {
    const { data } = withStore();
    const res = await send(settingsRequest('GET'));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data).toEqual({});
    expect(data.has('contact')).toBe(false); // reading never writes
  });

  it('GET returns the stored settings', async () => {
    withStore({ contact: { presentation: 'Write to us!' } });
    const res = await send(settingsRequest('GET'));
    expect((await readJson(res)).data).toEqual({ presentation: 'Write to us!' });
  });

  it('PUT replaces the settings and reports success', async () => {
    const { data } = withStore({ contact: { presentation: 'Old' } });
    const res = await send(settingsRequest('PUT', { presentation: '**Hello**' }));
    expect(res.status).toBe(200);
    expect((await readJson(res)).data).toEqual({ message: 'Contact settings updated successfully' });
    expect(JSON.parse(data.get('contact') as string)).toEqual({ presentation: '**Hello**' });
  });

  it('PUT rejects a non-JSON content type without writing', async () => {
    const { data } = withStore({ contact: { presentation: 'Old' } });
    const res = await send(settingsRequest('PUT', 'presentation=x', 'text/plain'));
    expect(res.status).toBe(400);
    expect(JSON.parse(data.get('contact') as string)).toEqual({ presentation: 'Old' });
  });

  it('PUT rejects an invalid settings shape', async () => {
    const { data } = withStore();
    const res = await send(settingsRequest('PUT', { presentation: 123 }));
    expect(res.status).toBe(500); // ZodError → CONFIGURATION_ERROR, matching the other modules
    expect(data.has('contact')).toBe(false);
  });

  it('rejects unsupported methods', async () => {
    withStore();
    const res = await send(settingsRequest('DELETE'));
    expect(res.status).toBe(405);
    expect(await readJson(res)).toMatchObject({ ok: false, code: 'METHOD_NOT_ALLOWED' });
  });
});
