import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AdminShell } from './router/Shell';
import { PublicShell } from './router/Shell';
import { NetlifyCallbackHandler } from './features/auth/NetlifyCallbackHandler';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { AcceptInvitePage } from './pages/auth/AcceptInvitePage';
import { AdminPage } from './pages/admin/AdminPage';
import { ProtectedRoute } from './router/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/',
    element: <NetlifyCallbackHandler><PublicShell /></NetlifyCallbackHandler>
  },
  {
    path: '/admin',
    element: <AdminShell />,
    children: [
      { index: true, element: <ProtectedRoute><AdminPage /></ProtectedRoute> },
      { path: 'login', element: <LoginPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'accept-invite', element: <AcceptInvitePage /> },
    ],
  },
  {
    path: '*',
    element: <PublicShell />,
  },
]);

const App = () => <RouterProvider router={router} />;

export default App;
