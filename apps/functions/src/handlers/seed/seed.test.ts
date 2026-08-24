import { describe, it, expect } from 'vitest';
import { collectEventsI18nEntries, collectI18nEntries, SiteConfigSchema, TeamConfigSchema } from '@simple-site/interfaces';
import i18nSeed from './i18n.json';
import siteConfigSeed from './siteConfig.json';
import teamSeed from './team.json';

/**
 * The site config and the translations seed must stay in lockstep: the default language's
 * text lives in the site config, so the i18n seed must NOT carry a dictionary for it; every
 * override locale must translate exactly the keys the config references (non-empty, no
 * extras) — otherwise the Translations admin page flags them as missing / extra on a
 * fresh install.
 */
describe('seed siteConfig ↔ i18n parity', () => {
  const config = SiteConfigSchema.parse(siteConfigSeed);
  // The config walk plus the events collector: events keys are flag-gated in
  // the Translations page, but the seed ships events content — its override
  // locales must translate those keys too, or a dev store with FEATURE_EVENTS
  // on flags them missing.
  const expected = [
    ...collectI18nEntries(config).map((e) => e.key),
    ...(config.events ? collectEventsI18nEntries(config.events).map((e) => e.key) : []),
  ].sort();

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

describe('seed team', () => {
  it('parses against TeamConfigSchema with 5 current and 3 former members', () => {
    const team = TeamConfigSchema.parse(teamSeed);
    expect(team.members.filter((m) => !m.former)).toHaveLength(5);
    expect(team.members.filter((m) => m.former)).toHaveLength(3);
    expect(team.showFormerMembers).toBe(true);
  });
});
