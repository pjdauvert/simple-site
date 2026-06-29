import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { FormattedMessage } from 'react-intl';

interface DeleteConfirmDialogProps {
  open: boolean;
  isFolder: boolean;
  name: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation dialog for deleting a file or a folder (and its contents). */
export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  isFolder,
  name,
  loading,
  onCancel,
  onConfirm,
}) => (
  <Dialog open={open} onClose={() => !loading && onCancel()}>
    <DialogTitle>
      <FormattedMessage id={isFolder ? 'page.media.deleteFolderConfirm.title' : 'page.media.deleteConfirm.title'} />
    </DialogTitle>
    <DialogContent>
      <DialogContentText>
        <FormattedMessage
          id={isFolder ? 'page.media.deleteFolderConfirm.body' : 'page.media.deleteConfirm.body'}
          values={{ name }}
        />
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} disabled={loading}>
        <FormattedMessage id="page.media.cancel" />
      </Button>
      <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
        {loading ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.media.confirm" />}
      </Button>
    </DialogActions>
  </Dialog>
);
