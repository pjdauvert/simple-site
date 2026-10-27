import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import type { EventsConfig, SiteConfig } from '@simple-site/interfaces';
import { EventPageDesignEditor } from './EventPageDesignEditor';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateEvents } from '../../../services/eventsService';
import { renderWithProviders } from '../../../test/renderWithProviders';

vi.mock('../../../services/configVersionService', () => ({ loadDraftConfig: vi.fn() }));
vi.mock('../../../services/eventsService', () => ({ updateEvents: vi.fn() }));

const seededEvents: EventsConfig['events'] = [
  { slug: 'summer-festival', name: 'Summer Festival', startDateTime: '2027-06-18T15:00:00.000Z', location: 'Bordeaux' },
];

const draft = (events?: Partial<EventsConfig>): SiteConfig =>
  ({ site: { siteName: 'S' }, themes: [], pages: [], events }) as unknown as SiteConfig;

const renderEditor = async () => {
  const utils = renderWithProviders(<EventPageDesignEditor />, { theme: true, notifications: true });
  await act(async () => {});
  return utils;
};

/** Advances past the auto-save debounce and lets the chained write settle. */
const settle = async (ms = 900) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
  for (let flush = 0; flush < 5; flush += 1) {
    await act(async () => {});
  }
};

describe('EventPageDesignEditor (Event page design tab)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.mocked(loadDraftConfig).mockResolvedValue(draft({ events: seededEvents }));
    vi.mocked(updateEvents).mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it('offers every ratio with the A4 poster selected, and the background off', async () => {
    await renderEditor();
    expect(screen.getByRole('button', { name: /poster \(a4\)/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /wide \(16:9\)/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('checkbox', { name: /blurred full background/i })).not.toBeChecked();
    expect(screen.queryByTestId('event-preview-full-background')).not.toBeInTheDocument();
  });

  it('offers the two placements with the illustration above the description', async () => {
    await renderEditor();
    expect(screen.getByRole('button', { name: /above the description/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /beside the description/i })).toHaveAttribute('aria-pressed', 'false');
    // The cap is stated in the form, not left to be discovered on the page.
    expect(screen.getByText(/never takes more than half the screen/i)).toBeInTheDocument();
  });

  it('stores a placement deviation and drops it again on the way back', async () => {
    await renderEditor();

    fireEvent.click(screen.getByRole('button', { name: /beside the description/i }));
    await settle();
    expect(vi.mocked(updateEvents).mock.calls[0][0]).toEqual({
      events: seededEvents,
      design: { eventPage: { imagePlacement: 'beside' } },
    });

    fireEvent.click(screen.getByRole('button', { name: /above the description/i }));
    await settle();
    // Back to the default → nothing stored at all.
    expect(vi.mocked(updateEvents).mock.calls[1][0]).toEqual({ events: seededEvents });
  });

  it('mirrors the placement in the preview', async () => {
    await renderEditor();
    const layout = () => screen.getByTestId('event-preview-layout');
    expect(layout()).toHaveAttribute('data-image-placement', 'above');

    fireEvent.click(screen.getByRole('button', { name: /beside the description/i }));
    expect(layout()).toHaveAttribute('data-image-placement', 'beside');
  });

  it('writes nothing for a pristine tab', async () => {
    await renderEditor();
    await settle();
    expect(updateEvents).not.toHaveBeenCalled();
  });

  it('stores the full background as `true` only, keeping the other tabs’ fields', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      draft({ events: seededEvents, pastTitle: 'Archives', design: { agendaPage: { columns: 2 } } }),
    );
    await renderEditor();

    fireEvent.click(screen.getByRole('checkbox', { name: /blurred full background/i }));
    await settle();
    expect(updateEvents).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateEvents).mock.calls[0][0]).toEqual({
      events: seededEvents,
      pastTitle: 'Archives',
      design: { agendaPage: { columns: 2 }, eventPage: { fullBackgroundImage: true } },
    });
  });

  it('stores a ratio deviation and drops it again when the admin returns to A4', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(
      draft({ events: seededEvents, design: { eventPage: { imageAspectRatio: '1:1' } } }),
    );
    await renderEditor();
    expect(screen.getByRole('button', { name: /square \(1:1\)/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /poster \(a4\)/i }));
    await settle();
    expect(updateEvents).toHaveBeenCalledTimes(1);
    // Back to the default → nothing stored at all.
    expect(vi.mocked(updateEvents).mock.calls[0][0]).toEqual({ events: seededEvents });
  });

  it('paints the preview with the blurred background and the contrasted panel', async () => {
    await renderEditor();
    fireEvent.click(screen.getByRole('checkbox', { name: /blurred full background/i }));
    expect(screen.getByTestId('event-preview-full-background')).toBeInTheDocument();
  });

  it('highlights the preview element the focused field acts on', async () => {
    await renderEditor();
    const header = () => screen.getByTestId('event-preview-header-image');
    const canvas = () => screen.getByTestId('event-page-design-preview');
    expect(header()).not.toHaveAttribute('data-highlighted');

    fireEvent.focusIn(screen.getByRole('button', { name: /classic \(4:3\)/i }));
    expect(header()).toHaveAttribute('data-highlighted', 'true');
    expect(canvas()).not.toHaveAttribute('data-highlighted');

    // The placement acts on the arrangement of illustration and texts.
    fireEvent.focusIn(screen.getByRole('button', { name: /beside the description/i }));
    expect(screen.getByTestId('event-preview-layout')).toHaveAttribute('data-highlighted', 'true');
    expect(header()).not.toHaveAttribute('data-highlighted');

    // The background option acts on the whole page — ringed on or off.
    fireEvent.focusIn(screen.getByRole('checkbox', { name: /blurred full background/i }));
    expect(canvas()).toHaveAttribute('data-highlighted', 'true');
    expect(header()).not.toHaveAttribute('data-highlighted');
    expect(screen.getByTestId('event-preview-layout')).not.toHaveAttribute('data-highlighted');
  });

  it('mirrors the picked ratio in the preview', async () => {
    await renderEditor();
    fireEvent.click(screen.getByRole('button', { name: /wide \(16:9\)/i }));
    await settle();
    // The stored deviation is what the public page will read.
    expect(vi.mocked(updateEvents).mock.calls[0][0]).toEqual({
      events: seededEvents,
      design: { eventPage: { imageAspectRatio: '16:9' } },
    });
  });
});
