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

export function AuthProvider({ children }: AuthProviderProps) {
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
