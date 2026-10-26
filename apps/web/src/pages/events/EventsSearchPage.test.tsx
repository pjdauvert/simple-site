import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { Route, Routes } from 'react-router-dom';
import type { EventsConfig, SiteConfig, SiteEvent } from '@simple-site/interfaces';
import { EventsSearchPage } from './EventsSearchPage';
import { mockFeatures } from '../../test/featureFlags';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { renderWithProviders } from '../../test/renderWithProviders';

vi.mock('../../hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));
vi.mock('../../hooks/useSiteConfig', () => ({ useSiteConfig: vi.fn() }));

/** Local instants — the page reads days on the viewer's calendar. */
const local = (year: number, month: number, day: number, hour = 10): string =>
  new Date(year, month - 1, day, hour).toISOString();

const inDays = (days: number, hour = 10): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

/** The year and month of an instant, as the pickers name them. */
const monthOf = (iso: string): { year: string; month: string } => {
  const date = new Date(iso);
  return { year: String(date.getFullYear()), month: date.toLocaleString('en-US', { month: 'long' }) };
};

/** The bound fields, by the label their picker and its calendar carry. */
const BOUND_FIELD = { first: /^from$/i, last: /^until$/i } as const;

const regatta: SiteEvent = {
  slug: 'spring-regatta',
  name: 'Spring Regatta',
  description: 'La **Régate** de printemps sur le fleuve.',
  startDateTime: inDays(20),
  location: 'Quai des Chartrons, Bordeaux',
  imageUrl: 'https://ik.imagekit.io/demo/regatta.jpg',
};

const festival: SiteEvent = {
  slug: 'summer-festival',
  name: 'Summer Festival',
  description: 'Three days of concerts.',
  startDateTime: inDays(60),
  endDateTime: inDays(62, 22),
  location: 'Place de la Bourse',
};

const oldFair: SiteEvent = {
  slug: 'old-fair',
  name: 'Old Fair',
  startDateTime: inDays(-400),
  location: 'Jardin Public',
};

const setConfig = (events?: Partial<EventsConfig>) =>
  vi.mocked(useSiteConfig).mockReturnValue({
    config: { site: { siteName: 'Test' }, themes: [], pages: [], events } as unknown as SiteConfig,
  } as unknown as ReturnType<typeof useSiteConfig>);

const renderPage = (messages?: Record<string, string>, locale: 'en' | 'fr' = 'en') =>
  renderWithProviders(
    <Routes>
      <Route path="/events/search" element={<EventsSearchPage />} />
    </Routes>,
    { route: '/events/search', theme: true, messages, locale },
  );

/** The listed events, in the order the page paints them (the calendar’s month
 * headings sit at the same level, so the list itself is the scope). */
const rowNames = (): string[] => {
  const list = screen.queryByTestId('event-search-list');
  if (!list) return [];
  return within(list)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent ?? '');
};

/**
 * Picks a bound through its Material picker: a year, then a month. Each
 * calendar stays mounted once opened, so it is reached through its field's
 * label.
 */
const pickMonth = (bound: keyof typeof BOUND_FIELD, when: string | { year: string; month: string }): void => {
  const { year, month } = typeof when === 'string' ? monthOf(when) : when;
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`choose the ${bound} month`, 'i') }));
  const calendar = within(screen.getByRole('dialog', { name: BOUND_FIELD[bound] }));
  fireEvent.click(calendar.getByRole('radio', { name: year }));
  fireEvent.click(calendar.getByRole('radio', { name: month }));
};

