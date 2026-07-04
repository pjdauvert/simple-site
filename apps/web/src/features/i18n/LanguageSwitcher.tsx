import React from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { Language } from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import type { Locale } from '@simple-site/interfaces';
import { useAppIntl } from '../../hooks/useIntl';
import { languageLabel } from './languageNames';

export const LanguageSwitcher: React.FC = () => {
  const { locale, switchLanguage, availableLocales } = useAppIntl();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageSelect = (newLocale: Locale) => {
    switchLanguage(newLocale);
    handleClose();
  };

  return (
    <>
      <Tooltip title={<FormattedMessage id="language.switch" />}>
        <IconButton color="inherit" onClick={handleClick} aria-label="switch language">
          <Language />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {availableLocales.map((loc) => (
          <MenuItem
            key={loc}
            selected={loc === locale}
            onClick={() => handleLanguageSelect(loc)}
          >
            {languageLabel(loc)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

