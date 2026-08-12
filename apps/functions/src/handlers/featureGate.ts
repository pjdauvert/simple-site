import { ErrorResponses } from '../errors/error';
import type { RequestHandler } from '../types/server-types';

/**
 * Wraps an entrypoint handler behind a feature flag: while `isEnabled` returns
 * false, every route of the surface answers 404 — BEFORE auth or any routing —
 * as if the feature did not exist (the flag-gating hard rule). The flag is
 * read per request, so flipping it needs no rebuild.
 *
 * Lives at the handlers level so the gating stays tested PROJECT logic: the
 * `*.mts` entrypoints remain pure framework wiring — logic-free and untested
 * by design (tests never sit at the functions source root, where Netlify
 * would load them as function modules).
 */
export const withFeatureGate =
  (featureName: string, isEnabled: () => boolean, next: RequestHandler): RequestHandler =>
  async (request, context) => {
    if (isEnabled()) return next(request, context);
    const error = ErrorResponses.notFound(featureName, new URL(request.url).pathname);
    return new Response(JSON.stringify({ ok: false, ...error.toJSON() }), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  };
