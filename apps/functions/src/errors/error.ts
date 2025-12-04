import { ErrorCode, type ApiError } from "@simple-site/interfaces";
  
  export interface ValidationErrorDetail {
    field: string;
    message: string;
  }
  
  export class ApiErrorResponse extends Error {
    public statusCode: number;
    public errorCode: ErrorCode;
    public details?: Record<string, unknown>;
    public path?: string;
    constructor(
      statusCode: number,
      errorCode: ErrorCode,
      message: string,
      details?: Record<string, unknown>,
      path?: string
    ) {
      super(message);
      this.name = 'ApiErrorResponse';
      this.statusCode = statusCode;
      this.errorCode = errorCode;
      this.details = details;
      this.path = path;
    }
  
    toJSON(): ApiError {
      return {
        code: this.errorCode,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
        path: this.path,
      };
    }
  }
  
  // Predefined error responses
  export const ErrorResponses = {
    unauthorized: (path?: string) => new ApiErrorResponse(401, ErrorCode.UNAUTHORIZED, 'Authentication required', undefined, path),
  
    invalidToken: (path?: string) =>
      new ApiErrorResponse(401, ErrorCode.INVALID_TOKEN, 'Invalid authentication token', undefined, path),
  
    forbidden: (resource?: string, path?: string) =>
      new ApiErrorResponse(
        403,
        ErrorCode.FORBIDDEN,
        resource ? `Access denied to ${resource}` : 'Access denied'
      , undefined, path),
  
    insufficientPermissions: (action: string, path?: string) =>
      new ApiErrorResponse(
        403,
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        `Insufficient permissions to ${action}`
      , undefined, path),
  
    validationFailed: (errors: ValidationErrorDetail[], path?: string) =>
      new ApiErrorResponse(400, ErrorCode.VALIDATION_FAILED, 'Validation failed', { errors }, path),
  
    invalidRequest: (message: string, path?: string) =>
      new ApiErrorResponse(400, ErrorCode.INVALID_REQUEST, message, undefined, path),
  
    notFound: (resource: string, path?: string) =>
      new ApiErrorResponse(404, ErrorCode.NOT_FOUND, `${resource} not found`, undefined, path),
  
    alreadyExists: (resource: string, path?: string) =>
      new ApiErrorResponse(409, ErrorCode.ALREADY_EXISTS, `${resource} already exists`, undefined, path),
  
    conflict: (message: string, path?: string) => new ApiErrorResponse(409, ErrorCode.CONFLICT, message, undefined, path),
  
    rateLimitExceeded: (retryAfter: number, path?: string) =>
      new ApiErrorResponse(429, ErrorCode.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded', { retryAfter }, path),
  
    internalError: (message?: string, path?: string) =>
      new ApiErrorResponse(500, ErrorCode.INTERNAL_ERROR, message || 'An internal error occurred', undefined, path),

    configurationError: (message?: string, details?: Record<string, unknown>, path?: string) =>
        new ApiErrorResponse(500, ErrorCode.CONFIGURATION_ERROR, message || 'A configuration error occurred', details, path),
  
    databaseError: () =>
      new ApiErrorResponse(500, ErrorCode.DATABASE_ERROR, 'Database operation failed'),
  
    serviceUnavailable: () =>
      new ApiErrorResponse(503, ErrorCode.SERVICE_UNAVAILABLE, 'Service temporarily unavailable'),
  
    methodNotAllowed: (method: string, allowed?: string[], path?: string) =>
      new ApiErrorResponse(405, ErrorCode.METHOD_NOT_ALLOWED, `Method ${method} not allowed`, allowed ? { allowedMethods: allowed } : undefined, path),
  };
    