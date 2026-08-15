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

/**
 * Position of an entry in the depth-1 menu tree (`child` absent → top level).
 * `tag` set → a row of the gallery entry's tag submenu (index into its
 * `galleryTags`), living UNDER the top-level entry at `top`.
 */
export interface EntryPath {
  top: number;
  child?: number;
  tag?: number;
}

/** What the Menu tab renders for one entry: resolved label/route + availability. */
export interface MenuEntryRow {
  entry: MenuEntry;
  path: EntryPath;
  /** Unique list key — tag rows share their parent `entry`. */
  rowKey: string;
  /** The row's own visibility (a tag row toggles its submenu state, not its parent). */
  visible: boolean;
  /** 0 = top level, 1 = inside the preceding group/gallery row. */
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
        rowKey: menuEntryId(entry),
        visible: entry.visible,
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
      // Deprecated standalone entries — reconciliation converts them away, so
      // the rows never render; typed here only for exhaustiveness.
      return {
        entry,
        path,
        rowKey: menuEntryId(entry),
        visible: entry.visible,
        depth,
        label: entry.tag,
        baseLabel: entry.tag,
        route: galleryTagRoute(entry.tag),
        kind: 'galleryTag' as const,
        i18nKey: galleryTagNameKey(entry.tag),
        available: false,
      };
    }
    const definition = FEATURE_PAGE_REGISTRY[entry.feature];
    return {
      entry,
      path,
      rowKey: menuEntryId(entry),
      visible: entry.visible,
      depth,
      label: featureEntryLabel(entry),
      baseLabel: featureEntryLabel({ ...entry, menuTitle: undefined }),
      route: FEATURE_PAGE_ROUTES[entry.feature],
      kind: 'feature' as const,
      i18nKey: menuTitleKey(entry.feature),
      available: Boolean(definition && flags && flags[definition.flag]),
    };
  };

  /**
   * The gallery entry's tag submenu rows, indented under it: EVERY declared
   * tag, labelled by its displayName (renaming happens on the gallery page —
   * one place to name a tag), toggled and reordered here. No rename, no group
   * moves — a tag row lives and dies with its tag.
   */
  const galleryTagRows = (entry: Extract<MenuEntry, { type: 'feature' }>, top: number): MenuEntryRow[] =>
    (entry.galleryTags ?? []).map((state, tagIndex) => {
      const tag = tagsById.get(state.tag);
      const label = tag?.displayName ?? state.tag;
      return {
        entry,
        path: { top, tag: tagIndex },
        rowKey: `galleryTag:${state.tag}`,
        visible: state.visible,
        depth: 1 as const,
        label,
        baseLabel: label,
        route: galleryTagRoute(state.tag),
        kind: 'galleryTag' as const,
        i18nKey: galleryTagNameKey(state.tag),
        available: Boolean(tag && flags?.gallery),
      };
    });

  return entries.flatMap((entry, top) => {
    if (entry.type !== 'group') {
      const row = leafRow(entry, { top }, 0);
      return entry.type === 'feature' && entry.feature === 'gallery'
        ? [row, ...galleryTagRows(entry, top)]
        : [row];
    }
    const groupRow: MenuEntryRow = {
      entry,
      path: { top },
      rowKey: menuEntryId(entry),
      visible: entry.visible,
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

/** A tag path toggles its submenu row's state, never its parent gallery entry. */
export const setEntryVisible = (entries: MenuEntry[], path: EntryPath, visible: boolean): MenuEntry[] => {
  if (path.tag === undefined) return updateAt(entries, path, (entry) => ({ ...entry, visible }));
  return updateAt(entries, { top: path.top }, (entry) => {
    if (entry.type !== 'feature' || !entry.galleryTags) return entry;
    return {
      ...entry,
      galleryTags: entry.galleryTags.map((state, index) => (index === path.tag ? { ...state, visible } : state)),
    };
  });
};

/** Sets an entry's custom title. Group labels are required — clearing keeps the current one. */
export const setEntryTitle = (entries: MenuEntry[], path: EntryPath, menuTitle: string | undefined): MenuEntry[] =>
  updateAt(entries, path, (entry) =>
    entry.type === 'group' ? (menuTitle ? { ...entry, menuTitle } : entry) : { ...entry, menuTitle },
  );

/** Moves the entry at `path` by `offset` within its own level (a group moves as a block). */
export const moveEntry = (entries: MenuEntry[], path: EntryPath, offset: number): MenuEntry[] => {
  if (path.tag !== undefined) {
    const tagIndex = path.tag;
    return updateAt(entries, { top: path.top }, (entry) => {
      if (entry.type !== 'feature' || !entry.galleryTags) return entry;
      const galleryTags = moveItem(entry.galleryTags, tagIndex, tagIndex + offset);
      return galleryTags === entry.galleryTags ? entry : { ...entry, galleryTags };
    });
  }
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
  // The gallery entry carries its own submenu — it can never join a group.
  if (entry.type === 'feature' && entry.feature === 'gallery') return entries;
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
