import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import type { SiteConfig, GalleryConfig } from '@simple-site/interfaces';
import messages from '../../../features/i18n/i18n.json';
import { NotificationsProvider } from '../../../features/notifications/NotificationsProvider';
import { GalleryItemsEditor } from './GalleryItemsEditor';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateGallery } from '../../../services/galleryService';

vi.mock('../../../services/configVersionService', () => ({ loadDraftConfig: vi.fn() }));
vi.mock('../../../services/galleryService', () => ({ updateGallery: vi.fn() }));
vi.mock('../../../services/mediaService', () => ({ listMedia: vi.fn().mockResolvedValue({ folders: [], files: [] }) }));
vi.mock('../../../hooks/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn(() => ({ media: false, team: false, contact: false, gallery: true })),
  ALL_DISABLED: { media: false, team: false, contact: false, gallery: false },
}));

const draft = (gallery?: GalleryConfig): SiteConfig =>
  ({ site: { siteName: 'S' }, themes: [], pages: [], gallery }) as unknown as SiteConfig;

const seeded: GalleryConfig = {
  items: [
    { imageUrl: '/a.jpg', title: 'Shot A', subtitle: 'Sub A', tags: [] },
    { imageUrl: '/n.jpg', title: 'Tree', tags: ['nature'] },
  ],
  tags: [{ tag: 'nature', displayName: 'Nature' }],
};

function renderEditor() {
  return render(
    <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
      <NotificationsProvider>
        <GalleryItemsEditor />
      </NotificationsProvider>
    </IntlProvider>,
  );
}

describe('GalleryItemsEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadDraftConfig).mockResolvedValue(draft(seeded));
    vi.mocked(updateGallery).mockResolvedValue(undefined);
  });

  it('shows the draft as thumbnails and opens the attributes dialog from one', async () => {
    renderEditor();
    // Thumbnails are buttons named by their title; a tag row shows its route.
    const thumb = await screen.findByRole('button', { name: 'Shot A' });
    expect(screen.getByRole('button', { name: 'Tree' })).toBeInTheDocument();
    expect(screen.getByText('/gallery/tag/nature')).toBeInTheDocument();

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
      fireEvent.click(screen.getByRole('button', { name: /save gallery/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({
      items: [
        { imageUrl: '/a.jpg', title: 'Shot A', subtitle: 'Sub A', tags: ['nature'] },
        { imageUrl: '/n.jpg', title: 'Tree', tags: ['nature'] },
      ],
      tags: [{ tag: 'nature', displayName: 'Nature' }],
      design: { displayMode: 'grid' }, // merged from the fresh draft, never clobbered
    });
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
    expect(vi.mocked(updateGallery).mock.calls[0][0].tags).toEqual([
      { tag: 'nature', displayName: 'Nature' },
      { tag: 'summer-2026', displayName: 'Été 2026' },
    ]);
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

  it('removes an item from its dialog', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: 'Shot A' }));
    fireEvent.click(await screen.findByRole('button', { name: /remove item/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Shot A' })).not.toBeInTheDocument());
  });

  it('deletes a tag — its references go with it, the items stay', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /delete tag/i }));
    expect(screen.queryByText('/gallery/tag/nature')).not.toBeInTheDocument();
    // The item survives, untagged.
    expect(screen.getByRole('button', { name: 'Tree' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save gallery/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toMatchObject({
      items: [
        { title: 'Shot A', tags: [] },
        { title: 'Tree', tags: [] },
      ],
      tags: [],
    });
  });
});
