import React from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { Language } from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { useAppIntl } from '../../hooks/useIntl';

export const LanguageSwitcher: React.FC = () => {
  const { locale, switchLanguage, availableLocales } = useAppIntl();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageSelect = (newLocale: 'en' | 'fr') => {
    switchLanguage(newLocale);
    handleClose();
  };

  const getLanguageLabel = (loc: string): string => {
    const labels: Record<string, string> = {
      en: 'English',
      fr: 'Français',
    };
    return labels[loc] || loc;
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
            {getLanguageLabel(loc)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

