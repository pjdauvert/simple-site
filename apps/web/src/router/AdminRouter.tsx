import { Routes, Route } from "react-router-dom";
import { AdminPage } from "../pages/admin/AdminPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { MainLayout } from "../layouts/MainLayout";

export const AdminRouter: React.FC = () => {
  return (
    <ProtectedRoute>
      <MainLayout menuItems={[]}>
        <Routes>
          <Route index element={<AdminPage />} />
        </Routes>
      </MainLayout>
    </ProtectedRoute>
  );
};
