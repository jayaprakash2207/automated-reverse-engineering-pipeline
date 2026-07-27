import { useState } from 'react';

export interface CurrentUser {
  userId: string;
  roles: string[];
}

function decodeToken(token: string): CurrentUser | null {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(normalized));
    return { userId: json.sub, roles: Array.isArray(json.roles) ? json.roles : [] };
  } catch {
    return null;
  }
}

export function useCurrentUser(): CurrentUser | null {
  const [user] = useState<CurrentUser | null>(() => {
    const token = localStorage.getItem('auth_token');
    return token ? decodeToken(token) : null;
  });

  return user;
}
