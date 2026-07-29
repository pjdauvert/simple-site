import { describe, it, expect } from 'vitest';
import { BIO_EXCERPT_LIMIT, excerptMarkdown } from './bioExcerpt';

describe('excerptMarkdown', () => {
  it('returns null when the text fits the limit', () => {
    expect(excerptMarkdown('Short bio.')).toBeNull();
    expect(excerptMarkdown('x'.repeat(BIO_EXCERPT_LIMIT))).toBeNull();
  });

  it('cuts at a word boundary, never mid-word', () => {
    const text = 'alpha bravo charlie delta';
    expect(excerptMarkdown(text, 14)).toBe('alpha bravo');
    // A word the limit lands inside of is dropped entirely…
    expect(excerptMarkdown(text, 18)).toBe('alpha bravo');
    // …and kept once the limit reaches past its last character.
    expect(excerptMarkdown(text, 19)).toBe('alpha bravo charlie');
  });

  it('drops dangling punctuation so the ellipsis reads cleanly', () => {
    expect(excerptMarkdown('one two, three four', 8)).toBe('one two');
    expect(excerptMarkdown('one two. three four', 9)).toBe('one two');
  });

  it('closes a bold emphasis the cut left open', () => {
    expect(excerptMarkdown('intro **bold text continues** end', 17)).toBe('intro **bold text**');
  });

  it('drops an inline link the cut left open', () => {
    expect(excerptMarkdown('see [site](https://a.example/long/path) after', 20)).toBe('see');
    expect(excerptMarkdown('see [site name broken', 12)).toBe('see');
  });
});
