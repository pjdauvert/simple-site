import { Routes, Route } from "react-router-dom";
import type { MenuItem } from "@simple-site/interfaces";
import { ManagePage } from "../pages/admin/ManagePage";
import { ThemesPage } from "../pages/admin/ThemesPage";
import { TranslationsPage } from "../pages/admin/TranslationsPage";
import { MediaPage } from "../pages/admin/MediaPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { MainLayout } from "../layouts/MainLayout";
import { Loading } from "../components";
import { useFeatureFlags } from "../hooks/useFeatureFlags";

// Admin navigation. `pageName` resolves the i18n label key `${pageName}.menuTitle`
// (see MenuBar); `menuTitle` is the fallback default message.
const dashboardItem: MenuItem = { menuTitle: "Dashboard", pageName: "manage", route: "/manage" };
const themesItem: MenuItem = { menuTitle: "Themes", pageName: "themes", route: "/manage/themes" };
const translationsItem: MenuItem = { menuTitle: "Translations", pageName: "translations", route: "/manage/translations" };
const mediaItem: MenuItem = { menuTitle: "Media", pageName: "media", route: "/manage/media" };

// The admin area, once authenticated: Dashboard + Themes + Translations are always
// available; the Media entry/route is shown only when the `media` feature flag is
// enabled (fetched at runtime from /api/features).
const ManageArea: React.FC = () => {
  const flags = useFeatureFlags();
  if (!flags) return <Loading message="Loading…" />;

  const menuItems: MenuItem[] = flags.media
    ? [dashboardItem, themesItem, translationsItem, mediaItem]
    : [dashboardItem, themesItem, translationsItem];

  return (
    <MainLayout menuItems={menuItems}>
      <Routes>
        <Route index element={<ManagePage />} />
        <Route path="themes" element={<ThemesPage />} />
        <Route path="translations" element={<TranslationsPage />} />
        {flags.media && <Route path="media" element={<MediaPage />} />}
      </Routes>
    </MainLayout>
  );
};

export const ManageRouter: React.FC = () => (
  <ProtectedRoute>
    <ManageArea />
  </ProtectedRoute>
);
