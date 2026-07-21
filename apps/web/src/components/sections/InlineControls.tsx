import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, IconButton, Popover, Tooltip } from '@mui/material';
import {
  Add as AddIcon,
  EditOutlined as EditIcon,
} from '@mui/icons-material';
import { useSectionEdit } from './sectionEdit';

type Corner = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';

const CORNER: Record<Corner, object> = {
  'top-right': { top: 4, right: 4 },
  'bottom-right': { bottom: 4, right: 4 },
  'top-left': { top: 4, left: 4 },
  'bottom-left': { bottom: 4, left: 4 },
};

const floatingButtonSx = (corner: Corner) => ({
  position: 'absolute' as const,
  ...CORNER[corner],
  zIndex: 5,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: 2,
  '&:hover': { bgcolor: 'background.paper', borderColor: 'text.secondary' },
});

interface InlineDesignPopoverProps {
  label: string;
  corner?: Corner;
  icon?: ReactNode;
  /** Popover panel width in px. */
  width?: number;
  children: ReactNode;
}

/**
 * A floating design trigger anchored over the element it decorates: a small gear
 * that opens a popover holding design controls. Rendered only while a section is
 * being edited inline (absent on the public site). The decorated element must be
 * `position: relative`. Popover contents mount lazily on open.
 */
export const InlineDesignPopover: React.FC<InlineDesignPopoverProps> = ({
  label,
  corner = 'bottom-right',
  icon,
  width = 300,
  children,
}) => {
  const edit = useSectionEdit();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  if (!edit) return null;

  return (
    <>
      <Tooltip title={label}>
        <IconButton
          size="small"
          className="inline-design-trigger"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={label}
          sx={floatingButtonSx(corner)}
        >
          {icon ?? <EditIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, width, maxWidth: '92vw' }}>{children}</Box>
      </Popover>
    </>
  );
};

interface InlineAddButtonProps {
  /** Dotted `content` path of the repeatable list, e.g. `ctaButtons`. */
  contentPath: string;
  /** A blank item to append. */
  blank: unknown;
  label: string;
}

/**
 * An inline "add item" affordance (⊕) for a repeatable list, on the rendered
 * section. Rendered only while editing inline.
 */
export const InlineAddButton: React.FC<InlineAddButtonProps> = ({ contentPath, blank, label }) => {
  const edit = useSectionEdit();
  if (!edit) return null;

  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        onClick={() => edit.addItemAt(contentPath, blank)}
        aria-label={label}
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          color: 'text.secondary',
          '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
        }}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};
