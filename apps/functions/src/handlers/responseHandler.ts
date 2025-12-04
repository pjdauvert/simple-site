import type { ApiResponseErrorPayload, ApiResponseSuccessPayload } from "@simple-site/interfaces";
import type { ApiErrorResponse } from "../errors/error";

  /**
   * Create error response with proper formatting
   */
  export function createErrorResponse(
    error: ApiErrorResponse,
    path?: string,
    headers?: Record<string, string>
  ): Response {
    const errorJson: ApiResponseErrorPayload = 
    {
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
  export function createSuccessResponse<T>(
    payload: T,
    status: number = 200,
    headers?: Record<string, string>,
  ): Response { 
    const successJson: ApiResponseSuccessPayload<T> = {
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