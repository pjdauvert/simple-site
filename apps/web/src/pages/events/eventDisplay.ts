import {
  DEFAULT_EVENT_CARD_ASPECT_RATIO,
  DEFAULT_EVENT_COLUMNS,
  DEFAULT_EVENT_PAGE_IMAGE_ASPECT_RATIO,
  DEFAULT_PAST_EVENTS_MODE,
  FEATURE_PAGE_DEFAULT_LABELS,
  FEATURE_PAGE_ROUTES,
  FeaturePagesEnum,
  featureEntryLabel,
  type EventAspectRatio,
  type EventsConfig,
  type PastEventsMode,
  type SiteConfig,
  type SiteEvent,
} from '@simple-site/interfaces';
import { ikTransform } from '../../utils/imagekit';

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
  showLocationOnCards: events?.design?.agendaPage?.showLocationOnCards ?? true,
  showFeaturedBackdrop: events?.design?.agendaPage?.showFeaturedBackdrop ?? true,
});

export interface ResolvedEventPageDesign {
  imageAspectRatio: EventAspectRatio;
}

export const resolveEventPageDesign = (events: EventsConfig | undefined): ResolvedEventPageDesign => ({
  imageAspectRatio: events?.design?.eventPage?.imageAspectRatio ?? DEFAULT_EVENT_PAGE_IMAGE_ASPECT_RATIO,
});

/** Public route of an event's detail page, nested under the reserved route. */
export const eventRoute = (slug: string): string => `${FEATURE_PAGE_ROUTES.events}/${slug}`;

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

/** Right-sized CDN renditions (no-ops on non-ImageKit URLs). */
export const eventCardImageUrl = (url: string): string => ikTransform(url, 'w-640,q-80,f-auto');
export const eventHeaderImageUrl = (url: string): string => ikTransform(url, 'w-1280,q-80,f-auto');

/** The events with a slugged detail page, keyed for lookup. */
export const eventBySlug = (events: EventsConfig | undefined, slug: string): SiteEvent | undefined =>
  events?.events.find((event) => event.slug === slug);

/**
 * Default value of the agenda page heading / nav label (`events.menuTitle`):
 * the menu entry's custom title when one is set, else the feature default —
 * the same fallback chain the nav renders.
 */
export const eventsPageTitle = (config: SiteConfig): string => {
  for (const entry of config.menu?.entries ?? []) {
    if (entry.type === 'feature' && entry.feature === FeaturePagesEnum.EVENTS) return featureEntryLabel(entry);
    if (entry.type === 'group') {
      const child = entry.children.find((c) => c.type === 'feature' && c.feature === FeaturePagesEnum.EVENTS);
      if (child?.type === 'feature') return featureEntryLabel(child);
    }
  }
  return FEATURE_PAGE_DEFAULT_LABELS[FeaturePagesEnum.EVENTS];
};
