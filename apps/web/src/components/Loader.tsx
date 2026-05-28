import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme, keyframes } from '@mui/material/styles';

export type LoaderVariant =
  | 'spinner'
  | 'tri-arc'
  | 'dots'
  | 'linear'
  | 'triskelion'
  | 'pulse'
  | 'shimmer'
  | 'orbit'
  | 'determinate';

export interface LoaderProps {
  variant?: LoaderVariant;
  progress?: number;
  size?: number;
}

const reducedMotion = '@media (prefers-reduced-motion: reduce)';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;
const bounce = keyframes`0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-10px); }`;
const sweep = keyframes`0% { transform: translateX(-100%); } 100% { transform: translateX(400%); }`;
const scaleFade = keyframes`0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.5); opacity: 0.1; }`;
const shimmerMove = keyframes`0% { background-position: -200% 0; } 100% { background-position: 200% 0; }`;
const orbit = keyframes`from { transform: rotate(0deg) translateX(var(--r)) rotate(0deg); } to { transform: rotate(360deg) translateX(var(--r)) rotate(-360deg); }`;

const reducedMotionOverride = {
  [reducedMotion]: {
    animationDuration: '0.001ms !important',
    animationIterationCount: '1 !important',
  },
};

export const Loader: React.FC<LoaderProps> = ({
  variant = 'spinner',
  progress = 0,
  size,
}) => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const tertiary = theme.palette.tertiary?.main ?? primary;

  if (variant === 'spinner') {
    const sz = size ?? 72;
    return (
      <Box
        sx={{
          width: sz,
          height: sz,
          borderRadius: '50%',
          border: `6px solid ${theme.palette.action.disabledBackground}`,
          borderTopColor: primary,
          animation: `${spin} 0.9s linear infinite`,
          ...reducedMotionOverride,
        }}
      />
    );
  }

  if (variant === 'tri-arc') {
    const sz = size ?? 72;
    const r = sz / 2;
    const cx = r;
    const cy = r;
    const radius = r - 6;
    const circumference = 2 * Math.PI * radius;
    const arcLen = circumference / 3;
    const colors = [primary, secondary, tertiary];
    return (
      <Box component="svg" width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
        {colors.map((color, i) => (
          <Box
            key={i}
            component="circle"
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeDasharray={`${arcLen - 4} ${circumference - arcLen + 4}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            sx={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `rotate(${i * 120}deg)`,
              animation: `${spin} ${1.2 + i * 0.15}s linear infinite`,
              ...reducedMotionOverride,
            }}
          />
        ))}
      </Box>
    );
  }

  if (variant === 'dots') {
    const dotSize = size ?? 14;
    return (
      <Box sx={{ display: 'flex', gap: `${dotSize * 0.6}px`, alignItems: 'center' }}>
        {[primary, secondary, tertiary].map((color, i) => (
          <Box
            key={i}
            sx={{
              width: dotSize,
              height: dotSize,
              borderRadius: '50%',
              bgcolor: color,
              animation: `${bounce} 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
              ...reducedMotionOverride,
            }}
          />
        ))}
      </Box>
    );
  }

  if (variant === 'linear') {
    const w = size ?? 260;
    return (
      <Box
        sx={{
          width: w,
          height: 4,
          borderRadius: 2,
          bgcolor: theme.palette.action.disabledBackground,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(90deg, transparent 0%, ${primary} 40%, ${secondary} 60%, transparent 100%)`,
            animation: `${sweep} 1.4s linear infinite`,
            ...reducedMotionOverride,
          }}
        />
      </Box>
    );
  }

  if (variant === 'triskelion') {
    const sz = size ?? 72;
    const r = sz / 2;
    const armLength = r * 0.6;
    const colors = [primary, secondary, tertiary];
    return (
      <Box
        component="svg"
        width={sz}
        height={sz}
        viewBox={`0 0 ${sz} ${sz}`}
        sx={{
          animation: `${spin} 1.8s linear infinite`,
          ...reducedMotionOverride,
        }}
      >
        {colors.map((color, i) => {
          const angle = (i * 120 * Math.PI) / 180;
          const x2 = r + armLength * Math.cos(angle - Math.PI / 2);
          const y2 = r + armLength * Math.sin(angle - Math.PI / 2);
          return (
            <line
              key={i}
              x1={r}
              y1={r}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={5}
              strokeLinecap="round"
            />
          );
        })}
        <circle cx={r} cy={r} r={5} fill={primary} />
      </Box>
    );
  }

  if (variant === 'pulse') {
    const sz = size ?? 72;
    const colors = [primary, secondary, tertiary];
    return (
      <Box sx={{ position: 'relative', width: sz, height: sz }}>
        {colors.map((color, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              inset: `${i * (sz / 6)}px`,
              borderRadius: '50%',
              border: `2px solid ${color}`,
              animation: `${scaleFade} 1.8s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
              ...reducedMotionOverride,
            }}
          />
        ))}
      </Box>
    );
  }

  if (variant === 'shimmer') {
    const w = size ?? 200;
    const colors = [primary, secondary, tertiary];
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: w }}>
        {colors.map((color, i) => (
          <Box
            key={i}
            sx={{
              height: 10,
              borderRadius: 5,
              background: `linear-gradient(90deg, ${theme.palette.action.disabledBackground} 25%, ${color}55 50%, ${theme.palette.action.disabledBackground} 75%)`,
              backgroundSize: '200% 100%',
              animation: `${shimmerMove} 1.6s linear infinite`,
              animationDelay: `${i * 0.2}s`,
              ...reducedMotionOverride,
            }}
          />
        ))}
      </Box>
    );
  }

  if (variant === 'orbit') {
    const sz = size ?? 72;
    const r = sz / 2;
    const dotSize = sz * 0.14;
    const orbitRadius = r - dotSize;
    const colors = [primary, secondary, tertiary];
    return (
      <Box sx={{ position: 'relative', width: sz, height: sz }}>
        <Box
          sx={{
            position: 'absolute',
            inset: sz * 0.35,
            borderRadius: '50%',
            bgcolor: primary,
          }}
        />
        {colors.map((color, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: dotSize,
              height: dotSize,
              marginTop: `-${dotSize / 2}px`,
              marginLeft: `-${dotSize / 2}px`,
              borderRadius: '50%',
              bgcolor: color,
              '--r': `${orbitRadius}px`,
              animation: `${orbit} 1.8s linear infinite`,
              animationDelay: `${i * -0.6}s`,
              ...reducedMotionOverride,
            }}
          />
        ))}
      </Box>
    );
  }

  if (variant === 'determinate') {
    const sz = size ?? 72;
    const r = sz / 2;
    const radius = r - 6;
    const circumference = 2 * Math.PI * radius;
    const clampedProgress = Math.max(0, Math.min(100, progress));
    const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;
    return (
      <Box sx={{ position: 'relative', width: sz, height: sz }}>
        <Box component="svg" width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={r} cy={r} r={radius} fill="none" stroke={theme.palette.action.disabledBackground} strokeWidth={5} />
          <circle
            cx={r}
            cy={r}
            r={radius}
            fill="none"
            stroke={primary}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 500, fontSize: sz * 0.18 }}>
            {Math.round(clampedProgress)}%
          </Typography>
        </Box>
      </Box>
    );
  }

  return null;
};
