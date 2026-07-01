import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { ConfigModule } from './handlers/ConfigModule';
import type { RequestHandler } from './types/server-types';

export const config: Config = {
  method: ['GET', 'POST', 'PUT'],
  path: ['/api/config', '/api/config/site', '/api/config/themes'],
};

const configModule = new ConfigModule();
const protectedChain = new AuthHandler(configModule);

const handler: RequestHandler = async (request, context) => {
  // Public read; every mutation (POST full config, PUT site settings) is admin-gated.
  if (request.method === 'GET') {
    return configModule.handle(request, context);
  }
  return protectedChain.handle(request, context);
};

export default handler;
