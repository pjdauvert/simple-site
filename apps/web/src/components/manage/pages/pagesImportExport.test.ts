import { describe, it, expect } from 'vitest';
import type { PageConfiguration } from '@simple-site/interfaces';
import { parsePageFile, parsePagesFile, sanitizePageFilename } from './pagesImportExport';

const heroPage: PageConfiguration = {
  menuTitle: 'Home',
  pageName: 'home',
  route: '/home',
  sections: [
    {
      sectionName: 'hero1',
      type: 'hero',
      content: { title: 'Welcome' },
    },
  ],
};

const textPage: PageConfiguration = {
  menuTitle: 'About',
  pageName: 'about',
  route: '/about',
  sections: [
    {
      sectionName: 'aboutText',
      type: 'text',
      content: { columns: [{ title: 'About', paragraph: 'Hello world' }] },
    },
  ],
};

describe('parsePagesFile', () => {
  it('parses a valid array of pages', () => {
    const result = parsePagesFile(JSON.stringify([heroPage, textPage]));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].pageName).toBe('home');
    }
  });

  it('accepts an empty array', () => {
    const result = parsePagesFile('[]');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pages).toHaveLength(0);
  });

  it('rejects malformed JSON', () => {
    expect(parsePagesFile('{ not json')).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects schema-invalid content (missing required fields)', () => {
    expect(parsePagesFile(JSON.stringify([{ pageName: 'x' }]))).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects a single object where an array is expected', () => {
    expect(parsePagesFile(JSON.stringify(heroPage))).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('parsePageFile', () => {
  it('parses a single page object', () => {
    const result = parsePageFile(JSON.stringify(heroPage));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.page.pageName).toBe('home');
  });

  it('parses a one-element array by unwrapping it', () => {
    const result = parsePageFile(JSON.stringify([textPage]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.page.pageName).toBe('about');
  });

  it('rejects a multi-element array', () => {
    expect(parsePageFile(JSON.stringify([heroPage, textPage]))).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects malformed JSON', () => {
    expect(parsePageFile('nope')).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects schema-invalid content', () => {
    expect(parsePageFile(JSON.stringify({ menuTitle: 'x' }))).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('sanitizePageFilename', () => {
  it('derives from the route, stripping the leading slash', () => {
    expect(sanitizePageFilename(heroPage)).toBe('home');
  });

  it('collapses disallowed characters to underscores', () => {
    expect(sanitizePageFilename({ ...heroPage, route: '/blog/my post!' })).toBe('blog_my_post');
  });

  it('falls back to pageName when route is empty', () => {
    expect(sanitizePageFilename({ ...heroPage, route: '', pageName: 'contact' })).toBe('contact');
  });

  it("falls back to 'page' when nothing usable remains", () => {
    expect(sanitizePageFilename({ ...heroPage, route: '/', pageName: '' })).toBe('page');
  });
});
