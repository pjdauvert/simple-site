import { describe, it, expect } from 'vitest';
import type { MenuEntry } from '@simple-site/interfaces';
import { entryRows, normalizedMenuTitle } from './menuDraft';

const pages = [
  { pageName: 'page.home', route: '/home', menuTitle: 'Home' },
  { pageName: 'page.about', route: '/about', menuTitle: 'About' },
];

describe('entryRows', () => {
  it('resolves page rows from the referenced page', () => {
    const entries: MenuEntry[] = [{ type: 'page', pageName: 'page.about', visible: true }];
    expect(entryRows(entries, pages, { media: false, team: false })).toEqual([
      {
        entry: entries[0],
        label: 'About',
        baseLabel: 'About',
        route: '/about',
        kind: 'page',
        i18nKey: 'page.about.menuTitle',
        available: true,
      },
    ]);
  });

  it('prefers a custom label and keeps the fallback as baseLabel', () => {
    const pageEntry: MenuEntry = { type: 'page', pageName: 'page.about', visible: true, menuTitle: 'Who we are' };
    const featureEntry: MenuEntry = { type: 'feature', feature: 'team', visible: true, menuTitle: 'Notre équipe' };
    const [pageRow, featureRow] = entryRows([pageEntry, featureEntry], pages, { media: false, team: true });
    expect(pageRow.label).toBe('Who we are');
    expect(pageRow.baseLabel).toBe('About');
    expect(featureRow.label).toBe('Notre équipe');
    expect(featureRow.baseLabel).toBe('Team');
  });

  it('marks feature rows unavailable while their flag is off', () => {
    const entries: MenuEntry[] = [{ type: 'feature', feature: 'team', visible: false }];
    const [row] = entryRows(entries, pages, { media: true, team: false });
    expect(row.kind).toBe('feature');
    expect(row.route).toBe('/team');
    expect(row.i18nKey).toBe('team.menuTitle');
    expect(row.available).toBe(false); // kept in the list, but greyed and not toggleable
  });

  it('marks feature rows available when their flag is on', () => {
    const entries: MenuEntry[] = [{ type: 'feature', feature: 'team', visible: true }];
    const [row] = entryRows(entries, pages, { media: false, team: true });
    expect(row.label).toBe('Team');
    expect(row.available).toBe(true);
  });

  it('falls back to the raw reference when a page row cannot be resolved', () => {
    const entries: MenuEntry[] = [{ type: 'page', pageName: 'page.gone', visible: true }];
    const [row] = entryRows(entries, pages, { media: false, team: false });
    expect(row.label).toBe('page.gone');
    expect(row.available).toBe(false);
  });
});

describe('normalizedMenuTitle', () => {
  it('trims the value and clears it when empty or equal to the fallback', () => {
    expect(normalizedMenuTitle('  Who we are ', 'About')).toBe('Who we are');
    expect(normalizedMenuTitle('   ', 'About')).toBeUndefined();
    expect(normalizedMenuTitle('About', 'About')).toBeUndefined();
  });
});
