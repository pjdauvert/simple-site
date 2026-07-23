import React from 'react';
import { Container, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { FormattedMessage } from 'react-intl';
import { NotFoundPage } from '../error/NotFoundPage';
import { ErrorPage } from '../error/ErrorPage';
import { Loading } from '../../components';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useTeam } from '../../hooks/useTeam';
import { useAppTheme } from '../../hooks/useAppTheme';
import { MemberProfile } from './MemberProfile';
import { MemberCard } from './MemberCard';

/**
 * Public /team dispatcher. The route is always registered; the page gates itself
 * on the runtime `team` flag (flag off → 404, matching the server's behavior) so
 * a direct navigation never flashes the catch-all while flags load. Content:
 * 0 members → 404, exactly 1 → their profile right here, 2+ → overview cards
 * (in the admin-defined order) linking to /team/member/<slug>.
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
      <Typography variant="h3" component="h1" gutterBottom sx={{ mb: { xs: 3, md: 4 } }}>
        <FormattedMessage id="page.team.title" />
      </Typography>
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {members.map((member) => (
          <Grid key={member.slug} size={{ xs: 12, sm: 6, md: 4 }}>
            <MemberCard member={member} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
