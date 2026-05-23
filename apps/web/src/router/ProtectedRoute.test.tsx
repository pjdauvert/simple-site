import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../features/auth/AuthContext';
import type { AuthContextValue } from '../features/auth/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

function renderWithAuth(
  ui: React.ReactElement,
  contextValue: Partial<AuthContextValue> = {}
) {
  const defaults: AuthContextValue = {
    user: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AuthContext.Provider value={{ ...defaults, ...contextValue }}>
        <Routes>
          <Route path="/admin/login" element={<div>Login Page</div>} />
          <Route path="/admin" element={ui} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows loading while resolving auth', () => {
    renderWithAuth(
      <ProtectedRoute>
        <div>Admin Content</div>
      </ProtectedRoute>,
      { isLoading: true, user: null }
    );
    expect(screen.getByText(/checking authentication/i)).toBeInTheDocument();
  });

  it('redirects to /admin/login when unauthenticated', () => {
    renderWithAuth(
      <ProtectedRoute>
        <div>Admin Content</div>
      </ProtectedRoute>,
      { isLoading: false, user: null }
    );
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    renderWithAuth(
      <ProtectedRoute>
        <div>Admin Content</div>
      </ProtectedRoute>,
      { isLoading: false, user: { id: 'u1', email: 'a@b.com' } }
    );
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});
