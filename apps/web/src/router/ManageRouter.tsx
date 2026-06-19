import { Routes, Route } from "react-router-dom";
import { ManagePage } from "../pages/admin/ManagePage";
import { MediaPage } from "../pages/admin/MediaPage";
import { AdminNav } from "../pages/admin/AdminNav";
import { ProtectedRoute } from "./ProtectedRoute";
import { MainLayout } from "../layouts/MainLayout";

export const ManageRouter: React.FC = () => {
  return (
    <ProtectedRoute>
      <MainLayout menuItems={[]}>
        <AdminNav />
        <Routes>
          <Route index element={<ManagePage />} />
          <Route path="media" element={<MediaPage />} />
        </Routes>
      </MainLayout>
    </ProtectedRoute>
  );
};
