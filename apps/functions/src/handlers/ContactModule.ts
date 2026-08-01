import type { RequestHandler } from '../types/server-types';
import { BaseHandler } from './BaseHandler';
import { ErrorResponses } from '../errors/error';
import { ContactRequestSchema, type ContactResponse } from '@simple-site/interfaces';
import { getResendEnv, sendContactEmail } from './resend/resendClient';

/**
 * Public contact form intake. The visitor's email + message are validated
 * against the shared `ContactRequestSchema` and relayed to the site owner's
 * inbox via Resend. The whole surface is feature-gated by `FEATURE_CONTACT`
 * in `contact.mts` (404 when off); there is no auth — the endpoint serves
 * anonymous visitors by design, so validation errors are explicit (400) while
 * provider/configuration details never leak past the logs.
 *
 * Routes:
 *  - `POST /api/contact` → send the message ({ email, message })
 */
export class ContactModule extends BaseHandler {

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

    override handle: RequestHandler = async (request) => {
        const path = request.url;
        try {
            this.requireJson(request, path);
            const parsed = ContactRequestSchema.safeParse(await this.parseBody(request, path));
            if (!parsed.success) {
                throw ErrorResponses.validationFailed(
                    parsed.error.issues.map((issue) => ({ field: issue.path.join('.') || 'body', message: issue.message })),
                    path,
                );
            }
            await sendContactEmail(parsed.data, getResendEnv(path), path);
            return this.createSuccessResponse<ContactResponse>({ message: 'Message sent' });
        } catch (error) {
            return this.handleError(error, path);
        }
    };
}
