import {
  FEATURE_PAGE_ROUTES,
  GROUP_ID_PATTERN,
  featureEntryLabel,
  galleryTagNameKey,
  groupTitleKey,
  menuEntryId,
  menuTitleKey,
  type GalleryTag,
  type MenuEntry,
  type MenuLeafEntry,
  type PageConfiguration,
} from '@simple-site/interfaces';
import type { FeatureFlags } from '../../../services/featuresService';
import { FEATURE_PAGE_REGISTRY } from '../../../router/publicMenu';
import { galleryTagRoute } from '../../../pages/gallery/galleryDisplay';
import { moveItem } from '../pages/pagesDraft';

/** Position of an entry in the depth-1 menu tree (`child` absent → top level). */
export interface EntryPath {
  top: number;
  child?: number;
}

/** What the Menu tab renders for one entry: resolved label/route + availability. */
export interface MenuEntryRow {
  entry: MenuEntry;
  path: EntryPath;
  /** 0 = top level, 1 = inside the preceding group row. */
  depth: 0 | 1;
  /** Effective display label — the entry's custom title, else `baseLabel`. */
  label: string;
  /**
   * The label the entry falls back to without a custom title: the page's own
   * menu title, or the feature's default label. Shown as the rename field's
   * placeholder (an empty field reverts to it). For a group — whose label is
   * required — it is the current label, and an emptied rename keeps it.
   */
  baseLabel: string;
  route: string;
  kind: 'page' | 'feature' | 'galleryTag' | 'group';
  /** The label's translation key on the Translations page. */
  i18nKey: string;
  /**
   * False for feature entries whose feature is unregistered or flag-off: the row is
   * kept (so ordering survives flag flips) but rendered greyed and not toggleable.
   */
  available: boolean;
  /** Group rows only. */
  groupId?: string;
  alwaysExpanded?: boolean;
  childCount?: number;
}

/** Builds the Menu tab's row view-models — group rows followed by their children. */
export const entryRows = (
  entries: MenuEntry[],
  pages: ReadonlyArray<Pick<PageConfiguration, 'pageName' | 'route' | 'menuTitle'>>,
  flags: FeatureFlags | null,
  galleryTags: readonly GalleryTag[] = [],
): MenuEntryRow[] => {
  const pagesByName = new Map(pages.map((page) => [page.pageName, page]));
  const tagsById = new Map(galleryTags.map((tag) => [tag.tag, tag]));

  const leafRow = (entry: MenuLeafEntry, path: EntryPath, depth: 0 | 1): MenuEntryRow => {
    if (entry.type === 'page') {
      const page = pagesByName.get(entry.pageName);
      const baseLabel = page?.menuTitle ?? entry.pageName;
      return {
        entry,
        path,
        depth,
        label: entry.menuTitle ?? baseLabel,
        baseLabel,
        route: page?.route ?? '',
        kind: 'page' as const,
        i18nKey: menuTitleKey(entry.pageName),
        available: Boolean(page),
      };
    }
    if (entry.type === 'galleryTag') {
      // The label falls back to the tag's displayName; the entry hides with
      // the gallery flag, like the feature entry it accompanies.
      const tag = tagsById.get(entry.tag);
      const baseLabel = tag?.displayName ?? entry.tag;
      return {
        entry,
        path,
        depth,
        label: entry.menuTitle ?? baseLabel,
        baseLabel,
        route: galleryTagRoute(entry.tag),
        kind: 'galleryTag' as const,
        i18nKey: galleryTagNameKey(entry.tag),
        available: Boolean(tag && flags?.gallery),
      };
    }
    const definition = FEATURE_PAGE_REGISTRY[entry.feature];
    return {
      entry,
      path,
      depth,
      label: featureEntryLabel(entry),
      baseLabel: featureEntryLabel({ ...entry, menuTitle: undefined }),
      route: FEATURE_PAGE_ROUTES[entry.feature],
      kind: 'feature' as const,
      i18nKey: menuTitleKey(entry.feature),
      available: Boolean(definition && flags && flags[definition.flag]),
    };
  };

  return entries.flatMap((entry, top) => {
    if (entry.type !== 'group') return [leafRow(entry, { top }, 0)];
    const groupRow: MenuEntryRow = {
      entry,
      path: { top },
      depth: 0,
      label: entry.menuTitle,
      baseLabel: entry.menuTitle,
      route: '',
      kind: 'group' as const,
      i18nKey: groupTitleKey(entry.groupId),
      available: true,
      groupId: entry.groupId,
      alwaysExpanded: entry.alwaysExpanded ?? false,
      childCount: entry.children.length,
    };
    return [groupRow, ...entry.children.map((child, childIndex) => leafRow(child, { top, child: childIndex }, 1))];
  });
};

/** A trimmed rename: empty or identical to the fallback clears the custom title. */
export const normalizedMenuTitle = (value: string, baseLabel: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === baseLabel) return undefined;
  return trimmed;
};

/** Applies `update` to the entry at `path`, returning a new entries array. */
const updateAt = (entries: MenuEntry[], path: EntryPath, update: (entry: MenuEntry) => MenuEntry): MenuEntry[] =>
  entries.map((entry, top) => {
    if (top !== path.top) return entry;
    if (path.child === undefined || entry.type !== 'group') return update(entry);
    return {
      ...entry,
      children: entry.children.map((child, childIndex) =>
        childIndex === path.child ? (update(child) as MenuLeafEntry) : child,
      ),
    };
  });

export const setEntryVisible = (entries: MenuEntry[], path: EntryPath, visible: boolean): MenuEntry[] =>
  updateAt(entries, path, (entry) => ({ ...entry, visible }));

