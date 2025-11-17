import React, { useState } from 'react';
import { IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import { Palette } from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { useAppTheme } from '../../hooks/useTheme';

export const ThemeSwitcher: React.FC = () => {
  const { themeName, switchTheme, availableThemes } = useAppTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeSelect = (theme: string) => {
    switchTheme(theme);
    handleClose();
  };

  // Only show the theme switcher if there are 2 or more themes
  if (availableThemes.length < 2) {
    return null;
  }

  return (
    <>
      <Tooltip title={<FormattedMessage id="theme.switch" />}>
        <IconButton 
          color="inherit" 
          onClick={handleClick} 
          aria-label="switch theme"
          aria-controls={open ? 'theme-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <Palette />
        </IconButton>
      </Tooltip>
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            'aria-labelledby': 'theme-button',
          },
        }}
      >
        {availableThemes.map((theme) => (
          <MenuItem 
            key={theme} 
            onClick={() => handleThemeSelect(theme)}
            selected={theme === themeName}
          >
            {theme}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

