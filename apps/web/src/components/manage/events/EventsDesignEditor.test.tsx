import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import type { EventsConfig, SiteConfig } from '@simple-site/interfaces';
import { EventsDesignEditor } from './EventsDesignEditor';
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

const renderEditor = () => renderWithProviders(<EventsDesignEditor />, { notifications: true });

describe('EventsDesignEditor (Design tab)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadDraftConfig).mockResolvedValue(draft({ events: seededEvents }));
    vi.mocked(updateEvents).mockResolvedValue(undefined);
  });

  it('hides the cut-off date outside the `from` mode and reveals it inside', async () => {
    renderEditor();
    await screen.findByRole('combobox', { name: /past events/i });
    expect(screen.queryByLabelText(/show past events from/i)).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /past events/i }));
    fireEvent.click(await screen.findByRole('option', { name: /show from a date/i }));
    expect(await screen.findByLabelText(/show past events from/i)).toBeInTheDocument();
  });

  it('saves texts and design deviations over the fresh draft events', async () => {
    // The save-time re-read returns a draft whose List tab added an event.
    const freshEvents = [
      ...seededEvents,
      { slug: 'winter-market', name: 'Winter Market', startDateTime: '2026-12-05T17:00:00.000Z', location: 'Douves' },
    ];
    vi.mocked(loadDraftConfig)
      .mockResolvedValueOnce(draft({ events: seededEvents }))
      .mockResolvedValue(draft({ events: freshEvents }));
    renderEditor();

    fireEvent.change(await screen.findByLabelText(/section title — upcoming events/i), { target: { value: ' Bientôt ' } });
    fireEvent.change(screen.getByLabelText(/section introduction \(markdown\) — past events/i), {
      target: { value: 'Nos *souvenirs*.' },
    });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /columns/i }));
    fireEvent.click(await screen.findByRole('option', { name: '2' }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(updateEvents).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateEvents).mock.calls[0][0]).toEqual({
      // The events come from the fresh draft — owned by the List tab.
      events: freshEvents,
      upcomingTitle: 'Bientôt',
      pastHeader: 'Nos *souvenirs*.',
      design: { agendaPage: { columns: 2 } },
    });
  });

  it('persists nothing for a pristine tab (no design block, no texts)', async () => {
    renderEditor();
    await screen.findByRole('combobox', { name: /past events/i });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(updateEvents).toHaveBeenCalledTimes(1));
    expect(vi.mocked(updateEvents).mock.calls[0][0]).toEqual({ events: seededEvents });
  });
});
