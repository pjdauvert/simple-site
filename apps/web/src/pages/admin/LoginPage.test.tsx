import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../../features/auth/AuthContext';
import type { AuthContextValue } from '../../features/auth/AuthContext';
import { LoginPage } from './LoginPage';

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
    <MemoryRouter initialEntries={['/admin/login']}>
      <AuthContext.Provider value={{ ...defaults, ...contextValue }}>
        <Routes>
          <Route path="/admin/login" element={ui} />
          <Route path="/admin" element={<div>Admin Page</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  it('renders email, password fields and submit button', () => {
    renderWithAuth(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('redirects immediately when already logged in', () => {
    renderWithAuth(<LoginPage />, { user: { id: 'u1', email: 'a@b.com' } });
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });

  it('calls login() with typed credentials on submit', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    renderWithAuth(<LoginPage />, { login: mockLogin });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'secret' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret');
  });

  it('shows error alert when login() rejects', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    renderWithAuth(<LoginPage />, { login: mockLogin });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('navigates to /admin after successful login', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    renderWithAuth(<LoginPage />, { login: mockLogin });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() => expect(screen.getByText('Admin Page')).toBeInTheDocument());
  });

  it('submit button is disabled while login is in-flight', async () => {
    let resolveLogin!: () => void;
    const pendingLogin = new Promise<void>((resolve) => {
      resolveLogin = resolve;
    });
    const mockLogin = vi.fn().mockReturnValue(pendingLogin);
    renderWithAuth(<LoginPage />, { login: mockLogin });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
    );
    await act(async () => {
      resolveLogin();
    });
  });
});
