import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { EventsConfig, SiteConfig, SiteEvent } from '@simple-site/interfaces';
import { EventsPage } from './EventsPage';
import { mockFeatures } from '../../test/featureFlags';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { renderWithProviders } from '../../test/renderWithProviders';

vi.mock('../../hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));
vi.mock('../../hooks/useSiteConfig', () => ({ useSiteConfig: vi.fn() }));

const utc = (year: number, month: number, day: number, hour = 10): string =>
  new Date(year, month - 1, day, hour).toISOString();

const inDays = (days: number, hour = 10): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour).toISOString();
};

const event = (slug: string, name: string, start: string, extra: Partial<SiteEvent> = {}): SiteEvent => ({
  slug,
  name,
  startDateTime: start,
  location: `${name} venue, Bordeaux`,
  ...extra,
});

const setConfig = (events?: Partial<EventsConfig>) =>
  vi.mocked(useSiteConfig).mockReturnValue({
    config: { site: { siteName: 'Test' }, themes: [], pages: [], events } as unknown as SiteConfig,
  } as unknown as ReturnType<typeof useSiteConfig>);

const renderPage = () => renderWithProviders(<EventsPage />, { route: '/events', theme: true });

describe('EventsPage (public /events)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFeatures('events');
  });

  it('renders the 404 page when the events feature is disabled, config or not', () => {
    mockFeatures();
    setConfig({ events: [event('one', 'One', inDays(10))] });
    renderPage();
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('renders the 404 page when there is nothing to show', () => {
    setConfig(undefined);
    renderPage();
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('places events automatically: featured next, upcoming cards, past grouped by year', () => {
    setConfig({
      events: [
        event('old-fair', 'Old Fair', utc(2023, 5, 10)),
        event('later-show', 'Later Show', inDays(60)),
        event('next-show', 'Next Show', inDays(5)),
        event('older-expo', 'Older Expo', utc(2024, 3, 2)),
      ],
    });
    renderPage();

    // Bundled section titles (no stored overrides).
    expect(screen.getByRole('heading', { level: 2, name: 'Next event' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Upcoming events' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Past events' })).toBeInTheDocument();

    // The soonest future event is featured; the later one is an upcoming card.
    expect(screen.getByRole('heading', { level: 3, name: 'Next Show' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Later Show' })).toBeInTheDocument();

    // Past events under their year headings, most recent year first.
    const years = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(years.indexOf('2024')).toBeLessThan(years.indexOf('2023'));
    expect(screen.getByRole('heading', { level: 3, name: 'Older Expo' })).toBeInTheDocument();
  });

  it('renders stored section titles and markdown headers as translation defaults', () => {
    setConfig({
      events: [event('next-show', 'Next Show', inDays(5))],
      nextTitle: 'Prochainement',
      nextHeader: 'Ne manquez **pas** ceci.',
    });
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Prochainement' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Next event' })).not.toBeInTheDocument();
    expect(screen.getByText('pas')).toBeInTheDocument(); // markdown <strong> rendered
  });

  it('hides the past section entirely when the design says none', () => {
    setConfig({
      events: [event('next-show', 'Next Show', inDays(5)), event('old-fair', 'Old Fair', utc(2023, 5, 10))],
      design: { agendaPage: { pastEventsMode: 'none' } },
    });
    renderPage();
    expect(screen.queryByRole('heading', { level: 2, name: 'Past events' })).not.toBeInTheDocument();
    expect(screen.queryByText('Old Fair')).not.toBeInTheDocument();
  });

  it('announces a single-day future event with the long "On {date}" sentence', () => {
    setConfig({ events: [event('next-show', 'Next Show', inDays(5))] });
    renderPage();
    expect(screen.getByText(/^On .+ from .+$/)).toBeInTheDocument();
  });

  it('announces an ongoing multi-day event with the "Until {endDate}" sentence', () => {
    setConfig({
      events: [event('festival', 'Festival', inDays(-1), { endDateTime: inDays(2, 20) })],
    });
    renderPage();
    expect(screen.getByText(/^Until .+$/)).toBeInTheDocument();
  });

  it('links each card to the event page and the location to Google Maps in a new tab', () => {
    setConfig({
      events: [
        event('next-show', 'Next Show', inDays(5)),
        event('later-show', 'Later Show', inDays(60)),
      ],
    });
    renderPage();

    const card = screen.getByRole('heading', { level: 3, name: 'Later Show' }).closest('a') as HTMLElement;
    expect(card).toHaveAttribute('href', '/events/later-show');

    const mapLink = screen.getAllByRole('link', { name: /venue, Bordeaux/ })[0];
    expect(mapLink).toHaveAttribute('target', '_blank');
    expect(mapLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(mapLink.getAttribute('href')).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(mapLink.getAttribute('href')).toContain(encodeURIComponent('venue, Bordeaux'));
  });

  it('presents the featured event in full: full markdown description, then the website link in a new tab', () => {
    setConfig({
      events: [
        event('next-show', 'Next Show', inDays(5), {
          description: 'Doors open at **seven**.',
          websiteUrl: 'https://example.com/show',
        }),
        event('later-show', 'Later Show', inDays(60), { description: 'Cards never show this.' }),
      ],
    });
    renderPage();
    expect(screen.getByText('seven')).toBeInTheDocument(); // markdown rendered in the featured block
    expect(screen.queryByText(/Cards never show this/)).not.toBeInTheDocument();
    const website = screen.getByRole('link', { name: 'Visit the event website' });
    expect(website).toHaveAttribute('href', 'https://example.com/show');
    expect(website).toHaveAttribute('target', '_blank');
  });

  it('omits the featured section entirely when no event is ongoing or upcoming', () => {
    setConfig({ events: [event('old-fair', 'Old Fair', utc(2023, 5, 10))] });
    renderPage();
    expect(screen.queryByRole('heading', { level: 2, name: 'Next event' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Past events' })).toBeInTheDocument();
  });

  it('hides the location on cards when the design turns it off — the featured block keeps its own', () => {
    setConfig({
      events: [
        event('next-show', 'Next Show', inDays(5)),
        event('later-show', 'Later Show', inDays(60)),
      ],
      design: { agendaPage: { showLocationOnCards: false } },
    });
    renderPage();
    // Featured block still shows its location link…
    expect(screen.getByRole('link', { name: /Next Show venue/ })).toBeInTheDocument();
    // …the upcoming card does not.
    expect(screen.queryByRole('link', { name: /Later Show venue/ })).not.toBeInTheDocument();
  });

  it('renders card dates in the short 2-digit format, as a range for multi-day events', () => {
    setConfig({
      events: [
        event('next-show', 'Next Show', inDays(5)),
        event('fair', 'Fair', utc(2024, 3, 2), { endDateTime: utc(2024, 3, 4) }),
      ],
    });
    renderPage();
    const card = screen.getByRole('heading', { level: 3, name: 'Fair' }).closest('a') as HTMLElement;
    expect(within(card).getByText('03/02/2024 – 03/04/2024')).toBeInTheDocument();
  });
});
