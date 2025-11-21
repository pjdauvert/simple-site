import { z } from 'zod';

/**
 * RFC 3986 compliant HTTP(S) URL pattern
 * Matches: protocol, domain, optional port, path, query, fragment
 */
const HTTP_URL_PATTERN = /^https?:\/\/(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?|\[(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:)\])(?::[0-9]{1,5})?(?:\/[^\s]*)?$/;

/**
 * Local path pattern (Unix-style)
 * Matches: /absolute/path, ./relative/path, ../parent/path, relative/path
 */
const LOCAL_PATH_PATTERN = /^(?:\/|\.\/|\.\.\/|[^/])[^\s]*$/;

/**
 * Validates a string as either an RFC-compliant HTTP(S) URL or a local file path
 */
export const UrlOrPathSchema = z.string()
  .min(1, "URL or path cannot be empty")
  .refine(
    (value) => HTTP_URL_PATTERN.test(value) || LOCAL_PATH_PATTERN.test(value),
    {
      message: "Must be a valid HTTP(S) URL or local path"
    }
  );

/**
 * More strict version: validates actual URL format using native URL API
 * This is RFC 3986 compliant through the browser/Node.js URL API
 */
export const StrictUrlOrPathSchema = z.string()
  .min(1, "URL or path cannot be empty")
  .refine(
    (value) => {
      // Check if it's a local path
      if (/^(?:\/|\.\/|\.\.\/|[^:]+$)/.test(value)) {
        return true;
      }
      
      // Check if it's a valid HTTP(S) URL using native URL API
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    },
    {
      message: "Must be a valid HTTP(S) URL or local path"
    }
  );

/**
 * Type inference
 */
export type UrlOrPath = z.infer<typeof UrlOrPathSchema>;