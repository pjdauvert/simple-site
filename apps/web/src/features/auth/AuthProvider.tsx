import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import GoTrue, { type User } from 'gotrue-js';
import { AuthContext } from './AuthContext';
import type { AuthUser } from './AuthContext';

const auth = new GoTrue({
  APIUrl: `${window.location.origin}/.netlify/identity`,
  audience: '',
  setCookie: true,
});

// eslint-disable-next-line react-refresh/only-export-components
export function getNetlifyToken(): string | null {
  return auth.currentUser()?.token?.access_token ?? null;
}

function mapUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata.full_name as string | undefined,
  };
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const current = auth.currentUser();
    if (current) {
      setUser(mapUser(current));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const loggedIn = await auth.login(email, password, true);
    setUser(mapUser(loggedIn));
  };

  const logout = async (): Promise<void> => {
    const current = auth.currentUser();
    if (current) {
      await current.logout();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
