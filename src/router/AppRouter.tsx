import React, { useMemo } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { Page } from '../pages/dynamic/Page';
import type { MenuItem } from '../types/menu.interface';
import type { PageConfiguration } from '../types/page.interface';
import { useSiteConfig } from '../hooks/useSiteConfig';

export const AppRouter: React.FC = () => {
  const { config } = useSiteConfig();

  const router = useMemo(() => {
    const menuItems: MenuItem[] = config.pages.map(({ pageName, route, menuTitle }) => ({
      menuTitle,
      pageName,
      route,
    }));

    function makePageRoute(pageConfiguration: PageConfiguration) {
      return {
        path: pageConfiguration.route,
        element: <MainLayout menuItems={menuItems}><Page {...pageConfiguration} /></MainLayout>,
      };
    }

    return createBrowserRouter(
      config.pages.map((pageConfiguration) => 
        makePageRoute(pageConfiguration)
      )
    );
  }, [config.pages]);

  return <RouterProvider router={router} />;
};

