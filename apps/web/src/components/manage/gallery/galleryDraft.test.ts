import { describe, it, expect } from 'vitest';
import type { GalleryConfig } from '@simple-site/interfaces';
import {
  addItem,
  addTheme,
  emptyGallery,
  itemsAt,
  moveItemInList,
  moveItemToList,
  moveTheme,
  removeItem,
  removeTheme,
  renameTheme,
  setCaptionPosition,
  setDisplayMode,
  updateItem,
} from './galleryDraft';

const item = (title: string) => ({ imageUrl: `/${title}.jpg`, title });

const seeded = (): GalleryConfig => ({
  items: [item('rootA'), item('rootB')],
  themes: [
    { themeId: 'nature', title: 'Nature', items: [item('tree'), item('lake')] },
    { themeId: 'cities', title: 'Cities', items: [item('paris')] },
  ],
});

describe('themes', () => {
  it('adds a theme with an immutable camelCase id derived from the name', () => {
    const next = addTheme(emptyGallery(), '  Paysages d’été  ');
    expect(next.themes).toEqual([{ themeId: 'paysagesDEte', title: 'Paysages d’été', items: [] }]);
  });

  it('suffixes the id on collision and falls back to "theme" when nothing usable remains', () => {
    const twice = addTheme(addTheme(emptyGallery(), 'Nature'), 'Nature');
    expect(twice.themes.map((t) => t.themeId)).toEqual(['nature', 'nature2']);
    expect(addTheme(emptyGallery(), '***').themes[0].themeId).toBe('theme');
  });

  it('renames a theme without touching its id (translations survive)', () => {
    const next = renameTheme(seeded(), 0, ' Wilderness ');
    expect(next.themes[0]).toMatchObject({ themeId: 'nature', title: 'Wilderness' });
    // An emptied rename keeps the current title — a theme IS its label.
    expect(renameTheme(seeded(), 0, '   ')).toEqual(seeded());
  });

  it('reorders themes and ignores out-of-bounds moves', () => {
    expect(moveTheme(seeded(), 0, 1).themes.map((t) => t.themeId)).toEqual(['cities', 'nature']);
    expect(moveTheme(seeded(), 0, -1)).toEqual(seeded());
  });

  it('deletes a theme by returning its items to the root list', () => {
    const next = removeTheme(seeded(), 0);
    expect(next.themes.map((t) => t.themeId)).toEqual(['cities']);
    expect(next.items.map((i) => i.title)).toEqual(['rootA', 'rootB', 'tree', 'lake']);
  });
});

describe('items', () => {
  it('adds, updates and removes items in the root list and inside a theme', () => {
    let gallery = addItem(seeded(), null, item('rootC'));
    expect(gallery.items.map((i) => i.title)).toEqual(['rootA', 'rootB', 'rootC']);

    gallery = addItem(gallery, 1, item('berlin'));
    expect(itemsAt(gallery, 1).map((i) => i.title)).toEqual(['paris', 'berlin']);

    gallery = updateItem(gallery, { themeIndex: 1, itemIndex: 0 }, { title: 'Paris by night' });
    expect(itemsAt(gallery, 1)[0]).toEqual({ title: 'Paris by night' });

    gallery = removeItem(gallery, { themeIndex: null, itemIndex: 0 });
    expect(gallery.items.map((i) => i.title)).toEqual(['rootB', 'rootC']);
  });

  it('moves an item within its own list only', () => {
    const next = moveItemInList(seeded(), { themeIndex: 0, itemIndex: 0 }, 1);
    expect(itemsAt(next, 0).map((i) => i.title)).toEqual(['lake', 'tree']);
    expect(moveItemInList(seeded(), { themeIndex: 0, itemIndex: 1 }, 1)).toEqual(seeded());
  });

  it('moves an item to another theme or out to the root, appended at the end', () => {
    const toTheme = moveItemToList(seeded(), { themeIndex: null, itemIndex: 0 }, 1);
    expect(toTheme.items.map((i) => i.title)).toEqual(['rootB']);
    expect(itemsAt(toTheme, 1).map((i) => i.title)).toEqual(['paris', 'rootA']);

    const toRoot = moveItemToList(seeded(), { themeIndex: 0, itemIndex: 1 }, null);
    expect(itemsAt(toRoot, 0).map((i) => i.title)).toEqual(['tree']);
    expect(toRoot.items.map((i) => i.title)).toEqual(['rootA', 'rootB', 'lake']);

    // Same list or unknown target → no-op.
    expect(moveItemToList(seeded(), { themeIndex: 0, itemIndex: 0 }, 0)).toEqual(seeded());
    expect(moveItemToList(seeded(), { themeIndex: 0, itemIndex: 0 }, 9)).toEqual(seeded());
  });
});

describe('design settings', () => {
  it('stores a non-default caption position and drops the design entirely on the default', () => {
    const withLeft = setCaptionPosition(seeded(), 'left');
    expect(withLeft.design).toEqual({ captionPosition: 'left' });
    // "below" is the default — stored as no design at all, keeping configs minimal.
    const backToDefault = setCaptionPosition(withLeft, 'below');
    expect('design' in backToDefault).toBe(false);
  });

  it('stores the display mode alongside the caption, each collapsing independently', () => {
    expect(setDisplayMode(seeded(), 'mosaic').design).toEqual({ displayMode: 'mosaic' });
    const withGrid = setDisplayMode(seeded(), 'grid');
    expect(withGrid.design).toEqual({ displayMode: 'grid' });

    const both = setCaptionPosition(withGrid, 'left');
    expect(both.design).toEqual({ captionPosition: 'left', displayMode: 'grid' });

    // "list" is the default mode — only the caption deviation remains…
    const listAgain = setDisplayMode(both, 'list');
    expect(listAgain.design).toEqual({ captionPosition: 'left' });
    // …and once everything is default the design disappears entirely.
    expect('design' in setCaptionPosition(listAgain, 'below')).toBe(false);
  });
});
