import { ManageTabsShell, type ManageTab } from '../../components/manage';

const TABS: readonly ManageTab[] = [
  { key: 'page', labelKey: 'page.manage.team.tab.page' },
  { key: 'members', labelKey: 'page.manage.team.tab.members' },
  { key: 'design', labelKey: 'page.manage.team.tab.design' },
];

/**
 * Team management shell (/manage/team, flag-gated): Page / Members / Design
 * over the shared tab shell. Every tab saves DIRECTLY — the team is live
 * immediately, which the caption spells out once for the whole page.
 */
export const TeamPage: React.FC = () => (
  <ManageTabsShell titleKey="page.manage.team.title" noteKey="page.manage.team.liveNote" tabs={TABS} />
);
