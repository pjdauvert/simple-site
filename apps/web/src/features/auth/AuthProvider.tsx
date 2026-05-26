import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { login as netlifyLogin, logout as netlifyLogout, getUser, onAuthChange } from '@netlify/identity';
import type { User } from '@netlify/identity';
import { AuthContext } from './AuthContext';
import type { AuthUser } from './AuthContext';

// @netlify/identity sets the nf_jwt cookie after login, which is the access token
// eslint-disable-next-line react-refresh/only-export-components
export function getNetlifyToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)nf_jwt=([^;]+)/);
  return match?.[1] ?? null;
}

function mapUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    name: user.name,
  };
}

interface AuthProviderProps {
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Mock provider — used locally when VITE_AUTH_BYPASS=true
// Stores the mock user in sessionStorage so it survives hot-reloads but not
// full browser restarts (avoids stale state across dev sessions).
// ---------------------------------------------------------------------------

const MOCK_USER_KEY = '__dev_mock_user__';

function MockAuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = sessionStorage.getItem(MOCK_USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const login = async (email: string): Promise<void> => {
    const mockUser: AuthUser = { id: 'dev-user-id', email, name: 'Dev User' };
    sessionStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
  };

  const logout = async (): Promise<void> => {
    sessionStorage.removeItem(MOCK_USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: false, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Real provider — uses @netlify/identity (production + Netlify preview envs)
// ---------------------------------------------------------------------------

function RealAuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getUser().then((u) => {
      setUser(u ? mapUser(u) : null);
      setIsLoading(false);
    });
    return onAuthChange((_event, u) => {
      setUser(u ? mapUser(u) : null);
    });
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const loggedIn = await netlifyLogin(email, password);
    setUser(mapUser(loggedIn));
  };

  const logout = async (): Promise<void> => {
    await netlifyLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Public export — delegates to mock or real based on env var
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: AuthProviderProps) {
  if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }
  return <RealAuthProvider>{children}</RealAuthProvider>;
}
