import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { Folder as FolderIcon } from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { MediaFile, MediaFolder } from '@simple-site/interfaces';
import { listMedia } from '../../services/mediaService';
import { useNotifications } from '../../hooks/useNotifications';
import { MediaBreadcrumbs } from './MediaBreadcrumbs';

interface ImagePickerDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the selected image's URL; the dialog then closes. */
  onSelect: (url: string) => void;
}

/**
 * Browse the Media library (images only) and pick one. A lightweight read-only
 * counterpart to the full Media page: folders navigate, files select. Returns the
 * chosen file's `url` via `onSelect`.
 */
export const ImagePickerDialog: React.FC<ImagePickerDialogProps> = ({ open, onClose, onSelect }) => {
  const intl = useIntl();
  const notify = useNotifications();
  const [currentPath, setCurrentPath] = useState('');
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async (path: string) => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const result = await listMedia(path, 'image');
      setFolders(result.folders);
      setFiles(result.files);
    } catch (err) {
      setLoadFailed(true);
      notify.error(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.manage.site.picker.error' }));
    } finally {
      setLoading(false);
    }
  }, [intl, notify]);

  // Reset to the root each time the dialog opens.
  useEffect(() => {
    if (open) setCurrentPath('');
  }, [open]);

  useEffect(() => {
    if (open) load(currentPath);
  }, [open, currentPath, load]);

  const segments = currentPath.split('/').filter(Boolean);
  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle><FormattedMessage id="page.manage.site.picker.title" /></DialogTitle>
      <DialogContent dividers sx={{ minHeight: 360 }}>
        <MediaBreadcrumbs segments={segments} onNavigate={setCurrentPath} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {folders.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {folders.map((folder) => (
                  <Chip
                    key={folder.folderId}
                    icon={<FolderIcon />}
                    label={folder.name}
                    variant="outlined"
                    onClick={() => setCurrentPath(folder.path)}
                  />
                ))}
              </Box>
            )}

            {files.length > 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                  gap: 1.5,
                }}
              >
                {files.map((file) => (
                  <ButtonBase
                    key={file.fileId}
                    onClick={() => { onSelect(file.url); onClose(); }}
                    aria-label={intl.formatMessage({ id: 'page.manage.site.picker.select' }, { name: file.name })}
                    sx={{
                      display: 'block',
                      textAlign: 'left',
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    <Box
                      component="img"
                      src={`${file.url}?tr=w-200,h-200,q-75,f-auto`}
                      alt={file.name}
                      loading="lazy"
                      sx={{ display: 'block', width: '100%', height: 120, objectFit: 'contain', bgcolor: 'action.hover' }}
                    />
                    <Typography variant="caption" noWrap sx={{ display: 'block', px: 0.75, py: 0.25 }}>
                      {file.name}
                    </Typography>
                  </ButtonBase>
                ))}
              </Box>
            )}

            {isEmpty && !loadFailed && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                <FormattedMessage id="page.manage.site.picker.empty" />
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}><FormattedMessage id="page.manage.site.picker.cancel" /></Button>
      </DialogActions>
    </Dialog>
  );
};
