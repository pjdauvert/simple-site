import { describe, it, expect, vi } from 'vitest';
import { screen, act, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { Route, Routes } from 'react-router-dom';
import type { AuthContextValue } from '../../features/auth/AuthContext';
import { LoginPage } from './LoginPage';
import {loggedPath, loginPath} from '../../features/auth/auth.constants'
import { renderWithProviders } from '../../test/renderWithProviders';

const VALID_EMAIL = 'user@example.com';

const renderWithAuth = (ui: React.ReactElement, contextValue: Partial<AuthContextValue> = {}) =>
  renderWithProviders(
    <Routes>
      <Route path={loginPath} element={ui} />
      <Route path={loggedPath} element={<div>Admin Page</div>} />
    </Routes>,
    { route: loginPath, auth: contextValue },
  );

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
      target: { value: VALID_EMAIL },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'secret' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    expect(mockLogin).toHaveBeenCalledWith(VALID_EMAIL, 'secret');
  });

  it('shows error alert when login() rejects', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    renderWithAuth(<LoginPage />, { login: mockLogin });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: VALID_EMAIL },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('navigates to /admin after successful login', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    renderWithAuth(<LoginPage />, { login: mockLogin });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: VALID_EMAIL },
    });
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
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: VALID_EMAIL },
    });
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

  it('shows field-level error on blur when email is invalid', async () => {
    renderWithAuth(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
      fireEvent.focusOut(emailInput);
    });
    await waitFor(() =>
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    );
  });

  it('prevents submit and shows field error when email is invalid', async () => {
    const mockLogin = vi.fn();
    renderWithAuth(<LoginPage />, { login: mockLogin });
    const emailInput = screen.getByLabelText(/email/i);
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'bad-email' } });
      fireEvent.submit(emailInput.closest('form')!);
    });
    expect(mockLogin).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    );
  });
});
