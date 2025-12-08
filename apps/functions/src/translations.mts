import type { Config } from '@netlify/functions';
import { TranslationsModule } from './modules';
import type { RequestHandler } from './types/server-types';

export const config: Config = {
  method: ['GET', 'POST'],
  path: '/api/translations/:language',
};

const handlerChain = new TranslationsModule();

const handler: RequestHandler = async (request, context) => {
  if (request.method === 'GET') {
    return handlerChain.handle(request, context);
  } else {
    // chain handler with auth protection
    return handlerChain.handle(request, context);
  }
};

export default handler;