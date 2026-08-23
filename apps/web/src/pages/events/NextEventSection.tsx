import React from 'react';
import { Box, Link, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Link as RouterLink } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useTheme } from '@mui/material/styles';
import { eventDescriptionKey, eventNameKey, type SiteEvent } from '@simple-site/interfaces';
import { Markdown } from '../../components';
import { EventDateSentence } from './EventDateSentence';
import { EventLocationLink } from './EventLocationLink';
import { eventHeaderImageUrl, eventRoute } from './eventDisplay';

/**
 * The agenda's featured block — the next (or ongoing) event, laid out like a
 * hero section: the illustration on the left third, the FULL presentation on
 * the right two thirds (name, date sentence, location, the whole markdown
 * description, then the website link). Phones stack image over content. The
 * section itself is omitted by the page when no event is ongoing or upcoming.
 */
export const NextEventSection: React.FC<{ event: SiteEvent; now: Date }> = ({ event, now }) => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const tertiary = theme.palette.tertiary?.main ?? primary;

  return (
    <Grid container spacing={{ xs: 3, md: 5 }} alignItems="flex-start">
      <Grid size={{ xs: 12, md: 4 }}>
        <Box sx={{ aspectRatio: '4 / 3', overflow: 'hidden', borderRadius: 3 }}>
          {event.imageUrl ? (
            <Box
              component="img"
              src={eventHeaderImageUrl(event.imageUrl)}
              alt=""
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
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h3">
            <Link component={RouterLink} to={eventRoute(event.slug)} underline="hover" color="inherit">
              <FormattedMessage id={eventNameKey(event.slug)} defaultMessage={event.name} />
            </Link>
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            <EventDateSentence event={event} now={now} />
          </Typography>
          <Box sx={{ typography: 'body1' }}>
            <EventLocationLink event={event} />
          </Box>
          {event.description?.trim() && (
            <Box sx={{ '& p': { typography: 'body1' }, '& > :first-of-type': { mt: 0 }, '& > :last-child': { mb: 0 } }}>
              <FormattedMessage id={eventDescriptionKey(event.slug)} defaultMessage={event.description}>
                {(message) => <Markdown>{String(message)}</Markdown>}
              </FormattedMessage>
            </Box>
          )}
          {event.websiteUrl && (
            <Link
              href={event.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, alignSelf: 'flex-start' }}
            >
              <FormattedMessage id="page.events.website" />
            </Link>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
};
