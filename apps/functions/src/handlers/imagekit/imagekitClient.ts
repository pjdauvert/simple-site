import { createHmac } from 'node:crypto';
import { ErrorResponses } from '../../errors/error';
import type { UploadPayload } from '@simple-site/interfaces';

/** ImageKit Upload File V2 endpoint (browser → ImageKit direct upload). */
export const IMAGEKIT_UPLOAD_V2_URL = 'https://upload.imagekit.io/api/v2/files/upload';
/** ImageKit Management API base (list/delete), authenticated with the private key. */
export const IMAGEKIT_API_BASE = 'https://api.imagekit.io';

/** Lifetime of a signed upload token. V2 requires exp - iat <= 3600s. */
const TOKEN_TTL_SECONDS = 1800;

export interface ImageKitEnv {
  privateKey: string;
  publicKey: string;
  urlEndpoint?: string;
  /** Normalised base folder for all media: leading slash, no trailing slash, or '' for the account root. */
  rootDir: string;
}

/** Normalises a folder path: single leading slash, no trailing slash. Empty → ''. */
const normalizeDir = (dir: string): string => {
  const trimmed = `/${dir}`.replace(/\/+/g, '/').replace(/\/$/, '');
  return trimmed === '/' ? '' : trimmed;
};

/**
 * Reads ImageKit credentials + root directory from the function environment.
 * @throws ApiErrorResponse (500 CONFIGURATION_ERROR) when keys are missing.
 */
export const getImageKitEnv = (path?: string): ImageKitEnv => {
  const privateKey = Netlify.env.get('IMAGEKIT_PRIVATE_KEY');
  const publicKey = Netlify.env.get('IMAGEKIT_PUBLIC_KEY');

  if (!privateKey || !publicKey) {
    throw ErrorResponses.configurationError(
      'ImageKit credentials are not configured',
      { missing: [!privateKey && 'IMAGEKIT_PRIVATE_KEY', !publicKey && 'IMAGEKIT_PUBLIC_KEY'].filter(Boolean) },
      path,
    );
  }

  return {
    privateKey,
    publicKey,
    urlEndpoint: Netlify.env.get('IMAGEKIT_URL_ENDPOINT'),
    rootDir: normalizeDir(Netlify.env.get('IMAGEKIT_ROOT_DIR') ?? ''),
  };
};

/**
 * Resolves a client-supplied relative path to an absolute ImageKit folder path,
 * scoped under the configured root directory. Rejects path traversal.
 * @throws ApiErrorResponse (400) when the relative path escapes the root.
 */
export const resolveFolderPath = (env: ImageKitEnv, relPath = '', path?: string): string => {
  if (relPath.includes('..')) {
    throw ErrorResponses.invalidRequest('Invalid folder path', path);
  }
  const absolute = `${env.rootDir}${normalizeDir(relPath)}`.replace(/\/+/g, '/').replace(/\/$/, '');
  return absolute === '' ? '/' : absolute;
};

/** HTTP Basic auth header for the Management API (private key as username, no password). */
export const basicAuthHeader = (privateKey: string): string =>
  `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`;

const base64url = (input: string | Buffer): string =>
  Buffer.from(input).toString('base64url');

/**
 * Mints a V2 upload token (JWT) authorizing a single browser upload.
 *
 * The JWT signs the *entire* upload payload, so the client must send exactly
 * these parameters. Header carries `kid` = public key; payload carries the
 * upload params (all stringified) plus `iat`/`exp`; signature is
 * HMAC-SHA256(headerB64 + "." + payloadB64, privateKey).
 */
export const signUploadToken = (
  uploadPayload: UploadPayload,
  env: ImageKitEnv,
): { token: string; expire: number } => {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + TOKEN_TTL_SECONDS;

  const header = { alg: 'HS256', typ: 'JWT', kid: env.publicKey };
  const payload = { ...uploadPayload, iat, exp };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = base64url(createHmac('sha256', env.privateKey).update(signingInput).digest());

  return { token: `${signingInput}.${signature}`, expire: exp };
};
