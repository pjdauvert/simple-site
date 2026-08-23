import React from "react";
import { Box, Container, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import {
  EVENTS_NEXT_HEADER_KEY,
  EVENTS_PAST_HEADER_KEY,
  EVENTS_PAST_TITLE_KEY,
  EVENTS_UPCOMING_HEADER_KEY,
  EVENTS_UPCOMING_TITLE_KEY,
  FeaturePagesEnum,
  menuTitleKey,
} from "@simple-site/interfaces";
import { NotFoundPage } from "../error/NotFoundPage";
import { Loading, Markdown } from "../../components";
import { useFeatureFlags } from "../../hooks/useFeatureFlags";
import { useSiteConfig } from "../../hooks/useSiteConfig";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { classifyEvents, filterVisiblePast } from "./eventDates";
import { eventsPageTitle, resolveAgendaDesign } from "./eventDisplay";
import { NextEventSection } from "./NextEventSection";
import { EventCardGrid } from "./EventCardGrid";

/**
 * One agenda section's chrome: heading (stored title as translation default,
 * else the bundled label) and optional markdown introduction (rendered only
 * when the config sets one — its translations override it).
 */
const SectionHeading: React.FC<{
  titleKey: string;
  storedTitle: string | undefined;
  bundledTitleKey: string;
  headerKey: string;
  storedHeader: string | undefined;
}> = ({ titleKey, storedTitle, bundledTitleKey, headerKey, storedHeader }) => (
  <>
    <Typography variant="h4" component="h2" gutterBottom>
      {storedTitle?.trim() ? (
        <FormattedMessage id={titleKey} defaultMessage={storedTitle} />
      ) : (
        <FormattedMessage id={bundledTitleKey} />
      )}
    </Typography>
    {storedHeader?.trim() && (
      <Box
        sx={{
          mb: 2,
          "& p": { typography: "body1" },
          "& > :first-of-type": { mt: 0 },
        }}
      >
        <FormattedMessage id={headerKey} defaultMessage={storedHeader}>
          {(message) => <Markdown>{String(message)}</Markdown>}
        </FormattedMessage>
      </Box>
    )}
  </>
);

/**
 * Public /events agenda: events place themselves from their dates — the next
 * (or ongoing) event featured first, the later ones as cards, past events
 * grouped by year (visibility per the design). The route is always
 * registered; the page gates itself on the runtime `events` flag (off → 404,
 * matching the server) so a direct navigation never flashes the catch-all
 * while flags load. Nothing to show at all → 404.
 */
export const EventsPage: React.FC = () => {
  const intl = useIntl();
  const flags = useFeatureFlags();
  const siteContext = useSiteConfig();
  const { siteThemeConfig } = useAppTheme();
  if (!siteContext)
    throw new Error("EventsPage must be called within <SiteConfigProvider>");
  const { config } = siteContext;

  const enabled = Boolean(flags?.events);
  useDocumentTitle(
    enabled
      ? `${intl.formatMessage({ id: menuTitleKey(FeaturePagesEnum.EVENTS), defaultMessage: eventsPageTitle(config) })} – ${siteThemeConfig.siteName}`
      : undefined,
  );

  if (flags === null) return <Loading />;
  if (!flags.events) return <NotFoundPage />;

  const events = config.events;
  const design = resolveAgendaDesign(events);
  const now = new Date();
  const { next, upcoming, pastYears } = classifyEvents(
    events?.events ?? [],
    now,
  );
  const visiblePast = filterVisiblePast(pastYears, design);

  if (!next && upcoming.length === 0 && visiblePast.length === 0)
    return <NotFoundPage />;

  const maxWidth = siteThemeConfig.containerMaxWidth ?? "lg";

  return (
    <>
      {/* The featured section sits OUTSIDE the container: its blurred backdrop
          bleeds across the viewport while its content keeps the max width. */}
      {next && (
        <Box component="section">
          {/* The featured section carries no heading — only its optional markdown intro. */}
          {events?.nextHeader?.trim() && (
            <Container
              maxWidth={maxWidth}
              sx={{
                pt: { xs: 4, md: 6 },
                mb: 2,
                "& p": { typography: "body1" },
                "& > :first-of-type": { mt: 0 },
              }}
            >
              <FormattedMessage
                id={EVENTS_NEXT_HEADER_KEY}
                defaultMessage={events.nextHeader}
              >
                {(message) => <Markdown>{String(message)}</Markdown>}
              </FormattedMessage>
            </Container>
          )}
          <NextEventSection event={next} now={now} />
        </Box>
      )}

      <Container maxWidth={maxWidth} sx={{ py: { xs: 4, md: 6 } }}>
        {upcoming.length > 0 && (
          <Box component="section" sx={{ mt: { xs: 5, md: 7 } }}>
            <SectionHeading
              titleKey={EVENTS_UPCOMING_TITLE_KEY}
              storedTitle={events?.upcomingTitle}
              bundledTitleKey="page.events.upcomingTitle"
              headerKey={EVENTS_UPCOMING_HEADER_KEY}
              storedHeader={events?.upcomingHeader}
            />
            <EventCardGrid events={upcoming} design={design} />
          </Box>
        )}

        {visiblePast.length > 0 && (
          <Box component="section" sx={{ mt: { xs: 5, md: 7 } }}>
            <SectionHeading
              titleKey={EVENTS_PAST_TITLE_KEY}
              storedTitle={events?.pastTitle}
              bundledTitleKey="page.events.pastTitle"
              headerKey={EVENTS_PAST_HEADER_KEY}
              storedHeader={events?.pastHeader}
            />
            {visiblePast.map((bucket) => (
              <Box key={bucket.year} sx={{ mt: 3 }}>
                <Typography variant="h5" component="h3" gutterBottom>
                  {bucket.year}
                </Typography>
                <EventCardGrid events={bucket.events} design={design} />
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </>
  );
};
