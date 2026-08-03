import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Collapse,
  Container,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Popover,
} from '@mui/material';
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useIntl, FormattedMessage } from 'react-intl';
import type { MenuItem as MenuItemType } from '@simple-site/interfaces';
import { menuTitleKey } from '@simple-site/interfaces';
import type { NavGroup, NavNode } from '../router/publicMenu';
import { ThemeSwitcher } from '../features/theme/ThemeSwitcher';
import { LanguageSwitcher } from '../features/i18n/LanguageSwitcher';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuth } from '../hooks/useAuth';

interface MenuBarProps {
  navNodes: NavNode[];
}

const itemLabel = (item: MenuItemType) => (
  <FormattedMessage id={menuTitleKey(item.pageName)} defaultMessage={item.menuTitle} />
);

const groupLabel = (group: NavGroup) => (
  <FormattedMessage id={group.i18nKey} defaultMessage={group.menuTitle} />
);

/**
 * Desktop nav button for a group node: clicking opens a popover of its children
 * instead of navigating (a group has no route of its own). The origin of the
 * group — config entry or feature-provided — is invisible here by design.
 */
const DesktopNavGroup: React.FC<{
  group: NavGroup;
  buttonSx: SxProps<Theme>;
  currentPath: string;
}> = ({ group, buttonSx, currentPath }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const menuId = `nav-group-${group.id}`;

  return (
    <>
      <Button
        onClick={(event) => setAnchorEl(event.currentTarget)}
        endIcon={<ExpandMoreIcon />}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : undefined}
        aria-controls={open ? menuId : undefined}
        sx={buttonSx}
      >
        {groupLabel(group)}
      </Button>
      <Menu id={menuId} anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {group.items.map((item) => (
          <MenuItem
            key={item.route}
            component={RouterLink}
            to={item.route}
            onClick={() => setAnchorEl(null)}
            selected={currentPath === item.route}
          >
            {itemLabel(item)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export const MenuBar: React.FC<MenuBarProps> = ({ navNodes }) => {
  const location = useLocation();
  const intl = useIntl();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const { themeConfig, siteThemeConfig } = useAppTheme();
  const [mobileMenuAnchor, setMobileMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [expandedGroups, setExpandedGroups] = React.useState<ReadonlySet<string>>(new Set());

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
    setExpandedGroups(new Set());
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Shared nav-button styling; a group is active when a child route matches. */
  const navButtonSx = (isActive: boolean): SxProps<Theme> => ({
    color: 'inherit',
    backgroundColor: isActive
      ? alpha(themeConfig.menuTextColor ?? theme.palette.text.primary, 0.08)
      : 'transparent',
    '&:hover': {
      backgroundColor: themeConfig.menuHoverColor,
    },
  });

  const mobileLeaf = (item: MenuItemType, indented: boolean) => (
    <ListItemButton
      key={item.route}
      component={RouterLink}
      to={item.route}
      onClick={handleMobileMenuClose}
      selected={location.pathname === item.route}
      sx={indented ? { pl: 4 } : undefined}
    >
      <ListItemText primary={itemLabel(item)} />
    </ListItemButton>
  );

  const mobileGroup = (group: NavGroup) => {
    if (group.alwaysExpanded) {
      // Always-open section: a non-interactive header with its children inline.
      return (
        <React.Fragment key={group.id}>
          <ListSubheader disableSticky component="div">
            {groupLabel(group)}
          </ListSubheader>
          {group.items.map((item) => mobileLeaf(item, true))}
        </React.Fragment>
      );
    }
    const expanded = expandedGroups.has(group.id);
    return (
      <React.Fragment key={group.id}>
        <ListItemButton onClick={() => toggleGroup(group.id)} aria-expanded={expanded}>
          <ListItemText primary={groupLabel(group)} />
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </ListItemButton>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {group.items.map((item) => mobileLeaf(item, true))}
          </List>
        </Collapse>
      </React.Fragment>
    );
  };

  const mobileMenuOpen = Boolean(mobileMenuAnchor);

  return (
    <AppBar position="sticky">
      <Container maxWidth={siteThemeConfig.containerMaxWidth}>
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
            {navNodes.map((node) =>
              node.kind === 'item' ? (
                <Button
                  key={node.item.route}
                  component={RouterLink}
                  to={node.item.route}
                  sx={navButtonSx(location.pathname === node.item.route)}
                >
                  {itemLabel(node.item)}
                </Button>
              ) : (
                <DesktopNavGroup
                  key={node.id}
                  group={node}
                  buttonSx={navButtonSx(node.items.some((item) => item.route === location.pathname))}
                  currentPath={location.pathname}
                />
              ),
            )}
          </Box>

          {/* Mobile Menu Icon */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              color="inherit"
              aria-label="open menu"
              aria-haspopup="true"
              aria-expanded={mobileMenuOpen ? 'true' : undefined}
              aria-controls={mobileMenuOpen ? 'mobile-nav' : undefined}
              onClick={handleMobileMenuOpen}
            >
              <MenuIcon />
            </IconButton>
          </Box>

          {/* Desktop Actions */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
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
          </Box>
        </Toolbar>
      </Container>

      {/* Mobile Menu — a Popover + List (not a MUI Menu): groups render as
          accordions (or always-open sections), which MenuList's roving focus
          cannot traverse inside a Collapse. Standard Tab order instead. */}
      <Popover
        id="mobile-nav"
        anchorEl={mobileMenuAnchor}
        open={mobileMenuOpen}
        onClose={handleMobileMenuClose}
        sx={{ display: { md: 'none' } }}
      >
        <List component="nav" dense sx={{ minWidth: 200 }}>
          {navNodes.map((node) => (node.kind === 'item' ? mobileLeaf(node.item, false) : mobileGroup(node)))}
          {user && (
            <ListItemButton onClick={() => { logout(); handleMobileMenuClose(); }}>
              <ListItemText primary={<FormattedMessage id="auth.logout" />} />
            </ListItemButton>
          )}
        </List>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, py: 1, borderTop: 1, borderColor: 'divider', mt: 1 }}>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </Box>
      </Popover>
    </AppBar>
  );
};
