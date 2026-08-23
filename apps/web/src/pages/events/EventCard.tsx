import React from 'react';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useTheme } from '@mui/material/styles';
import { eventLocationKey, eventNameKey, type EventAspectRatio, type SiteEvent } from '@simple-site/interfaces';
import { isMultiDay, eventEnd, eventStart } from './eventDates';
import { aspectRatioCss, eventCardImageUrl, eventRoute } from './eventDisplay';

const CARD_DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

/**
 * One agenda card (upcoming and past sections alike): an ELEVATED card whose
 * whole surface navigates to the event's page. The illustration (a poster,
 * A4 by default) fills the card; the name and date(s) sit ON it, over a
 * frosted (blurred, darkened) strip so they read on any artwork; the
 * location — plain text, per the design toggle — sits under the
 * illustration. No illustration → the brand gradient placeholder.
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
    <Card elevation={4} sx={{ borderRadius: 3 }}>
      <CardActionArea component={RouterLink} to={eventRoute(event.slug)}>
        <Box sx={{ position: 'relative', aspectRatio: aspectRatioCss(aspectRatio), overflow: 'hidden' }}>
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
          {/* Frosted strip: name + date over the artwork, readable on anything. */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              px: 2,
              py: 1.5,
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(15, 15, 15, 0.45)',
              color: '#fff',
            }}
          >
            <Typography variant="h6" component="h3" sx={{ lineHeight: 1.25 }}>
              <FormattedMessage id={eventNameKey(event.slug)} defaultMessage={event.name} />
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {dates}
            </Typography>
          </Box>
        </Box>
        {showLocation && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ px: 2, py: 1.5, color: 'text.secondary', minWidth: 0 }}>
            <PlaceOutlinedIcon fontSize="small" aria-hidden />
            <Typography variant="body2" noWrap>
              <FormattedMessage id={eventLocationKey(event.slug)} defaultMessage={event.location} />
            </Typography>
          </Stack>
        )}
      </CardActionArea>
    </Card>
  );
};
