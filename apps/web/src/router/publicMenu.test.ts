import { describe, it, expect } from 'vitest';
import { collectI18nEntries, type MenuConfig, type SiteConfig } from '@simple-site/interfaces';
import { reconcileMenu, resolveMenuItems } from './publicMenu';
import type { FeatureFlags } from '../services/featuresService';

const page = (pageName: string, route: string, menuTitle: string) =>
  ({ pageName, route, menuTitle, sections: [] });

const configWith = (pages: ReturnType<typeof page>[], menu?: MenuConfig): SiteConfig =>
  ({ site: { siteName: 'Test' }, themes: [], pages, menu }) as unknown as SiteConfig;

const FLAGS: FeatureFlags = { media: false, team: false, contact: false };

describe('resolveMenuItems', () => {
  it('derives items from the pages order when the config has no menu (legacy behavior)', () => {
    const config = configWith([page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')]);
    expect(resolveMenuItems(config, FLAGS)).toEqual([
      { menuTitle: 'Home', pageName: 'page.home', route: '/home' },
      { menuTitle: 'About', pageName: 'page.about', route: '/about' },
    ]);
  });

  it('renders menu entries in menu order, resolving labels/routes from the pages', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')],
      { entries: [
        { type: 'page', pageName: 'page.about', visible: true },
        { type: 'page', pageName: 'page.home', visible: true },
      ] },
    );
    expect(resolveMenuItems(config, FLAGS).map((i) => i.route)).toEqual(['/about', '/home']);
  });

  it('skips hidden entries — the page stays reachable but out of the nav', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')],
      { entries: [
        { type: 'page', pageName: 'page.home', visible: true },
        { type: 'page', pageName: 'page.about', visible: false },
      ] },
    );
    expect(resolveMenuItems(config, FLAGS).map((i) => i.pageName)).toEqual(['page.home']);
  });

  it('renders the team feature entry when its flag is on', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home')],
      { entries: [
        { type: 'feature', feature: 'team', visible: true },
        { type: 'page', pageName: 'page.home', visible: true },
      ] },
    );
    expect(resolveMenuItems(config, { media: false, team: true, contact: false })).toEqual([
      { menuTitle: 'Team', pageName: 'team', route: '/team' },
      { menuTitle: 'Home', pageName: 'page.home', route: '/home' },
    ]);
  });

  it('renders the contact feature entry when its flag is on', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home')],
      { entries: [
        { type: 'feature', feature: 'contact', visible: true },
        { type: 'page', pageName: 'page.home', visible: true },
      ] },
    );
    expect(resolveMenuItems(config, { media: false, team: false, contact: true })).toEqual([
      { menuTitle: 'Contact', pageName: 'contact', route: '/contact' },
      { menuTitle: 'Home', pageName: 'page.home', route: '/home' },
    ]);
    // Flag off → the entry is skipped like any disabled feature.
    expect(resolveMenuItems(config, FLAGS).map((i) => i.pageName)).toEqual(['page.home']);
  });

  it('renders custom entry labels — a page override and a renamed feature', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home')],
      { entries: [
        { type: 'feature', feature: 'team', visible: true, menuTitle: 'Notre équipe' },
        { type: 'page', pageName: 'page.home', visible: true, menuTitle: 'Welcome' },
      ] },
    );
    expect(resolveMenuItems(config, { media: false, team: true, contact: false }).map((i) => i.menuTitle)).toEqual([
      'Notre équipe',
      'Welcome',
    ]);
  });

  it('skips entries referencing unknown pages and flag-off features', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home')],
      { entries: [
        { type: 'page', pageName: 'page.gone', visible: true },
        { type: 'feature', feature: 'team', visible: true },
        { type: 'page', pageName: 'page.home', visible: true },
      ] },
    );
    expect(resolveMenuItems(config, FLAGS).map((i) => i.pageName)).toEqual(['page.home']);
  });
});

describe('reconcileMenu', () => {
  const pages = [{ pageName: 'page.home' }, { pageName: 'page.about' }];

  it('seeds page entries from the pages order when there is no menu yet', () => {
    expect(reconcileMenu(undefined, pages, []).entries).toEqual([
      { type: 'page', pageName: 'page.home', visible: true },
      { type: 'page', pageName: 'page.about', visible: true },
    ]);
  });

  it('prunes entries of deleted pages and appends new pages visible', () => {
    const menu: MenuConfig = { entries: [
      { type: 'page', pageName: 'page.gone', visible: false },
      { type: 'page', pageName: 'page.home', visible: true },
    ] };
    expect(reconcileMenu(menu, pages, []).entries).toEqual([
      { type: 'page', pageName: 'page.home', visible: true },
      { type: 'page', pageName: 'page.about', visible: true },
    ]);
  });

  it('appends newly-enabled features hidden, and keeps disabled-feature entries in place', () => {
    const withFeature = reconcileMenu(undefined, pages, ['team', 'contact']);
    expect(withFeature.entries).toContainEqual({ type: 'feature', feature: 'team', visible: false });
    expect(withFeature.entries).toContainEqual({ type: 'feature', feature: 'contact', visible: false });

    // Feature already stored (e.g. ordered first), flag now off: the entry survives untouched.
    const stored: MenuConfig = { entries: [
      { type: 'feature', feature: 'team', visible: true },
      { type: 'page', pageName: 'page.home', visible: true },
      { type: 'page', pageName: 'page.about', visible: true },
    ] };
    expect(reconcileMenu(stored, pages, []).entries).toEqual(stored.entries);
  });

  it('dedupes duplicate entries defensively — first occurrence wins', () => {
    const menu: MenuConfig = { entries: [
      { type: 'page', pageName: 'page.home', visible: false },
      { type: 'page', pageName: 'page.home', visible: true },
    ] };
    expect(reconcileMenu(menu, pages, []).entries).toEqual([
      { type: 'page', pageName: 'page.home', visible: false },
      { type: 'page', pageName: 'page.about', visible: true },
    ]);
  });
});

describe('collectI18nEntries (menu labels)', () => {
  it('emits the feature label key with its custom or default title', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home')],
      { entries: [{ type: 'feature', feature: 'team', visible: true }] },
    );
    expect(collectI18nEntries(config)).toContainEqual({ key: 'team.menuTitle', defaultValue: 'Team' });

    const renamed = configWith(
      [page('page.home', '/home', 'Home')],
      { entries: [{ type: 'feature', feature: 'team', visible: true, menuTitle: 'Notre équipe' }] },
    );
    expect(collectI18nEntries(renamed)).toContainEqual({ key: 'team.menuTitle', defaultValue: 'Notre équipe' });
  });

  it('lets a page entry override win the page.menuTitle key over the page title', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home')],
      { entries: [{ type: 'page', pageName: 'page.home', visible: true, menuTitle: 'Welcome' }] },
    );
    const entries = collectI18nEntries(config);
    expect(entries.filter((e) => e.key === 'page.home.menuTitle')).toEqual([
      { key: 'page.home.menuTitle', defaultValue: 'Welcome' },
    ]);
  });
});
