import { describe, it, expect } from 'vitest';
import { reconcileMenu, type MenuConfig, type SiteConfig } from '@simple-site/interfaces';
import { resolveMenuItems } from './publicMenu';
import type { FeatureFlags } from '../services/featuresService';

const page = (pageName: string, route: string, menuTitle: string) =>
  ({ pageName, route, menuTitle, sections: [] });

const configWith = (pages: ReturnType<typeof page>[], menu?: MenuConfig): SiteConfig =>
  ({ site: { siteName: 'Test' }, themes: [], pages, menu }) as unknown as SiteConfig;

const FLAGS: FeatureFlags = { media: false, team: false };

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
    expect(resolveMenuItems(config, { media: false, team: true })).toEqual([
      { menuTitle: 'Team', pageName: 'team', route: '/team' },
      { menuTitle: 'Home', pageName: 'page.home', route: '/home' },
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
    const withFeature = reconcileMenu(undefined, pages, ['team']);
    expect(withFeature.entries).toContainEqual({ type: 'feature', feature: 'team', visible: false });

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
