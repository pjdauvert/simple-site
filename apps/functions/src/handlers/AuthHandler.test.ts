import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Context } from '@netlify/functions';
import { AuthHandler } from './AuthHandler';
import { ErrorCode } from '@simple-site/interfaces';
import { jsonRequest, makeContext, stubEnv } from './testing/handlerTestKit';

/** Identity puts the signed-in user on `clientContext`; no user means no session. */
const authed = (user?: Record<string, unknown>): Context =>
  makeContext({ clientContext: user ? { user } : undefined });

const makeRequest = (method = 'POST') => jsonRequest('https://example.com/api/config', method);

describe('AuthHandler', () => {
  // Not the 'dev' context, so the local auth bypass stays off.
  beforeEach(() => stubEnv());

  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('returns 401 when clientContext is undefined', async () => {
    const handler = new AuthHandler();
    const response = await handler.handle(makeRequest(), authed());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, code: ErrorCode.UNAUTHORIZED });
  });

  it('returns 401 when clientContext.user is undefined', async () => {
    const handler = new AuthHandler();
    const ctx = { clientContext: {} } as unknown as Context;
    const response = await handler.handle(makeRequest(), ctx);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, code: ErrorCode.UNAUTHORIZED });
  });

  it('returns 401 when clientContext is null', async () => {
    const handler = new AuthHandler();
    const ctx = { clientContext: null } as unknown as Context;
    const response = await handler.handle(makeRequest(), ctx);
    expect(response.status).toBe(401);
  });

  it('delegates to next.handle() when user is present', async () => {
    const mockNext = { handle: vi.fn().mockResolvedValue(new Response('ok', { status: 200 })) };
    const handler = new AuthHandler(mockNext as never);
    const response = await handler.handle(makeRequest(), authed({ sub: 'u1' }));
    expect(mockNext.handle).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
  });

  it('passes original request and context unchanged to next', async () => {
    const mockNext = { handle: vi.fn().mockResolvedValue(new Response('ok', { status: 200 })) };
    const handler = new AuthHandler(mockNext as never);
    const request = makeRequest();
    const context = authed({ sub: 'u1' });
    await handler.handle(request, context);
    expect(mockNext.handle).toHaveBeenCalledWith(request, context);
  });

  it('returns 500 when user is present but no next handler', async () => {
    const handler = new AuthHandler();
    const response = await handler.handle(makeRequest(), authed({ sub: 'u1' }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, code: ErrorCode.INTERNAL_ERROR });
  });
});
