import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ZodError } from 'zod';
import apiService from './apiService';
import { ErrorCode, SiteConfigSchema } from '@simple-site/interfaces';

const minimalTheme = {
  themeName: 'Dark',
  primaryColor: '#000',
  secondaryColor: '#fff',
  linkColor: '#000',
  linkHoverColor: '#333',
  backgroundColor: '#111',
  menuBackgroundColor: '#222',
  menuHoverColor: '#333',
};

const minimalPage = {
  menuTitle: 'Home',
  pageName: 'page.home',
  route: '/',
  sections: [],
};

const validConfig = {
  site: { siteName: 'Test Site' },
  themes: [minimalTheme],
  pages: [minimalPage],
};

describe('SiteConfigSchema', () => {
  it('parses a valid minimal config', () => {
    const result = SiteConfigSchema.parse(validConfig);
    expect(result.site.siteName).toBe('Test Site');
    expect(result.themes).toHaveLength(1);
    expect(result.pages).toHaveLength(1);
  });

  it('parses a config with a hero section', () => {
    const config = {
      ...validConfig,
      pages: [{
        ...minimalPage,
        sections: [{
          sectionName: 'hero',
          type: 'hero',
          content: { title: 'Welcome', subtitle: 'Sub' },
        }],
      }],
    };
    const result = SiteConfigSchema.parse(config);
    expect(result.pages[0].sections).toHaveLength(1);
  });

  it('accepts empty themes and pages arrays', () => {
    const result = SiteConfigSchema.parse({ site: { siteName: 'Bare' }, themes: [], pages: [] });
    expect(result.themes).toHaveLength(0);
    expect(result.pages).toHaveLength(0);
  });

  it('accepts optional site fields (logoUrl, faviconUrl, containerMaxWidth)', () => {
    const config = {
      ...validConfig,
      site: {
        siteName: 'Test',
        logoUrl: '/logo.svg',
        faviconUrl: '/favicon.ico',
        containerMaxWidth: 'lg',
      },
    };
    expect(() => SiteConfigSchema.parse(config)).not.toThrow();
  });

  it('throws ZodError when site.siteName is missing', () => {
    const config = { ...validConfig, site: {} };
    expect(() => SiteConfigSchema.parse(config)).toThrow(ZodError);
  });

  it('throws ZodError when a required theme field is missing', () => {
    const themeWithoutColor = { ...minimalTheme, primaryColor: undefined };
    const config = { ...validConfig, themes: [themeWithoutColor] };
    expect(() => SiteConfigSchema.parse(config)).toThrow(ZodError);
  });

  it('throws ZodError when a required page field is missing', () => {
    const pageWithoutRoute = { ...minimalPage, route: undefined };
    const config = { ...validConfig, pages: [pageWithoutRoute] };
    expect(() => SiteConfigSchema.parse(config)).toThrow(ZodError);
  });

  it('throws ZodError for an unknown section type', () => {
    const config = {
      ...validConfig,
      pages: [{
        ...minimalPage,
        sections: [{ sectionName: 'unknown', type: 'gallery', content: {} }],
      }],
    };
    expect(() => SiteConfigSchema.parse(config)).toThrow(ZodError);
  });
});

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
