import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { MediaModule } from './handlers/MediaModule';
import type { RequestHandler } from './types/server-types';

export const config: Config = {
  method: ['GET', 'POST', 'DELETE'],
  path: ['/api/media', '/api/media/upload-auth', '/api/media/folder', '/api/media/:fileId'],
};

// All media routes are admin-only; AuthHandler enforces the Netlify Identity
// session (and is bypassed automatically when CONTEXT=dev).
const protectedChain = new AuthHandler(new MediaModule());

const handler: RequestHandler = async (request, context) => protectedChain.handle(request, context);

export default handler;
