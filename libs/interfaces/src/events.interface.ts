import { z } from 'zod';
import { UrlOrPathSchema } from './url.interface.js';
import type { I18nEntry } from './sections/section.interface.js';

/**
 * Events — the agenda feature: a list of dated events stored INSIDE the site
 * config under the optional `events` attribute (draft → publish lifecycle,
 * like the gallery — unlike the team/contact blobs). The whole surface —
 * config interpretation, the public /events routes, the menu entry and the
 * admin editor — is gated by the FEATURE_EVENTS flag.
 *
 * The public agenda page (/events) places events automatically from their
 * dates: the next (or ongoing) event is featured first, later events follow
 * as cards, past events close the page grouped by year. Each event also owns
 * a detail page at `/events/<slug>`.
 */

/**
 * Event slugs: lowercase kebab-case, immutable once persisted — the slug is
 * the event's public URL segment (`/events/<slug>`) AND its i18n-key segment
 * (`events.<slug>.*`), so changing it would break both bookmarks and stored
 * translations. No underscores/uppercase, so a slug can never collide with
 * the fixed `events.*` keys (`menuTitle`, `nextTitle`…), which all contain
 * an uppercase letter or sit on a different depth.
 */
export const EVENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const EVENT_SLUG_MAX_LENGTH = 64;

/**
 * Instants are stored as UTC ISO strings (`2026-08-16T17:00:00.000Z` — the
 * exact `Date.prototype.toISOString()` shape). Rendering and day-level
 * classification happen in the VIEWER's timezone; the admin edits through
 * `<input type="datetime-local">` in their own timezone, converted on save.
 * Timezone-less or offset strings are rejected: a single canonical form keeps
 * string comparison and parsing unambiguous.
 */
const UtcDateTimeSchema = z.iso.datetime();

/**
 * Aspect ratios offered for event imagery (cards and detail header). `A4` is
 * the portrait print-poster ratio (210 × 297) — event illustrations are
 * mostly digital versions of printed posters, so it is the card default.
 */
export const EVENT_ASPECT_RATIOS = ['A4', '16:9', '4:3', '1:1'] as const;
export const EventAspectRatioSchema = z.enum(EVENT_ASPECT_RATIOS);
export type EventAspectRatio = z.infer<typeof EventAspectRatioSchema>;
export const DEFAULT_EVENT_CARD_ASPECT_RATIO: EventAspectRatio = 'A4';
export const DEFAULT_EVENT_PAGE_IMAGE_ASPECT_RATIO: EventAspectRatio = '16:9';

/**
 * Visibility of the agenda's past-events section: `all` shows every past
 * event, `none` hides the section entirely, `from` only keeps events starting
 * on/after `pastEventsFromDate` (e.g. January 1st to show the current year).
 */
export const PAST_EVENTS_MODES = ['all', 'none', 'from'] as const;
export const PastEventsModeSchema = z.enum(PAST_EVENTS_MODES);
export type PastEventsMode = z.infer<typeof PastEventsModeSchema>;
export const DEFAULT_PAST_EVENTS_MODE: PastEventsMode = 'all';

/** Desktop column count of the card grids — narrow screens always collapse. */
export const EVENT_COLUMNS_MIN = 2;
export const EVENT_COLUMNS_MAX = 4;
export const DEFAULT_EVENT_COLUMNS = 3;

export const SiteEventSchema = z
  .object({
    /** The immutable id — see {@link EVENT_SLUG_PATTERN}. */
    slug: z.string().min(1).max(EVENT_SLUG_MAX_LENGTH).regex(EVENT_SLUG_PATTERN),
    /** Translation DEFAULT — per-language values live under `events.<slug>.name`. */
    name: z.string().min(1),
    /**
     * Optional presentation (markdown), shown on the detail page — a
     * translation DEFAULT (key: `events.<slug>.description`).
     */
    description: z.string().optional(),
    /** Public URL of the illustration, typically picked from the media library. */
    imageUrl: UrlOrPathSchema.optional(),
    /** When the event starts — UTC instant, see {@link UtcDateTimeSchema}. */
    startDateTime: UtcDateTimeSchema,
    /** When the event ends; absent → single-day event. */
    endDateTime: UtcDateTimeSchema.optional(),
    /**
     * The venue address, displayed as-is and used as the Google Maps search
     * query — a translation DEFAULT (key: `events.<slug>.location`).
     */
    location: z.string().min(1),
    /** The event's own website, opened in a new tab; absent → no link shown. */
    websiteUrl: UrlOrPathSchema.optional(),
  })
  .refine(
    (event) =>
      !event.endDateTime || new Date(event.endDateTime).getTime() >= new Date(event.startDateTime).getTime(),
    { message: 'The end must not be before the start', path: ['endDateTime'] },
  );

export type SiteEvent = z.infer<typeof SiteEventSchema>;

export const EventsAgendaDesignSchema = z.object({
  /** Absent → {@link DEFAULT_PAST_EVENTS_MODE}, keeping stored configs minimal. */
  pastEventsMode: PastEventsModeSchema.optional(),
  /**
   * Cut-off date of the `from` mode (`YYYY-MM-DD`): past events starting
   * before it are hidden. Kept when the mode changes so switching back never
   * loses the value; meaningless outside `from`.
   */
  pastEventsFromDate: z.iso.date().optional(),
  /** Ratio imposed on the card illustrations. Absent → {@link DEFAULT_EVENT_CARD_ASPECT_RATIO}. */
  cardAspectRatio: EventAspectRatioSchema.optional(),
  /** Desktop column count of the card grids. Absent → {@link DEFAULT_EVENT_COLUMNS}. */
  columns: z.number().int().min(EVENT_COLUMNS_MIN).max(EVENT_COLUMNS_MAX).optional(),
  /** Whether cards show the event's location. Absent → shown (only `false` is stored). */
  showLocationOnCards: z.boolean().optional(),
});

