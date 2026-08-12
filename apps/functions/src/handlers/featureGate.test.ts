import { describe, it, expect, vi } from 'vitest';
import type { Context } from '@netlify/functions';
import { withFeatureGate } from './featureGate';

const request = new Request('https://site.test/api/thing/sub');
const context = {} as unknown as Context;

describe('withFeatureGate', () => {
  it('answers 404 without touching the wrapped chain while the flag is off (so: before auth)', async () => {
    const next = vi.fn();
    const gated = withFeatureGate('Thing', () => false, next);
    const res = await gated(request, context);
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(await res.json()).toMatchObject({ ok: false, code: 'NOT_FOUND' });
    expect(next).not.toHaveBeenCalled();
  });

  it('delegates untouched when the flag is on', async () => {
    const inner = new Response('ok');
    const next = vi.fn().mockResolvedValue(inner);
    const gated = withFeatureGate('Thing', () => true, next);
    expect(await gated(request, context)).toBe(inner);
    expect(next).toHaveBeenCalledWith(request, context);
  });

  it('re-reads the flag on every request — flipping it needs no rebuild', async () => {
    let enabled = false;
    const next = vi.fn().mockResolvedValue(new Response('ok'));
    const gated = withFeatureGate('Thing', () => enabled, next);
    expect((await gated(request, context)).status).toBe(404);
    enabled = true;
    expect((await gated(request, context)).status).toBe(200);
    enabled = false;
    expect((await gated(request, context)).status).toBe(404);
  });
});
