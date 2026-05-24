import { BaseHandler } from './BaseHandler';
import type { RequestHandler } from '../types/server-types';
import { ErrorResponses } from '../errors/error';

type ContextWithClientContext = { clientContext?: Record<string, unknown> };

export class AuthHandler extends BaseHandler {
  override handle: RequestHandler = async (request, context) => {
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
