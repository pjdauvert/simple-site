import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Chip, Container, Paper, Stack, Typography } from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import { pickBiography, type TeamMember } from '@simple-site/interfaces';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { MemberPortrait } from './MemberPortrait';
import { SocialLinksRow } from './SocialLinksRow';

interface MemberProfileProps {
  member: TeamMember;
}

/**
 * A member's public profile: circular photo first (an initial avatar without
 * one), name and job title underneath, the markdown biography in a card panel,
 * and — only when links are provided — a centered row of social icons below.
 * Rendered at /team/member/<slug>, and directly at /team when the team has
 * exactly one member. The biography follows the current locale, falling back
 * to the base locale ({@link pickBiography}).
 */
export const MemberProfile: React.FC<MemberProfileProps> = ({ member }) => {
  const intl = useIntl();
  const { locale } = intl;
  const { siteThemeConfig } = useAppTheme();
  useDocumentTitle(`${member.name} – ${siteThemeConfig.siteName}`);

  const biography = pickBiography(member.biography, locale);

  return (
    <Container maxWidth={siteThemeConfig.containerMaxWidth ?? 'md'} sx={{ py: { xs: 4, md: 6 } }}>
      <Stack alignItems="center" spacing={{ xs: 2, md: 3 }}>
        <MemberPortrait member={member} size={{ xs: 160, md: 200 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom>
            {member.name}
          </Typography>
          {(member.jobTitle || member.former) && (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              {member.jobTitle && (
                <Typography variant="h6" component="p" color="text.secondary">
                  {member.jobTitle}
                </Typography>
              )}
              {member.former && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={<FormattedMessage id="page.team.formerMember" />}
                />
              )}
            </Stack>
          )}
        </Box>

        {biography && (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 3,
              bgcolor: 'background.paper',
              p: { xs: 2.5, md: 4 },
              width: '100%',
              maxWidth: 720,
              '& p': { typography: 'body1' },
              '& > :first-of-type': { mt: 0 },
              '& > :last-child': { mb: 0 },
            }}
          >
            <ReactMarkdown>{biography}</ReactMarkdown>
          </Paper>
        )}

        <SocialLinksRow member={member} />
      </Stack>
    </Container>
  );
};
