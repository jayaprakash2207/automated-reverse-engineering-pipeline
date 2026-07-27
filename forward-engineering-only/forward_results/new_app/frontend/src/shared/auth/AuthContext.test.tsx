import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import { login as loginRequest } from '../../features/auth/api/authApi';
import { getAccessToken as getHttpClientAccessToken } from './authStorage';
import { getAccessToken as getStoredAccessToken } from './tokenStorage';

// BLOCKED TODAY: AuthContext.tsx does `import { decodeJwt } from
// './jwtDecode'`, but only shared/auth/jwt.ts (exporting `decodeJwt`) was
// delivered this sprint — there is no shared/auth/jwtDecode.ts. Until that
// import is fixed (either add jwtDecode.ts re-exporting from jwt.ts, or point
// AuthContext.tsx at './jwt'), this entire suite fails at module resolution
// before any test body runs. It is left in place, written against the
// intended behavior, so it goes green as soon as that one-line import is
// fixed — see useAuth.test.tsx for the same blocking note.
jest.mock('../../features/auth/api/authApi');

function buildJwt(claims: Record<string, unknown>): string {
  const encode = (v: object) =>
    Buffer.from(JSON.stringify(v)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.sig`;
}

function Probe() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      await login('jane@example.com', 'secret');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    }
  };

  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? ''}</span>
      <span data-testid="error">{error ?? ''}</span>
      <button onClick={handleLogin}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe('AuthProvider / useAuth', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('starts unauthenticated when no token is stored', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('false'));
  });

  it('authenticates the user on successful login and stores tokens for future requests', async () => {
    const user = userEvent.setup();
    const farFutureExp = Math.floor(Date.now() / 1000) + 3600;
    const accessToken = buildJwt({ sub: 'emp-1', email: 'jane@example.com', roles: ['EMPLOYEE'], exp: farFutureExp });
    (loginRequest as jest.Mock).mockResolvedValue({
      access_token: accessToken,
      refresh_token: 'refresh-1',
      token_type: 'Bearer',
      expires_in: 3600,
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await user.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'));
    expect(screen.getByTestId('email').textContent).toBe('jane@example.com');

    // tokenStorage.ts (what AuthContext actually writes to) has the token...
    expect(getStoredAccessToken()).toBe(accessToken);
    // ...but shared/api/httpClient.ts reads the bearer token via
    // authStorage.ts under a DIFFERENT localStorage key. This assertion is
    // expected to FAIL today: it proves that even a real, successful login
    // leaves httpClient unable to attach an Authorization header to any
    // subsequent employee API call.
    expect(getHttpClientAccessToken()).toBe(accessToken);
  });

  it('clears tokens and de-authenticates on logout', async () => {
    const user = userEvent.setup();
    const farFutureExp = Math.floor(Date.now() / 1000) + 3600;
    const accessToken = buildJwt({ sub: 'emp-1', email: 'jane@example.com', exp: farFutureExp });
    (loginRequest as jest.Mock).mockResolvedValue({
      access_token: accessToken,
      refresh_token: 'refresh-1',
      token_type: 'Bearer',
      expires_in: 3600,
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await user.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('true'));

    await user.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('false'));
    expect(getStoredAccessToken()).toBeNull();
  });

  it('rejects a token whose exp claim has already passed, and clears storage', async () => {
    const user = userEvent.setup();
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    const expiredToken = buildJwt({ sub: 'emp-1', email: 'jane@example.com', exp: pastExp });
    (loginRequest as jest.Mock).mockResolvedValue({
      access_token: expiredToken,
      refresh_token: 'refresh-1',
      token_type: 'Bearer',
      expires_in: -1,
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await user.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('error').textContent).toMatch(/invalid session token/i));
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(getStoredAccessToken()).toBeNull();
  });
});
