import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Button, Container, Divider, Drawer, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TuneIcon from '@mui/icons-material/Tune';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  eventDescriptionKey,
  eventLocationKey,
  eventNameKey,
  type SiteEvent,
} from '@simple-site/interfaces';
import { NotFoundPage } from '../error/NotFoundPage';
import { Loading } from '../../components';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { buildEventCalendar } from './eventCalendar';
import { defaultSearchFromDay, searchEvents, type EventSearchCriteria } from './eventSearch';
import { resolveAgendaDesign } from './eventDisplay';
import { EventCalendarPanel } from './EventCalendarPanel';
import { EventSearchBoundChips, EventSearchMonthFields, EventSearchQueryField } from './EventSearchFilters';
import { EventSearchRow } from './EventSearchRow';

/** Width of the open calendar panel on a wide screen. */
const PANEL_WIDTH = '19rem';

/** Minimum size of anything the visitor taps. */
const TOUCH_TARGET = 44;

/**
 * Public /events/search — the agenda's ACTIVE mode: the visitor states what
 * they are looking for instead of reading what the agenda chose to show.
 * Everything from today onwards is listed in calendar order, soonest first;
 * past events are not in the way but the bounds reach them.
 *
 * Two views of the same list, kept in sync: the rows, and a calendar panel
 * where every day carrying an event is reachable. Pointing at a row marks its
 * days in the calendar; pointing at a day scrolls the list to that event. The
 * panel only holds the months the list occupies — never beyond the last event
 * — and is disabled while the list is empty.
 *
 * A phone gets the same two views without the clutter: the list IS the page
 * (it scrolls with the window), and the filters and the calendar each open in
 * a bottom sheet, where a tap on a day does what hovering does on a desktop.
 */
