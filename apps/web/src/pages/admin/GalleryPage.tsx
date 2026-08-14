import { Box, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

const TABS = ['items', 'design'] as const;
type TabKey = (typeof TABS)[number];

/**
 * Gallery management shell (/manage/gallery, flag-gated): a tab bar (Items &
 * tags / Design) over an <Outlet/>. Each tab is a URL sub-route
 * (`/manage/gallery/<tab>`) so tabs are deep-linkable and survive a reload,
 * mirroring the team page. Unlike the team, both tabs write the config DRAFT
 * (`PUT /api/config/gallery`, merging over a fresh draft read so they can't
 * clobber each other) — the publish note is spelled out once for the page.
 */
export const GalleryPage: React.FC = () => {
  const { pathname } = useLocation();
  const current: TabKey = TABS.find((t) => pathname.endsWith(`/${t}`)) ?? 'items';

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" gutterBottom>
        <FormattedMessage id="page.manage.gallery.title" />
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <FormattedMessage id="page.manage.gallery.publishNote" />
      </Typography>
      <Tabs value={current} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab
          value="items"
          component={RouterLink}
          to="items"
          label={<FormattedMessage id="page.manage.gallery.tab.items" />}
        />
        <Tab
          value="design"
          component={RouterLink}
          to="design"
          label={<FormattedMessage id="page.manage.gallery.tab.design" />}
        />
      </Tabs>
      <Outlet />
    </Box>
  );
};
