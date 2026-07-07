import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { TranslationsModule } from './handlers/TranslationsModule';
import type { RequestHandler } from './types/server-types';

export const config: Config = {
  method: ['GET', 'POST', 'PUT', 'DELETE'],
  path: ['/api/translations', '/api/translations/:language'],
};

const translationsModule = new TranslationsModule();
const protectedChain = new AuthHandler(translationsModule);

const handler: RequestHandler = async (request, context) => {
  // Reads are public (the site renders them); mutations are admin-gated.
  if (request.method === 'GET') {
    return translationsModule.handle(request, context);
  }
  return protectedChain.handle(request, context);
};

export default handler;
