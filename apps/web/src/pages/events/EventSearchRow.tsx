import React from 'react';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useTheme } from '@mui/material/styles';
import { eventDescriptionKey, eventLocationKey, eventNameKey, type SiteEvent } from '@simple-site/interfaces';
import { brandGradient } from '../../features/theme/muiTheme';
import { eventEnd, eventStart, isMultiDay } from './eventDates';
import { aspectRatioCss, eventCardImageSrcSet, eventCardImageUrl, eventRoute } from './eventDisplay';

const ROW_DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

/** Fixed row height from `md` up — a list of equal rows reads as a list. */
export const SEARCH_ROW_HEIGHT = 208;

/** The illustration's delivery hint: a poster-width column, never the page. */
const ROW_IMAGE_SIZES = '(min-width: 900px) 160px, 100vw';

/** Lines of description a row shows before the text is cut with an ellipsis. */
const DESCRIPTION_LINES = 3;

/**
 * One row of the search list: the whole surface navigates to the event's page.
 * From `md` up it is HORIZONTAL across the content width and of fixed height —
 * the illustration (A4 poster) on the left, every filterable field in a panel
 * on the right: name, dates, location, then the description cut with an
 * ellipsis rather than pushing the next row out of reach. A phone stacks the
 * two, since a 160px-wide poster beside text would leave neither any room.
 *
 * `highlighted` marks the row the calendar panel points at: an outline, never
 * a recolouring, so the state does not depend on colour perception and the
 * row's own artwork is left alone.
 */
export const EventSearchRow: React.FC<{
  event: SiteEvent;
  highlighted: boolean;
  onHover: (slug: string | null) => void;
}> = ({ event, highlighted, onHover }) => {
  const intl = useIntl();
  const theme = useTheme();

  const dates = isMultiDay(event)
    ? intl.formatMessage(
        { id: 'page.events.card.range' },
        {
          startDate: intl.formatDate(eventStart(event), ROW_DATE),
          endDate: intl.formatDate(eventEnd(event), ROW_DATE),
        },
      )
    : intl.formatDate(eventStart(event), ROW_DATE);

  return (
    <Card
      elevation={2}
      onMouseEnter={() => onHover(event.slug)}
      onMouseLeave={() => onHover(null)}
      sx={{
        borderRadius: 3,
        // The ring is a BORDER, always present and only recoloured: an outline
        // is drawn outside the box, where the scroll container clips it on the
        // edges, and adding one on hover would shift every row by two pixels.
        border: '2px solid',
        borderColor: highlighted ? 'secondary.main' : 'transparent',
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={eventRoute(event.slug)}
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'stretch' },
          height: { md: SEARCH_ROW_HEIGHT },
        }}
      >
        <Box
          data-testid="search-row-image"
          sx={{
            flexShrink: 0,
            // A4 poster: its height fills the row on desktop, its width the
            // card on a phone — capped so the texts stay on screen.
            aspectRatio: aspectRatioCss('A4'),
            height: { md: '100%' },
            width: { xs: '100%', md: 'auto' },
            maxHeight: { xs: '40vh', md: 'none' },
            overflow: 'hidden',
          }}
        >
          {event.imageUrl ? (
            <Box
              component="img"
              src={eventCardImageUrl(event.imageUrl)}
              srcSet={eventCardImageSrcSet(event.imageUrl)}
              sizes={ROW_IMAGE_SIZES}
              alt=""
              loading="lazy"
              decoding="async"
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <Box sx={{ width: '100%', height: '100%', background: brandGradient(theme) }} />
          )}
        </Box>

        <Stack
          spacing={0.5}
          sx={{
            flex: 1,
            minWidth: 0,
            p: { xs: 2, md: 2.5 },
            // The row's height is fixed: the panel owns the overflow, so a long
            // description is cut instead of stretching the list.
            overflow: 'hidden',
          }}
        >
          <Typography variant="h6" component="h3" sx={{ lineHeight: 1.25 }} noWrap>
            <FormattedMessage id={eventNameKey(event.slug)} defaultMessage={event.name} />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dates}
          </Typography>
          {/* Plain text, not a maps link: the row itself is the link, and a
              link inside a link is unusable with a keyboard or a screen reader. */}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary', minWidth: 0 }}>
            <PlaceOutlinedIcon fontSize="small" aria-hidden />
            <Typography variant="body2" noWrap>
              <FormattedMessage id={eventLocationKey(event.slug)} defaultMessage={event.location} />
            </Typography>
          </Stack>
          {event.description?.trim() && (
            <Typography
              variant="body2"
              sx={{
                // The raw markdown is shown as plain text on purpose: a teaser
                // is one paragraph of prose, not a formatted document.
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: DESCRIPTION_LINES,
                overflow: 'hidden',
              }}
            >
              <FormattedMessage id={eventDescriptionKey(event.slug)} defaultMessage={event.description} />
            </Typography>
          )}
        </Stack>
      </CardActionArea>
    </Card>
  );
};
