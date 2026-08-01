import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Context } from '@netlify/functions';
import { ContactModule } from './ContactModule';
import { RESEND_EMAILS_URL } from './resend/resendClient';
import { CONTACT_MESSAGE_MAX_LENGTH } from '@simple-site/interfaces';

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
  new Request('https://site.test/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const makeContext = () => ({} as unknown as Context);

const send = (request: Request) => new ContactModule().handle(request, makeContext());

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

  it('returns a configuration error when the Resend env is incomplete', async () => {
    stubEnv({ RESEND_API_KEY: 're_test_key' });
    const fetchMock = stubFetch();
    const res = await send(makeRequest({ email: 'jane@site.test', message: 'Hello' }));
    expect(res.status).toBe(500);
    const body = await readJson(res);
    expect(body).toMatchObject({ ok: false, code: 'CONFIGURATION_ERROR' });
    expect((body.details as { missing: string[] }).missing).toEqual(['CONTACT_FROM_EMAIL', 'CONTACT_TO_EMAIL']);
    expect(fetchMock).not.toHaveBeenCalled();
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
