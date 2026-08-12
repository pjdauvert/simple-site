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

  it('saves the mosaic mode, keeping the stored caption setting for a later return to list', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(draft({ ...seeded, design: { captionPosition: 'left' } }));
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /mosaic/i }));
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

  it('enables the caption position for the list mode only, with per-mode hints', async () => {
    renderEditor();
    expect(await screen.findByRole('button', { name: /above/i })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /grid/i }));
    expect(screen.getByRole('button', { name: /above/i })).toBeDisabled();
    expect(screen.getByText('In grid mode the caption always sits below the image.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mosaic/i }));
    expect(screen.getByRole('button', { name: /above/i })).toBeDisabled();
    expect(screen.getByText('Mosaic tiles show no caption — the title and subtitle appear in the zoom view.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /alternating/i }));
    expect(screen.getByRole('button', { name: /above/i })).toBeDisabled();
    expect(screen.getByText('The alternating display places the caption beside the image automatically.')).toBeInTheDocument();

    // Back to the one mode where the caption applies.
    fireEvent.click(screen.getByRole('button', { name: /^list$/i }));
    expect(screen.getByRole('button', { name: /above/i })).not.toBeDisabled();
  });
});
