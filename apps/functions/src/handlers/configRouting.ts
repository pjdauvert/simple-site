import { AuthHandler } from './AuthHandler';
import { ConfigModule } from './ConfigModule';
import type { RequestHandler } from '../types/server-types';
import { isEventsEnabled, isGalleryEnabled } from './FeaturesModule';
import { withFeatureGate } from './featureGate';

/**
 * The config API's routing: which chain serves which path. Kept OUT of the
 * entrypoint so the wiring itself is testable — `config.mts` stays pure,
 * logic-free plumbing (see `featureGate.ts` on why entrypoints go untested).
 *
 * The granular gallery/events save endpoints behave as if they do not exist
 * while their flag is off (404, BEFORE auth). The rest of the config surface
 * is unaffected — a stored `gallery`/`events` attribute stays readable; only
 * its interpretation is gated, client-side. Only the live/published read is
 * public. Everything else — draft reads, the version manifest, publish/import,
 * and every mutation — is admin-gated.
 */
export const createConfigHandler = (): RequestHandler => {
  const configModule = new ConfigModule();
  const protectedChain = new AuthHandler(configModule);
  const protectedHandler: RequestHandler = (request, context) => protectedChain.handle(request, context);

  const flagGated = new Map<string, RequestHandler>([
    ['/api/config/gallery', withFeatureGate('Gallery', isGalleryEnabled, protectedHandler)],
    ['/api/config/events', withFeatureGate('Events', isEventsEnabled, protectedHandler)],
  ]);

  return async (request, context) => {
    const pathname = new URL(request.url).pathname;
    const gated = flagGated.get(pathname);
    if (gated) {
      return gated(request, context);
    }
    if (request.method === 'GET' && pathname === '/api/config') {
      return configModule.handle(request, context);
    }
    return protectedChain.handle(request, context);
  };
};
