import React from 'react';
import { useParams } from 'react-router-dom';
import { NotFoundPage } from '../error/NotFoundPage';
import { ErrorPage } from '../error/ErrorPage';
import { Loading } from '../../components';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useTeam } from '../../hooks/useTeam';
import { MemberProfile } from './MemberProfile';

/**
 * Public /team/member/:slug — one member's profile. Self-gates on the runtime
 * `team` flag like /team; an unknown slug renders the 404 page.
 */
export const TeamMemberPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const flags = useFeatureFlags();
  const { team, error } = useTeam(Boolean(flags?.team));

  if (flags === null) return <Loading />;
  if (!flags.team) return <NotFoundPage />;
  if (error) return <ErrorPage title="Something went wrong" message={error} />;
  if (team === null) return <Loading />;

  const member = team.members.find((m) => m.slug === slug);
  if (!member) return <NotFoundPage />;

  return <MemberProfile member={member} />;
};
