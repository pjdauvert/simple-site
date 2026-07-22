import type { Theme } from '@mui/material/styles';

/** Class marking the hover zone a `revealOnHover` trigger fades in from. */
export const INLINE_REVEAL_ZONE = 'inline-reveal-zone';

/**
 * Edit-only styles for a hover-reveal zone: a subtle dashed outline while
 * hovered, pairing with the `revealOnHover` triggers inside it. Outline, not
 * border, so the layout never shifts. Base transition runs on leave (ease-out);
 * the hovered state re-declares it so the fade-in eases in.
 */
export const inlineRevealZoneSx = (theme: Theme) => ({
  borderRadius: 1,
  outline: '1px dashed transparent',
  outlineOffset: '4px',
  transition: 'outline-color 180ms ease-out',
  '&:hover': {
    outlineColor: theme.palette.divider,
    transition: 'outline-color 180ms ease-in',
  },
});
