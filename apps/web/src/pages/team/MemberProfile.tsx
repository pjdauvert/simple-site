import React, { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  Container,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { FormattedMessage, useIntl } from 'react-intl';
import { BASE_LOCALE, type TeamMember, type TeamSectionDesign } from '@simple-site/interfaces';
import {
  MEMBER_PAGE_DESIGN_DEFAULTS,
  memberLocales,
  pickLocalizedText,
  resolveSectionDesign,
} from './teamDisplay';
import { Markdown } from '../../components';
import { languageLabel } from '../../features/i18n/languageNames';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { MemberPortrait } from './MemberPortrait';
import { SocialLinksRow } from './SocialLinksRow';

interface MemberProfileProps {
  member: TeamMember;
  /** Member-page design options (portrait shape/border, bio frame). */
  design?: TeamSectionDesign;
}

/** The profile language to preselect: platform locale when available, else fallback. */
const initialProfileLocale = (member: TeamMember, platformLocale: string): string => {
  const available = memberLocales(member);
  if (available.includes(platformLocale)) return platformLocale;
  if (available.includes(BASE_LOCALE)) return BASE_LOCALE;
  return available[0] ?? platformLocale;
};

/**
 * A member's public profile: circular photo first (an initial avatar without
 * one), name and job title underneath, the markdown biography in a card panel,
 * and — only when links are provided — a centered row of social icons below.
 * Rendered at /team/member/<slug>, and directly at /team when the team has
 * exactly one member. Job title and biography follow the profile's own language
 * switch (shown only when the member's texts exist in several languages),
 * preselected to the platform locale when the profile has it.
 */
export const MemberProfile: React.FC<MemberProfileProps> = ({ member, design }) => {
  const intl = useIntl();
  const { locale } = intl;
  const { siteThemeConfig } = useAppTheme();
  useDocumentTitle(`${member.name} – ${siteThemeConfig.siteName}`);

  const locales = memberLocales(member);
  const [profileLocale, setProfileLocale] = useState(() => initialProfileLocale(member, locale));
  // Re-sync when the platform language or the displayed member changes.
  useEffect(() => {
    setProfileLocale(initialProfileLocale(member, locale));
  }, [member, locale]);

  const jobTitle = pickLocalizedText(member.jobTitle, profileLocale);
  const biography = pickLocalizedText(member.biography, profileLocale);
  const resolved = resolveSectionDesign(design, MEMBER_PAGE_DESIGN_DEFAULTS);

  return (
    <Container maxWidth={siteThemeConfig.containerMaxWidth ?? 'md'} sx={{ py: { xs: 4, md: 6 } }}>
      <Stack alignItems="center" spacing={{ xs: 2, md: 3 }}>
        <MemberPortrait
          member={member}
          size={{ xs: 160, md: 200 }}
          radius={resolved.pictureRadius}
          border={resolved.pictureBorder}
          borderColor={resolved.pictureBorderColor}
        />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom>
            {member.name}
          </Typography>
          {(jobTitle || member.former) && (
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              {jobTitle && (
                <Typography variant="h6" component="p" color="text.secondary">
                  {jobTitle}
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

        {locales.length > 1 && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={profileLocale}
            onChange={(_, next: string | null) => {
              if (next) setProfileLocale(next);
            }}
            aria-label={intl.formatMessage({ id: 'page.team.profileLanguage' })}
          >
            {locales.map((code) => (
              <ToggleButton key={code} value={code} aria-label={languageLabel(code)}>
                {code.toUpperCase()}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}

        {biography && (
          <Paper
            elevation={0}
            sx={(theme) => ({
              borderRadius: 3,
              bgcolor: resolved.frameBackgroundColor ?? 'background.paper',
              border: resolved.frameBorder
                ? `1px solid ${resolved.frameBorderColor || theme.palette.divider}`
                : 'none',
              p: { xs: 2.5, md: 4 },
              width: '100%',
              maxWidth: 720,
              '& p': { typography: 'body1' },
              '& > :first-of-type': { mt: 0 },
              '& > :last-child': { mb: 0 },
            })}
          >
            <Markdown>{biography}</Markdown>
          </Paper>
        )}

        <SocialLinksRow member={member} />
      </Stack>
    </Container>
  );
};
