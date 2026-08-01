import React from 'react';
import { Avatar, Box, useTheme } from '@mui/material';
import type { TeamMember } from '@simple-site/interfaces';

type ResponsiveSize = number | Record<string, number>;

interface MemberPortraitProps {
  member: TeamMember;
  /** Diameter in px, or a responsive map (e.g. `{ xs: 160, md: 200 }`). */
  size: ResponsiveSize;
  /** Corner radius in percent (50 = circle, 0 = square). */
  radius?: number;
  /** Draws a border; `borderColor` (CSS) falls back to the theme's primary color. */
  border?: boolean;
  borderColor?: string;
  /** Renders the portrait in grayscale (former members on the team page). */
  grayscale?: boolean;
}

const scale = (size: ResponsiveSize, factor: number): ResponsiveSize =>
  typeof size === 'number'
    ? Math.round(size * factor)
    : Object.fromEntries(Object.entries(size).map(([bp, value]) => [bp, Math.round(value * factor)]));

/**
 * A member's portrait: the photo with a square face-focused ImageKit crop, or an
 * initial avatar when no photo is set. Shape (corner radius) and border come from
 * the team's design options — a circle without border by default.
 */
export const MemberPortrait: React.FC<MemberPortraitProps> = ({
  member,
  size,
  radius = 50,
  border = false,
  borderColor,
  grayscale = false,
}) => {
  const theme = useTheme();
  const shape = {
    width: size,
    height: size,
    borderRadius: `${radius}%`,
    border: border ? `4px solid ${borderColor || theme.palette.primary.main}` : undefined,
    filter: grayscale ? 'grayscale(1)' : undefined,
  };
  return member.photoUrl ? (
    <Box
      component="img"
      src={`${member.photoUrl}?tr=w-480,h-480,fo-face,q-80,f-auto`}
      alt={member.name}
      sx={{ ...shape, objectFit: 'cover', boxShadow: 3 }}
    />
  ) : (
    <Avatar variant="square" sx={{ ...shape, fontSize: scale(size, 0.4), bgcolor: 'primary.main' }}>
      {member.name.charAt(0).toUpperCase()}
    </Avatar>
  );
};
