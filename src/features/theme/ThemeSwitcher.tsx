import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { useAppTheme } from '../../hooks/useTheme';

export const ThemeSwitcher: React.FC = () => {
  const { themeName, switchTheme } = useAppTheme();

  const handleThemeSwitch = () => {
    switchTheme(themeName === 'default' ? 'dark' : 'default');
  };

  return (
    <Tooltip title={<FormattedMessage id="theme.switch" />}>
      <IconButton color="inherit" onClick={handleThemeSwitch} aria-label="switch theme">
        {themeName === 'default' ? <Brightness4 /> : <Brightness7 />}
      </IconButton>
    </Tooltip>
  );
};

