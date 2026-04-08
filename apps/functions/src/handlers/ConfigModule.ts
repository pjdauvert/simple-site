import type { RequestHandler } from 'src/types/server-types';
import { BaseHandler } from './BaseHandler';
import { getStore, type Store } from '@netlify/blobs';
import { ErrorResponses } from '../errors/error';
import { type SiteConfig, SiteConfigSchema } from '@simple-site/interfaces';
import { seedBlob } from './seed/seedBlob';

export class ConfigModule extends BaseHandler {

    private getStoredConfig = async (store: Store, storeKey: string, path: string = '') => {
        const storedConfig = await store.get(storeKey);
        if (!storedConfig) {
            throw ErrorResponses.notFound(`Store key ${storeKey}`, path);
        }
        return SiteConfigSchema.parse(JSON.parse(String(storedConfig)));
    }

    private getConfig = async (store: Store, storeKey: string, path: string = '') => {
        const storedConfig = await this.getStoredConfig(store, storeKey, path);
        return this.createSuccessResponse<SiteConfig>(storedConfig);
    }

    private setConfig = async (store: Store, storeKey: string, body?: string, path: string = '') => {
        if (!body) {
            throw ErrorResponses.invalidRequest('Request body is required', path);
        }
        const config = SiteConfigSchema.parse(body);

        // Store the configuration
        await store.set(storeKey, JSON.stringify(config));
        return this.createSuccessResponse({ message: 'Configuration updated successfully' });
    }

    override handle: RequestHandler = async (request) => {
        const path = request.url;
        if(request.headers.get('Content-Type') !== 'application/json') {
            throw ErrorResponses.invalidRequest('Invalid content type', path);
        }
        // Get the store name from the environment
        const storeName = `${Netlify.env.get('APP_NAME')}-store`;
        const storeKey = 'config';
        try {
            const store = getStore(storeName);
            // Seed the blob if it does not exist
            await seedBlob(store, 'siteConfig.json', SiteConfigSchema, storeKey);

            if (request.method === 'GET') {
                return this.getConfig(store, storeKey, path);
            } else if (request.method === 'POST') {
                // Read and parse the request body
                const body = await request.text();
                return this.setConfig(store, storeKey, body, path);
            } else {
                throw ErrorResponses.methodNotAllowed(request.method, ['GET', 'POST'], path);
            }
        } catch (error) {
            return this.handleError(error, path);
        }
    }
}
