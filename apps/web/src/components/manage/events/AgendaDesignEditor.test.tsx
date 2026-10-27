import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import type { EventsConfig, SiteConfig } from '@simple-site/interfaces';
import { AgendaDesignEditor } from './AgendaDesignEditor';
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

/** Mounts the editor and lets the draft load settle. */
const renderEditor = async () => {
  const utils = renderWithProviders(<AgendaDesignEditor />, { theme: true, notifications: true });
  await act(async () => {});
  return utils;
};

/**
 * Advances past the auto-save debounce and lets the write settle. The save
 * chains a fresh draft read and the PUT, so the microtask queue is flushed a
 * few times over. `waitFor` is deliberately absent: it does not drive Vitest's
 * fake clock (it only detects Jest's), so it would simply time out here.
 */
const settle = async (ms = 900) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
  for (let flush = 0; flush < 5; flush += 1) {
    await act(async () => {});
  }
};

describe('AgendaDesignEditor (Agenda design tab)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.mocked(loadDraftConfig).mockResolvedValue(draft({ events: seededEvents }));
    vi.mocked(updateEvents).mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it('hides the cut-off date outside the `from` mode and reveals it inside', async () => {
    await renderEditor();
    expect(screen.queryByLabelText(/show past events from/i)).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /past events/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: /show from a date/i }));
    });
    expect(screen.getByLabelText(/show past events from/i)).toBeInTheDocument();
  });

  it('writes nothing until something changes — a pristine tab persists nothing', async () => {
    await renderEditor();
    await settle();
    expect(updateEvents).not.toHaveBeenCalled();
    // Nothing to report while nothing happened.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('auto-saves a settled change as a deviation, over the freshest draft events', async () => {
    // The save-time re-read returns a draft whose List tab added an event, and
    // whose Event page design tab stored its own slice.
    const freshEvents = [
      ...seededEvents,
      { slug: 'winter-market', name: 'Winter Market', startDateTime: '2026-12-05T17:00:00.000Z', location: 'Douves' },
    ];
    vi.mocked(loadDraftConfig)
      .mockResolvedValueOnce(draft({ events: seededEvents }))
      .mockResolvedValue(draft({ events: freshEvents, design: { eventPage: { fullBackgroundImage: true } } }));
    await renderEditor();

    fireEvent.change(screen.getByLabelText(/section title — upcoming events/i), { target: { value: ' Bientôt ' } });
    fireEvent.change(screen.getByLabelText(/section introduction \(markdown\) — past events/i), {
      target: { value: 'Nos *souvenirs*.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '2' })); // 2 columns

    await settle();
    expect(updateEvents).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateEvents).mock.calls[0][0]).toEqual({
      // The events come from the fresh draft — owned by the List tab…
      events: freshEvents,
      upcomingTitle: 'Bientôt',
      pastHeader: 'Nos *souvenirs*.',
      // …and the other design tab's slice survives untouched.
      design: { agendaPage: { columns: 2 }, eventPage: { fullBackgroundImage: true } },
    });
    expect(screen.getByText(/saved to draft/i)).toBeInTheDocument(); // reported as a toast
  });

  it('stores only `false` for a toggle turned off, and nothing for the defaults', async () => {
    await renderEditor();
    fireEvent.click(screen.getByRole('checkbox', { name: /show the location on cards/i }));
    await settle();
    expect(updateEvents).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateEvents).mock.calls[0][0]).toEqual({
      events: seededEvents,
      design: { agendaPage: { showLocationOnCards: false } },
    });
  });

  it('reports a failed write instead of losing it silently', async () => {
    vi.mocked(updateEvents).mockRejectedValue(new Error('offline'));
    await renderEditor();
    fireEvent.click(screen.getByRole('button', { name: '4' })); // 4 columns
    await settle();
    expect(screen.getByText(/could not save: offline/i)).toBeInTheDocument();
  });

  it('highlights the preview element the focused field acts on', async () => {
    await renderEditor();
    const cardImages = () => screen.getAllByTestId('agenda-preview-card-image');
    expect(cardImages()[0]).not.toHaveAttribute('data-highlighted');

    // The card ratio acts on the card illustrations…
    fireEvent.focusIn(screen.getByRole('button', { name: /poster \(a4\)/i }));
    expect(cardImages()[0]).toHaveAttribute('data-highlighted', 'true');
    expect(screen.getByTestId('agenda-preview-featured')).not.toHaveAttribute('data-highlighted');

    // …the backdrop toggle on the featured block, and the ring MOVES.
    fireEvent.focusIn(screen.getByRole('checkbox', { name: /blurred backdrop/i }));
    expect(screen.getByTestId('agenda-preview-featured')).toHaveAttribute('data-highlighted', 'true');
    expect(cardImages()[0]).not.toHaveAttribute('data-highlighted');

    // The section texts ring their own section's bars.
    fireEvent.focusIn(screen.getByLabelText(/section title — past events/i));
    expect(screen.getByTestId('agenda-preview-pastText')).toHaveAttribute('data-highlighted', 'true');
  });

  it('mirrors the design in the preview: columns, card ratio, and the past section disappearing', async () => {
    await renderEditor();
    const grid = () => screen.getByTestId('agenda-preview-grid-upcoming');
    expect(grid().childElementCount).toBe(3); // the default column count
    expect(screen.getAllByTestId('agenda-preview-card-location').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(grid().childElementCount).toBe(2);

    // Hiding the location removes the line from every card.
    fireEvent.click(screen.getByRole('checkbox', { name: /show the location on cards/i }));
    expect(screen.queryByTestId('agenda-preview-card-location')).not.toBeInTheDocument();

    // Hiding past events removes the whole section.
    expect(screen.getByTestId('agenda-preview-past')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /past events/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: /hide all/i }));
    });
    expect(screen.queryByTestId('agenda-preview-past')).not.toBeInTheDocument();
  });

  it('flushes a pending edit when the admin leaves the tab', async () => {
    const { unmount } = await renderEditor();
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    expect(updateEvents).not.toHaveBeenCalled();

    await act(async () => {
      unmount();
    });
    await settle();
    expect(updateEvents).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateEvents).mock.calls[0][0]).toMatchObject({
      design: { agendaPage: { columns: 4 } },
    });
  });
  it('stores the search page’s first day of the week, and drops it back on Monday', async () => {
    await renderEditor();
    expect(screen.getByRole('button', { name: /^monday$/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /^sunday$/i }));
    await settle();
    expect(vi.mocked(updateEvents).mock.calls[0][0]).toMatchObject({
      design: { agendaPage: { weekStartsOn: 'sunday' } },
    });

    fireEvent.click(screen.getByRole('button', { name: /^monday$/i }));
    await settle();
    // Back to the default → the deviation disappears from the payload.
    expect(vi.mocked(updateEvents).mock.calls[1][0]).not.toHaveProperty('design.agendaPage.weekStartsOn');
  });

  // Parity with the gallery/team editors: an editor that cannot load, or
  // cannot save, has to SAY so. Neither path had a test, so an editor that
  // silently showed an empty form on a failed draft read would have been green.
  describe('error paths', () => {
    it('shows the failure instead of an empty form when the draft cannot be read', async () => {
      vi.mocked(loadDraftConfig).mockRejectedValue(new Error('Draft unavailable'));
      await renderEditor();

      expect(screen.getByRole('alert')).toHaveTextContent('Draft unavailable');
      expect(updateEvents).not.toHaveBeenCalled();
    });

    it('falls back to the bundled message when the rejection carries none', async () => {
      vi.mocked(loadDraftConfig).mockRejectedValue('nope');
      await renderEditor();
      expect(screen.getByRole('alert')).toHaveTextContent('Could not load the events.');
    });

    it('reports a failed save through the admin notifications', async () => {
      await renderEditor();
      vi.mocked(updateEvents).mockRejectedValue(new Error('Server refused the events block'));

      fireEvent.click(screen.getByRole('button', { name: /^sunday$/i }));
      await settle();

      expect(updateEvents).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Could not save: Server refused the events block/)).toBeInTheDocument();
    });
  });
});
