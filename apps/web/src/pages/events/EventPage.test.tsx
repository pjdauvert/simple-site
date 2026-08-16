import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import type { EventsConfig, SiteConfig, SiteEvent } from '@simple-site/interfaces';
import { EventPage } from './EventPage';
import { mockFeatures } from '../../test/featureFlags';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { renderWithProviders } from '../../test/renderWithProviders';

vi.mock('../../hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));
vi.mock('../../hooks/useSiteConfig', () => ({ useSiteConfig: vi.fn() }));

const inDays = (days: number, hour = 10): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour).toISOString();
};

const festival: SiteEvent = {
  slug: 'summer-festival',
  name: 'Summer Festival',
  description: 'Three days of **concerts** on the waterfront.',
  imageUrl: 'https://ik.imagekit.io/demo/festival.jpg',
  startDateTime: inDays(10),
  endDateTime: inDays(12, 20),
  location: 'Place de la Bourse, Bordeaux',
  websiteUrl: 'https://example.com/festival',
};

const setConfig = (events?: Partial<EventsConfig>) =>
  vi.mocked(useSiteConfig).mockReturnValue({
    config: { site: { siteName: 'Test' }, themes: [], pages: [], events } as unknown as SiteConfig,
  } as unknown as ReturnType<typeof useSiteConfig>);

const renderAt = (path: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/events/:slug" element={<EventPage />} />
    </Routes>,
    { route: path, theme: true },
  );

describe('EventPage (public /events/:slug)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFeatures('events');
    setConfig({ events: [festival] });
  });

  it('renders the 404 page when the feature is off — even for a known slug', () => {
    mockFeatures();
    renderAt('/events/summer-festival');
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('renders the 404 page on an unknown slug', () => {
    renderAt('/events/nope');
    expect(screen.getByText('Oops — nothing here!')).toBeInTheDocument();
  });

  it('renders the full fiche: image, name, date sentence, location, website, markdown description', () => {
    renderAt('/events/summer-festival');

    expect(screen.getByRole('heading', { level: 1, name: 'Summer Festival' })).toBeInTheDocument();
    // Multi-day future → the range sentence.
    expect(screen.getByText(/^From .+ to .+$/)).toBeInTheDocument();

    const mapLink = screen.getByRole('link', { name: /Place de la Bourse/ });
    expect(mapLink).toHaveAttribute('target', '_blank');
    expect(mapLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(mapLink.getAttribute('href')).toContain(encodeURIComponent('Place de la Bourse, Bordeaux'));

    const website = screen.getByRole('link', { name: 'Visit the event website' });
    expect(website).toHaveAttribute('href', 'https://example.com/festival');
    expect(website).toHaveAttribute('target', '_blank');

    // Markdown description rendered (bold fragment), header image right-sized.
    expect(screen.getByText('concerts')).toBeInTheDocument();
    expect(document.querySelector('img')).toHaveAttribute(
      'src',
      'https://ik.imagekit.io/demo/festival.jpg?tr=w-1280,q-80,f-auto',
    );
  });

  it('names the browser tab after the event', () => {
    renderAt('/events/summer-festival');
    expect(document.title).toBe('Summer Festival – Test Site');
  });

  it('prefers translations over the stored defaults for name and location', () => {
    renderWithProviders(
      <Routes>
        <Route path="/events/:slug" element={<EventPage />} />
      </Routes>,
      {
        route: '/events/summer-festival',
        theme: true,
        messages: {
          'events.summer-festival.name': 'Festival d’été',
          'events.summer-festival.location': 'Place de la Bourse (traduite)',
        },
      },
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Festival d’été' })).toBeInTheDocument();
    const mapLink = screen.getByRole('link', { name: /traduite/ });
    // The DISPLAYED address is translated; the maps query keeps the canonical one.
    expect(mapLink.getAttribute('href')).toContain(encodeURIComponent('Place de la Bourse, Bordeaux'));
  });
});
