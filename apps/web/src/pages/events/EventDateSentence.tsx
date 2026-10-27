import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { SiteEvent } from '@simple-site/interfaces';
import { eventEnd, eventStart, featuredDateRule } from './eventDates';

/**
 * The long-format date sentence of a featured event / detail page, following
 * the agenda's four rules (see `featuredDateRule`). Dates render with the
 * long options (weekday + day + month + year) and times with hour:minute, in
 * the viewer's locale AND timezone — the stored instants are UTC.
 */
const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
const TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' };

export const EventDateSentence: React.FC<{ event: SiteEvent; now: Date }> = ({ event, now }) => {
  const intl = useIntl();
  const rule = featuredDateRule(event, now);
  const start = eventStart(event);
  const end = eventEnd(event);

  switch (rule) {
    case 'today':
      return (
        <FormattedMessage
          id="page.events.date.today"
          values={{ date: intl.formatDate(start, LONG_DATE), time: intl.formatTime(start, TIME) }}
        />
      );
    case 'single':
      return (
        <FormattedMessage
          id="page.events.date.single"
          values={{ date: intl.formatDate(start, LONG_DATE), time: intl.formatTime(start, TIME) }}
        />
      );
    case 'range':
      return (
        <FormattedMessage
          id="page.events.date.range"
          values={{ startDate: intl.formatDate(start, LONG_DATE), endDate: intl.formatDate(end, LONG_DATE) }}
        />
      );
    case 'until':
      return <FormattedMessage id="page.events.date.until" values={{ endDate: intl.formatDate(end, LONG_DATE) }} />;
  }
};
