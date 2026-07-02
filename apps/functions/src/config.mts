import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { ConfigModule } from './handlers/ConfigModule';
import type { RequestHandler } from './types/server-types';

export const config: Config = {
  method: ['GET', 'POST', 'PUT', 'DELETE'],
  path: [
    '/api/config',
    '/api/config/site',
    '/api/config/draft',
    '/api/config/publish',
    '/api/config/import',
    '/api/config/versions',
    '/api/config/versions/:key',
    '/api/config/versions/:key/publish',
  ],
};

const configModule = new ConfigModule();
const protectedChain = new AuthHandler(configModule);

const handler: RequestHandler = async (request, context) => {
  // Only the live/published read is public. Everything else — draft reads, the
  // version manifest, publish/import, and every mutation — is admin-gated.
  const pathname = new URL(request.url).pathname;
  if (request.method === 'GET' && pathname === '/api/config') {
    return configModule.handle(request, context);
  }
  return protectedChain.handle(request, context);
};

export default handler;
