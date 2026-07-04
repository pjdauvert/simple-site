import { describe, it, expect } from 'vitest';
import type { SiteConfig } from '@simple-site/interfaces';
import { collectI18nEntries, isLocaleCode, menuTitleKey, sectionContentKey } from '@simple-site/interfaces';

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
    expect(sectionContentKey('hero1', 'title')).toBe('hero1.content.title');
    expect(sectionContentKey('hero1', 'ctaButtons.0.label')).toBe('hero1.content.ctaButtons.0.label');
  });
});

describe('collectI18nEntries', () => {
  it('collects menu + hero + text keys with their original values', () => {
    const map = new Map(collectI18nEntries(config).map((e) => [e.key, e.defaultValue]));
    expect(map.get('home.menuTitle')).toBe('Home');
    expect(map.get('hero1.content.title')).toBe('Welcome');
    expect(map.get('hero1.content.ctaButtons.0.label')).toBe('Start');
    expect(map.get('hero1.content.featuringItems.0.label')).toBe('Users');
    expect(map.get('hero1.content.featuringItems.0.value')).toBe('1k');
    expect(map.get('text1.content.columns.0.paragraph')).toBe('Body');
    expect(map.get('text1.content.columns.0.title')).toBe('Col');
  });

  it('skips empty strings (mirrors the renderers)', () => {
    const keys = collectI18nEntries(config).map((e) => e.key);
    expect(keys).not.toContain('hero1.content.subtitle');
  });

  it('dedupes repeated keys', () => {
    const keys = collectI18nEntries(config).map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
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
