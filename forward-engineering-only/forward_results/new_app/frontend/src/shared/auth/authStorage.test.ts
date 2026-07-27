import { getAccessToken } from './authStorage';

describe('authStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when no token has been set under app.access_token', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('reads back a token stored under its own key', () => {
    window.localStorage.setItem('app.access_token', 'token-xyz');
    expect(getAccessToken()).toBe('token-xyz');
  });

  // Cross-module defect (see tokenStorage.test.ts): AuthContext.tsx's login()
  // persists the access token via tokenStorage.setTokens(), which writes to
  // 'app.auth.accessToken' — not this module's 'app.access_token' key, which
  // is the one shared/api/httpClient.ts actually reads from. Confirms the two
  // auth-storage modules are not interchangeable despite both exposing a
  // same-named `getAccessToken` function.
  it('does not see a token written via shared/auth/tokenStorage.ts', () => {
    window.localStorage.setItem('app.auth.accessToken', 'token-from-other-module');
    expect(getAccessToken()).toBeNull();
  });
});
