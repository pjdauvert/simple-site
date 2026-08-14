import { Box, Button } from '@mui/material';
import { Loader } from '../Loader';

interface StickySaveButtonProps {
  /** Omit for `type="submit"` buttons — the surrounding form handles it. */
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  /** Replaces the label with the brand spinner while the save is in flight. */
  submitting?: boolean;
  startIcon?: React.ReactNode;
  /** The button label (a `<FormattedMessage>`). */
  children: React.ReactNode;
}

/**
 * The admin's draft-save button — every admin page/tab uses it, so the save
 * action is ALWAYS visible: pinned to the bottom-right of its editor column
 * while the form scrolls (`position: sticky`), settling into the page flow at
 * the natural end of the content. The full-width wrapper row lets clicks pass
 * through to whatever scrolls behind it — only the button itself is solid —
 * and the shadow lifts it above the content it floats over.
 */
export const StickySaveButton: React.FC<StickySaveButtonProps> = ({
  onClick,
  type = 'button',
  disabled,
  submitting,
  startIcon,
  children,
}) => (
  <Box
    sx={{
      position: 'sticky',
      bottom: 16,
      zIndex: 2,
      display: 'flex',
      justifyContent: 'flex-end',
      mt: 3,
      pointerEvents: 'none',
    }}
  >
    <Button
      variant="contained"
      type={type}
      onClick={onClick}
      disabled={Boolean(disabled)}
      startIcon={startIcon}
      sx={{ pointerEvents: 'auto', boxShadow: 6 }}
    >
      {submitting ? <Loader variant="triskelion" size={20} /> : children}
    </Button>
  </Box>
);
