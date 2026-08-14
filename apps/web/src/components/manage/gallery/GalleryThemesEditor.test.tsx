import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import type { SiteConfig, GalleryConfig } from '@simple-site/interfaces';
import messages from '../../../features/i18n/i18n.json';
import { NotificationsProvider } from '../../../features/notifications/NotificationsProvider';
import { GalleryThemesEditor } from './GalleryThemesEditor';
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
  items: [{ imageUrl: '/a.jpg', title: 'Shot A', subtitle: 'Sub A' }],
  themes: [{ themeId: 'nature', title: 'Nature', items: [{ imageUrl: '/n.jpg', title: 'Tree' }] }],
};

function renderEditor() {
  return render(
    <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
      <NotificationsProvider>
        <GalleryThemesEditor />
      </NotificationsProvider>
    </IntlProvider>,
  );
}

describe('GalleryThemesEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadDraftConfig).mockResolvedValue(draft(seeded));
    vi.mocked(updateGallery).mockResolvedValue(undefined);
  });

  it('shows the draft as thumbnails and opens the attributes dialog from a thumbnail', async () => {
    renderEditor();
    // Thumbnails are buttons named by their title; the theme header shows its route.
    const thumb = await screen.findByRole('button', { name: 'Shot A' });
    expect(screen.getByRole('button', { name: 'Tree' })).toBeInTheDocument();
    expect(screen.getByText('/gallery/nature')).toBeInTheDocument();

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

  it('moves an item to a theme from the dialog and saves over the fresh draft design', async () => {
    // The save-time re-read returns a draft whose Design tab set a grid mode.
    vi.mocked(loadDraftConfig)
      .mockResolvedValueOnce(draft(seeded))
      .mockResolvedValue(draft({ ...seeded, design: { displayMode: 'grid' } }));
    renderEditor();

    fireEvent.click(await screen.findByRole('button', { name: 'Shot A' }));
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /theme/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Nature' }));
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    // The background stays aria-hidden until the dialog fully exits.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save gallery/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({
      items: [],
      themes: [
        {
          themeId: 'nature',
          title: 'Nature',
          items: [
            { imageUrl: '/n.jpg', title: 'Tree' },
            { imageUrl: '/a.jpg', title: 'Shot A', subtitle: 'Sub A' },
          ],
        },
      ],
      design: { displayMode: 'grid' }, // merged from the fresh draft, never clobbered
    });
  });

  it('marks a themed item as its theme cover from the dialog, badging the thumbnail', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: 'Tree' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /use as the theme's cover/i }));
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Cover')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save gallery/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0].themes[0]).toMatchObject({ coverIndex: 0 });
  });

  it('saves a theme introduction typed under its header', async () => {
    renderEditor();
    fireEvent.change(await screen.findByLabelText(/theme introduction/i), {
      target: { value: 'Shot in **Corsica**.' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save gallery/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0].themes[0]).toMatchObject({
      presentation: 'Shot in **Corsica**.',
    });
  });

  it('removes an item from its dialog', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: 'Shot A' }));
    fireEvent.click(await screen.findByRole('button', { name: /remove item/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Shot A' })).not.toBeInTheDocument());
  });

  it('deletes a theme, returning its items to the unthemed list', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /delete theme/i }));
    expect(screen.queryByText('/gallery/nature')).not.toBeInTheDocument();
    // Its item survives at the root.
    expect(screen.getByRole('button', { name: 'Tree' })).toBeInTheDocument();
  });
});
