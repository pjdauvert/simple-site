import { describe, it, expect, vi, afterEach } from 'vitest';
import { isMediaEnabled } from './featureFlags';

const stubEnv = (env: Record<string, string | undefined>) =>
  vi.stubGlobal('Netlify', { env: { get: (k: string) => env[k] } });

describe('isMediaEnabled', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is true only when FEATURE_MEDIA is exactly "true"', () => {
    stubEnv({ FEATURE_MEDIA: 'true' });
    expect(isMediaEnabled()).toBe(true);
  });

  it('is false when unset or any other value', () => {
    stubEnv({});
    expect(isMediaEnabled()).toBe(false);
    stubEnv({ FEATURE_MEDIA: 'TRUE' });
    expect(isMediaEnabled()).toBe(false);
    stubEnv({ FEATURE_MEDIA: '1' });
    expect(isMediaEnabled()).toBe(false);
  });
});
