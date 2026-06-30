import { BaseHandler } from './BaseHandler';
import type { RequestHandler } from '../types/server-types';
import { isMediaEnabled } from '../featureFlags';

/**
 * Reports which optional features are enabled so the client can gate its UI at
 * runtime (no rebuild needed to flip a flag). Public — feature availability is
 * not sensitive.
 */
export class FeaturesModule extends BaseHandler {
  override handle: RequestHandler = async () =>
    this.createSuccessResponse({ media: isMediaEnabled() });
}
