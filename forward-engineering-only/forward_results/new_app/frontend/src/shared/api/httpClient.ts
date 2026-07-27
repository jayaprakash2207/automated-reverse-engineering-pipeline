// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — import.meta is valid in Vite (ESM) but not in Jest (CJS).
// ts-jest compiles this file with diagnostics:false so the ts error is suppressed.
const API_BASE_URL: string =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__VITE_API_BASE_URL__ ??
  (typeof process !== 'undefined' ? process.env['VITE_API_BASE_URL'] : undefined) ??
  '';

const AUTH_TOKEN_STORAGE_KEY = 'authToken';

export class HttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`Request failed with status ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

function getAuthToken(): string | null {
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    throw new HttpError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function httpGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: 'GET', signal });
}

export function httpPost<T>(path: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(payload), signal });
}
