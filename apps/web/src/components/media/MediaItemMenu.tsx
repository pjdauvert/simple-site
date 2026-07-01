import { useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import {
  Delete as DeleteIcon,
  DriveFileRenameOutline as RenameIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';

interface MediaItemMenuProps {
  onRename: () => void;
  onDelete: () => void;
  size?: 'small' | 'medium';
}

/**
 * Overflow ("more") button that opens a menu with Rename / Delete actions for a
 * media item, replacing the standalone delete button on file cards and folder chips.
 */
export const MediaItemMenu: React.FC<MediaItemMenuProps> = ({ onRename, onDelete, size = 'small' }) => {
  const intl = useIntl();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const close = () => setAnchorEl(null);
  // Close the menu before running the action so any follow-up dialog/animation
  // isn't layered under the open menu.
  const run = (action: () => void) => () => {
    close();
    action();
  };

  return (
    <>
      <IconButton
        size={size}
        aria-label={intl.formatMessage({ id: 'page.media.more' })}
        aria-haspopup="true"
        onClick={(event) => {
          event.stopPropagation();
          setAnchorEl(event.currentTarget);
        }}
      >
        <MoreVertIcon fontSize={size} />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={close}>
        <MenuItem onClick={run(onRename)}>
          <ListItemIcon>
            <RenameIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <FormattedMessage id="page.media.rename" />
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={run(onDelete)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <FormattedMessage id="page.media.delete" />
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
