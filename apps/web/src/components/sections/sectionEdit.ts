import { createContext, useContext } from 'react';
import type { SectionProps, SectionType } from '@simple-site/interfaces';

/**
 * Operations an inline section editor exposes to the editable slots a renderer
 * declares. Paths are dotted and mirror the i18n content paths already used by
 * `sectionContentKey` (e.g. `title`, `ctaButtons.0.label`, `columns.1.paragraph`).
 */
export interface SectionEditContextValue {
  /** Patch a value at a dotted path within the section's `content`. */
  setContentAt: (path: string, value: unknown) => void;
  /** Patch a value at a dotted path within the section's `design`. */
  setDesignAt: (path: string, value: unknown) => void;
  /**
   * Apply an arbitrary transformation to the whole section, then normalize + emit.
   * The escape hatch for edits a single path can't express — e.g. removing a
   * column together with its index-aligned `columnConfig` / `columnLayout` entries.
   */
  mutate: (fn: (section: SectionProps<SectionType>) => SectionProps<SectionType>) => void;
  /** Open the media library and write the chosen URL to a dotted `design` path. */
  pickImageAt: (designPath: string) => void;
  /** False when the media library is unavailable (feature flag off) — image slots stay read-only. */
  canPickImage: boolean;
  /** Append an item to a repeatable list at a dotted `content` path. */
  addItemAt: (contentPath: string, blank: unknown) => void;
  /** Remove the item at `index` from a repeatable list at a dotted `content` path. */
  removeItemAt: (contentPath: string, index: number) => void;
}

/**
 * Present only while a section is being edited inline (admin preview); absent on
 * the public site, where the editable slots fall back to plain rendering.
 */
export const SectionEditContext = createContext<SectionEditContextValue | undefined>(undefined);

/** The inline editing context, or `undefined` when rendering publicly. */
export const useSectionEdit = (): SectionEditContextValue | undefined => useContext(SectionEditContext);

/**
 * Whether a renderer should render a slot at all. Publicly an empty field renders
 * nothing (unchanged behaviour); while editing, empty slots still render so they
 * can be filled in place.
 */
export const useSlotVisible = (): ((value?: string) => boolean) => {
  const edit = useSectionEdit();
  return (value?: string) => Boolean(value) || Boolean(edit);
};

const isIndex = (key: string) => /^\d+$/.test(key);

function setIn(target: unknown, keys: string[], value: unknown): unknown {
  const [head, ...rest] = keys;
  const base = target ?? (isIndex(head) ? [] : {});

  if (Array.isArray(base)) {
    const index = Number(head);
    const copy = base.slice();
    copy[index] = rest.length === 0 ? value : setIn(base[index], rest, value);
    return copy;
  }

  const obj = base as Record<string, unknown>;
  return { ...obj, [head]: rest.length === 0 ? value : setIn(obj[head], rest, value) };
}

/** Immutably set `value` at a dotted `path` (numeric segments index into arrays). */
export const setAtPath = <T>(obj: T, path: string, value: unknown): T =>
  setIn(obj, path.split('.'), value) as T;

/** Read the value at a dotted `path`. */
export const getAtPath = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) return acc[Number(key)];
    return (acc as Record<string, unknown>)[key];
  }, obj);
