import React from 'react';
import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useTheme } from '@mui/material/styles';
import { eventNameKey, type EventAspectRatio, type SiteEvent } from '@simple-site/interfaces';
import { isMultiDay, eventEnd, eventStart } from './eventDates';
import { aspectRatioCss, eventCardImageUrl, eventRoute } from './eventDisplay';
import { EventLocationLink } from './EventLocationLink';

const CARD_DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

/**
 * One agenda card: illustration (or a brand-gradient placeholder), name,
 * date(s) in short 2-digit format and — per the design — the location. The
 * whole card navigates to the event's page; the location is a Google Maps
 * link and therefore sits OUTSIDE the `CardActionArea` (nested interactive
 * elements are invalid HTML and break keyboard navigation).
 */
export const EventCard: React.FC<{
  event: SiteEvent;
  aspectRatio: EventAspectRatio;
  showLocation: boolean;
}> = ({ event, aspectRatio, showLocation }) => {
  const intl = useIntl();
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const tertiary = theme.palette.tertiary?.main ?? primary;

  const dates = isMultiDay(event)
    ? intl.formatMessage(
        { id: 'page.events.card.range' },
        { startDate: intl.formatDate(eventStart(event), CARD_DATE), endDate: intl.formatDate(eventEnd(event), CARD_DATE) },
      )
    : intl.formatDate(eventStart(event), CARD_DATE);

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
      <CardActionArea component={RouterLink} to={eventRoute(event.slug)} sx={{ flexGrow: 1, alignItems: 'stretch' }}>
        <Box sx={{ aspectRatio: aspectRatioCss(aspectRatio), overflow: 'hidden' }}>
          {event.imageUrl ? (
            <Box
              component="img"
              src={eventCardImageUrl(event.imageUrl)}
              alt=""
              loading="lazy"
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 50%, ${tertiary} 100%)`,
              }}
            />
          )}
        </Box>
        <CardContent sx={{ pb: showLocation ? 1 : 2 }}>
          <Typography variant="h6" component="h3" sx={{ mb: 0.5 }}>
            <FormattedMessage id={eventNameKey(event.slug)} defaultMessage={event.name} />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dates}
          </Typography>
        </CardContent>
      </CardActionArea>
      {showLocation && (
        <Box sx={{ px: 2, pb: 1.5, color: 'text.secondary', typography: 'body2' }}>
          <EventLocationLink event={event} />
        </Box>
      )}
    </Card>
  );
};
