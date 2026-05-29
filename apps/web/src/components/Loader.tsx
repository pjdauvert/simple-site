import React from 'react';
import { Box } from '@mui/material';
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
  logoSrc?: string;
}

const HEX_OUTLINE =
  'M1.73 -19 L15.59 -11 Q17.32 -10 17.32 -8 L17.32 8 Q17.32 10 15.59 11 L1.73 19 Q0 20 -1.73 19 L-15.59 11 Q-17.32 10 -17.32 8 L-17.32 -8 Q-17.32 -10 -15.59 -11 L-1.73 -19 Q0 -20 1.73 -19 Z';
const HEX_FILLED =
  'M5.34 -18.92 Q0 -22 -5.34 -18.92 L-13.71 -14.08 Q-19.05 -11 -19.05 -4.84 L-19.05 4.84 Q-19.05 11 -13.71 14.08 L-5.34 18.92 Q0 22 5.34 18.92 L13.71 14.08 Q19.05 11 19.05 4.84 L19.05 -4.84 Q19.05 -11 13.71 -14.08 Z';

const reducedMotion = '@media (prefers-reduced-motion: reduce)';

const spin        = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;
const hexTravel   = keyframes`from { stroke-dashoffset: 0; } to { stroke-dashoffset: -120; }`;
const dotBounce   = keyframes`0%, 80%, 100% { transform: translateY(0); opacity: .55; } 40% { transform: translateY(-14px); opacity: 1; }`;
const sweepLeft   = keyframes`from { left: -32%; } to { left: 102%; }`;
const stretchW    = keyframes`0%, 100% { width: 22%; } 50% { width: var(--wmax); }`;
const hexSnake    = keyframes`
  0%   { stroke-dasharray: 0 120;   stroke-dashoffset: 0; }
  50%  { stroke-dasharray: 120 0;   stroke-dashoffset: 0; }
  100% { stroke-dasharray: 0 120;   stroke-dashoffset: -120; }
`;
const ringPulse   = keyframes`
  0%   { transform: scale(.2); opacity: 0; }
  20%  { opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
`;
const skelShimmer = keyframes`0% { background-position: 100% 0; } 100% { background-position: -100% 0; }`;
const orbitRot    = keyframes`to { transform: rotate(360deg); }`;
const orbitArm    = keyframes`from { transform: translateY(var(--rmin)); } to { transform: translateY(var(--rmax)); }`;

const rm = {
  [reducedMotion]: {
    animationDuration: '0.001ms !important',
    animationIterationCount: '1 !important',
  },
};

