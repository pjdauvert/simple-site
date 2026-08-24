import { Box, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

const TABS = ['list', 'design'] as const;
type TabKey = (typeof TABS)[number];

/**
 * Events management shell (/manage/events, flag-gated): a tab bar (List /
 * Design) over an <Outlet/>. Each tab is a URL sub-route
 * (`/manage/events/<tab>`) so tabs are deep-linkable and survive a reload,
 * mirroring the gallery page. Both tabs write the config DRAFT
 * (`PUT /api/config/events`, merging over a fresh draft read so they can't
 * clobber each other) — the publish note is spelled out once for the page.
 */
export const EventsPage: React.FC = () => {
  const { pathname } = useLocation();
  const current: TabKey = TABS.find((tab) => pathname.endsWith(`/${tab}`)) ?? 'list';

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" gutterBottom>
        <FormattedMessage id="page.manage.events.title" />
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <FormattedMessage id="page.manage.events.publishNote" />
      </Typography>
      <Tabs value={current} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab
          value="list"
          component={RouterLink}
          to="list"
          label={<FormattedMessage id="page.manage.events.tab.list" />}
        />
        <Tab
          value="design"
          component={RouterLink}
          to="design"
          label={<FormattedMessage id="page.manage.events.tab.design" />}
        />
      </Tabs>
      <Outlet />
    </Box>
  );
};
