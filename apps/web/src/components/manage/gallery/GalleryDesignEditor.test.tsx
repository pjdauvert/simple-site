import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import type { SiteConfig, GalleryConfig } from '@simple-site/interfaces';
import { GalleryDesignEditor } from './GalleryDesignEditor';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateGallery } from '../../../services/galleryService';
import { renderWithProviders } from '../../../test/renderWithProviders';

vi.mock('../../../services/configVersionService', () => ({ loadDraftConfig: vi.fn() }));
vi.mock('../../../services/galleryService', () => ({ updateGallery: vi.fn() }));

const draft = (gallery?: GalleryConfig): SiteConfig =>
  ({ site: { siteName: 'S' }, themes: [], pages: [], gallery }) as unknown as SiteConfig;

const seeded: GalleryConfig = {
  items: [{ imageUrl: '/a.jpg', title: 'Shot A', tags: [] }],
  tags: [],
};

const renderEditor = () => renderWithProviders(<GalleryDesignEditor />, { notifications: true });

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
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({
      items: seeded.items,
      tags: [],
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
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({ items: seeded.items, tags: [] });
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
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({
      items: seeded.items,
      tags: [],
      design: { captionPosition: 'left', displayMode: 'mosaic' },
    });
  });

  it('saves the per-item width cap (%) typed in the width field', async () => {
    renderEditor();
    fireEvent.change(await screen.findByRole('spinbutton', { name: /maximum item width/i }), {
      target: { value: '60' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({
      items: seeded.items,
      tags: [],
      design: { itemMaxWidthPercent: 60 },
    });
  });

  it('flags an out-of-range width and blocks the save', async () => {
    renderEditor();
    fireEvent.change(await screen.findByRole('spinbutton', { name: /maximum item width/i }), {
      target: { value: '5' },
    });
    expect(screen.getByText('Enter a value between 10 and 100 %.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    // Emptying the field returns to "no cap" and unblocks the save.
    fireEvent.change(screen.getByRole('spinbutton', { name: /maximum item width/i }), { target: { value: '' } });
    expect(screen.getByRole('button', { name: /^save$/i })).not.toBeDisabled();
  });

  it('saves the frame options — elevation and radius sliders, border switch and its color', async () => {
    renderEditor();
    // The elevation slider only offers the platform's shadow steps
    // (0/1/2/4/8/16/24). A marks-only MUI slider moves ONE mark per change
    // event (and jumps straight to the last mark for any value beyond it), so
    // nudge just above the current value four times: 0 → 1 → 2 → 4 → 8.
    const elevation = await screen.findByRole('slider', { name: /elevation/i });
    for (let step = 0; step < 4; step += 1) {
      fireEvent.change(elevation, { target: { value: Number((elevation as HTMLInputElement).value) + 1 } });
    }
    expect(elevation).toHaveValue('8');

    fireEvent.change(screen.getByRole('slider', { name: /corner radius/i }), { target: { value: 0 } });
    // The color field only appears once the border is on.
    expect(screen.queryByLabelText(/border color/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /^border$/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /border color/i }), { target: { value: '#123456' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({
      items: seeded.items,
      tags: [],
      design: { itemElevation: 8, itemBorder: true, itemBorderColor: '#123456', itemCornerRadius: 0 },
    });
  });

  it('shows only the options applicable to the selected display mode (hidden, not disabled)', async () => {
    renderEditor();
    // list: caption toggles + position, but no columns and no tile ratio.
    expect(await screen.findByRole('button', { name: /above/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /show titles/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '5' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '16:9' })).not.toBeInTheDocument();

    // grid: columns and ratio appear, the caption position disappears entirely
    // (grid always captions below) — the show/hide toggles stay.
    fireEvent.click(screen.getByRole('button', { name: /grid/i }));
    expect(screen.queryByRole('button', { name: /above/i })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /show titles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '16:9' })).toBeInTheDocument();

    // mosaic: columns stay, the ratio (grid-only) goes — and the caption
    // toggles vanish too: a mosaic never captions.
    fireEvent.click(screen.getByRole('button', { name: /mosaic/i }));
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '16:9' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /show titles/i })).not.toBeInTheDocument();

    // alternate: caption toggles but no position, columns or ratio.
    fireEvent.click(screen.getByRole('button', { name: /alternating/i }));
    expect(screen.queryByRole('button', { name: /above/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '5' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /show titles/i })).toBeInTheDocument();

    // Back to list — the hidden option resurfaces with its stored value intact.
    fireEvent.click(screen.getByRole('button', { name: /^list$/i }));
    expect(screen.getByRole('button', { name: /above/i })).toBeInTheDocument();
  });

  it('hides titles and subtitles independently, hiding the position once nothing shows', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('checkbox', { name: /show subtitles/i }));
    // One caption still shows → the position keeps applying.
    expect(screen.getByRole('button', { name: /above/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /show titles/i }));
    // Nothing left to position — the option hides (never disabled).
    expect(screen.queryByRole('button', { name: /above/i })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(updateGallery).toHaveBeenCalledTimes(1));
    // Only the hidden states are stored — shown is the default.
    expect(vi.mocked(updateGallery).mock.calls[0][0]).toEqual({
      items: seeded.items,
      tags: [],
      design: { itemShowTitle: false, itemShowSubtitle: false },
    });
  });

  it('toggles the preview orientation without hiding any design option', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /grid/i }));
    expect(screen.getByTestId('gallery-preview-grid')).toHaveAttribute('data-orientation', 'landscape');

    fireEvent.click(screen.getByRole('button', { name: /portrait/i }));
    expect(screen.getByTestId('gallery-preview-grid')).toHaveAttribute('data-orientation', 'portrait');
    // Orientation is the visitor's context, not a design choice: the same
    // parameters stay visible and editable (columns included, even though a
    // portrait phone collapses to one column).
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /maximum item width/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /landscape/i }));
    expect(screen.getByTestId('gallery-preview-grid')).toHaveAttribute('data-orientation', 'landscape');
  });
});
