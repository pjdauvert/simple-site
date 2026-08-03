import { describe, it, expect } from 'vitest';
import { collectI18nEntries, type MenuConfig, type SiteConfig } from '@simple-site/interfaces';
import { reconcileMenu, resolveGroupDisplay, resolveNavTree, type NavNode } from './publicMenu';
import type { FeatureFlags } from '../services/featuresService';

const page = (pageName: string, route: string, menuTitle: string) =>
  ({ pageName, route, menuTitle, sections: [] });

const configWith = (pages: ReturnType<typeof page>[], menu?: MenuConfig): SiteConfig =>
  ({ site: { siteName: 'Test' }, themes: [], pages, menu }) as unknown as SiteConfig;

const FLAGS: FeatureFlags = { media: false, team: false, contact: false };

/** Unwraps top-level item nodes — flat-menu tests read like before. */
const items = (nodes: NavNode[]) => nodes.flatMap((n) => (n.kind === 'item' ? [n.item] : []));

describe('resolveNavTree', () => {
  it('derives items from the pages order when the config has no menu (legacy behavior)', () => {
    const config = configWith([page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')]);
    expect(resolveNavTree(config, FLAGS)).toEqual([
      { kind: 'item', item: { menuTitle: 'Home', pageName: 'page.home', route: '/home' } },
      { kind: 'item', item: { menuTitle: 'About', pageName: 'page.about', route: '/about' } },
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
    expect(items(resolveNavTree(config, FLAGS)).map((i) => i.route)).toEqual(['/about', '/home']);
  });

  it('skips hidden entries — the page stays reachable but out of the nav', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')],
      { entries: [
        { type: 'page', pageName: 'page.home', visible: true },
        { type: 'page', pageName: 'page.about', visible: false },
      ] },
    );
    expect(items(resolveNavTree(config, FLAGS)).map((i) => i.pageName)).toEqual(['page.home']);
  });

  it('renders the team feature entry when its flag is on', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home')],
      { entries: [
        { type: 'feature', feature: 'team', visible: true },
        { type: 'page', pageName: 'page.home', visible: true },
      ] },
    );
    expect(items(resolveNavTree(config, { media: false, team: true, contact: false }))).toEqual([
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
    expect(items(resolveNavTree(config, { media: false, team: false, contact: true }))).toEqual([
      { menuTitle: 'Contact', pageName: 'contact', route: '/contact' },
      { menuTitle: 'Home', pageName: 'page.home', route: '/home' },
    ]);
    // Flag off → the entry is skipped like any disabled feature.
    expect(items(resolveNavTree(config, FLAGS)).map((i) => i.pageName)).toEqual(['page.home']);
  });

  it('renders custom entry labels — a page override and a renamed feature', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home')],
      { entries: [
        { type: 'feature', feature: 'team', visible: true, menuTitle: 'Notre équipe' },
        { type: 'page', pageName: 'page.home', visible: true, menuTitle: 'Welcome' },
      ] },
    );
    expect(items(resolveNavTree(config, { media: false, team: true, contact: false })).map((i) => i.menuTitle)).toEqual([
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
    expect(items(resolveNavTree(config, FLAGS)).map((i) => i.pageName)).toEqual(['page.home']);
  });

  it('resolves a group into a group node with its children in order', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')],
      { entries: [
        { type: 'page', pageName: 'page.home', visible: true },
        { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
          { type: 'page', pageName: 'page.about', visible: true },
          { type: 'feature', feature: 'team', visible: true },
        ] },
      ] },
    );
    expect(resolveNavTree(config, { media: false, team: true, contact: false })).toEqual([
      { kind: 'item', item: { menuTitle: 'Home', pageName: 'page.home', route: '/home' } },
      {
        kind: 'group',
        id: 'more',
        menuTitle: 'More',
        i18nKey: 'menu.more.menuTitle',
        alwaysExpanded: false,
        items: [
          { menuTitle: 'About', pageName: 'page.about', route: '/about' },
          { menuTitle: 'Team', pageName: 'team', route: '/team' },
        ],
      },
    ]);
  });

  it('carries alwaysExpanded onto the group node', () => {
    const config = configWith(
      [page('page.about', '/about', 'About')],
      { entries: [
        { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, alwaysExpanded: true, children: [
          { type: 'page', pageName: 'page.about', visible: true },
        ] },
      ] },
    );
    const [node] = resolveNavTree(config, FLAGS);
    expect(node.kind).toBe('group');
    expect((node as Extract<NavNode, { kind: 'group' }>).alwaysExpanded).toBe(true);
  });

  it('drops a hidden group with its whole subtree', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')],
      { entries: [
        { type: 'page', pageName: 'page.home', visible: true },
        { type: 'group', groupId: 'more', menuTitle: 'More', visible: false, children: [
          { type: 'page', pageName: 'page.about', visible: true },
        ] },
      ] },
    );
    expect(resolveNavTree(config, FLAGS)).toEqual([
      { kind: 'item', item: { menuTitle: 'Home', pageName: 'page.home', route: '/home' } },
    ]);
  });

  it('omits a group whose children all resolve away (hidden, unknown page, flag-off feature)', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home'), page('page.about', '/about', 'About')],
      { entries: [
        { type: 'page', pageName: 'page.home', visible: true },
        { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
          { type: 'page', pageName: 'page.about', visible: false },
          { type: 'page', pageName: 'page.gone', visible: true },
          { type: 'feature', feature: 'team', visible: true },
        ] },
      ] },
    );
    expect(resolveNavTree(config, FLAGS)).toEqual([
      { kind: 'item', item: { menuTitle: 'Home', pageName: 'page.home', route: '/home' } },
    ]);
  });
});

