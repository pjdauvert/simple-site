import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, getNetlifyToken } from './AuthProvider';
import { useAuth } from '../../hooks/useAuth';
import type { User } from 'gotrue-js';

const { mockCurrentUser, mockLogin, mockLogout } = vi.hoisted(() => ({
  mockCurrentUser: vi.fn<() => User | null>().mockReturnValue(null),
  mockLogin: vi.fn<(email: string, password: string, remember?: boolean) => Promise<User>>(),
  mockLogout: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

vi.mock('gotrue-js', () => ({
  default: vi.fn(() => ({
    currentUser: mockCurrentUser,
    login: mockLogin,
  })),
}));

const mockUser = {
  id: 'u1',
  email: 'a@b.com',
  user_metadata: { full_name: 'Alice' },
  token: { access_token: 'tok' },
  logout: mockLogout,
} as unknown as User;

function TestConsumer() {
  const { user, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'loading' : 'done'}</span>
      <span data-testid="user">{user ? `${user.email}|${user.name ?? ''}` : 'null'}</span>
      <button onClick={() => void login('a@b.com', 'pw')}>login</button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

beforeEach(() => {
  mockCurrentUser.mockReturnValue(null);
  mockLogin.mockReset();
  mockLogout.mockReset().mockResolvedValue(undefined);
});

describe('AuthProvider', () => {
  it('user is null when no session', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('done'));
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('user is hydrated from existing session', async () => {
    mockCurrentUser.mockReturnValue(mockUser);
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('done'));
    expect(screen.getByTestId('user').textContent).toBe('a@b.com|Alice');
  });

  it('login() sets user on success', async () => {
    mockLogin.mockResolvedValue(mockUser);
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('done'));
    await act(async () => {
      screen.getByText('login').click();
    });
    expect(screen.getByTestId('user').textContent).not.toBe('null');
  });

  it('login() propagates error', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    let caughtError: Error | undefined;

    function LoginTestConsumer() {
      const { user, isLoading, login } = useAuth();
      return (
        <div>
          <span data-testid="loading">{isLoading ? 'loading' : 'done'}</span>
          <span data-testid="user">{user ? user.email : 'null'}</span>
          <button
            onClick={() =>
              login('a@b.com', 'pw').catch((e: Error) => {
                caughtError = e;
              })
            }
          >
            login
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <LoginTestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('done'));
    await act(async () => {
      screen.getByText('login').click();
    });
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(caughtError?.message).toBe('Invalid credentials');
  });

  it('logout() clears user', async () => {
    mockCurrentUser.mockReturnValue(mockUser);
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('a@b.com|Alice'));
    await act(async () => {
      screen.getByText('logout').click();
    });
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it('getNetlifyToken() returns null when no session', () => {
    mockCurrentUser.mockReturnValue(null);
    expect(getNetlifyToken()).toBeNull();
  });

  it('getNetlifyToken() returns token when session exists', () => {
    mockCurrentUser.mockReturnValue(mockUser);
    expect(getNetlifyToken()).toBe('tok');
  });
});
