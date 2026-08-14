import { describe, it, expect } from 'vitest';
import type { MenuEntry, MenuGroupEntry } from '@simple-site/interfaces';
import {
  addGroup,
  deleteGroup,
  entryRows,
  generateGroupId,
  moveEntry,
  moveIntoGroup,
  moveOutOfGroup,
  normalizedMenuTitle,
  setEntryTitle,
  setGroupAlwaysExpanded,
} from './menuDraft';

const pages = [
  { pageName: 'page.home', route: '/home', menuTitle: 'Home' },
  { pageName: 'page.about', route: '/about', menuTitle: 'About' },
];

const FLAGS = { media: false, team: false, contact: false, gallery: false };

const group = (children: MenuEntry[] = [], overrides: Partial<MenuGroupEntry> = {}): MenuEntry => ({
  type: 'group',
  groupId: 'more',
  menuTitle: 'More',
  visible: true,
  children: children as MenuGroupEntry['children'],
  ...overrides,
});

describe('entryRows', () => {
  it('resolves page rows from the referenced page', () => {
    const entries: MenuEntry[] = [{ type: 'page', pageName: 'page.about', visible: true }];
    expect(entryRows(entries, pages, FLAGS)).toEqual([
      {
        entry: entries[0],
        path: { top: 0 },
        rowKey: 'page:page.about',
        visible: true,
        depth: 0,
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
    const [pageRow, featureRow] = entryRows([pageEntry, featureEntry], pages, { media: false, team: true, contact: false, gallery: false });
    expect(pageRow.label).toBe('Who we are');
    expect(pageRow.baseLabel).toBe('About');
    expect(featureRow.label).toBe('Notre équipe');
    expect(featureRow.baseLabel).toBe('Team');
  });

  it('marks feature rows unavailable while their flag is off', () => {
    const entries: MenuEntry[] = [{ type: 'feature', feature: 'team', visible: false }];
    const [row] = entryRows(entries, pages, { media: true, team: false, contact: false, gallery: false });
    expect(row.kind).toBe('feature');
    expect(row.route).toBe('/team');
    expect(row.i18nKey).toBe('team.menuTitle');
    expect(row.available).toBe(false); // kept in the list, but greyed and not toggleable
  });

  it('marks feature rows available when their flag is on', () => {
    const entries: MenuEntry[] = [{ type: 'feature', feature: 'team', visible: true }];
    const [row] = entryRows(entries, pages, { media: false, team: true, contact: false, gallery: false });
    expect(row.label).toBe('Team');
    expect(row.available).toBe(true);
  });

  it('falls back to the raw reference when a page row cannot be resolved', () => {
    const entries: MenuEntry[] = [{ type: 'page', pageName: 'page.gone', visible: true }];
    const [row] = entryRows(entries, pages, FLAGS);
    expect(row.label).toBe('page.gone');
    expect(row.available).toBe(false);
  });

  it('flattens a group row followed by its indented children', () => {
    const entries: MenuEntry[] = [
      { type: 'page', pageName: 'page.home', visible: true },
      group(
        [
          { type: 'page', pageName: 'page.about', visible: true },
          { type: 'feature', feature: 'team', visible: false },
        ],
        { alwaysExpanded: true },
      ),
    ];
    const rows = entryRows(entries, pages, FLAGS);
    expect(rows.map((r) => [r.kind, r.depth])).toEqual([
      ['page', 0],
      ['group', 0],
      ['page', 1],
      ['feature', 1],
    ]);
    const groupRow = rows[1];
    expect(groupRow.label).toBe('More');
    expect(groupRow.i18nKey).toBe('menu.more.menuTitle');
    expect(groupRow.groupId).toBe('more');
    expect(groupRow.alwaysExpanded).toBe(true);
    expect(groupRow.childCount).toBe(2);
    expect(groupRow.available).toBe(true);
    expect(rows[2].path).toEqual({ top: 1, child: 0 });
    expect(rows[3].path).toEqual({ top: 1, child: 1 });
  });
});

describe('entryRows — gallery tag submenu', () => {
  const GALLERY_ON = { media: false, team: false, contact: false, gallery: true };
  const declared = [
    { tag: 'nature', displayName: 'Nature' },
    { tag: 'summer-2026', displayName: 'Été 2026' },
  ];

  it('indents one row per submenu tag under the gallery entry, in the menu order', () => {
    const entries: MenuEntry[] = [
      {
        type: 'feature',
        feature: 'gallery',
        visible: true,
        galleryTags: [
          { tag: 'summer-2026', visible: true },
          { tag: 'nature', visible: false },
        ],
      },
    ];
    const rows = entryRows(entries, pages, GALLERY_ON, declared);
    expect(rows.map((r) => [r.kind, r.depth, r.visible])).toEqual([
      ['feature', 0, true],
      ['galleryTag', 1, true],
      ['galleryTag', 1, false],
    ]);
    // Labelled by the tag's displayName (named on the gallery page, not here),
    // addressed by a tag path into the parent's submenu list.
    expect(rows[1]).toMatchObject({
      label: 'Été 2026',
      route: '/gallery/tag/summer-2026',
      i18nKey: 'gallery.tag.summer-2026.menuTitle',
      path: { top: 0, tag: 0 },
      rowKey: 'galleryTag:summer-2026',
      available: true,
    });
    expect(rows[2].path).toEqual({ top: 0, tag: 1 });
  });

  it('greys the tag rows while the gallery flag is off', () => {
    const entries: MenuEntry[] = [
      { type: 'feature', feature: 'gallery', visible: true, galleryTags: [{ tag: 'nature', visible: true }] },
    ];
    const [, row] = entryRows(entries, pages, FLAGS, declared);
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

describe('menu mutators', () => {
  const base: MenuEntry[] = [
    { type: 'page', pageName: 'page.home', visible: true },
    group([
      { type: 'page', pageName: 'page.about', visible: true },
      { type: 'feature', feature: 'team', visible: true },
    ]),
    { type: 'feature', feature: 'contact', visible: true },
  ];

  it('setEntryTitle reaches group children, and keeps a group label on empty rename', () => {
    const renamedChild = setEntryTitle(base, { top: 1, child: 0 }, 'Who we are');
    expect((renamedChild[1] as MenuGroupEntry).children[0].menuTitle).toBe('Who we are');

    const clearedGroup = setEntryTitle(base, { top: 1 }, undefined);
    expect((clearedGroup[1] as MenuGroupEntry).menuTitle).toBe('More'); // required — kept

    const renamedGroup = setEntryTitle(base, { top: 1 }, 'Extra');
    expect((renamedGroup[1] as MenuGroupEntry).menuTitle).toBe('Extra');
    expect((renamedGroup[1] as MenuGroupEntry).groupId).toBe('more'); // id immutable
  });

  it('moveEntry stays within its level', () => {
    const moved = moveEntry(base, { top: 1, child: 1 }, -1);
    expect((moved[1] as MenuGroupEntry).children.map((c) => (c.type === 'page' ? c.pageName : c.type === 'feature' ? c.feature : c.tag))).toEqual([
      'team',
      'page.about',
    ]);
    // Out of bounds within the group → no change, never escapes the group.
    expect(moveEntry(base, { top: 1, child: 0 }, -1)).toBe(base);
    // A group moves as a block at the top level.
    const topMoved = moveEntry(base, { top: 1 }, 1);
    expect(topMoved.map((e) => e.type)).toEqual(['page', 'feature', 'group']);
  });

  it('addGroup appends an empty visible group with a derived id', () => {
    const next = addGroup(base, 'Ressources');
    const added = next[next.length - 1] as MenuGroupEntry;
    expect(added).toEqual({ type: 'group', groupId: 'ressources', menuTitle: 'Ressources', visible: true, children: [] });
    // Colliding label → suffixed id.
    const again = addGroup(next, 'ressources');
    expect((again[again.length - 1] as MenuGroupEntry).groupId).toBe('ressources2');
  });

  it('deleteGroup re-inserts the children at the group position, in order', () => {
    const next = deleteGroup(base, 1);
    expect(next.map((e) => (e.type === 'page' ? e.pageName : e.type === 'feature' ? e.feature : e.type === 'galleryTag' ? e.tag : e.groupId))).toEqual([
      'page.home',
      'page.about',
      'team',
      'contact',
    ]);
  });

  it('moveIntoGroup appends a top-level leaf to the target group', () => {
    const next = moveIntoGroup(base, 2, 'more');
    expect(next).toHaveLength(2);
    expect((next[1] as MenuGroupEntry).children.map((c) => (c.type === 'page' ? c.pageName : c.type === 'feature' ? c.feature : c.tag))).toEqual([
      'page.about',
      'team',
      'contact',
    ]);
    // Unknown target or group source → no-op, nothing is lost.
    expect(moveIntoGroup(base, 2, 'ghost')).toBe(base);
    expect(moveIntoGroup(base, 1, 'more')).toBe(base);
  });

  it('moveOutOfGroup re-inserts the child right after its group', () => {
    const next = moveOutOfGroup(base, { top: 1, child: 0 });
    expect((next[1] as MenuGroupEntry).children).toHaveLength(1);
    expect(next[2]).toEqual({ type: 'page', pageName: 'page.about', visible: true });
    expect(next[3]).toEqual({ type: 'feature', feature: 'contact', visible: true });
  });

  it('setGroupAlwaysExpanded stores true and removes the field when false', () => {
    const on = setGroupAlwaysExpanded(base, 1, true);
    expect((on[1] as MenuGroupEntry).alwaysExpanded).toBe(true);
    const off = setGroupAlwaysExpanded(on, 1, false);
    expect('alwaysExpanded' in (off[1] as MenuGroupEntry)).toBe(false);
  });
});

describe('generateGroupId', () => {
  it('camelCases word runs and strips diacritics', () => {
    expect(generateGroupId('Notre équipe', [])).toBe('notreEquipe');
    expect(generateGroupId('More  Links!', [])).toBe('moreLinks');
  });

  it('falls back to "group" and guards a leading digit', () => {
    expect(generateGroupId('!!!', [])).toBe('group');
    expect(generateGroupId('2024 archive', [])).toBe('g2024Archive');
  });

  it('suffixes on collision', () => {
    expect(generateGroupId('More', ['more'])).toBe('more2');
    expect(generateGroupId('More', ['more', 'more2'])).toBe('more3');
  });
});
