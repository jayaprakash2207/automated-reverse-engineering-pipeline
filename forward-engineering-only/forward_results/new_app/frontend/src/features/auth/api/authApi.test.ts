import { login, refresh, logout } from './authApi';
import { httpClient } from '../../../shared/api/httpClient';

jest.mock('../../../shared/api/httpClient', () => ({
  httpClient: {
    post: jest.fn(),
  },
}));

const mockedPost = httpClient.post as jest.Mock;

describe('authApi', () => {
  afterEach(() => {
    mockedPost.mockReset();
  });

  it('posts to /api/v1/auth/login with the credentials payload', async () => {
    mockedPost.mockResolvedValue({
      access_token: 'a',
      refresh_token: 'r',
      token_type: 'Bearer',
      expires_in: 900,
    });

    await login({ email: 'jane@example.com', password: 'secret' });

    expect(mockedPost).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      { email: 'jane@example.com', password: 'secret' },
      { skipAuth: true },
    );
  });

  it('posts to /api/v1/auth/refresh with skipAuth so an expired access token is never attached', async () => {
    mockedPost.mockResolvedValue({
      access_token: 'a2',
      refresh_token: 'r2',
      token_type: 'Bearer',
      expires_in: 900,
    });

    await refresh({ refresh_token: 'r' });

    expect(mockedPost).toHaveBeenCalledWith('/api/v1/auth/refresh', { refresh_token: 'r' }, { skipAuth: true });
  });

  it('posts to /api/v1/auth/logout WITHOUT skipAuth, since logout must be authenticated', async () => {
    mockedPost.mockResolvedValue(undefined);

    await logout({ refresh_token: 'r' });

    expect(mockedPost).toHaveBeenCalledWith('/api/v1/auth/logout', { refresh_token: 'r' });
  });

  // KNOWN CONTRACT MISMATCH (flagging, not fixing — per this pass's
  // instructions not to invent replacement source for another agent's
  // undelivered/half-delivered implementation): authApi.ts calls
  // httpClient.post<T>(path, body, { skipAuth: true }), but the delivered
  // shared/api/httpClient.ts declares `post`'s third parameter as
  // `signal?: AbortSignal` and `request()` never reads any `skipAuth`
  // option — it unconditionally attaches `Authorization` whenever a token is
  // present. This test only proves what authApi.ts *asks* httpClient to do;
  // it does not prove httpClient honors it. See AuthContext.test.tsx for the
  // related storage-key mismatch that compounds this.
  it('documents that the third argument is an options object, not an AbortSignal', async () => {
    mockedPost.mockResolvedValue({});
    await login({ email: 'a@b.com', password: 'x' });
    const thirdArg = mockedPost.mock.calls[0][2];
    expect(thirdArg).toEqual({ skipAuth: true });
    expect(thirdArg instanceof AbortSignal).toBe(false);
  });
});
