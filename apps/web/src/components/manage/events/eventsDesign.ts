import {
  DEFAULT_EVENT_CARD_ASPECT_RATIO,
  DEFAULT_EVENT_COLUMNS,
  DEFAULT_EVENT_FULL_BACKGROUND_IMAGE,
  DEFAULT_EVENT_PAGE_IMAGE_ASPECT_RATIO,
  DEFAULT_EVENT_PAGE_IMAGE_PLACEMENT,
  DEFAULT_EVENT_SHOW_FEATURED_BACKDROP,
  DEFAULT_EVENT_SHOW_LOCATION_ON_CARDS,
  DEFAULT_EVENT_WEEK_START,
  DEFAULT_PAST_EVENTS_MODE,
  type EventAspectRatio,
  type EventImagePlacement,
  type EventsAgendaDesign,
  type EventsConfig,
  type EventPageDesign,
} from '@simple-site/interfaces';
import {
  resolveAgendaDesign,
  resolveEventPageDesign,
  type ResolvedAgendaDesign,
  type ResolvedEventPageDesign,
} from '../../../pages/events/eventDisplay';

/**
 * Pure draft ↔ stored converters of the two events design tabs. Drafts carry
 * every option RESOLVED (defaults filled in) so the forms are fully
 * controlled — the resolution itself is the public pages'
 * (`resolveAgendaDesign` / `resolveEventPageDesign`), so admin and rendering
 * can never disagree on a default; the `from*` converters keep only
 * deviations from the defaults, so a pristine tab persists nothing
 * (`undefined`).
 *
 * The three tabs of /manage/events own disjoint slices of the SAME stored
 * `events` object — the list owns `events`, Agenda design owns the section
 * texts and `design.agendaPage`, Event page design owns `design.eventPage`.
 * The `merge*` builders are what makes that safe: each rebuilds the whole
 * payload from a FRESH draft read, replacing only its own slice and carrying
 * everything else over verbatim, so no tab can clobber another.
 */

/**
 * i18n label of an aspect-ratio option (`16:9` →
 * `page.manage.events.design.aspect.16_9`) — both design tabs offer the same
 * ratios, so the mapping lives in one place.
 */
export const aspectLabelKey = (ratio: EventAspectRatio): string =>
  `page.manage.events.design.aspect.${ratio.replace(':', '_')}`;

/** i18n label of an illustration placement (`beside` → `…imagePlacement.beside`). */
export const placementLabelKey = (placement: EventImagePlacement): string =>
  `page.manage.events.design.imagePlacement.${placement}`;

export interface AgendaDesignDraft extends Omit<ResolvedAgendaDesign, 'pastEventsFromDate'> {
  /** Kept whatever the mode — switching away and back never loses the date ('' ↔ absent). */
  pastEventsFromDate: string;
}

export type EventPageDesignDraft = ResolvedEventPageDesign;

/**
 * The agenda sections' editable texts ('' ↔ absent). The featured block has
 * neither a heading nor an introduction — it opens the page visually.
 */
export interface SectionTextsDraft {
  upcomingTitle: string;
  pastTitle: string;
  upcomingHeader: string;
  pastHeader: string;
}

/** The stored fields the Agenda design tab owns besides `design.agendaPage`. */
const AGENDA_TEXT_FIELDS = ['upcomingTitle', 'pastTitle', 'upcomingHeader', 'pastHeader'] as const;

export const toAgendaDraft = (events: EventsConfig | undefined): AgendaDesignDraft => {
  const resolved = resolveAgendaDesign(events);
  return { ...resolved, pastEventsFromDate: resolved.pastEventsFromDate ?? '' };
};

export const fromAgendaDraft = (draft: AgendaDesignDraft): EventsAgendaDesign | undefined => {
  const design: EventsAgendaDesign = {};
  if (draft.pastEventsMode !== DEFAULT_PAST_EVENTS_MODE) design.pastEventsMode = draft.pastEventsMode;
  if (draft.pastEventsFromDate) design.pastEventsFromDate = draft.pastEventsFromDate;
  if (draft.cardAspectRatio !== DEFAULT_EVENT_CARD_ASPECT_RATIO) design.cardAspectRatio = draft.cardAspectRatio;
  if (draft.columns !== DEFAULT_EVENT_COLUMNS) design.columns = draft.columns;
  // Store the VALUE, never the literal that happens to be its opposite today:
  // flipping a DEFAULT_EVENT_* constant would otherwise silently persist the
  // wrong thing. The guard already proves it differs from the default.
  if (draft.showLocationOnCards !== DEFAULT_EVENT_SHOW_LOCATION_ON_CARDS) {
    design.showLocationOnCards = draft.showLocationOnCards;
  }
  if (draft.showFeaturedBackdrop !== DEFAULT_EVENT_SHOW_FEATURED_BACKDROP) {
    design.showFeaturedBackdrop = draft.showFeaturedBackdrop;
  }
  if (draft.weekStartsOn !== DEFAULT_EVENT_WEEK_START) design.weekStartsOn = draft.weekStartsOn;
  return Object.keys(design).length > 0 ? design : undefined;
};

