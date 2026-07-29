import { describe, it, expect } from 'vitest';
import {
  TeamMemberSchema,
  collectTeamI18nEntries,
  memberLocales,
  pickLocalizedText,
  slugify,
  type TeamMember,
} from '@simple-site/interfaces';
import {
  createMember,
  membersAreValid,
  normalizeLocalizedText,
  normalizeSocialLinks,
  validateMembers,
} from './teamDraft';

const member = (slug: string, name = 'Jane Doe'): TeamMember =>
  ({ slug, name, jobTitle: {}, biography: {} });

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
});

describe('validateMembers', () => {
  it('accepts a valid team', () => {
    const errors = validateMembers([member('jane-doe'), member('john-smith', 'John Smith')]);
    expect(membersAreValid(errors)).toBe(true);
  });

  it('flags empty name and slug on a blank member', () => {
    const [errors] = validateMembers([createMember()]);
    expect(errors).toEqual({ name: 'empty', slug: 'empty' });
  });

  it('flags a slug that is not kebab-case', () => {
    const [errors] = validateMembers([member('Jane Doe')]);
    expect(errors.slug).toBe('pattern');
  });

  it('flags duplicate slugs on every duplicate', () => {
    const errors = validateMembers([member('jane-doe'), member('jane-doe')]);
    expect(errors[0].slug).toBe('duplicate');
    expect(errors[1].slug).toBe('duplicate');
    expect(membersAreValid(errors)).toBe(false);
  });
});

describe('normalizeSocialLinks', () => {
  it('trims links, drops empty ones, and collapses to undefined when nothing remains', () => {
    expect(normalizeSocialLinks({ linkedin: ' https://li.example ', x: '  ', github: '' }))
      .toEqual({ linkedin: 'https://li.example' });
    expect(normalizeSocialLinks({ x: '   ' })).toBeUndefined();
    expect(normalizeSocialLinks(undefined)).toBeUndefined();
  });
});

describe('collectTeamI18nEntries', () => {
  it('emits the title and presentation keys only when their text is set', () => {
    expect(
      collectTeamI18nEntries({
        members: [],
        title: 'The crew',
        presentation: 'Our crew',
        formerMembersTitle: 'Alumni',
      }),
    ).toEqual([
      { key: 'team.title', defaultValue: 'The crew' },
      { key: 'team.presentation', defaultValue: 'Our crew' },
      { key: 'team.formerMembersTitle', defaultValue: 'Alumni' },
    ]);
    expect(collectTeamI18nEntries({ members: [], presentation: 'Our crew' }))
      .toEqual([{ key: 'team.presentation', defaultValue: 'Our crew' }]);
    expect(collectTeamI18nEntries({ members: [] })).toEqual([]);
    expect(collectTeamI18nEntries({ members: [], title: '  ', presentation: '   ' })).toEqual([]);
  });
});

describe('pickLocalizedText', () => {
  it('prefers the exact locale, then the base locale, then any non-empty entry', () => {
    expect(pickLocalizedText({ en: 'Hello', fr: 'Bonjour' }, 'fr')).toBe('Bonjour');
    expect(pickLocalizedText({ en: 'Hello', fr: '' }, 'fr')).toBe('Hello');
    expect(pickLocalizedText({ es: 'Hola' }, 'fr')).toBe('Hola');
    expect(pickLocalizedText({}, 'fr')).toBe('');
  });
});

describe('memberLocales', () => {
  it('unions the non-empty biography and job-title languages, sorted', () => {
    const m: TeamMember = {
      ...member('jane-doe'),
      jobTitle: { fr: 'Ingénieure' },
      biography: { es: 'Hola', en: '  ' },
    };
    expect(memberLocales(m)).toEqual(['es', 'fr']);
    expect(memberLocales(member('jane-doe'))).toEqual([]);
  });
});

describe('normalizeLocalizedText', () => {
  it('trims each locale and drops the empty ones', () => {
    expect(normalizeLocalizedText({ en: ' Engineer ', fr: '   ', es: '' })).toEqual({ en: 'Engineer' });
    expect(normalizeLocalizedText({})).toEqual({});
  });
});

describe('TeamMemberSchema.jobTitle', () => {
  it('coerces a legacy plain-string job title into the base-locale record', () => {
    const legacy = TeamMemberSchema.parse({ slug: 'jane-doe', name: 'Jane', jobTitle: 'Engineer' });
    expect(legacy.jobTitle).toEqual({ en: 'Engineer' });
    const empty = TeamMemberSchema.parse({ slug: 'jane-doe', name: 'Jane', jobTitle: '  ' });
    expect(empty.jobTitle).toEqual({});
    const absent = TeamMemberSchema.parse({ slug: 'jane-doe', name: 'Jane' });
    expect(absent.jobTitle).toEqual({});
    const record = TeamMemberSchema.parse({ slug: 'jane-doe', name: 'Jane', jobTitle: { fr: 'Ingénieure' } });
    expect(record.jobTitle).toEqual({ fr: 'Ingénieure' });
  });
});
