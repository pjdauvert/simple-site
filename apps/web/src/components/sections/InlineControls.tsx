import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, IconButton, Popover, Tooltip } from '@mui/material';
import { INLINE_REVEAL_ZONE } from './inlineReveal';
import {
  Add as AddIcon,
  EditOutlined as EditIcon,
  Translate as TranslateIcon,
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
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
  /**
   * Fade the trigger in only while its closest `.inline-reveal-zone` ancestor is
   * hovered (or the trigger is keyboard-focused / its popover is open) — keeps
   * crowded areas clean until the admin points at them.
   */
  revealOnHover?: boolean;
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
  revealOnHover,
  children,
}) => {
  const edit = useSectionEdit();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  if (!edit) return null;

  // Base transition runs on leave (ease-out); the hovered state re-declares it
  // so the fade-in eases in.
  const revealSx = revealOnHover && !anchor
    ? {
        opacity: 0,
        pointerEvents: 'none' as const,
        transition: 'opacity 180ms ease-out',
        [`.${INLINE_REVEAL_ZONE}:hover &, &:focus-visible`]: {
          opacity: 1,
          pointerEvents: 'auto',
          transition: 'opacity 180ms ease-in',
        },
      }
    : {};

  return (
    <>
      <Tooltip title={label}>
        <IconButton
          size="small"
          className="inline-design-trigger"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={label}
          sx={{ ...floatingButtonSx(corner), ...revealSx }}
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

interface InlineTranslateButtonProps {
  /** The field's exact i18n key, e.g. `page.home.hero.content.title`. */
  i18nKey: string;
  /** Shown only while the decorated field has focus. */
  visible: boolean;
}

/**
 * A floating "translate" trigger shown over a focused editable text slot; opens
 * the Translations editor in a new tab, deep-linked to the field's key. The
 * decorated wrapper must be `position: relative`. Callers render it only in the
 * edit branch, so it never reaches the public site.
 */
export const InlineTranslateButton: React.FC<InlineTranslateButtonProps> = ({
  i18nKey,
  visible,
}) => {
  const intl = useIntl();
  if (!visible) return null;

  const label = intl.formatMessage({ id: 'page.manage.pages.inline.translate' });
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        aria-label={label}
        // Keep the field focused so the click lands before any blur hides the button.
        onMouseDown={(e) => e.preventDefault()}
        // Same-origin target, deliberately no `noopener`: severing the opener would
        // stop sessionStorage cloning into the new tab, logging out dev mock auth.
        onClick={() =>
          window.open(`/manage/translations?key=${encodeURIComponent(i18nKey)}`, '_blank')
        }
        sx={floatingButtonSx('top-right')}
      >
        <TranslateIcon fontSize="small" />
      </IconButton>
    </Tooltip>
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
