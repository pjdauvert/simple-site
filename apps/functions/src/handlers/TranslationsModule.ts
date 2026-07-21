import type { RequestHandler } from '../types/server-types';
import { BaseHandler } from './BaseHandler';
import { getStore, type Store } from '@netlify/blobs';
import { ErrorResponses } from '../errors/error';
import {
    BASE_LOCALE,
    I18nDictionarySchema,
    I18nSchema,
    SiteThemeConfigSchema,
    toCanonicalLocale,
    type I18n,
    type I18nDictionary,
    type Locale,
    type TranslationsPayload,
} from '@simple-site/interfaces';
import { seedBlob } from './seed/seedBlob';

/**
 * Translations management. Languages are data-driven — the stored blob (`translations`)
 * is a `Record<locale, dictionary>` whose keys are the OVERRIDE languages the site offers,
 * and admins add / import / remove them through the Translations page. The default
 * language (`config.site.defaultLanguage`) never has a dictionary: its text lives in the
 * site configuration, so writes and deletes on it are rejected with a 409.
 *
 * Reads (`GET`) are public (the site renders them); mutations are admin-gated by the
 * `AuthHandler` wired in `translations.mts`.
 *
 * Routes (`:language` is a BCP-47 locale code, canonicalized — `fr-ca` ≡ `fr-CA`):
 *  - `GET    /api/translations`            → `{ defaultLanguage, translations }` (all override languages)
 *  - `GET    /api/translations/:language`  → one language's dictionary (`{}` for the default language)
 *  - `POST   /api/translations/:language`  → merge keys into a language (409 on the default)
 *  - `PUT    /api/translations/:language`  → replace a language's whole dictionary (409 on the default)
 *  - `PUT    /api/translations`            → bulk import: upsert every language in the file (the default is skipped)
 *  - `DELETE /api/translations/:language`  → remove a language (default + last override protected)
 */
export class TranslationsModule extends BaseHandler {

    private static readonly STORE_KEY = 'translations';
    /** The published site config blob (owned by ConfigModule) — read-only source of the default language. */
    private static readonly CONFIG_KEY = 'config';

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

    /** The config-defined default language; BASE_LOCALE when no published config is readable. */
    private getDefaultLanguage = async (store: Store): Promise<Locale> => {
        try {
            const stored = await store.get(TranslationsModule.CONFIG_KEY);
            if (!stored) return BASE_LOCALE;
            const config = JSON.parse(String(stored)) as { site?: unknown };
            const { defaultLanguage } = SiteThemeConfigSchema.parse(config.site);
            return toCanonicalLocale(defaultLanguage) ?? BASE_LOCALE;
        } catch {
            return BASE_LOCALE;
        }
    };

    /** Config wins: drop any stored dictionary for the default language (idempotent, runs on every request). */
    private migrateOutDefaultLanguage = async (store: Store, defaultLanguage: Locale): Promise<void> => {
        const stored = await store.get(TranslationsModule.STORE_KEY);
        if (!stored) return;
        const translations = I18nSchema.parse(JSON.parse(String(stored)));
        if (defaultLanguage in translations) {
            delete translations[defaultLanguage];
            await this.saveTranslations(store, translations);
        }
    };

    private requireJson = (request: Request, path: string): void => {
        if (request.headers.get('Content-Type') !== 'application/json') {
            throw ErrorResponses.invalidRequest('Invalid content type', path);
        }
    };

    /** GET /api/translations — the default language plus every override dictionary. */
    private getAll = async (store: Store, defaultLanguage: Locale, path: string): Promise<Response> => {
        const translations = await this.getStoredTranslations(store, path);
        return this.createSuccessResponse<TranslationsPayload>({ defaultLanguage, translations });
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

    /** PUT /api/translations — bulk import: upsert each language in the file (the default language is skipped — config wins). */
    private importAll = async (store: Store, defaultLanguage: Locale, body: unknown, path: string): Promise<Response> => {
        const parsed = I18nSchema.safeParse(body);
        if (!parsed.success) {
            throw ErrorResponses.invalidRequest('Invalid translations file', path);
        }
        const translations = await this.getStoredTranslations(store, path);
        let imported = 0;
        for (const [locale, dictionary] of Object.entries(parsed.data)) {
            const canonical = toCanonicalLocale(locale);
            if (!canonical || canonical === defaultLanguage) continue;
            translations[canonical] = dictionary;
            imported++;
        }
        await this.saveTranslations(store, translations);
        return this.createSuccessResponse({ message: `Imported ${imported} language(s) successfully` });
    };

    /** DELETE /api/translations/:language — remove a language (the last override is protected). */
    private deleteOne = async (store: Store, language: Locale, path: string): Promise<Response> => {
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
        const language = context.params.language as string | undefined;
        const storeName = `${Netlify.env.get('APP_NAME')}-store`;
        try {
            const store = getStore(storeName);
            await seedBlob(store, 'i18n.json', I18nSchema, TranslationsModule.STORE_KEY);
            const defaultLanguage = await this.getDefaultLanguage(store);
            await this.migrateOutDefaultLanguage(store, defaultLanguage);

            // Collection routes — no `:language` segment.
            if (!language) {
                if (method === 'GET') return await this.getAll(store, defaultLanguage, path);
                if (method === 'PUT') {
                    this.requireJson(request, path);
                    return await this.importAll(store, defaultLanguage, await request.json(), path);
                }
                throw ErrorResponses.methodNotAllowed(method, ['GET', 'PUT'], path);
            }

            // Per-language routes.
            const canonical = toCanonicalLocale(language);
            if (!canonical) {
                throw ErrorResponses.invalidRequest(`Invalid language: ${language}`, path);
            }
            if (method === 'GET') return await this.getOne(store, canonical, path);
            if (canonical === defaultLanguage) {
                throw ErrorResponses.conflict(
                    `'${defaultLanguage}' is the default language — its text lives in the site configuration`,
                    path,
                );
            }
            if (method === 'POST') {
                this.requireJson(request, path);
                return await this.mergeOne(store, canonical, await request.json(), path);
            }
            if (method === 'PUT') {
                this.requireJson(request, path);
                return await this.replaceOne(store, canonical, await request.json(), path);
            }
            if (method === 'DELETE') {
                return await this.deleteOne(store, canonical, path);
            }
            throw ErrorResponses.methodNotAllowed(method, ['GET', 'POST', 'PUT', 'DELETE'], path);
        } catch (error) {
            return this.handleError(error, path);
        }
    };
}
