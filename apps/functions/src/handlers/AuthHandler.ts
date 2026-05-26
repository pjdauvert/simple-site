import { BaseHandler } from './BaseHandler';
import type { RequestHandler } from '../types/server-types';
import { ErrorResponses } from '../errors/error';

type ContextWithClientContext = { clientContext?: Record<string, unknown> };

export class AuthHandler extends BaseHandler {
  override handle: RequestHandler = async (request, context) => {
    // In local dev (netlify dev sets CONTEXT=dev) skip JWT validation so
    // protected endpoints are reachable without a live Netlify Identity service.
    if (Netlify.env.get('CONTEXT') === 'dev') {
      if (this.next) {
        return this.next.handle(request, context);
      }
      return this.createErrorResponse(ErrorResponses.internalError(), request.url);
    }

    const user = (context as unknown as ContextWithClientContext).clientContext?.user;

    if (!user) {
      return this.createErrorResponse(
        ErrorResponses.unauthorized(request.url),
        request.url
      );
    }

    if (this.next) {
      return this.next.handle(request, context);
    }

    return this.createErrorResponse(ErrorResponses.internalError(), request.url);
  };
}
