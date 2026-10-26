import React from 'react';
import { Box, Typography } from '@mui/material';
import { useIntl } from 'react-intl';
import type { EventWeekStart } from '@simple-site/interfaces';
import { weekdayColumns, type CalendarMonth } from './eventCalendar';

const MONTH_HEADING: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };

/** A reference week whose days are only used to name the seven columns. */
const WEEKDAY_SAMPLE = (weekday: number): Date => new Date(2024, 0, 7 + weekday);

/**
 * The search page's calendar: one grid per month the listed events occupy,
 * seven columns in the design's week order. A day carrying an event is
 * reachable — pointing at it (hover, focus or tap) scrolls the list to that
 * event, which is what makes the panel a way of navigating rather than a
 * picture. Days of the event the visitor is pointing at in the LIST are
 * marked apart (secondary), so the two views always say which event they are
 * talking about.
 *
 * Purely a view: the months come from {@link buildEventCalendar}, so what is
 * on screen is exactly what the filtered list holds.
 */
export const EventCalendarPanel: React.FC<{
  months: readonly CalendarMonth[];
  weekStartsOn: EventWeekStart;
  /** Slug the list is pointing at, marked apart from the other event days. */
  highlighted: string | null;
  /** A day was pointed at: focus that event in the list. */
  onPickEvent: (slug: string) => void;
}> = ({ months, weekStartsOn, highlighted, onPickEvent }) => {
  const intl = useIntl();
  const columns = weekdayColumns(weekStartsOn);

  return (
    <Box data-testid="event-calendar" sx={{ display: 'grid', gap: 3 }}>
      {months.map((month) => (
        <Box key={month.key} component="section">
          <Typography variant="subtitle2" component="h3" gutterBottom>
            {intl.formatDate(new Date(month.year, month.month, 1), MONTH_HEADING)}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
            {columns.map((weekday) => (
              <Typography
                key={weekday}
                variant="caption"
                align="center"
                color="text.secondary"
                aria-hidden
                sx={{ fontWeight: 600 }}
              >
                {intl.formatDate(WEEKDAY_SAMPLE(weekday), { weekday: 'narrow' })}
              </Typography>
            ))}
            {month.cells.map((cell, index) => {
              if (!cell) return <Box key={`pad-${month.key}-${index}`} aria-hidden />;
              const [slug] = cell.slugs;
              const marked = cell.slugs.includes(highlighted ?? '');
              const dayLabel = intl.formatDate(new Date(`${cell.date}T00:00:00`), {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });
              return (
                <Box
                  key={cell.date}
                  data-testid={slug ? 'calendar-day-event' : 'calendar-day'}
                  data-date={cell.date}
                  data-marked={marked || undefined}
                  // Only a day holding an event does anything, so only that one
                  // is a button: an inert day stays plain text.
                  component={slug ? 'button' : 'div'}
                  type={slug ? 'button' : undefined}
                  aria-label={slug ? dayLabel : undefined}
                  onMouseEnter={slug ? () => onPickEvent(slug) : undefined}
                  onFocus={slug ? () => onPickEvent(slug) : undefined}
                  onClick={slug ? () => onPickEvent(slug) : undefined}
                  sx={{
                    aspectRatio: '1 / 1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    border: 0,
                    p: 0,
                    font: 'inherit',
                    typography: 'caption',
                    cursor: slug ? 'pointer' : 'default',
                    ...(slug
                      ? {
                          bgcolor: marked ? 'secondary.main' : 'primary.main',
                          color: marked ? 'secondary.contrastText' : 'primary.contrastText',
                          fontWeight: 700,
                        }
                      : { bgcolor: 'transparent', color: 'text.disabled' }),
                  }}
                >
                  {cell.day}
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
