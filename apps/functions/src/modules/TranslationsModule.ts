import type { RequestHandler } from 'src/types/server-types';
import { BaseHandler } from '../handlers/BaseHandler';
import { getStore, type Store } from '@netlify/blobs';
import { ErrorResponses } from '../errors/error';
import { I18nDictionarySchema, I18nLocalesEnum, type I18nDictionary, type Locale } from '@simple-site/interfaces';


export class TranslationsModule extends BaseHandler {
    
    private getTranslations = async (configStore: Store, storeKey: string, path: string = '') => {
        const storedTranslations = await configStore.get(storeKey);
        if (!storedTranslations) {
            return this.createErrorResponse(ErrorResponses.notFound(path));
        }
        const translations = I18nDictionarySchema.parse(storedTranslations);
        return this.createSuccessResponse<I18nDictionary>(translations);
    }

    private setTranslations = async (configStore: Store, body: string, storeKey: string, path: string = '') => {
        if (!body || body.trim() === '') {
            return this.createErrorResponse(ErrorResponses.invalidRequest(`Request body is empty`, path));
        }
        // Parse the request body and validate it against the I18nDictionarySchema
        const translations = I18nDictionarySchema.parse(body);

        // Store the translation dictionary for the given locale
        await configStore.set(storeKey, JSON.stringify(translations));

        return this.createSuccessResponse({ message: 'Configuration updated successfully' });
    }

    override handle: RequestHandler = async (request, context) => {
        if(request.headers.get('Content-Type') !== 'application/json') {
            return this.createErrorResponse(ErrorResponses.invalidRequest('Invalid content type', request.url));
        }
        const { language } = context.params;

        if(!language || !Object.values(I18nLocalesEnum).includes(language as Locale)) {
            return this.createErrorResponse(ErrorResponses.invalidRequest(`Invalid language: ${language}`));
        }
        // Get the store name from the environment
        const STORE_NAME = `${process.env.APP_NAME}-store`;
        const configStore = getStore(STORE_NAME);
        const storeKey = `translations-${language}`;


        if (request.method === 'GET') {
            return this.getTranslations(configStore, storeKey, request.url);
        } else if (request.method === 'POST') {
            // Read and parse the request body
            const body = await request.text();
            return this.setTranslations(configStore, body, storeKey, request.url);
        } else {
            return this.createErrorResponse(ErrorResponses.methodNotAllowed(request.method, ['GET', 'POST']));
        }
    }
}