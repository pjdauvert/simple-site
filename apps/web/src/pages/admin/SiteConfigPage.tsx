import { Box, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

const TABS = ['general', 'themes', 'pages', 'menu'] as const;
type TabKey = (typeof TABS)[number];

/**
 * Site-configuration shell: a tab bar (General / Themes / Pages / Menu) over an <Outlet/>.
 * Each tab is a URL sub-route (`/manage/site/<tab>`) so tabs are deep-linkable and
 * survive a reload. The active tab is derived from the current path.
 */
export const SiteConfigPage: React.FC = () => {
  const { pathname } = useLocation();
  const current: TabKey = TABS.find((t) => pathname.endsWith(`/${t}`)) ?? 'general';

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" gutterBottom>
        <FormattedMessage id="page.manage.siteConfig.title" />
      </Typography>
      <Tabs value={current} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab
          value="general"
          component={RouterLink}
          to="general"
          label={<FormattedMessage id="page.manage.site.tab.general" />}
        />
        <Tab
          value="themes"
          component={RouterLink}
          to="themes"
          label={<FormattedMessage id="page.manage.site.tab.themes" />}
        />
        <Tab
          value="pages"
          component={RouterLink}
          to="pages"
          label={<FormattedMessage id="page.manage.site.tab.pages" />}
        />
        <Tab
          value="menu"
          component={RouterLink}
          to="menu"
          label={<FormattedMessage id="page.manage.site.tab.menu" />}
        />
      </Tabs>
      <Outlet />
    </Box>
  );
};
