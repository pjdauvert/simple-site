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

describe('isLocaleCode', () => {
  it('accepts ISO 639-1 codes and rejects malformed ones', () => {
    expect(isLocaleCode('de')).toBe(true);
    expect(isLocaleCode('fr')).toBe(true);
    expect(isLocaleCode('EN')).toBe(false);
    expect(isLocaleCode('eng')).toBe(false);
    expect(isLocaleCode('x')).toBe(false);
    expect(isLocaleCode('e1')).toBe(false);
  });
});
