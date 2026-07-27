export interface CurrentUser {
  subject: string;
  roles: string[];
}

const AUTH_TOKEN_STORAGE_KEY = 'authToken';

// Decodes the JWT issued by the Security/Identity sprint's login flow to read
// the caller's roles for client-side route gating. This is a UX convenience only —
// the binding authorization check is the backend's @PreAuthorize per Stack Mapping
// Contract row 6; this hook must never be treated as the source of truth for access control.
export function useCurrentUser(): CurrentUser | null {
  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!token) {
    return null;
  }

  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload)) as { sub?: string; roles?: string[] };
    return {
      subject: decoded.sub ?? '',
      roles: decoded.roles ?? [],
    };
  } catch {
    return null;
  }
}
