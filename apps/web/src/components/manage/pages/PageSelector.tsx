import { useState } from 'react';
import {
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { PageConfiguration } from '@simple-site/interfaces';
import type { PageFieldErrors } from './pagesDraft';

interface PageSelectorProps {
  pages: PageConfiguration[];
  errors: PageFieldErrors[];
  showErrors: boolean;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
}

/**
 * Left-aligned page picker: a button showing the current page that opens a menu
 * listing every page, with "Add page" pinned at the bottom.
 */
export const PageSelector: React.FC<PageSelectorProps> = ({
  pages,
  errors,
  showErrors,
  selectedIndex,
  onSelect,
  onAdd,
}) => {
  const intl = useIntl();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);

  const current = pages[selectedIndex];
  const untitled = intl.formatMessage({ id: 'page.manage.pages.untitled' });
  const label = current ? current.menuTitle.trim() || untitled : intl.formatMessage({ id: 'page.manage.pages.selectPage' });

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        onClick={(e) => setAnchor(e.currentTarget)}
        endIcon={<ArrowDropDownIcon />}
        sx={{ textTransform: 'none', maxWidth: 280 }}
        aria-label={intl.formatMessage({ id: 'page.manage.pages.selectPage' })}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        {pages.map((page, index) => {
          const hasError = showErrors && Boolean(errors[index]?.route || errors[index]?.pageName);
          return (
            <MenuItem
              key={index}
              selected={index === selectedIndex}
              onClick={() => { close(); onSelect(index); }}
            >
              <ListItemText
                primary={page.menuTitle.trim() || untitled}
                secondary={page.route}
                slotProps={{ primary: { color: hasError ? 'error' : undefined, noWrap: true }, secondary: { noWrap: true } }}
              />
            </MenuItem>
          );
        })}
        {pages.length > 0 && <Divider />}
        <MenuItem onClick={() => { close(); onAdd(); }}>
          <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
          <ListItemText><FormattedMessage id="page.manage.pages.add" /></ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
