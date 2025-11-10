import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import pagesConfig from './config/siteConfig.json';
import { Page } from './pages/dynamic/Page';
import type { MenuItem } from './types/menu.interface';
import type { PageConfiguration } from './types/page.interface';


const menuItems: MenuItem[] =  pagesConfig.pages.map(({ pageName, route, menuTitle }) => ({
    menuTitle,
    pageName,
    route,
  }));

function makePageRoute(pageConfiguration: PageConfiguration) {
  return {
    path: pageConfiguration.route,
    element: <MainLayout menuItems={menuItems}><Page {...pageConfiguration} /></MainLayout>,
  };
};

export const router = createBrowserRouter(pagesConfig.pages.map((pageConfiguration) => makePageRoute(pageConfiguration as unknown as PageConfiguration)));