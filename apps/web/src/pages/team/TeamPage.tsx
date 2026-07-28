import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Container, Stack, Typography } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { TEAM_PRESENTATION_KEY } from '@simple-site/interfaces';
import { NotFoundPage } from '../error/NotFoundPage';
import { ErrorPage } from '../error/ErrorPage';
import { Loading } from '../../components';
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
 * 0 members → 404, exactly 1 → their profile right here, 2+ → flat member rows
 * (in the admin-defined order, alternating sides when the team option is on).
 */
export const TeamPage: React.FC = () => {
  const flags = useFeatureFlags();
  const { siteThemeConfig } = useAppTheme();
  const { team, error } = useTeam(Boolean(flags?.team));

  if (flags === null) return <Loading />;
  if (!flags.team) return <NotFoundPage />;
  if (error) return <ErrorPage title="Something went wrong" message={error} />;
  if (team === null) return <Loading />;

  const { members } = team;
  if (members.length === 0) return <NotFoundPage />;
  if (members.length === 1) return <MemberProfile member={members[0]} />;

  return (
    <Container maxWidth={siteThemeConfig.containerMaxWidth ?? 'lg'} sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ mb: { xs: 3, md: 5 } }}>
        <FormattedMessage id="page.team.title" />
      </Typography>
      {team.presentation?.trim() && (
        <Box sx={{ mb: { xs: 4, md: 6 }, '& p': { typography: 'body1' }, '& > :first-of-type': { mt: 0 } }}>
          {/* The stored text is the translation default; per-language values from
              the Translations page take over via the shared key. */}
          <FormattedMessage id={TEAM_PRESENTATION_KEY} defaultMessage={team.presentation}>
            {(msg) => <ReactMarkdown>{String(msg)}</ReactMarkdown>}
          </FormattedMessage>
        </Box>
      )}
      <Stack spacing={{ xs: 6, md: 8 }}>
        {members.map((member, index) => (
          <MemberRow
            key={member.slug}
            member={member}
            reverse={isReversedRow(index, Boolean(team.alternateLayout))}
          />
        ))}
      </Stack>
    </Container>
  );
};
