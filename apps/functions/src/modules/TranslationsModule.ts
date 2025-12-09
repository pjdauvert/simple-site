import type { RequestHandler } from 'src/types/server-types';
import { BaseHandler } from '../handlers/BaseHandler';
import { getStore, type Store } from '@netlify/blobs';
import { ErrorResponses } from '../errors/error';
import { I18nDictionarySchema, I18nLocalesEnum, I18nSchema, type I18nDictionary, type Locale } from '@simple-site/interfaces';


export class TranslationsModule extends BaseHandler {

    private getStoredTranslations = async (configStore: Store, storeKey: string, path: string = '') => {
        const storedTranslations = await configStore.get(storeKey);
        if (!storedTranslations) {
            throw ErrorResponses.notFound(`Store key ${storeKey}`, path);
        }
        return I18nSchema.parse(JSON.parse(String(storedTranslations)));
    }
    
    private getTranslations = async (configStore: Store, storeKey: string, language: Locale, path: string = '') => {
        const translations = await this.getStoredTranslations(configStore, storeKey, path);
        return this.createSuccessResponse<I18nDictionary>(translations[language]);
    }

    private setTranslations = async (configStore: Store, body: string, storeKey: string, language: Locale, path: string = '') => {
        if (!body || body.trim() === '') {
            throw ErrorResponses.invalidRequest(`Request body is empty`, path);
        }
        // Parse the request body and validate it against the I18nDictionarySchema
        const dictionary = I18nDictionarySchema.parse(body);
        const translations = await this.getStoredTranslations(configStore, storeKey, path);
        // Merge the new dictionary with the existing translations
        translations[language] = { ...translations[language], ...dictionary };
        // Store the translation dictionary for the given locale
        await configStore.set(storeKey, JSON.stringify(translations));

        return this.createSuccessResponse({ message: 'Configuration updated successfully' });
    }

    override handle: RequestHandler = async (request, context) => {
        if(request.headers.get('Content-Type') !== 'application/json') {
            throw ErrorResponses.invalidRequest('Invalid content type', request.url);
        }
        const language = context.params.language as Locale;

        if(!language || !Object.values(I18nLocalesEnum).includes(language)) {
            throw ErrorResponses.invalidRequest(`Invalid language: ${language}`, request.url);
        }
        // Get the store name from the environment
        const STORE_NAME = `${process.env.APP_NAME}-store`;
        const configStore = getStore(STORE_NAME);
        const storeKey = 'translations';


        if (request.method === 'GET') {
            return this.getTranslations(configStore, storeKey, language, request.url);
        } else if (request.method === 'POST') {
            // Read and parse the request body
            const body = await request.text();
            return this.setTranslations(configStore, body, storeKey, language, request.url);
        } else {
            throw ErrorResponses.methodNotAllowed(request.method, ['GET', 'POST'], request.url);
        }
    }
}