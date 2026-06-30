import { Box, ButtonBase, IconButton, Typography } from '@mui/material';
import { Delete as DeleteIcon, Folder as FolderIcon } from '@mui/icons-material';
import { useIntl } from 'react-intl';
import type { MediaFolder } from '@simple-site/interfaces';
import { ItemTransition } from './ItemTransition';
import type { DeletionPhase } from './types';

interface FolderChipProps {
  folder: MediaFolder;
  onOpen: () => void;
  onDelete: () => void;
  /** Position in the folder row, used to stagger the entrance cascade. */
  index?: number;
  /** In-place deletion treatment; undefined renders the chip normally. */
  deletionPhase?: DeletionPhase;
  /** Fired once the fade-out/minimize finishes so the parent can drop the folder. */
  onRemoved?: () => void;
}

/** A rounded-rectangle folder entry: folder icon + name (click to open), with a delete action. */
export const FolderChip: React.FC<FolderChipProps> = ({
  folder,
  onOpen,
  onDelete,
  index,
  deletionPhase,
  onRemoved,
}) => {
  const intl = useIntl();
  return (
    <ItemTransition phase={deletionPhase} index={index} inline loaderSize={28} onRemoved={onRemoved}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          maxWidth: '100%',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
          overflow: 'hidden',
        }}
      >
        <ButtonBase
          onClick={onOpen}
          aria-label={intl.formatMessage({ id: 'page.media.openFolder' }, { name: folder.name })}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, minWidth: 0 }}
        >
          <FolderIcon fontSize="small" color="action" />
          <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{folder.name}</Typography>
        </ButtonBase>
        <IconButton
          size="small"
          aria-label={intl.formatMessage({ id: 'page.media.deleteFolder' })}
          onClick={onDelete}
          sx={{ mr: 0.5 }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </ItemTransition>
  );
};
