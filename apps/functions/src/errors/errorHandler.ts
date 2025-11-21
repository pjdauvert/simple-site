import { z, ZodError } from "zod";
import { ApiErrorResponse, ErrorResponses } from "./error";
import type { RequestHandler } from "../types/server-types";
import { createErrorResponse } from "../handlers/responseHandler";


/**
 * Handle unknown errors and convert to standardized format
 */
export function handleUnknownError(error: unknown, path?: string): Response {
    console.error('Unhandled error:', error);

    if (error instanceof ApiErrorResponse) {
      return createErrorResponse(error, path);
    }
    
    else if (error instanceof ZodError) {
        return createErrorResponse(ErrorResponses.configurationError(z.prettifyError(error)), path);
    }
  
    if (error instanceof Error) {
        // Log the actual error for debugging
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
        });
      }

    // Return generic internal error
    return createErrorResponse(ErrorResponses.internalError(), path);
  }


export type ErrorHandler = (handler: RequestHandler) => RequestHandler;

// helper function to handle the request 
// return a standard API response object, with error handling
export const withErrorHandler: ErrorHandler = (handler: RequestHandler) => {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleUnknownError(error);
    }
  }
}