import { describe, it, expect } from 'vitest';
import { HttpUrlSchema, UrlOrPathSchema } from './url.interface.js';

const accepts = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: string): boolean =>
  schema.safeParse(value).success;

describe('UrlOrPathSchema', () => {
  it('accepts absolute http(s) URLs', () => {
    for (const url of [
      'https://example.com/festival',
      'http://localhost:3080/x?y=1#z',
      'https://ik.imagekit.io/demo/poster.jpg',
    ]) {
      expect(accepts(UrlOrPathSchema, url)).toBe(true);
    }
  });

  // The seed and every shipped site lean on these: /logo.svg, /favicon.ico,
  // /images/icons/*.svg, section backgrounds. Breaking them would break the
  // stored configs, not just new input.
  it('accepts site-relative paths', () => {
    for (const path of ['/logo.svg', '/images/backgrounds/hero.jpg', './a.png', '../b.png', 'c/d.png']) {
      expect(accepts(UrlOrPathSchema, path)).toBe(true);
    }
  });

  // These used to pass through the local-path branch, whose first alternative
  // was a bare `[^/]` — and the value lands in a `src` or an `href`.
  it('refuses every scheme that is not http(s)', () => {
    for (const hostile of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'mailto:someone@example.com',
      'C:\\Users\\me\\poster.png',
    ]) {
      expect(accepts(UrlOrPathSchema, hostile)).toBe(false);
    }
  });

  it('refuses an empty value and whitespace', () => {
    expect(accepts(UrlOrPathSchema, '')).toBe(false);
    expect(accepts(UrlOrPathSchema, 'a b.png')).toBe(false);
  });
});

describe('HttpUrlSchema', () => {
  it('accepts an absolute http(s) URL', () => {
    expect(accepts(HttpUrlSchema, 'https://example.com/festival')).toBe(true);
    expect(accepts(HttpUrlSchema, 'http://example.com')).toBe(true);
  });

  // The whole point of the stricter schema: a field meaning "somewhere else on
  // the web", rendered with target="_blank".
  it('refuses a site-relative path and any non-http scheme', () => {
    for (const rejected of ['/events/summer-festival', './x', 'example.com', 'javascript:alert(1)', 'ftp://x/y']) {
      expect(accepts(HttpUrlSchema, rejected)).toBe(false);
    }
  });
});
