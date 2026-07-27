import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null for both tokens before anything is stored', () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('persists both tokens under their dedicated keys', () => {
    setTokens('access-123', 'refresh-456');

    expect(getAccessToken()).toBe('access-123');
    expect(getRefreshToken()).toBe('refresh-456');
    expect(window.localStorage.getItem('app.auth.accessToken')).toBe('access-123');
    expect(window.localStorage.getItem('app.auth.refreshToken')).toBe('refresh-456');
  });

  it('clears both tokens', () => {
    setTokens('access-123', 'refresh-456');
    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  // See AuthContext.test.tsx and authStorage.test.ts: shared/api/httpClient.ts
  // reads its bearer token from shared/auth/authStorage.ts's key
  // ('app.access_token') — a DIFFERENT module and key than this one
  // ('app.auth.accessToken'), which is the module AuthContext.tsx actually
  // writes to via setTokens() above. A successful login therefore stores a
  // token httpClient will never read.
  it('documents that this module uses a different storage key than shared/auth/authStorage.ts', () => {
    setTokens('access-123', 'refresh-456');
    expect(window.localStorage.getItem('app.access_token')).toBeNull();
  });
});
