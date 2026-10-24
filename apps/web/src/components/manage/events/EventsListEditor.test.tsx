import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act, waitFor, within } from '@testing-library/react';
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

/** Relative instants — fixed dates would rot into the past and flip the Past chip. */
const inDays = (days: number, hour = 15): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const seeded: Partial<EventsConfig> = {
  events: [
    {
      slug: 'spring-regatta',
      name: 'Spring Regatta',
      startDateTime: inDays(-400, 8),
      location: 'Quai des Chartrons',
      description: 'La **Régate** de printemps, [détails](https://example.test/r).',
    },
    {
      slug: 'summer-festival',
      name: 'Summer Festival',
      startDateTime: inDays(300),
      endDateTime: inDays(302),
      location: 'Place de la Bourse',
    },
    {
      slug: 'ete-musical',
      name: 'Été Musical',
      startDateTime: inDays(100),
      location: 'Jardin Public',
    },
  ],
  upcomingTitle: 'Bientôt',
};

/** An event the shared validator refuses (no location) — a save must wait for it. */
const incomplete: Partial<EventsConfig> = {
  events: [
    { slug: 'summer-festival', name: 'Summer Festival', startDateTime: inDays(300), location: 'Place de la Bourse' },
    { slug: 'draft-event', name: 'Draft Event', startDateTime: inDays(10), location: '' },
  ],
};

// The dialog embeds router-dependent pieces (media picker, translate shortcut).
const renderEditor = () =>
  renderWithProviders(<EventsListEditor />, { notifications: true, route: '/manage/events/list' });

/** The event rows, in the order the editor paints them. */
const rowNames = (): string[] =>
  screen
    .getAllByRole('button', { name: /Regatta|Festival|Musical|Event/ })
    .map((row) => row.querySelector('.MuiListItemText-primary')?.textContent ?? '');

/** The delete button of one row, found through the row itself (order-proof). */
const deleteButtonOf = (name: RegExp): HTMLElement => {
  const item = screen.getByRole('button', { name }).closest('li');
  return within(item as HTMLElement).getByRole('button', { name: /delete event/i });
};

/** Lets the auto-save debounce elapse without anything being written. */
const waitOutTheDebounce = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
  });
};

const sortBy = (option: RegExp): void => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: /sort by/i }));
  fireEvent.click(screen.getByRole('option', { name: option }));
};

const search = (text: string): void => {
  fireEvent.change(screen.getByLabelText(/^search$/i), { target: { value: text } });
};