export const toEventPageDraft = (events: EventsConfig | undefined): EventPageDesignDraft =>
  resolveEventPageDesign(events);

export const fromEventPageDraft = (draft: EventPageDesignDraft): EventPageDesign | undefined => {
  const design: EventPageDesign = {};
  // Both surfaces default to A4 now — a poster shown in its own ratio.
  if (draft.imageAspectRatio !== DEFAULT_EVENT_PAGE_IMAGE_ASPECT_RATIO) {
    design.imageAspectRatio = draft.imageAspectRatio;
  }
  if (draft.imagePlacement !== DEFAULT_EVENT_PAGE_IMAGE_PLACEMENT) design.imagePlacement = draft.imagePlacement;
  // Opt-in toggle: with the default off, only `true` is ever stored — but
  // store the value, so inverting the constant cannot invert what is written.
  if (draft.fullBackgroundImage !== DEFAULT_EVENT_FULL_BACKGROUND_IMAGE) {
    design.fullBackgroundImage = draft.fullBackgroundImage;
  }
  return Object.keys(design).length > 0 ? design : undefined;
};

/** The stored `design` block, or undefined when both surfaces are pristine. */
const composeDesign = (
  agendaPage: EventsAgendaDesign | undefined,
  eventPage: EventPageDesign | undefined,
): EventsConfig['design'] => {
  if (!agendaPage && !eventPage) return undefined;
  return { ...(agendaPage ? { agendaPage } : {}), ...(eventPage ? { eventPage } : {}) };
};

export const toTextsDraft = (events: EventsConfig | undefined): SectionTextsDraft => ({
  upcomingTitle: events?.upcomingTitle ?? '',
  pastTitle: events?.pastTitle ?? '',
  upcomingHeader: events?.upcomingHeader ?? '',
  pastHeader: events?.pastHeader ?? '',
});

/** The stored shape of the texts: trimmed, empty ones dropped entirely. */
export const fromTextsDraft = (draft: SectionTextsDraft): Partial<EventsConfig> => {
  const entries = (Object.entries(draft) as [keyof SectionTextsDraft, string][])
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value.length > 0);
  return Object.fromEntries(entries) as Partial<EventsConfig>;
};

/**
 * The payload an Agenda-design save writes: the fresh draft with the section
 * texts and `design.agendaPage` replaced by this tab's state. A text cleared
 * in the form is DROPPED from the payload (the four fields are rewritten from
 * scratch, never merged), while the list's events and the other tab's
 * `design.eventPage` are carried over untouched.
 */
export const mergeAgendaDraft = (
  fresh: EventsConfig | undefined,
  agenda: AgendaDesignDraft,
  texts: SectionTextsDraft,
): EventsConfig => {
  // Start from the fresh draft so fields no tab knows about still survive,
  // then clear this tab's own ones — they are rewritten, never merged.
  const base: EventsConfig = { ...(fresh ?? { events: [] }) };
  for (const field of AGENDA_TEXT_FIELDS) delete base[field];
  delete base.design;
  const design = composeDesign(fromAgendaDraft(agenda), fresh?.design?.eventPage);
  return {
    ...base,
    events: fresh?.events ?? [],
    ...fromTextsDraft(texts),
    ...(design ? { design } : {}),
  };
};

/**
 * The payload an Event-page-design save writes: the fresh draft with
 * `design.eventPage` replaced by this tab's state, everything else — events,
 * section texts, `design.agendaPage` — carried over untouched.
 */
export const mergeEventPageDraft = (
  fresh: EventsConfig | undefined,
  page: EventPageDesignDraft,
): EventsConfig => {
  const base: EventsConfig = { ...(fresh ?? { events: [] }) };
  delete base.design;
  const design = composeDesign(fresh?.design?.agendaPage, fromEventPageDraft(page));
  return {
    ...base,
    events: fresh?.events ?? [],
    ...(design ? { design } : {}),
  };
};
