import { BaseHandler } from './BaseHandler';
import type { RequestHandler } from '../types/server-types';

export const isMediaEnabled = (): boolean => Netlify.env.get('FEATURE_MEDIA') === 'true';
export const isTeamEnabled = (): boolean => Netlify.env.get('FEATURE_TEAM') === 'true';

/**
 * Reports which optional features are enabled so the client can gate its UI at
 * runtime (no rebuild needed to flip a flag). Public — feature availability is
 * not sensitive.
 */
export class FeaturesModule extends BaseHandler {
  override handle: RequestHandler = async () =>
    this.createSuccessResponse({ media: isMediaEnabled(), team: isTeamEnabled() });
}
