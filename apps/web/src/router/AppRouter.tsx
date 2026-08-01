import React, { useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { Page } from '../pages/dynamic/Page';
import { NotFoundPage } from '../pages/error/NotFoundPage';
import type { MenuItem } from '@simple-site/interfaces';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { ALL_DISABLED, useFeatureFlags } from '../hooks/useFeatureFlags';
import { resolveMenuItems } from './publicMenu';
import { TeamPage } from '../pages/team/TeamPage';
import { TeamMemberPage } from '../pages/team/TeamMemberPage';
import { ContactPage } from '../pages/contact/ContactPage';

export const AppRouter: React.FC = () => {
  const siteContext = useSiteConfig();
  if (!siteContext) throw new Error('AppRouter must be called within <SiteConfigProvider>');
  const { config } = siteContext;
  const flags = useFeatureFlags();

  // While flags load, feature entries resolve as disabled — page links render
  // immediately and feature links pop in once the flags arrive.
  const menuItems: MenuItem[] = useMemo(
    () => resolveMenuItems(config, flags ?? ALL_DISABLED),
    [config, flags]
  );

  return (
    <MainLayout menuItems={menuItems}>
      <Routes>
        {config.pages.map(page => (
          <Route key={page.route} path={page.route} element={<Page {...page} />} />
        ))}
        {/* Feature routes are always registered; the pages gate themselves on the
            runtime flags (off → 404) so deep links never flash the catch-all. */}
        <Route path="/team" element={<TeamPage />} />
        <Route path="/team/member/:slug" element={<TeamMemberPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" Component={NotFoundPage} />
      </Routes>
    </MainLayout>
  );
};
