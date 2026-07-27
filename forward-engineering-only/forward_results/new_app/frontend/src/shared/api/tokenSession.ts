const REFRESH_TOKEN_STORAGE_KEY = 'app.auth.refreshToken';

// The access token is intentionally kept in memory only (module-level variable,
// never persisted to localStorage/sessionStorage) to limit the blast radius of an
// XSS bug. The refresh token is persisted so a page reload doesn't force a
// re-login, consistent with the stateless-JWT model (Stack Mapping Contract row 6)
// — there is no server-side session to fall back on.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setStoredRefreshToken(token: string | null): void {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export function clearSession(): void {
  accessToken = null;
  setStoredRefreshToken(null);
}
