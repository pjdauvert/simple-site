import { ManageTabsShell, type ManageTab } from '../../components/manage';

const TABS: readonly ManageTab[] = [
  { key: 'list', labelKey: 'page.manage.events.tab.list' },
  { key: 'agenda-design', labelKey: 'page.manage.events.tab.agendaDesign' },
  { key: 'event-design', labelKey: 'page.manage.events.tab.eventDesign' },
];

/**
 * Events management shell (/manage/events, flag-gated): Events / Agenda design
 * / Event page design over the shared tab shell. The design is split per
 * SURFACE — the agenda page and one event's detail page are two different
 * screens with two different previews, and conflating them made one long tab
 * nobody could read at a glance.
 *
 * Every tab writes the config DRAFT (`PUT /api/config/events`), auto-saving
 * each settled change over a fresh draft read so the three tabs can never
 * clobber each other — the publish note is spelled out once for the page.
 */
export const EventsPage: React.FC = () => (
  <ManageTabsShell titleKey="page.manage.events.title" noteKey="page.manage.events.publishNote" tabs={TABS} />
);
