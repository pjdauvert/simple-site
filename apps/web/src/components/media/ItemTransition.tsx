import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { Loader } from '../Loader';
import type { DeletionPhase } from './types';

interface ItemTransitionProps {
  /** When set, the wrapped item is being deleted; undefined renders it normally. */
  phase?: DeletionPhase;
  /** Position in its section, used to stagger the entrance cascade. */
  index?: number;
  /** Size of the concentric pulse loader shown during the `pending` phase. */
  loaderSize?: number;
  /** Lay the wrapper out inline (folder chip) rather than filling a grid cell. */
  inline?: boolean;
  /** Fired once the `removing` fade-out/minimize finishes, to drop the item. */
  onRemoved?: () => void;
  children: React.ReactNode;
}

// Entrance and removal mirror each other; the entrance is the inverse of the exit.
const MOTION_MS = 400;
// Per-item stagger for the entrance cascade, capped so long lists don't crawl in.
const STAGGER_MS = 45;
const MAX_STAGGER_STEPS = 12;

// Fade out and shrink the item away before it leaves the list.
const collapseOut = keyframes`
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.6); }
`;

// Entrance: fade in while growing back from the minimized state — the exit reversed.
const expandIn = keyframes`
  from { opacity: 0; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1); }
`;

const reducedMotion = '@media (prefers-reduced-motion: reduce)';

/**
 * Wraps a media item with its full appear/disappear motion. On mount it cascades
 * in (`expandIn`, staggered by `index` — every fetch remounts the grid behind the
 * loader, so the cascade replays). While `pending`, the item is blurred +
 * greyscaled with a concentric pulse loader over it; once `removing`, it fades and
 * minimizes (the inverse of the entrance), then calls `onRemoved` so the parent
 * can drop it from the list.
 */
export const ItemTransition: React.FC<ItemTransitionProps> = ({
  phase,
  index = 0,
  loaderSize = 56,
  inline = false,
  onRemoved,
  children,
}) => {
  const removing = phase === 'removing';
  const active = phase != null;
  const box = inline ? { display: 'inline-flex', maxWidth: '100%' } : { height: '100%' };

  // Captured once at mount so a later index shift (e.g. an upload prepended ahead
  // of this item) can't restart the entrance animation.
  const [enterDelayMs] = useState(() => Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS);

  // Drop the item once the fade-out has played. A timer (rather than animationend)
  // keeps this deterministic where CSS animations don't run — tests, reduced motion.
  const onRemovedRef = useRef(onRemoved);
  onRemovedRef.current = onRemoved;
  useEffect(() => {
    if (!removing) return undefined;
    const timer = setTimeout(() => onRemovedRef.current?.(), MOTION_MS);
    return () => clearTimeout(timer);
  }, [removing]);

  let motion;
  if (removing) {
    motion = {
      animation: `${collapseOut} ${MOTION_MS}ms ease forwards`,
      [reducedMotion]: { animationDuration: '0.001ms !important' },
    };
  } else if (!active) {
    motion = {
      animation: `${expandIn} ${MOTION_MS}ms ease both`,
      animationDelay: `${enterDelayMs}ms`,
      [reducedMotion]: { animation: 'none' },
    };
  }

  return (
    <Box sx={{ position: 'relative', ...box, ...motion }}>
      <Box
        sx={{
          ...box,
          transition: 'filter 0.3s ease',
          ...(active && { filter: 'blur(2px) grayscale(1)', pointerEvents: 'none' }),
        }}
      >
        {children}
      </Box>
      {phase === 'pending' && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <Loader variant="pulse" size={loaderSize} />
        </Box>
      )}
    </Box>
  );
};
