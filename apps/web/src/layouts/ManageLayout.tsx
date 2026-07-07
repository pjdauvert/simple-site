import React, { useState } from 'react';
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
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  PermMedia as PermMediaIcon,
  Settings as SettingsIcon,
  Translate as TranslateIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import type { MenuItem } from '@simple-site/interfaces';
import { menuTitleKey } from '@simple-site/interfaces';
import { ThemeSwitcher } from '../features/theme/ThemeSwitcher';
import { LanguageSwitcher } from '../features/i18n/LanguageSwitcher';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuth } from '../hooks/useAuth';

const DRAWER_WIDTH = 240;

/** Leading icon per admin route (falls back to a settings glyph). */
const ICONS: Record<string, React.ReactNode> = {
  '/manage': <DashboardIcon />,
  '/manage/site': <SettingsIcon />,
  '/manage/translations': <TranslateIcon />,
  '/manage/media': <PermMediaIcon />,
};

interface ManageLayoutProps {
  menuItems: MenuItem[];
  children: ReactNode;
}

/**
 * Admin-only shell: a fixed top AppBar over a left Drawer (permanent on desktop,
 * temporary/toggled on mobile). Kept separate from the public MainLayout/MenuBar
 * so the site's own header stays untouched.
 */
export const ManageLayout: React.FC<ManageLayoutProps> = ({ menuItems, children }) => {
  const location = useLocation();
  const intl = useIntl();
  const { user, logout } = useAuth();
  const { siteThemeConfig } = useAppTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Dashboard matches only its exact path; every other item matches its subtree
  // (so /manage/site/themes keeps "Site configuration" highlighted).
  const isActive = (route: string) =>
    route === '/manage' ? location.pathname === route : location.pathname.startsWith(route);

  const nav = (
    <List>
      {menuItems.map((item) => (
        <ListItemButton
          key={item.route}
          component={RouterLink}
          to={item.route}
          selected={isActive(item.route)}
          onClick={() => setMobileOpen(false)}
        >
          <ListItemIcon>{ICONS[item.route] ?? <SettingsIcon />}</ListItemIcon>
          <ListItemText
            primary={<FormattedMessage id={menuTitleKey(item.pageName)} defaultMessage={item.menuTitle} />}
          />
        </ListItemButton>
      ))}
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
                src={`${siteThemeConfig.logoUrl}?tr=h-64,q-80,f-auto`}
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

      {/* Desktop: permanent drawer clipped under the AppBar. */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Divider />
        {nav}
      </Drawer>

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
        {nav}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};
