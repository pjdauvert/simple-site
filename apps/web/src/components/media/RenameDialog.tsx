import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';

interface RenameDialogProps {
  open: boolean;
  isFolder: boolean;
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Prompt to rename a file or folder; the field is pre-filled with the current name. */
export const RenameDialog: React.FC<RenameDialogProps> = ({
  open,
  isFolder,
  value,
  loading,
  onChange,
  onCancel,
  onConfirm,
}) => {
  const intl = useIntl();
  return (
    <Dialog open={open} onClose={() => !loading && onCancel()} fullWidth maxWidth="xs">
      <DialogTitle>
        <FormattedMessage id={isFolder ? 'page.media.renameFolder.title' : 'page.media.renameFile.title'} />
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          variant="standard"
          label={intl.formatMessage({ id: 'page.media.rename.label' })}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && value.trim().length > 0) onConfirm();
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          <FormattedMessage id="page.media.cancel" />
        </Button>
        <Button onClick={onConfirm} variant="contained" disabled={loading || value.trim().length === 0}>
          {loading ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.media.rename" />}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
