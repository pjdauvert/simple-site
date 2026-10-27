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

    const website = screen.getByRole('link', { name: /^More info/ });
    expect(website).toHaveAttribute('href', 'https://example.com/festival');
    expect(website).toHaveAttribute('target', '_blank');

    // Markdown description rendered (bold fragment), header image right-sized.
    expect(screen.getByText('concerts')).toBeInTheDocument();
    expect(document.querySelector('img')).toHaveAttribute(
      'src',
      'https://ik.imagekit.io/demo/festival.jpg?tr=w-1280,q-80,f-auto',
    );
  });

  it('frames the header illustration as an A4 poster by default, and honours a stored ratio', () => {
    const plain = renderAt('/events/summer-festival');
    expect(screen.getByTestId('event-header-image')).toHaveAttribute('data-aspect-ratio', 'A4');
    plain.unmount();

    setConfig({ events: [festival], design: { eventPage: { imageAspectRatio: '16:9' } } });
    renderAt('/events/summer-festival');
    expect(screen.getByTestId('event-header-image')).toHaveAttribute('data-aspect-ratio', '16:9');
  });

  it('puts the illustration above the description by default, beside it when the design says so', () => {
    const above = renderAt('/events/summer-festival');
    expect(screen.getByTestId('event-header-image').parentElement).toHaveAttribute('data-image-placement', 'above');
    above.unmount();

    setConfig({ events: [festival], design: { eventPage: { imagePlacement: 'beside' } } });
    renderAt('/events/summer-festival');
    const layout = screen.getByTestId('event-header-image').parentElement;
    expect(layout).toHaveAttribute('data-image-placement', 'beside');
    // The illustration and the description are the layout's two children —
    // side by side from `md`, stacked below it.
    expect(layout?.children).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 1, name: 'Summer Festival' })).toBeInTheDocument();
    // A column image is delivered at a column's width, not the page's.
    expect(document.querySelector('img')).toHaveAttribute('sizes', '(min-width: 900px) 450px, 100vw');
  });

  it('paints the illustration as a blurred full background only when the design asks for it', () => {
    const plain = renderAt('/events/summer-festival');
    expect(screen.queryByTestId('event-full-background')).not.toBeInTheDocument();
    plain.unmount();

    setConfig({ events: [festival], design: { eventPage: { fullBackgroundImage: true } } });
    renderAt('/events/summer-festival');
    // Decorative layer (the rendition it loads is covered by `eventDisplay`).
    expect(screen.getByTestId('event-full-background')).toHaveAttribute('aria-hidden');
    // The fiche still reads in full over it.
    expect(screen.getByRole('heading', { level: 1, name: 'Summer Festival' })).toBeInTheDocument();
    expect(screen.getByText('concerts')).toBeInTheDocument();
  });

  it('skips the full background for an event without an illustration', () => {
    setConfig({
      events: [{ ...festival, imageUrl: undefined }],
      design: { eventPage: { fullBackgroundImage: true } },
    });
    renderAt('/events/summer-festival');
    expect(screen.queryByTestId('event-full-background')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Summer Festival' })).toBeInTheDocument();
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

  // A sighted visitor watches the new tab appear; a screen-reader user gets no
  // warning and lands somewhere their back button will not return from.
  it('warns assistive tech that the Maps link and More info open a new tab', () => {
    renderAt('/events/summer-festival');

    const mapLink = screen.getByRole('link', { name: /Place de la Bourse.*opens in a new tab/ });
    expect(mapLink).toHaveAttribute('target', '_blank');
    const website = screen.getByRole('link', { name: /^More info \(opens in a new tab\)$/ });
    expect(website).toHaveAttribute('target', '_blank');

    // The hint EXTENDS the visible label rather than replacing it: a
    // speech-control user says what they read.
    expect(website).toHaveTextContent(/^More info/);
    expect(website).not.toHaveAttribute('aria-label');
  });

  describe('illustration alt text', () => {
    it('leaves the header image unnamed when the event describes no illustration', () => {
      renderAt('/events/summer-festival');
      // Empty, not absent: a decorative image a screen reader should skip.
      expect(document.querySelector('img')).toHaveAttribute('alt', '');
    });

    it('names the header image with the stored imageAlt', () => {
      setConfig({ events: [{ ...festival, imageAlt: 'Crowd in front of the main stage' }] });
      renderAt('/events/summer-festival');
      expect(screen.getByRole('img', { name: 'Crowd in front of the main stage' })).toBeInTheDocument();
    });

    it('prefers the translation over the stored imageAlt', () => {
      setConfig({ events: [{ ...festival, imageAlt: 'Crowd in front of the main stage' }] });
      renderWithProviders(
        <Routes>
          <Route path="/events/:slug" element={<EventPage />} />
        </Routes>,
        {
          route: '/events/summer-festival',
          theme: true,
          messages: { 'events.summer-festival.imageAlt': 'Foule devant la scène principale' },
        },
      );
      expect(screen.getByRole('img', { name: 'Foule devant la scène principale' })).toBeInTheDocument();
    });
  });
});
