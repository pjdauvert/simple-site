import type { RequestHandler } from '../types/server-types';
import { BaseHandler } from './BaseHandler';
import { getStore, type Store } from '@netlify/blobs';
import { ErrorResponses } from '../errors/error';
import {
  ContactConfigSchema,
  ContactRequestSchema,
  type ContactConfig,
  type ContactResponse,
} from '@simple-site/interfaces';
import { getResendEnv, sendContactEmail } from './resend/resendClient';

/**
 * Contact feature. The page settings (presentation message) live in their own
 * blob (key `contact`) with a DIRECT-SAVE lifecycle — no draft/publish step.
 * The whole surface is feature-gated by `FEATURE_CONTACT` in `contact.mts`
 * (404 when off); reads and the message send are public (the form serves
 * anonymous visitors), the settings mutation is admin-gated by the
 * `AuthHandler` wired there.
 *
 * Routes (method/path constraints enforced by `contact.mts`):
 *  - `GET /api/contact` → the contact page settings (`{}` when nothing is stored yet)
 *  - `POST /api/contact/message` → send a visitor message ({ email, message });
 *    stores nothing — validated against the shared `ContactRequestSchema` and
 *    relayed to the site owner via Resend. Validation errors are explicit (400)
 *    while provider/configuration details never leak past the logs.
 *  - `PUT /api/contact` → replace the settings; goes live immediately
 */
export class ContactModule extends BaseHandler {

    private static readonly STORE_KEY = 'contact';

    /**
     * Upper bound on the raw send body. The schema caps the message at 1000
     * chars, but only after trim — without this, a multi-megabyte body of
     * padding would still be read and parsed.
     */
    private static readonly MAX_MESSAGE_BODY_BYTES = 10_000;

    private requireJson = (request: Request, path: string): void => {
        if (request.headers.get('Content-Type') !== 'application/json') {
            throw ErrorResponses.invalidRequest('Invalid content type', path);
        }
    };

    private parseBody = async (request: Request, path: string): Promise<unknown> => {
        try {
            return await request.json();
        } catch {
            throw ErrorResponses.invalidRequest('Invalid JSON body', path);
        }
    };

    /** GET /api/contact — an absent blob is an empty settings object, not an error. */
    private getConfig = async (store: Store): Promise<Response> => {
        const stored = await store.get(ContactModule.STORE_KEY);
        const config: ContactConfig = stored ? ContactConfigSchema.parse(JSON.parse(String(stored))) : {};
        return this.createSuccessResponse<ContactConfig>(config);
    };

    /** PUT /api/contact — replace the settings; goes live immediately. */
    private replaceConfig = async (store: Store, body: unknown): Promise<Response> => {
        const config = ContactConfigSchema.parse(body);
        await store.set(ContactModule.STORE_KEY, JSON.stringify(config));
        return this.createSuccessResponse({ message: 'Contact settings updated successfully' });
    };

    /** POST /api/contact/message — validate the visitor payload and relay it via Resend. */
    private sendMessage = async (request: Request, path: string): Promise<Response> => {
        this.requireJson(request, path);
        const contentLength = Number(request.headers.get('Content-Length') ?? 0);
        if (!Number.isFinite(contentLength) || contentLength > ContactModule.MAX_MESSAGE_BODY_BYTES) {
            throw ErrorResponses.invalidRequest('Request body too large', path);
        }
        const parsed = ContactRequestSchema.safeParse(await this.parseBody(request, path));
        if (!parsed.success) {
            throw ErrorResponses.validationFailed(
                parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })),
                path,
            );
        }
        await sendContactEmail(parsed.data, getResendEnv(path), path);
        return this.createSuccessResponse<ContactResponse>({ message: 'Message sent' });
    };

    override handle: RequestHandler = async (request) => {
        const path = request.url;
        const method = request.method;
        try {
            if (method === 'POST') return await this.sendMessage(request, path);

            const storeName = `${Netlify.env.get('APP_NAME')}-store`;
            const store = getStore(storeName);
            if (method === 'GET') return await this.getConfig(store);
            if (method === 'PUT') {
                this.requireJson(request, path);
                return await this.replaceConfig(store, await this.parseBody(request, path));
            }
            throw ErrorResponses.methodNotAllowed(method, ['GET', 'POST', 'PUT'], path);
        } catch (error) {
            return this.handleError(error, path);
        }
    };
}
