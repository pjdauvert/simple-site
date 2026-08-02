import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { ContactModule } from './handlers/ContactModule';
import { ApiErrorResponse, ErrorResponses } from './errors/error';
import type { RequestHandler } from './types/server-types';
import { isContactEnabled } from './handlers/FeaturesModule';

export const config: Config = {
  method: ['GET', 'POST', 'PUT'],
  path: ['/api/contact', '/api/contact/message'],
  // Throttled per client IP — primarily to cap the public message send (each
  // accepted POST triggers a paid Resend delivery). Netlify applies the limit
  // per function, so the settings routes share the budget; a real visitor
  // needs two requests per visit (GET settings + POST message).
  rateLimit: { action: 'rate_limit', aggregateBy: 'ip', windowSize: 60, windowLimit: 5 },
};

const contactModule = new ContactModule();
const protectedChain = new AuthHandler(contactModule);

const errorResponse = (error: ApiErrorResponse): Response =>
  new Response(JSON.stringify({ ok: false, ...error.toJSON() }), {
    status: error.statusCode,
    headers: { 'Content-Type': 'application/json' },
  });

const handler: RequestHandler = async (request, context) => {
  const path = new URL(request.url).pathname;
  // Feature flag: when the contact feature is disabled the whole surface behaves
  // as if it does not exist (404), regardless of auth.
  if (!isContactEnabled()) {
    return errorResponse(ErrorResponses.notFound('Contact', path));
  }
  // `/api/contact/message` is the public send — an action path of its own, so
  // the send can later move to its own function (per-function rate limits)
  // without a breaking rename. `/api/contact` is the settings resource:
  // read public (the site renders from it), mutation admin-gated.
  if (path.endsWith('/message')) {
    if (request.method !== 'POST') {
      return errorResponse(ErrorResponses.methodNotAllowed(request.method, ['POST'], path));
    }
    return contactModule.handle(request, context);
  }
  if (request.method === 'GET') return contactModule.handle(request, context);
  if (request.method === 'PUT') return protectedChain.handle(request, context);
  return errorResponse(ErrorResponses.methodNotAllowed(request.method, ['GET', 'PUT'], path));
};

export default handler;
