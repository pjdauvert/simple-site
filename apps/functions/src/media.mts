import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { MediaModule } from './handlers/MediaModule';
import { ErrorResponses } from './errors/error';
import type { RequestHandler } from './types/server-types';
import { isMediaEnabled } from './handlers/FeaturesModule';

export const config: Config = {
  method: ['GET', 'POST', 'DELETE'],
  path: ['/api/media', '/api/media/upload-auth', '/api/media/folder', '/api/media/:fileId'],
};

// All media routes are admin-only; AuthHandler enforces the Netlify Identity
// session (and is bypassed automatically when CONTEXT=dev).
const protectedChain = new AuthHandler(new MediaModule());

const handler: RequestHandler = async (request, context) => {
  // Feature flag: when media management is disabled the whole surface — listing,
  // folders, delete, and the upload-signature endpoint — behaves as if it does
  // not exist (404), regardless of auth.
  if (!isMediaEnabled()) {
    const path = new URL(request.url).pathname;
    const error = ErrorResponses.notFound('Media management', path);
    return new Response(JSON.stringify({ ok: false, ...error.toJSON() }), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return protectedChain.handle(request, context);
};

export default handler;
