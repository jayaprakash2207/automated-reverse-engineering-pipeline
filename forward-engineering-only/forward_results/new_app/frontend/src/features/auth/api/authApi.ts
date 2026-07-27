import { httpClient } from '../../../shared/api/httpClient';
import type { AuthResponse, LoginRequest, RefreshTokenRequest } from '../types/auth';

// Endpoint paths follow the Stack Mapping Contract's REST convention (row 3:
// `/api/v1/{resource}`, no verbs in the path) applied to the AuthController
// referenced in the backend scaffold. That controller has not been
// implemented yet, so these paths are the frontend's contract assumption,
// pending backend confirmation.
const LOGIN_PATH = '/api/v1/auth/login';
const REFRESH_PATH = '/api/v1/auth/refresh';
const LOGOUT_PATH = '/api/v1/auth/logout';

export function login(payload: LoginRequest): Promise<AuthResponse> {
  return httpClient.post<AuthResponse>(LOGIN_PATH, payload, { skipAuth: true });
}

export function refresh(payload: RefreshTokenRequest): Promise<AuthResponse> {
  return httpClient.post<AuthResponse>(REFRESH_PATH, payload, { skipAuth: true });
}

export function logout(payload: RefreshTokenRequest): Promise<void> {
  return httpClient.post<void>(LOGOUT_PATH, payload);
}
