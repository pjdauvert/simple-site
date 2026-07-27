import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { Loader } from '../Loader';

interface DeleteConfirmDialogProps {
  open: boolean;
  loading: boolean;
  /** Single-item delete: whether the target is a folder. */
  isFolder?: boolean;
  /** Single-item delete: the target's name. */
  name?: string;
  /** Bulk delete: number of selected files. When set, overrides the single-item copy. */
  count?: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation dialog for deleting a file, a folder (and its contents), or a bulk selection. */
export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  loading,
  isFolder = false,
  name = '',
  count,
  onCancel,
  onConfirm,
}) => {
  const bulk = count != null;
  const titleId = bulk
    ? 'page.media.deleteSelectedConfirm.title'
    : isFolder
      ? 'page.media.deleteFolderConfirm.title'
      : 'page.media.deleteConfirm.title';
  const bodyId = bulk
    ? 'page.media.deleteSelectedConfirm.body'
    : isFolder
      ? 'page.media.deleteFolderConfirm.body'
      : 'page.media.deleteConfirm.body';

  return (
    <Dialog open={open} onClose={() => !loading && onCancel()}>
      <DialogTitle>
        <FormattedMessage id={titleId} />
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          <FormattedMessage id={bodyId} values={bulk ? { count } : { name }} />
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          <FormattedMessage id="page.media.cancel" />
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
          {loading ? <Loader variant="triskelion" size={20} /> : <FormattedMessage id="page.media.confirm" />}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
