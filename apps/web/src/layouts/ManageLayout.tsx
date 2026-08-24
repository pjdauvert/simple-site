import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Event as EventIcon,
  Groups as GroupsIcon,
  Logout as LogoutIcon,
  Mail as MailIcon,
  Menu as MenuIcon,
  PermMedia as PermMediaIcon,
  PublishedWithChanges as PublishedWithChangesIcon,
  Settings as SettingsIcon,
  Translate as TranslateIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import type { MenuItem } from '@simple-site/interfaces';
import { menuTitleKey } from '@simple-site/interfaces';
import { ThemeSwitcher } from '../features/theme/ThemeSwitcher';
import { LanguageSwitcher } from '../features/i18n/LanguageSwitcher';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuth } from '../hooks/useAuth';
import { ikTransform } from '../utils/imagekit';
import { GalleryThumbnailIcon } from '../components/icons/GalleryThumbnailIcon';

const DRAWER_WIDTH = 240;
const COLLAPSED_WIDTH = 64;
const COLLAPSED_KEY = 'manage.nav.collapsed';

/** Leading icon per admin route (falls back to a settings glyph). */
const ICONS: Record<string, React.ReactNode> = {
  '/manage': <PublishedWithChangesIcon />,
  '/manage/site': <SettingsIcon />,
  '/manage/team': <GroupsIcon />,
  '/manage/contact': <MailIcon />,
  '/manage/gallery': <GalleryThumbnailIcon />,
  '/manage/events': <EventIcon />,
  '/manage/translations': <TranslateIcon />,
  '/manage/media': <PermMediaIcon />,
};

interface ManageLayoutProps {
  menuItems: MenuItem[];
  children: ReactNode;
}

/**
 * Admin-only shell: a fixed top AppBar over a left Drawer (permanent on desktop,
 * temporary/toggled on mobile). The desktop drawer folds to an icons-only mini
 * variant via an arrow button on its right edge. Kept separate from the public
 * MainLayout/MenuBar so the site's own header stays untouched.
 */
export const ManageLayout: React.FC<ManageLayoutProps> = ({ menuItems, children }) => {
  const location = useLocation();
  const intl = useIntl();
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { siteThemeConfig } = useAppTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem(COLLAPSED_KEY) === '1');
  // Labels are revealed only once the expand animation completes, so they never
  // wrap to two lines while the drawer is still narrow (which bumped row height).
  const [showLabels, setShowLabels] = useState<boolean>(() => localStorage.getItem(COLLAPSED_KEY) !== '1');

  const toggleCollapsed = () =>
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });

  useEffect(() => {
    if (collapsed) {
      setShowLabels(false);
      return;
    }
    const id = window.setTimeout(() => setShowLabels(true), theme.transitions.duration.standard);
    return () => window.clearTimeout(id);
  }, [collapsed, theme.transitions.duration.standard]);

  const desktopWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  // Dashboard matches only its exact path; every other item matches its subtree
  // (so /manage/site/themes keeps "Site configuration" highlighted).
  const isActive = (route: string) =>
    route === '/manage' ? location.pathname === route : location.pathname.startsWith(route);

  const renderNav = (mini: boolean, showText: boolean) => (
    <List>
      {menuItems.map((item) => {
        const label = intl.formatMessage({ id: menuTitleKey(item.pageName), defaultMessage: item.menuTitle });
        const button = (
          <ListItemButton
            component={RouterLink}
            to={item.route}
            selected={isActive(item.route)}
            onClick={() => setMobileOpen(false)}
            sx={{ justifyContent: mini ? 'center' : 'flex-start', px: mini ? 1.5 : 2, minHeight: 48 }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: mini ? 0 : 2, justifyContent: 'center' }}>
              {ICONS[item.route] ?? <SettingsIcon />}
            </ListItemIcon>
            {showText && <ListItemText primary={label} slotProps={{ primary: { noWrap: true } }} />}
          </ListItemButton>
        );
        return mini ? (
          <Tooltip key={item.route} title={label} placement="right">
            {button}
          </Tooltip>
        ) : (
          <React.Fragment key={item.route}>{button}</React.Fragment>
        );
      })}
    </List>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open menu"
            edge="start"
            onClick={() => setMobileOpen((open) => !open)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
            {siteThemeConfig.logoUrl && (
              <Box
                component="img"
                src={ikTransform(siteThemeConfig.logoUrl, 'h-64,q-80,f-auto')}
                alt={siteThemeConfig.siteName}
                sx={{ height: { xs: 24, sm: 32 }, mr: 1 }}
              />
            )}
            <Typography
              variant="h6"
              component={RouterLink}
              to="/"
              noWrap
              sx={{ textDecoration: 'none', color: 'inherit', fontWeight: 700 }}
            >
              {siteThemeConfig.siteName}
            </Typography>
          </Box>
          <LanguageSwitcher />
          <ThemeSwitcher />
          {user && (
            <IconButton
              color="inherit"
              onClick={logout}
              aria-label={intl.formatMessage({ id: 'auth.logout' })}
            >
              <LogoutIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Desktop: permanent drawer clipped under the AppBar; folds to icons only. */}
      <Drawer
        variant="permanent"
        sx={{
          width: desktopWidth,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          // Animate the reserved footprint (not just the paper) so the main
          // content follows the drawer instead of snapping to its final width.
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.standard,
            }),
          '& .MuiDrawer-paper': {
            width: desktopWidth,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.standard,
              }),
          },
        }}
      >
        <Toolbar />
        <Divider />
        {renderNav(collapsed, showLabels)}
      </Drawer>

      {/* Fold/unfold control: on the drawer's right edge, at the middle of its height. */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'fixed',
          top: 'calc(50% + 32px)',
          left: desktopWidth,
          transform: 'translate(-50%, -50%)',
          zIndex: (theme) => theme.zIndex.drawer + 2,
          transition: (theme) =>
            theme.transitions.create('left', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.standard,
            }),
        }}
      >
        <Tooltip title={intl.formatMessage({ id: collapsed ? 'manage.nav.expand' : 'manage.nav.collapse' })} placement="right">
          <IconButton
            size="small"
            onClick={toggleCollapsed}
            aria-label={intl.formatMessage({ id: collapsed ? 'manage.nav.expand' : 'manage.nav.collapse' })}
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 1,
              // Keep an opaque fill on hover so the drawer edge never shows through.
              '&:hover': { bgcolor: 'background.paper', borderColor: 'text.secondary', boxShadow: 3 },
            }}
          >
            {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Mobile: temporary drawer toggled from the AppBar hamburger. */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Divider />
        {renderNav(false, true)}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};
