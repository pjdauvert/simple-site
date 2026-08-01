import type { RequestHandler } from '../types/server-types';
import { BaseHandler } from './BaseHandler';
import { getStore, type Store } from '@netlify/blobs';
import { ErrorResponses } from '../errors/error';
import { TeamConfigSchema, type TeamConfig } from '@simple-site/interfaces';
import { seedBlob } from './seed/seedBlob';

/**
 * Team management. Members live in their own blob (key `team`) with a DIRECT-SAVE
 * lifecycle — unlike the site config there is no draft/publish step, so an admin
 * save is immediately live. The whole surface is feature-gated by `FEATURE_TEAM`
 * in `team.mts` (404 when off); reads are public (the site renders them), the
 * mutation is admin-gated by the `AuthHandler` wired there.
 *
 * Routes:
 *  - `GET /api/team` → the whole team (`{ members: [] }` when nothing is stored yet)
 *  - `PUT /api/team` → replace the whole team (validates slugs, uniqueness, shapes)
 */
export class TeamModule extends BaseHandler {

    private static readonly STORE_KEY = 'team';

    private requireJson = (request: Request, path: string): void => {
        if (request.headers.get('Content-Type') !== 'application/json') {
            throw ErrorResponses.invalidRequest('Invalid content type', path);
        }
    };

    /** GET /api/team — an absent blob is an empty team, not an error. */
    private getTeam = async (store: Store): Promise<Response> => {
        const stored = await store.get(TeamModule.STORE_KEY);
        const team: TeamConfig = stored
            ? TeamConfigSchema.parse(JSON.parse(String(stored)))
            : { members: [] };
        return this.createSuccessResponse<TeamConfig>(team);
    };

    /** PUT /api/team — replace the whole team; goes live immediately. */
    private replaceTeam = async (store: Store, body: unknown): Promise<Response> => {
        const team = TeamConfigSchema.parse(body);
        await store.set(TeamModule.STORE_KEY, JSON.stringify(team));
        return this.createSuccessResponse({ message: 'Team updated successfully' });
    };

    override handle: RequestHandler = async (request) => {
        const path = request.url;
        const method = request.method;
        const storeName = `${Netlify.env.get('APP_NAME')}-store`;
        try {
            const store = getStore(storeName);
            await seedBlob(store, 'team.json', TeamConfigSchema, TeamModule.STORE_KEY);

            if (method === 'GET') return await this.getTeam(store);
            if (method === 'PUT') {
                this.requireJson(request, path);
                return await this.replaceTeam(store, await request.json());
            }
            throw ErrorResponses.methodNotAllowed(method, ['GET', 'PUT'], path);
        } catch (error) {
            return this.handleError(error, path);
        }
    };
}
