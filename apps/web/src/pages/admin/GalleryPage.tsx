import { ManageTabsShell, type ManageTab } from '../../components/manage';

const TABS: readonly ManageTab[] = [
  { key: 'items', labelKey: 'page.manage.gallery.tab.items' },
  { key: 'tags', labelKey: 'page.manage.gallery.tab.tags' },
  { key: 'design', labelKey: 'page.manage.gallery.tab.design' },
];

/**
 * Gallery management shell (/manage/gallery, flag-gated): Items / Tags /
 * Design over the shared tab shell. Unlike the team, every tab writes the
 * config DRAFT (`PUT /api/config/gallery`, auto-saved over a fresh draft read
 * so the tabs can't clobber each other) — the publish note is spelled out once
 * for the page.
 */
export const GalleryPage: React.FC = () => (
  <ManageTabsShell titleKey="page.manage.gallery.title" noteKey="page.manage.gallery.publishNote" tabs={TABS} />
);
