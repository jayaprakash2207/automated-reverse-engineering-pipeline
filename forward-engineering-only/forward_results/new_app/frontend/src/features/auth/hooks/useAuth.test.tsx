import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './useAuth';
import { authApi } from '../api/authApi';
import { authEvents } from '../../../shared/api/authEvents';
import { clearSession, getStoredRefreshToken } from '../../../shared/api/tokenSession';

jest.mock('../api/authApi');

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

function base64url(value: object): string {
  const json = JSON.stringify(value);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeAccessToken(claims: Record<string, unknown>): string {
  return `${base64url({ alg: 'HS256' })}.${base64url(claims)}.sig`;
}

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('useAuth / AuthProvider', () => {
  afterEach(() => {
    clearSession();
    jest.clearAllMocks();
  });

  it('finishes initializing with no authenticated session when no refresh token is stored', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(mockedAuthApi.refresh).not.toHaveBeenCalled();
  });

  it('restores an authenticated session on mount when a stored refresh token is still valid', async () => {
    localStorage.setItem('app.auth.refreshToken', 'stored-refresh-token');
    mockedAuthApi.refresh.mockResolvedValue({
      access_token: makeAccessToken({ sub: 'emp-1', email: 'user@example.com', roles: ['EMPLOYEE'], exp: 9999999999 }),
      refresh_token: 'rotated-refresh-token',
      token_type: 'Bearer',
      expires_in: 900,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(getStoredRefreshToken()).toBe('rotated-refresh-token');
  });

  it('clears the session when the stored refresh token turns out to be invalid', async () => {
    localStorage.setItem('app.auth.refreshToken', 'stale-refresh-token');
    mockedAuthApi.refresh.mockRejectedValue(new Error('invalid refresh token'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(getStoredRefreshToken()).toBeNull();
  });

  it('login() authenticates the user and persists the refresh token', async () => {
    mockedAuthApi.login.mockResolvedValue({
      access_token: makeAccessToken({ sub: 'emp-2', email: 'user2@example.com', roles: ['EMPLOYEE'], exp: 9999999999 }),
      refresh_token: 'new-refresh-token',
      token_type: 'Bearer',
      expires_in: 900,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    await act(async () => {
      await result.current.login({ email: 'user2@example.com', password: 'correct-password' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(getStoredRefreshToken()).toBe('new-refresh-token');
  });

  it('login() propagates the error and leaves the user unauthenticated on failure', async () => {
    mockedAuthApi.login.mockRejectedValue(new Error('Invalid email or password'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    await expect(
      act(async () => {
        await result.current.login({ email: 'user2@example.com', password: 'wrong-password' });
      })
    ).rejects.toThrow('Invalid email or password');

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logout() clears the authenticated session', async () => {
    mockedAuthApi.login.mockResolvedValue({
      access_token: makeAccessToken({ sub: 'emp-3', email: 'user3@example.com', roles: ['EMPLOYEE'], exp: 9999999999 }),
      refresh_token: 'session-refresh-token',
      token_type: 'Bearer',
      expires_in: 900,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    await act(async () => {
      await result.current.login({ email: 'user3@example.com', password: 'correct-password' });
    });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(getStoredRefreshToken()).toBeNull();
  });

  it('reacts to a session-expired event by clearing the authenticated state', async () => {
    mockedAuthApi.login.mockResolvedValue({
      access_token: makeAccessToken({ sub: 'emp-4', email: 'user4@example.com', roles: ['EMPLOYEE'], exp: 9999999999 }),
      refresh_token: 'session-refresh-token-2',
      token_type: 'Bearer',
      expires_in: 900,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isInitializing).toBe(false));

    await act(async () => {
      await result.current.login({ email: 'user4@example.com', password: 'correct-password' });
    });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      authEvents.emit('session-expired');
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
  });
});
