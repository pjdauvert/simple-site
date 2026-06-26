import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  ButtonBase,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardMedia,
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
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  ContentCopy as ContentCopyIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  Link as LinkIcon,
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

/** Uppercase file extension derived from the name, e.g. "photo.PNG" → "PNG". */
const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : '';
};

/** Human-readable file size, e.g. 2_400_000 → "2.3 MB". */
const formatBytes = (bytes?: number): string => {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
};

/** Video length as m:ss, e.g. 75 → "1:15". */
const formatDuration = (seconds?: number): string => {
  if (seconds === undefined || !Number.isFinite(seconds)) return '';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

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
      // The V2 upload response IS ImageKit's acknowledgment of the new file, and
      // the list index is only eventually consistent — so show the uploads from
      // that response immediately rather than re-listing (which can lag ~1–2 s).
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
      } else {
        await deleteFolder(deleteTarget.folder.path);
      }
      setDeleteTarget(null);
      // Refresh from the server once ImageKit has acknowledged the deletion.
      await loadMedia(currentPath, filter);
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
      // Refresh from the server once ImageKit has acknowledged the new folder.
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
        <Box>
          {folders.length > 0 && (
            <Box sx={{ mb: files.length > 0 ? 4 : 0 }}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                <FormattedMessage id="page.media.foldersSection" />
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {folders.map((folder) => (
                  <FolderChip
                    key={folder.folderId}
                    folder={folder}
                    onOpen={() => setCurrentPath(folder.path)}
                    onDelete={() => setDeleteTarget({ kind: 'folder', folder })}
                  />
                ))}
              </Box>
            </Box>
          )}
          {files.length > 0 && (
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                <FormattedMessage id="page.media.filesSection" />
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                {files.map((file) => (
                  <FileCard key={file.fileId} item={file} onDelete={() => setDeleteTarget({ kind: 'file', file })} />
                ))}
              </Box>
            </Box>
          )}
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

interface FolderChipProps {
  folder: MediaFolder;
  onOpen: () => void;
  onDelete: () => void;
}

/** A rounded-rectangle folder entry: folder icon + name (click to open), with a delete action. */
const FolderChip: React.FC<FolderChipProps> = ({ folder, onOpen, onDelete }) => {
  const intl = useIntl();
  return (
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
  );
};

interface CopyButtonProps {
  value: string;
  label: string;
  copiedLabel: string;
  icon: React.ReactElement;
}

/** Copies `value` to the clipboard, flipping its tooltip to a confirmation for a moment. */
const CopyButton: React.FC<CopyButtonProps> = ({ value, label, copiedLabel, icon }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (e.g. insecure context) — silently ignore */
    }
  };
  return (
    <Tooltip title={copied ? copiedLabel : label}>
      <IconButton size="small" aria-label={label} onClick={handleCopy}>{icon}</IconButton>
    </Tooltip>
  );
};

interface FileCardProps {
  item: MediaFile;
  onDelete: () => void;
}

/**
 * Presentational media card: the thumbnail fills the top of the card; below it
 * sit the file name, a details line (extension, size, and image dimensions or
 * video length), and the copy-name / copy-URL / delete actions. Image
 * dimensions come from the listing; video length is read from the player
 * metadata since ImageKit does not return it.
 */
const FileCard: React.FC<FileCardProps> = ({ item, onDelete }) => {
  const intl = useIntl();
  const video = isVideo(item);
  const [meta, setMeta] = useState<{ width?: number; height?: number; duration?: number }>({
    width: item.width,
    height: item.height,
  });

  const detailParts = [extensionOf(item.name), formatBytes(item.size)];
  if (video) {
    detailParts.push(formatDuration(meta.duration));
  } else if (meta.width && meta.height) {
    detailParts.push(`${meta.width} × ${meta.height}`);
  }
  const details = detailParts.filter(Boolean).join('  ·  ');

  return (
    <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CardActionArea
        component="a"
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ position: 'relative' }}
      >
        {video ? (
          <CardMedia
            component="video"
            src={item.url}
            preload="metadata"
            muted
            onLoadedMetadata={(event: React.SyntheticEvent<HTMLVideoElement>) => {
              const el = event.currentTarget;
              setMeta({ width: el.videoWidth, height: el.videoHeight, duration: el.duration });
            }}
            sx={{ height: 160, objectFit: 'contain', bgcolor: 'action.hover' }}
          />
        ) : (
          <CardMedia
            component="img"
            image={`${item.url}?tr=w-400`}
            alt={item.name}
            sx={{ height: 160, objectFit: 'contain', bgcolor: 'action.hover' }}
          />
        )}
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
            <PlayArrowIcon sx={{ fontSize: 44, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
          </Box>
        )}
      </CardActionArea>

      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography variant="subtitle2" noWrap title={item.name}>
          {item.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {details}
        </Typography>
      </CardContent>

      <CardActions sx={{ pt: 0 }}>
        <CopyButton
          value={item.name}
          label={intl.formatMessage({ id: 'page.media.copyName' })}
          copiedLabel={intl.formatMessage({ id: 'page.media.copied' })}
          icon={<ContentCopyIcon fontSize="small" />}
        />
        <CopyButton
          value={item.url}
          label={intl.formatMessage({ id: 'page.media.copyUrl' })}
          copiedLabel={intl.formatMessage({ id: 'page.media.copied' })}
          icon={<LinkIcon fontSize="small" />}
        />
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          size="small"
          aria-label={intl.formatMessage({ id: 'page.media.delete' })}
          onClick={onDelete}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
};
