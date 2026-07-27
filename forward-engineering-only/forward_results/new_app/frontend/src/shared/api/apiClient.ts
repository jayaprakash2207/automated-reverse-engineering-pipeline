import { getToken } from '../auth/tokenStorage';

export class ApiError extends Error {
  readonly status: number;
  readonly errorCode?: string;
  readonly traceId?: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    status: number,
    message: string,
    options?: { errorCode?: string; traceId?: string; fieldErrors?: Record<string, string> }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = options?.errorCode;
    this.traceId = options?.traceId;
    this.fieldErrors = options?.fieldErrors;
  }
}

export class NetworkError extends Error {
  readonly originalError: unknown;

  constructor(originalError: unknown) {
    super('Unable to reach the server. Please check your connection and try again.');
    this.name = 'NetworkError';
    this.originalError = originalError;
  }
}

const API_BASE_URL = '/api/v1';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query } = options;
  const token = getToken();

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  if (!response.ok) {
    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw new ApiError(response.status, payload?.message ?? `Request failed with status ${response.status}`, {
      errorCode: payload?.errorCode,
      traceId: payload?.traceId,
      fieldErrors: payload?.fieldErrors,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
