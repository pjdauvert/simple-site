import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import type { AuthContextValue } from '../features/auth/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { loginPath, loggedPath } from '../features/auth/auth.constants';
import { renderWithProviders } from '../test/renderWithProviders';

const renderWithAuth = (ui: React.ReactElement, contextValue: Partial<AuthContextValue> = {}) =>
  renderWithProviders(
    <Routes>
      <Route path={loginPath} element={<div>Login Page</div>} />
      <Route path={loggedPath} element={ui} />
    </Routes>,
    { route: loggedPath, auth: contextValue },
  );

describe('ProtectedRoute', () => {
  it('shows loading while resolving auth', () => {
    renderWithAuth(
      <ProtectedRoute>
        <div>Manage Content</div>
      </ProtectedRoute>,
      { isLoading: true, user: null }
    );
    expect(screen.getByText(/checking authentication/i)).toBeInTheDocument();
  });

  it('redirects to login when unauthenticated', () => {
    renderWithAuth(
      <ProtectedRoute>
        <div>Manage Content</div>
      </ProtectedRoute>,
      { isLoading: false, user: null }
    );
    expect(screen.queryByText('Manage Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    renderWithAuth(
      <ProtectedRoute>
        <div>Manage Content</div>
      </ProtectedRoute>,
      { isLoading: false, user: { id: 'u1', email: 'a@b.com' } }
    );
    expect(screen.getByText('Manage Content')).toBeInTheDocument();
  });
});
