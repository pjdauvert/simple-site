/**
 * Error Codes
 */
export enum ErrorCode {
    // Authentication errors
    UNAUTHORIZED = 'UNAUTHORIZED',
    INVALID_TOKEN = 'INVALID_TOKEN',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
    // Authorization errors
    FORBIDDEN = 'FORBIDDEN',
    INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
    // Validation errors
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    INVALID_REQUEST = 'INVALID_REQUEST',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
    // Resource errors
    NOT_FOUND = 'NOT_FOUND',
    ALREADY_EXISTS = 'ALREADY_EXISTS',
    CONFLICT = 'CONFLICT',
  
    // Rate limiting
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
    // Server errors
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
  
    // Method errors
    METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
}

/**
 * API Interface
 * Defines the structure of the API response and error
 */

export type ApiBaseResponse = {
  ok: boolean;
}

export type ApiError = {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    path?: string;
}

export type ApiResponseSuccessPayload<T> = ApiBaseResponse & {
  data: T;
}

export type ApiResponseErrorPayload = ApiBaseResponse & ApiError;

export type ApiResponsePayload<T> = ApiResponseSuccessPayload<T> | ApiResponseErrorPayload;