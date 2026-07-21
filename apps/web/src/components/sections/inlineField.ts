import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

/**
 * Shared styles for in-place fields. Everything typographic is inherited from the
 * element the field sits in (font, colour, alignment, line-height), so editing
 * happens *inside* the real rendered text with no layout shift.
 */
export const inlineFieldStyles = ({ theme }: { theme: Theme }) => ({
  font: 'inherit',
  color: 'inherit',
  letterSpacing: 'inherit',
  lineHeight: 'inherit',
  textAlign: 'inherit' as const,
  background: 'transparent',
  border: 0,
  outline: 'none',
  padding: 0,
  margin: 0,
  width: '100%',
  display: 'block',
  resize: 'none' as const,
  overflow: 'hidden',
  borderRadius: 4,
  cursor: 'text',
  '&:hover': { boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.35)}` },
  '&:focus, &:focus-within': { boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.9)}` },
  '&::placeholder': { opacity: 0.5, fontStyle: 'italic' },
});
