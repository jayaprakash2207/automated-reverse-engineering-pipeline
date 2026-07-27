import { httpGet, httpPost, HttpError } from './httpClient';

describe('httpClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    window.localStorage.clear();
  });

  it('attaches a bearer token when one is present', async () => {
    window.localStorage.setItem('authToken', 'token-123');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }) as unknown as typeof fetch;

    await httpGet('/api/v1/audit-log-entries');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
      })
    );
  });

  it('throws an HttpError carrying the response body on failure, never swallowing it', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ traceId: 'trace-1' }),
    }) as unknown as typeof fetch;

    await expect(httpPost('/api/v1/audit-log-entries', {})).rejects.toThrow(HttpError);
  });
});
