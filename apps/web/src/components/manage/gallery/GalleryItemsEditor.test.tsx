import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import type { SiteConfig, GalleryConfig } from '@simple-site/interfaces';
import { GalleryItemsEditor } from './GalleryItemsEditor';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateGallery } from '../../../services/galleryService';
import { mockFeatures } from '../../../test/featureFlags';
import { renderWithProviders } from '../../../test/renderWithProviders';

vi.mock('../../../services/configVersionService', () => ({ loadDraftConfig: vi.fn() }));
vi.mock('../../../services/galleryService', () => ({ updateGallery: vi.fn() }));
vi.mock('../../../services/mediaService', () => ({ listMedia: vi.fn().mockResolvedValue({ folders: [], files: [] }) }));
vi.mock('../../../hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));

const draft = (gallery?: GalleryConfig): SiteConfig =>
  ({ site: { siteName: 'S' }, themes: [], pages: [], gallery }) as unknown as SiteConfig;

const seeded: GalleryConfig = {
  items: [
    { imageUrl: '/a.jpg', title: 'Shot A', subtitle: 'Sub A', tags: [] },
    { imageUrl: '/n.jpg', title: 'Tree', tags: ['nature'] },
  ],
  tags: [{ tag: 'nature', displayName: 'Nature' }],
};

const renderEditor = () => renderWithProviders(<GalleryItemsEditor />, { notifications: true });

describe('GalleryItemsEditor (Items tab)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFeatures('gallery');
    vi.mocked(loadDraftConfig).mockResolvedValue(draft(seeded));
    vi.mocked(updateGallery).mockResolvedValue(undefined);
  });

  it('shows the draft as thumbnails and opens the attributes dialog from one', async () => {
    renderEditor();
    // Thumbnails are buttons named by their title; a tag row shows its route.
    const thumb = await screen.findByRole('button', { name: 'Shot A' });
    expect(screen.getByRole('button', { name: 'Tree' })).toBeInTheDocument();

    fireEvent.click(thumb);
    expect(await screen.findByLabelText(/^title/i)).toHaveValue('Shot A');
    expect(screen.getByLabelText(/subtitle/i)).toHaveValue('Sub A');
    // Editing an existing item offers removal (from the gallery, not the library).
    expect(screen.getByRole('button', { name: /remove item/i })).toBeInTheDocument();
  });

  it('adds an item through the dialog — it appears as a thumbnail, flagged while its image is missing', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(draft(undefined));
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add item/i }));
    fireEvent.change(await screen.findByLabelText(/^title/i), { target: { value: 'New shot' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    // The background stays aria-hidden until the dialog fully exits.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'New shot' })).toBeInTheDocument();
    expect(screen.getByText('Not displayed — image missing')).toBeInTheDocument();
  });

  it('tags an item from the dialog and saves over the fresh draft design', async () => {
    // The save-time re-read returns a draft whose Design tab set a grid mode.
    vi.mocked(loadDraftConfig)
      .mockResolvedValueOnce(draft(seeded))
      .mockResolvedValue(draft({ ...seeded, design: { displayMode: 'grid' } }));
    renderEditor();

    fireEvent.click(await screen.findByRole('button', { name: 'Shot A' }));
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /tags/i }));
    fireEvent.click(await screen.findByRole('option', { name: /Nature/ }));
    // A multi-select keeps its menu open — close it before reaching the actions.
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    // The background stays aria-hidden until the dialog fully exits.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({
      items: [
        { imageUrl: '/a.jpg', title: 'Shot A', subtitle: 'Sub A', tags: ['nature'] },
        { imageUrl: '/n.jpg', title: 'Tree', tags: ['nature'] },
      ],
      // Tags and design come from the fresh draft — owned by the other tabs.
      tags: [{ tag: 'nature', displayName: 'Nature' }],
      design: { displayMode: 'grid' },
    });
  });

  it('prunes references to a tag deleted on the Tags tab since this tab loaded', async () => {
    // The save-time re-read returns a draft whose tags were emptied meanwhile.
    vi.mocked(loadDraftConfig)
      .mockResolvedValueOnce(draft(seeded))
      .mockResolvedValue(draft({ ...seeded, tags: [] }));
    renderEditor();
    await screen.findByRole('button', { name: 'Shot A' });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    // The schema rejects dangling references — the save prunes them instead of failing.
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({
      items: [
        { imageUrl: '/a.jpg', title: 'Shot A', subtitle: 'Sub A', tags: [] },
        { imageUrl: '/n.jpg', title: 'Tree', tags: [] },
      ],
      tags: [],
    });
  });

  it('removes an item from its dialog', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: 'Shot A' }));
    fireEvent.click(await screen.findByRole('button', { name: /remove item/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Shot A' })).not.toBeInTheDocument());
  });

});
