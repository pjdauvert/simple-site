import type { Config } from '@netlify/functions';
import { AuthHandler } from './handlers/AuthHandler';
import { TeamModule } from './handlers/TeamModule';
import { ErrorResponses } from './errors/error';
import type { RequestHandler } from './types/server-types';
import { isTeamEnabled } from './handlers/FeaturesModule';

export const config: Config = {
  method: ['GET', 'PUT'],
  path: ['/api/team'],
};

const teamModule = new TeamModule();
const protectedChain = new AuthHandler(teamModule);

const handler: RequestHandler = async (request, context) => {
  // Feature flag: when the team feature is disabled the whole surface behaves
  // as if it does not exist (404), regardless of auth.
  if (!isTeamEnabled()) {
    const path = new URL(request.url).pathname;
    const error = ErrorResponses.notFound('Team', path);
    return new Response(JSON.stringify({ ok: false, ...error.toJSON() }), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // Reads are public (the site renders them); the mutation is admin-gated.
  if (request.method === 'GET') {
    return teamModule.handle(request, context);
  }
  return protectedChain.handle(request, context);
};

export default handler;
