import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import apiService from './apiService';
import { ErrorCode } from '@simple-site/interfaces';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        protocol: 'https:',
        host: 'example.com',
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('URL construction', () => {
    it('should construct the correct API URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, data: 'test' }),
      });

      await apiService.get('config');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api/config',
        expect.any(Object)
      );
    });

    it('should handle paths with leading slash', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, data: 'test' }),
      });

      await apiService.get('/users/profile');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api/users/profile',
        expect.any(Object)
      );
    });
  });

  describe('Headers', () => {
    it('should set Content-Type and Accept headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, data: {} }),
      });

      await apiService.get('test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }),
        })
      );
    });

    it('should add Authorization header when token is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, data: {} }),
      });

      await apiService.get('test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-bearer-token-for-development',
          }),
        })
      );
    });
  });

  describe('HTTP Methods', () => {
    it('should make GET request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, data: {} }),
      });

      await apiService.get('test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, data: { id: 1 } }),
      });

      const payload = { name: 'Test', value: 123 };
      await apiService.post('test', payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
    });

    it('should make PUT request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, data: {} }),
      });

      const payload = { name: 'Updated' };
      await apiService.put('test/1', payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      );
    });

    it('should make PATCH request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, data: {} }),
      });

      const payload = { name: 'Patched' };
      await apiService.patch('test/1', payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      );
    });

    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, data: null }),
      });

      await apiService.delete('test/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Response handling', () => {
    it('should return success payload for JSON response', async () => {
      const responseData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, data: responseData }),
      });

      const result = await apiService.get<typeof responseData>('test');

      expect(result).toEqual({
        ok: true,
        data: responseData,
      });
    });

    it('should return error payload from API for non-ok JSON responses', async () => {
      const errorPayload = {
        ok: false,
        code: ErrorCode.NOT_FOUND,
        message: 'Resource not found',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/missing',
      };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => errorPayload,
      });

      const result = await apiService.get('missing');

      expect(result).toEqual(errorPayload);
    });

    it('should handle non-JSON success responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Plain text response',
      });

      const result = await apiService.get<string>('test');

      expect(result).toEqual({
        ok: true,
        data: 'Plain text response',
      });
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Internal Server Error',
      });

      const result = await apiService.get<string>('test');

      expect(result).toEqual({
        ok: false,
        data: 'Internal Server Error',
      });
    });
  });

  describe('Network error handling', () => {
    it('should return error payload for network failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await apiService.get('test');

      expect(result).toMatchObject({
        ok: false,
        code: ErrorCode.NETWORK_ERROR,
        message: 'API request failed: Network error',
        path: 'https://example.com/api/test',
      });
      expect(result).toHaveProperty('timestamp');
    });

    it('should return error payload with unknown error message for non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('Some string error');

      const result = await apiService.get('test');

      expect(result).toMatchObject({
        ok: false,
        code: ErrorCode.NETWORK_ERROR,
        message: 'API request failed: Unknown error',
        path: 'https://example.com/api/test',
      });
    });
  });

  describe('Class methods', () => {
    it('get() should call API with GET method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, data: {} }),
      });

      await apiService.get('test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api/test',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('post() should call API with POST method and payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, data: {} }),
      });

      await apiService.post('test', { data: 'value' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'value' }),
        })
      );
    });

    it('delete() should call API with DELETE method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, data: null }),
      });

      await apiService.delete('test/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api/test/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
