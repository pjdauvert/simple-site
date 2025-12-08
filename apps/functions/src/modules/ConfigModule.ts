import type { RequestHandler } from 'src/types/server-types';
import { BaseHandler } from '../handlers/BaseHandler';
import { getStore, type Store } from '@netlify/blobs';
import { ErrorResponses } from '../errors/error';
import { SiteConfigSchema } from '@simple-site/interfaces';

const CONFIG_KEY = 'config';

export class ConfigModule extends BaseHandler {

    private getConfig = async (configStore: Store, path: string = '') => {
        const appConfig = await configStore.get(CONFIG_KEY);
        if (!appConfig) {
            return this.createErrorResponse(ErrorResponses.notFound(path));
        }
        return this.createSuccessResponse(appConfig);
    }
    
    private setConfig = async (configStore: Store, siteConfig: string, path: string = '') => {
        if (!siteConfig) {
            return this.createErrorResponse(ErrorResponses.invalidRequest('Request body is required', path));
        }
        SiteConfigSchema.parse(siteConfig);

        // Store the configuration
        await configStore.set(CONFIG_KEY, siteConfig);

        return this.createSuccessResponse({ message: 'Configuration updated successfully' });
    }

    override handle: RequestHandler = async (request) => {
        // Get the store name from the environment
        const STORE_NAME = `${process.env.APP_NAME}-store`;
        const configStore = getStore(STORE_NAME);

        if (request.method === 'GET') {
            return this.getConfig(configStore, request.url);
        } else if (request.method === 'POST') {
            // Read and parse the request body
            const body = await request.text();
            return this.setConfig(configStore, body);
        } else {
            return this.createErrorResponse(ErrorResponses.methodNotAllowed(request.method, ['GET', 'POST']));
        }
    }
}