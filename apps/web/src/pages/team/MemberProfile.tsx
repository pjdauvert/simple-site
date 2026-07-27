import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Avatar, Box, Container, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { useIntl } from 'react-intl';
import { memberSocialEntries, pickBiography, type TeamMember } from '@simple-site/interfaces';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { SOCIAL_NETWORK_ICONS } from './socialIcons';

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
  const socialEntries = memberSocialEntries(member);
  const photoSize = { xs: 160, md: 200 };

  return (
    <Container maxWidth={siteThemeConfig.containerMaxWidth ?? 'md'} sx={{ py: { xs: 4, md: 6 } }}>
      <Stack alignItems="center" spacing={{ xs: 2, md: 3 }}>
        {member.photoUrl ? (
          <Box
            component="img"
            src={`${member.photoUrl}?tr=w-480,h-480,fo-face,q-80,f-auto`}
            alt={member.name}
            sx={{
              width: photoSize,
              height: photoSize,
              borderRadius: '50%',
              objectFit: 'cover',
              boxShadow: 3,
            }}
          />
        ) : (
          <Avatar sx={{ width: photoSize, height: photoSize, fontSize: { xs: 64, md: 80 }, bgcolor: 'primary.main' }}>
            {member.name.charAt(0).toUpperCase()}
          </Avatar>
        )}

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom>
            {member.name}
          </Typography>
          {member.jobTitle && (
            <Typography variant="h6" component="p" color="text.secondary">
              {member.jobTitle}
            </Typography>
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

        {socialEntries.length > 0 && (
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
            {socialEntries.map(([network, href]) => {
              const label = intl.formatMessage({ id: `page.team.social.${network}` });
              return (
                <Tooltip key={network} title={label}>
                  <IconButton
                    component="a"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    color="primary"
                  >
                    {SOCIAL_NETWORK_ICONS[network]}
                  </IconButton>
                </Tooltip>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Container>
  );
};
