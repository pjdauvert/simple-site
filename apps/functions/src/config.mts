import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { ConfigModule } from './handlers/ConfigModule';
import type { RequestHandler } from './types/server-types';
import { isGalleryEnabled } from './handlers/FeaturesModule';
import { withFeatureGate } from './handlers/featureGate';

export const config: Config = {
  method: ['GET', 'POST', 'PUT', 'DELETE'],
  path: [
    '/api/config',
    '/api/config/site',
    '/api/config/themes',
    '/api/config/menu',
    '/api/config/gallery',
    '/api/config/draft',
    '/api/config/publish',
    '/api/config/import',
    '/api/config/versions',
    '/api/config/versions/:key',
    '/api/config/versions/:key/publish',
    '/api/config/versions/:key/draft',
  ],
};

const configModule = new ConfigModule();
const protectedChain = new AuthHandler(configModule);

// The gallery save endpoint behaves as if it does not exist while
// FEATURE_GALLERY is off (404, before auth). The rest of the config surface is
// unaffected — a stored `gallery` attribute stays readable; only its
// interpretation is gated, client-side.
const galleryChain = withFeatureGate('Gallery', isGalleryEnabled, (request, context) =>
  protectedChain.handle(request, context),
);

const handler: RequestHandler = async (request, context) => {
  const pathname = new URL(request.url).pathname;
  if (pathname === '/api/config/gallery') {
    return galleryChain(request, context);
  }
  // Only the live/published read is public. Everything else — draft reads, the
  // version manifest, publish/import, and every mutation — is admin-gated.
  if (request.method === 'GET' && pathname === '/api/config') {
    return configModule.handle(request, context);
  }
  return protectedChain.handle(request, context);
};

export default handler;
