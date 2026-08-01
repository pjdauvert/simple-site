import React from 'react';
import { Box, Container, Divider, Stack, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { TEAM_FORMER_MEMBERS_TITLE_KEY, TEAM_PRESENTATION_KEY, TEAM_TITLE_KEY } from '@simple-site/interfaces';
import { NotFoundPage } from '../error/NotFoundPage';
import { ErrorPage } from '../error/ErrorPage';
import { Loading, Markdown } from '../../components';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useTeam } from '../../hooks/useTeam';
import { useAppTheme } from '../../hooks/useAppTheme';
import { MemberProfile } from './MemberProfile';
import { MemberRow } from './MemberRow';
import { isReversedRow } from './memberRowLayout';

/**
 * Public /team dispatcher. The route is always registered; the page gates itself
 * on the runtime `team` flag (flag off → 404, matching the server's behavior) so
 * a direct navigation never flashes the catch-all while flags load. Content:
 * nothing to show → 404, exactly one current member (and no visible former
 * section) → their profile right here, otherwise flat member rows (in the
 * admin-defined order, alternating sides when the team option is on), followed
 * by the "former members" section when the team option shows it. Alternation
 * restarts per section.
 */
export const TeamPage: React.FC = () => {
  const flags = useFeatureFlags();
  const { siteThemeConfig } = useAppTheme();
  const { team, error } = useTeam(Boolean(flags?.team));

  if (flags === null) return <Loading />;
  if (!flags.team) return <NotFoundPage />;
  if (error) return <ErrorPage title="Something went wrong" message={error} />;
  if (team === null) return <Loading />;

  const current = team.members.filter((m) => !m.former);
  const formerVisible = team.showFormerMembers ? team.members.filter((m) => m.former) : [];
  if (current.length === 0 && formerVisible.length === 0) return <NotFoundPage />;
  if (current.length === 1 && formerVisible.length === 0) {
    return <MemberProfile member={current[0]} design={team.design?.memberPage} />;
  }

  return (
    <Container maxWidth={siteThemeConfig.containerMaxWidth ?? 'lg'} sx={{ py: { xs: 4, md: 6 } }}>
      {/* Title and presentation are stored translation defaults — per-language
          values from the Translations page take over via their shared keys. */}
      {team.title?.trim() && (
        <Typography variant="h3" component="h1" gutterBottom sx={{ mb: { xs: 3, md: 5 } }}>
          <FormattedMessage id={TEAM_TITLE_KEY} defaultMessage={team.title} />
        </Typography>
      )}
      {team.presentation?.trim() && (
        <Box sx={{ mb: { xs: 4, md: 6 }, '& p': { typography: 'body1' }, '& > :first-of-type': { mt: 0 } }}>
          <FormattedMessage id={TEAM_PRESENTATION_KEY} defaultMessage={team.presentation}>
            {(msg) => <Markdown>{String(msg)}</Markdown>}
          </FormattedMessage>
        </Box>
      )}
      <Stack spacing={{ xs: 6, md: 8 }}>
        {current.map((member, index) => (
          <MemberRow
            key={member.slug}
            member={member}
            reverse={isReversedRow(index, Boolean(team.alternateLayout))}
            design={team.design?.teamPage}
          />
        ))}
      </Stack>
      {formerVisible.length > 0 && (
        <>
          <Divider sx={{ mt: { xs: 6, md: 10 }, mb: { xs: 3, md: 5 } }} />
          {team.formerMembersTitle?.trim() && (
            <Typography variant="h4" component="h2" gutterBottom sx={{ mb: { xs: 3, md: 5 } }}>
              <FormattedMessage id={TEAM_FORMER_MEMBERS_TITLE_KEY} defaultMessage={team.formerMembersTitle} />
            </Typography>
          )}
          <Stack spacing={{ xs: 6, md: 8 }}>
            {formerVisible.map((member, index) => (
              <MemberRow
                key={member.slug}
                member={member}
                reverse={isReversedRow(index, Boolean(team.alternateLayout))}
                design={team.design?.teamPage}
                dimmed
              />
            ))}
          </Stack>
        </>
      )}
    </Container>
  );
};
