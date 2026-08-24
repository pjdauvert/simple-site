import React from 'react';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useTheme } from '@mui/material/styles';
import { eventLocationKey, eventNameKey, type EventAspectRatio, type SiteEvent } from '@simple-site/interfaces';
import { brandGradient } from '../../features/theme/muiTheme';
import { isMultiDay, eventEnd, eventStart } from './eventDates';
import { aspectRatioCss, eventCardImageSrcSet, eventCardImageUrl, eventCardSizes, eventRoute } from './eventDisplay';

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
  columns: number;
  showLocation: boolean;
}> = ({ event, aspectRatio, columns, showLocation }) => {
  const intl = useIntl();
  const theme = useTheme();

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
              srcSet={eventCardImageSrcSet(event.imageUrl)}
              sizes={eventCardSizes(columns)}
              alt=""
              loading="lazy"
              decoding="async"
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                background: brandGradient(theme),
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
              // Dark enough for AA contrast with plain white text on any artwork,
              // light posters included (the blur softens but never darkens).
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'common.white',
            }}
          >
            <Typography variant="h6" component="h3" sx={{ lineHeight: 1.25 }}>
              <FormattedMessage id={eventNameKey(event.slug)} defaultMessage={event.name} />
            </Typography>
            <Typography variant="body2">{dates}</Typography>
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
