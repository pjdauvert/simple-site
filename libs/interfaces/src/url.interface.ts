import { z } from 'zod';

/**
 * RFC 3986 compliant HTTP(S) URL pattern
 * Matches: protocol, domain, optional port, path, query, fragment
 */
const HTTP_URL_PATTERN = /^https?:\/\/(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?|\[(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:)\])(?::[0-9]{1,5})?(?:\/[^\s]*)?$/;

/**
 * Any URI scheme at the head of a value (`javascript:`, `data:`, `mailto:`,
 * `file:`…). The local-path branch below refuses every one of them: the
 * HTTP(S) branch is the ONLY way an absolute URL is accepted, so the pair
 * cannot be talked into `javascript:alert(1)` — which `[^/]` used to let
 * through, straight into an `href` on the events website link.
 *
 * A Windows drive letter (`C:\…`) is refused by the same rule; these values
 * are web paths, not filesystem paths.
 */
const URI_SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/;

/**
 * Local path pattern (Unix-style)
 * Matches: /absolute/path, ./relative/path, ../parent/path, relative/path
 */
const LOCAL_PATH_PATTERN = /^(?:\/|\.\/|\.\.\/|[^/])[^\s]*$/;

/** True for a site-relative path — never for something carrying a scheme. */
const isLocalPath = (value: string): boolean =>
  !URI_SCHEME_PATTERN.test(value) && LOCAL_PATH_PATTERN.test(value);

/**
 * An HTTP(S) URL, or a path relative to the site. Used wherever a value may
 * legitimately point INSIDE the site — images (`/logo.svg`,
 * `/images/icons/book.svg`), the logo and favicon, section backgrounds.
 *
 * Absolute values must be `http`/`https`: any other scheme is refused, so a
 * stored value is always safe to put in a `src` or an `href`. A value meant
 * to leave the site entirely belongs in {@link HttpUrlSchema} instead.
 */
export const UrlOrPathSchema = z.string()
  .min(1, "URL or path cannot be empty")
  .refine(
    (value) => HTTP_URL_PATTERN.test(value) || isLocalPath(value),
    {
      message: "Must be a valid HTTP(S) URL or local path"
    }
  );

/**
 * An ABSOLUTE `http`/`https` URL — nothing else. For a link that is
 * semantically external and opened in a new tab (an event's own website): a
 * site-relative path there would open the site inside a second tab, which is
 * not what the field means, and a non-HTTP scheme in a `_blank` `href` is a
 * hole rather than a feature.
 */
export const HttpUrlSchema = z.string()
  .min(1, "URL cannot be empty")
  .refine((value) => HTTP_URL_PATTERN.test(value), {
    message: "Must be an absolute http(s) URL",
  });

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
export type HttpUrl = z.infer<typeof HttpUrlSchema>;