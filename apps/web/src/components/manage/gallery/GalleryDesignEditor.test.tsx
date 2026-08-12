import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { IntlProvider } from 'react-intl';
import type { SiteConfig, GalleryConfig } from '@simple-site/interfaces';
import messages from '../../../features/i18n/i18n.json';
import { NotificationsProvider } from '../../../features/notifications/NotificationsProvider';
import { GalleryDesignEditor } from './GalleryDesignEditor';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateGallery } from '../../../services/galleryService';

vi.mock('../../../services/configVersionService', () => ({ loadDraftConfig: vi.fn() }));
vi.mock('../../../services/galleryService', () => ({ updateGallery: vi.fn() }));

const draft = (gallery?: GalleryConfig): SiteConfig =>
  ({ site: { siteName: 'S' }, themes: [], pages: [], gallery }) as unknown as SiteConfig;

const seeded: GalleryConfig = {
  items: [{ imageUrl: '/a.jpg', title: 'Shot A' }],
  themes: [],
};

function renderEditor() {
  return render(
    <IntlProvider locale="en" messages={messages.en as Record<string, string>}>
      <NotificationsProvider>
        <GalleryDesignEditor />
      </NotificationsProvider>
    </IntlProvider>,
  );
}

describe('GalleryDesignEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadDraftConfig).mockResolvedValue(draft(seeded));
    vi.mocked(updateGallery).mockResolvedValue(undefined);
  });

  it('saves a picked display mode over the fresh draft items (never clobbered)', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /grid/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save gallery/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({
      items: seeded.items,
      themes: [],
      design: { displayMode: 'grid' },
    });
  });

  it('stores all-default settings as no design at all', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      draft({ ...seeded, design: { captionPosition: 'left', displayMode: 'grid' } }),
    );
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /list/i }));
    fireEvent.click(screen.getByRole('button', { name: /below/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save gallery/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({ items: seeded.items, themes: [] });
  });

  it('shows the symbolic skeleton preview matching the picked mode', async () => {
    renderEditor();
    // Default design → list preview; picking a mode swaps the skeleton live.
    expect(await screen.findByTestId('gallery-preview-list')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /mosaic/i }));
    expect(screen.getByTestId('gallery-preview-mosaic')).toBeInTheDocument();
    expect(screen.queryByTestId('gallery-preview-list')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /alternating/i }));
    expect(screen.getByTestId('gallery-preview-alternate')).toBeInTheDocument();
  });

  it('saves the mosaic mode and hints that side captions collapse there', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(draft({ ...seeded, design: { captionPosition: 'left' } }));
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /mosaic/i }));
    expect(
      screen.getByText(/side captions fall back above\/below the image/i),
    ).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save gallery/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({
      items: seeded.items,
      themes: [],
      design: { captionPosition: 'left', displayMode: 'mosaic' },
    });
  });

  it('disables the caption position while the alternating mode places it itself', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /alternating/i }));
    expect(screen.getByRole('button', { name: /above/i })).toBeDisabled();
    expect(screen.getByText('The alternating display places the caption beside the image automatically.')).toBeInTheDocument();
    // Back to a mode where the caption applies again.
    fireEvent.click(screen.getByRole('button', { name: /^list$/i }));
    expect(screen.getByRole('button', { name: /above/i })).not.toBeDisabled();
  });
});
