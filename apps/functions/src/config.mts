import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { ConfigModule } from './handlers/ConfigModule';
import type { RequestHandler } from './types/server-types';

export const config: Config = {
  method: ['GET', 'POST'],
  path: '/api/config',
};

const configModule = new ConfigModule();
const protectedChain = new AuthHandler(configModule);

const handler: RequestHandler = async (request, context) => {
  if (request.method === 'GET') {
    return configModule.handle(request, context);
  }
  return protectedChain.handle(request, context);
};

export default handler;
