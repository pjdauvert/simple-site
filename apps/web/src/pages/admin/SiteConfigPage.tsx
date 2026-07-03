import { Alert, Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { SiteSettingsForm } from '../../components/manage';

const TABS = ['general', 'themes', 'pages'] as const;
type TabKey = (typeof TABS)[number];

/**
 * Site-configuration shell: a tab bar (General / Themes / Pages) over an <Outlet/>.
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
      </Tabs>
      <Outlet />
    </Box>
  );
};

/** General tab — the existing site-settings form (self-notifies on save). */
export const GeneralTab: React.FC = () => (
  <Paper sx={{ p: { xs: 2, sm: 3 } }}>
    <SiteSettingsForm />
  </Paper>
);

/** Themes tab — placeholder shell; the editor from PR #65 lands here. */
export const ThemesTab: React.FC = () => (
  <Alert severity="info">
    <FormattedMessage id="page.manage.site.themes.comingSoon" />
  </Alert>
);

/** Pages tab — placeholder shell for future page-structure management. */
export const PagesTab: React.FC = () => (
  <Alert severity="info">
    <FormattedMessage id="page.manage.site.pages.comingSoon" />
  </Alert>
);
