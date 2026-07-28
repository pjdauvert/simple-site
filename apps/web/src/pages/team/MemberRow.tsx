import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  TEAM_PAGE_DESIGN_DEFAULTS,
  pickBiography,
  resolveSectionDesign,
  type TeamMember,
  type TeamSectionDesign,
} from '@simple-site/interfaces';
import { MemberPortrait } from './MemberPortrait';
import { SocialLinksRow } from './SocialLinksRow';

interface MemberRowProps {
  member: TeamMember;
  /** Desktop only: biography left / identification right (mobile always stacks). */
  reverse: boolean;
  /** Former-members styling: lighter row, grayscale portrait (team page only). */
  dimmed?: boolean;
  /** Team-page design options (portrait shape/border, description frame). */
  design?: TeamSectionDesign;
}

/**
 * One member on the team overview page, flat (no panel): the identification
 * block — circular portrait with name, job title and social links underneath —
 * on one side, the markdown biography on the other. `reverse` flips the sides
 * on desktop; on mobile everything stacks in one column, identification first.
 */
export const MemberRow: React.FC<MemberRowProps> = ({ member, reverse, dimmed = false, design }) => {
  const { locale } = useIntl();
  const biography = pickBiography(member.biography, locale);
  const resolved = resolveSectionDesign(design, TEAM_PAGE_DESIGN_DEFAULTS);
  const framed = Boolean(resolved.frameBackgroundColor) || resolved.frameBorder;

  return (
    <Box
      component="section"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: reverse ? 'row-reverse' : 'row' },
        alignItems: { xs: 'center', md: 'flex-start' },
        gap: { xs: 3, md: 6 },
        opacity: dimmed ? 0.72 : 1,
      }}
    >
      <Stack alignItems="center" spacing={1.5} sx={{ width: { md: 240 }, flexShrink: 0 }}>
        <MemberPortrait
          member={member}
          size={160}
          radius={resolved.pictureRadius}
          border={resolved.pictureBorder}
          borderColor={resolved.pictureBorderColor}
          grayscale={dimmed}
        />
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
          sx={(theme) => ({
            flex: 1,
            minWidth: 0,
            width: '100%',
            // The description frame is opt-in: rows stay flat unless the team's
            // design sets a background or a border.
            ...(framed && {
              p: { xs: 2.5, md: 3 },
              borderRadius: 3,
              bgcolor: resolved.frameBackgroundColor ?? 'transparent',
              border: resolved.frameBorder
                ? `1px solid ${resolved.frameBorderColor || theme.palette.divider}`
                : undefined,
            }),
            '& p': { typography: 'body1' },
            '& > :first-of-type': { mt: 0 },
            '& > :last-child': { mb: 0 },
          })}
        >
          <ReactMarkdown>{biography}</ReactMarkdown>
        </Box>
      )}
    </Box>
  );
};