describe('EventsSearchPage (public /events/search)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFeatures('events');
    setConfig({ events: [festival, regatta, oldFair] });
    // jsdom has no layout, so scrolling is only ever observed, never performed.
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('404s when the feature is off', () => {
    mockFeatures();
    renderPage();
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('404s when there is no event at all', () => {
    setConfig({ events: [] });
    renderPage();
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('opens on everything from today onwards, soonest first, past events aside', () => {
    renderPage();
    expect(rowNames()).toEqual(['Spring Regatta', 'Summer Festival']);
    expect(screen.queryByText('Old Fair')).not.toBeInTheDocument();
    expect(document.title).toBe('Search the calendar – Test Site');
  });

  it('matches the query against the name, the description AND the place', () => {
    renderPage();
    const query = screen.getByLabelText(/^search$/i);

    // Accents and markdown aside, like the admin's search.
    fireEvent.change(query, { target: { value: 'regate' } });
    expect(rowNames()).toEqual(['Spring Regatta']);

    // The place is searchable too.
    fireEvent.change(query, { target: { value: 'bourse' } });
    expect(rowNames()).toEqual(['Summer Festival']);

    fireEvent.change(query, { target: { value: 'nantes' } });
    expect(screen.getByText(/no event matches this search/i)).toBeInTheDocument();
  });

  it('searches the translations the visitor reads, not the stored defaults', () => {
    renderPage({ 'events.summer-festival.location': 'Halle des Chartrons' });
    fireEvent.change(screen.getByLabelText(/^search$/i), { target: { value: 'halle' } });
    expect(rowNames()).toEqual(['Summer Festival']);
  });

  it('reaches past events through the date bounds', () => {
    renderPage();
    pickMonth('first', oldFair.startDateTime);
    expect(rowNames()).toContain('Old Fair');

    // An upper bound cuts the list the other way.
    pickMonth('last', oldFair.startDateTime);
    expect(rowNames()).toEqual(['Old Fair']);
  });

  it('clears a bound from its field, and offers the current month back', () => {
    renderPage();
    pickMonth('first', oldFair.startDateTime);
    expect(rowNames()).toContain('Old Fair');

    // The field's own clear button empties the bound: the whole list is back.
    fireEvent.click(screen.getByRole('button', { name: /clear the first month/i }));
    expect(rowNames()).toContain('Old Fair'); // no lower bound at all now
    expect(rowNames()).toContain('Spring Regatta');

    // "This month" from the calendar brings the visitor back to from-now-on.
    pickMonth('first', oldFair.startDateTime);
    fireEvent.click(screen.getByRole('button', { name: /choose the first month/i }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: BOUND_FIELD.first })).getByRole('button', { name: /this month/i }),
    );
    expect(rowNames()).toEqual(['Spring Regatta', 'Summer Festival']);
  });

  it('speaks the interface locale in the pickers', () => {
    renderPage(undefined, 'fr');
    fireEvent.click(screen.getByRole('button', { name: /choisir le premier mois/i }));
    const calendar = within(screen.getByRole('dialog', { name: /à partir de/i }));
    // dayjs' French locale drives the month names, our labels the actions.
    fireEvent.click(calendar.getByRole('radio', { name: '2027' }));
    expect(calendar.getByRole('radio', { name: /^mai$/i })).toBeInTheDocument();
    expect(calendar.getByRole('button', { name: /ce mois/i })).toBeInTheDocument();
    expect(calendar.getByRole('button', { name: /effacer les dates/i })).toBeInTheDocument();
  });

  it('shows the whole list on the calendar, one grid per occupied month', () => {
    renderPage();
    const calendar = within(screen.getByTestId('event-calendar'));
    // Two events, each on its own month → two month grids.
    expect(screen.getByTestId('event-calendar').querySelectorAll('section')).toHaveLength(2);
    // The multi-day festival marks each of its three days.
    expect(calendar.getAllByTestId('calendar-day-event')).toHaveLength(4);
  });

  it('marks the pointed event’s days apart from the other event days', () => {
    renderPage();
    const markedDates = (): string[] =>
      screen
        .getAllByTestId('calendar-day-event')
        .filter((day) => day.getAttribute('data-marked') === 'true')
        .map((day) => day.getAttribute('data-date') ?? '');

    expect(markedDates()).toEqual([]);
    fireEvent.mouseOver(screen.getByText('Spring Regatta').closest('.MuiCard-root') as HTMLElement);
    expect(markedDates()).toHaveLength(1);
  });

  it('scrolls the list to the event a calendar day points at', () => {
    renderPage();
    const scrollIntoView = vi.mocked(Element.prototype.scrollIntoView);
    scrollIntoView.mockClear();

    fireEvent.mouseOver(screen.getAllByTestId('calendar-day-event')[0]);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('retracts the calendar panel and brings it back', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /hide the calendar/i }));
    expect(screen.queryByTestId('event-calendar')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show the calendar/i }));
    expect(screen.getByTestId('event-calendar')).toBeInTheDocument();
  });

  it('disables the calendar while the list is empty', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^search$/i), { target: { value: 'nantes' } });
    expect(screen.queryByTestId('event-calendar')).not.toBeInTheDocument();
    expect(screen.getByText(/no event to place on the calendar/i)).toBeInTheDocument();
    // On a phone the sheet cannot be opened either.
    expect(screen.getByRole('button', { name: /^calendar$/i })).toBeDisabled();
  });

  it('opens on the last event that took place when nothing is upcoming', () => {
    setConfig({ events: [oldFair] });
    renderPage();
    expect(rowNames()).toEqual(['Old Fair']);
    const { year, month } = monthOf(oldFair.startDateTime);
    // The field opens on that event's month, not on today's.
    expect(document.querySelector('.MuiPickersSectionList-root')).toHaveTextContent(
      new RegExp(`${month.slice(0, 3)}.*${year}`, 'i'),
    );
  });

  it('links each row to the event’s page', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /Spring Regatta/ })).toHaveAttribute(
      'href',
      '/events/spring-regatta',
    );
  });

  it('honours the design’s first day of the week', () => {
    const onlyMay: SiteEvent = { ...regatta, startDateTime: local(2027, 5, 10) };
    setConfig({ events: [onlyMay], design: { agendaPage: { weekStartsOn: 'sunday' } } });
    renderPage();
    pickMonth('first', { year: '2027', month: 'May' });
    // Sunday first: the narrow labels start with S (Sunday), not M (Monday).
    const [firstColumn] = within(screen.getByTestId('event-calendar')).getAllByText(/^[A-Z]$/);
    expect(firstColumn).toHaveTextContent('S');
  });

  it('keeps the dates filter in a sheet, with the applied bounds as chips', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^dates$/i }));
    fireEvent.click(within(screen.getByRole('presentation')).getByRole('button', { name: /clear the dates/i }));

    // Cleared from the sheet: the whole list is back, past events included.
    expect(rowNames()).toContain('Old Fair');
    expect(screen.queryByRole('button', { name: /clear the dates/i })).not.toBeInTheDocument();
  });
});
