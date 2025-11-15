import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import type { MenuItem as MenuItemType } from '../types/menu.interface';
import { ThemeSwitcher } from '../features/theme/ThemeSwitcher';
import { LanguageSwitcher } from '../features/i18n/LanguageSwitcher';
import { useAppTheme } from '../hooks/useTheme';

interface MenuBarProps {
  menuItems: MenuItemType[];
}

export const MenuBar: React.FC<MenuBarProps> = ({ menuItems }) => {
  const location = useLocation();
  const { themeConfig, siteThemeConfig } = useAppTheme();
  const [mobileMenuAnchor, setMobileMenuAnchor] = React.useState<null | HTMLElement>(null);

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  return (
    <AppBar position="sticky">
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 64 } }}>
          {/* Logo and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: { xs: 'auto', md: 4 } }}>
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
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                fontWeight: 700,
                fontSize: { xs: '1rem', sm: '1.25rem' },
              }}
            >
              {siteThemeConfig.siteName}
            </Typography>
          </Box>

          {/* Desktop Menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.route;
              return (
                <Button
                  key={item.route}
                  component={RouterLink}
                  to={item.route}
                  sx={{
                    color: 'inherit',
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    '&:hover': {
                      backgroundColor: themeConfig.menuHoverColor,
                    },
                  }}
                >
                  <FormattedMessage id={`${item.pageName}.menuTitle`} defaultMessage={item.menuTitle} />
                </Button>
              );
            })}
          </Box>

          {/* Mobile Menu Icon */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              color="inherit"
              aria-label="open menu"
              onClick={handleMobileMenuOpen}
            >
              <MenuIcon />
            </IconButton>
          </Box>

          {/* Desktop Actions */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            <LanguageSwitcher />
            <ThemeSwitcher />
          </Box>
        </Toolbar>
      </Container>

      {/* Mobile Menu */}
      <Menu
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={handleMobileMenuClose}
        sx={{ display: { md: 'none' } }}
      >
        {menuItems.map((item) => (
          <MenuItem
            key={item.route}
            component={RouterLink}
            to={item.route}
            onClick={handleMobileMenuClose}
            selected={location.pathname === item.route}
          >
            <FormattedMessage id={`${item.pageName}.menuTitle`} defaultMessage={item.menuTitle} />
          </MenuItem>
        ))}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, py: 1, borderTop: 1, borderColor: 'divider', mt: 1 }}>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </Box>
      </Menu>
    </AppBar>
  );
};

