import type { ApiResponsePayload, ApiResponseSuccessPayload, ApiResponseErrorPayload, ApiBaseResponse } from "@simple-site/interfaces";
import { ErrorCode } from "@simple-site/interfaces";
/**
 * API Caller Service
 * Handles all API requests to the site's backend functions
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiCallerParams<RequestPayloadType>  = {
  /** The API function path (e.g., 'config', 'users/profile') */
  path: string;
  /** The HTTP method to use */
  method: HttpMethod;
  /** Optional JSON payload for POST/PUT/PATCH requests */
  payload?: RequestPayloadType;
}

/**
 * Mock function to get the auth token
 * TODO: Replace with actual auth context when implemented
 */
function getAuthToken(): string | null {
  // Mocked token for development - will be replaced with actual auth
  return 'mock-bearer-token-for-development';
}

/**
 * Calculates the API base URL from the current location
 * Returns the domain root with /api appended
 */
function getApiBaseUrl(): string {
  const { protocol, host } = window.location;
  return `${protocol}//${host}/api`;
}

/**
 * Makes an API call to the site's backend functions
 * 
 * @param params - The API call parameters
 * @returns Promise resolving to the API response
 * @throws ApiError on request failure
 * 
 * @example
 * // GET request
 * const response = await apiCaller({ path: 'config', method: 'GET' });
 * 
 * @example
 * // POST request with payload
 * const response = await apiCaller({
 *   path: 'users/create',
 *   method: 'POST',
 *   payload: { name: 'John', email: 'john@example.com' }
 * });
 */
const callApi = async <RequestPayloadType, ResponsePayloadType>(params: ApiCallerParams<RequestPayloadType>): Promise<ApiResponsePayload<ResponsePayloadType>> => {

  const { path, method, payload } = params;

  // Build the full URL
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const url = `${baseUrl}/${normalizedPath}`;

  // Build headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add authorization header for private routes
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Build request options
  const options: RequestInit = {
    method,
    headers,
  };

  // Add body for methods that support it
  if (payload && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, options);

    // Try to parse JSON response
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const jsonResponse = await response.json() as ApiBaseResponse;
      
      // Check the ok field to determine if it's a success or error response
      if (jsonResponse.ok) {
        return jsonResponse as ApiResponseSuccessPayload<ResponsePayloadType>;
      } else {
        return jsonResponse as ApiResponseErrorPayload;
      }
    } else {
      // For non-JSON responses, return the text as data
      return {
        ok: response.ok,
        data: await response.text() as ResponsePayloadType,
      } as ApiResponseSuccessPayload<ResponsePayloadType>;
    }
  } catch (error) {
    return {
      ok: false,
      code: ErrorCode.NETWORK_ERROR,
      message: `API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString(),
      path: url,
    } as ApiResponseErrorPayload;
  }
}

/**
 * Convenience methods for common HTTP operations
 */
class ApiCaller {
  async get<ResponsePayloadType>(path: string): Promise<ApiResponsePayload<ResponsePayloadType>> {
    return callApi<never, ResponsePayloadType>({ path, method: 'GET' });
  }

  async post<RequestPayloadType, ResponsePayloadType>(path: string, payload?: RequestPayloadType): Promise<ApiResponsePayload<ResponsePayloadType>> {
    return callApi<RequestPayloadType, ResponsePayloadType>({ path, method: 'POST', payload });
  }

  async put<RequestPayloadType, ResponsePayloadType>(path: string, payload?: RequestPayloadType): Promise<ApiResponsePayload<ResponsePayloadType>> {
    return callApi<RequestPayloadType, ResponsePayloadType>({ path, method: 'PUT', payload });
  }

  async patch<RequestPayloadType, ResponsePayloadType>(path: string, payload?: RequestPayloadType): Promise<ApiResponsePayload<ResponsePayloadType>> {
    return callApi<RequestPayloadType, ResponsePayloadType>({ path, method: 'PATCH', payload });
  }

  async delete(path: string): Promise<ApiResponsePayload<never>> {
    return callApi<never, never>({ path, method: 'DELETE' });
  }
}

export default new ApiCaller();