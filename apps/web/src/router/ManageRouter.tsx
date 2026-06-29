import { Routes, Route } from "react-router-dom";
import type { MenuItem } from "@simple-site/interfaces";
import { ManagePage } from "../pages/admin/ManagePage";
import { MediaPage } from "../pages/admin/MediaPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { MainLayout } from "../layouts/MainLayout";

// Admin navigation. `pageName` resolves the i18n label key `${pageName}.menuTitle`
// (see MenuBar); `menuTitle` is the fallback default message.
const adminMenuItems: MenuItem[] = [
  { menuTitle: "Dashboard", pageName: "manage", route: "/manage" },
  { menuTitle: "Media", pageName: "media", route: "/manage/media" },
];

export const ManageRouter: React.FC = () => {
  return (
    <ProtectedRoute>
      <MainLayout menuItems={adminMenuItems}>
        <Routes>
          <Route index element={<ManagePage />} />
          <Route path="media" element={<MediaPage />} />
        </Routes>
      </MainLayout>
    </ProtectedRoute>
  );
};
