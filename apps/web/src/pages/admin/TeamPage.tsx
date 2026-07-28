import { Box, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

const TABS = ['page', 'members'] as const;
type TabKey = (typeof TABS)[number];

/**
 * Team management shell (/manage/team, flag-gated): a tab bar (Page / Members)
 * over an <Outlet/>. Each tab is a URL sub-route (`/manage/team/<tab>`) so tabs
 * are deep-linkable and survive a reload, mirroring the site-configuration page.
 * Both tabs save directly — the team is live immediately, which the caption
 * spells out once for the whole page.
 */
export const TeamPage: React.FC = () => {
  const { pathname } = useLocation();
  const current: TabKey = TABS.find((t) => pathname.endsWith(`/${t}`)) ?? 'page';

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" gutterBottom>
        <FormattedMessage id="page.manage.team.title" />
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <FormattedMessage id="page.manage.team.liveNote" />
      </Typography>
      <Tabs value={current} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab
          value="page"
          component={RouterLink}
          to="page"
          label={<FormattedMessage id="page.manage.team.tab.page" />}
        />
        <Tab
          value="members"
          component={RouterLink}
          to="members"
          label={<FormattedMessage id="page.manage.team.tab.members" />}
        />
      </Tabs>
      <Outlet />
    </Box>
  );
};