export const Loader: React.FC<LoaderProps> = ({
  variant = 'spinner',
  progress = 0,
  size,
  logoSrc,
}) => {
  const theme = useTheme();
  const primary   = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const tertiary  = theme.palette.tertiary?.main ?? primary;
  const disabled  = theme.palette.action.disabledBackground;
  const colors    = [primary, secondary, tertiary];

  if (variant === 'spinner') {
    const sz = size ?? 72;
    if (logoSrc) {
      return (
        <Box
          component="img"
          src={logoSrc}
          alt=""
          sx={{ width: sz, height: sz, animation: `${spin} 1.6s cubic-bezier(.6,.1,.4,.9) infinite`, ...rm }}
        />
      );
    }
    return (
      <Box
        sx={{
          width: sz, height: sz, borderRadius: '50%',
          border: `6px solid ${disabled}`, borderTopColor: primary,
          animation: `${spin} 0.9s linear infinite`, ...rm,
        }}
      />
    );
  }

  if (variant === 'tri-arc') {
    const sz = size ?? 64;
    return (
      <Box component="svg" width={sz} height={sz} viewBox="-28 -28 56 56">
        {colors.map((color, i) => (
          <Box
            key={i}
            component="path"
            d={HEX_OUTLINE}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={120}
            strokeDasharray="24 96"
            sx={{ animation: `${hexTravel} 1.8s linear infinite`, animationDelay: `${i * -0.6}s`, ...rm }}
          />
        ))}
      </Box>
    );
  }

  if (variant === 'dots') {
    const sz = size ?? 20;
    const delays = [-0.32, -0.16, 0];
    return (
      <Box sx={{ display: 'flex', gap: '10px' }}>
        {colors.map((color, i) => (
          <Box
            key={i}
            component="svg"
            width={sz}
            height={sz}
            viewBox="-24 -24 48 48"
            sx={{ display: 'block', animation: `${dotBounce} 1.1s ease-in-out infinite`, animationDelay: `${delays[i]}s`, ...rm }}
          >
            <path fill={color} d={HEX_FILLED} />
          </Box>
        ))}
      </Box>
    );
  }

  if (variant === 'linear') {
    const w = size ?? 260;
    const pills = [
      { color: primary,   wmax: '50%',  sweepDur: '1.8s', stretchDur: '1.3s', sweepDelay: '0s',    stretchDelay: '-0.4s' },
      { color: secondary, wmax: '78%',  sweepDur: '2.4s', stretchDur: '1.7s', sweepDelay: '-0.5s', stretchDelay: '-1.1s' },
      { color: tertiary,  wmax: '100%', sweepDur: '3s',   stretchDur: '2.1s', sweepDelay: '-1.1s', stretchDelay: '-0.7s' },
    ];
    return (
      <Box sx={{ width: w, maxWidth: 260, height: 4, borderRadius: '999px', bgcolor: disabled, overflow: 'hidden', position: 'relative' }}>
        {pills.map((pill, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute', top: 0, bottom: 0, left: '-32%', width: '22%',
              borderRadius: '999px', bgcolor: pill.color,
              '--wmax': pill.wmax,
              animation: `${sweepLeft} ${pill.sweepDur} cubic-bezier(.5,0,.3,1) infinite, ${stretchW} ${pill.stretchDur} ease-in-out infinite`,
              animationDelay: `${pill.sweepDelay}, ${pill.stretchDelay}`,
              ...rm,
            }}
          />
        ))}
      </Box>
    );
  }

  if (variant === 'triskelion') {
    const sz = size ?? 80;
    const durations = ['1.8s', '2.4s', '3.2s'];
    return (
      <Box component="svg" width={sz} height={sz} viewBox="-28 -28 56 56">
        {colors.map((color, i) => (
          <Box
            key={i}
            component="path"
            d={HEX_OUTLINE}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={120}
            sx={{ animation: `${hexSnake} ${durations[i]} ease-in-out infinite`, ...rm }}
          />
        ))}
      </Box>
    );
  }

  if (variant === 'pulse') {
    const sz = size ?? 80;
    const delays = [0, -0.66, -1.33];
    return (
      <Box sx={{ position: 'relative', width: sz, height: sz }}>
        {colors.map((color, i) => (
          <Box
            key={i}
            component="svg"
            width={sz}
            height={sz}
            viewBox="-28 -28 56 56"
            sx={{
              position: 'absolute', inset: 0,
              animation: `${ringPulse} 2s cubic-bezier(.4,0,.6,1) infinite`,
              animationDelay: `${delays[i]}s`,
              ...rm,
            }}
          >
            <path d={HEX_OUTLINE} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
          </Box>
        ))}
      </Box>
    );
  }

  if (variant === 'shimmer') {
    const w = size ?? 260;
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', width: w, maxWidth: 260 }}>
        {['88%', '100%', '64%'].map((lineW, i) => (
          <Box
            key={i}
            sx={{
              height: 12, width: lineW, borderRadius: '999px',
              background: `linear-gradient(90deg, ${disabled} 0%, ${primary}33 25%, ${secondary}33 50%, ${tertiary}33 75%, ${disabled} 100%)`,
              backgroundSize: '300% 100%',
              animation: `${skelShimmer} 1.8s ease-in-out infinite`,
              ...rm,
            }}
          />
        ))}
      </Box>
    );
  }

  if (variant === 'orbit') {
    const sz = size ?? 88;
    const orbitData = [
      { color: primary,   rotDur: '2.2s', rotDelay: '0s',    armDur: '1.6s', rmin: '-20px', rmax: '-32px' },
      { color: secondary, rotDur: '3.4s', rotDelay: '-1.1s', armDur: '2.4s', rmin: '-26px', rmax: '-38px' },
      { color: tertiary,  rotDur: '2.7s', rotDelay: '-1.9s', armDur: '1.9s', rmin: '-14px', rmax: '-29px' },
    ];
    return (
      <Box sx={{ position: 'relative', width: sz, height: sz }}>
        {orbitData.map((o, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute', top: '50%', left: '50%',
              animation: `${orbitRot} ${o.rotDur} linear infinite`,
              animationDelay: o.rotDelay,
              ...rm,
            }}
          >
            <Box
              sx={{
                display: 'block',
                '--rmin': o.rmin,
                '--rmax': o.rmax,
                animation: `${orbitArm} ${o.armDur} ease-in-out infinite alternate`,
                ...rm,
              }}
            >
              <Box
                component="svg"
                width={16}
                height={16}
                viewBox="-24 -24 48 48"
                sx={{ display: 'block', margin: '-8px 0 0 -8px' }}
              >
                <path fill={o.color} d={HEX_FILLED} />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  if (variant === 'determinate') {
    const sz = size ?? 80;
    const clampedProgress = Math.max(0, Math.min(100, progress));
    const strokeDashoffset = 100 - clampedProgress;
    return (
      <Box sx={{ position: 'relative', width: sz, height: sz }}>
        <Box component="svg" width={sz} height={sz} viewBox="-28 -28 56 56">
          <path d={HEX_OUTLINE} fill="none" stroke={disabled} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <path
            d={HEX_OUTLINE}
            fill="none"
            stroke={primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </Box>
        <Box
          sx={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Roboto Mono", monospace',
            fontSize: sz * 0.2,
            fontWeight: 500,
            color: theme.palette.text.primary,
          }}
        >
          {Math.round(clampedProgress)}%
        </Box>
      </Box>
    );
  }

  return null;
};
