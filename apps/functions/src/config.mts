import type { Config } from '@netlify/functions';
import { ConfigModule } from './handlers/ConfigModule';
import type { RequestHandler } from './types/server-types';

export const config: Config = {
  method: ['GET', 'POST'],
  path: '/api/config',
};

const handlerChain = new ConfigModule();

const handler: RequestHandler = async (request, context) => {
  if (request.method === 'GET') {
    return handlerChain.handle(request, context);
  } else {
    // chain handler with auth protection
    return handlerChain.handle(request, context);
  }
};

export default handler;

