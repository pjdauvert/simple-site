import type { Config } from '@netlify/functions';
import { FeaturesModule } from './handlers/FeaturesModule';
import type { RequestHandler } from './types/server-types';

export const config: Config = {
  method: ['GET'],
  path: '/api/features',
};

const featuresModule = new FeaturesModule();

const handler: RequestHandler = async (request, context) => featuresModule.handle(request, context);

export default handler;
