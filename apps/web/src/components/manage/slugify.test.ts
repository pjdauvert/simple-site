import { describe, it, expect } from 'vitest';
import { EVENT_SLUG_PATTERN } from '@simple-site/interfaces';
import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases, kebab-cases and strips diacritics', () => {
    expect(slugify('Éla Dupont')).toBe('ela-dupont');
    expect(slugify('  John   Smith  ')).toBe('john-smith');
    expect(slugify("Zoë O'Brien")).toBe('zoe-o-brien');
  });

  it('collapses symbol runs and trims dangling hyphens', () => {
    expect(slugify('--Jane_-_Doe!!')).toBe('jane-doe');
    expect(slugify('***')).toBe('');
  });

  // Both callers derive a slug the schema then has to accept; the event one is
  // the stricter of the two, so satisfying it satisfies the team's as well.
  it('produces slugs the event schema accepts', () => {
    for (const name of ['Fête du Port 2027', 'Régate — 10e édition', 'A']) {
      expect(EVENT_SLUG_PATTERN.test(slugify(name))).toBe(true);
    }
  });
});
