import type { RequestHandler } from '../types/server-types';
import { BaseHandler } from './BaseHandler';
import { getStore, type Store } from '@netlify/blobs';
import { ErrorResponses } from '../errors/error';
import { I18nDictionarySchema, I18nLocalesEnum, I18nSchema, type I18nDictionary, type Locale } from '@simple-site/interfaces';
import { seedBlob } from './seed/seedBlob';


export class TranslationsModule extends BaseHandler {

    private getStoredTranslations = async (store: Store, storeKey: string, path: string = '') => {
        const storedTranslations = await store.get(storeKey);
        if (!storedTranslations) {
            throw ErrorResponses.notFound(`Store key ${storeKey}`, path);
        }
        return I18nSchema.parse(JSON.parse(String(storedTranslations)));
    }
    
    private getTranslations = async (store: Store, storeKey: string, language: Locale, path: string = '') => {
        const translations = await this.getStoredTranslations(store, storeKey, path);
        return this.createSuccessResponse<I18nDictionary>(translations[language]);
    }

    private setTranslations = async (store: Store, storeKey: string, language: Locale, body?: I18nDictionary,path: string = '') => {
        if (!body) {
            throw ErrorResponses.invalidRequest(`Request body is empty`, path);
        }
        // Parse the request body and validate it against the I18nDictionarySchema
        const dictionary = I18nDictionarySchema.parse(body);
        const translations = await this.getStoredTranslations(store, storeKey, path);
        // Merge the new dictionary with the existing translations
        translations[language] = { ...translations[language], ...dictionary };
        // Store the translation dictionary for the given locale
        await store.set(storeKey, JSON.stringify(translations));

        return this.createSuccessResponse({ message: `${language} translations updated successfully` });
    }

    // Replaces a locale's dictionary wholesale (vs setTranslations' merge). The admin
    // translations editor sends the complete desired dictionary, so keys removed in the
    // UI actually disappear — a merge could only ever add/update.
    private replaceTranslations = async (store: Store, storeKey: string, language: Locale, body?: I18nDictionary, path: string = '') => {
        if (!body) {
            throw ErrorResponses.invalidRequest(`Request body is empty`, path);
        }
        const dictionary = I18nDictionarySchema.parse(body);
        const translations = await this.getStoredTranslations(store, storeKey, path);
        translations[language] = dictionary;
        await store.set(storeKey, JSON.stringify(translations));

        return this.createSuccessResponse({ message: `${language} translations replaced successfully` });
    }

    override handle: RequestHandler = async (request, context) => {
        const language = context.params.language as Locale;
        const storeName = `${Netlify.env.get('APP_NAME')}-store`;
        const storeKey = 'translations';
        try {
            // Validated inside the try so an invalid locale returns a 400 response
            // (via handleError) rather than throwing out of the handler.
            if (!language || !Object.values(I18nLocalesEnum).includes(language)) {
                throw ErrorResponses.invalidRequest(`Invalid language: ${language}`, request.url);
            }
            const store = getStore(storeName);
            await seedBlob(store, 'i18n.json', I18nSchema, storeKey);

            // `await` each branch so async rejections (Zod/notFound) surface in the
            // catch below and are mapped to a proper error response by handleError.
            if (request.method === 'GET') {
                return await this.getTranslations(store, storeKey, language, request.url);
            } else if (request.method === 'POST') {
                if (request.headers.get('Content-Type') !== 'application/json') {
                    throw ErrorResponses.invalidRequest('Invalid content type', request.url);
                }
                const body = await request.json() as I18nDictionary;
                return await this.setTranslations(store, storeKey, language, body, request.url);
            } else if (request.method === 'PUT') {
                if (request.headers.get('Content-Type') !== 'application/json') {
                    throw ErrorResponses.invalidRequest('Invalid content type', request.url);
                }
                const body = await request.json() as I18nDictionary;
                return await this.replaceTranslations(store, storeKey, language, body, request.url);
            } else {
                throw ErrorResponses.methodNotAllowed(request.method, ['GET', 'POST', 'PUT'], request.url);
            }
        } catch (error) {
            return this.handleError(error, request.url);
        }
    }
}
