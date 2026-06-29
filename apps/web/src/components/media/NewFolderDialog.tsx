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

interface NewFolderDialogProps {
  open: boolean;
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Dialog prompting for a new folder name. */
export const NewFolderDialog: React.FC<NewFolderDialogProps> = ({
  open,
  value,
  loading,
  onChange,
  onCancel,
  onConfirm,
}) => {
  const intl = useIntl();
  return (
    <Dialog open={open} onClose={() => !loading && onCancel()} fullWidth maxWidth="xs">
      <DialogTitle><FormattedMessage id="page.media.newFolder.title" /></DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          variant="standard"
          label={intl.formatMessage({ id: 'page.media.newFolder.label' })}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') onConfirm(); }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          <FormattedMessage id="page.media.cancel" />
        </Button>
        <Button onClick={onConfirm} variant="contained" disabled={loading || value.trim().length === 0}>
          {loading ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.media.create" />}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
