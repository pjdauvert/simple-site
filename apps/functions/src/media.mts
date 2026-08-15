import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { MediaModule } from './handlers/MediaModule';
import type { RequestHandler } from './types/server-types';
import { isMediaEnabled } from './handlers/FeaturesModule';
import { withFeatureGate } from './handlers/featureGate';

export const config: Config = {
  method: ['GET', 'POST', 'PUT', 'DELETE'],
  path: ['/api/media', '/api/media/upload-auth', '/api/media/folder', '/api/media/:fileId'],
};

// All media routes are admin-only; AuthHandler enforces the Netlify Identity
// session (and is bypassed automatically when CONTEXT=dev).
const protectedChain = new AuthHandler(new MediaModule());

const handler: RequestHandler = async (request, context) => protectedChain.handle(request, context);

// While FEATURE_MEDIA is off the whole surface — listing, folders, delete, and
// the upload-signature endpoint — behaves as if it does not exist (404),
// regardless of auth.
export default withFeatureGate('Media management', isMediaEnabled, handler);
