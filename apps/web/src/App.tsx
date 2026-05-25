import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AdminShell } from './router/AdminShell';
import { PublicShell } from './router/PublicShell';
import { LoginPage } from './pages/admin/LoginPage';
import { AdminPage } from './pages/admin/AdminPage';
import { ProtectedRoute } from './router/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/admin',
    element: <AdminShell />,
    children: [
      { index: true, element: <ProtectedRoute><AdminPage /></ProtectedRoute> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
  {
    path: '*',
    element: <PublicShell />,
  },
]);

const App = () => <RouterProvider router={router} />;

export default App;
