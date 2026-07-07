import type { RequestHandler } from '../types/server-types';
import { BaseHandler } from './BaseHandler';
import { getStore, type Store } from '@netlify/blobs';
import { ErrorResponses } from '../errors/error';
import {
    BASE_LOCALE,
    I18nDictionarySchema,
    I18nSchema,
    isLocaleCode,
    type I18n,
    type I18nDictionary,
    type Locale,
} from '@simple-site/interfaces';
import { seedBlob } from './seed/seedBlob';

/**
 * Translations management. Languages are data-driven — the stored blob (`translations`)
 * is a `Record<locale, dictionary>` whose keys are the languages the site offers, and
 * admins add / import / remove them through the Translations page.
 *
 * Reads (`GET`) are public (the site renders them); mutations are admin-gated by the
 * `AuthHandler` wired in `translations.mts`.
 *
 * Routes (`:language` is an ISO 639-1 code):
 *  - `GET    /api/translations`            → the whole blob (all languages)
 *  - `GET    /api/translations/:language`  → one language's dictionary
 *  - `POST   /api/translations/:language`  → merge keys into a language
 *  - `PUT    /api/translations/:language`  → replace a language's whole dictionary
 *  - `PUT    /api/translations`            → bulk import: upsert every language in the file
 *  - `DELETE /api/translations/:language`  → remove a language (base locale protected)
 */
export class TranslationsModule extends BaseHandler {

    private static readonly STORE_KEY = 'translations';

    private getStoredTranslations = async (store: Store, path: string): Promise<I18n> => {
        const stored = await store.get(TranslationsModule.STORE_KEY);
        if (!stored) {
            throw ErrorResponses.notFound(`Store key ${TranslationsModule.STORE_KEY}`, path);
        }
        return I18nSchema.parse(JSON.parse(String(stored)));
    };

    private saveTranslations = async (store: Store, translations: I18n): Promise<void> => {
        await store.set(TranslationsModule.STORE_KEY, JSON.stringify(translations));
    };

    private requireJson = (request: Request, path: string): void => {
        if (request.headers.get('Content-Type') !== 'application/json') {
            throw ErrorResponses.invalidRequest('Invalid content type', path);
        }
    };

    /** GET /api/translations — the whole blob (all languages). */
    private getAll = async (store: Store, path: string): Promise<Response> => {
        const translations = await this.getStoredTranslations(store, path);
        return this.createSuccessResponse<I18n>(translations);
    };

    /** GET /api/translations/:language — one language's dictionary. */
    private getOne = async (store: Store, language: Locale, path: string): Promise<Response> => {
        const translations = await this.getStoredTranslations(store, path);
        return this.createSuccessResponse<I18nDictionary>(translations[language] ?? {});
    };

    /** POST /api/translations/:language — merge keys into a language (adds/updates only). */
    private mergeOne = async (store: Store, language: Locale, body: unknown, path: string): Promise<Response> => {
        const dictionary = I18nDictionarySchema.parse(body);
        const translations = await this.getStoredTranslations(store, path);
        translations[language] = { ...translations[language], ...dictionary };
        await this.saveTranslations(store, translations);
        return this.createSuccessResponse({ message: `${language} translations updated successfully` });
    };

    /** PUT /api/translations/:language — replace a language's whole dictionary (removals stick). */
    private replaceOne = async (store: Store, language: Locale, body: unknown, path: string): Promise<Response> => {
        const dictionary = I18nDictionarySchema.parse(body);
        const translations = await this.getStoredTranslations(store, path);
        translations[language] = dictionary;
        await this.saveTranslations(store, translations);
        return this.createSuccessResponse({ message: `${language} translations replaced successfully` });
    };

    /** PUT /api/translations — bulk import: validate the file and upsert each language in it. */
    private importAll = async (store: Store, body: unknown, path: string): Promise<Response> => {
        const parsed = I18nSchema.safeParse(body);
        if (!parsed.success) {
            throw ErrorResponses.invalidRequest('Invalid translations file', path);
        }
        const incoming = parsed.data;
        const translations = await this.getStoredTranslations(store, path);
        for (const [locale, dictionary] of Object.entries(incoming)) {
            translations[locale] = dictionary;
        }
        await this.saveTranslations(store, translations);
        return this.createSuccessResponse({ message: `Imported ${Object.keys(incoming).length} language(s) successfully` });
    };

    /** DELETE /api/translations/:language — remove a language (base locale is protected). */
    private deleteOne = async (store: Store, language: Locale, path: string): Promise<Response> => {
        if (language === BASE_LOCALE) {
            throw ErrorResponses.conflict(`The base language '${BASE_LOCALE}' cannot be removed`, path);
        }
        const translations = await this.getStoredTranslations(store, path);
        if (!(language in translations)) {
            throw ErrorResponses.notFound(`Language ${language}`, path);
        }
        if (Object.keys(translations).length <= 1) {
            throw ErrorResponses.conflict('Cannot remove the last remaining language', path);
        }
        delete translations[language];
        await this.saveTranslations(store, translations);
        return this.createSuccessResponse({ message: `${language} removed successfully` });
    };

    override handle: RequestHandler = async (request, context) => {
        const path = request.url;
        const method = request.method;
        const language = context.params.language as Locale | undefined;
        const storeName = `${Netlify.env.get('APP_NAME')}-store`;
        try {
            const store = getStore(storeName);
            await seedBlob(store, 'i18n.json', I18nSchema, TranslationsModule.STORE_KEY);

            // Collection routes — no `:language` segment.
            if (!language) {
                if (method === 'GET') return await this.getAll(store, path);
                if (method === 'PUT') {
                    this.requireJson(request, path);
                    return await this.importAll(store, await request.json(), path);
                }
                throw ErrorResponses.methodNotAllowed(method, ['GET', 'PUT'], path);
            }

            // Per-language routes.
            if (!isLocaleCode(language)) {
                throw ErrorResponses.invalidRequest(`Invalid language: ${language}`, path);
            }
            if (method === 'GET') return await this.getOne(store, language, path);
            if (method === 'POST') {
                this.requireJson(request, path);
                return await this.mergeOne(store, language, await request.json(), path);
            }
            if (method === 'PUT') {
                this.requireJson(request, path);
                return await this.replaceOne(store, language, await request.json(), path);
            }
            if (method === 'DELETE') {
                return await this.deleteOne(store, language, path);
            }
            throw ErrorResponses.methodNotAllowed(method, ['GET', 'POST', 'PUT', 'DELETE'], path);
        } catch (error) {
            return this.handleError(error, path);
        }
    };
}
