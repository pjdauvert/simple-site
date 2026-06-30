import { useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardMedia,
  IconButton,
  Typography,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import type { MediaFile } from '@simple-site/interfaces';
import { CopyButton } from './CopyButton';
import { ItemTransition } from './ItemTransition';
import { extensionOf, formatBytes, formatDuration, isVideo } from './mediaUtils';
import type { DeletionPhase } from './types';

interface FileCardProps {
  item: MediaFile;
  onDelete: () => void;
  /** Position in the grid, used to stagger the entrance cascade. */
  index?: number;
  /** In-place deletion treatment; undefined renders the card normally. */
  deletionPhase?: DeletionPhase;
  /** Fired once the fade-out/minimize finishes so the parent can drop the file. */
  onRemoved?: () => void;
}

/**
 * Presentational media card: the thumbnail fills the top of the card; below it
 * sit the file name, a details line (extension, size, and image dimensions or
 * video length), and the copy-name / copy-URL / delete actions. Image
 * dimensions come from the listing; video length is read from the player
 * metadata since ImageKit does not return it.
 */
export const FileCard: React.FC<FileCardProps> = ({ item, onDelete, index, deletionPhase, onRemoved }) => {
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
    <ItemTransition phase={deletionPhase} index={index} loaderSize={64} onRemoved={onRemoved}>
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
    </ItemTransition>
  );
};
