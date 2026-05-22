import type { ApiResponseErrorPayload, ApiResponseSuccessPayload } from '@simple-site/interfaces';
import { ApiErrorResponse, ErrorResponses } from '../errors/error';
import type { RequestHandler } from '../types/server-types';
import { z, ZodError } from "zod";

export abstract class BaseHandler {
    protected next?: BaseHandler;

    constructor(next?: BaseHandler) {
        this.next = next;
    }

    /**
     * Create error response with proper formatting
     */
    protected createErrorResponse = (error: ApiErrorResponse, path?: string, headers?: Record<string, string>): Response => {
        const errorJson: ApiResponseErrorPayload = {
            ok: false,
            ...error.toJSON(),
        };
        if (path) {
            errorJson.path = path;
        }
        const responseHeaders = {
            'Content-Type': 'application/json',
            ...headers,
        };

        return new Response(JSON.stringify(errorJson), {
            status: error.statusCode,
            headers: responseHeaders,
        });
    }

    /**
   * Create response with proper formatting
   */
    protected createSuccessResponse = <ResponsePayloadType>( payload: ResponsePayloadType, status: number = 200, headers?: Record<string, string>): Response => {
        const successJson: ApiResponseSuccessPayload<ResponsePayloadType> = {
            ok: true,
            data: payload,
        };
        const responseHeaders = {
            'Content-Type': 'application/json',
            ...headers,
        };

        return new Response(JSON.stringify(successJson), {
            status,
            headers: responseHeaders,
        });
    }

    protected handleError(error: unknown, path?: string): Response {
        console.error('Unhandled error:', error);
    
        if (error instanceof ApiErrorResponse) {
          return this.createErrorResponse(error, path);
        }
        
        else if (error instanceof ZodError) {
            return this.createErrorResponse(ErrorResponses.configurationError(z.prettifyError(error)), path);
        }
      
        if (error instanceof Error) {
            // Log the actual error for debugging
            console.error('Error details:', {
              message: error.message,
              stack: error.stack,
            });
          }
    
        // Return generic internal error
        return this.createErrorResponse(ErrorResponses.internalError(), path);
      }

    handle: RequestHandler = async (request, context) => {
        if (this.next) {
            try {
                return await this.next.handle(request, context);
            } catch (error) {
                return this.handleError(error, request.url);
            }
        } else {
            console.error(`Unhandled request: ${this.constructor.name} ${request.method} ${request.url}`);
            return this.createErrorResponse(ErrorResponses.internalError());
        }
    }
}
