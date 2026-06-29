import { useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';

interface DropZoneProps {
  /** Called with the selected/dropped media files (already filtered to image/video on drop). */
  onFiles: (files: File[]) => void;
}

const isMedia = (file: File): boolean =>
  file.type.startsWith('image/') || file.type.startsWith('video/');

/** Clickable, dashed drop zone that opens a file picker and emits the chosen media files. */
export const DropZone: React.FC<DropZoneProps> = ({ onFiles }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const open = () => inputRef.current?.click();

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        }}
        onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          onFiles(Array.from(event.dataTransfer.files).filter(isMedia));
        }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          p: { xs: 3, sm: 4 },
          mb: 2,
          textAlign: 'center',
          cursor: 'pointer',
          color: dragActive ? 'primary.main' : 'text.secondary',
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          borderRadius: 2,
          bgcolor: dragActive ? 'action.hover' : 'transparent',
          transition: (theme) => theme.transitions.create(['border-color', 'background-color', 'color']),
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 40 }} />
        <Typography variant="body2"><FormattedMessage id="page.media.dropzone" /></Typography>
      </Box>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? []);
          event.target.value = ''; // allow re-selecting the same file
          onFiles(selected);
        }}
      />
    </>
  );
};
