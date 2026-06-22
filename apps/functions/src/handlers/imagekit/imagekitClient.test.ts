import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import type { UploadPayload } from '@simple-site/interfaces';
import { basicAuthHeader, getImageKitEnv, signUploadToken } from './imagekitClient';

const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString());

const ENV: Record<string, string> = {
  IMAGEKIT_PRIVATE_KEY: 'private_test_key',
  IMAGEKIT_PUBLIC_KEY: 'public_test_key',
  IMAGEKIT_URL_ENDPOINT: 'https://ik.imagekit.io/demo',
};

const stubEnv = (env: Record<string, string | undefined>) => {
  vi.stubGlobal('Netlify', { env: { get: (k: string) => env[k] } });
};

describe('imagekitClient', () => {
  beforeEach(() => stubEnv(ENV));
  afterEach(() => vi.unstubAllGlobals());

  describe('getImageKitEnv', () => {
    it('returns the configured credentials', () => {
      expect(getImageKitEnv()).toEqual({
        privateKey: 'private_test_key',
        publicKey: 'public_test_key',
        urlEndpoint: 'https://ik.imagekit.io/demo',
      });
    });

    it('throws a 500 configuration error when keys are missing', () => {
      stubEnv({ IMAGEKIT_PUBLIC_KEY: 'public_test_key' });
      expect(() => getImageKitEnv()).toThrowError();
      try {
        getImageKitEnv();
      } catch (e) {
        expect((e as { statusCode: number }).statusCode).toBe(500);
      }
    });
  });

  describe('basicAuthHeader', () => {
    it('base64-encodes "<privateKey>:" for HTTP Basic auth', () => {
      const header = basicAuthHeader('private_test_key');
      expect(header).toBe(`Basic ${Buffer.from('private_test_key:').toString('base64')}`);
      expect(Buffer.from(header.replace('Basic ', ''), 'base64').toString()).toBe('private_test_key:');
    });
  });

  describe('signUploadToken', () => {
    const payload: UploadPayload = {
      fileName: 'photo.jpg',
      folder: '/media',
      useUniqueFileName: 'true',
    };

    it('produces a JWT with kid=publicKey and the upload payload as claims', () => {
      const env = getImageKitEnv();
      const { token, expire } = signUploadToken(payload, env);
      const [headerB64, payloadB64] = token.split('.');

      const header = decode(headerB64);
      expect(header).toMatchObject({ alg: 'HS256', typ: 'JWT', kid: 'public_test_key' });

      const claims = decode(payloadB64);
      expect(claims).toMatchObject(payload);
      expect(claims.exp).toBe(expire);
      expect(claims.exp - claims.iat).toBeLessThanOrEqual(3600);
      expect(claims.exp - claims.iat).toBeGreaterThan(0);
    });

    it('signs HMAC-SHA256(header.payload) with the private key', () => {
      const env = getImageKitEnv();
      const { token } = signUploadToken(payload, env);
      const [headerB64, payloadB64, signatureB64] = token.split('.');

      const expected = createHmac('sha256', env.privateKey)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      expect(signatureB64).toBe(expected);
    });
  });
});
