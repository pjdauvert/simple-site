import type { ApiErrorResponse } from "../errors/error";

  /**
   * Create error response with proper formatting
   */
  export function createErrorResponse(
    error: ApiErrorResponse,
    path?: string,
    headers?: Record<string, string>
  ): Response {
    const errorJson = error.toJSON();
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
  export function createSuccessResponse(
    payload: unknown,
    status: number = 200,
    headers?: Record<string, string>,
  ): Response {
  
    const responseHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
  
    return new Response(JSON.stringify(payload), {
      status,
      headers: responseHeaders,
    });
  }