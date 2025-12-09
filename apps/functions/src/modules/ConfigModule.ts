import type { RequestHandler } from 'src/types/server-types';
import { BaseHandler } from '../handlers/BaseHandler';
import { getStore, type Store } from '@netlify/blobs';
import { ErrorResponses } from '../errors/error';
import { SiteConfigSchema } from '@simple-site/interfaces';

export class ConfigModule extends BaseHandler {

    private readonly CONFIG_KEY = 'config';

    private getStoredConfig = async (configStore: Store, path: string = '') => {
        const storedConfig = await configStore.get(this.CONFIG_KEY);
        if (!storedConfig) {
            throw ErrorResponses.notFound(`Store key ${this.CONFIG_KEY}`, path);
        }
        return SiteConfigSchema.parse(JSON.parse(String(storedConfig)));
    }

    private getConfig = async (configStore: Store, path: string = '') => {
        const storedConfig = await this.getStoredConfig(configStore, path);
        return this.createSuccessResponse(storedConfig);
    }

    private setConfig = async (configStore: Store, siteConfig: string, path: string = '') => {
        if (!siteConfig) {
            throw ErrorResponses.invalidRequest('Request body is required', path);
        }
        SiteConfigSchema.parse(siteConfig);

        // Store the configuration
        await configStore.set(this.CONFIG_KEY, siteConfig);
        return this.createSuccessResponse({ message: 'Configuration updated successfully' });
    }

    override handle: RequestHandler = async (request) => {
        // Get the store name from the environment
        
        try {
            const configStore = getStore(`${process.env.APP_NAME}-store`);

            if (request.method === 'GET') {
                return this.getConfig(configStore, request.url);
            } else if (request.method === 'POST') {
                // Read and parse the request body
                const body = await request.text();
                return this.setConfig(configStore, body);
            } else {
                throw ErrorResponses.methodNotAllowed(request.method, ['GET', 'POST'], request.url);
            }
        } catch (error) {
            return this.handleError(error, request.url);
        }
    }
}
