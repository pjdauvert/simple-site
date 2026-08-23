import {
  DEFAULT_EVENT_CARD_ASPECT_RATIO,
  DEFAULT_EVENT_COLUMNS,
  DEFAULT_EVENT_PAGE_IMAGE_ASPECT_RATIO,
  DEFAULT_EVENT_SHOW_FEATURED_BACKDROP,
  DEFAULT_EVENT_SHOW_LOCATION_ON_CARDS,
  DEFAULT_PAST_EVENTS_MODE,
  FEATURE_PAGE_ROUTES,
  FeaturePagesEnum,
  featurePageTitle,
  type EventAspectRatio,
  type EventsConfig,
  type PastEventsMode,
  type SiteConfig,
  type SiteEvent,
} from '@simple-site/interfaces';
import { ikSrcSet, ikTransform } from '../../utils/imagekit';

/**
 * Display helpers of the public events pages (web-only). Design values resolve
 * here — the stored config only keeps deviations from these defaults.
 */

export interface ResolvedAgendaDesign {
  pastEventsMode: PastEventsMode;
  pastEventsFromDate?: string;
  cardAspectRatio: EventAspectRatio;
  columns: number;
  showLocationOnCards: boolean;
  showFeaturedBackdrop: boolean;
}

export const resolveAgendaDesign = (events: EventsConfig | undefined): ResolvedAgendaDesign => ({
  pastEventsMode: events?.design?.agendaPage?.pastEventsMode ?? DEFAULT_PAST_EVENTS_MODE,
  pastEventsFromDate: events?.design?.agendaPage?.pastEventsFromDate,
  cardAspectRatio: events?.design?.agendaPage?.cardAspectRatio ?? DEFAULT_EVENT_CARD_ASPECT_RATIO,
  columns: events?.design?.agendaPage?.columns ?? DEFAULT_EVENT_COLUMNS,
  showLocationOnCards: events?.design?.agendaPage?.showLocationOnCards ?? DEFAULT_EVENT_SHOW_LOCATION_ON_CARDS,
  showFeaturedBackdrop: events?.design?.agendaPage?.showFeaturedBackdrop ?? DEFAULT_EVENT_SHOW_FEATURED_BACKDROP,
});

export interface ResolvedEventPageDesign {
  imageAspectRatio: EventAspectRatio;
}

export const resolveEventPageDesign = (events: EventsConfig | undefined): ResolvedEventPageDesign => ({
  imageAspectRatio: events?.design?.eventPage?.imageAspectRatio ?? DEFAULT_EVENT_PAGE_IMAGE_ASPECT_RATIO,
});

/** Public route of an event's detail page, nested under the reserved route. */
export const eventRoute = (slug: string): string => `${FEATURE_PAGE_ROUTES.events}/${slug}`;

/**
 * Body-copy markdown blocks (descriptions, section intros): paragraphs render
 * as body1 and the first/last margins collapse so the wrapper's own spacing
 * is the only spacing.
 */
export const markdownBodySx = {
  '& p': { typography: 'body1' },
  '& > :first-of-type': { mt: 0 },
  '& > :last-child': { mb: 0 },
} as const;

/** Google Maps search on the event's address, opened in a new tab. */
export const googleMapsSearchUrl = (address: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** CSS `aspect-ratio` value of a design ratio (`A4` = portrait 210 × 297). */
export const aspectRatioCss = (ratio: EventAspectRatio): string =>
  ratio === 'A4' ? '210 / 297' : ratio.replace(':', ' / ');

/**
 * Responsive column track of the card grids: phones stack, tablets show two,
 * only wide screens honour the design's count (see the gallery's rule).
 */
export const eventColumnsSx = (columns: number): { xs: string; sm: string; md: string } => ({
  xs: '1fr',
  sm: 'repeat(2, 1fr)',
  md: `repeat(${columns}, 1fr)`,
});

/**
 * Right-sized CDN renditions (no-ops on non-ImageKit URLs). Cards and headers
 * ship a responsive `srcSet` of width buckets (the gallery's pattern) with a
 * `sizes` hint, over a mid-bucket `src` fallback.
 */
/** Delivery buckets of the card illustrations — tiles scale with the column count. */
export const EVENT_CARD_WIDTHS: readonly number[] = [320, 480, 640, 960];
/** Delivery buckets of the featured poster and detail-page header. */
export const EVENT_HEADER_WIDTHS: readonly number[] = [480, 768, 1280, 1920];

export const eventCardImageUrl = (url: string): string => ikTransform(url, 'w-640,q-80,f-auto');
export const eventCardImageSrcSet = (url: string): string | undefined => ikSrcSet(url, EVENT_CARD_WIDTHS);
/** `sizes` hint of a card image, from the design's desktop column count. */
export const eventCardSizes = (columns: number): string =>
  `(min-width: 900px) ${Math.round(100 / columns)}vw, (min-width: 600px) 50vw, 100vw`;

export const eventHeaderImageUrl = (url: string): string => ikTransform(url, 'w-1280,q-80,f-auto');
export const eventHeaderImageSrcSet = (url: string): string | undefined => ikSrcSet(url, EVENT_HEADER_WIDTHS);
/** The detail header spans its container; the featured poster its left third. */
export const EVENT_PAGE_HEADER_SIZES = '(min-width: 900px) 900px, 100vw';
export const FEATURED_POSTER_SIZES = '(min-width: 900px) 33vw, 100vw';

/**
 * The featured section's blurred-cover backdrop: a deliberately tiny, cheap
 * rendition — the CSS blur erases any resolution the bytes would buy.
 */
export const eventBackdropImageUrl = (url: string): string => ikTransform(url, 'w-480,q-50,f-auto');

/** The events with a slugged detail page, keyed for lookup. */
export const eventBySlug = (events: EventsConfig | undefined, slug: string): SiteEvent | undefined =>
  events?.events.find((event) => event.slug === slug);

/** Default value of the agenda page heading / nav label (`events.menuTitle`). */
export const eventsPageTitle = (config: SiteConfig): string =>
  featurePageTitle(config.menu, FeaturePagesEnum.EVENTS);
