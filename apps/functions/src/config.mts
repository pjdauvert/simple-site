import type { Config } from '@netlify/functions';
import { createConfigHandler } from './handlers/configRouting';

export const config: Config = {
  method: ['GET', 'POST', 'PUT', 'DELETE'],
  path: [
    '/api/config',
    '/api/config/site',
    '/api/config/themes',
    '/api/config/menu',
    '/api/config/gallery',
    '/api/config/events',
    '/api/config/draft',
    '/api/config/publish',
    '/api/config/import',
    '/api/config/versions',
    '/api/config/versions/:key',
    '/api/config/versions/:key/publish',
    '/api/config/versions/:key/draft',
  ],
};

// Routing (feature gates, public read, auth) lives in the tested
// `handlers/configRouting.ts` — the entrypoint only declares and wires.
export default createConfigHandler();
