import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useTheme } from '@mui/material/styles';
import { eventDescriptionKey, eventNameKey } from '@simple-site/interfaces';
import { NotFoundPage } from '../error/NotFoundPage';
import { Loading, Markdown, NewTabHint } from '../../components';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useSiteConfig } from '../../hooks/useSiteConfig';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { EventDateSentence } from './EventDateSentence';
import { EventLocationLink } from './EventLocationLink';
import {
  EVENT_PAGE_HEADER_SIZES,
  EVENT_PAGE_SIDE_IMAGE_SIZES,
  eventBackdropLayerSx,
  eventBySlug,
  eventContrastPanelSx,
  eventHeaderImageSrcSet,
  eventHeaderImageUrl,
  eventImageAlt,
  eventPageImageFrameSx,
  markdownBodySx,
  resolveEventPageDesign,
} from './eventDisplay';
import { TOUCH_TARGET } from '../../features/theme/muiTheme';

/**
 * Public /events/<slug> detail page — the full fiche: the illustration
 * (design-controlled ratio, A4 poster by default), name, the long-format date
 * sentence (same rules as the agenda's featured block), the Google Maps
 * location link, the website link, then the markdown description. Same
 * self-gating as the agenda; an unknown slug 404s.
 *
 * The design places the illustration ABOVE the descriptive panel (the
 * default) or BESIDE it — side by side from `md`, stacked below, where a
 * phone has no room for two columns. In both cases it is capped at half the
 * screen, by height above and by width beside (`eventPageImageFrameSx`).
 *
 * The design can paint the illustration as a blurred FULL BACKGROUND behind
 * the page (the featured block's treatment: a blurred cover bleeding across
 * the viewport, the sharp poster on top of it, and the texts on a contrasted,
 * slightly transparent panel so they stay readable over any artwork). An
 * event without an illustration simply gets no background — the option is
 * about the illustration, so there is nothing to abstract.
 */
export const EventPage: React.FC = () => {
  const intl = useIntl();
  const { slug } = useParams<{ slug: string }>();
  const flags = useFeatureFlags();
  const siteContext = useSiteConfig();
  const theme = useTheme();
  const { siteThemeConfig } = useAppTheme();
  // The provider guard sits AFTER every hook (just below), the way the sibling
  // feature pages place it: a conditional throw above a hook is what
  // `react-hooks/rules-of-hooks` exists to catch.
  const config = siteContext?.config;

  const event = flags?.events && slug ? eventBySlug(config?.events, slug) : undefined;
  useDocumentTitle(
    event
      ? `${intl.formatMessage({ id: eventNameKey(event.slug), defaultMessage: event.name })} – ${siteThemeConfig.siteName}`
      : undefined,
  );

  if (!siteContext) throw new Error('EventPage must be called within <SiteConfigProvider>');
  if (flags === null) return <Loading />;
  if (!flags.events) return <NotFoundPage />;
  if (!event) return <NotFoundPage />;

  const design = resolveEventPageDesign(config?.events);
  // No illustration → nothing to abstract into a background, and nothing to
  // place either: the texts simply own the page.
  const fullBackground = design.fullBackgroundImage && Boolean(event.imageUrl);
  const beside = design.imagePlacement === 'beside' && Boolean(event.imageUrl);

  return (
    // The background bleeds across the FULL viewport width (outside the
    // container, like the agenda's featured block) while the content keeps the
    // site's max width. Without it the wrapper adds nothing.
    <Box sx={fullBackground ? { position: 'relative', overflow: 'hidden' } : undefined}>
      {fullBackground && (
        <Box aria-hidden data-testid="event-full-background" sx={eventBackdropLayerSx(theme, event.imageUrl)} />
      )}
      <Container
        maxWidth={siteThemeConfig.containerMaxWidth ?? 'md'}
        // `relative` keeps the content above the absolutely-placed backdrop.
        sx={{ py: { xs: 4, md: 6 }, position: 'relative' }}
      >
        {/* Illustration above the texts (one column) or beside them (two from
            `md`, stacked below it — a phone has no room for a side column).
            The gap is the only spacing between the two, so neither carries a
            margin of its own. */}
        <Box
          // The resolved placement, stated in the DOM: the layout lives in a
          // generated class, so this is the only honest handle on it.
          data-image-placement={design.imagePlacement}
          sx={{
            display: 'grid',
            gap: { xs: 3, md: 4 },
            ...(beside
              ? { gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' }, alignItems: 'start' }
              : {}),
          }}
        >
          {event.imageUrl && (
            <Box
              data-testid="event-header-image"
              // The design's ratio, stated in the DOM: `aspect-ratio` lives in a
              // generated class, so this is the only honest handle on it.
              data-aspect-ratio={design.imageAspectRatio}
              sx={{
                ...eventPageImageFrameSx(design.imageAspectRatio, design.imagePlacement),
                overflow: 'hidden',
                borderRadius: 3,
              }}
            >
              <Box
                component="img"
                src={eventHeaderImageUrl(event.imageUrl)}
                srcSet={eventHeaderImageSrcSet(event.imageUrl)}
                sizes={beside ? EVENT_PAGE_SIDE_IMAGE_SIZES : EVENT_PAGE_HEADER_SIZES}
                // Content, not decoration: the header illustration opens the
                // page on its own, so it carries the owner's description when
                // there is one (empty alt = skipped, never the file name).
                alt={eventImageAlt(intl, event)}
                decoding="async"
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </Box>
          )}

          {/* Over a blurred backdrop the texts move onto a contrasted panel; on a
              plain page background they need none. */}
          <Box sx={fullBackground ? { p: { xs: 2, md: 3 }, ...eventContrastPanelSx(theme) } : undefined}>
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
                    sx={{ minHeight: TOUCH_TARGET }}
                  >
                    <FormattedMessage id="page.events.moreInfo" />
                    <NewTabHint />
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
          </Box>
        </Box>
      </Container>
    </Box>
  );
};
