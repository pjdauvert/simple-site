import { Box, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

const TABS = [
  { key: 'list', labelKey: 'page.manage.events.tab.list' },
  { key: 'agenda-design', labelKey: 'page.manage.events.tab.agendaDesign' },
  { key: 'event-design', labelKey: 'page.manage.events.tab.eventDesign' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/**
 * Events management shell (/manage/events, flag-gated): a tab bar (Events /
 * Agenda design / Event page design) over an <Outlet/>. Each tab is a URL
 * sub-route (`/manage/events/<tab>`) so tabs are deep-linkable and survive a
 * reload, mirroring the gallery page. The design is split per SURFACE — the
 * agenda page and one event's detail page are two different screens with two
 * different previews, and conflating them made one long tab nobody could read
 * at a glance.
 *
 * Every tab writes the config DRAFT (`PUT /api/config/events`), auto-saving
 * each settled change and merging it over a fresh draft read so the three tabs
 * can never clobber each other — the publish note is spelled out once for the
 * page. The bar scrolls rather than crowding on a phone, keeping every tab a
 * full-size touch target.
 */
export const EventsPage: React.FC = () => {
  const { pathname } = useLocation();
  const current: TabKey = TABS.find((tab) => pathname.endsWith(`/${tab.key}`))?.key ?? 'list';

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" gutterBottom>
        <FormattedMessage id="page.manage.events.title" />
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <FormattedMessage id="page.manage.events.publishNote" />
      </Typography>
      <Tabs
        value={current}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        {TABS.map((tab) => (
          <Tab
            key={tab.key}
            value={tab.key}
            component={RouterLink}
            to={tab.key}
            label={<FormattedMessage id={tab.labelKey} />}
          />
        ))}
      </Tabs>
      <Outlet />
    </Box>
  );
};
