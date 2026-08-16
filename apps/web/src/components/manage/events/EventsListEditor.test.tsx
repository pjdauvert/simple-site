import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import type { EventsConfig, SiteConfig } from '@simple-site/interfaces';
import { EventsListEditor } from './EventsListEditor';
import { loadDraftConfig } from '../../../services/configVersionService';
import { updateEvents } from '../../../services/eventsService';
import { mockFeatures } from '../../../test/featureFlags';
import { renderWithProviders } from '../../../test/renderWithProviders';

vi.mock('../../../services/configVersionService', () => ({ loadDraftConfig: vi.fn() }));
vi.mock('../../../services/eventsService', () => ({ updateEvents: vi.fn() }));
vi.mock('../../../services/mediaService', () => ({ listMedia: vi.fn().mockResolvedValue({ folders: [], files: [] }) }));
vi.mock('../../../hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));

const draft = (events?: Partial<EventsConfig>): SiteConfig =>
  ({ site: { siteName: 'S' }, themes: [], pages: [], events }) as unknown as SiteConfig;

const seeded: Partial<EventsConfig> = {
  events: [
    {
      slug: 'spring-regatta',
      name: 'Spring Regatta',
      startDateTime: '2025-05-10T08:00:00.000Z',
      location: 'Quai des Chartrons',
    },
    {
      slug: 'summer-festival',
      name: 'Summer Festival',
      startDateTime: '2027-06-18T15:00:00.000Z',
      endDateTime: '2027-06-20T20:00:00.000Z',
      location: 'Place de la Bourse',
    },
  ],
  nextTitle: 'Prochainement',
};

// The dialog embeds router-dependent pieces (media picker, translate shortcut).
const renderEditor = () =>
  renderWithProviders(<EventsListEditor />, { notifications: true, route: '/manage/events/list' });

describe('EventsListEditor (List tab)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFeatures('events', 'media');
    vi.mocked(loadDraftConfig).mockResolvedValue(draft(seeded));
    vi.mocked(updateEvents).mockResolvedValue(undefined);
  });

  it('lists the draft events sorted by start date descending, flagging past ones', async () => {
    renderEditor();
    const rows = await screen.findAllByRole('button', { name: /Regatta|Festival/ });
    expect(rows[0]).toHaveTextContent('Summer Festival');
    expect(rows[1]).toHaveTextContent('Spring Regatta');
    expect(rows[1]).toHaveTextContent('Past');
    expect(rows[0]).not.toHaveTextContent('Past');
  });

  it('locks the slug of a persisted event in its dialog', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /Summer Festival/ }));
    const slugField = await screen.findByLabelText(/slug/i);
    expect(slugField).toHaveValue('summer-festival');
    expect(slugField).toBeDisabled();
  });

  it('adds an event through the dialog and saves it over the fresh draft texts', async () => {
    // The save-time re-read returns a draft whose Design tab set a title.
    vi.mocked(loadDraftConfig)
      .mockResolvedValueOnce(draft(seeded))
      .mockResolvedValue(draft({ ...seeded, pastTitle: 'Archives' }));
    renderEditor();

    fireEvent.click(await screen.findByRole('button', { name: /add an event/i }));
    fireEvent.change(await screen.findByLabelText(/name/i), { target: { value: 'Winter Market' } });
    fireEvent.change(screen.getByLabelText(/starts/i), { target: { value: '2026-12-05T18:00' } });
    fireEvent.change(screen.getByLabelText(/location/i), { target: { value: 'Halle des Douves' } });
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(updateEvents).toHaveBeenCalledTimes(1));

    const saved = vi.mocked(updateEvents).mock.calls[0][0] as EventsConfig;
    // The slug derived from the name; the local input became a UTC instant.
    const added = saved.events.find((e) => e.slug === 'winter-market');
    expect(added).toMatchObject({
      name: 'Winter Market',
      location: 'Halle des Douves',
      startDateTime: new Date(2026, 11, 5, 18, 0).toISOString(),
    });
    // Stored order follows the editor's descending sort.
    expect(saved.events.map((e) => e.slug)).toEqual(['summer-festival', 'winter-market', 'spring-regatta']);
    // Texts/design come from the fresh draft — owned by the Design tab.
    expect(saved.pastTitle).toBe('Archives');
    expect(saved.nextTitle).toBe('Prochainement');
  });

  it('refuses to save an incomplete event and keeps the endpoint untouched', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /add an event/i }));
    fireEvent.change(await screen.findByLabelText(/name/i), { target: { value: 'No date yet' } });
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    expect(updateEvents).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/incomplete or invalid/i)).not.toHaveLength(0);
  });

  it('deletes an event after confirmation', async () => {
    renderEditor();
    await screen.findByRole('button', { name: /Summer Festival/ });
    fireEvent.click(screen.getAllByRole('button', { name: /delete event/i })[0]);
    fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
    // The background stays aria-hidden until the confirm dialog fully exits.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Summer Festival')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    });
    await waitFor(() => expect(updateEvents).toHaveBeenCalledTimes(1));
    const saved = vi.mocked(updateEvents).mock.calls[0][0] as EventsConfig;
    expect(saved.events.map((e) => e.slug)).toEqual(['spring-regatta']);
  });
});