export type EventsAgendaDesign = z.infer<typeof EventsAgendaDesignSchema>;

export const EventsPageDesignSchema = z.object({
  /** Ratio of the detail page's header illustration. Absent → {@link DEFAULT_EVENT_PAGE_IMAGE_ASPECT_RATIO}. */
  imageAspectRatio: EventAspectRatioSchema.optional(),
});

export type EventsPageDesign = z.infer<typeof EventsPageDesignSchema>;

export const EventsConfigSchema = z
  .object({
    /** Every event, in any order — the pages place them from their dates. */
    events: z.array(SiteEventSchema).default([]),
    /**
     * The upcoming/past sections' headings — translation DEFAULTS (keys
     * `events.upcomingTitle|pastTitle`); absent/empty → the app's bundled
     * `page.events.*Title` labels. The featured section has no heading.
     */
    upcomingTitle: z.string().optional(),
    pastTitle: z.string().optional(),
    /**
     * Optional introduction (markdown) rendered under each section heading —
     * translation DEFAULTS (keys `events.nextHeader|upcomingHeader|pastHeader`);
     * absent/empty → nothing rendered.
     */
    nextHeader: z.string().optional(),
    upcomingHeader: z.string().optional(),
    pastHeader: z.string().optional(),
    design: z
      .object({
        agendaPage: EventsAgendaDesignSchema.optional(),
        eventPage: EventsPageDesignSchema.optional(),
      })
      .optional(),
  })
  .superRefine((config, ctx) => {
    const seen = new Set<string>();
    config.events.forEach((event, index) => {
      if (seen.has(event.slug)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate event slug "${event.slug}"`,
          path: ['events', index, 'slug'],
        });
      }
      seen.add(event.slug);
    });
  });

export type EventsConfig = z.infer<typeof EventsConfigSchema>;

// ---------------------------------------------------------------------------
// i18n keys
//
// Events live in the site config, but their keys are collected by a dedicated
// collector (not `collectI18nEntries`) so the Translations editor can merge
// them only while the feature flag is on — mirroring the gallery collector.
// Key layout:
//  - `events.upcomingTitle|pastTitle`              the agenda section headings
//  - `events.nextHeader|upcomingHeader|pastHeader` the section introductions
//  - `events.<slug>.name|description|location`    per-event texts (slug-scoped,
//    so reordering the list never re-maps translations — the positional-key
//    tradeoff the gallery items accepted does not apply here)
// A slug segment may contain `-` (see EVENT_SLUG_PATTERN); the translation
// dictionary's key charset allows it. The events menu entry's own label is the
// feature key `events.menuTitle`, handled like every feature entry.
// ---------------------------------------------------------------------------

/** i18n scope of the events feature. */
export const EVENTS_SCOPE = 'events';

export const EVENTS_UPCOMING_TITLE_KEY = `${EVENTS_SCOPE}.upcomingTitle`;
export const EVENTS_PAST_TITLE_KEY = `${EVENTS_SCOPE}.pastTitle`;
export const EVENTS_NEXT_HEADER_KEY = `${EVENTS_SCOPE}.nextHeader`;
export const EVENTS_UPCOMING_HEADER_KEY = `${EVENTS_SCOPE}.upcomingHeader`;
export const EVENTS_PAST_HEADER_KEY = `${EVENTS_SCOPE}.pastHeader`;

/** i18n scope of one event (`events.<slug>`). */
export const eventScope = (slug: string): string => `${EVENTS_SCOPE}.${slug}`;

/** i18n key of an event's name. */
export const eventNameKey = (slug: string): string => `${eventScope(slug)}.name`;

/** i18n key of an event's description (markdown). */
export const eventDescriptionKey = (slug: string): string => `${eventScope(slug)}.description`;

/** i18n key of an event's location (address). */
export const eventLocationKey = (slug: string): string => `${eventScope(slug)}.location`;

/**
 * Translatable (key → default value) pairs the events config references.
 * Merged into the Translations editor's expected keys while FEATURE_EVENTS is
 * on. Slug-scoped keys survive any reordering of the list.
 */
export const collectEventsI18nEntries = (config: EventsConfig): I18nEntry[] => {
  const entries: I18nEntry[] = [];
  const add = (key: string, value: string | undefined): void => {
    if (value?.trim()) entries.push({ key, defaultValue: value });
  };
  add(EVENTS_UPCOMING_TITLE_KEY, config.upcomingTitle);
  add(EVENTS_PAST_TITLE_KEY, config.pastTitle);
  add(EVENTS_NEXT_HEADER_KEY, config.nextHeader);
  add(EVENTS_UPCOMING_HEADER_KEY, config.upcomingHeader);
  add(EVENTS_PAST_HEADER_KEY, config.pastHeader);
  for (const event of config.events) {
    add(eventNameKey(event.slug), event.name);
    add(eventDescriptionKey(event.slug), event.description);
    add(eventLocationKey(event.slug), event.location);
  }
  return entries;
};
