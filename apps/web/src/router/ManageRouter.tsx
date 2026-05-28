import { Routes, Route } from "react-router-dom";
import { ManagePage } from "../pages/admin/ManagePage";
import { ProtectedRoute } from "./ProtectedRoute";
import { MainLayout } from "../layouts/MainLayout";

export const ManageRouter: React.FC = () => {
  return (
    <ProtectedRoute>
      <MainLayout menuItems={[]}>
        <Routes>
          <Route index element={<ManagePage />} />
        </Routes>
      </MainLayout>
    </ProtectedRoute>
  );
};
