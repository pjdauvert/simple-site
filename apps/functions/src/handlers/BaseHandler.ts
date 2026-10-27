import type { ApiResponseErrorPayload, ApiResponseSuccessPayload } from '@simple-site/interfaces';
import { ApiErrorResponse, ErrorResponses, validationDetails } from '../errors/error';
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

    /**
     * Validates a REQUEST payload. A rejection is the caller's fault, so it
     * answers `400 VALIDATION_FAILED` naming the offending fields — never the
     * `500 CONFIGURATION_ERROR` that an uncaught ZodError would produce, which
     * is reserved for a schema violation in data we STORED (see `handleError`).
     */
    protected parseRequest = <Output>(schema: z.ZodType<Output>, payload: unknown, path?: string): Output => {
        const parsed = schema.safeParse(payload);
        if (!parsed.success) {
            throw ErrorResponses.validationFailed(validationDetails(parsed.error), path);
        }
        return parsed.data;
    }

    /** Body text → JSON; malformed JSON is an invalid request, not a crash. */
    protected parseJsonBody = (body: string, path?: string): unknown => {
        try {
            return JSON.parse(body);
        } catch {
            throw ErrorResponses.invalidRequest('Invalid JSON body', path);
        }
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
