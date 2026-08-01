import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { ContactModule } from './handlers/ContactModule';
import { ErrorResponses } from './errors/error';
import type { RequestHandler } from './types/server-types';
import { isContactEnabled } from './handlers/FeaturesModule';

export const config: Config = {
  method: ['GET', 'POST', 'PUT'],
  path: ['/api/contact'],
};

const contactModule = new ContactModule();
const protectedChain = new AuthHandler(contactModule);

const handler: RequestHandler = async (request, context) => {
  // Feature flag: when the contact feature is disabled the whole surface behaves
  // as if it does not exist (404), regardless of auth.
  if (!isContactEnabled()) {
    const path = new URL(request.url).pathname;
    const error = ErrorResponses.notFound('Contact', path);
    return new Response(JSON.stringify({ ok: false, ...error.toJSON() }), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // Reads and the message send serve anonymous visitors; the settings mutation
  // is admin-gated.
  if (request.method === 'GET' || request.method === 'POST') {
    return contactModule.handle(request, context);
  }
  return protectedChain.handle(request, context);
};

export default handler;
