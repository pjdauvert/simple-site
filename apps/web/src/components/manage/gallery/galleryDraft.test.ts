import { describe, it, expect } from 'vitest';
import type { GalleryConfig } from '@simple-site/interfaces';
import {
  addItem,
  addTag,
  emptyGallery,
  isValidNewTag,
  moveItemInList,
  removeItem,
  removeTag,
  setCaptionPosition,
  setDisplayMode,
  setItemAspectRatio,
  setItemBorder,
  setItemBorderColor,
  setItemColumns,
  setItemCornerRadius,
  setItemElevation,
  setItemFit,
  setItemMaxWidthPercent,
  setItemSpacing,
  setItemTagged,
  setTagDescription,
  setTagDisplayName,
  setWatermark,
  updateItem,
} from './galleryDraft';

const item = (title: string, tags: string[] = []) => ({ imageUrl: `/${title}.jpg`, title, tags });

const seeded = (): GalleryConfig => ({
  items: [item('tree', ['nature']), item('lake', ['nature', 'water']), item('paris')],
  tags: [
    { tag: 'nature', displayName: 'Nature' },
    { tag: 'water', displayName: 'Water' },
  ],
});

describe('tags', () => {
  it('declares a tag with an immutable id; the displayName defaults to it', () => {
    const next = addTag(emptyGallery(), ' summer-2026 ', '  Été 2026  ');
    expect(next.tags).toEqual([{ tag: 'summer-2026', displayName: 'Été 2026' }]);
    expect(addTag(emptyGallery(), 'city_walks').tags).toEqual([{ tag: 'city_walks', displayName: 'city_walks' }]);
  });

  it('refuses an invalid or already-taken id (the editor validates with isValidNewTag)', () => {
    const base = seeded();
    for (const bad of ['mon thème', 'été', 'a b', '', 'x'.repeat(65), 'nature']) {
      expect(isValidNewTag(base, bad)).toBe(false);
      expect(addTag(base, bad)).toEqual(base);
    }
    expect(isValidNewTag(base, 'summer-2026_v2')).toBe(true);
  });

  it('renames a displayName without touching the id (translations survive)', () => {
    const next = setTagDisplayName(seeded(), 0, ' Wilderness ');
    expect(next.tags[0]).toEqual({ tag: 'nature', displayName: 'Wilderness' });
    // An emptied rename keeps the current name — a tag is presented BY its name.
    expect(setTagDisplayName(seeded(), 0, '   ')).toEqual(seeded());
  });

  it('stores a trimmed description and clears it when emptied', () => {
    const withText = setTagDescription(seeded(), 0, '  Shot in **Corsica**.  ');
    expect(withText.tags[0].description).toBe('Shot in **Corsica**.');
    expect('description' in setTagDescription(withText, 0, '   ').tags[0]).toBe(false);
  });

  it('deleting a tag cascades to its references — the items stay, untagged from it', () => {
    const next = removeTag(seeded(), 0); // 'nature'
    expect(next.tags.map((tag) => tag.tag)).toEqual(['water']);
    expect(next.items.map((entry) => entry.tags)).toEqual([[], ['water'], []]);
    expect(next.items.map((entry) => entry.title)).toEqual(['tree', 'lake', 'paris']);
    expect(removeTag(seeded(), 9)).toEqual(seeded()); // unknown index → no-op
  });
});

