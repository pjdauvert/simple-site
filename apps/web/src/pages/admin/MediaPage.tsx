import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  LinearProgress,
  Link,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { MediaFile, MediaFolder, MediaType } from '@simple-site/interfaces';
import {
  createFolder,
  deleteFolder,
  deleteMedia,
  listMedia,
  uploadMedia,
} from '../../services/mediaService';

const isVideo = (file: MediaFile): boolean =>
  file.mime?.startsWith('video/') ?? file.fileType === 'non-image';

const matchesFilter = (file: MediaFile, type: MediaType): boolean =>
  type === 'all' || (type === 'video' ? isVideo(file) : !isVideo(file));

interface UploadProgress {
  name: string;
  percent: number;
}

type DeleteTarget =
  | { kind: 'file'; file: MediaFile }
  | { kind: 'folder'; folder: MediaFolder };

export const MediaPage: React.FC = () => {
  const intl = useIntl();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPath, setCurrentPath] = useState('');
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MediaType>('all');
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const loadMedia = useCallback(async (path: string, type: MediaType) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listMedia(path, type);
      setFolders(result.folders);
      setFiles(result.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.load' }));
    } finally {
      setLoading(false);
    }
  }, [intl]);

  useEffect(() => {
    loadMedia(currentPath, filter);
  }, [currentPath, filter, loadMedia]);

  const handleFilterChange = (_event: React.MouseEvent<HTMLElement>, next: MediaType | null) => {
    if (next) setFilter(next);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = ''; // allow re-selecting the same file
    if (selected.length === 0) return;

    setError(null);
    setUploads(selected.map((file) => ({ name: file.name, percent: 0 })));

    try {
      const uploaded: MediaFile[] = [];
      for (const file of selected) {
        uploaded.push(
          await uploadMedia(file, currentPath, (percent) =>
            setUploads((prev) => prev.map((u) => (u.name === file.name ? { ...u, percent } : u))),
          ),
        );
      }
      // ImageKit's list index is eventually consistent, so show the uploads
      // straight from the upload response rather than re-listing immediately.
      setFiles((prev) => {
        const seen = new Set(prev.map((f) => f.fileId));
        const fresh = uploaded.filter((f) => !seen.has(f.fileId) && matchesFilter(f, filter));
        return [...fresh, ...prev];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.upload' }));
    } finally {
      setUploads([]);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'file') {
        await deleteMedia(deleteTarget.file.fileId);
        setFiles((prev) => prev.filter((f) => f.fileId !== deleteTarget.file.fileId));
      } else {
        await deleteFolder(deleteTarget.folder.path);
        setFolders((prev) => prev.filter((f) => f.folderId !== deleteTarget.folder.folderId));
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.folder' }));
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      await createFolder(name, currentPath);
      setNewFolderOpen(false);
      setNewFolderName('');
      await loadMedia(currentPath, filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.folder' }));
    } finally {
      setCreatingFolder(false);
    }
  };

  const segments = currentPath.split('/').filter(Boolean);
  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Box
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
      >
        <Typography variant="h5">
          <FormattedMessage id="page.media.title" />
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<CreateNewFolderIcon />} onClick={() => setNewFolderOpen(true)}>
            <FormattedMessage id="page.media.newFolder" />
          </Button>
          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={handleUploadClick}>
            <FormattedMessage id="page.media.upload" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={handleFilesSelected}
          />
        </Box>
      </Box>

      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          type="button"
          underline="hover"
          color={segments.length === 0 ? 'text.primary' : 'inherit'}
          onClick={() => setCurrentPath('')}
        >
          <FormattedMessage id="page.media.root" />
        </Link>
        {segments.map((segment, index) => {
          const path = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;
          return isLast ? (
            <Typography key={path} color="text.primary">{segment}</Typography>
          ) : (
            <Link
              key={path}
              component="button"
              type="button"
              underline="hover"
              color="inherit"
              onClick={() => setCurrentPath(path)}
            >
              {segment}
            </Link>
          );
        })}
      </Breadcrumbs>

      <ToggleButtonGroup value={filter} exclusive onChange={handleFilterChange} size="small" sx={{ mb: 3 }}>
        <ToggleButton value="all"><FormattedMessage id="page.media.filter.all" /></ToggleButton>
        <ToggleButton value="image"><FormattedMessage id="page.media.filter.images" /></ToggleButton>
        <ToggleButton value="video"><FormattedMessage id="page.media.filter.videos" /></ToggleButton>
      </ToggleButtonGroup>

      {uploads.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <FormattedMessage id="page.media.uploading" values={{ count: uploads.length }} />
          </Typography>
          {uploads.map((upload) => (
            <Box key={upload.name} sx={{ mb: 1 }}>
              <Typography variant="caption" noWrap sx={{ display: 'block' }}>{upload.name}</Typography>
              <LinearProgress variant="determinate" value={upload.percent} />
            </Box>
          ))}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : isEmpty ? (
        <Typography variant="body1" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          <FormattedMessage id="page.media.empty" />
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {folders.map((folder) => (
            <FolderTile
              key={folder.folderId}
              folder={folder}
              onOpen={() => setCurrentPath(folder.path)}
              onDelete={() => setDeleteTarget({ kind: 'folder', folder })}
            />
          ))}
          {files.map((file) => (
            <MediaTile key={file.fileId} item={file} onDelete={() => setDeleteTarget({ kind: 'file', file })} />
          ))}
        </Box>
      )}

      {/* Delete confirmation (file or folder) */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle>
          <FormattedMessage
            id={deleteTarget?.kind === 'folder' ? 'page.media.deleteFolderConfirm.title' : 'page.media.deleteConfirm.title'}
          />
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <FormattedMessage
              id={deleteTarget?.kind === 'folder' ? 'page.media.deleteFolderConfirm.body' : 'page.media.deleteConfirm.body'}
              values={{
                name: deleteTarget?.kind === 'folder' ? deleteTarget.folder.name : deleteTarget?.file.name ?? '',
              }}
            />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            <FormattedMessage id="page.media.cancel" />
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.media.confirm" />}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New folder */}
      <Dialog open={newFolderOpen} onClose={() => !creatingFolder && setNewFolderOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle><FormattedMessage id="page.media.newFolder.title" /></DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            variant="standard"
            label={intl.formatMessage({ id: 'page.media.newFolder.label' })}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFolderOpen(false)} disabled={creatingFolder}>
            <FormattedMessage id="page.media.cancel" />
          </Button>
          <Button
            onClick={handleCreateFolder}
            variant="contained"
            disabled={creatingFolder || newFolderName.trim().length === 0}
          >
            {creatingFolder ? <CircularProgress size={20} color="inherit" /> : <FormattedMessage id="page.media.create" />}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

interface FolderTileProps {
  folder: MediaFolder;
  onOpen: () => void;
  onDelete: () => void;
}

const FolderTile: React.FC<FolderTileProps> = ({ folder, onOpen, onDelete }) => {
  const intl = useIntl();
  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        aspectRatio: '1 / 1',
        bgcolor: 'action.hover',
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={onOpen}
        aria-label={intl.formatMessage({ id: 'page.media.openFolder' }, { name: folder.name })}
        sx={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: 'text.secondary',
          gap: 1,
        }}
      >
        <FolderIcon sx={{ fontSize: 56 }} />
        <Typography variant="caption" noWrap sx={{ maxWidth: '90%' }}>{folder.name}</Typography>
      </Box>
      <IconButton
        size="small"
        aria-label={intl.formatMessage({ id: 'page.media.deleteFolder' })}
        onClick={onDelete}
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          bgcolor: 'rgba(0,0,0,0.45)',
          color: 'common.white',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};

interface MediaTileProps {
  item: MediaFile;
  onDelete: () => void;
}

const MediaTile: React.FC<MediaTileProps> = ({ item, onDelete }) => {
  const intl = useIntl();
  const video = isVideo(item);

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        aspectRatio: '1 / 1',
        bgcolor: 'action.hover',
      }}
    >
      <Box
        component="a"
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ display: 'block', width: '100%', height: '100%' }}
      >
        {video ? (
          <Box
            component="video"
            src={item.url}
            preload="metadata"
            muted
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box
            component="img"
            src={item.thumbnail ?? `${item.url}?tr=w-300,h-300,fo-auto`}
            alt={item.name}
            loading="lazy"
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </Box>

      {video && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            color: 'common.white',
          }}
        >
          <PlayArrowIcon sx={{ fontSize: 48, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
        </Box>
      )}

      <IconButton
        size="small"
        aria-label={intl.formatMessage({ id: 'page.media.delete' })}
        onClick={onDelete}
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          bgcolor: 'rgba(0,0,0,0.55)',
          color: 'common.white',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>

      <Typography
        variant="caption"
        noWrap
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          px: 1,
          py: 0.5,
          bgcolor: 'rgba(0,0,0,0.55)',
          color: 'common.white',
        }}
      >
        {item.name}
      </Typography>
    </Box>
  );
};
