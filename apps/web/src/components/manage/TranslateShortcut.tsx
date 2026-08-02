import { IconButton, Tooltip } from '@mui/material';
import { Translate as TranslateIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Icon button opening the Translations page deep-linked to an i18n key
 * (`/manage/translations?key=<key>`) in a new tab. The single home of that
 * deep-link contract — use it for every "translate this field" shortcut
 * (`InlineTranslateButton` stays separate for its floating, focus-preserving
 * behavior on the pages canvas).
 *
 * Same-origin target, deliberately no `noopener` (see InlineTranslateButton):
 * severing the opener would stop sessionStorage cloning into the new tab.
 */
export const TranslateShortcut: React.FC<{ i18nKey: string; label: string; sx?: SxProps<Theme> }> = ({
  i18nKey,
  label,
  sx,
}) => (
  <Tooltip title={label}>
    <IconButton
      size="small"
      sx={sx}
      onClick={() => window.open(`/manage/translations?key=${encodeURIComponent(i18nKey)}`, '_blank')}
      aria-label={label}
    >
      <TranslateIcon fontSize="small" />
    </IconButton>
  </Tooltip>
);
