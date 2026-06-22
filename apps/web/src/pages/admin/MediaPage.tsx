import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import type { MediaFile, MediaType } from '@simple-site/interfaces';
import { deleteMedia, listMedia, uploadMedia } from '../../services/mediaService';

const isVideo = (file: MediaFile): boolean =>
  file.mime?.startsWith('video/') ?? file.fileType === 'non-image';

interface UploadProgress {
  name: string;
  percent: number;
}

export const MediaPage: React.FC = () => {
  const intl = useIntl();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MediaType>('all');
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMedia = useCallback(async (type: MediaType) => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listMedia(type));
    } catch (err) {
      setError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.load' }));
    } finally {
      setLoading(false);
    }
  }, [intl]);

  useEffect(() => {
    loadMedia(filter);
  }, [filter, loadMedia]);

  const handleFilterChange = (_event: React.MouseEvent<HTMLElement>, next: MediaType | null) => {
    if (next) setFilter(next);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ''; // allow re-selecting the same file
    if (files.length === 0) return;

    setError(null);
    setUploads(files.map((file) => ({ name: file.name, percent: 0 })));

    try {
      for (const file of files) {
        await uploadMedia(file, (percent) =>
          setUploads((prev) => prev.map((u) => (u.name === file.name ? { ...u, percent } : u))),
        );
      }
      await loadMedia(filter);
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
      await deleteMedia(deleteTarget.fileId);
      setItems((prev) => prev.filter((item) => item.fileId !== deleteTarget.fileId));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : intl.formatMessage({ id: 'page.media.error.load' }));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Typography variant="h5">
          <FormattedMessage id="page.media.title" />
        </Typography>
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

      <ToggleButtonGroup
        value={filter}
        exclusive
        onChange={handleFilterChange}
        size="small"
        sx={{ mb: 3 }}
      >
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
      ) : items.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          <FormattedMessage id="page.media.empty" />
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 2,
          }}
        >
          {items.map((item) => (
            <MediaTile key={item.fileId} item={item} onDelete={() => setDeleteTarget(item)} />
          ))}
        </Box>
      )}

      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle><FormattedMessage id="page.media.deleteConfirm.title" /></DialogTitle>
        <DialogContent>
          <DialogContentText>
            <FormattedMessage
              id="page.media.deleteConfirm.body"
              values={{ name: deleteTarget?.name ?? '' }}
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
