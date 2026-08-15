import { vi } from 'vitest';
import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

/**
 * Shared doubles for the serverless runtime every handler test drives: the
 * `Netlify` global, `fetch`, the blob store and the request/response plumbing.
 *
 * Scope: RUNTIME only. Domain fixtures (a stored config, a team member, the
 * Resend env…) stay in the test that owns them — mutualising those would couple
 * unrelated suites. This file never ships: `tsconfig.build.json` excludes
 * `src/**​/testing/**`, so nothing under it reaches the functions bundle.
 */

/**
 * The env every blob-backed handler test needs. `CONTEXT` is deliberately not
 * `'dev'`, so `seedBlob` short-circuits and no test ever writes the seed.
 */
export const BASE_ENV: Record<string, string> = { APP_NAME: 'test-app', CONTEXT: 'production' };

/**
 * Replaces the `Netlify` global with a fixed env map (missing keys read as
 * `undefined`, like the real runtime). Undo with `vi.unstubAllGlobals()`.
 */
export const stubEnv = (env: Record<string, string | undefined> = BASE_ENV): void => {
  vi.stubGlobal('Netlify', { env: { get: (key: string) => env[key] } });
};

/** Replaces global `fetch` with a spy running `impl`; returns it for assertions. */
export const stubFetch = (impl: (url: string, init?: RequestInit) => unknown) => {
  const fetchMock = vi.fn(impl as never);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

interface ContextOverrides {
  /** Route segments the router extracted (`:fileId`, `:language`…). */
  params?: Record<string, string>;
  /** Identity's signed-in user; absent means an anonymous request. */
  clientContext?: { user?: Record<string, unknown> };
}

/**
 * The Netlify function context. Handlers only ever read `params` and
 * `clientContext`, so a test supplies just those — the runtime type declares
 * far more (and not `clientContext` at all), hence the cast.
 */
export const makeContext = (over: ContextOverrides = {}): Context =>
  ({ params: {}, ...over }) as unknown as Context;

/**
 * A request for the handler under test. `body` is JSON-encoded unless it is
 * already a string (which lets a test send a malformed or non-JSON payload);
 * the `Content-Type` header is set only when there is a body, so GET/DELETE
 * requests stay header-free like the browser sends them.
 */
export const jsonRequest = (
  url: string,
  method: string,
  body?: unknown,
  contentType = 'application/json',
): Request =>
  new Request(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': contentType } : undefined,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

// The envelope is asserted field by field; typing it here would only force casts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readJson = async (res: Response): Promise<any> => res.json();

/**
 * Stubs `getStore` with an in-memory key/value store (get/set/delete/list).
 * Values are stored the way the real store keeps them — as strings — so a test
 * can seed objects and still assert on what was written.
 *
 * Requires `vi.mock('@netlify/blobs', () => ({ getStore: vi.fn() }))` in the
 * test file: module mocks are hoisted per file and cannot be shared from here.
 *
 * Returns the spied `store` (call assertions) and the backing `data` map
 * (what the handler actually persisted).
 */
export const makeStore = (seed: Record<string, unknown> = {}) => {
  const data = new Map<string, string>(
    Object.entries(seed).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
  );
  const store = {
    get: vi.fn(async (key: string) => data.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => { data.set(key, value); }),
    delete: vi.fn(async (key: string) => { data.delete(key); }),
    list: vi.fn(async ({ prefix = '' }: { prefix?: string } = {}) => ({
      blobs: [...data.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key, etag: 'e' })),
      directories: [],
    })),
  };
  vi.mocked(getStore).mockReturnValue(store as never);
  return { store, data };
};
