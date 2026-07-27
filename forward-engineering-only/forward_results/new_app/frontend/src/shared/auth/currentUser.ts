import { useMemo } from 'react';

export interface CurrentUser {
  id: string;
  name: string;
  roles: string[];
}

const TOKEN_STORAGE_KEY = 'auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function useCurrentUser(): CurrentUser | null {
  return useMemo(() => {
    const token = getAuthToken();
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    const roles = Array.isArray(payload.roles)
      ? (payload.roles as string[])
      : typeof payload.role === 'string'
      ? [payload.role]
      : [];
    return {
      id: String(payload.sub ?? ''),
      name: typeof payload.name === 'string' ? payload.name : String(payload.sub ?? 'Unknown'),
      roles,
    };
  }, []);
}

export function isManager(user: CurrentUser | null): boolean {
  return !!user?.roles.includes('MANAGER');
}
