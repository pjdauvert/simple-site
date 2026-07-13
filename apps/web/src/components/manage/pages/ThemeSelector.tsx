import { useState } from 'react';
import { Button, ListItemText, Menu, MenuItem } from '@mui/material';
import {
  ArrowDropDown as ArrowDropDownIcon,
  PaletteOutlined as PaletteIcon,
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import type { ThemeConfig } from '@simple-site/interfaces';

interface ThemeSelectorProps {
  themes: ThemeConfig[];
  selected: string | null;
  onSelect: (themeName: string) => void;
}

/**
 * Picks which theme the page preview is rendered under. Rendered by the caller
 * only when at least two themes exist.
 */
export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ themes, selected, onSelect }) => {
  const intl = useIntl();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);

  const current = themes.find((t) => t.themeName === selected);
  const placeholder = intl.formatMessage({ id: 'page.manage.pages.selectTheme' });

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<PaletteIcon />}
        endIcon={<ArrowDropDownIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ textTransform: 'none', maxWidth: 220 }}
        aria-label={placeholder}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current?.themeName ?? placeholder}
        </span>
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        {themes.map((theme) => (
          <MenuItem
            key={theme.themeName}
            selected={theme.themeName === selected}
            onClick={() => { close(); onSelect(theme.themeName); }}
          >
            <ListItemText>{theme.themeName}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