export const EventsSearchPage: React.FC = () => {
  const intl = useIntl();
  const flags = useFeatureFlags();
  const siteContext = useSiteConfig();
  const { siteThemeConfig } = useAppTheme();
  if (!siteContext) throw new Error('EventsSearchPage must be called within <SiteConfigProvider>');
  const { config } = siteContext;

  const enabled = Boolean(flags?.events);
  useDocumentTitle(
    enabled
      ? `${intl.formatMessage({ id: 'page.events.search.title' })} – ${siteThemeConfig.siteName}`
      : undefined,
  );

  const events = useMemo(() => config.events?.events ?? [], [config.events]);
  const design = resolveAgendaDesign(config.events);
  // One instant for the whole render: the default bound and the list must not
  // disagree about what "today" is.
  const now = useMemo(() => new Date(), []);

  const [criteria, setCriteria] = useState<EventSearchCriteria>(() => ({
    query: '',
    from: defaultSearchFromDay(events, now),
    to: '',
  }));
  const update = useCallback(
    (next: Partial<EventSearchCriteria>) => setCriteria((prev) => ({ ...prev, ...next })),
    [],
  );

  /** The texts the query runs over: what the VISITOR reads, translations included. */
  const texts = useCallback(
    (event: SiteEvent): string[] => [
      intl.formatMessage({ id: eventNameKey(event.slug), defaultMessage: event.name }),
      event.description
        ? intl.formatMessage({ id: eventDescriptionKey(event.slug), defaultMessage: event.description })
        : '',
      intl.formatMessage({ id: eventLocationKey(event.slug), defaultMessage: event.location }),
    ],
    [intl],
  );

  const rows = useMemo(() => searchEvents(events, criteria, texts), [events, criteria, texts]);
  const months = useMemo(() => buildEventCalendar(rows, design.weekStartsOn), [rows, design.weekStartsOn]);

  /** The event both views are pointing at, from either side. */
  const [pointed, setPointed] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheet, setSheet] = useState<'filters' | 'calendar' | null>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());

  /** A day was pointed at: mark the event and bring its row into view. */
  const pickEvent = useCallback((slug: string) => {
    setPointed(slug);
    rowRefs.current.get(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (flags === null) return <Loading />;
  if (!flags.events) return <NotFoundPage />;
  // Nothing at all to explore — the agenda itself 404s in that case too.
  if (events.length === 0) return <NotFoundPage />;

  const calendarEnabled = rows.length > 0;
  const calendar = (
    <EventCalendarPanel
      months={months}
      weekStartsOn={design.weekStartsOn}
      highlighted={pointed}
      onPickEvent={(slug) => {
        pickEvent(slug);
        // On a phone the sheet covers the list it just scrolled.
        setSheet(null);
      }}
    />
  );

  return (
    <Container maxWidth={siteThemeConfig.containerMaxWidth ?? 'lg'} sx={{ py: { xs: 3, md: 5 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        <FormattedMessage id="page.events.search.title" />
      </Typography>

      <Stack spacing={2} sx={{ mb: { xs: 2, md: 3 } }}>
        <EventSearchQueryField value={criteria.query} onChange={(query) => update({ query })} />
        {/* Wide screens show the bounds themselves; a phone keeps them in the
            sheet and shows what is applied as chips. */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <EventSearchMonthFields criteria={criteria} onChange={update} />
        </Box>
        <Stack direction="row" spacing={1} sx={{ display: { xs: 'flex', md: 'none' } }}>
          <Button
            variant="outlined"
            startIcon={<TuneIcon />}
            onClick={() => setSheet('filters')}
            sx={{ minHeight: TOUCH_TARGET, flex: 1 }}
          >
            <FormattedMessage id="page.events.search.dates" />
          </Button>
          <Button
            variant="outlined"
            startIcon={<CalendarMonthIcon />}
            onClick={() => setSheet('calendar')}
            disabled={!calendarEnabled}
            sx={{ minHeight: TOUCH_TARGET, flex: 1 }}
          >
            <FormattedMessage id="page.events.search.calendar" />
          </Button>
        </Stack>
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <EventSearchBoundChips criteria={criteria} onChange={update} />
        </Box>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: panelOpen ? `minmax(0, 1fr) ${PANEL_WIDTH}` : 'minmax(0, 1fr) auto' },
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
        }}
      >
        {rows.length === 0 ? (
          <Typography variant="body1" color="text.secondary">
            <FormattedMessage id="page.events.search.empty" />
          </Typography>
        ) : (
          <Stack
            spacing={2}
            data-testid="event-search-list"
            sx={{
              // The list owns its scrolling beside the sticky panel; on a phone
              // it is the page that scrolls, which is what a search should feel like.
              maxHeight: { md: 'calc(100vh - 16rem)' },
              overflowY: { md: 'auto' },
              pr: { md: 1 },
            }}
          >
            {rows.map((event) => (
              <Box
                key={event.slug}
                ref={(node: HTMLElement | null) => {
                  if (node) rowRefs.current.set(event.slug, node);
                  else rowRefs.current.delete(event.slug);
                }}
                // Anchored by the scroll: a little room above keeps the row
                // from touching the top edge of the list.
                sx={{ scrollMarginTop: 8 }}
              >
                <EventSearchRow event={event} highlighted={pointed === event.slug} onHover={setPointed} />
              </Box>
            ))}
          </Stack>
        )}

        {/* Wide screens: a retractable panel beside the list. Collapsed, it
            keeps only the handle that brings it back. */}
        <Box component="aside" sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 16 }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent={panelOpen ? 'space-between' : 'center'}>
            {panelOpen && (
              <Typography variant="subtitle1" component="h2">
                <FormattedMessage id="page.events.search.calendar" />
              </Typography>
            )}
            <Tooltip
              title={intl.formatMessage({
                id: panelOpen ? 'page.events.search.calendar.hide' : 'page.events.search.calendar.show',
              })}
            >
              <IconButton
                onClick={() => setPanelOpen((open) => !open)}
                disabled={!calendarEnabled && !panelOpen}
                aria-label={intl.formatMessage({
                  id: panelOpen ? 'page.events.search.calendar.hide' : 'page.events.search.calendar.show',
                })}
                aria-expanded={panelOpen}
                sx={{ width: TOUCH_TARGET, height: TOUCH_TARGET }}
              >
                {panelOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
          {panelOpen && (
            <Box sx={{ mt: 1 }}>
              {calendarEnabled ? (
                calendar
              ) : (
                <Typography variant="body2" color="text.secondary">
                  <FormattedMessage id="page.events.search.calendar.empty" />
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Phone: the filters and the calendar each come up as a sheet over the
          list, so neither takes room from it while the visitor is scrolling. */}
      <Drawer anchor="bottom" open={sheet !== null} onClose={() => setSheet(null)}>
        <Box sx={{ p: 2, maxHeight: '80vh', overflowY: 'auto' }}>
          <Typography variant="subtitle1" component="h2" gutterBottom>
            <FormattedMessage id={sheet === 'calendar' ? 'page.events.search.calendar' : 'page.events.search.dates'} />
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {sheet === 'calendar' ? (
            calendar
          ) : (
            <Stack spacing={2}>
              <EventSearchMonthFields criteria={criteria} onChange={update} />
              <Button
                onClick={() => {
                  update({ from: '', to: '' });
                  setSheet(null);
                }}
                sx={{ minHeight: TOUCH_TARGET, alignSelf: 'flex-start' }}
              >
                <FormattedMessage id="page.events.search.dates.clear" />
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>
    </Container>
  );
};