describe('EventsListEditor (List tab)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFeatures('events', 'media');
    vi.mocked(loadDraftConfig).mockResolvedValue(draft(seeded));
    vi.mocked(updateEvents).mockResolvedValue(undefined);
  });

  it('lists the draft events by start date descending, flagging past ones', async () => {
    renderEditor();
    await screen.findByRole('button', { name: /Summer Festival/ });
    expect(rowNames()).toEqual(['Summer Festival', 'Été Musical', 'Spring Regatta']);
    expect(screen.getByRole('button', { name: /Spring Regatta/ })).toHaveTextContent('Past');
    expect(screen.getByRole('button', { name: /Summer Festival/ })).not.toHaveTextContent('Past');
  });

  it('owns no save button — the draft is written on its own', async () => {
    renderEditor();
    await screen.findByRole('button', { name: /Summer Festival/ });
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
  });

  it('auto-saves a deletion over the freshest draft, in the stored order', async () => {
    // The save-time re-read returns a draft whose Design tab set a title.
    vi.mocked(loadDraftConfig)
      .mockResolvedValueOnce(draft(seeded))
      .mockResolvedValue(draft({ ...seeded, pastTitle: 'Archives' }));
    renderEditor();
    await screen.findByRole('button', { name: /Été Musical/ });

    fireEvent.click(deleteButtonOf(/Été Musical/));
    fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await waitFor(() => expect(updateEvents).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const saved = vi.mocked(updateEvents).mock.calls[0][0] as EventsConfig;
    expect(saved.events.map((e) => e.slug)).toEqual(['summer-festival', 'spring-regatta']);
    // Texts/design come from the fresh draft — owned by the Design tab.
    expect(saved.pastTitle).toBe('Archives');
    expect(saved.upcomingTitle).toBe('Bientôt');
    expect(await screen.findByText(/saved to draft/i)).toBeInTheDocument();
  });

  it('never writes a list holding an incomplete event, and says so', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(draft(incomplete));
    renderEditor();
    await screen.findByRole('button', { name: /Draft Event/ });
    expect(screen.getByText(/incomplete or invalid/i)).toBeInTheDocument();

    // An unrelated edit must not drag the invalid row into the draft.
    fireEvent.click(deleteButtonOf(/Summer Festival/));
    fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
    await waitOutTheDebounce();
    expect(updateEvents).not.toHaveBeenCalled();
  });

  it('writes the held-back change as soon as the incomplete event is gone', async () => {
    vi.mocked(loadDraftConfig).mockResolvedValue(draft(incomplete));
    renderEditor();
    await screen.findByRole('button', { name: /Draft Event/ });

    fireEvent.click(deleteButtonOf(/Draft Event/));
    fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(updateEvents).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const saved = vi.mocked(updateEvents).mock.calls[0][0] as EventsConfig;
    expect(saved.events.map((e) => e.slug)).toEqual(['summer-festival']);
    expect(screen.queryByText(/incomplete or invalid/i)).not.toBeInTheDocument();
  });

  it('reports a failed write without losing the change', async () => {
    vi.mocked(updateEvents).mockRejectedValue(new Error('Network down'));
    renderEditor();
    await screen.findByRole('button', { name: /Été Musical/ });

    fireEvent.click(deleteButtonOf(/Été Musical/));
    fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));

    expect(await screen.findByText(/network down/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(rowNames()).toEqual(['Summer Festival', 'Spring Regatta']);
  });

  describe('search (display-only)', () => {
    it('matches word starts in names and descriptions, accents and markdown aside', async () => {
      renderEditor();
      await screen.findByRole('button', { name: /Summer Festival/ });

      // "regate" finds "**Régate**" in the description — accents and markdown aside.
      search('regate');
      expect(rowNames()).toEqual(['Spring Regatta']);

      // A word start only: "gatta" is inside "Regatta", not at its start.
      search('gatta');
      expect(screen.getByText(/no event matches this search/i)).toBeInTheDocument();

      search('ete');
      expect(rowNames()).toEqual(['Été Musical']);
    });

    it('clears the search and brings the whole list back', async () => {
      renderEditor();
      await screen.findByRole('button', { name: /Summer Festival/ });

      search('summer');
      expect(rowNames()).toEqual(['Summer Festival']);
      fireEvent.click(screen.getByRole('button', { name: /clear the search/i }));
      expect(rowNames()).toEqual(['Summer Festival', 'Été Musical', 'Spring Regatta']);
    });

    it('never touches the draft', async () => {
      renderEditor();
      await screen.findByRole('button', { name: /Summer Festival/ });

      search('summer');
      sortBy(/A to Z/);
      await waitOutTheDebounce();
      expect(updateEvents).not.toHaveBeenCalled();
    });
  });

  describe('sort selector (display-only)', () => {
    it('reorders the rows without reordering the draft', async () => {
      renderEditor();
      await screen.findByRole('button', { name: /Summer Festival/ });

      sortBy(/oldest first/i);
      expect(rowNames()).toEqual(['Spring Regatta', 'Été Musical', 'Summer Festival']);

      // Locale-aware: "Été" sorts under E, not after "Summer".
      sortBy(/A to Z/);
      expect(rowNames()).toEqual(['Été Musical', 'Spring Regatta', 'Summer Festival']);

      sortBy(/Z to A/);
      expect(rowNames()).toEqual(['Summer Festival', 'Spring Regatta', 'Été Musical']);

      // A delete made under a display sort still writes the stored order.
      fireEvent.click(deleteButtonOf(/Spring Regatta/));
      fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
      await waitFor(() => expect(updateEvents).toHaveBeenCalledTimes(1), { timeout: 3000 });
      const saved = vi.mocked(updateEvents).mock.calls[0][0] as EventsConfig;
      expect(saved.events.map((e) => e.slug)).toEqual(['summer-festival', 'ete-musical']);
    });
  });

  describe('edit dialog (written against the Cancel/Done contract)', () => {
    it('drops a newly added event when the dialog is cancelled', async () => {
      renderEditor();
      await screen.findByRole('button', { name: /Summer Festival/ });

      fireEvent.click(screen.getByRole('button', { name: /add an event/i }));
      await screen.findByRole('dialog');
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      expect(rowNames()).toEqual(['Summer Festival', 'Été Musical', 'Spring Regatta']);
      await waitOutTheDebounce();
      expect(updateEvents).not.toHaveBeenCalled();
    });

    it('restores the event when an edit is cancelled', async () => {
      renderEditor();
      fireEvent.click(await screen.findByRole('button', { name: /Summer Festival/ }));
      fireEvent.change(await screen.findByLabelText(/^name/i), { target: { value: 'Renamed Festival' } });
      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      expect(rowNames()).toEqual(['Summer Festival', 'Été Musical', 'Spring Regatta']);
      await waitOutTheDebounce();
      expect(updateEvents).not.toHaveBeenCalled();
    });

    it('auto-saves a confirmed edit', async () => {
      renderEditor();
      fireEvent.click(await screen.findByRole('button', { name: /Summer Festival/ }));
      fireEvent.change(await screen.findByLabelText(/^name/i), { target: { value: 'Summer Fest' } });
      fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      await waitFor(() => expect(updateEvents).toHaveBeenCalledTimes(1), { timeout: 3000 });
      const saved = vi.mocked(updateEvents).mock.calls[0][0] as EventsConfig;
      expect(saved.events.find((e) => e.slug === 'summer-festival')?.name).toBe('Summer Fest');
    });

    it('locks the slug of a persisted event', async () => {
      renderEditor();
      fireEvent.click(await screen.findByRole('button', { name: /Summer Festival/ }));
      const slugField = await screen.findByLabelText(/slug/i);
      expect(slugField).toHaveValue('summer-festival');
      expect(slugField).toBeDisabled();
    });
  });
});
