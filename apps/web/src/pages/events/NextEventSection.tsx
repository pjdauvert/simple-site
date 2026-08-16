import React from 'react';
import { Box, Button, Link, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useTheme } from '@mui/material/styles';
import { eventNameKey, type SiteEvent } from '@simple-site/interfaces';
import { EventDateSentence } from './EventDateSentence';
import { EventLocationLink } from './EventLocationLink';
import { eventHeaderImageUrl, eventRoute } from './eventDisplay';

/**
 * The agenda's featured block: the next (or ongoing) event, image beside the
 * content from `md` up, stacked on phones. The name and the details button
 * navigate to the event's page; location and website open externally.
 */
export const NextEventSection: React.FC<{ event: SiteEvent; now: Date }> = ({ event, now }) => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const tertiary = theme.palette.tertiary?.main ?? primary;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
        <Box sx={{ flex: { md: '0 0 45%' }, aspectRatio: '16 / 9', overflow: 'hidden' }}>
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
        <Stack spacing={1.5} sx={{ p: { xs: 2, md: 3 }, justifyContent: 'center', minWidth: 0, flex: 1 }}>
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
          {event.websiteUrl && (
            <Link
              href={event.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
            >
              <FormattedMessage id="page.events.website" />
            </Link>
          )}
          <Box>
            <Button
              component={RouterLink}
              to={eventRoute(event.slug)}
              variant="contained"
              sx={{ minHeight: 44 }}
            >
              <FormattedMessage id="page.events.details" />
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};
