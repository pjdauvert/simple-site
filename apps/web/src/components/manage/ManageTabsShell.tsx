import { Box, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

/** One tab of the shell: a URL segment and the i18n id of its label. */
export interface ManageTab {
  /** URL sub-route segment, relative to the shell's own route. */
  key: string;
  labelKey: string;
}

interface ManageTabsShellProps {
  /** i18n id of the page heading. */
  titleKey: string;
  /**
   * i18n id of the one-line caption under the heading — where the page says,
   * once for all its tabs, whether edits go live immediately or land in the
   * draft awaiting publication.
   */
  noteKey: string;
  tabs: readonly ManageTab[];
  /** Tab considered active on the bare page route; defaults to the first. */
  fallback?: string;
}

/**
 * The shell every multi-tab admin page shares (team, gallery, events): a
 * heading, the page-wide live/publish caption, a tab bar, and an `<Outlet/>`
 * for the active tab.
 *
 * Each tab is a URL sub-route (`/manage/<page>/<tab>`) rather than local
 * state, so a tab is deep-linkable, survives a reload and gives the admin a
 * back button that does what they expect. The active tab is read back from the
 * path — `fallback` covers the bare page route, which redirects to its first
 * tab anyway.
 *
 * The bar always scrolls rather than crowding: three tabs with real labels do
 * not fit a phone, and shrinking them below a full-size touch target is the
 * one thing the bar must not do. The scroll buttons only appear when there is
 * something to scroll to.
 */
export const ManageTabsShell: React.FC<ManageTabsShellProps> = ({ titleKey, noteKey, tabs, fallback }) => {
  const { pathname } = useLocation();
  const current = tabs.find((tab) => pathname.endsWith(`/${tab.key}`))?.key ?? fallback ?? tabs[0].key;

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" gutterBottom>
        <FormattedMessage id={titleKey} />
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <FormattedMessage id={noteKey} />
      </Typography>
      <Tabs
        value={current}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        {tabs.map((tab) => (
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
