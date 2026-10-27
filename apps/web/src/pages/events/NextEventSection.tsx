import React from "react";
import { Box, Button, Container, Link, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Link as RouterLink } from "react-router-dom";
import { FormattedMessage, useIntl } from "react-intl";
import { useTheme } from "@mui/material/styles";
import {
  eventDescriptionKey,
  eventNameKey,
  type SiteEvent,
} from "@simple-site/interfaces";
import { Markdown, NewTabHint } from "../../components";
import { EventDateSentence } from "./EventDateSentence";
import { EventLocationLink } from "./EventLocationLink";
import { useAppTheme } from "../../hooks/useAppTheme";
import {
  FEATURED_POSTER_SIZES,
  eventBackdropLayerSx,
  eventContrastPanelSx,
  eventHeaderImageSrcSet,
  eventHeaderImageUrl,
  eventImageAlt,
  eventRoute,
  markdownBodySx,
} from "./eventDisplay";

/**
 * The agenda's featured block — the next (or ongoing) event. The section's
 * BACKGROUND is the illustration itself, abstracted into a blurred cover
 * (event posters are mostly portrait A4 — the blur turns any ratio into a
 * full-bleed backdrop; no illustration → the brand gradient). On top: the
 * sharp poster on the left third (contained, never cropped) and the full
 * presentation on the right two thirds — date first, then name, location,
 * the whole markdown description, and a "More info" button to the event's
 * website. The text zone sits on a contrasted, slightly transparent panel so
 * it stays readable over any backdrop. The design can disable the backdrop
 * entirely (`showBackdrop`). It spans the FULL viewport
 * width (the page renders this section outside its container) while the
 * content keeps the site's max width. The section itself is omitted by the
 * page when no event is ongoing or upcoming.
 */
export const NextEventSection: React.FC<{
  event: SiteEvent;
  now: Date;
  showBackdrop: boolean;
}> = ({ event, now, showBackdrop }) => {
  const intl = useIntl();
  const theme = useTheme();
  const { siteThemeConfig } = useAppTheme();
  const imageUrl = event.imageUrl;

  return (
    <Box sx={{ position: "relative", overflow: "hidden" }}>
      {/* Abstract backdrop: the illustration blurred to a cover (scaled to hide
          edge fringing) — the design can turn the whole layer off. */}
      {showBackdrop && (
        <Box
          aria-hidden
          data-testid="featured-backdrop"
          sx={eventBackdropLayerSx(theme, imageUrl)}
        />
      )}
      {/* The backdrop bleeds across the viewport; the CONTENT stays on the site's max width,
          with generous vertical padding inside the backgrounded surface. */}
      <Container
        maxWidth={siteThemeConfig.containerMaxWidth ?? "lg"}
        sx={{ position: "relative" }}
      >
        <Grid
          container
          spacing={{ xs: 3, md: 5 }}
          alignItems="center"
          sx={{ py: { xs: 5, md: 8 } }}
        >
          {imageUrl && (
            <Grid size={{ xs: 12, md: 4 }}>
              <Box
                component="img"
                src={eventHeaderImageUrl(imageUrl)}
                srcSet={eventHeaderImageSrcSet(imageUrl)}
                sizes={FEATURED_POSTER_SIZES}
                // Content, not decoration: the featured poster gets its own
                // space here, so it carries the owner's description when
                // there is one (empty alt = skipped, never the file name).
                alt={eventImageAlt(intl, event)}
                decoding="async"
                sx={{
                  display: "block",
                  width: "100%",
                  maxHeight: { xs: 360, md: 480 },
                  objectFit: "contain",
                  // Without the blurred backdrop the poster stands out on its
                  // own: elevated with a shadow (8 — a step the platform's
                  // shadow scale actually defines; anything else renders flat).
                  boxShadow: showBackdrop ? undefined : 8,
                  mx: "auto",
                }}
              />
            </Grid>
          )}
          <Grid size={{ xs: 12, md: imageUrl ? 8 : 12 }}>
            {/* Contrasted, slightly transparent panel keeping the text readable over the blur. */}
            <Stack
              spacing={1.5}
              sx={{
                minWidth: 0,
                p: { xs: 2, md: 3 },
                ...eventContrastPanelSx(theme),
              }}
            >
              <Typography variant="subtitle1" color="text.secondary">
                <EventDateSentence event={event} now={now} />
              </Typography>
              <Typography variant="h4" component="h2">
                <Link
                  component={RouterLink}
                  to={eventRoute(event.slug)}
                  underline="hover"
                  color="inherit"
                >
                  <FormattedMessage
                    id={eventNameKey(event.slug)}
                    defaultMessage={event.name}
                  />
                </Link>
              </Typography>
              {event.description?.trim() && (
                <Box sx={markdownBodySx}>
                  <FormattedMessage
                    id={eventDescriptionKey(event.slug)}
                    defaultMessage={event.description}
                  >
                    {(message) => <Markdown>{String(message)}</Markdown>}
                  </FormattedMessage>
                </Box>
              )}
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
                    <NewTabHint />
                  </Button>
                </Box>
              )}
              <Box sx={{ typography: "body1" }}>
                <EventLocationLink event={event} />
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
