import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { TeamModule } from './handlers/TeamModule';
import type { RequestHandler } from './types/server-types';
import { isTeamEnabled } from './handlers/FeaturesModule';
import { withFeatureGate } from './handlers/featureGate';

export const config: Config = {
  method: ['GET', 'PUT'],
  path: ['/api/team'],
};

const teamModule = new TeamModule();
const protectedChain = new AuthHandler(teamModule);

const handler: RequestHandler = async (request, context) => {
  // Reads are public (the site renders them); the mutation is admin-gated.
  if (request.method === 'GET') {
    return teamModule.handle(request, context);
  }
  return protectedChain.handle(request, context);
};

// While FEATURE_TEAM is off the whole surface behaves as if it does not exist
// (404), regardless of auth.
export default withFeatureGate('Team', isTeamEnabled, handler);
