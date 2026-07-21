import { describe, it, expect } from 'vitest';
import type { HeroSectionProps, SiteConfig, TextSectionProps } from '@simple-site/interfaces';
import {
  collectHeroI18n,
  collectI18nEntries,
  collectTextI18n,
  isLocaleCode,
  menuTitleKey,
  sectionContentKey,
  sectionScope,
  SiteThemeConfigSchema,
  toCanonicalLocale,
} from '@simple-site/interfaces';

// A representative config exercising menu titles + a hero + a text section. Cast because
// the extractor only reads pages/sections, not the full validated schema.
const config = {
  site: { siteName: 'S' },
  themes: [],
  pages: [
    {
      pageName: 'home',
      route: '/',
      menuTitle: 'Home',
      sections: [
        {
          sectionName: 'hero1',
          type: 'hero',
          content: {
            title: 'Welcome',
            subtitle: '', // empty → skipped
            ctaButtons: [{ label: 'Start', link: '/x' }],
            featuringItems: [{ label: 'Users', value: '1k' }],
          },
        },
        {
          sectionName: 'text1',
          type: 'text',
          content: { columns: [{ title: 'Col', paragraph: 'Body' }] },
        },
      ],
    },
  ],
} as unknown as SiteConfig;

describe('i18n key builders', () => {
  it('build the conventional keys', () => {
    expect(menuTitleKey('home')).toBe('home.menuTitle');
    expect(sectionScope('home', 'hero1')).toBe('home.hero1');
    expect(sectionContentKey('home.hero1', 'title')).toBe('home.hero1.content.title');
    expect(sectionContentKey('home.hero1', 'ctaButtons.0.label')).toBe('home.hero1.content.ctaButtons.0.label');
  });
});

describe('collectI18nEntries', () => {
  it('collects menu + hero + text keys (page-scoped) with their original values', () => {
    const map = new Map(collectI18nEntries(config).map((e) => [e.key, e.defaultValue]));
    expect(map.get('home.menuTitle')).toBe('Home');
    expect(map.get('home.hero1.content.title')).toBe('Welcome');
    expect(map.get('home.hero1.content.ctaButtons.0.label')).toBe('Start');
    expect(map.get('home.hero1.content.featuringItems.0.label')).toBe('Users');
    expect(map.get('home.hero1.content.featuringItems.0.value')).toBe('1k');
    expect(map.get('home.text1.content.columns.0.paragraph')).toBe('Body');
    expect(map.get('home.text1.content.columns.0.title')).toBe('Col');
  });

  it('skips empty strings (mirrors the renderers)', () => {
    const keys = collectI18nEntries(config).map((e) => e.key);
    expect(keys).not.toContain('home.hero1.content.subtitle');
  });

  it('dedupes repeated keys', () => {
    const keys = collectI18nEntries(config).map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('section collectors (each type owns its translatable fields)', () => {
  it('collectHeroI18n emits scoped title/subtitle/cta/featuring keys, skipping empties', () => {
    const hero = {
      sectionName: 'hero',
      type: 'hero',
      content: {
        title: 'T',
        subtitle: '', // empty → skipped
        ctaButtons: [{ label: 'Go', link: '/x' }],
        featuringItems: [{ label: 'L', value: 'V' }],
      },
    } as unknown as HeroSectionProps;
    const map = new Map(collectHeroI18n(hero, 'home.hero').map((e) => [e.key, e.defaultValue]));
    expect(map.get('home.hero.content.title')).toBe('T');
    expect(map.has('home.hero.content.subtitle')).toBe(false);
    expect(map.get('home.hero.content.ctaButtons.0.label')).toBe('Go');
    expect(map.get('home.hero.content.featuringItems.0.label')).toBe('L');
    expect(map.get('home.hero.content.featuringItems.0.value')).toBe('V');
  });

  it('collectTextI18n emits scoped column title/paragraph keys', () => {
    const text = {
      sectionName: 'text',
      type: 'text',
      content: { columns: [{ title: 'CT', paragraph: 'CP' }] },
    } as unknown as TextSectionProps;
    const map = new Map(collectTextI18n(text, 'home.text').map((e) => [e.key, e.defaultValue]));
    expect(map.get('home.text.content.columns.0.title')).toBe('CT');
    expect(map.get('home.text.content.columns.0.paragraph')).toBe('CP');
  });
});

describe('toCanonicalLocale', () => {
  it('canonicalizes resolvable BCP-47 tags', () => {
    expect(toCanonicalLocale('en')).toBe('en');
    expect(toCanonicalLocale('fr')).toBe('fr');
    expect(toCanonicalLocale('fr-CA')).toBe('fr-CA');
    expect(toCanonicalLocale('fr-ca')).toBe('fr-CA');
    expect(toCanonicalLocale('zh-hant')).toBe('zh-Hant');
    expect(toCanonicalLocale('pt-BR')).toBe('pt-BR');
    // Intl canonicalization also maps case and ISO 639-2 aliases.
    expect(toCanonicalLocale('EN')).toBe('en');
    expect(toCanonicalLocale('eng')).toBe('en');
  });

  it('returns undefined for malformed or unknown codes', () => {
    expect(toCanonicalLocale('')).toBeUndefined();
    expect(toCanonicalLocale('  ')).toBeUndefined();
    expect(toCanonicalLocale('en_US')).toBeUndefined(); // underscore is not BCP-47 → Intl throws
    expect(toCanonicalLocale('x')).toBeUndefined();
    expect(toCanonicalLocale('e1')).toBeUndefined();
    // Well-formed but not a known language → DisplayNames yields no name.
    expect(toCanonicalLocale('xx')).toBeUndefined();
    expect(toCanonicalLocale('zz')).toBeUndefined();
  });
});

describe('isLocaleCode', () => {
  it('accepts Intl-resolvable codes and rejects unknown or malformed ones', () => {
    expect(isLocaleCode('de')).toBe(true);
    expect(isLocaleCode('fr')).toBe(true);
    expect(isLocaleCode('fr-CA')).toBe(true);
    expect(isLocaleCode('zh-Hant')).toBe(true);
    expect(isLocaleCode('pt-BR')).toBe(true);
    expect(isLocaleCode('xx')).toBe(false);
    expect(isLocaleCode('zz')).toBe(false);
    expect(isLocaleCode('')).toBe(false);
    expect(isLocaleCode('  ')).toBe(false);
    expect(isLocaleCode('en_US')).toBe(false);
    expect(isLocaleCode('x')).toBe(false);
    expect(isLocaleCode('e1')).toBe(false);
  });
});

describe('SiteThemeConfigSchema.defaultLanguage', () => {
  it('defaults to en when absent (legacy configs)', () => {
    const parsed = SiteThemeConfigSchema.parse({ siteName: 'S' });
    expect(parsed.defaultLanguage).toBe('en');
  });

  it('accepts a resolvable BCP-47 tag', () => {
    const parsed = SiteThemeConfigSchema.parse({ siteName: 'S', defaultLanguage: 'fr-CA' });
    expect(parsed.defaultLanguage).toBe('fr-CA');
  });

  it('rejects an unknown language code', () => {
    expect(SiteThemeConfigSchema.safeParse({ siteName: 'S', defaultLanguage: 'xx' }).success).toBe(false);
  });
});
