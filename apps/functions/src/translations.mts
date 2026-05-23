import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { TranslationsModule } from './handlers/TranslationsModule';
import type { RequestHandler } from './types/server-types';

export const config: Config = {
  method: ['GET', 'POST'],
  path: '/api/translations/:language',
};

const translationsModule = new TranslationsModule();
const protectedChain = new AuthHandler(translationsModule);

const handler: RequestHandler = async (request, context) => {
  if (request.method === 'GET') {
    return translationsModule.handle(request, context);
  }
  return protectedChain.handle(request, context);
};

export default handler;
