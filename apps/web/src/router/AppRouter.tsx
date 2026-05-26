import React, { useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { Page } from '../pages/dynamic/Page';
import type { MenuItem } from '@simple-site/interfaces';
import { useSiteConfig } from '../hooks/useSiteConfig';

export const AppRouter: React.FC = () => {
  const siteContext = useSiteConfig();
  if (!siteContext) throw new Error('AppRouter must be called within <SiteConfigProvider>');
  const { config } = siteContext;
   
  const menuItems: MenuItem[] = useMemo(
    () => config.pages.map(({ pageName, route, menuTitle }) => ({ menuTitle, pageName, route })),
    [config.pages]
  );

  return (
    <Routes>
      {config.pages.map(page => (
        <Route
          key={page.route}
          path={page.route}
          element={<MainLayout menuItems={menuItems}><Page {...page} /></MainLayout>}
        />
      ))}
    </Routes>
  );
};
