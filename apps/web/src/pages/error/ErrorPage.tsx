import { useRef, useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';

export type ErrorPageProps = {
    title: string;
    message: string;
}

// Brand constants — hardcoded because this page may render outside ThemeProvider
// (e.g. when the i18n or config layer fails before the MUI tree is mounted).
const BRAND_PRIMARY  = '#FF4D6D';
const BRAND_TERTIARY = '#9BD83C';
const BLOB_TRANSITION = 'transform 1.4s cubic-bezier(0.23, 1, 0.32, 1)';

export const ErrorPage: React.FC<ErrorPageProps> = ({ title, message }) => {
  // KNOWN LIMITATION: this error screen is always rendered in English regardless of user
  // locale. Localising it would require a synchronous fallback message bundle loaded before
  // the async translation fetch — complexity not warranted at this stage. Accepted trade-off:
  // the i18n layer has failed, so no translated string is available anyway.

  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    setMouse({
      x: (e.clientX - left) / width,
      y: (e.clientY - top) / height,
    });
  }, []);

  const handleMouseLeave = useCallback(() => setMouse({ x: 0.5, y: 0.5 }), []);

  const dx = mouse.x - 0.5;
  const dy = mouse.y - 0.5;

  return (
    <Box
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow — uses inline style so no MUI theme dependency */}
      <Box sx={{
        position: 'absolute', pointerEvents: 'none',
        width: 380, height: 380, borderRadius: '50%',
        background: `radial-gradient(circle, ${BRAND_PRIMARY}28 0%, transparent 70%)`,
        top: '-10%', left: '-8%',
        transform: `translate(${dx * 80}px, ${dy * 60}px)`,
        transition: BLOB_TRANSITION,
        '@media (prefers-reduced-motion: reduce)': { transform: 'none', transition: 'none' },
      }} />
      <Box sx={{
        position: 'absolute', pointerEvents: 'none',
        width: 280, height: 280, borderRadius: '50%',
        background: `radial-gradient(circle, ${BRAND_TERTIARY}22 0%, transparent 70%)`,
        bottom: '-8%', right: '-6%',
        transform: `translate(${dx * -60}px, ${dy * -50}px)`,
        transition: BLOB_TRANSITION,
        '@media (prefers-reduced-motion: reduce)': { transform: 'none', transition: 'none' },
      }} />

      <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 4 }, position: 'relative' }}>
        <Typography variant="h4" style={{ marginBottom: '0.5rem' }}>{title}</Typography>
        <Typography variant="body1" color="text.secondary">{message}</Typography>
      </Box>
    </Box>
  );
};
