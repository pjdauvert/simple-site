import React from 'react';
import { Avatar, Box } from '@mui/material';
import type { TeamMember } from '@simple-site/interfaces';

type ResponsiveSize = number | Record<string, number>;

interface MemberPortraitProps {
  member: TeamMember;
  /** Diameter in px, or a responsive map (e.g. `{ xs: 160, md: 200 }`). */
  size: ResponsiveSize;
  /** Renders the portrait in grayscale (former members on the team page). */
  grayscale?: boolean;
}

const scale = (size: ResponsiveSize, factor: number): ResponsiveSize =>
  typeof size === 'number'
    ? Math.round(size * factor)
    : Object.fromEntries(Object.entries(size).map(([bp, value]) => [bp, Math.round(value * factor)]));

/**
 * A member's circular portrait: the photo with a square face-focused ImageKit
 * crop, or an initial avatar when no photo is set.
 */
export const MemberPortrait: React.FC<MemberPortraitProps> = ({ member, size, grayscale = false }) => {
  const filter = grayscale ? 'grayscale(1)' : undefined;
  return member.photoUrl ? (
    <Box
      component="img"
      src={`${member.photoUrl}?tr=w-480,h-480,fo-face,q-80,f-auto`}
      alt={member.name}
      sx={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', boxShadow: 3, filter }}
    />
  ) : (
    <Avatar sx={{ width: size, height: size, fontSize: scale(size, 0.4), bgcolor: 'primary.main', filter }}>
      {member.name.charAt(0).toUpperCase()}
    </Avatar>
  );
};
