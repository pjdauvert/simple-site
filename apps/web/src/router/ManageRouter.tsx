import { Routes, Route } from "react-router-dom";
import type { MenuItem } from "@simple-site/interfaces";
import { ManagePage } from "../pages/admin/ManagePage";
import { MediaPage } from "../pages/admin/MediaPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { MainLayout } from "../layouts/MainLayout";
import { featureFlags } from "../config/featureFlags";

// Admin navigation. `pageName` resolves the i18n label key `${pageName}.menuTitle`
// (see MenuBar); `menuTitle` is the fallback default message. The Media entry is
// gated behind the `media` feature flag (VITE_FEATURE_MEDIA).
const adminMenuItems: MenuItem[] = [
  { menuTitle: "Dashboard", pageName: "manage", route: "/manage" },
  ...(featureFlags.media
    ? [{ menuTitle: "Media", pageName: "media", route: "/manage/media" }]
    : []),
];

export const ManageRouter: React.FC = () => {
  return (
    <ProtectedRoute>
      <MainLayout menuItems={adminMenuItems}>
        <Routes>
          <Route index element={<ManagePage />} />
          {featureFlags.media && <Route path="media" element={<MediaPage />} />}
        </Routes>
      </MainLayout>
    </ProtectedRoute>
  );
};
