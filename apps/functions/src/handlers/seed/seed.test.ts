import { describe, it, expect } from 'vitest';
import { collectI18nEntries, SiteConfigSchema } from '@simple-site/interfaces';
import i18nSeed from './i18n.json';
import siteConfigSeed from './siteConfig.json';

/**
 * The site config and the translations seed must stay in lockstep: the default language's
 * text lives in the site config, so the i18n seed must NOT carry a dictionary for it; every
 * override locale must translate exactly the keys the config references (non-empty, no
 * extras) — otherwise the Translations admin page flags them as missing / extra on a
 * fresh install.
 */
describe('seed siteConfig ↔ i18n parity', () => {
  const config = SiteConfigSchema.parse(siteConfigSeed);
  const expected = collectI18nEntries(config).map((e) => e.key).sort();

  it('has no dictionary for the default language (its text lives in the config)', () => {
    expect(Object.keys(i18nSeed)).not.toContain(config.site.defaultLanguage);
  });

  for (const locale of Object.keys(i18nSeed)) {
    const dict = (i18nSeed as Record<string, Record<string, string>>)[locale];

    it(`${locale}: has exactly the config-derived keys (no missing, no extra)`, () => {
      expect(Object.keys(dict).sort()).toEqual(expected);
    });

    it(`${locale}: has no empty values`, () => {
      expect(Object.entries(dict).filter(([, v]) => v.trim() === '').map(([k]) => k)).toEqual([]);
    });
  }
});
