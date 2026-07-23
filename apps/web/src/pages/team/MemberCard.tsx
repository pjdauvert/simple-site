import React from 'react';
import { Box, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { TeamMember } from '@simple-site/interfaces';
import { Card } from '../../components';

interface MemberCardProps {
  member: TeamMember;
}

/**
 * Clickable member summary on the team overview page — navigates to the
 * member's own page. Without a photo, the Card's gradient placeholder shows.
 */
export const MemberCard: React.FC<MemberCardProps> = ({ member }) => (
  <Box
    component={RouterLink}
    to={`/team/member/${member.slug}`}
    aria-label={member.name}
    sx={{
      display: 'block',
      textDecoration: 'none',
      color: 'inherit',
      transition: 'transform 0.15s ease',
      '&:hover': { transform: 'translateY(-4px)' },
    }}
  >
    <Card
      media={
        member.photoUrl ? (
          <Box
            component="img"
            src={`${member.photoUrl}?tr=w-600,h-338,fo-face,q-80,f-auto`}
            alt={member.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : undefined
      }
      title={member.name}
      body={
        member.jobTitle ? (
          <Typography variant="body2" color="text.secondary">
            {member.jobTitle}
          </Typography>
        ) : undefined
      }
    />
  </Box>
);
