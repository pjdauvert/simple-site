import { useRef, useState, useCallback } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useTheme, keyframes } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-14px); }
`;

const reducedMotion = '@media (prefers-reduced-motion: reduce)';

const BLOB_TRANSITION = 'transform 1.4s cubic-bezier(0.23, 1, 0.32, 1)';

export const NotFoundPage: React.FC = () => {
  const theme = useTheme();
  const primary   = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const tertiary  = theme.palette.tertiary?.main ?? primary;

  const digitColors = [primary, secondary, tertiary];

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

  const handleMouseLeave = useCallback(() => {
    setMouse({ x: 0.5, y: 0.5 });
  }, []);

  // Each blob drifts toward / away from cursor at different intensities
  const dx = mouse.x - 0.5;
  const dy = mouse.y - 0.5;
  const blob1 = { x: dx *  90, y: dy *  70 };
  const blob2 = { x: dx * -70, y: dy * -55 };
  const blob3 = { x: dx *  50, y: dy * -40 };

  return (
    <Box
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      sx={{
        display: 'flex',
        flexGrow: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        p: { xs: 2, sm: 4 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Magenta blob — top-left, follows cursor */}
      <Box sx={{
        position: 'absolute', pointerEvents: 'none',
        width: { xs: 300, sm: 460 }, height: { xs: 300, sm: 460 },
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primary}30 0%, transparent 70%)`,
        top: '0%', left: '-10%',
        transform: `translate(${blob1.x}px, ${blob1.y}px)`,
        transition: BLOB_TRANSITION,
        [reducedMotion]: { transform: 'none', transition: 'none' },
      }} />

      {/* Lime blob — bottom-right, counter-follows */}
      <Box sx={{
        position: 'absolute', pointerEvents: 'none',
        width: { xs: 240, sm: 380 }, height: { xs: 240, sm: 380 },
        borderRadius: '50%',
        background: `radial-gradient(circle, ${tertiary}28 0%, transparent 70%)`,
        bottom: '0%', right: '-6%',
        transform: `translate(${blob2.x}px, ${blob2.y}px)`,
        transition: BLOB_TRANSITION,
        [reducedMotion]: { transform: 'none', transition: 'none' },
      }} />

      {/* Azure accent blob — mid, gentle drift */}
      <Box sx={{
        position: 'absolute', pointerEvents: 'none',
        width: { xs: 180, sm: 260 }, height: { xs: 180, sm: 260 },
        borderRadius: '50%',
        background: `radial-gradient(circle, ${secondary}22 0%, transparent 70%)`,
        top: '30%', right: '10%',
        transform: `translate(${blob3.x}px, ${blob3.y}px)`,
        transition: BLOB_TRANSITION,
        [reducedMotion]: { transform: 'none', transition: 'none' },
      }} />

      {/* Three floating digits, each in a brand colour */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: { xs: 1, sm: 2 } }}>
        {['4', '0', '4'].map((digit, i) => (
          <Typography
            key={i}
            variant="h1"
            sx={{
              fontSize: { xs: '5.5rem', sm: '8rem', md: '10rem' },
              fontWeight: 700,
              lineHeight: 1,
              color: digitColors[i],
              animation: `${float} ${2.2 + i * 0.25}s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
              [reducedMotion]: { animation: 'none' },
            }}
          >
            {digit}
          </Typography>
        ))}
      </Box>

      {/* Tri-colour accent bar */}
      <Box sx={{ display: 'flex', gap: 0.75, mt: -1 }}>
        {digitColors.map((color, i) => (
          <Box key={i} sx={{ width: 32, height: 4, borderRadius: 2, bgcolor: color, opacity: 0.7 }} />
        ))}
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 500, textAlign: 'center', mt: 1 }}>
        <FormattedMessage id="notFound.title" />
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 360 }}>
        <FormattedMessage id="notFound.message" />
      </Typography>

      <Button
        component={RouterLink}
        to="/"
        variant="contained"
        size="large"
        sx={{ mt: 1, borderRadius: 99, px: 4 }}
      >
        <FormattedMessage id="notFound.backHome" />
      </Button>
    </Box>
  );
};
