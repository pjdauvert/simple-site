import { useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Fab } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useIntl } from 'react-intl';
import { Loader } from '../Loader';

interface StickySaveButtonProps {
  /** Omit for `type="submit"` buttons — the surrounding form handles it. */
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  /** Replaces the icon/label with the brand spinner while the save is in flight. */
  submitting?: boolean;
}

/** Distance from the viewport bottom the floating shape keeps, in pixels. */
const STICKY_BOTTOM = 16;

/** Reserved for the floating shape, so flipping between shapes never moves the page. */
const ROW_HEIGHT = 56;

/**
 * The admin's draft-save button — the ONE save control every admin page/tab
 * renders, so the action is always visible and always looks and reads the same:
 * one icon, one label, one place (bottom-right of the editor column).
 *
 * It has two shapes and flips between them on its own:
 *
 * - **while the form still scrolls** — a round floating button, icon only, so it
 *   covers as little of the content it hovers over as possible;
 * - **once the end of the form is reached** — the ordinary labelled button,
 *   sitting in the flow where the reader expects a form to end.
 *
 * The shapes share an accessible name, so assistive tech and tests address a
 * single "Save" button either way. The row keeps a fixed height, so the flip
 * never shifts the page, and passes clicks through to whatever scrolls behind
 * it — only the button itself is solid.
 */
export const StickySaveButton: React.FC<StickySaveButtonProps> = ({
  onClick,
  type = 'button',
  disabled,
  submitting,
}) => {
  const intl = useIntl();
  const label = intl.formatMessage({ id: 'page.manage.save' });
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(true);

  useLayoutEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // The row rests in the flow exactly when the sentinel that follows it has
    // risen above the sticky offset — the same crossing the observer's bottom
    // `rootMargin` fires on, so measurement and observer agree at the boundary.
    const measure = () =>
      setAtEnd(sentinel.getBoundingClientRect().top <= window.innerHeight - STICKY_BOTTOM);

    measure(); // before paint, so neither shape flashes on mount
    // Progressive enhancement: without an observer the shape is decided once,
    // on mount — the labelled button on any page short enough not to scroll.
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(measure, {
      rootMargin: `0px 0px -${STICKY_BOTTOM}px 0px`,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const spinner = <Loader variant="triskelion" size={20} />;

  return (
    <>
      <Box
        sx={{
          position: 'sticky',
          bottom: `${STICKY_BOTTOM}px`,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          height: ROW_HEIGHT,
          mt: 3,
          pointerEvents: 'none',
        }}
      >
        {atEnd ? (
          <Button
            variant="contained"
            type={type}
            onClick={onClick}
            disabled={Boolean(disabled)}
            startIcon={submitting ? undefined : <SaveIcon />}
            sx={{ pointerEvents: 'auto', boxShadow: 6 }}
          >
            {submitting ? spinner : label}
          </Button>
        ) : (
          <Fab
            color="primary"
            type={type}
            onClick={onClick}
            disabled={Boolean(disabled)}
            aria-label={label}
            sx={{ pointerEvents: 'auto' }}
          >
            {submitting ? spinner : <SaveIcon />}
          </Fab>
        )}
      </Box>
      {/*
        Marks where the row rests in the flow; never drawn. It needs a real
        height: a zero-area target keeps an intersection ratio of 0 whichever
        side of the boundary it is on, so the observer would fire once on
        observe() and never again.
      */}
      <Box ref={sentinelRef} aria-hidden sx={{ height: '1px' }} />
    </>
  );
};
