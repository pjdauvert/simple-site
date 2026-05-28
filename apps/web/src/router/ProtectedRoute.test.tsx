import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { AuthContext } from '../features/auth/AuthContext';
import type { AuthContextValue } from '../features/auth/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { loginPath, loggedPath } from '../features/auth/auth.constants';
import messages from '../features/i18n/i18n.json';

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
    <IntlProvider locale="en" messages={messages.en}>
      <MemoryRouter initialEntries={[loggedPath]}>
        <AuthContext.Provider value={{ ...defaults, ...contextValue }}>
          <Routes>
            <Route path={loginPath} element={<div>Login Page</div>} />
            <Route path={loggedPath} element={ui} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    </IntlProvider>
  );
}

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
