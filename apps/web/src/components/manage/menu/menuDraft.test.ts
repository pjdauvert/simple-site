import { describe, it, expect } from 'vitest';
import type { MenuEntry } from '@simple-site/interfaces';
import { entryRows } from './menuDraft';

const pages = [
  { pageName: 'page.home', route: '/home', menuTitle: 'Home' },
  { pageName: 'page.about', route: '/about', menuTitle: 'About' },
];

describe('entryRows', () => {
  it('resolves page rows from the referenced page', () => {
    const entries: MenuEntry[] = [{ type: 'page', pageName: 'page.about', visible: true }];
    expect(entryRows(entries, pages, { media: false })).toEqual([
      {
        entry: entries[0],
        label: 'About',
        route: '/about',
        kind: 'page',
        available: true,
      },
    ]);
  });

  it('marks feature rows unavailable while the feature is unregistered or its flag is off', () => {
    const entries: MenuEntry[] = [{ type: 'feature', feature: 'team', visible: false }];
    const [row] = entryRows(entries, pages, { media: true });
    expect(row.kind).toBe('feature');
    expect(row.route).toBe('/team');
    expect(row.available).toBe(false); // kept in the list, but greyed and not toggleable
  });

  it('falls back to the raw reference when a page row cannot be resolved', () => {
    const entries: MenuEntry[] = [{ type: 'page', pageName: 'page.gone', visible: true }];
    const [row] = entryRows(entries, pages, { media: false });
    expect(row.label).toBe('page.gone');
    expect(row.available).toBe(false);
  });
});
