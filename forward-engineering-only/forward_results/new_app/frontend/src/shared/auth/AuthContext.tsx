import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { decodeJwtPayload } from './jwt';
import { clearToken, getToken } from './tokenStorage';
import type { Role } from './roles';

export interface AuthUser {
  userId: string;
  email: string;
  roles: Role[];
}

export interface AuthContextValue {
  user: AuthUser | null;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function userFromToken(token: string | null): AuthUser | null {
  if (!token) return null;
  const decoded = decodeJwtPayload(token);
  if (!decoded) return null;
  return {
    userId: decoded.sub,
    email: decoded.email ?? '',
    roles: (decoded.roles ?? []) as Role[],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => userFromToken(getToken()));

  useEffect(() => {
    const handleStorage = () => setUser(userFromToken(getToken()));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      logout: () => {
        clearToken();
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