/** Sets an entry's custom title. Group labels are required — clearing keeps the current one. */
export const setEntryTitle = (entries: MenuEntry[], path: EntryPath, menuTitle: string | undefined): MenuEntry[] =>
  updateAt(entries, path, (entry) =>
    entry.type === 'group' ? (menuTitle ? { ...entry, menuTitle } : entry) : { ...entry, menuTitle },
  );

/** Moves the entry at `path` by `offset` within its own level (a group moves as a block). */
export const moveEntry = (entries: MenuEntry[], path: EntryPath, offset: number): MenuEntry[] => {
  if (path.child === undefined) return moveItem(entries, path.top, path.top + offset);
  const parent = entries[path.top];
  if (parent?.type !== 'group') return entries;
  const children = moveItem(parent.children, path.child, path.child + offset);
  if (children === parent.children) return entries;
  return entries.map((entry, top) => (top === path.top ? { ...parent, children } : entry));
};

/** Appends a new empty group named after `label`; the id is derived once and immutable. */
export const addGroup = (entries: MenuEntry[], label: string): MenuEntry[] => {
  const trimmed = label.trim();
  if (!trimmed) return entries;
  const existing = entries.flatMap((entry) => (entry.type === 'group' ? [entry.groupId] : []));
  return [
    ...entries,
    { type: 'group', groupId: generateGroupId(trimmed, existing), menuTitle: trimmed, visible: true, children: [] },
  ];
};

/**
 * Appends a visible menu entry linking a gallery tag's collection page — the
 * only way a collection reaches the navigation (nothing is added when a tag is
 * created). No-op when the tag is already in the menu (top level or in a group).
 */
export const addGalleryTagEntry = (entries: MenuEntry[], tag: string): MenuEntry[] => {
  const id = `galleryTag:${tag}`;
  const present = entries.some(
    (entry) =>
      menuEntryId(entry) === id ||
      (entry.type === 'group' && entry.children.some((child) => menuEntryId(child) === id)),
  );
  if (present) return entries;
  return [...entries, { type: 'galleryTag', tag, visible: true }];
};

/**
 * Removes the leaf entry at `path` from the menu — the entry's target (e.g.
 * the gallery tag) is untouched. Offered for galleryTag entries only: page and
 * feature entries are managed by reconciliation, not removed by hand.
 */
export const removeEntry = (entries: MenuEntry[], path: EntryPath): MenuEntry[] => {
  if (path.child === undefined) return entries.filter((_, top) => top !== path.top);
  const parent = entries[path.top];
  if (parent?.type !== 'group') return entries;
  return entries.map((entry, top) =>
    top === path.top
      ? { ...parent, children: parent.children.filter((_, child) => child !== path.child) }
      : entry,
  );
};

/** Deletes the group at `top`, re-inserting its children at its position in order. */
export const deleteGroup = (entries: MenuEntry[], top: number): MenuEntry[] => {
  const group = entries[top];
  if (group?.type !== 'group') return entries;
  const next = entries.slice();
  next.splice(top, 1, ...group.children);
  return next;
};

/** Moves the top-level leaf at `top` to the end of the group `groupId`'s children. */
export const moveIntoGroup = (entries: MenuEntry[], top: number, groupId: string): MenuEntry[] => {
  const entry = entries[top];
  if (!entry || entry.type === 'group') return entries;
  if (!entries.some((candidate) => candidate.type === 'group' && candidate.groupId === groupId)) return entries;
  return entries
    .filter((_, index) => index !== top)
    .map((candidate) =>
      candidate.type === 'group' && candidate.groupId === groupId
        ? { ...candidate, children: [...candidate.children, entry] }
        : candidate,
    );
};

/** Moves a group child back to the top level, right after its group. */
export const moveOutOfGroup = (entries: MenuEntry[], path: EntryPath): MenuEntry[] => {
  if (path.child === undefined) return entries;
  const parent = entries[path.top];
  if (parent?.type !== 'group') return entries;
  const child = parent.children[path.child];
  if (!child) return entries;
  const children = parent.children.filter((_, index) => index !== path.child);
  const next: MenuEntry[] = entries.map((entry, top) => (top === path.top ? { ...parent, children } : entry));
  next.splice(path.top + 1, 0, child);
  return next;
};

/** Toggles a group's mobile "always expanded" flag (false → field removed, keeping configs minimal). */
export const setGroupAlwaysExpanded = (entries: MenuEntry[], top: number, value: boolean): MenuEntry[] =>
  entries.map((entry, index) => {
    if (index !== top || entry.type !== 'group') return entry;
    if (!value) {
      const next = { ...entry };
      delete next.alwaysExpanded;
      return next;
    }
    return { ...entry, alwaysExpanded: true };
  });

/**
 * Derives a group id from its label: camelCase word runs, diacritics stripped,
 * `fallback` when nothing usable remains, `g`-prefixed when starting with a
 * digit, numeric suffix on collision. Ids are immutable after creation so
 * translations stored under `menu.<groupId>.menuTitle` survive renames. The
 * gallery editor reuses it for theme ids (same pattern, same immutability).
 */
export const generateGroupId = (label: string, existing: readonly string[], fallback = 'group'): string => {
  const words =
    label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .match(/[a-zA-Z0-9]+/g) ?? [];
  let base = words
    .map((word, index) => (index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join('');
  if (/^[0-9]/.test(base)) base = `g${base}`;
  if (!GROUP_ID_PATTERN.test(base)) base = fallback;
  const taken = new Set(existing);
  let candidate = base;
  let suffix = 2;
  while (taken.has(candidate)) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
};
