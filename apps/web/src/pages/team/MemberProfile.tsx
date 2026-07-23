import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Container, Typography } from '@mui/material';
import { useIntl } from 'react-intl';
import { pickBiography, type TeamMember } from '@simple-site/interfaces';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

interface MemberProfileProps {
  member: TeamMember;
}

/**
 * A member's public profile: photo, name, job title and markdown biography.
 * Rendered at /team/member/<slug>, and directly at /team when the team has
 * exactly one member. The biography follows the current locale, falling back
 * to the base locale ({@link pickBiography}).
 */
export const MemberProfile: React.FC<MemberProfileProps> = ({ member }) => {
  const { locale } = useIntl();
  const { siteThemeConfig } = useAppTheme();
  useDocumentTitle(`${member.name} – ${siteThemeConfig.siteName}`);

  const biography = pickBiography(member.biography, locale);

  return (
    <Container maxWidth={siteThemeConfig.containerMaxWidth ?? 'md'} sx={{ py: { xs: 4, md: 6 } }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'center', sm: 'flex-start' },
          gap: { xs: 3, md: 4 },
        }}
      >
        {member.photoUrl && (
          <Box
            component="img"
            src={`${member.photoUrl}?tr=w-480,q-80,f-auto`}
            alt={member.name}
            sx={{
              width: { xs: 200, sm: 240 },
              maxWidth: '100%',
              borderRadius: 3,
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        )}
        <Box sx={{ minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
          <Typography variant="h3" component="h1" gutterBottom>
            {member.name}
          </Typography>
          {member.jobTitle && (
            <Typography variant="h6" component="p" color="text.secondary" gutterBottom>
              {member.jobTitle}
            </Typography>
          )}
          {biography && (
            <Box sx={{ textAlign: 'left', '& p': { typography: 'body1' } }}>
              <ReactMarkdown>{biography}</ReactMarkdown>
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
};
