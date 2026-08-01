import type { Config } from '@netlify/functions';
import { ContactModule } from './handlers/ContactModule';
import { ErrorResponses } from './errors/error';
import type { RequestHandler } from './types/server-types';
import { isContactEnabled } from './handlers/FeaturesModule';

export const config: Config = {
  method: ['POST'],
  path: ['/api/contact'],
};

const contactModule = new ContactModule();

const handler: RequestHandler = async (request, context) => {
  // Feature flag: when the contact feature is disabled the whole surface behaves
  // as if it does not exist (404).
  if (!isContactEnabled()) {
    const path = new URL(request.url).pathname;
    const error = ErrorResponses.notFound('Contact', path);
    return new Response(JSON.stringify({ ok: false, ...error.toJSON() }), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // Public by design — the form serves anonymous visitors, so no auth chain.
  return contactModule.handle(request, context);
};

export default handler;
