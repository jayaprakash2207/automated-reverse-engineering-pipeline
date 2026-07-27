import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/authApi';
import type { LoginRequest } from '../types/auth';
import {
  clearSession,
  getStoredRefreshToken,
  setAccessToken,
  setStoredRefreshToken,
} from '../../../shared/api/tokenSession';
import { authEvents } from '../../../shared/api/authEvents';
import { decodeJwt } from '../../../shared/utils/jwt';

type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

interface AuthUser {
  email: string;
  roles: string[];
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function userFromAccessToken(accessToken: string): AuthUser | null {
  const claims = decodeJwt(accessToken);
  if (!claims) {
    return null;
  }
  return { email: claims.email ?? claims.sub, roles: claims.roles ?? [] };
}

// The provider lives alongside its hook (rather than under components/) because it
// is pure auth-state plumbing, not a rendered screen — components/ is reserved for
// this feature's actual UI (LoginPage, LoginForm).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromPersistedSession() {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        setStatus('unauthenticated');
        return;
      }
      try {
        const tokenPair = await authApi.refresh({ refresh_token: refreshToken });
        if (cancelled) return;
        setAccessToken(tokenPair.access_token);
        setStoredRefreshToken(tokenPair.refresh_token);
        setUser(userFromAccessToken(tokenPair.access_token));
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        clearSession();
        setStatus('unauthenticated');
      }
    }

    hydrateFromPersistedSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () =>
      authEvents.on('session-expired', () => {
        setUser(null);
        setStatus('unauthenticated');
      }),
    []
  );

  const login = useCallback(async (request: LoginRequest) => {
    const tokenPair = await authApi.login(request);
    setAccessToken(tokenPair.access_token);
    setStoredRefreshToken(tokenPair.refresh_token);
    setUser(userFromAccessToken(tokenPair.access_token));
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo(
    () => ({ status, user, login, logout }),
    [status, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
