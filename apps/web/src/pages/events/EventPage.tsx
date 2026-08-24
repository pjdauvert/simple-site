import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { eventDescriptionKey, eventNameKey } from '@simple-site/interfaces';
import { NotFoundPage } from '../error/NotFoundPage';
import { Loading, Markdown } from '../../components';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { EventDateSentence } from './EventDateSentence';
import { EventLocationLink } from './EventLocationLink';
import {
  EVENT_PAGE_HEADER_SIZES,
  aspectRatioCss,
  eventBySlug,
  eventHeaderImageSrcSet,
  eventHeaderImageUrl,
  markdownBodySx,
  resolveEventPageDesign,
} from './eventDisplay';

/**
 * Public /events/<slug> detail page — the full fiche: header illustration
 * (design-controlled ratio), name, the long-format date sentence (same rules
 * as the agenda's featured block), the Google Maps location link, the
 * website link, then the markdown description. Same self-gating as the
 * agenda; an unknown slug 404s.
 */
export const EventPage: React.FC = () => {
  const intl = useIntl();
  const { slug } = useParams<{ slug: string }>();
  const flags = useFeatureFlags();
  const siteContext = useSiteConfig();
  const { siteThemeConfig } = useAppTheme();
  if (!siteContext) throw new Error('EventPage must be called within <SiteConfigProvider>');
  const { config } = siteContext;

  const event = flags?.events && slug ? eventBySlug(config.events, slug) : undefined;
  useDocumentTitle(
    event
      ? `${intl.formatMessage({ id: eventNameKey(event.slug), defaultMessage: event.name })} – ${siteThemeConfig.siteName}`
      : undefined,
  );

  if (flags === null) return <Loading />;
  if (!flags.events) return <NotFoundPage />;
  if (!event) return <NotFoundPage />;

  const design = resolveEventPageDesign(config.events);

  return (
    <Container maxWidth={siteThemeConfig.containerMaxWidth ?? 'md'} sx={{ py: { xs: 4, md: 6 } }}>
      {event.imageUrl && (
        <Box sx={{ aspectRatio: aspectRatioCss(design.imageAspectRatio), overflow: 'hidden', borderRadius: 3, mb: { xs: 3, md: 4 } }}>
          <Box
            component="img"
            src={eventHeaderImageUrl(event.imageUrl)}
            srcSet={eventHeaderImageSrcSet(event.imageUrl)}
            sizes={EVENT_PAGE_HEADER_SIZES}
            alt=""
            decoding="async"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </Box>
      )}

      <Typography variant="h3" component="h1" gutterBottom>
        <FormattedMessage id={eventNameKey(event.slug)} defaultMessage={event.name} />
      </Typography>

      <Stack spacing={1} sx={{ mb: { xs: 3, md: 4 } }}>
        <Typography variant="subtitle1" color="text.secondary">
          <EventDateSentence event={event} now={new Date()} />
        </Typography>
        <Box sx={{ typography: 'body1' }}>
          <EventLocationLink event={event} />
        </Box>
        {event.websiteUrl && (
          <Box>
            <Button
              href={event.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              sx={{ minHeight: 44 }}
            >
              <FormattedMessage id="page.events.moreInfo" />
            </Button>
          </Box>
        )}
      </Stack>

      {event.description?.trim() && (
        <Box sx={markdownBodySx}>
          <FormattedMessage id={eventDescriptionKey(event.slug)} defaultMessage={event.description}>
            {(message) => <Markdown>{String(message)}</Markdown>}
          </FormattedMessage>
        </Box>
      )}
    </Container>
  );
};
