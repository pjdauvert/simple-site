import { Routes, Route, Navigate } from "react-router-dom";
import type { MenuItem } from "@simple-site/interfaces";
import { ManagePage } from "../pages/admin/ManagePage";
import { SiteConfigPage, GeneralTab, PagesTab } from "../pages/admin/SiteConfigPage";
import { ThemesTab } from "../pages/admin/ThemesTab";
import { TranslationsPage } from "../pages/admin/TranslationsPage";
import { MediaPage } from "../pages/admin/MediaPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { ManageLayout } from "../layouts/ManageLayout";
import { Loading } from "../components";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { NotificationsProvider } from "../features/notifications/NotificationsProvider";

// Admin navigation. `pageName` resolves the i18n label key `${pageName}.menuTitle`
// (see ManageLayout); `menuTitle` is the fallback default message.
const dashboardItem: MenuItem = { menuTitle: "Dashboard", pageName: "manage.dashboard", route: "/manage" };
const siteItem: MenuItem = { menuTitle: "Site configuration", pageName: "manage.siteConfig", route: "/manage/site" };
const translationsItem: MenuItem = { menuTitle: "Translations", pageName: "manage.translations", route: "/manage/translations" };
const mediaItem: MenuItem = { menuTitle: "Media", pageName: "manage.media", route: "/manage/media" };

// The admin area, once authenticated: Dashboard + Site configuration + Translations
// are always available; the Media entry/route is shown only when the `media` feature
// flag is enabled (fetched at runtime from /api/features).
const ManageArea: React.FC = () => {
  const flags = useFeatureFlags();
  if (!flags) return <Loading message="Loading…" />;

  const menuItems: MenuItem[] = flags.media
    ? [dashboardItem, siteItem, translationsItem, mediaItem]
    : [dashboardItem, siteItem, translationsItem];

  return (
    <ManageLayout menuItems={menuItems}>
      <Routes>
        <Route index element={<ManagePage />} />
        <Route path="site" element={<SiteConfigPage />}>
          <Route index element={<Navigate to="general" replace />} />
          <Route path="general" element={<GeneralTab />} />
          <Route path="themes" element={<ThemesTab />} />
          <Route path="pages" element={<PagesTab />} />
        </Route>
        <Route path="translations" element={<TranslationsPage />} />
        {flags.media && <Route path="media" element={<MediaPage />} />}
      </Routes>
    </ManageLayout>
  );
};

export const ManageRouter: React.FC = () => (
  <ProtectedRoute>
    <NotificationsProvider>
      <ManageArea />
    </NotificationsProvider>
  </ProtectedRoute>
);