describe('resolveGroupDisplay', () => {
  it('defaults to popover (no menu, or no explicit setting) and carries a stored bar mode', () => {
    expect(resolveGroupDisplay(configWith([page('page.home', '/home', 'Home')]))).toBe('popover');
    expect(resolveGroupDisplay(configWith([page('page.home', '/home', 'Home')], { entries: [] }))).toBe('popover');
    expect(
      resolveGroupDisplay(configWith([page('page.home', '/home', 'Home')], { entries: [], groupDisplay: 'bar' })),
    ).toBe('bar');
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

  it('prunes deleted pages inside a group and keeps its disabled-feature children', () => {
    const menu: MenuConfig = { entries: [
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
        { type: 'page', pageName: 'page.gone', visible: true },
        { type: 'page', pageName: 'page.about', visible: true },
        { type: 'feature', feature: 'team', visible: true },
      ] },
      { type: 'page', pageName: 'page.home', visible: true },
    ] };
    expect(reconcileMenu(menu, pages, []).entries).toEqual([
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
        { type: 'page', pageName: 'page.about', visible: true },
        { type: 'feature', feature: 'team', visible: true },
      ] },
      { type: 'page', pageName: 'page.home', visible: true },
    ]);
  });

  it('carries menu-level settings (groupDisplay) through reconciliation', () => {
    const menu: MenuConfig = { entries: [{ type: 'page', pageName: 'page.home', visible: true }], groupDisplay: 'bar' };
    const reconciled = reconcileMenu(menu, pages, []);
    expect(reconciled.groupDisplay).toBe('bar');
    expect(reconcileMenu(undefined, pages, []).groupDisplay).toBeUndefined();
  });

  it('keeps a group that ends up empty after pruning', () => {
    const menu: MenuConfig = { entries: [
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
        { type: 'page', pageName: 'page.gone', visible: true },
      ] },
    ] };
    const reconciled = reconcileMenu(menu, pages, []).entries;
    expect(reconciled[0]).toEqual({ type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [] });
  });

  it('appends new pages and features at the top level only, never into a group', () => {
    const menu: MenuConfig = { entries: [
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
        { type: 'page', pageName: 'page.home', visible: true },
      ] },
    ] };
    expect(reconcileMenu(menu, pages, ['team']).entries).toEqual([
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
        { type: 'page', pageName: 'page.home', visible: true },
      ] },
      { type: 'page', pageName: 'page.about', visible: true },
      { type: 'feature', feature: 'team', visible: false },
    ]);
  });

  it('dedupes across levels first-occurrence-wins, in both directions', () => {
    // Top level first: the copy inside the group is dropped.
    const topFirst: MenuConfig = { entries: [
      { type: 'page', pageName: 'page.home', visible: true },
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
        { type: 'page', pageName: 'page.home', visible: false },
        { type: 'page', pageName: 'page.about', visible: true },
      ] },
    ] };
    expect(reconcileMenu(topFirst, pages, []).entries).toEqual([
      { type: 'page', pageName: 'page.home', visible: true },
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
        { type: 'page', pageName: 'page.about', visible: true },
      ] },
    ]);

    // Group first: the later top-level copy is dropped.
    const groupFirst: MenuConfig = { entries: [
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
        { type: 'page', pageName: 'page.home', visible: true },
      ] },
      { type: 'page', pageName: 'page.home', visible: false },
      { type: 'page', pageName: 'page.about', visible: true },
    ] };
    expect(reconcileMenu(groupFirst, pages, []).entries).toEqual([
      { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
        { type: 'page', pageName: 'page.home', visible: true },
      ] },
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

  it('emits the group label key and walks the group children', () => {
    const config = configWith(
      [page('page.home', '/home', 'Home')],
      { entries: [
        { type: 'group', groupId: 'more', menuTitle: 'More', visible: true, children: [
          { type: 'page', pageName: 'page.home', visible: true, menuTitle: 'Welcome' },
          { type: 'feature', feature: 'team', visible: true },
        ] },
      ] },
    );
    const entries = collectI18nEntries(config);
    expect(entries).toContainEqual({ key: 'menu.more.menuTitle', defaultValue: 'More' });
    // Children keep the exact leaf treatment: the override wins the shared page key…
    expect(entries.filter((e) => e.key === 'page.home.menuTitle')).toEqual([
      { key: 'page.home.menuTitle', defaultValue: 'Welcome' },
    ]);
    // …and the feature owns its key.
    expect(entries).toContainEqual({ key: 'team.menuTitle', defaultValue: 'Team' });
  });
});