describe('items', () => {
  it('adds, updates, removes and reorders items in the single flat list', () => {
    const added = addItem(seeded(), item('newYork', ['water']));
    expect(added.items.map((entry) => entry.title)).toEqual(['tree', 'lake', 'paris', 'newYork']);

    const updated = updateItem(added, 3, item('tokyo'));
    expect(updated.items[3]).toEqual(item('tokyo'));

    const moved = moveItemInList(updated, 3, -1);
    expect(moved.items.map((entry) => entry.title)).toEqual(['tree', 'lake', 'tokyo', 'paris']);
    // Out of bounds → no move.
    expect(moveItemInList(moved, 0, -1).items.map((entry) => entry.title)).toEqual(['tree', 'lake', 'tokyo', 'paris']);

    const removed = removeItem(moved, 0);
    expect(removed.items.map((entry) => entry.title)).toEqual(['lake', 'tokyo', 'paris']);
  });

  it('tags and untags an item, keeping the declared-tag order stable', () => {
    // 'paris' gains water then nature — stored in DECLARED order, not click order.
    const watered = setItemTagged(seeded(), 2, 'water', true);
    expect(watered.items[2].tags).toEqual(['water']);
    const both = setItemTagged(watered, 2, 'nature', true);
    expect(both.items[2].tags).toEqual(['nature', 'water']);

    const untagged = setItemTagged(both, 2, 'nature', false);
    expect(untagged.items[2].tags).toEqual(['water']);

    // Undeclared tag or no-op toggle → unchanged.
    expect(setItemTagged(seeded(), 2, 'ghost', true)).toEqual(seeded());
    expect(setItemTagged(seeded(), 0, 'nature', true)).toEqual(seeded());
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

  it('stores only frame deviations — flat, borderless and the default radius all collapse', () => {
    const framed = setItemCornerRadius(setItemBorderColor(setItemBorder(setItemElevation(seeded(), 8), true), '#123456'), 0);
    expect(framed.design).toEqual({ itemElevation: 8, itemBorder: true, itemBorderColor: '#123456', itemCornerRadius: 0 });

    // Turning the border off also drops its stored color…
    const noBorder = setItemBorder(framed, false);
    expect(noBorder.design).toEqual({ itemElevation: 8, itemCornerRadius: 0 });
    // …and returning every field to its default drops the design entirely.
    expect('design' in setItemCornerRadius(setItemElevation(noBorder, 0), 4)).toBe(false);
  });

  it('stores only layout deviations — default columns, ratio, fit and spacing collapse', () => {
    const laidOut = setItemSpacing(
      setItemFit(setItemAspectRatio(setItemColumns(seeded(), 5), '16:9'), 'contain'),
      'airy',
    );
    expect(laidOut.design).toEqual({
      itemColumns: 5,
      itemAspectRatio: '16:9',
      itemFit: 'contain',
      itemSpacing: 'airy',
    });
    const backToDefaults = setItemSpacing(
      setItemFit(setItemAspectRatio(setItemColumns(laidOut, 3), '4:3'), 'cover'),
      'normal',
    );
    expect('design' in backToDefaults).toBe(false);
  });

  it('stores the watermark styling only while there is text to draw', () => {
    const marked = setWatermark(seeded(), {
      text: '  © Studio  ',
      position: 'center',
      color: '#101010',
      opacity: 40,
    });
    expect(marked.design).toEqual({
      watermarkText: '© Studio',
      watermarkPosition: 'center',
      watermarkColor: '#101010',
      watermarkOpacity: 40,
    });
    // Default styling collapses, and clearing the text drops the whole block.
    expect(
      setWatermark(seeded(), { text: 'Studio', position: 'bottomRight', color: '#FFFFFF', opacity: 60 }).design,
    ).toEqual({ watermarkText: 'Studio' });
    expect('design' in setWatermark(marked, { text: '', position: 'center', color: '#101010', opacity: 40 })).toBe(false);
  });

  it('stores the per-item width cap (%) and clears it back to "no design" with undefined', () => {
    const capped = setItemMaxWidthPercent(seeded(), 60);
    expect(capped.design).toEqual({ itemMaxWidthPercent: 60 });
    // The cap combines with the other fields and clears independently.
    const both = setDisplayMode(capped, 'grid');
    expect(both.design).toEqual({ displayMode: 'grid', itemMaxWidthPercent: 60 });
    expect(setItemMaxWidthPercent(both, undefined).design).toEqual({ displayMode: 'grid' });
    expect('design' in setItemMaxWidthPercent(capped, undefined)).toBe(false);
  });
});
