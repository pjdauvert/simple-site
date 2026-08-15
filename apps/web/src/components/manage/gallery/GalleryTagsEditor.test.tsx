import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import type { SiteConfig, GalleryConfig } from '@simple-site/interfaces';
import { GalleryTagsEditor } from './GalleryTagsEditor';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateGallery } from '../../../services/galleryService';
import { renderWithProviders } from '../../../test/renderWithProviders';

vi.mock('../../../services/configVersionService', () => ({ loadDraftConfig: vi.fn() }));
vi.mock('../../../services/galleryService', () => ({ updateGallery: vi.fn() }));

const draft = (gallery?: GalleryConfig): SiteConfig =>
  ({ site: { siteName: 'S' }, themes: [], pages: [], gallery }) as unknown as SiteConfig;

const seeded: GalleryConfig = {
  items: [
    { imageUrl: '/a.jpg', title: 'Shot A', subtitle: 'Sub A', tags: [] },
    { imageUrl: '/n.jpg', title: 'Tree', tags: ['nature'] },
  ],
  tags: [{ tag: 'nature', displayName: 'Nature' }],
};

const renderEditor = () => renderWithProviders(<GalleryTagsEditor />, { notifications: true });

describe('GalleryTagsEditor (Tags tab)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadDraftConfig).mockResolvedValue(draft(seeded));
    vi.mocked(updateGallery).mockResolvedValue(undefined);
  });

  it('lists each tag with its route and item count', async () => {
    renderEditor();
    expect(await screen.findByText('/gallery/tag/nature')).toBeInTheDocument();
    expect(screen.getByText('Nature')).toBeInTheDocument();
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('declares a tag with a valid id, rejecting the invalid ones live', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add tag/i }));
    const idField = await screen.findByRole('textbox', { name: /identifier/i });

    // An accented id is off the charset — flagged, confirm disabled.
    fireEvent.change(idField, { target: { value: 'été' } });
    expect(screen.getByText(/only unaccented letters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();

    fireEvent.change(idField, { target: { value: 'summer-2026' } });
    fireEvent.change(screen.getByRole('textbox', { name: /display name/i }), { target: { value: 'Été 2026' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    expect(screen.getByText('/gallery/tag/summer-2026')).toBeInTheDocument();
    expect(screen.getByText('Été 2026')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save gallery/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    // The items ride along from the fresh draft — owned by the Items tab.
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({
      items: seeded.items,
      tags: [
        { tag: 'nature', displayName: 'Nature' },
        { tag: 'summer-2026', displayName: 'Été 2026' },
      ],
    });
  });

  it('saves a tag description typed under its row', async () => {
    renderEditor();
    fireEvent.change(await screen.findByLabelText(/description/i), {
      target: { value: 'Shot in **Corsica**.' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save gallery/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0].tags[0]).toEqual({
      tag: 'nature',
      displayName: 'Nature',
      description: 'Shot in **Corsica**.',
    });
  });

  it('deletes a tag — the cascade unTags the FRESH draft items at save time', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /delete tag/i }));
    expect(screen.queryByText('/gallery/tag/nature')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save gallery/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    // The items themselves stay (they belong to the Items tab), untagged from
    // the deleted tag even if they were re-tagged there after this tab loaded.
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({
      items: [
        { imageUrl: '/a.jpg', title: 'Shot A', subtitle: 'Sub A', tags: [] },
        { imageUrl: '/n.jpg', title: 'Tree', tags: [] },
      ],
      tags: [],
    });
  });
});
