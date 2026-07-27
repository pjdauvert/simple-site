import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { pickBiography, type TeamMember } from '@simple-site/interfaces';
import { MemberPortrait } from './MemberPortrait';
import { SocialLinksRow } from './SocialLinksRow';

interface MemberRowProps {
  member: TeamMember;
  /** Desktop only: biography left / identification right (mobile always stacks). */
  reverse: boolean;
}

/**
 * One member on the team overview page, flat (no panel): the identification
 * block — circular portrait with name, job title and social links underneath —
 * on one side, the markdown biography on the other. `reverse` flips the sides
 * on desktop; on mobile everything stacks in one column, identification first.
 */
export const MemberRow: React.FC<MemberRowProps> = ({ member, reverse }) => {
  const { locale } = useIntl();
  const biography = pickBiography(member.biography, locale);

  return (
    <Box
      component="section"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: reverse ? 'row-reverse' : 'row' },
        alignItems: { xs: 'center', md: 'flex-start' },
        gap: { xs: 3, md: 6 },
      }}
    >
      <Stack alignItems="center" spacing={1.5} sx={{ width: { md: 240 }, flexShrink: 0 }}>
        <MemberPortrait member={member} size={160} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" component="h2" gutterBottom>
            <Link
              component={RouterLink}
              to={`/team/member/${member.slug}`}
              underline="hover"
              color="inherit"
            >
              {member.name}
            </Link>
          </Typography>
          {member.jobTitle && (
            <Typography variant="subtitle1" component="p" color="text.secondary">
              {member.jobTitle}
            </Typography>
          )}
        </Box>
        <SocialLinksRow member={member} size="small" />
      </Stack>

      {biography && (
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            '& p': { typography: 'body1' },
            '& > :first-of-type': { mt: 0 },
            '& > :last-child': { mb: 0 },
          }}
        >
          <ReactMarkdown>{biography}</ReactMarkdown>
        </Box>
      )}
    </Box>
  );
};
